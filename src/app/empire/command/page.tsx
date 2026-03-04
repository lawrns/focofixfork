import { Suspense } from 'react'
import { CommandCenterClient } from './command-center-client'

export const metadata = {
  title: 'Command Center | Empire OS',
  description: 'Live agent orchestration, decision queue, and system health monitoring',
}

export default function CommandCenterPage() {
  return (
    <Suspense>
      <CommandCenterClient />
    </Suspense>
  )
}
