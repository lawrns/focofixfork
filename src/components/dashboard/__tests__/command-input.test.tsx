'use client'

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CommandInput, type DispatchResult } from '../command-input'

describe('CommandInput', () => {
  it('preserves the task and shows an inline error when dispatch fails', async () => {
    const onDispatch = vi.fn<[], Promise<DispatchResult>>().mockResolvedValue({
      ok: false,
      error: 'Dispatch rejected',
    })

    render(
      <CommandInput
        agents={[]}
        projectOptions={[]}
        selectedProjectId=""
        selectedProjectSlug=""
        onProjectChange={() => {}}
        onDispatch={onDispatch as any}
        dispatching={false}
        ribbon={null}
        dispatchFlash={false}
      />
    )

    const input = screen.getByPlaceholderText('Dispatch a task to the critter fleet...')
    fireEvent.change(input, { target: { value: 'Ship the operator dashboard' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))

    await waitFor(() => {
      expect(onDispatch).toHaveBeenCalled()
    })

    expect(screen.getByDisplayValue('Ship the operator dashboard')).toBeInTheDocument()
    expect(screen.getByText('Dispatch rejected')).toBeInTheDocument()
  })
})
