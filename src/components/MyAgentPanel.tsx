import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
  type MouseEvent,
  type ChangeEvent,
} from 'react';
import { motion } from 'framer-motion';
import {
  Bot,
  Send,
  Trash2,
  Copy,
  Check,
  Sparkles,
  ChevronDown,
  Plus,
  MessageSquare,
  X,
  RotateCcw,
  ChevronRight,
  FileText,
  Upload,
  Square,
} from 'lucide-react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';
import type { ZhipuMessage } from '../services/zhipuChat';
import { agentChatCompletion, type AgentBackend } from '../services/agentChat';
import type { ChatMessage } from '../types/chatMessage';
import {
  loadAgentSessions,
  persistAgentSessions,
  loadAgentSessionsRemote,
  upsertSessionRemote,
  deleteSessionRemote,
  createAgentSession,
  deriveSessionTitle,
  type AgentSession,
} from '../lib/agentSessions';
import {
  loadStyleDoc,
  saveStyleDoc,
  clearStyleDoc,
  buildStyleReferenceSystemMessage,
  STYLE_DOC_MAX_CHARS,
  type StoredStyleDoc,
} from '../lib/agentStyleDoc';

export type { ChatMessage };

const WELCOME_ID = 'welcome';

const SYSTEM_PROMPT: ZhipuMessage = {
  role: 'system',
  content: `你是「文案二创」助手，服务于多平台运营与短视频场景。

【核心任务】
1. 用户会提供原始文案或创意方向，你需要在保留核心信息的前提下进行二次创作（改写、扩写、缩句、换风格、换平台口吻等）。
2. 对话会多轮进行：用户随时可能提出修改意见（语气、字数、梗、合规、去掉某句、加强转化等）或全新要求。你必须结合上文完整对话理解意图，在最新一版基础上迭代，不要无故丢弃已确认的内容。
3. 若用户只贴文案未说明需求，先简要确认或给出 1～2 个方向的二创版本，并邀请用户指定偏好。
4. 若要求涉及敏感、违规、虚假宣传，礼貌拒绝并给出合规替代思路。

【输出习惯】
- 结构清晰，可用小标题、列表；重要句可加粗强调（Markdown）。
- 默认中文；用户要求英文或其它语言时照做。
- 避免冗长套话，优先可直接发布的成品文案。

【模型切换】
- 用户可能在同一对话线程中切换底层模型（智谱 / DeepSeek / 豆包 / 通义千问）。你收到的 messages 已包含该线程内全部可见往来，你必须视为**连续同一任务**，承接上文继续二创或修改，不要因切换而假装对话刚开始、不要重复用户已满意的段落（除非用户明确要求重述）。

【文案风格】
- 若对话中还提供了「用户文案风格参考」系统消息，生成时应优先贴近其中的语气、节奏、用词与结构习惯；与用户当条指令冲突时以用户当前指令为准。`,
};

const AGENT_BACKEND_STORAGE = 'lawDashboard_agentBackend';

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: WELCOME_ID,
    role: 'assistant',
    content:
      '你好，我是**文案二创**助手。\n\n请直接粘贴你的**原文案**，或说明想写的主题与平台（如抖音口播、小红书标题等）。我会给出二创稿；之后你可以随时说「再短一点」「更口语」「换个梗」等，我会按你的要求**反复改到满意**。',
  },
];

function buildApiMessages(history: ChatMessage[], styleText: string | null): ZhipuMessage[] {
  const rest = history.filter((m) => m.id !== WELCOME_ID);
  const out: ZhipuMessage[] = [SYSTEM_PROMPT];
  const st = styleText?.trim();
  if (st) {
    out.push(buildStyleReferenceSystemMessage(st));
  }
  out.push(...rest.map((m) => ({ role: m.role, content: m.content })));
  return out;
}

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setOk(true);
      window.setTimeout(() => setOk(false), 2000);
    } catch {
      /* ignore */
    }
  };
  return (
    <button
      type="button"
      onClick={() => void onCopy()}
      className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full text-slate-500 bg-white shadow-sm ring-1 ring-slate-200/90 hover:text-violet-600 hover:ring-violet-200 hover:bg-violet-50/90 transition-all"
      title="复制全文"
    >
      {ok ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 px-0.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-violet-400"
          animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </span>
  );
}

