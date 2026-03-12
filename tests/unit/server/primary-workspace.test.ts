import { describe, expect, it, vi } from 'vitest'
import { resolvePrimaryWorkspace } from '@/server/workspaces/primary'

function createClient(from: (table: string) => any) {
  return { from } as any
}

describe('resolvePrimaryWorkspace', () => {
  it('returns the first accessible workspace when memberships exist', async () => {
    const client = createClient((table: string) => {
      if (table === 'foco_workspace_members') {
        return {
          select: () => ({
            eq: () => ({
              order: async () => ({
                data: [
                  { workspace_id: 'workspace-2' },
                  { workspace_id: 'workspace-1' },
                ],
                error: null,
              }),
            }),
          }),
        }
      }

      throw new Error(`Unexpected table ${table}`)
    })

    const result = await resolvePrimaryWorkspace({
      user: { id: 'user-1', email: 'user@example.com' },
      client,
    })

    expect(result).toEqual({
      ok: true,
      workspaceId: 'workspace-2',
      workspaceIds: ['workspace-2', 'workspace-1'],
      wasCreated: false,
    })
  })

  it('auto-creates a personal workspace when none exists and createIfMissing is enabled', async () => {
    const deleteEq = vi.fn()
    const membershipInsert = vi.fn(async () => ({ error: null }))
    const workspaceInsert = vi.fn(() => ({
      select: () => ({
        single: async () => ({ data: { id: 'workspace-new' }, error: null }),
      }),
    }))

    const client = createClient((table: string) => {
      if (table === 'foco_workspace_members') {
        return {
          select: () => ({
            eq: () => ({
              order: async () => ({ data: [], error: null }),
            }),
          }),
          insert: membershipInsert,
        }
      }

      if (table === 'foco_workspaces') {
        return {
          select: () => ({
            eq: (_column: string, value: string) => ({
              maybeSingle: async () => ({
                data: value === 'personal-projects' ? null : null,
                error: null,
              }),
            }),
          }),
          insert: workspaceInsert,
          delete: () => ({
            eq: deleteEq,
          }),
        }
      }

      throw new Error(`Unexpected table ${table}`)
    })

    const result = await resolvePrimaryWorkspace({
      user: {
        id: 'user-1',
        email: 'personal@example.com',
        user_metadata: { full_name: 'Personal' },
      },
      client,
      createIfMissing: true,
    })

    expect(result).toEqual({
      ok: true,
      workspaceId: 'workspace-new',
      workspaceIds: ['workspace-new'],
      wasCreated: true,
    })
    expect(workspaceInsert).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Personal Projects',
      slug: 'personal-projects',
    }))
    expect(membershipInsert).toHaveBeenCalledWith(expect.objectContaining({
      workspace_id: 'workspace-new',
      user_id: 'user-1',
      role: 'owner',
    }))
    expect(deleteEq).not.toHaveBeenCalled()
  })
})
