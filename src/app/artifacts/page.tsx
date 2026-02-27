'use client'

import { useState, useEffect } from 'react'
import { Archive, Camera, Terminal, FileText, File } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageShell } from '@/components/layout/page-shell'
import { PageHeader } from '@/components/layout/page-header'
import { useAuth } from '@/lib/hooks/use-auth'

type Artifact = {
  id: string
  run_id: string | null
  task_id: string | null
  type: string
  uri: string
  meta: Record<string, unknown>
  created_at: string
}

const typeIcons: Record<string, React.ElementType> = {
  screenshot: Camera,
  log: Terminal,
  pdf: FileText,
  file: File,
}

export default function ArtifactsPage() {
  const { user, loading } = useAuth()
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (!user) return
    const params = filter !== 'all' ? `?type=${filter}` : ''
    fetch(`/api/artifacts${params}`)
      .then(r => r.json())
      .then(d => setArtifacts(d.data ?? []))
  }, [user, filter])

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[color:var(--foco-teal)]" /></div>
  if (!user) return null

  return (
    <PageShell>
      <PageHeader title="Artifacts" subtitle="Screenshots, logs, and files from runs" />

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          {['all','screenshot','log','file','pdf'].map(t => (
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
          <p className="text-xs text-muted-foreground">Screenshots, logs, and files from runs will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {artifacts.map(artifact => {
            const Icon = typeIcons[artifact.type] ?? File
            return (
              <div key={artifact.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-secondary/40 transition-colors">
                <div className="h-8 w-8 rounded-lg bg-[color:var(--foco-teal-dim)] flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 text-[color:var(--foco-teal)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <Badge variant="outline" className="text-[10px] mb-1">{artifact.type}</Badge>
                  <p className="text-[12px] text-muted-foreground font-mono-display truncate">{artifact.uri}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{new Date(artifact.created_at).toLocaleString()}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </PageShell>
  )
}
