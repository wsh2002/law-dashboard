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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay }}
      whileHover={{ y: -1 }}
      className={cn('h-full', className)}
      {...motionProps}
    >
      <Card
        size="sm"
        className="h-full rounded-lg border border-slate-200 bg-white shadow-sm ring-0"
      >
        <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
          <CardTitle className="text-xs font-medium leading-snug text-slate-500">{label}</CardTitle>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
            <Icon data-icon="inline-start" />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 pt-0">
          <p className="text-2xl font-semibold tabular-nums tracking-tight text-slate-900 sm:text-3xl">{value}</p>
          <div className="flex w-full min-w-0 items-center justify-between gap-2 text-xs text-slate-500">
            <span className="min-w-0 leading-snug">{sublabel}</span>
            {children}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
