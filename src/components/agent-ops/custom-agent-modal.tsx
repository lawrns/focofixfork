'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactElement } from 'react'
import { Bot, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
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
  slug: string
  description: string | null
  system_prompt: string
  avatar_url: string | null
  active: boolean
  approval_sensitivity: 'low' | 'medium' | 'high'
  read_scope: string[]
  write_scope: string[]
  persona_tags: string[]
  tool_access: Record<string, unknown>
}

interface CustomAgentModalProps {
  workspaceId?: string | null
  agentId?: string | null
  trigger?: ReactElement
  onSaved?: () => void
}

const LANE_LABEL: Record<AgentLane, string> = {
  product_ui: 'Product/UI',
  platform_api: 'Platform/API',
  requirements: 'Requirements',
}

export function CustomAgentModal({ workspaceId, agentId, trigger, onSaved }: CustomAgentModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [agents, setAgents] = useState<CustomAgentRow[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(agentId ?? null)

  const [name, setName] = useState('')
  const [lane, setLane] = useState<AgentLane>('product_ui')
  const [prompt, setPrompt] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [description, setDescription] = useState('')
  const [readScopeRaw, setReadScopeRaw] = useState('')
  const [writeScopeRaw, setWriteScopeRaw] = useState('')
  const [tagsRaw, setTagsRaw] = useState('')
  const [sensitivity, setSensitivity] = useState<'low' | 'medium' | 'high'>('high')
  const [active, setActive] = useState(true)

  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === selectedAgentId) ?? null,
    [agents, selectedAgentId]
  )

  const mode = selectedAgent ? 'edit' : 'create'

  const canSubmit = useMemo(
    () => name.trim().length >= 2 && prompt.trim().length >= 20 && !saving,
    [name, prompt, saving]
  )

  const parseCsv = (raw: string): string[] => raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  const resetForm = () => {
    setSelectedAgentId(null)
    setName('')
    setLane('product_ui')
    setPrompt('')
    setAvatarUrl('')
    setDescription('')
    setReadScopeRaw('')
    setWriteScopeRaw('')
    setTagsRaw('')
    setSensitivity('high')
    setActive(true)
  }

  const hydrateForm = (agent: CustomAgentRow) => {
    setSelectedAgentId(agent.id)
    setName(agent.name)
    setLane(agent.lane)
    setPrompt(agent.system_prompt ?? '')
    setAvatarUrl(agent.avatar_url ?? '')
    setDescription(agent.description ?? '')
    setReadScopeRaw((agent.read_scope ?? []).join(', '))
    setWriteScopeRaw((agent.write_scope ?? []).join(', '))
    setTagsRaw((agent.persona_tags ?? []).join(', '))
    setSensitivity(agent.approval_sensitivity ?? 'high')
    setActive(Boolean(agent.active))
  }

  const loadAgents = async () => {
    setLoading(true)
    try {
      const search = new URLSearchParams()
      if (workspaceId) search.set('workspace_id', workspaceId)
      search.set('limit', '50')
      const res = await fetch(`/api/agents/custom?${search.toString()}`)
      const json = await res.json()
      const items = Array.isArray(json?.data?.items) ? json.data.items as CustomAgentRow[] : []
      setAgents(items)

      const nextSelectedId = agentId ?? selectedAgentId
      if (nextSelectedId) {
        const match = items.find((agent) => agent.id === nextSelectedId)
        if (match) {
          hydrateForm(match)
          return
        }
      }

      if (!selectedAgentId) resetForm()
    } catch {
      toast.error('Could not load custom agents')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) return
    void loadAgents()
  }

  useEffect(() => {
    if (!open || !agentId) return
    const match = agents.find((agent) => agent.id === agentId)
    if (match) hydrateForm(match)
  }, [open, agentId, agents])

  const upsertAgent = async () => {
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
        approval_sensitivity: sensitivity,
        active,
        tool_access: {
          browse: true,
          filesystem: true,
          code_edit: true,
        },
      }

      const res = await fetch(
        selectedAgentId ? `/api/agents/custom/${selectedAgentId}` : '/api/agents/custom',
        {
          method: selectedAgentId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )

      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.ok) {
        const message = json?.error?.message ?? json?.error ?? `${mode === 'edit' ? 'Failed to update' : 'Failed to create'} custom agent`
        throw new Error(typeof message === 'string' ? message : 'Agent request failed')
      }

      toast.success(mode === 'edit' ? 'Custom agent updated' : 'Custom agent created')
      await loadAgents()
      onSaved?.()

      if (!selectedAgentId) {
        resetForm()
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Agent request failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedAgentId) return
    if (!window.confirm('Delete this custom agent profile?')) return

    try {
      const res = await fetch(`/api/agents/custom/${selectedAgentId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      toast.success('Custom agent deleted')
      resetForm()
      await loadAgents()
      onSaved?.()
    } catch {
      toast.error('Could not delete custom agent')
    }
  }

  const triggerNode = trigger ?? (
    <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5">
      <Plus className="h-4 w-4" />
      <span className="hidden sm:inline">Custom Agent</span>
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {triggerNode}
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Edit Custom Agent' : 'Custom Agent Profiles'}</DialogTitle>
          <DialogDescription>
            Define lane, prompt, scopes, tags, and activation state. System agents are read-only.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">{mode === 'edit' ? 'Agent Configuration' : 'Create New Agent'}</h4>
              {mode === 'edit' && (
                <Button type="button" variant="ghost" size="sm" onClick={resetForm}>Create New</Button>
              )}
            </div>

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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>Approval Sensitivity</Label>
                <Select value={sensitivity} onValueChange={(next) => setSensitivity(next as 'low' | 'medium' | 'high')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={active ? 'active' : 'inactive'} onValueChange={(next) => setActive(next === 'active')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                <Input value={readScopeRaw} onChange={(e) => setReadScopeRaw(e.target.value)} placeholder="src/, docs/" />
              </div>
              <div className="space-y-1.5">
                <Label>Write Scope (CSV)</Label>
                <Input value={writeScopeRaw} onChange={(e) => setWriteScopeRaw(e.target.value)} placeholder="src/app/api/, supabase/" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Persona Tags (CSV)</Label>
              <Input value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} placeholder="growth, operator, direct" />
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" onClick={upsertAgent} disabled={!canSubmit}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                {mode === 'edit' ? 'Update Agent' : 'Create Agent'}
              </Button>

              {mode === 'edit' && (
                <Button type="button" variant="destructive" onClick={handleDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Existing Profiles</h4>
              {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            <div className="max-h-[540px] space-y-2 overflow-auto rounded-lg border p-2">
              {agents.length === 0 && !loading && (
                <p className="px-2 py-3 text-sm text-muted-foreground">No custom agents yet.</p>
              )}

              {agents.map((agent) => {
                const selected = agent.id === selectedAgentId
                return (
                  <div key={agent.id} className={`rounded-md border p-2 ${selected ? 'border-[color:var(--foco-teal)] bg-[color:var(--foco-teal)]/5' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-start gap-2">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={agent.avatar_url ?? ''} alt={agent.name} />
                          <AvatarFallback>{agent.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{agent.name}</p>
                          <div className="mt-1 flex items-center gap-1 flex-wrap">
                            <Badge variant="outline" className="text-[10px]">{LANE_LABEL[agent.lane]}</Badge>
                            <Badge variant={agent.active ? 'secondary' : 'outline'} className="text-[10px]">
                              {agent.active ? 'Active' : 'Inactive'}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">{agent.approval_sensitivity}</Badge>
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{agent.description || `slug: ${agent.slug}`}</p>
                        </div>
                      </div>

                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => hydrateForm(agent)}
                        title="Edit custom agent"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
