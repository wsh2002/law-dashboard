import type { ChatMessage } from '../types/chatMessage';
import { supabase } from '../services/supabase';

const sessionKey = (userId: string) => `lawAgent_sessions_v1_${userId}`;
const activeKey  = (userId: string) => `lawAgent_activeSessionId_v1_${userId}`;

export interface AgentSession {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
}

export function deriveSessionTitle(messages: ChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === 'user');
  if (firstUser) {
    const t = firstUser.content.trim().replace(/\s+/g, ' ');
    if (!t) return '新对话';
    return t.length > 28 ? `${t.slice(0, 28)}…` : t;
  }
  return '新对话';
}

// ── localStorage（本地缓存，极速加载）────────────────────────────────

export function loadAgentSessions(userId: string): { sessions: AgentSession[]; activeId: string | null } {
  try {
    const raw = localStorage.getItem(sessionKey(userId));
    if (!raw) return { sessions: [], activeId: null };
    const parsed = JSON.parse(raw) as AgentSession[];
    const sessions = Array.isArray(parsed) ? parsed : [];
    const activeId = localStorage.getItem(activeKey(userId));
    return { sessions, activeId };
  } catch {
    return { sessions: [], activeId: null };
  }
}

export function persistAgentSessions(sessions: AgentSession[], activeId: string, userId: string): void {
  try {
    localStorage.setItem(sessionKey(userId), JSON.stringify(sessions));
    localStorage.setItem(activeKey(userId), activeId);
  } catch {
    /* ignore quota */
  }
}

// ── Supabase（云端主存储，换机也在）──────────────────────────────────

export async function loadAgentSessionsRemote(userId: string): Promise<AgentSession[]> {
  const { data, error } = await supabase
    .from('agent_sessions')
    .select('id, title, updated_at, messages')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error || !data) return [];
  return (data as any[]).map((row) => ({
    id: row.id as string,
    title: (row.title as string | null) ?? '新对话',
    updatedAt: new Date(row.updated_at as string).getTime(),
    messages: Array.isArray(row.messages) ? (row.messages as ChatMessage[]) : [],
  }));
}

export async function upsertSessionRemote(session: AgentSession, userId: string): Promise<void> {
  const { error } = await supabase.from('agent_sessions').upsert({
    id: session.id,
    user_id: userId,
    title: session.title,
    updated_at: new Date(session.updatedAt).toISOString(),
    messages: session.messages,
  });
  if (error) console.error('会话云端同步失败:', error.message);
}

export async function deleteSessionRemote(sessionId: string): Promise<void> {
  const { error } = await supabase.from('agent_sessions').delete().eq('id', sessionId);
  if (error) console.error('会话云端删除失败:', error.message);
}

// ── 公共工具 ──────────────────────────────────────────────────────────

export function createAgentSession(initialMessages: ChatMessage[]): AgentSession {
  const id = `s-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return {
    id,
    title: deriveSessionTitle(initialMessages),
    updatedAt: Date.now(),
    messages: initialMessages.map((m) => ({ ...m })),
  };
}
