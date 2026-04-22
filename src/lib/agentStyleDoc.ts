import type { ZhipuMessage } from '../services/zhipuChat';

const styleDocKey = (userId: string) => `lawAgent_styleDoc_v1_${userId}`;

/** 与单次请求上下文平衡：过长会挤占对话 token */
export const STYLE_DOC_MAX_CHARS = 12000;

export type StoredStyleDoc = {
  text: string;
  fileName: string;
  truncated: boolean;
};

function parseStored(raw: string | null): StoredStyleDoc | null {
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as Partial<StoredStyleDoc>;
    if (typeof j.text !== 'string' || !j.text.trim()) return null;
    return {
      text: j.text,
      fileName: typeof j.fileName === 'string' && j.fileName ? j.fileName : '参考文档',
      truncated: Boolean(j.truncated),
    };
  } catch {
    return null;
  }
}

export function loadStyleDoc(userId: string): StoredStyleDoc | null {
  try {
    return parseStored(localStorage.getItem(styleDocKey(userId)));
  } catch {
    return null;
  }
}

export function prepareAndTruncate(raw: string): { text: string; truncated: boolean } {
  const t = raw.replace(/\r\n/g, '\n').trim();
  if (!t) return { text: '', truncated: false };
  if (t.length <= STYLE_DOC_MAX_CHARS) return { text: t, truncated: false };
  return { text: t.slice(0, STYLE_DOC_MAX_CHARS), truncated: true };
}

/** @returns 错误信息，成功返回 null */
export function saveStyleDoc(rawText: string, fileName: string, userId: string): string | null {
  const { text, truncated } = prepareAndTruncate(rawText);
  if (!text) return '文件内容为空或仅含空白，未保存。';
  try {
    const payload: StoredStyleDoc = {
      text,
      fileName: fileName || '参考文档',
      truncated,
    };
    localStorage.setItem(styleDocKey(userId), JSON.stringify(payload));
    return null;
  } catch {
    return '保存失败（可能超出浏览器存储配额），请缩短文档后重试。';
  }
}

export function clearStyleDoc(userId: string): void {
  try {
    localStorage.removeItem(styleDocKey(userId));
  } catch {
    /* ignore */
  }
}

/** 第二条 system，无文档时不使用 */
export function buildStyleReferenceSystemMessage(styleText: string): ZhipuMessage {
  return {
    role: 'system',
    content: `【用户文案风格参考】
以下为用户上传的参考文档节选，用于推断其偏好（语气、节奏、用词、结构）。生成二创内容时应优先贴近这些特征；若与任务冲突，以当前用户指令为准。
---
${styleText}`,
  };
}
