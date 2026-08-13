export const GROQ_FREE_MODELS = [
  'llama-3.1-8b-instant',
  'openai/gpt-oss-20b',
  'llama-3.3-70b-versatile',
] as const;

export const OPENROUTER_FREE_MODELS = [
  'google/gemma-4-26b-a4b-it:free',
  'nvidia/nemotron-3.5-lightning:free',
  'openrouter/free',
] as const;

export const LABIB_SYSTEM_PROMPT = `أنت لبيب، مساعد توجيهي أردني. أجب بالعربية باختصار ووضوح.
اشرح الخطوات مباشرة مع مثال قصير. لا تختلق معلومات وزارية. لا تذكر اسم النموذج.`;

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

function buildMessages(history: ChatTurn[]) {
  const trimmed = history
    .filter((item) => item.content.trim())
    .slice(-6)
    .map((item) => ({
      role: item.role,
      content: item.content.slice(0, 2000),
    }));

  return [
    { role: 'system' as const, content: LABIB_SYSTEM_PROMPT },
    ...trimmed,
  ];
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

async function startGroqStream(history: ChatTurn[], apiKey: string): Promise<StreamResult> {
  const messages = buildMessages(history);
  let lastError = 'تعذر الوصول إلى Groq.';

  for (const model of GROQ_FREE_MODELS) {
    const result = await streamFromEndpoint(
      'https://api.groq.com/openai/v1/chat/completions',
      apiKey,
      {},
      {
        model,
        messages,
        temperature: 0.4,
        max_tokens: 700,
        stream: true,
      },
      8000,
    );
    if (result.ok) return result;
    lastError = result.error;
    if (result.status === 401) return result;
  }

  return { ok: false, status: 502, error: lastError };
}

async function startOpenRouterStream(history: ChatTurn[], apiKey: string): Promise<StreamResult> {
  const models = OPENROUTER_FREE_MODELS.slice(0, 3);
  const [primary, ...fallbacks] = models;
  if (!primary) {
    return { ok: false, status: 502, error: 'لا يوجد نموذج مجاني متاح.' };
  }

  return streamFromEndpoint(
    'https://openrouter.ai/api/v1/chat/completions',
    apiKey,
    {
      'HTTP-Referer':
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.URL ||
        process.env.DEPLOY_PRIME_URL ||
        'http://localhost:3000',
      'X-Title': 'Labib',
    },
    {
      model: primary,
      models: fallbacks.slice(0, 2),
      provider: { sort: 'latency', allow_fallbacks: true },
      messages: buildMessages(history),
      temperature: 0.4,
      max_tokens: 700,
      stream: true,
    },
    12000,
  );
}

export async function startLabibStream(history: ChatTurn[]): Promise<StreamResult> {
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  if (openRouterKey) {
    const openRouter = await startOpenRouterStream(history, openRouterKey);
    if (openRouter.ok) return openRouter;
  }

  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (groqKey) {
    return startGroqStream(history, groqKey);
  }

  return {
    ok: false,
    status: 503,
    error: 'أضف مفتاح OpenRouter المجاني في ملف البيئة ثم أعد المحاولة.',
  };
}
