/** 火山方舟 Doubao（OpenAI 兼容）；默认 model 与控制台「快捷 API 接入」示例一致 */

import type { ZhipuMessage } from './zhipuChat';

function parseErrorBody(text: string): string {
  try {
    const j = JSON.parse(text) as { error?: { message?: string }; message?: string };
    return j.error?.message ?? j.message ?? text;
  } catch {
    return text;
  }
}

export type DoubaoChatOptions = {
  temperature?: number;
  max_tokens?: number;
  signal?: AbortSignal;
};

/**
 * 控制台「快捷 API」里 OpenAI 示例的 model 字段（带版本后缀）；若方舟升级型号，以控制台为准并可通过环境变量覆盖。
 */
const DOUBAO_DEFAULT_MODEL_ID = 'doubao-seed-2-0-pro-260215';

function doubaoModelId(): string {
  const injected = typeof __LAW_DOUBAO_MODEL__ === 'string' ? __LAW_DOUBAO_MODEL__.trim() : '';
  if (injected) return injected;
  const vite = (import.meta.env.VITE_DOUBAO_MODEL as string | undefined)?.trim() ?? '';
  if (vite) return vite;
  return DOUBAO_DEFAULT_MODEL_ID;
}

/**
 * 开发：走 `/api/doubao` 代理 + DOUBAO_API_KEY。
 * 生产：需 VITE_DOUBAO_API_KEY 直连（会进入打包产物）。
 *
 * model 优先级：DOUBAO_ENDPOINT_ID / VITE_DOUBAO_MODEL（vite 注入）→ VITE_DOUBAO_MODEL → 默认 `doubao-seed-2-0-pro-260215`。
 * 若账号仅支持接入点调用，请设 DOUBAO_ENDPOINT_ID=ep-xxxx。
 */
export async function doubaoChatCompletion(
  messages: ZhipuMessage[],
  options?: DoubaoChatOptions
): Promise<string> {
  const temperature = options?.temperature ?? 0.75;
  const max_tokens = options?.max_tokens ?? 8192;
  const model = doubaoModelId();

  const url = '/api/doubao/chat/completions';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const viteKey = import.meta.env.VITE_DOUBAO_API_KEY;
  if (viteKey) {
    headers.Authorization = `Bearer ${viteKey}`;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    signal: options?.signal,
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens,
    }),
  });

  const raw = await res.text();
  if (!res.ok) {
    let msg = parseErrorBody(raw) || `请求失败 HTTP ${res.status}`;
    if (/does not exist|no access|endpoint/i.test(msg)) {
      msg +=
        '（请对照控制台「快捷 API 接入」核对 model 字符串；或改用 DOUBAO_ENDPOINT_ID=ep-xxxx。勿使用带小数点的 doubao-seed-2.0-pro。）';
    }
    throw new Error(msg);
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
