'use client'

import { useState, useCallback } from 'react'
import { usePromptOptimizerStore } from '@/lib/stores/prompt-optimizer-store'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Wand2, Loader2, Check, Copy } from 'lucide-react'
import { toast } from 'sonner'

interface OptimizeResult {
  optimized_prompt: string
  improvements: string
  tokens_used: number
  elapsed_ms: number
  codebase_context_included: boolean
}

export function PromptOptimizerModal() {
  const { isOpen, close } = usePromptOptimizerStore()

  const [rawPrompt, setRawPrompt] = useState('')
  const [includeContext, setIncludeContext] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<OptimizeResult | null>(null)
  const [copied, setCopied] = useState(false)

  const resetState = useCallback(() => {
    setRawPrompt('')
    setIncludeContext(false)
    setLoading(false)
    setResult(null)
    setCopied(false)
  }, [])

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        close()
        resetState()
      }
    },
    [close, resetState]
  )

  const handleOptimize = useCallback(async () => {
    if (!rawPrompt.trim()) return
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/prompt-optimizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_prompt: rawPrompt,
          include_codebase_context: includeContext,
        }),
      })

      const json = await res.json()

      if (!res.ok || !json.ok) {
        const msg = json.error || `Error ${res.status}`
        if (res.status === 503) {
          toast.error('Prompt optimizer service is offline. Run: systemctl --user start prompt-optimizer')
        } else if (res.status === 504) {
          toast.error('Optimizer timed out. Try without codebase context.')
        } else {
          toast.error(msg)
        }
        return
      }

      setResult(json.data as OptimizeResult)
    } catch {
      toast.error('Failed to reach prompt optimizer')
    } finally {
      setLoading(false)
    }
  }, [rawPrompt, includeContext])

  const handleCopy = useCallback(() => {
    if (!result) return
    navigator.clipboard.writeText(result.optimized_prompt).then(() => {
      setCopied(true)
      toast.success('Copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    })
  }, [result])

  const loadingLabel = includeContext
    ? 'Scanning codebase + optimizing…'
    : 'Optimizing…'

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Prompt Optimizer
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 px-1 py-2">
          {/* Input */}
          <div className="space-y-2">
            <Label htmlFor="raw-prompt" className="text-sm font-medium">
              Your prompt
            </Label>
            <Textarea
              id="raw-prompt"
              autoFocus
              placeholder="Paste or type the prompt you want to improve…"
              className="min-h-[120px] resize-y font-mono text-sm"
              value={rawPrompt}
              onChange={(e) => setRawPrompt(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Codebase context toggle */}
          <div className="flex items-start gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-3">
            <Switch
              id="include-context"
              checked={includeContext}
              onCheckedChange={setIncludeContext}
              disabled={loading}
              className="data-[state=checked]:bg-[#00C49A] dark:data-[state=checked]:bg-[#00D4AA] mt-0.5"
            />
            <div className="space-y-0.5">
              <Label htmlFor="include-context" className="text-sm font-medium cursor-pointer">
                Include codebase context
              </Label>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Scans focofixfork with repomix — adds ~15–20 s to the request
              </p>
            </div>
          </div>

          {/* Action */}
          <Button
            onClick={handleOptimize}
            disabled={loading || !rawPrompt.trim()}
            className="w-full bg-[color:var(--foco-teal)] hover:bg-[color:var(--foco-teal)]/90 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {loadingLabel}
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                Optimize
              </>
            )}
          </Button>

          {/* Result */}
          {result && (
            <div className="space-y-4 pt-2">
              {/* Meta */}
              <div className="flex items-center gap-3 text-xs text-zinc-500">
                <span>{(result.elapsed_ms / 1000).toFixed(1)}s</span>
                {result.tokens_used > 0 && <span>{result.tokens_used.toLocaleString()} tokens</span>}
                {result.codebase_context_included && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#00C49A]/10 text-[#00956F] dark:text-[#00D4AA] px-2 py-0.5 font-medium">
                    codebase included
                  </span>
                )}
              </div>

              {/* Optimized prompt */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Optimized prompt</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1.5"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <><Check className="h-3.5 w-3.5 text-emerald-500" /> Copied</>
                    ) : (
                      <><Copy className="h-3.5 w-3.5" /> Copy</>
                    )}
                  </Button>
                </div>
                <pre className="whitespace-pre-wrap break-words rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 py-3 text-sm font-mono leading-relaxed">
                  {result.optimized_prompt}
                </pre>
              </div>

              {/* What changed */}
              {result.improvements && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">What changed</Label>
                  <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {result.improvements}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
