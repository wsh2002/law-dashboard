/** DeepSeek 官方 API（OpenAI 兼容），用于文案助手的 DeepSeek 模型 */

import type { ZhipuMessage } from './zhipuChat';

function parseErrorBody(text: string): string {
  try {
    const j = JSON.parse(text) as { error?: { message?: string }; message?: string };
    return j.error?.message ?? j.message ?? text;
  } catch {
    return text;
  }
}

export type DeepseekChatOptions = {
  temperature?: number;
  max_tokens?: number;
  signal?: AbortSignal;
};

/**
 * 开发：走 `/api/deepseek` 代理 + DEEPSEEK_API_KEY。
 * 生产：需 VITE_DEEPSEEK_API_KEY 直连（会进入打包产物）。
 */
export async function deepseekChatCompletion(
  messages: ZhipuMessage[],
  options?: DeepseekChatOptions
): Promise<string> {
  const temperature = options?.temperature ?? 0.75;
  const max_tokens = options?.max_tokens ?? 8192;

  const url = '/api/deepseek/chat/completions';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const viteKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
  if (viteKey) {
    headers.Authorization = `Bearer ${viteKey}`;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    signal: options?.signal,
    body: JSON.stringify({
      model: 'deepseek-v4-flash',
      messages,
      temperature,
      max_tokens,
    }),
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(parseErrorBody(raw) || `请求失败 HTTP ${res.status}`);
  }

  let data: { choices?: { message?: { content?: string | null } }[] };
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
