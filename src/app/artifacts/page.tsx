'use client'

import { useState, useEffect } from 'react'
import { Archive, Camera, Terminal, FileText, File, ExternalLink, Download, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageShell } from '@/components/layout/page-shell'
import { PageHeader } from '@/components/layout/page-header'
import { useAuth } from '@/lib/hooks/use-auth'

type Artifact = {
  id: string
  run_id: string | null
  task_id: string | null
  project_id?: string | null
  report_id?: string | null
  type: string
  artifact_kind?: string
  title?: string | null
  uri: string
  meta: Record<string, unknown>
  created_at: string
}

function isImageUri(uri: string): boolean {
  return /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(uri)
}

function isExternalUrl(uri: string): boolean {
  return uri.startsWith('http://') || uri.startsWith('https://')
}

const typeIcons: Record<string, React.ElementType> = {
  screenshot: Camera,
  log: Terminal,
  pdf: FileText,
  file: File,
  project_report: FileText,
}

export default function ArtifactsPage() {
  const { user, loading } = useAuth()
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [filter, setFilter] = useState('all')
  const [actionId, setActionId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    const params = filter !== 'all' ? `?type=${filter}` : ''
    fetch(`/api/artifacts${params}`)
      .then(r => r.json())
      .then(d => setArtifacts(d.data ?? []))
  }, [user, filter])

  async function deleteArtifact(artifactId: string) {
    setActionId(artifactId)
    try {
      const res = await fetch(`/api/artifacts/${artifactId}`, { method: 'DELETE' })
      if (!res.ok) return
      setArtifacts((prev) => prev.filter((a) => a.id !== artifactId))
    } finally {
      setActionId(null)
    }
  }

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[color:var(--foco-teal)]" /></div>
  if (!user) return null

  return (
    <PageShell>
      <PageHeader title="Artifacts" subtitle="Screenshots, logs, files, and project reports from runs" />

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          {['all','project_report','screenshot','log','file','pdf'].map(t => (
            <TabsTrigger key={t} value={t} className="capitalize">{t}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {artifacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 text-center">
          <div className="h-12 w-12 rounded-2xl bg-[color:var(--foco-teal-dim)] flex items-center justify-center">
            <Archive className="h-6 w-6 text-[color:var(--foco-teal)]" />
          </div>
          <p className="text-sm font-medium">No artifacts yet</p>
          <p className="text-xs text-muted-foreground">Screenshots, logs, files, and project reports from runs will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {artifacts.map(artifact => {
            const Icon = typeIcons[artifact.type] ?? File
            const isImage = isImageUri(artifact.uri)
            const isExternal = isExternalUrl(artifact.uri)
            const href = artifact.type === 'project_report'
              ? artifact.uri
              : isExternal
                ? artifact.uri
                : `/api/artifacts/${artifact.id}/download`

            return (
              <div
                key={artifact.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-secondary/40 transition-colors group"
              >
                <div className="h-8 w-8 rounded-lg bg-[color:var(--foco-teal-dim)] flex items-center justify-center flex-shrink-0">
                  {isImage ? (
                    <img src={artifact.uri} alt="" className="h-8 w-8 rounded-lg object-cover" />
                  ) : (
                    <Icon className="h-4 w-4 text-[color:var(--foco-teal)]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Badge variant="outline" className="text-[10px]">{artifact.type}</Badge>
                    <a
                      href={href}
                      target={isExternal ? '_blank' : undefined}
                      rel={isExternal ? 'noopener noreferrer' : undefined}
                      download={!isExternal && !isImage && artifact.type !== 'project_report' ? '' : undefined}
                      className="inline-flex items-center text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {isExternal ? (
                        <ExternalLink className="h-3 w-3" />
                      ) : (
                        <Download className="h-3 w-3" />
                      )}
                    </a>
                  </div>
                  <p className="text-[12px] font-medium truncate">{artifact.title ?? artifact.meta?.title as string ?? artifact.uri}</p>
                  <p className="text-[12px] text-muted-foreground font-mono-display truncate">{artifact.uri}</p>
                  {artifact.project_id && <p className="text-[11px] text-muted-foreground">Project: {artifact.project_id.slice(0, 8)}</p>}
                  <p className="text-[11px] text-muted-foreground mt-1">{new Date(artifact.created_at).toLocaleString()}</p>
                </div>
                <button
                  type="button"
                  className="h-7 w-7 inline-flex items-center justify-center rounded-md text-red-600 hover:text-red-700 hover:bg-secondary disabled:opacity-40"
                  title="Delete artifact"
                  disabled={actionId === artifact.id}
                  onClick={() => void deleteArtifact(artifact.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </PageShell>
  )
}
