'use client'

import { useCallback, useEffect, useState } from 'react'

type WorkspaceState = {
  workspaceId: string | null
  isLoading: boolean
  error: string | null
}

async function fetchWorkspaceId(): Promise<string | null> {
  const workspaceRes = await fetch('/api/user/workspace')
  if (!workspaceRes.ok) {
    throw new Error('Failed to load workspace')
  }
  const workspaceJson = await workspaceRes.json()
  return workspaceJson?.data?.workspace_id ?? workspaceJson?.workspace_id ?? null
}

export function useCurrentWorkspace() {
  const [state, setState] = useState<WorkspaceState>({
    workspaceId: null,
    isLoading: true,
    error: null,
  })

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))
    try {
      const workspaceId = await fetchWorkspaceId()
      setState({ workspaceId, isLoading: false, error: null })
      return workspaceId
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load workspace'
      setState({ workspaceId: null, isLoading: false, error: message })
      return null
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    workspaceId: state.workspaceId,
    isLoading: state.isLoading,
    error: state.error,
    refresh,
  }
}

export async function getCurrentWorkspaceId(): Promise<string | null> {
  try {
    return await fetchWorkspaceId()
  } catch {
    return null
  }
}
