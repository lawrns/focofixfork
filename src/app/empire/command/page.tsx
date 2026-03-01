import { CommandCenterClient } from './command-center-client'

export const metadata = {
  title: 'Command Center | Empire OS',
  description: 'Unified agent control surface for CRICO, ClawdBot, Bosun, and OpenClaw',
}

export default function CommandCenterPage() {
  return <CommandCenterClient />
}
