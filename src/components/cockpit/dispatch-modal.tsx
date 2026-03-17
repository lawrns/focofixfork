'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Bot,
  ChevronDown,
  FolderOpen,
  Layers,
  Loader2,
  Play,
  X,
  Zap,
} from 'lucide-react'
import type { AgentOption, ProjectOption } from '@/components/dashboard/use-dashboard-data'

interface DispatchModalProps {
  open: boolean
  onClose: () => void
  agents: AgentOption[]
  projects: ProjectOption[]
  onDispatched?: (runId: string) => void
  preferredModel?: string
}

type DispatchMode = 'analyze' | 'plan' | 'build' | 'execute'

const MODES: { id: DispatchMode; label: string; desc: string }[] = [
  { id: 'analyze', label: 'Analyze', desc: 'Inspect and report only' },
  { id: 'plan', label: 'Plan', desc: 'Design an approach, no execution' },
  { id: 'build', label: 'Build', desc: 'Implement changes' },
  { id: 'execute', label: 'Full Execution', desc: 'Plan + build + validate' },
]

export function DispatchModal({ open, onClose, agents, projects, onDispatched, preferredModel }: DispatchModalProps) {
  const [task, setTask] = useState('')
  const [agentId, setAgentId] = useState(agents[0]?.id ?? '')
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '')
  const [mode, setMode] = useState<DispatchMode>('execute')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => textRef.current?.focus(), 100)
      if (agents[0]) setAgentId(agents[0].id)
      if (projects[0]) setProjectId(projects[0].id)
    }
  }, [open, agents, projects])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!task.trim()) return
    setSubmitting(true)
    setError(null)

    try {
      const agent = agents.find(a => a.id === agentId)
      const project = projects.find(p => p.id === projectId)

      // Create run
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runner: agent?.nativeId ?? agent?.name ?? 'default',
          project_id: projectId || undefined,
          summary: task.trim(),
          status: 'pending',
          trace: { mode, project_name: project?.name },
        }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const { data: run } = await res.json()

      // Now dispatch to command surface
      await fetch('/api/command-surface/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: agent?.nativeId ?? agent?.name,
          prompt: `[${mode.toUpperCase()}] ${task.trim()}`,
          bootstrap_run_id: run?.id,
          preferred_model: preferredModel || undefined,
          project_id: projectId || undefined,
          selected_agents: agent?.nativeId ? [agent.nativeId] : undefined,
          context: { mode, project_name: project?.name },
        }),
      }).catch(() => {}) // best-effort dispatch

      window.dispatchEvent(new Event('runs:mutated'))
      onDispatched?.(run?.id)
      onClose()
      setTask('')
    } catch (err) {
      setError(String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -20 }}
            transition={{ duration: 0.18 }}
            className="fixed left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-xl"
          >
            <form
              onSubmit={handleSubmit}
              className="bg-[#111113] border border-zinc-700/60 rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-zinc-800/60">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-teal-400" />
                  <h2 className="text-sm font-semibold text-zinc-100">Dispatch Task</h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 flex flex-col gap-4">
                {/* Task input */}
                <textarea
                  ref={textRef}
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  placeholder="Describe the task or goal…"
                  rows={3}
                  className={cn(
                    'w-full bg-zinc-900 border border-zinc-700/50 rounded-lg px-3.5 py-3 text-sm text-zinc-100',
                    'placeholder:text-zinc-600 font-sans resize-none',
                    'focus:outline-none focus:border-teal-500/60 focus:ring-1 focus:ring-teal-500/20',
                    'transition-colors',
                  )}
                />

                {/* Mode selector */}
                <div>
                  <label className="text-[10px] text-zinc-600 uppercase tracking-wider font-mono mb-2 block">
                    Mode
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {MODES.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMode(m.id)}
                        className={cn(
                          'rounded-lg border px-2 py-2 text-xs font-mono text-left transition-colors',
                          mode === m.id
                            ? 'border-teal-500/50 bg-teal-950/30 text-teal-300'
                            : 'border-zinc-700/40 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300',
                        )}
                      >
                        <div className="font-semibold">{m.label}</div>
                        <div className="text-[9px] mt-0.5 opacity-70 leading-tight">{m.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Agent + project row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-zinc-600 uppercase tracking-wider font-mono mb-1.5 block flex items-center gap-1">
                      <Bot className="w-3 h-3" /> Agent
                    </label>
                    <div className="relative">
                      <select
                        value={agentId}
                        onChange={(e) => setAgentId(e.target.value)}
                        className={cn(
                          'w-full bg-zinc-900 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-200',
                          'appearance-none focus:outline-none focus:border-teal-500/60',
                          'font-mono',
                        )}
                      >
                        {agents.map((a) => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-600 uppercase tracking-wider font-mono mb-1.5 block flex items-center gap-1">
                      <FolderOpen className="w-3 h-3" /> Project
                    </label>
                    <div className="relative">
                      <select
                        value={projectId}
                        onChange={(e) => setProjectId(e.target.value)}
                        className={cn(
                          'w-full bg-zinc-900 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-200',
                          'appearance-none focus:outline-none focus:border-teal-500/60',
                          'font-mono',
                        )}
                      >
                        <option value="">No project</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-rose-400 font-mono">{error}</p>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 pb-5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs text-zinc-500 hover:text-zinc-300 font-mono transition-colors"
                >
                  cancel
                </button>
                <button
                  type="submit"
                  disabled={!task.trim() || submitting}
                  className={cn(
                    'flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-colors',
                    'bg-teal-500 text-black hover:bg-teal-400',
                    'disabled:opacity-40 disabled:cursor-not-allowed',
                  )}
                >
                  {submitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  {submitting ? 'dispatching…' : 'dispatch'}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
