'use client'

import { useMemo, useState } from 'react'
import { Bot, Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { type AgentLane } from '@/lib/agent-ops/types'

interface CustomAgentRow {
  id: string
  name: string
  lane: AgentLane
  system_prompt: string
  avatar_url: string | null
  active: boolean
}

const LANE_LABEL: Record<AgentLane, string> = {
  product_ui: 'Product/UI',
  platform_api: 'Platform/API',
  requirements: 'Requirements',
}

export function CustomAgentModal({ workspaceId }: { workspaceId?: string | null }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [agents, setAgents] = useState<CustomAgentRow[]>([])
  const [name, setName] = useState('')
  const [lane, setLane] = useState<AgentLane>('product_ui')
  const [prompt, setPrompt] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [description, setDescription] = useState('')
  const [readScopeRaw, setReadScopeRaw] = useState('')
  const [writeScopeRaw, setWriteScopeRaw] = useState('')
  const [tagsRaw, setTagsRaw] = useState('')

  const canSubmit = useMemo(
    () => name.trim().length >= 2 && prompt.trim().length >= 20 && !saving,
    [name, prompt, saving]
  )

  const loadAgents = async () => {
    setLoading(true)
    try {
      const search = new URLSearchParams()
      if (workspaceId) search.set('workspace_id', workspaceId)
      search.set('limit', '20')
      const res = await fetch(`/api/agents/custom?${search.toString()}`)
      const json = await res.json()
      setAgents(Array.isArray(json?.data?.items) ? json.data.items : [])
    } catch {
      toast.error('Could not load custom agents')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) void loadAgents()
  }

  const parseCsv = (raw: string): string[] => raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  const handleCreate = async () => {
    if (!canSubmit) return
    setSaving(true)
    try {
      const payload = {
        workspace_id: workspaceId ?? null,
        name: name.trim(),
        lane,
        description: description.trim() || null,
        system_prompt: prompt.trim(),
        avatar_url: avatarUrl.trim() || null,
        read_scope: parseCsv(readScopeRaw),
        write_scope: parseCsv(writeScopeRaw),
        persona_tags: parseCsv(tagsRaw),
        tool_access: {
          browse: true,
          filesystem: true,
          code_edit: true,
        },
      }

      const res = await fetch('/api/agents/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (!res.ok || !json?.ok) {
        const message = json?.error?.message ?? json?.error ?? 'Failed to create custom agent'
        throw new Error(typeof message === 'string' ? message : 'Failed to create custom agent')
      }

      toast.success('Custom agent created')
      setName('')
      setPrompt('')
      setAvatarUrl('')
      setDescription('')
      setReadScopeRaw('')
      setWriteScopeRaw('')
      setTagsRaw('')
      await loadAgents()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create custom agent')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/agents/custom/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      toast.success('Custom agent deleted')
      await loadAgents()
    } catch {
      toast.error('Could not delete custom agent')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Custom Agent</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Custom Agent Profiles</DialogTitle>
          <DialogDescription>
            Define persona system prompt, lane, scopes, and avatar. Lane policy is enforced server-side.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Growth Operator" />
            </div>
            <div className="space-y-1.5">
              <Label>Lane</Label>
              <Select value={lane} onValueChange={(next) => setLane(next as AgentLane)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="product_ui">Product/UI</SelectItem>
                  <SelectItem value="platform_api">Platform/API</SelectItem>
                  <SelectItem value="requirements">Requirements</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Avatar URL</Label>
              <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Objective style and focus" />
            </div>
            <div className="space-y-1.5">
              <Label>System Prompt</Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={6}
                placeholder="Strict role guidance, constraints, style, and forbidden behavior."
              />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Read Scope (CSV)</Label>
                <Input value={readScopeRaw} onChange={(e) => setReadScopeRaw(e.target.value)} placeholder="src/,docs/" />
              </div>
              <div className="space-y-1.5">
                <Label>Write Scope (CSV)</Label>
                <Input value={writeScopeRaw} onChange={(e) => setWriteScopeRaw(e.target.value)} placeholder="src/app/api/,supabase/" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Persona Tags (CSV)</Label>
              <Input value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} placeholder="growth,operator,direct" />
            </div>
            <Button type="button" onClick={handleCreate} disabled={!canSubmit}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
              Create Agent
            </Button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Existing Profiles</h4>
              {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            <div className="max-h-[440px] space-y-2 overflow-auto rounded-lg border p-2">
              {agents.length === 0 && !loading && (
                <p className="px-2 py-3 text-sm text-muted-foreground">No custom agents yet.</p>
              )}
              {agents.map((agent) => (
                <div key={agent.id} className="flex items-start justify-between rounded-md border p-2">
                  <div className="flex min-w-0 items-start gap-2">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={agent.avatar_url ?? ''} alt={agent.name} />
                      <AvatarFallback>{agent.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{agent.name}</p>
                      <div className="mt-1 flex items-center gap-1">
                        <Badge variant="outline" className="text-[10px]">{LANE_LABEL[agent.lane]}</Badge>
                        {!agent.active && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {agent.system_prompt}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-red-600 hover:text-red-700"
                    onClick={() => handleDelete(agent.id)}
                    title="Delete custom agent"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
