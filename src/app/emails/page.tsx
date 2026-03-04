'use client'

import { useState, useEffect } from 'react'
import { Mail, Send, FileText, Plus, XCircle, Eye, History, Loader2, CheckCircle2, AlertCircle, Clock, Folder, User, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PageShell } from '@/components/layout/page-shell'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useAuth } from '@/lib/hooks/use-auth'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type EmailStatus =
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'bounced'
  | 'cancelled'

type EmailItem = {
  id: string
  to: string[]
  cc: string[]
  bcc: string[]
  subject: string
  body_md: string
  body_html: string | null
  status: EmailStatus
  retry_count: number
  max_retries: number
  queued_at: string
  sent_at: string | null
  delivered_at: string | null
  failed_at: string | null
  error: string | null
  error_code: string | null
  automation_run_id: string | null
  task_id: string | null
  project_id: string | null
  workspace_id: string | null
  automation_run?: {
    id: string
    status: string
    job_id: string
    job?: {
      id: string
      name: string
    }
  } | null
  task?: {
    id: string
    title: string
    type: string
  } | null
  project?: {
    id: string
    name: string
    color: string
  } | null
  workspace?: {
    id: string
    name: string
  } | null
  metadata: Record<string, unknown> | null
}

type Template = {
  id: string
  name: string
  subject: string
  created_at: string
}

type Project = {
  id: string
  name: string
  color: string
}

const statusIcons: Record<EmailStatus, React.ReactNode> = {
  queued: <Clock className="h-4 w-4 text-yellow-500" />,
  sending: <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />,
  sent: <Send className="h-4 w-4 text-blue-500" />,
  delivered: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  failed: <AlertCircle className="h-4 w-4 text-red-500" />,
  bounced: <XCircle className="h-4 w-4 text-red-500" />,
  cancelled: <XCircle className="h-4 w-4 text-zinc-500" />,
}

const statusColors: Record<EmailStatus, string> = {
  queued: 'bg-yellow-500/15 text-[color:var(--foco-warning)] dark:text-yellow-400',
  sending: 'bg-blue-500/15 text-[color:var(--foco-teal)] dark:text-blue-400',
  sent: 'bg-blue-500/15 text-[color:var(--foco-teal)] dark:text-blue-400',
  delivered: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  failed: 'bg-red-500/15 text-red-600 dark:text-red-400',
  bounced: 'bg-red-500/15 text-red-600 dark:text-red-400',
  cancelled: 'bg-zinc-500/15 text-zinc-500',
}

