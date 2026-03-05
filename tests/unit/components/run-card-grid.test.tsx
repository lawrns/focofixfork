import React from 'react'
import { render } from '@testing-library/react'
import { describe, expect, test, vi, beforeEach } from 'vitest'
import { RunCardGrid } from '@/components/dashboard/run-card-grid'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

describe('RunCardGrid', () => {
  const run = {
    id: 'run-1',
    runner: 'cto',
    status: 'running',
    summary: 'Investigate deployment issue',
    task_id: null,
    started_at: '2026-03-05T20:00:00.000Z',
    created_at: '2026-03-05T20:00:00.000Z',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('does not emit the Framer Motion ref warning when rendering cards in AnimatePresence', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { rerender } = render(
      <RunCardGrid
        runs={[run]}
        terminalLinesMap={{ 'run-1': [] }}
        connectionStatesMap={{ 'run-1': 'connecting' }}
      />
    )

    rerender(
      <RunCardGrid
        runs={[]}
        terminalLinesMap={{}}
      />
    )

    expect(
      consoleError.mock.calls.some(([message]) =>
        String(message).includes('Function components cannot be given refs')
      )
    ).toBe(false)

    consoleError.mockRestore()
  })
})
