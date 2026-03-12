'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { usePathname, useParams } from 'next/navigation'
import { Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface GlobalComposerProps {
  className?: string
  placeholder?: string
  onSubmit?: (prompt: string, preferredModel?: string) => void | Promise<void>
}

export function GlobalComposer({
  className,
  placeholder = 'What should we build?',
  onSubmit,
}: GlobalComposerProps) {
  const pathname = usePathname()
  const params = useParams()
  const [prompt, setPrompt] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Detect if we're on a run detail page
  const isRunPage = pathname?.startsWith('/runs/') && params?.id
  const runId = isRunPage ? (params.id as string) : null

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || submitting) return

    setSubmitting(true)
    try {
      if (onSubmit) {
        await onSubmit(prompt.trim())
        setPrompt('')
        return
      }

      if (runId) {
        // Continue existing run
        const res = await fetch(`/api/runs/${runId}/continue`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: prompt.trim(),
            context: {
              source: 'global-composer',
              pathname,
            },
          }),
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error ?? 'Failed to continue run')
        }

        const data = await res.json()
        toast.success(`Turn ${data.status}`)
        setPrompt('')
      } else {
        // Create new run
        const res = await fetch('/api/runs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            runner: 'openclaw',
            summary: prompt.trim().slice(0, 100),
            status: 'pending',
          }),
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error ?? 'Failed to create run')
        }

        const data = await res.json()
        const newRunId = data.data?.id ?? data.id
        
        if (newRunId) {
          // Continue the new run with the prompt
          const continueRes = await fetch(`/api/runs/${newRunId}/continue`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: prompt.trim(),
              context: {
                source: 'global-composer',
                pathname,
              },
            }),
          })

          if (!continueRes.ok) {
            const err = await continueRes.json()
            throw new Error(err.error ?? 'Failed to start run')
          }

          toast.success('Run started')
          setPrompt('')
          
          // Navigate to the run page
          window.location.href = `/runs/${newRunId}`
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }, [prompt, submitting, runId, pathname, onSubmit])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      void handleSubmit()
    }
  }, [handleSubmit])

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [prompt])

  return (
    <div
      className={cn(
        'sticky bottom-0 z-50 w-full border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        className
      )}
    >
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="relative flex items-end gap-2 rounded-2xl border bg-muted/50 p-2 shadow-sm">
          <Textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRunPage ? 'Continue this run...' : placeholder}
            className="min-h-[44px] max-h-[200px] resize-none border-0 bg-transparent px-3 py-2.5 text-sm shadow-none focus-visible:ring-0"
            rows={1}
          />
          <div className="flex items-center gap-1 pb-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => void handleSubmit()}
              disabled={!prompt.trim() || submitting}
              className="h-8 w-8 shrink-0"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        <div className="mt-1.5 flex items-center justify-between px-1">
          <p className="text-[10px] text-muted-foreground">
            {isRunPage ? 'Continuing run' : 'New run'} · Cmd+Enter to send
          </p>
          <p className="text-[10px] text-muted-foreground">
            {prompt.length} chars
          </p>
        </div>
      </div>
    </div>
  )
}
