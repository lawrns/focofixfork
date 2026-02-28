'use client'

import { useState, useEffect } from 'react'
import { Mail, Send, FileText, Plus } from 'lucide-react'
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

type EmailItem = {
  id: string
  to: string[]
  subject: string
  body_md: string
  status: string
  queued_at: string
  sent_at: string | null
  error: string | null
}

type Template = {
  id: string
  name: string
  subject: string
  created_at: string
}

const statusColors: Record<string, string> = {
  queued: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400',
  sent: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  failed: 'bg-red-500/15 text-red-600 dark:text-red-400',
}

function CreateEmailDialog({ open, onOpenChange, onCreated }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated: (email: EmailItem) => void
}) {
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [bodyMd, setBodyMd] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!to.trim() || !subject.trim() || !bodyMd.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/emails/outbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: to.trim(), subject: subject.trim(), body_md: bodyMd.trim() }),
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
      setSubject('')
      setBodyMd('')
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
            <Label htmlFor="email-to">To</Label>
            <Input
              id="email-to"
              type="email"
              placeholder="recipient@example.com"
              value={to}
              onChange={e => setTo(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email-subject">Subject</Label>
            <Input
              id="email-subject"
              placeholder="Your subject"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email-body">Body (Markdown)</Label>
            <Textarea
              id="email-body"
              placeholder="Write your message…"
              rows={5}
              value={bodyMd}
              onChange={e => setBodyMd(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Sending…' : 'Queue Email'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function EmailsPage() {
  const { user, loading } = useAuth()
  const [outbox, setOutbox] = useState<EmailItem[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    fetch('/api/emails/outbox').then(r => r.json()).then(d => setOutbox(d.data ?? []))
    fetch('/api/emails/templates').then(r => r.json()).then(d => setTemplates(d.data ?? []))
  }, [user])

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[color:var(--foco-teal)]" /></div>
  if (!user) return null

  return (
    <PageShell>
      <PageHeader
        title="Emails"
        subtitle="Outbox and templates"
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
        onCreated={email => setOutbox(o => [email, ...o])}
      />

      <Tabs defaultValue="outbox">
        <TabsList>
          <TabsTrigger value="outbox">Outbox ({outbox.length})</TabsTrigger>
          <TabsTrigger value="templates">Templates ({templates.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="outbox" className="mt-4">
          {outbox.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[200px] gap-3">
              <Mail className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No emails in outbox</p>
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                New Email
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {outbox.map(email => (
                <div key={email.id} className="flex items-start gap-3 px-4 py-3 rounded-lg border border-border bg-card">
                  <Send className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-medium truncate">{email.subject}</span>
                      <Badge className={cn('text-[10px] px-1.5 py-0 rounded-sm border-0', statusColors[email.status])}>
                        {email.status}
                      </Badge>
                    </div>
                    <p className="text-[12px] text-muted-foreground mt-0.5">
                      To: {email.to.join(', ')}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(email.queued_at).toLocaleString()}
                    </p>
                    {email.error && <p className="text-[11px] text-red-500 mt-0.5">{email.error}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          {templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[200px] gap-3">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No templates yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-card">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium">{t.name}</p>
                    <p className="text-[12px] text-muted-foreground">{t.subject}</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{new Date(t.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </PageShell>
  )
}
