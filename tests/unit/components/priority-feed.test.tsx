import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PriorityFeed } from '@/components/dashboard/priority-feed'

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const mockRuns = [
  { id: 'run-1', runner: 'clawdbot', status: 'failed', summary: 'Model gpt-5.4 not found', created_at: new Date().toISOString(), ended_at: new Date().toISOString() },
  { id: 'run-2', runner: 'openclaw', status: 'completed', summary: 'Health check passed', created_at: new Date(Date.now() - 3600000).toISOString(), ended_at: new Date().toISOString() },
  { id: 'run-3', runner: 'bosun', status: 'running', summary: 'Processing tasks', created_at: new Date().toISOString(), ended_at: null },
]

const mockProposals = [
  { id: 'prop-1', title: 'Upgrade database schema', status: 'pending_review', project: { name: 'Backend' }, created_at: new Date().toISOString() },
  { id: 'prop-2', title: 'Add caching layer', status: 'approved', project: { name: 'API' }, created_at: new Date().toISOString() },
]

const mockWorkItems = [
  { id: 'work-1', title: 'Fix login bug', status: 'blocked', priority: 'high', project: { name: 'Auth' }, section: 'sprint' },
  { id: 'work-2', title: 'Write tests', status: 'in_progress', priority: 'medium', project: { name: 'Core' }, section: 'backlog' },
]

const mockAgents = [
  { id: 'agent-1', name: 'ClawdBot', status: 'error', errorMessage: 'API key expired' },
  { id: 'agent-2', name: 'Bosun', status: 'idle', errorMessage: null },
]

