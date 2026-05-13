import { CalendarRange, Flame, GitCompare, LayoutDashboard, Sparkles, TrendingUp, User, BarChart3 } from 'lucide-react'
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

type Props = {
  activeTab: string
  onSelect: (key: string) => void
  userEmail?: string
  onLogout?: () => void
}

export function AppSidebar({ activeTab, onSelect, userEmail, onLogout }: Props) {
  return (
    <Sidebar collapsible="offcanvas" className="border-r-0">
      <SidebarHeader className="border-b border-slate-200/60 px-4 py-4">
        <div className="flex items-center gap-3 px-0.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 shadow-sm">
            <BarChart3 className="h-4.5 w-4.5 text-white" />
          </div>
          <div className="flex flex-col gap-0">
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">企业诊断</span>
            <span className="text-sm font-bold text-slate-900 tracking-tight">多平台运营</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.12em] text-slate-400 font-semibold px-2">
            工作区
          </SidebarGroupLabel>
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
                        'rounded-lg transition-all duration-200',
                        isActive
                          ? '!bg-gradient-to-r !from-slate-800 !to-slate-900 !text-white !shadow-sm hover:!from-slate-700 hover:!to-slate-800 data-[active=true]:!bg-slate-900 data-[active=true]:!text-white'
                          : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                      )}
                      tooltip={item.label}
                    >
                      <Icon className={cn('shrink-0', isActive ? 'text-blue-300' : '')} />
                      <span className="font-medium">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator className="bg-slate-200/60 mx-2" />
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.12em] text-slate-400 font-semibold px-2">
            工具
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  type="button"
                  isActive={activeTab === 'myAgent'}
                  onClick={() => onSelect('myAgent')}
                  className={cn(
                    'rounded-lg transition-all duration-200',
                    activeTab === 'myAgent'
                      ? '!bg-gradient-to-r !from-slate-800 !to-slate-900 !text-white !shadow-sm hover:!from-slate-700 hover:!to-slate-800 data-[active=true]:!bg-slate-900'
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                  )}
                  tooltip="我的智能体"
                >
                  <Sparkles className={cn(activeTab === 'myAgent' ? 'text-amber-300' : '')} />
                  <span className="font-medium">我的智能体</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* 底部用户信息区域 */}
      {userEmail && (
        <div className="mt-auto border-t border-slate-200/60 p-3">
          <div className="flex items-center gap-2.5 rounded-lg bg-slate-50/80 px-3 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-xs font-bold text-white shadow-sm">
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-slate-700">{userEmail}</p>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="text-[10px] text-slate-400 hover:text-red-500 transition-colors font-medium"
                >
                  退出登录
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Sidebar>
  )
}
