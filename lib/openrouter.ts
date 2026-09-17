import { request as httpsRequest } from 'node:https';
import type { IncomingMessage } from 'node:http';
import { Readable } from 'node:stream';
import type { LabibPageContext } from './labib-page';
import { LABIB_SYSTEM_PROMPT, type ChatTurn, type LabibScreenPayload } from './labib-ai';

export { LABIB_SYSTEM_PROMPT, type ChatTurn, type LabibScreenPayload } from './labib-ai';

export const GROQ_FREE_MODELS = [
  'llama-3.1-8b-instant',
  'openai/gpt-oss-20b',
  'llama-3.3-70b-versatile',
] as const;

export const OPENROUTER_FREE_MODELS = [
  'openrouter/free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'z-ai/glm-5.2:free',
] as const;

export const OPENROUTER_VISION_MODELS = [
  'openrouter/free',
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
] as const;

export const GROQ_VISION_MODELS = [
  'meta-llama/llama-4-scout-17b-16e-instruct',
] as const;

type StreamChunk = {
  choices?: Array<{ delta?: { content?: string } }>;
  error?: { message?: string };
};

type StreamResult =
  | { ok: true; body: ReadableStream<Uint8Array> }
  | { ok: false; status: number; error: string };

type LlmContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

type LlmMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string | LlmContentPart[];
};

function buildMessages(
  history: ChatTurn[],
  page?: Pick<LabibPageContext, 'path' | 'title' | 'hint'> | null,
  screen?: LabibScreenPayload | null,
): LlmMessage[] {
  const trimmed = history
    .filter((item) => item.content.trim())
    .slice(-6)
    .map((item) => ({
      role: item.role,
      content: item.content.slice(0, 2000),
    }));

  const title = page?.title?.trim().slice(0, 80) ?? '';
  const hint = page?.hint?.trim().slice(0, 160) ?? '';
  const screenText = screen?.text?.trim().slice(0, 3500) ?? '';
  const hasImage = Boolean(screen?.image && screen.image.startsWith('data:image/'));

  let system = LABIB_SYSTEM_PROMPT;
  if (title) system += `\nالطالب الآن على صفحة «${title}». ${hint}`;
  if (screenText) system += `\nهذا النص الظاهر على شاشته الآن:\n${screenText}`;
  if (hasImage) system += '\nمعك صورة لقطة من الشاشة الحالية. علق على التفاصيل الظاهرة وتفاعل كرفيق دراسة.';

  const messages: LlmMessage[] = [
    { role: 'system', content: system },
    ...trimmed,
  ];

  const last = messages[messages.length - 1];
  if (hasImage && last && last.role === 'user' && typeof last.content === 'string' && screen?.image) {
    last.content = [
      { type: 'text', text: last.content },
      { type: 'image_url', image_url: { url: screen.image } },
    ];
  }

  return messages;
}

function toTokenStream(body: ReadableStream<Uint8Array>) {
  const decoder = new TextDecoder();
  let buffer = '';

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = body.getReader();
      const encoder = new TextEncoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const raw of lines) {
            const line = raw.trim();
            if (!line.startsWith('data:')) continue;
            const data = line.slice(5).trim();
            if (!data || data === '[DONE]') continue;
            try {
              const chunk = JSON.parse(data) as StreamChunk;
              const token = chunk.choices?.[0]?.delta?.content;
              if (typeof token === 'string' && token) controller.enqueue(encoder.encode(token));
            } catch {
              continue;
            }
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      } finally {
        reader.releaseLock();
      }
    },
  });
}

function incomingToWeb(res: IncomingMessage): ReadableStream<Uint8Array> {
  return Readable.toWeb(res) as unknown as ReadableStream<Uint8Array>;
}

function readErrorMessage(text: string): string {
  try {
    const payload = JSON.parse(text) as {
      error?: { message?: string } | string;
      message?: string;
    };
    if (typeof payload.error === 'string' && payload.error.trim()) return payload.error.trim();
    if (payload.error && typeof payload.error === 'object' && payload.error.message?.trim()) {
      return payload.error.message.trim();
    }
    if (payload.message?.trim()) return payload.message.trim();
  } catch {
    return '';
  }
  return '';
}

function mapProviderError(status: number, raw: string): string {
  const message = raw.toLowerCase();
  if (status === 401 || /user not found|invalid api key|unauthorized|no auth/i.test(message)) {
    return 'المفتاح غير صالح. أنشئ مفتاح OpenRouter جديداً من openrouter.ai/keys وضعه في الملف ثم أعد تشغيل السيرفر.';
  }
  if (status === 402 || /credit|payment required|can only afford/i.test(message)) {
    return 'النماذج المجانية وصلت حد الاستخدام. انتظر قليلاً أو أضف رصيد بسيط في OpenRouter.';
  }
  if (status === 429 || /rate limit|too many requests/i.test(message)) {
    return 'تم تجاوز الحد المجاني مؤقتاً. انتظر دقيقة ثم أعد المحاولة.';
  }
  return raw || 'تعذر بدء الرد من النموذج المجاني.';
}

