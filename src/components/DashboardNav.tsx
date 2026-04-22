import { motion } from 'framer-motion'
import {
  Bot,
  CalendarRange,
  Flame,
  GitCompare,
  LayoutDashboard,
  Sparkles,
  TrendingUp,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'

const PRIMARY_NAV: {
  key: string
  label: string
  shortLabel: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { key: 'overview', label: '数据概览和AI诊断', shortLabel: '概览', icon: LayoutDashboard },
  { key: 'platform', label: '平台数据对比', shortLabel: '平台', icon: GitCompare },
  { key: 'monthly', label: '月度对比分析', shortLabel: '月度', icon: TrendingUp },
  { key: 'range', label: '时段对比KPI', shortLabel: '时段', icon: CalendarRange },
  { key: 'personal', label: '个人行业爆款', shortLabel: '个人', icon: User },
  { key: 'viral', label: '行业爆款视频', shortLabel: '爆款', icon: Flame },
]

const COZE = {
  key: 'coze',
  label: 'Coze 智能体',
  shortLabel: 'Coze',
  href: 'https://www.coze.cn/store/agent/7626943462554435603?bot_id=true' as const,
  icon: Bot,
}

const MY_AGENT = { key: 'myAgent', label: '我的智能体', shortLabel: '智能体', icon: Sparkles }

type Props = {
  activeTab: string
  onSelect: (key: string) => void
}

export function DashboardNav({ activeTab, onSelect }: Props) {
  return (
    <div className="pointer-events-auto fixed left-2 top-20 z-40 hidden w-[15rem] md:block">
      <nav
        className="flex max-h-[calc(100vh-5.5rem)] flex-col gap-0.5 overflow-y-auto overscroll-contain rounded-2xl border border-border/70 bg-card/90 p-2 shadow-sm ring-1 ring-foreground/5 backdrop-blur-md"
        aria-label="主导航"
      >
        <p className="px-2.5 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          工作区
        </p>
        {PRIMARY_NAV.map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onSelect(tab.key)}
              className={cn(
                'relative flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              )}
            >
              {active && (
                <motion.span
                  layoutId="navActive"
                  className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-primary-foreground/70"
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                />
              )}
              <Icon className="size-4 shrink-0 opacity-90" />
              <span className="min-w-0 flex-1 pl-0.5 leading-snug">{tab.label}</span>
            </button>
          )
        })}

        <Separator className="my-1.5 bg-border/80" />

        <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">工具</p>
        <a
          href={COZE.href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
        >
          <COZE.icon className="size-4 shrink-0 opacity-90" />
          <span className="min-w-0 flex-1 leading-snug pl-0.5">{COZE.label}</span>
        </a>
        <button
          type="button"
          onClick={() => onSelect(MY_AGENT.key)}
          className={cn(
            'relative flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-medium transition-colors',
            activeTab === MY_AGENT.key
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
          )}
        >
          {activeTab === MY_AGENT.key && (
            <motion.span
              layoutId="navActive"
              className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-primary-foreground/70"
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            />
          )}
          <MY_AGENT.icon className="size-4 shrink-0 opacity-90" />
          <span className="min-w-0 flex-1 pl-0.5 leading-snug">{MY_AGENT.label}</span>
        </button>
      </nav>
    </div>
  )
}

/** 小屏：顶栏横向滚动，避免与侧栏抢空间 */
export function MobileTabStrip({ activeTab, onSelect }: Props) {
  return (
    <div className="pointer-events-auto sticky top-0 z-30 mb-3 border-b border-border/50 bg-background/90 py-2.5 pl-1 pr-2 backdrop-blur-md md:hidden">
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PRIMARY_NAV.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onSelect(tab.key)}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              activeTab === tab.key
                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                : 'border-border/60 bg-card/90 text-muted-foreground active:bg-muted'
            )}
          >
            {tab.shortLabel}
          </button>
        ))}
        <a
          href={COZE.href}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-full border border-border/60 bg-card/90 px-3 py-1.5 text-xs font-medium text-muted-foreground"
        >
          {COZE.shortLabel}
        </a>
        <button
          type="button"
          onClick={() => onSelect(MY_AGENT.key)}
          className={cn(
            'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
            activeTab === MY_AGENT.key
              ? 'border-primary bg-primary text-primary-foreground shadow-sm'
              : 'border-border/60 bg-card/90 text-muted-foreground'
          )}
        >
          {MY_AGENT.shortLabel}
        </button>
      </div>
    </div>
  )
}
