import type { ZhipuMessage } from './zhipuChat';
import { zhipuChatCompletion } from './zhipuChat';
import { deepseekChatCompletion } from './deepseekChat';
import { doubaoChatCompletion } from './doubaoChat';
import { qwenDashscopeChatCompletion } from './qwenDashscopeChat';

/** 文案助手可选后端 */
export type AgentBackend = 'zhipu' | 'deepseek' | 'doubao' | 'qwen';

/** `messages` 须为完整多轮对话；仅决定走哪个 HTTP 接口，不裁剪上下文 */
export async function agentChatCompletion(
  messages: ZhipuMessage[],
  backend: AgentBackend,
  options?: {
    temperature?: number;
    max_tokens?: number;
    thinking?: 'enabled' | 'disabled';
    signal?: AbortSignal;
  }
): Promise<string> {
  const temperature = options?.temperature ?? 0.75;
  const signal = options?.signal;
  if (backend === 'zhipu') {
    return zhipuChatCompletion(messages, {
      temperature,
      max_tokens: options?.max_tokens ?? 6144,
      thinking: options?.thinking ?? 'disabled',
      signal,
    });
  }
  if (backend === 'doubao') {
    return doubaoChatCompletion(messages, {
      temperature,
      max_tokens: options?.max_tokens ?? 8192,
      signal,
    });
  }
  if (backend === 'qwen') {
    return qwenDashscopeChatCompletion(messages, {
      temperature,
      max_tokens: options?.max_tokens ?? 8192,
      signal,
    });
  }
  return deepseekChatCompletion(messages, {
    temperature,
    max_tokens: options?.max_tokens ?? 8192,
    signal,
  });
}
