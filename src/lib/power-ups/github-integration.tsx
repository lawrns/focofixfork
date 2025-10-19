'use client'

import { useState, useEffect, useCallback } from 'react'
import { ExtensionManifest } from '@/lib/extensions/extension-api'

// GitHub Integration Power-Up
export const githubIntegrationManifest: ExtensionManifest = {
  id: 'github-integration',
  name: 'GitHub Integration',
  version: '1.2.0',
  description: 'Connect your GitHub repositories to track issues and pull requests directly in your project cards.',
  author: 'Foco Team',
  icon: '/icons/github.svg',
  permissions: [
    { type: 'read', resource: 'projects', description: 'Read project data' },
    { type: 'network', resource: 'github.com', description: 'Access GitHub API' },
    { type: 'storage', resource: 'github-settings', description: 'Store GitHub configuration' }
  ],
  entryPoints: [
    { type: 'card', component: 'GitHubCard', position: 'bottom', priority: 1 },
    { type: 'board', component: 'GitHubBoard', position: 'right', priority: 2 },
    { type: 'project', component: 'GitHubProject', position: 'right', priority: 3 }
  ],
  dependencies: [],
  minVersion: '1.0.0'
}

// GitHub API Types
interface GitHubIssue {
  id: number
  number: number
  title: string
  body: string
  state: 'open' | 'closed'
  labels: GitHubLabel[]
  assignees: GitHubUser[]
  created_at: string
  updated_at: string
  html_url: string
}

interface GitHubPullRequest {
  id: number
  number: number
  title: string
  body: string
  state: 'open' | 'closed' | 'merged'
  head: {
    ref: string
    sha: string
  }
  base: {
    ref: string
    sha: string
  }
  user: GitHubUser
  created_at: string
  updated_at: string
  html_url: string
}

interface GitHubLabel {
  id: number
  name: string
  color: string
  description: string
}

interface GitHubUser {
  id: number
  login: string
  avatar_url: string
  html_url: string
}

interface GitHubRepository {
  id: number
  name: string
  full_name: string
  description: string
  html_url: string
  private: boolean
  default_branch: string
}

// GitHub Service
class GitHubService {
  private apiBase = 'https://api.github.com'
  private token: string | null = null

  setToken(token: string): void {
    this.token = token
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    if (!this.token) {
      throw new Error('GitHub token not configured')
    }

    const response = await fetch(`${this.apiBase}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `token ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Foco-GitHub-Integration',
        ...options.headers
      }
    })

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async getRepositories(): Promise<GitHubRepository[]> {
    return this.request('/user/repos?sort=updated&per_page=100')
  }

  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    return this.request(`/repos/${owner}/${repo}`)
  }

  async getIssues(owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'open'): Promise<GitHubIssue[]> {
    return this.request(`/repos/${owner}/${repo}/issues?state=${state}&per_page=100`)
  }

  async getIssue(owner: string, repo: string, issueNumber: number): Promise<GitHubIssue> {
    return this.request(`/repos/${owner}/${repo}/issues/${issueNumber}`)
  }

  async getPullRequests(owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'open'): Promise<GitHubPullRequest[]> {
    return this.request(`/repos/${owner}/${repo}/pulls?state=${state}&per_page=100`)
  }

  async getPullRequest(owner: string, repo: string, prNumber: number): Promise<GitHubPullRequest> {
    return this.request(`/repos/${owner}/${repo}/pulls/${prNumber}`)
  }

  async createIssue(owner: string, repo: string, title: string, body?: string, labels?: string[]): Promise<GitHubIssue> {
    return this.request(`/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      body: JSON.stringify({
        title,
        body,
        labels
      })
    })
  }

  async updateIssue(owner: string, repo: string, issueNumber: number, updates: Partial<GitHubIssue>): Promise<GitHubIssue> {
    return this.request(`/repos/${owner}/${repo}/issues/${issueNumber}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    })
  }

  async getLabels(owner: string, repo: string): Promise<GitHubLabel[]> {
    return this.request(`/repos/${owner}/${repo}/labels`)
  }
}

