'use client'

import { motion } from 'framer-motion'

export function WorkflowMiniGraph({
  trigger,
  steps,
}: {
  trigger: string
  steps: string[]
}) {
  const items = [trigger, ...steps.slice(0, 3)]

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-background to-muted/30 p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.12),transparent_35%)]" />
      <div className="relative flex flex-wrap items-center gap-3">
        {items.map((item, index) => (
          <div key={`${item}-${index}`} className="flex items-center gap-3">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06, duration: 0.25 }}
              className={`rounded-xl border px-3 py-2 text-xs font-medium ${index === 0 ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700' : 'border-slate-200 bg-white text-slate-700'}`}
            >
              {item}
            </motion.div>
            {index < items.length - 1 && <div className="h-px w-6 bg-gradient-to-r from-emerald-400 to-sky-400" />}
          </div>
        ))}
      </div>
    </div>
  )
}