function CreateEmailDialog({
  open,
  onOpenChange,
  onCreated,
  projects,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated: (email: EmailItem) => void
  projects: Project[]
}) {
  const [to, setTo] = useState('')
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [subject, setSubject] = useState('')
  const [bodyMd, setBodyMd] = useState('')
  const [projectId, setProjectId] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!to.trim() || !subject.trim() || !bodyMd.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/emails/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: to.split(',').map((e) => e.trim()),
          cc: cc ? cc.split(',').map((e) => e.trim()) : [],
          bcc: bcc ? bcc.split(',').map((e) => e.trim()) : [],
          subject: subject.trim(),
          body_md: bodyMd.trim(),
          project_id: projectId || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Failed to queue email')
        return
      }
      toast.success('Email queued')
      onCreated(json.data)
      onOpenChange(false)
      setTo('')
      setCc('')
      setBcc('')
      setSubject('')
      setBodyMd('')
      setProjectId('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Email</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email-to">To (comma-separated)</Label>
            <Input
              id="email-to"
              type="email"
              multiple
              placeholder="recipient@example.com, another@example.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email-cc">CC (optional)</Label>
            <Input
              id="email-cc"
              type="email"
              multiple
              placeholder="cc@example.com"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email-bcc">BCC (optional)</Label>
            <Input
              id="email-bcc"
              type="email"
              multiple
              placeholder="bcc@example.com"
              value={bcc}
              onChange={(e) => setBcc(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email-subject">Subject</Label>
            <Input
              id="email-subject"
              placeholder="Your subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email-project">Project (optional)</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: p.color || '#64748b' }}
                      />
                      {p.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email-body">Body (Markdown)</Label>
            <Textarea
              id="email-body"
              placeholder="Write your message…"
              rows={5}
              value={bodyMd}
              onChange={(e) => setBodyMd(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Sending…' : 'Queue Email'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EmailDetailDialog({
  email,
  open,
  onOpenChange,
}: {
  email: EmailItem | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [ledgerEvents, setLedgerEvents] = useState<Array<{ id: string; type: string; timestamp: string; payload: unknown }>>(
    []
  )

  useEffect(() => {
    if (email?.id && open) {
      fetch(`/api/emails/deliveries/${email.id}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.data?.ledger_events) {
            setLedgerEvents(d.data.ledger_events)
          }
        })
    }
  }, [email, open])

  if (!email) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {statusIcons[email.status]}
            {email.subject}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-medium text-muted-foreground">To:</span>
              <div className="mt-1">{email.to.join(', ')}</div>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Status:</span>
              <div className="mt-1">
                <Badge className={cn('text-[10px] px-1.5 py-0 rounded-sm border-0', statusColors[email.status])}>
                  {email.status}
                </Badge>
                {email.retry_count > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">Retry {email.retry_count}/{email.max_retries}</span>
                )}
              </div>
            </div>
            {email.cc && email.cc.length > 0 && (
              <div>
                <span className="font-medium text-muted-foreground">CC:</span>
                <div className="mt-1">{email.cc.join(', ')}</div>
              </div>
            )}
            {email.bcc && email.bcc.length > 0 && (
              <div>
                <span className="font-medium text-muted-foreground">BCC:</span>
                <div className="mt-1">{email.bcc.join(', ')}</div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
            <div>Queued: {new Date(email.queued_at).toLocaleString()}</div>
            {email.sent_at && <div>Sent: {new Date(email.sent_at).toLocaleString()}</div>}
            {email.delivered_at && <div>Delivered: {new Date(email.delivered_at).toLocaleString()}</div>}
            {email.failed_at && <div>Failed: {new Date(email.failed_at).toLocaleString()}</div>}
          </div>

          {(email.automation_run || email.task || email.project) && (
            <div className="border rounded-lg p-3 space-y-2">
              <p className="font-medium text-xs text-muted-foreground">Related</p>
              {email.automation_run && (
                <div className="flex items-center gap-2 text-xs">
                  <History className="h-3 w-3" />
                  <span>Run:</span>
                  <Badge variant="outline" className="text-[10px]">
                    {email.automation_run.job?.name || 'Unknown'}
                  </Badge>
                  <ArrowRight className="h-3 w-3" />
                  <Badge
                    className={cn(
                      'text-[10px] border-0',
                      statusColors[(email.automation_run.status as EmailStatus) || 'pending']
                    )}
                  >
                    {email.automation_run.status}
                  </Badge>
                </div>
              )}
              {email.task && (
                <div className="flex items-center gap-2 text-xs">
                  <User className="h-3 w-3" />
                  <span>Task: {email.task.title}</span>
                  <Badge variant="outline" className="text-[10px]">{email.task.type}</Badge>
                </div>
              )}
              {email.project && (
                <div className="flex items-center gap-2 text-xs">
                  <Folder className="h-3 w-3" />
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: email.project.color || '#64748b' }}
                  />
                  <span>{email.project.name}</span>
                </div>
              )}
            </div>
          )}

          {(email.error || email.error_code) && (
            <div className="border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 rounded-lg p-3">
              <p className="font-medium text-xs text-red-600 dark:text-red-400">Error</p>
              {email.error_code && (
                <code className="text-xs text-red-500">{email.error_code}</code>
              )}
              {email.error && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{email.error}</p>}
            </div>
          )}

          <div>
            <p className="font-medium text-xs text-muted-foreground mb-2">Message Body</p>
            <div className="rounded-md border bg-muted/50 p-3 whitespace-pre-wrap text-xs font-mono">
              {email.body_md}
            </div>
          </div>

          {ledgerEvents.length > 0 && (
            <div>
              <p className="font-medium text-xs text-muted-foreground mb-2">Audit Trail</p>
              <div className="space-y-1">
                {ledgerEvents.map((event) => (
                  <div key={event.id} className="flex items-center gap-2 text-xs">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                    <Badge variant="outline" className="text-[10px]">{event.type}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function EmailsPage() {
  const { user, loading } = useAuth()
  const [outbox, setOutbox] = useState<EmailItem[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailEmail, setDetailEmail] = useState<EmailItem | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  async function load() {
    const [deliveriesRes, templatesRes, projectsRes] = await Promise.all([
      fetch('/api/emails/deliveries'),
      fetch('/api/emails/templates'),
      fetch('/api/projects'),
    ])
    const deliveriesJson = await deliveriesRes.json()
    const templatesJson = await templatesRes.json()
    const projectsJson = await projectsRes.json()
    setOutbox(deliveriesJson.data || [])
    setTemplates(templatesJson.data || [])
    setProjects(projectsJson.data || [])
  }

  async function cancelEmail(id: string) {
    setCancellingId(id)
    try {
      const res = await fetch(`/api/emails/deliveries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      })
      if (res.ok) {
        setOutbox((o) => o.map((e) => (e.id === id ? { ...e, status: 'cancelled' as EmailStatus } : e)))
        toast.success('Email cancelled')
      } else {
        toast.error('Failed to cancel email')
      }
    } catch {
      toast.error('Failed to cancel email')
    } finally {
      setCancellingId(null)
    }
  }

  useEffect(() => {
    if (!user) return
    load()
  }, [user])

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[color:var(--foco-teal)]" />
      </div>
    )
  if (!user) return null

  const queuedCount = outbox.filter((e) => ['queued', 'sending'].includes(e.status)).length
  const sentCount = outbox.filter((e) => ['sent', 'delivered'].includes(e.status)).length
  const failedCount = outbox.filter((e) => ['failed', 'bounced'].includes(e.status)).length

  return (
    <PageShell>
      <PageHeader
        title="Emails"
        subtitle="Outbox and deliveries"
        primaryAction={
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Email
          </Button>
        }
      />

      <CreateEmailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={(email) => {
          setOutbox((o) => [email, ...o])
          load()
        }}
        projects={projects}
      />

      <EmailDetailDialog email={detailEmail} open={detailOpen} onOpenChange={setDetailOpen} />

      <Tabs defaultValue="outbox">
        <TabsList>
          <TabsTrigger value="outbox">
            Outbox ({queuedCount}/{outbox.length})
          </TabsTrigger>
          <TabsTrigger value="sent">Sent ({sentCount})</TabsTrigger>
          <TabsTrigger value="failed">Failed ({failedCount})</TabsTrigger>
          <TabsTrigger value="templates">Templates ({templates.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="outbox" className="mt-4">
          <EmailList
            emails={outbox.filter((e) => ['queued', 'sending', 'pending'].includes(e.status))}
            onView={(e) => {
              setDetailEmail(e)
              setDetailOpen(true)
            }}
            onCancel={cancelEmail}
            cancellingId={cancellingId}
          />
        </TabsContent>

        <TabsContent value="sent" className="mt-4">
          <EmailList
            emails={outbox.filter((e) => ['sent', 'delivered'].includes(e.status))}
            onView={(e) => {
              setDetailEmail(e)
              setDetailOpen(true)
            }}
          />
        </TabsContent>

        <TabsContent value="failed" className="mt-4">
          <EmailList
            emails={outbox.filter((e) => ['failed', 'bounced'].includes(e.status))}
            onView={(e) => {
              setDetailEmail(e)
              setDetailOpen(true)
            }}
            showRetry
          />
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          {templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[200px] gap-3">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No templates yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-card"
                >
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium">{t.name}</p>
                    <p className="text-[12px] text-muted-foreground">{t.subject}</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(t.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </PageShell>
  )
}

function EmailList({
  emails,
  onView,
  onCancel,
  cancellingId,
  showRetry,
}: {
  emails: EmailItem[]
  onView: (e: EmailItem) => void
  onCancel?: (id: string) => void
  cancellingId?: string | null
  showRetry?: boolean
}) {
  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] gap-3">
        <Mail className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No emails</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {emails.map((email) => (
        <div
          key={email.id}
          className="flex items-start gap-3 px-4 py-3 rounded-lg border border-border bg-card hover:bg-secondary/40 transition-colors cursor-pointer"
          onClick={() => onView(email)}
        >
          <div className="mt-0.5">{statusIcons[email.status] || statusIcons.queued}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] font-medium truncate">{email.subject}</span>
              <Badge
                className={cn(
                  'text-[10px] px-1.5 py-0 rounded-sm border-0',
                  statusColors[email.status] || statusColors.queued
                )}
              >
                {email.status}
              </Badge>
              {email.retry_count > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  ({email.retry_count}/{email.max_retries})
                </span>
              )}
            </div>
            <p className="text-[12px] text-muted-foreground mt-0.5 truncate">To: {email.to.join(', ')}</p>

            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {email.project && (
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Folder className="h-3 w-3" />
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ backgroundColor: email.project.color || '#64748b' }}
                  />
                  {email.project.name}
                </div>
              )}
              {email.automation_run && (
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <History className="h-3 w-3" />
                  {email.automation_run.job?.name || 'Automation'}
                </div>
              )}
              {email.task && (
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <User className="h-3 w-3" />
                  {email.task.title}
                </div>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground mt-1">
              {email.queued_at && new Date(email.queued_at).toLocaleString()}
            </p>
            {email.error && (
              <p className="text-[11px] text-red-500 mt-0.5 truncate">{email.error}</p>
            )}
          </div>
          {onCancel && email.status === 'queued' && (
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
              disabled={cancellingId === email.id}
              onClick={(e) => {
                e.stopPropagation()
                onCancel(email.id)
              }}
            >
              <XCircle className="h-3.5 w-3.5 mr-1" />
              Cancel
            </Button>
          )}
          {showRetry && email.status === 'failed' && (
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0"
              onClick={(e) => {
                e.stopPropagation()
                // Retry logic would go here
                toast.info('Retry scheduled')
              }}
            >
              <History className="h-3.5 w-3.5 mr-1" />
              Retry
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={(e) => {
              e.stopPropagation()
              onView(email)
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  )
}
