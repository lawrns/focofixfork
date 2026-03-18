'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { PageShell } from '@/components/layout/page-shell'
import { HeroSection } from '@/components/cinematic/hero-section'
import { GlassCard } from '@/components/cinematic/glass-card'
import { PulsingTopology, defaultSystemTopology } from '@/components/cinematic/pulsing-topology'
import { AgentRosterExtended } from '@/components/empire/agent-roster-extended'
import { Badge } from '@/components/ui/badge'

const stagger = { animate: { transition: { staggerChildren: 0.08 } } }
const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
}

function AgentsContent() {
  const searchParams = useSearchParams()
  const workspaceId = searchParams?.get('workspace_id') ?? null
  const topology = defaultSystemTopology()

  return (
    <PageShell>
      <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-4">
        <motion.div variants={fadeUp}>
          <HeroSection
            title="Agent Roster"
            subtitle="Focused operators and advisors — live topology and diagnostics at a glance"
            badge={
              <Badge
                variant="outline"
                className="border-zinc-700 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-emerald-300"
              >
                system live
              </Badge>
            }
          />
        </motion.div>

        <motion.div variants={fadeUp}>
          <GlassCard hover={false} className="p-4">
            <p className="mb-2 text-[11px] uppercase tracking-[0.28em] text-zinc-500">
              System Topology
            </p>
            <PulsingTopology
              nodes={topology.nodes}
              edges={topology.edges}
              height={240}
            />
          </GlassCard>
        </motion.div>

        <motion.div variants={fadeUp} className="w-full">
          <AgentRosterExtended workspaceId={workspaceId} />
        </motion.div>
      </motion.div>
    </PageShell>
  )
}

function AgentsFallback() {
  return (
    <PageShell>
      <div className="space-y-4">
        <div className="rounded-2xl border border-zinc-800/60 bg-[#111214] p-5">
          <div className="h-4 w-32 animate-pulse rounded bg-zinc-800" />
          <div className="mt-3 h-6 w-3/4 animate-pulse rounded bg-zinc-800" />
          <div className="mt-2 h-3 w-full animate-pulse rounded bg-zinc-800/60" />
        </div>
        <div className="rounded-2xl border border-zinc-800/60 bg-[#0e0f11] p-4">
          <div className="h-3 w-24 animate-pulse rounded bg-zinc-800" />
          <div className="mt-3 h-40 animate-pulse rounded bg-zinc-800/30" />
        </div>
      </div>
    </PageShell>
  )
}

export default function AgentsPage() {
  return (
    <Suspense fallback={<AgentsFallback />}>
      <AgentsContent />
    </Suspense>
  )
}
