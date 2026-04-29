/** 智谱开放平台 Chat Completions（GLM-4.5-Air） */

export type ZhipuMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

const MODEL = 'glm-4.5-air';

export type ZhipuChatOptions = {
  /** 默认约 0.72，偏创作可适当提高 */
  temperature?: number;
  max_tokens?: number;
  thinking?: 'enabled' | 'disabled';
  signal?: AbortSignal;
};

function parseErrorBody(text: string): string {
  try {
    const j = JSON.parse(text) as { error?: { message?: string }; message?: string };
    return j.error?.message ?? j.message ?? text;
  } catch {
    return text;
  }
}

/**
 * - 开发：默认走 `/api/zhipu`，由 Vite 代理注入 `ZHIPU_API_KEY`（密钥不进打包产物）。
 * - 若代理未带上密钥（例如 .env 路径不对），可在同目录 `.env` 中设置 `VITE_ZHIPU_API_KEY`，请求头会一并带上。
 * - 生产静态部署：需 `VITE_ZHIPU_API_KEY` 直连智谱（密钥会进入构建产物）。
 */
export async function zhipuChatCompletion(
  messages: ZhipuMessage[],
  options?: ZhipuChatOptions
): Promise<string> {
  const temperature = options?.temperature ?? 0.72;
  const max_tokens = options?.max_tokens ?? 4096;
  const thinkingType = options?.thinking ?? 'disabled';

  const url = '/api/zhipu/chat/completions';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const viteKey = import.meta.env.VITE_ZHIPU_API_KEY;
  if (viteKey) {
    headers.Authorization = `Bearer ${viteKey}`;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    signal: options?.signal,
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature,
      max_tokens,
      thinking: { type: thinkingType },
    }),
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(parseErrorBody(raw) || `请求失败 HTTP ${res.status}`);
  }

  let data: { choices?: { message?: { content?: string } }[] };
  try {
    data = JSON.parse(raw) as typeof data;
  } catch {
    throw new Error('响应不是合法 JSON');
  }

  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('模型未返回有效内容');
  }
  return content;
}