function loadAgentBackend(): AgentBackend {
  try {
    const s = localStorage.getItem(AGENT_BACKEND_STORAGE);
    if (s === 'deepseek' || s === 'zhipu' || s === 'doubao' || s === 'qwen') return s;
  } catch {
    /* ignore */
  }
  return 'zhipu';
}

function maxOutTokens(backend: AgentBackend): number {
  return backend === 'zhipu' ? 6144 : 8192;
}

function isAbortError(e: unknown): boolean {
  return (
    (e instanceof DOMException && e.name === 'AbortError') ||
    (e instanceof Error && e.name === 'AbortError')
  );
}

export default function MyAgentPanel({ userId }: { userId: string }) {
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [agentBackend, setAgentBackend] = useState<AgentBackend>(loadAgentBackend);
  const [helpOpen, setHelpOpen] = useState(false);
  const [styleMeta, setStyleMeta] = useState<StoredStyleDoc | null>(() => loadStyleDoc(userId));
  const [styleUploadError, setStyleUploadError] = useState<string | null>(null);
  const styleFileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sendAbortRef = useRef<AbortController | null>(null);
  const agentRequestSeqRef = useRef(0);

  const stopGeneration = useCallback(() => {
    sendAbortRef.current?.abort();
  }, []);

  const applyStyleUpload = useCallback((raw: string, fileName: string) => {
    const err = saveStyleDoc(raw, fileName, userId);
    if (err) {
      setStyleUploadError(err);
      return;
    }
    setStyleUploadError(null);
    setStyleMeta(loadStyleDoc(userId));
  }, [userId]);

  const onStyleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      e.target.value = '';
      if (!f) return;
      const lower = f.name.toLowerCase();
      if (!lower.endsWith('.txt') && !lower.endsWith('.md')) {
        setStyleUploadError('当前仅支持 .txt、.md 文件');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const raw = typeof reader.result === 'string' ? reader.result : '';
        applyStyleUpload(raw, f.name);
      };
      reader.onerror = () => setStyleUploadError('读取文件失败');
      reader.readAsText(f, 'UTF-8');
    },
    [applyStyleUpload]
  );

  const handleClearStyleDoc = useCallback(() => {
    clearStyleDoc(userId);
    setStyleMeta(null);
    setStyleUploadError(null);
  }, [userId]);

  useEffect(() => {
    // 1. 先从 localStorage 立即渲染（无网络延迟）
    const { sessions: local, activeId: localActiveId } = loadAgentSessions(userId);
    if (local.length > 0) {
      const aid = localActiveId && local.some((x) => x.id === localActiveId) ? localActiveId : local[0].id;
      setSessions(local);
      setActiveSessionId(aid);
      setHydrated(true);
    }

    // 2. 从 Supabase 拉取云端数据（换机/清缓存后也能恢复）
    loadAgentSessionsRemote(userId)
      .then((remote) => {
        if (remote.length > 0) {
          setSessions(remote);
          setActiveSessionId((prev) =>
            remote.some((x) => x.id === prev) ? prev : remote[0].id
          );
          persistAgentSessions(remote, remote[0].id, userId);
        } else if (local.length === 0) {
          // 云端和本地都没有数据，创建初始会话
          const s = createAgentSession([...INITIAL_MESSAGES]);
          setSessions([s]);
          setActiveSessionId(s.id);
          void upsertSessionRemote(s, userId);
          persistAgentSessions([s], s.id, userId);
        }
      })
      .catch(() => {
        // 网络失败，退回本地数据
        if (local.length === 0) {
          const s = createAgentSession([...INITIAL_MESSAGES]);
          setSessions([s]);
          setActiveSessionId(s.id);
        }
      })
      .finally(() => {
        setHydrated(true);
      });
  }, [userId]);

  useEffect(() => {
    if (!hydrated || !activeSessionId) return;
    persistAgentSessions(sessions, activeSessionId, userId);
  }, [sessions, activeSessionId, hydrated, userId]);

  // 仅在会话内容实际变化时才写 Supabase（按 updatedAt 判断，避免频繁写入）
  const lastSyncedRef = useRef<Record<string, number>>({});
  useEffect(() => {
    if (!hydrated || !activeSessionId) return;
    const active = sessions.find((s) => s.id === activeSessionId);
    if (!active) return;
    if (lastSyncedRef.current[active.id] === active.updatedAt) return;
    lastSyncedRef.current[active.id] = active.updatedAt;
    void upsertSessionRemote(active, userId);
  }, [sessions, activeSessionId, hydrated, userId]);

  useEffect(() => {
    try {
      localStorage.setItem(AGENT_BACKEND_STORAGE, agentBackend);
    } catch {
      /* ignore */
    }
  }, [agentBackend]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [sessions, activeSessionId, sending]);

  const messages = useMemo(() => {
    const s = sessions.find((x) => x.id === activeSessionId);
    return s?.messages ?? INITIAL_MESSAGES;
  }, [sessions, activeSessionId]);

  const setMessagesForActive = useCallback(
    (updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
      if (!activeSessionId) return;
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== activeSessionId) return s;
          const prevMsgs = s.messages;
          const newMsgs =
            typeof updater === 'function' ? (updater as (p: ChatMessage[]) => ChatMessage[])(prevMsgs) : updater;
          return {
            ...s,
            messages: newMsgs,
            updatedAt: Date.now(),
            title: deriveSessionTitle(newMsgs),
          };
        })
      );
    },
    [activeSessionId]
  );

  const newSession = useCallback(() => {
    const s = createAgentSession([...INITIAL_MESSAGES]);
    setSessions((prev) => [s, ...prev]);
    setActiveSessionId(s.id);
    setInput('');
    void upsertSessionRemote(s, userId);
  }, [userId]);

  const switchSession = useCallback((id: string) => {
    setActiveSessionId(id);
    setInput('');
  }, []);

  const deleteSession = useCallback(
    (id: string, e?: MouseEvent) => {
      e?.stopPropagation();
      void deleteSessionRemote(id);
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== id);
        if (next.length === 0) {
          const s = createAgentSession([...INITIAL_MESSAGES]);
          setActiveSessionId(s.id);
          void upsertSessionRemote(s, userId);
          return [s];
        }
        if (activeSessionId === id) {
          setActiveSessionId(next[0].id);
        }
        return next;
      });
    },
    [activeSessionId, userId]
  );

  const clearChat = useCallback(() => {
    setMessagesForActive([...INITIAL_MESSAGES]);
    setInput('');
  }, [setMessagesForActive]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending || !activeSessionId) return;

    const seq = ++agentRequestSeqRef.current;
    sendAbortRef.current?.abort();
    const ac = new AbortController();
    sendAbortRef.current = ac;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
    };
    const nextHistory: ChatMessage[] = [...messages, userMsg];
    setInput('');
    setSending(true);
    setMessagesForActive(nextHistory);

    try {
      const replyText = await agentChatCompletion(
        buildApiMessages(nextHistory, styleMeta?.text ?? null),
        agentBackend,
        {
          temperature: 0.75,
          max_tokens: maxOutTokens(agentBackend),
          thinking: 'disabled',
          signal: ac.signal,
        }
      );
      if (seq !== agentRequestSeqRef.current) return;
      const reply: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: replyText,
      };
      setMessagesForActive((prev) => [...prev, reply]);
    } catch (e) {
      if (isAbortError(e)) return;
      if (seq !== agentRequestSeqRef.current) return;
      const msg = e instanceof Error ? e.message : '请求失败';
      const errReply: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `调用失败：${msg}`,
      };
      setMessagesForActive((prev) => [...prev, errReply]);
    } finally {
      if (seq === agentRequestSeqRef.current) {
        sendAbortRef.current = null;
        setSending(false);
      }
    }
  }, [input, sending, messages, agentBackend, activeSessionId, setMessagesForActive, styleMeta]);

  const canRegenerate = useMemo(() => {
    if (sending || messages.length < 2) return false;
    const last = messages[messages.length - 1];
    return last.role === 'assistant';
  }, [messages, sending]);

  const regenerate = useCallback(async () => {
    if (!canRegenerate || !activeSessionId) return;
    const last = messages[messages.length - 1];
    if (last.role !== 'assistant') return;
    const base = messages.slice(0, -1);
    if (base.length === 0 || base[base.length - 1].role !== 'user') return;

    const seq = ++agentRequestSeqRef.current;
    sendAbortRef.current?.abort();
    const ac = new AbortController();
    sendAbortRef.current = ac;

    setSending(true);
    setMessagesForActive(base);
    try {
      const replyText = await agentChatCompletion(
        buildApiMessages(base, styleMeta?.text ?? null),
        agentBackend,
        {
          temperature: 0.75,
          max_tokens: maxOutTokens(agentBackend),
          thinking: 'disabled',
          signal: ac.signal,
        }
      );
      if (seq !== agentRequestSeqRef.current) return;
      const reply: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: replyText,
      };
      setMessagesForActive((prev) => [...prev, reply]);
    } catch (e) {
      if (isAbortError(e)) return;
      if (seq !== agentRequestSeqRef.current) return;
      const msg = e instanceof Error ? e.message : '请求失败';
      setMessagesForActive((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, role: 'assistant', content: `调用失败：${msg}` },
      ]);
    } finally {
      if (seq === agentRequestSeqRef.current) {
        sendAbortRef.current = null;
        setSending(false);
      }
    }
  }, [canRegenerate, messages, agentBackend, activeSessionId, setMessagesForActive, styleMeta]);

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => b.updatedAt - a.updatedAt),
    [sessions]
  );

  const lastAssistantIdx = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return i;
    }
    return -1;
  }, [messages]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto max-w-6xl space-y-5"
    >
      <div
        className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[min(100%,48rem)] -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-400/20 via-indigo-300/15 to-cyan-300/20 blur-3xl"
        aria-hidden
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,220px)_1fr]">
        {/* 历史会话 */}
        <aside className="order-2 flex flex-col gap-2 lg:order-1">
          <div className="flex items-center justify-between gap-2 rounded-2xl border border-white/70 bg-white/75 px-3 py-2.5 shadow-sm backdrop-blur-xl">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <MessageSquare className="h-3.5 w-3.5 text-indigo-500" />
              历史对话
            </span>
            <button
              type="button"
              onClick={newSession}
              disabled={sending}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2 py-1 text-[11px] font-medium text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
            >
              <Plus className="h-3 w-3" />
              新建
            </button>
          </div>
          <div className="max-h-[min(40vh,320px)] space-y-1.5 overflow-y-auto rounded-2xl border border-white/70 bg-white/60 p-2 shadow-sm backdrop-blur-xl lg:max-h-[min(70vh,560px)]">
            {sortedSessions.map((s) => (
              <div
                key={s.id}
                className={cn(
                  'group relative flex w-full items-start gap-1 rounded-xl border px-2.5 py-2 text-left transition-colors',
                  s.id === activeSessionId
                    ? 'border-indigo-400 bg-indigo-50/90 ring-1 ring-indigo-200/60'
                    : 'border-transparent bg-white/50 hover:border-slate-200 hover:bg-white/90'
                )}
              >
                <button
                  type="button"
                  onClick={() => switchSession(s.id)}
                  disabled={sending}
                  className="min-w-0 flex-1 text-left disabled:opacity-60"
                >
                  <div className="truncate text-xs font-medium text-slate-800">{s.title}</div>
                  <div className="mt-0.5 text-[10px] text-slate-400">
                    {format(new Date(s.updatedAt), 'M/d HH:mm')}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={(e) => deleteSession(s.id, e)}
                  className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100"
                  title="删除此会话"
                  aria-label="删除会话"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-white/70 bg-white/75 p-3 shadow-sm backdrop-blur-xl">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <FileText className="h-3.5 w-3.5 shrink-0 text-amber-600" />
              文案风格参考
            </div>
            <p className="mb-2 text-[10px] leading-relaxed text-slate-500">
              上传 .txt / .md，模型会按其中语气与结构辅助二创。此为提示注入（非云端训练）；内容仅保存在本机浏览器。
            </p>
            <input
              ref={styleFileRef}
              type="file"
              accept=".txt,.md,text/plain,text/markdown"
              className="hidden"
              onChange={onStyleFileChange}
            />
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => styleFileRef.current?.click()}
                disabled={sending}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-200/90 bg-amber-50/90 px-2.5 py-2 text-[11px] font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
              >
                <Upload className="h-3.5 w-3.5" />
                上传文档
              </button>
              {styleMeta ? (
                <>
                  <div className="truncate text-[10px] font-medium text-slate-700" title={styleMeta.fileName}>
                    {styleMeta.fileName}
                  </div>
                  {styleMeta.truncated && (
                    <p className="text-[10px] text-amber-700">
                      已自动截取前 {STYLE_DOC_MAX_CHARS.toLocaleString()} 字
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleClearStyleDoc}
                    disabled={sending}
                    className="text-left text-[11px] font-medium text-slate-500 underline-offset-2 hover:text-red-600 hover:underline disabled:opacity-50"
                  >
                    清除参考
                  </button>
                </>
              ) : (
                <span className="text-[10px] text-slate-400">未上传，按默认风格生成</span>
              )}
              {styleUploadError && <p className="text-[10px] text-red-600">{styleUploadError}</p>}
            </div>
          </div>
        </aside>

        <div className="order-1 space-y-5 lg:order-2">
          {/* 标题卡 */}
          <div className="relative overflow-hidden rounded-2xl border border-white/70 bg-white/75 p-1 shadow-[0_20px_50px_-12px_rgba(99,102,241,0.15)] backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-50/90 via-white/40 to-indigo-50/50" />
            <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
              <div className="flex min-w-0 gap-4">
                <div className="relative shrink-0">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 opacity-90 blur-md" />
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/30 ring-2 ring-white/50">
                    <Bot className="h-7 w-7" strokeWidth={1.75} />
                  </div>
                </div>
                <div className="min-w-0 pt-0.5">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold tracking-tight text-slate-900">文案二创助手</h2>
                    <div className="relative inline-flex items-center">
                      <select
                        value={agentBackend}
                        onChange={(e) => setAgentBackend(e.target.value as AgentBackend)}
                        disabled={sending}
                        className={cn(
                          'appearance-none cursor-pointer rounded-full border py-1.5 pl-3 pr-8 text-xs font-semibold shadow-sm transition',
                          'border-indigo-200/90 bg-white/95 text-indigo-900 ring-1 ring-indigo-100/80',
                          'hover:border-indigo-300 hover:bg-indigo-50/60 focus:outline-none focus:ring-2 focus:ring-indigo-400/35',
                          'disabled:cursor-not-allowed disabled:opacity-55'
                        )}
                        aria-label="选择对话模型"
                      >
                        <option value="zhipu">智谱 GLM-4.5-Air</option>
                        <option value="deepseek">DeepSeek V3.2</option>
                        <option value="doubao">Doubao-Seed-2.0-pro</option>
                        <option value="qwen">qwen3.6-plus</option>
                      </select>
                      <ChevronDown
                        className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-indigo-500"
                        aria-hidden
                      />
                    </div>
                  </div>
                  <p className="max-w-xl text-sm leading-relaxed text-slate-600">
                    粘贴原文即可二创；随时提出修改、换风格或新要求，我会结合上文持续迭代成稿。
                  </p>
                  <button
                    type="button"
                    onClick={() => setHelpOpen((o) => !o)}
                    className="mt-2 flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    <ChevronRight
                      className={cn('h-3.5 w-3.5 transition-transform', helpOpen && 'rotate-90')}
                    />
                    {helpOpen ? '收起说明' : '模型与上下文说明'}
                  </button>
                  {helpOpen && (
                    <p className="mt-2 max-w-xl text-[11px] leading-relaxed text-slate-500">
                      切换模型不会清空对话；下一条由新模型回复，请求仍会携带本页全部历史作为上下文。历史对话列表保存在本机浏览器。
                    </p>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-2 self-start sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => void regenerate()}
                  disabled={!canRegenerate || sending}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-violet-200/90 bg-violet-50/80 px-3 py-2 text-xs font-medium text-violet-800 shadow-sm transition-all hover:bg-violet-100 disabled:pointer-events-none disabled:opacity-40"
                  title="基于上一条用户消息重新生成最后一条回复"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  重新生成
                </button>
                <button
                  type="button"
                  onClick={clearChat}
                  disabled={sending}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200/90 bg-white/80 px-4 py-2.5 text-xs font-medium text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:bg-white hover:text-slate-800 disabled:opacity-50"
                  title="清空当前会话内容"
                >
                  <Trash2 className="h-3.5 w-3.5 text-slate-400" />
                  清空当前对话
                </button>
              </div>
            </div>
          </div>

          {/* 对话主卡片 */}
          <div className="relative overflow-hidden rounded-2xl border border-white/80 bg-white/70 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.12)] backdrop-blur-xl">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/50 to-transparent" />

            <div
              ref={scrollRef}
              className="agent-chat-scroll max-h-[min(70vh,640px)] min-h-[380px] space-y-5 overflow-y-auto px-4 py-6 sm:px-6"
            >
              {messages.map((m, idx) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(idx * 0.02, 0.15) }}
                  className={cn('flex gap-3', m.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  {m.role === 'assistant' && (
                    <div className="mt-1 hidden h-8 w-8 shrink-0 rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 ring-1 ring-violet-200/60 sm:flex sm:items-center sm:justify-center">
                      <Sparkles className="h-4 w-4 text-violet-600" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[min(100%,36rem)] text-[15px] leading-relaxed',
                      m.role === 'user'
                        ? [
                            'rounded-2xl rounded-br-md px-4 py-3 text-white shadow-lg shadow-indigo-500/25',
                            'bg-gradient-to-br from-indigo-500 via-blue-600 to-blue-700',
                            'ring-1 ring-white/25',
                          ]
                        : [
                            'rounded-2xl rounded-bl-md border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/95',
                            'px-4 py-3 text-slate-800 shadow-md shadow-slate-200/40',
                            'ring-1 ring-white/80',
                          ]
                    )}
                  >
                    {m.role === 'assistant' ? (
                      <div className="relative -mx-1">
                        <div className="mb-2 flex flex-wrap items-center justify-end gap-2 border-b border-slate-100/90 pb-2">
                          <CopyBtn text={m.content} />
                          {idx === lastAssistantIdx && canRegenerate && !sending && (
                            <button
                              type="button"
                              onClick={() => void regenerate()}
                              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-violet-100 hover:text-violet-800"
                            >
                              <RotateCcw className="h-3 w-3" />
                              重新生成
                            </button>
                          )}
                        </div>
                        <div
                          className={cn(
                            'prose prose-sm max-w-none text-slate-800',
                            'prose-p:my-2 prose-p:leading-relaxed first:prose-p:mt-0',
                            'prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-slate-900',
                            'prose-h2:text-base prose-h3:text-sm',
                            'prose-strong:font-semibold prose-strong:text-slate-900',
                            'prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5',
                            'prose-a:text-violet-600 prose-a:no-underline hover:prose-a:underline'
                          )}
                        >
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap break-words font-medium">{m.content}</p>
                    )}
                  </div>
                </motion.div>
              ))}

              {sending && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start gap-3 pl-0 sm:pl-11"
                >
                  <div className="flex items-center gap-3 rounded-2xl border border-violet-100/90 bg-gradient-to-r from-violet-50/90 to-indigo-50/50 px-4 py-3 text-sm text-violet-800 shadow-sm ring-1 ring-violet-100/80">
                    <span className="font-medium text-violet-700">正在创作</span>
                    <TypingDots />
                  </div>
                </motion.div>
              )}
            </div>

            <div className="sticky bottom-0 border-t border-slate-200/70 bg-gradient-to-b from-slate-50/50 to-white/90 p-4 sm:p-5">
              <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-1 shadow-inner shadow-slate-200/40 ring-1 ring-slate-100">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  placeholder="粘贴文案，或写下修改要求（Shift+Enter 换行）"
                  rows={3}
                  disabled={sending}
                  className="w-full resize-y bg-transparent px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none min-h-[5.5rem]"
                />
                <div className="flex items-center justify-between gap-3 border-t border-slate-100/90 bg-slate-50/50 px-3 py-2.5">
                  <p className="hidden text-[11px] text-slate-400 sm:block">
                    Enter 发送 · Shift+Enter 换行
                  </p>
                  <div className="ml-auto flex items-center gap-2">
                    {sending && (
                      <button
                        type="button"
                        onClick={stopGeneration}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-100 transition hover:border-rose-200 hover:bg-rose-50/80 hover:text-rose-800"
                        aria-label="停止生成"
                      >
                        <Square className="h-3.5 w-3.5 fill-current" aria-hidden />
                        停止生成
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void send()}
                      disabled={sending || !input.trim()}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 ring-1 ring-white/20 transition-all hover:from-indigo-500 hover:to-violet-500 hover:shadow-lg hover:shadow-indigo-500/30 disabled:pointer-events-none disabled:opacity-45"
                    >
                      <Send className="h-4 w-4 opacity-95" />
                      {sending ? '生成中…' : '发送'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
