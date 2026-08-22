import type { LabibPageContext } from './labib-page';

export const GROQ_FREE_MODELS = [
  'llama-3.1-8b-instant',
  'openai/gpt-oss-20b',
  'llama-3.3-70b-versatile',
] as const;

export const OPENROUTER_FREE_MODELS = [
  'z-ai/glm-5.2:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
] as const;

export const OPENROUTER_VISION_MODELS = [
  'openrouter/free',
  'qwen/qwen2.5-vl-32b-instruct:free',
  'google/gemini-2.0-flash-exp:free',
] as const;

export const GROQ_VISION_MODELS = [
  'meta-llama/llama-4-scout-17b-16e-instruct',
] as const;

export const LABIB_SYSTEM_PROMPT = `أنت لبيب، مساعد توجيهي أردني جالس جنب الطالب. أجب بالعربية بجمل قصيرة وواضحة.
إذا وصلك نص الشاشة أو صورة منها، تكلم عن اللي ظاهر فعلاً: أزرار، مواد، أوقات، خطة، تحذيرات. لا تخترع عناصر غير موجودة.
اشرح المطلوب مباشرة مع مثال واحد فقط. لا تختلق معلومات وزارية. لا تذكر اسم النموذج.`;

export type ChatTurn = {
  role: 'user' | 'assistant';
  content: string;
};

type StreamChunk = {
  choices?: Array<{ delta?: { content?: string } }>;
  error?: { message?: string };
};

type StreamResult =
  | { ok: true; body: ReadableStream<Uint8Array> }
  | { ok: false; status: number; error: string };

export type LabibScreenPayload = {
  text?: string;
  image?: string | null;
};

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

async function streamFromEndpoint(
  url: string,
  apiKey: string,
  extraHeaders: Record<string, string>,
  body: Record<string, unknown>,
  timeoutMs: number,
): Promise<StreamResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...extraHeaders,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok || !response.body) {
      const payload = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
      return {
        ok: false,
        status: response.status === 401 ? 401 : 502,
        error: payload.error?.message || 'تعذر بدء الرد.',
      };
    }

    return { ok: true, body: toTokenStream(response.body) };
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    return {
      ok: false,
      status: 502,
      error: aborted ? 'انتهت مهلة الرد، حاول مرة أخرى.' : 'تعذر الاتصال بمزود الذكاء.',
    };
  } finally {
    clearTimeout(timer);
  }
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
      vision ? 12000 : 6000,
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
    'X-Title': 'Labib',
  };
  const models = vision ? OPENROUTER_VISION_MODELS : OPENROUTER_FREE_MODELS;

  const attempts = models.map((model) =>
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
      vision ? 12000 : 5500,
    ),
  );

  try {
    return await Promise.any(
      attempts.map(async (attempt) => {
        const result = await attempt;
        if (result.ok) return result;
        throw result;
      }),
    );
  } catch (error) {
    const failed = error instanceof AggregateError ? error.errors[0] : error;
    if (failed && typeof failed === 'object' && 'ok' in failed && failed.ok === false) {
      return failed as StreamResult;
    }
    return { ok: false, status: 502, error: 'تعذر الوصول إلى النموذج المجاني.' };
  }
}

export async function startLabibStream(
  history: ChatTurn[],
  page?: Pick<LabibPageContext, 'path' | 'title' | 'hint'> | null,
  screen?: LabibScreenPayload | null,
): Promise<StreamResult> {
  const hasImage = Boolean(screen?.image && screen.image.startsWith('data:image/'));
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  const groqKey = process.env.GROQ_API_KEY?.trim();

  if (hasImage && openRouterKey) {
    const vision = await startOpenRouterStream(history, openRouterKey, page, screen, true);
    if (vision.ok) return vision;
  }
  if (hasImage && groqKey) {
    const vision = await startGroqStream(history, groqKey, page, screen, true);
    if (vision.ok) return vision;
  }
  if (openRouterKey) {
    const openRouter = await startOpenRouterStream(history, openRouterKey, page, screen, false);
    if (openRouter.ok) return openRouter;
  }
  if (groqKey) {
    return startGroqStream(history, groqKey, page, screen, false);
  }

  return {
    ok: false,
    status: 503,
    error: 'أضف مفتاح OpenRouter المجاني في ملف البيئة ثم أعد المحاولة.',
  };
}
