import type { ReactNode } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { type LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type Props = {
  label: string
  sublabel: string
  value: string
  icon: LucideIcon
  delay?: number
  children?: ReactNode
} & Omit<HTMLMotionProps<'div'>, 'children'>

export function KpiStatCard({
  label,
  sublabel,
  value,
  icon: Icon,
  delay = 0,
  children,
  className,
  ...motionProps
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={cn('h-full', className)}
      {...motionProps}
    >
      <Card
        size="sm"
        className="h-full rounded-xl border border-slate-200/70 bg-gradient-to-br from-white to-slate-50/80 ring-0 shadow-premium-sm hover:shadow-premium transition-shadow duration-300"
      >
        <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
          <CardTitle className="text-xs font-semibold leading-snug text-slate-500 tracking-wide">{label}</CardTitle>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 text-slate-600 border border-slate-200/50 shadow-sm">
            <Icon data-icon="inline-start" className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 pt-0">
          <p className="text-2xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-3xl">{value}</p>
          <div className="flex w-full min-w-0 items-center justify-between gap-2 text-xs text-slate-500">
            <span className="min-w-0 leading-snug font-medium">{sublabel}</span>
            {children}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
