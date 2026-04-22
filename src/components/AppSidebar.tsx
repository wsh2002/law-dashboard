import { Bot, CalendarRange, Flame, GitCompare, LayoutDashboard, Sparkles, TrendingUp, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar'
const WORKSPACE = [
  { key: 'overview', label: '数据概览和AI诊断', icon: LayoutDashboard },
  { key: 'platform', label: '平台数据对比', icon: GitCompare },
  { key: 'monthly', label: '月度对比分析', icon: TrendingUp },
  { key: 'range', label: '时段对比KPI', icon: CalendarRange },
  { key: 'personal', label: '个人行业爆款', icon: User },
  { key: 'viral', label: '行业爆款视频', icon: Flame },
] as const

const COZE_HREF = 'https://www.coze.cn/store/agent/7626943462554435603?bot_id=true' as const

type Props = {
  activeTab: string
  onSelect: (key: string) => void
}

export function AppSidebar({ activeTab, onSelect }: Props) {
  return (
    <Sidebar collapsible="offcanvas" className="border-slate-200">
      <SidebarHeader className="border-b border-slate-200 px-2 py-3">
        <div className="flex flex-col gap-0.5 px-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">企业诊断</span>
          <span className="text-sm font-semibold text-slate-900">多平台运营</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>工作区</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {WORKSPACE.map((item) => {
                const Icon = item.icon
                const isActive = activeTab === item.key
                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      type="button"
                      isActive={isActive}
                      onClick={() => onSelect(item.key)}
                      className={cn(
                        isActive &&
                          '!bg-slate-900 !text-white hover:!bg-slate-800 hover:!text-white data-[active=true]:!bg-slate-900 data-[active=true]:!text-white'
                      )}
                      tooltip={item.label}
                    >
                      <Icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator className="bg-slate-200" />
        <SidebarGroup>
          <SidebarGroupLabel>工具</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={false}
                  className="text-slate-700"
                  tooltip="Coze 智能体"
                >
                  <a href={COZE_HREF} target="_blank" rel="noopener noreferrer">
                    <Bot />
                    <span>Coze 智能体</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  type="button"
                  isActive={activeTab === 'myAgent'}
                  onClick={() => onSelect('myAgent')}
                  className={cn(
                    activeTab === 'myAgent' &&
                      '!bg-slate-900 !text-white hover:!bg-slate-800 data-[active=true]:!bg-slate-900'
                  )}
                  tooltip="我的智能体"
                >
                  <Sparkles />
                  <span>我的智能体</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