// GitHub Card Component
export function GitHubCard({ context, api }: { context: any; api: any }) {
  const [issues, setIssues] = useState<GitHubIssue[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [repository, setRepository] = useState<string | null>(null)

  const githubService = new GitHubService()

  // Load GitHub token from storage
  useEffect(() => {
    const loadToken = async () => {
      try {
        const token = await api.getStorage('github-token')
        if (token) {
          githubService.setToken(token)
        }
      } catch (err) {
        api.log(`Failed to load GitHub token: ${err}`, 'error')
      }
    }
    loadToken()
  }, [api])

  // Load issues for the current card
  const loadIssues = useCallback(async () => {
    if (!repository) return

    setLoading(true)
    setError(null)

    try {
      const [owner, repo] = repository.split('/')
      const issues = await githubService.getIssues(owner, repo)
      setIssues(issues)
    } catch (err) {
      setError(`Failed to load issues: ${err}`)
      api.log(`GitHub integration error: ${err}`, 'error')
    } finally {
      setLoading(false)
    }
  }, [repository, githubService, api])

  // Load issues when repository changes
  useEffect(() => {
    loadIssues()
  }, [loadIssues])

  // Handle issue creation
  const handleCreateIssue = useCallback(async (title: string, body?: string) => {
    if (!repository) return

    try {
      const [owner, repo] = repository.split('/')
      const issue = await githubService.createIssue(owner, repo, title, body)
      
      // Refresh issues
      await loadIssues()
      
      api.showToast(`Created issue #${issue.number}`, 'success')
    } catch (err) {
      api.showToast(`Failed to create issue: ${err}`, 'error')
    }
  }, [repository, githubService, loadIssues, api])

  if (!repository) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50">
        <div className="text-center">
          <h4 className="font-semibold mb-2">GitHub Integration</h4>
          <p className="text-sm text-gray-600 mb-3">Connect a repository to track issues</p>
          <button
            onClick={() => api.showModal('RepositorySelector', { onSelect: setRepository })}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Select Repository
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold">GitHub Issues</h4>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">{repository}</span>
          <button
            onClick={() => setRepository(null)}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
        </div>
      )}

      {error && (
        <div className="text-red-600 text-sm mb-3">{error}</div>
      )}

      {!loading && !error && (
        <div className="space-y-2">
          {issues.length === 0 ? (
            <p className="text-sm text-gray-600 text-center py-4">No open issues</p>
          ) : (
            issues.slice(0, 5).map(issue => (
              <div key={issue.id} className="flex items-center gap-2 p-2 bg-white rounded border">
                <div className="flex-1">
                  <a
                    href={issue.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium hover:text-blue-600"
                  >
                    #{issue.number} {issue.title}
                  </a>
                  <div className="flex items-center gap-2 mt-1">
                    {issue.labels.map(label => (
                      <span
                        key={label.id}
                        className="px-2 py-1 text-xs rounded text-white"
                        style={{ backgroundColor: `#${label.color}` }}
                      >
                        {label.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {issue.state === 'open' ? '🟢' : '🔴'}
                </div>
              </div>
            ))
          )}
          
          {issues.length > 5 && (
            <div className="text-center">
              <a
                href={`https://github.com/${repository}/issues`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                View all {issues.length} issues
              </a>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 pt-3 border-t">
        <button
          onClick={() => api.showModal('CreateIssueForm', { onSubmit: handleCreateIssue })}
          className="w-full px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
        >
          Create Issue
        </button>
      </div>
    </div>
  )
}

// GitHub Board Component
export function GitHubBoard({ context, api }: { context: any; api: any }) {
  const [repositories, setRepositories] = useState<GitHubRepository[]>([])
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null)
  const [issues, setIssues] = useState<GitHubIssue[]>([])
  const [loading, setLoading] = useState(false)

  const githubService = new GitHubService()

  // Load repositories
  const loadRepositories = useCallback(async () => {
    setLoading(true)
    try {
      const repos = await githubService.getRepositories()
      setRepositories(repos)
    } catch (err) {
      api.log(`Failed to load repositories: ${err}`, 'error')
    } finally {
      setLoading(false)
    }
  }, [githubService, api])

  // Load issues for selected repository
  const loadIssues = useCallback(async (repo: string) => {
    setLoading(true)
    try {
      const [owner, repoName] = repo.split('/')
      const issues = await githubService.getIssues(owner, repoName)
      setIssues(issues)
    } catch (err) {
      api.log(`Failed to load issues: ${err}`, 'error')
    } finally {
      setLoading(false)
    }
  }, [githubService, api])

  useEffect(() => {
    loadRepositories()
  }, [loadRepositories])

  useEffect(() => {
    if (selectedRepo) {
      loadIssues(selectedRepo)
    }
  }, [selectedRepo, loadIssues])

  return (
    <div className="p-4 border rounded-lg">
      <h4 className="font-semibold mb-3">GitHub Integration</h4>
      
      <div className="space-y-3">
        <select
          value={selectedRepo || ''}
          onChange={(e) => setSelectedRepo(e.target.value || null)}
          className="w-full p-2 border rounded"
        >
          <option value="">Select Repository</option>
          {repositories.map(repo => (
            <option key={repo.id} value={repo.full_name}>
              {repo.full_name}
            </option>
          ))}
        </select>

        {selectedRepo && (
          <div className="space-y-2">
            <h5 className="font-medium">Recent Issues</h5>
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
              </div>
            ) : (
              <div className="space-y-1">
                {issues.slice(0, 10).map(issue => (
                  <div key={issue.id} className="p-2 bg-gray-50 rounded text-sm">
                    <a
                      href={issue.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-blue-600"
                    >
                      #{issue.number} {issue.title}
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// GitHub Project Component
export function GitHubProject({ context, api }: { context: any; api: any }) {
  const [repositories, setRepositories] = useState<GitHubRepository[]>([])
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null)
  const [stats, setStats] = useState<{
    openIssues: number
    closedIssues: number
    openPRs: number
    closedPRs: number
  } | null>(null)
  const [loading, setLoading] = useState(false)

  const githubService = new GitHubService()

  // Load repositories
  const loadRepositories = useCallback(async () => {
    setLoading(true)
    try {
      const repos = await githubService.getRepositories()
      setRepositories(repos)
    } catch (err) {
      api.log(`Failed to load repositories: ${err}`, 'error')
    } finally {
      setLoading(false)
    }
  }, [githubService, api])

  // Load stats for selected repository
  const loadStats = useCallback(async (repo: string) => {
    setLoading(true)
    try {
      const [owner, repoName] = repo.split('/')
      const [openIssues, closedIssues, openPRs, closedPRs] = await Promise.all([
        githubService.getIssues(owner, repoName, 'open'),
        githubService.getIssues(owner, repoName, 'closed'),
        githubService.getPullRequests(owner, repoName, 'open'),
        githubService.getPullRequests(owner, repoName, 'closed')
      ])

      setStats({
        openIssues: openIssues.length,
        closedIssues: closedIssues.length,
        openPRs: openPRs.length,
        closedPRs: closedPRs.length
      })
    } catch (err) {
      api.log(`Failed to load stats: ${err}`, 'error')
    } finally {
      setLoading(false)
    }
  }, [githubService, api])

  useEffect(() => {
    loadRepositories()
  }, [loadRepositories])

  useEffect(() => {
    if (selectedRepo) {
      loadStats(selectedRepo)
    }
  }, [selectedRepo, loadStats])

  return (
    <div className="p-4 border rounded-lg">
      <h4 className="font-semibold mb-3">GitHub Repository Stats</h4>
      
      <div className="space-y-3">
        <select
          value={selectedRepo || ''}
          onChange={(e) => setSelectedRepo(e.target.value || null)}
          className="w-full p-2 border rounded"
        >
          <option value="">Select Repository</option>
          {repositories.map(repo => (
            <option key={repo.id} value={repo.full_name}>
              {repo.full_name}
            </option>
          ))}
        </select>

        {selectedRepo && stats && (
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-blue-50 rounded">
              <div className="text-2xl font-bold text-blue-600">{stats.openIssues}</div>
              <div className="text-sm text-gray-600">Open Issues</div>
            </div>
            <div className="p-3 bg-green-50 rounded">
              <div className="text-2xl font-bold text-green-600">{stats.closedIssues}</div>
              <div className="text-sm text-gray-600">Closed Issues</div>
            </div>
            <div className="p-3 bg-purple-50 rounded">
              <div className="text-2xl font-bold text-purple-600">{stats.openPRs}</div>
              <div className="text-sm text-gray-600">Open PRs</div>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <div className="text-2xl font-bold text-gray-600">{stats.closedPRs}</div>
              <div className="text-sm text-gray-600">Closed PRs</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Export the extension code
export const githubIntegrationCode = `
import React, { useState, useEffect, useCallback } from 'react'

// GitHub API Types
interface GitHubIssue {
  id: number
  number: number
  title: string
  body: string
  state: 'open' | 'closed'
  labels: GitHubLabel[]
  assignees: GitHubUser[]
  created_at: string
  updated_at: string
  html_url: string
}

interface GitHubLabel {
  id: number
  name: string
  color: string
  description: string
}

interface GitHubUser {
  id: number
  login: string
  avatar_url: string
  html_url: string
}

interface GitHubRepository {
  id: number
  name: string
  full_name: string
  description: string
  html_url: string
  private: boolean
  default_branch: string
}

// GitHub Service
class GitHubService {
  private apiBase = 'https://api.github.com'
  private token = null

  setToken(token) {
    this.token = token
  }

  async request(endpoint, options = {}) {
    if (!this.token) {
      throw new Error('GitHub token not configured')
    }

    const response = await fetch(\`\${this.apiBase}\${endpoint}\`, {
      ...options,
      headers: {
        'Authorization': \`token \${this.token}\`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Foco-GitHub-Integration',
        ...options.headers
      }
    })

    if (!response.ok) {
      throw new Error(\`GitHub API error: \${response.status} \${response.statusText}\`)
    }

    return response.json()
  }

  async getRepositories() {
    return this.request('/user/repos?sort=updated&per_page=100')
  }

  async getIssues(owner, repo, state = 'open') {
    return this.request(\`/repos/\${owner}/\${repo}/issues?state=\${state}&per_page=100\`)
  }

  async createIssue(owner, repo, title, body, labels) {
    return this.request(\`/repos/\${owner}/\${repo}/issues\`, {
      method: 'POST',
      body: JSON.stringify({
        title,
        body,
        labels
      })
    })
  }
}

// GitHub Card Component
function GitHubCard({ context, api }) {
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [repository, setRepository] = useState(null)

  const githubService = new GitHubService()

  // Load GitHub token from storage
  useEffect(() => {
    const loadToken = async () => {
      try {
        const token = await api.getStorage('github-token')
        if (token) {
          githubService.setToken(token)
        }
      } catch (err) {
        api.log(\`Failed to load GitHub token: \${err}\`, 'error')
      }
    }
    loadToken()
  }, [])

  // Load issues for the current card
  const loadIssues = useCallback(async () => {
    if (!repository) return

    setLoading(true)
    setError(null)

    try {
      const [owner, repo] = repository.split('/')
      const issues = await githubService.getIssues(owner, repo)
      setIssues(issues)
    } catch (err) {
      setError(\`Failed to load issues: \${err}\`)
      api.log(\`GitHub integration error: \${err}\`, 'error')
    } finally {
      setLoading(false)
    }
  }, [repository])

  // Load issues when repository changes
  useEffect(() => {
    loadIssues()
  }, [loadIssues])

  if (!repository) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50">
        <div className="text-center">
          <h4 className="font-semibold mb-2">GitHub Integration</h4>
          <p className="text-sm text-gray-600 mb-3">Connect a repository to track issues</p>
          <button
            onClick={() => api.showModal('RepositorySelector', { onSelect: setRepository })}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Select Repository
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold">GitHub Issues</h4>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">{repository}</span>
          <button
            onClick={() => setRepository(null)}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
        </div>
      )}

      {error && (
        <div className="text-red-600 text-sm mb-3">{error}</div>
      )}

      {!loading && !error && (
        <div className="space-y-2">
          {issues.length === 0 ? (
            <p className="text-sm text-gray-600 text-center py-4">No open issues</p>
          ) : (
            issues.slice(0, 5).map(issue => (
              <div key={issue.id} className="flex items-center gap-2 p-2 bg-white rounded border">
                <div className="flex-1">
                  <a
                    href={issue.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium hover:text-blue-600"
                  >
                    #{issue.number} {issue.title}
                  </a>
                  <div className="flex items-center gap-2 mt-1">
                    {issue.labels.map(label => (
                      <span
                        key={label.id}
                        className="px-2 py-1 text-xs rounded text-white"
                        style={{ backgroundColor: \`#\${label.color}\` }}
                      >
                        {label.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {issue.state === 'open' ? '🟢' : '🔴'}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// Export components
export default {
  GitHubCard,
  GitHubBoard,
  GitHubProject
}
`
