import { CockpitShell } from '@/components/cockpit/cockpit-shell'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Cockpit — OpenClaw Mission Control',
  description: 'Real-time operations bridge for agents, runs, crons, and system health.',
}

export default function CockpitPage() {
  return <CockpitShell />
}
