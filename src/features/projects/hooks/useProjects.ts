// Placeholder hooks for projects feature
// TODO: Implement proper React hooks for project management

export function useProjects() {
  // Placeholder implementation
  return {
    projects: [],
    loading: false,
    error: null,
    refetch: () => {}
  }
}

export function useProjectMutations() {
  // Placeholder implementation
  return {
    createProject: async () => ({ success: false, error: 'Not implemented' }),
    updateProject: async () => ({ success: false, error: 'Not implemented' }),
    deleteProject: async () => ({ success: false, error: 'Not implemented' })
  }
}