function streamFromEndpoint(
  url: string,
  apiKey: string,
  extraHeaders: Record<string, string>,
  body: Record<string, unknown>,
  timeoutMs: number,
): Promise<StreamResult> {
  const parsed = new URL(url);
  const payload = JSON.stringify(body);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: StreamResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const req = httpsRequest(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: parsed.pathname,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          ...extraHeaders,
        },
      },
      (res) => {
        req.setTimeout(0);
        const status = res.statusCode || 0;
        if (status >= 400) {
          const chunks: Buffer[] = [];
          res.on('data', (chunk) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          });
          res.on('end', () => {
            const text = Buffer.concat(chunks).toString('utf8');
            const mapped = mapProviderError(status, readErrorMessage(text));
            console.warn('[ترتيب AI]', body.model, status, mapped);
            finish({
              ok: false,
              status: status === 401 ? 401 : 502,
              error: mapped,
            });
          });
          return;
        }

        finish({ ok: true, body: toTokenStream(incomingToWeb(res)) });
      },
    );

    req.setTimeout(timeoutMs, () => {
      req.destroy();
      finish({ ok: false, status: 502, error: 'انتهت مهلة الرد، حاول مرة أخرى.' });
    });
    req.on('error', (error) => {
      const detail = error instanceof Error ? error.message : 'network';
      console.warn('[ترتيب AI]', body.model, 'network', detail);
      finish({
        ok: false,
        status: 502,
        error: 'تعذر الاتصال بمزود الذكاء. تأكد من الإنترنت وأعد المحاولة.',
      });
    });
    req.write(payload);
    req.end();
  });
}

async function startGroqStream(
  history: ChatTurn[],
  apiKey: string,
  page?: Pick<LabibPageContext, 'path' | 'title' | 'hint'> | null,
  screen?: LabibScreenPayload | null,
  vision = false,
): Promise<StreamResult> {
  const messages = buildMessages(history, page, vision ? screen : { text: screen?.text, image: null });
  const models = vision ? GROQ_VISION_MODELS : GROQ_FREE_MODELS;
  let lastError = 'تعذر الوصول إلى Groq.';

  for (const model of models) {
    const result = await streamFromEndpoint(
      'https://api.groq.com/openai/v1/chat/completions',
      apiKey,
      {},
      {
        model,
        messages,
        temperature: 0.3,
        max_tokens: 500,
        stream: true,
      },
      vision ? 12000 : 8000,
    );
    if (result.ok) return result;
    lastError = result.error;
    if (result.status === 401) return result;
  }

  return { ok: false, status: 502, error: lastError };
}

async function startOpenRouterStream(
  history: ChatTurn[],
  apiKey: string,
  page?: Pick<LabibPageContext, 'path' | 'title' | 'hint'> | null,
  screen?: LabibScreenPayload | null,
  vision = false,
): Promise<StreamResult> {
  const messages = buildMessages(history, page, vision ? screen : { text: screen?.text, image: null });
  const headers = {
    'HTTP-Referer':
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.URL ||
      process.env.DEPLOY_PRIME_URL ||
      'http://localhost:3000',
    'X-Title': 'Tarteb',
  };
  const models = vision ? OPENROUTER_VISION_MODELS : OPENROUTER_FREE_MODELS;
  const timeoutMs = vision ? 14000 : 10000;
  const requestModel = (model: string) =>
    streamFromEndpoint(
      'https://openrouter.ai/api/v1/chat/completions',
      apiKey,
      headers,
      {
        model,
        provider: { sort: 'latency', allow_fallbacks: true },
        messages,
        temperature: 0.3,
        max_tokens: 500,
        stream: true,
      },
      timeoutMs,
    );

  try {
    return await Promise.any(
      models.slice(0, 3).map(async (model) => {
        const result = await requestModel(model);
        if (result.ok) return result;
        throw result;
      }),
    );
  } catch (error) {
    const failed = error instanceof AggregateError ? error.errors : [error];
    const first = failed.find((item) => item && typeof item === 'object' && 'ok' in item && item.ok === false) as StreamResult | undefined;
    if (first && first.status === 401) return first;

    for (const model of models.slice(3)) {
      const result = await requestModel(model);
      if (result.ok) return result;
      if (result.status === 401) return result;
    }

    if (first) return first;
    return { ok: false, status: 502, error: 'تعذر الوصول إلى النموذج المجاني.' };
  }
}

export async function startLabibStream(
  history: ChatTurn[],
  page?: Pick<LabibPageContext, 'path' | 'title' | 'hint'> | null,
  screen?: LabibScreenPayload | null,
): Promise<StreamResult> {
  const skipImage = Boolean(page?.path?.startsWith('/ai'));
  const hasImage = !skipImage && Boolean(screen?.image && screen.image.startsWith('data:image/'));
  const groqKey = process.env.GROQ_API_KEY?.trim();
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  let last: StreamResult = {
    ok: false,
    status: 503,
    error: 'أضف مفتاح Groq أو OpenRouter في ملف البيئة ثم أعد تشغيل السيرفر.',
  };

  if (openRouterKey) {
    if (hasImage) {
      const vision = await startOpenRouterStream(history, openRouterKey, page, screen, true);
      if (vision.ok) return vision;
      last = vision;
      if (vision.status === 401) return vision;
    }
    const openRouter = await startOpenRouterStream(history, openRouterKey, page, screen, false);
    if (openRouter.ok) return openRouter;
    last = openRouter;
    if (openRouter.status === 401) return openRouter;
  }

  if (groqKey) {
    if (hasImage) {
      const vision = await startGroqStream(history, groqKey, page, screen, true);
      if (vision.ok) return vision;
      last = vision;
      if (vision.status === 401) return vision;
    }
    const groq = await startGroqStream(history, groqKey, page, screen, false);
    if (groq.ok) return groq;
    last = groq;
  }

  return last;
}
