import nextDynamic from 'next/dynamic'
import { CockpitFallback } from '@/components/cockpit/cockpit-shell'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Cockpit — OpenClaw Mission Control',
  description: 'Real-time operations bridge for agents, runs, crons, and system health.',
}

const CockpitShell = nextDynamic(
  () => import('@/components/cockpit/cockpit-shell').then((m) => ({ default: m.CockpitShell })),
  { ssr: false, loading: () => <CockpitFallback /> }
)

export default function CockpitPage() {
  return <CockpitShell />
}