const emptyProps = {
  proposals: [],
  workItems: [],
  runs: [],
  agents: [],
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe('PriorityFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 1. Empty state
  it('renders empty state when no items need attention', () => {
    render(<PriorityFeed {...emptyProps} />)
    expect(screen.getByText('All clear — nothing needs your attention right now.')).toBeTruthy()
    expect(screen.getByText('Needs Attention')).toBeTruthy()
  })

  // 2. Header with count
  it('renders "Needs Attention" header with correct count', () => {
    render(
      <PriorityFeed
        runs={mockRuns}
        proposals={[{ ...mockProposals[0], status: 'pending' }]}
        workItems={mockWorkItems}
        agents={mockAgents}
      />
    )
    expect(screen.getByText('Needs Attention')).toBeTruthy()
    // P0: 1 failed run + 1 blocked work = 2, P1: 1 pending proposal + 1 agent error = 2
    // urgent count = P0 + P1 = 4
    expect(screen.getByText('4')).toBeTruthy()
  })

  // 3. Failed run items with P0 severity
  it('renders failed run items with P0 severity', () => {
    render(
      <PriorityFeed
        {...emptyProps}
        runs={[mockRuns[0]]}
      />
    )
    expect(screen.getByText('Model gpt-5.4 not found')).toBeTruthy()
    expect(screen.getByText('FAILED RUN')).toBeTruthy()
  })

  // 4. Blocked work items with P0 severity
  it('renders blocked work items with P0 severity', () => {
    render(
      <PriorityFeed
        {...emptyProps}
        workItems={[mockWorkItems[0]]}
      />
    )
    expect(screen.getByText('Fix login bug')).toBeTruthy()
    expect(screen.getByText('BLOCKED')).toBeTruthy()
    expect(screen.getByText('Auth')).toBeTruthy()
  })

  // 5. Pending proposals with P1 severity
  it('renders pending proposals with P1 severity', () => {
    // Component accepts 'pending', 'draft', or 'in_review' — not 'pending_review'
    const pendingProposal = { ...mockProposals[0], status: 'pending' }
    render(
      <PriorityFeed
        {...emptyProps}
        proposals={[pendingProposal]}
      />
    )
    expect(screen.getByText('Upgrade database schema')).toBeTruthy()
    expect(screen.getByText('PROPOSAL')).toBeTruthy()
    expect(screen.getByText('Backend')).toBeTruthy()
  })

  // 6. Agent errors with P1 severity
  it('renders agent errors with P1 severity', () => {
    render(
      <PriorityFeed
        {...emptyProps}
        agents={[mockAgents[0]]}
      />
    )
    expect(screen.getByText('API key expired')).toBeTruthy()
    expect(screen.getByText('AGENT ERROR')).toBeTruthy()
    expect(screen.getByText('ClawdBot')).toBeTruthy()
  })

  // 7. Completed runs with P3 severity
  it('renders completed runs with P3 severity', () => {
    render(
      <PriorityFeed
        {...emptyProps}
        runs={[mockRuns[1]]}
      />
    )
    expect(screen.getByText('Health check passed')).toBeTruthy()
    expect(screen.getByText('COMPLETED')).toBeTruthy()
  })

  // 8. Respects maxItems prop
  it('respects maxItems prop', () => {
    const manyRuns = Array.from({ length: 10 }, (_, i) => ({
      id: `run-${i}`,
      runner: 'clawdbot',
      status: 'failed',
      summary: `Failure ${i}`,
      created_at: new Date(Date.now() - i * 1000).toISOString(),
      ended_at: new Date().toISOString(),
    }))

    render(
      <PriorityFeed
        {...emptyProps}
        runs={manyRuns}
        maxItems={3}
      />
    )

    const failedLabels = screen.getAllByText('FAILED RUN')
    expect(failedLabels).toHaveLength(3)
  })

  // ---------------------------------------------------------------------------
  // Sorting
  // ---------------------------------------------------------------------------

  // 9. P0 items appear before P1 items
  it('P0 items appear before P1 items', () => {
    render(
      <PriorityFeed
        {...emptyProps}
        runs={[mockRuns[0]]} // P0 failed run
        agents={[mockAgents[0]]} // P1 agent error
      />
    )

    const items = screen.getAllByText(/FAILED RUN|AGENT ERROR/)
    expect(items[0].textContent).toBe('FAILED RUN')
    expect(items[1].textContent).toBe('AGENT ERROR')
  })

  // 10. Within same severity, newer items appear first
  it('within same severity, newer items appear first', () => {
    const olderRun = {
      id: 'run-old',
      runner: 'clawdbot',
      status: 'failed',
      summary: 'Older failure',
      created_at: new Date(Date.now() - 7200000).toISOString(),
      ended_at: new Date(Date.now() - 7200000).toISOString(),
    }
    const newerRun = {
      id: 'run-new',
      runner: 'openclaw',
      status: 'failed',
      summary: 'Newer failure',
      created_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
    }

    render(
      <PriorityFeed
        {...emptyProps}
        runs={[olderRun, newerRun]}
      />
    )

    const titles = screen.getAllByText(/failure/i)
    expect(titles[0].textContent).toBe('Newer failure')
    expect(titles[1].textContent).toBe('Older failure')
  })

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  // 11. Calls onRetryRun when retry button clicked on failed run
  it('calls onRetryRun when retry button clicked on failed run', () => {
    const onRetryRun = vi.fn()
    render(
      <PriorityFeed
        {...emptyProps}
        runs={[mockRuns[0]]}
        onRetryRun={onRetryRun}
      />
    )

    fireEvent.click(screen.getByText('Retry'))
    expect(onRetryRun).toHaveBeenCalledWith('run-1')
  })

  // 12. Calls onApproveProposal when approve button clicked
  it('calls onApproveProposal when approve button clicked', () => {
    const onApproveProposal = vi.fn()
    const pendingProposal = { ...mockProposals[0], status: 'pending' }
    render(
      <PriorityFeed
        {...emptyProps}
        proposals={[pendingProposal]}
        onApproveProposal={onApproveProposal}
      />
    )

    fireEvent.click(screen.getByText('Approve'))
    expect(onApproveProposal).toHaveBeenCalledWith('prop-1')
  })

  // 13. Dismiss button hides the item from the feed
  it('dismiss button hides the item from the feed', () => {
    const onDismissItem = vi.fn()
    render(
      <PriorityFeed
        {...emptyProps}
        runs={[mockRuns[0]]}
        onDismissItem={onDismissItem}
      />
    )

    expect(screen.getByText('Model gpt-5.4 not found')).toBeTruthy()

    const dismissButton = screen.getByLabelText('Dismiss')
    fireEvent.click(dismissButton)

    expect(screen.queryByText('Model gpt-5.4 not found')).toBeNull()
    expect(onDismissItem).toHaveBeenCalledWith('run-run-1')
  })

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  // 14. Handles runs with null summary gracefully
  it('handles runs with null summary gracefully', () => {
    const runWithNullSummary = {
      id: 'run-null',
      runner: 'clawdbot',
      status: 'failed',
      summary: null,
      created_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
    }

    render(
      <PriorityFeed
        {...emptyProps}
        runs={[runWithNullSummary]}
      />
    )

    // Falls back to "Run by {runner}"
    expect(screen.getByText('Run by clawdbot')).toBeTruthy()
  })

  // 15. Handles proposals with missing project gracefully
  it('handles proposals with missing project gracefully', () => {
    const proposalNoProject = {
      id: 'prop-no-proj',
      title: 'Orphan proposal',
      status: 'pending',
      project: null,
      created_at: new Date().toISOString(),
    }

    render(
      <PriorityFeed
        {...emptyProps}
        proposals={[proposalNoProject]}
      />
    )

    expect(screen.getByText('Orphan proposal')).toBeTruthy()
    expect(screen.getByText('PROPOSAL')).toBeTruthy()
  })

  // 16. Handles agents with no errorMessage
  it('handles agents with no errorMessage', () => {
    const agentNoMessage = {
      id: 'agent-no-msg',
      name: 'SilentBot',
      status: 'error',
      errorMessage: null,
    }

    render(
      <PriorityFeed
        {...emptyProps}
        agents={[agentNoMessage]}
      />
    )

    // Falls back to "{name} encountered an error"
    expect(screen.getByText('SilentBot encountered an error')).toBeTruthy()
    expect(screen.getByText('AGENT ERROR')).toBeTruthy()
  })
})
