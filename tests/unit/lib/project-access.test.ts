import { beforeEach, describe, expect, it, vi } from 'vitest'

const from = vi.fn()

vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: {
    from,
  },
}))

let getProjectAccess: typeof import('@/lib/projects/access').getProjectAccess

function makeQuery(result: { data: any; error?: any }) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: result.data,
      error: result.error ?? null,
    }),
    limit: vi.fn().mockResolvedValue({
      data: result.data,
      error: result.error ?? null,
    }),
  }
}

beforeEach(async () => {
  vi.clearAllMocks()
  ;({ getProjectAccess } = await import('@/lib/projects/access'))
})

describe('getProjectAccess', () => {
  it('grants review access to the project owner without a workspace membership row', async () => {
    const projectQuery = makeQuery({
      data: {
        id: 'project-1',
        name: 'Project One',
        slug: 'project-one',
        description: null,
        brief: null,
        workspace_id: 'workspace-1',
        owner_id: 'user-1',
        delegation_settings: null,
        metadata: null,
      },
    })

    from.mockReturnValueOnce(projectQuery)

    const access = await getProjectAccess('project-1', { id: 'user-1' })

    expect(access).toMatchObject({
      project: {
        id: 'project-1',
      },
      membership: {
        role: 'owner',
        scope: 'owner',
      },
      canReview: true,
    })
    expect(from).toHaveBeenCalledTimes(1)
  })

  it('allows project members to view workflows when workspace membership lookup misses', async () => {
    const projectQuery = makeQuery({
      data: {
        id: 'project-2',
        name: 'Project Two',
        slug: 'project-two',
        description: null,
        brief: null,
        workspace_id: 'workspace-2',
        owner_id: 'owner-2',
        delegation_settings: null,
        metadata: null,
      },
    })
    const workspaceMembershipQuery = makeQuery({ data: [] })
    const projectMembershipQuery = makeQuery({ data: [{ role: 'member' }] })

    from
      .mockReturnValueOnce(projectQuery)
      .mockReturnValueOnce(workspaceMembershipQuery)
      .mockReturnValueOnce(projectMembershipQuery)

    const access = await getProjectAccess('project-2', { id: 'user-2' })

    expect(access).toMatchObject({
      membership: {
        role: 'member',
        scope: 'project',
      },
      canReview: false,
    })
  })

  it('prefers the highest workspace role when duplicate membership rows exist', async () => {
    const projectQuery = makeQuery({
      data: {
        id: 'project-3',
        name: 'Project Three',
        slug: 'project-three',
        description: null,
        brief: null,
        workspace_id: 'workspace-3',
        owner_id: 'owner-3',
        delegation_settings: null,
        metadata: null,
      },
    })
    const workspaceMembershipQuery = makeQuery({
      data: [{ role: 'member' }, { role: 'admin' }],
    })
    const projectMembershipQuery = makeQuery({ data: [] })

    from
      .mockReturnValueOnce(projectQuery)
      .mockReturnValueOnce(workspaceMembershipQuery)
      .mockReturnValueOnce(projectMembershipQuery)

    const access = await getProjectAccess('project-3', { id: 'user-3' })

    expect(access).toMatchObject({
      membership: {
        role: 'admin',
        scope: 'workspace',
      },
      canReview: true,
    })
  })
})
