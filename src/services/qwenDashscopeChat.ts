/** 阿里云 DashScope OpenAI 兼容模式，Qwen3.6-Plus */

import type { ZhipuMessage } from './zhipuChat';

function parseErrorBody(text: string): string {
  try {
    const j = JSON.parse(text) as { error?: { message?: string }; message?: string };
    return j.error?.message ?? j.message ?? text;
  } catch {
    return text;
  }
}

export type QwenDashscopeChatOptions = {
  temperature?: number;
  max_tokens?: number;
  signal?: AbortSignal;
};

const MODEL = 'qwen3.6-plus';

/**
 * 开发：走 `/api/qwen` 代理 + DASHSCOPE_API_KEY。
 * 生产：需 VITE_DASHSCOPE_API_KEY（会进入打包产物）。
 * 国际区可设 VITE_DASHSCOPE_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
 */
export async function qwenDashscopeChatCompletion(
  messages: ZhipuMessage[],
  options?: QwenDashscopeChatOptions
): Promise<string> {
  const temperature = options?.temperature ?? 0.75;
  const max_tokens = options?.max_tokens ?? 8192;

  const isDev = import.meta.env.DEV;
  const prodBase =
    (import.meta.env.VITE_DASHSCOPE_BASE_URL as string | undefined)?.trim() ||
    'https://dashscope.aliyuncs.com/compatible-mode/v1';
  const url = isDev ? '/api/qwen/chat/completions' : `${prodBase.replace(/\/$/, '')}/chat/completions`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const viteKey = import.meta.env.VITE_DASHSCOPE_API_KEY;
  if (viteKey) {
    headers.Authorization = `Bearer ${viteKey}`;
  } else if (!isDev) {
    throw new Error(
      '未配置通义：请在 law-dashboard/.env 中设置 VITE_DASHSCOPE_API_KEY；本地开发可只设 DASHSCOPE_API_KEY 由代理转发。'
    );
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
