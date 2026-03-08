'use client'

import { Command, Loader2, Send, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export function CommandComposer({
  mode,
  prompt,
  setPrompt,
  showShortcutHint,
  setShowShortcutHint,
  isProcessing,
  pendingDecision,
  handleSubmit,
  handleSubmitText,
  cancelExecution,
  placeholder,
  examples,
  bgColor,
  color,
}: {
  mode: string
  prompt: string
  setPrompt: (value: string) => void
  showShortcutHint: boolean
  setShowShortcutHint: (value: boolean) => void
  isProcessing: boolean
  pendingDecision: boolean
  handleSubmit: (e: React.FormEvent) => void
  handleSubmitText: (text: string) => void
  cancelExecution: () => void
  placeholder: string
  examples: string[]
  bgColor: string
  color: string
}) {
  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="relative">
        <Input
          data-command-input="true"
          placeholder={placeholder}
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value)
            setShowShortcutHint(!e.target.value)
          }}
          onFocus={() => setShowShortcutHint(!prompt)}
          onBlur={() => setShowShortcutHint(false)}
          disabled={isProcessing || pendingDecision}
          className={cn(
            'min-h-14 w-full bg-background/80 pl-4 pr-24 text-base backdrop-blur-sm',
            'border-border/60 shadow-inner transition-all duration-200 focus-visible:border-primary/50',
            'placeholder:text-muted-foreground/60',
          )}
        />
        {showShortcutHint && !prompt && !isProcessing && !pendingDecision && (
          <div className="pointer-events-none absolute right-4 top-1/2 flex -translate-y-1/2 items-center gap-1.5 text-xs text-muted-foreground/50">
            <kbd className="hidden items-center gap-1 rounded border border-border/50 bg-muted px-1.5 py-0.5 font-sans text-[10px] sm:inline-flex">
              <Command className="h-3 w-3" />
              <span>K</span>
            </kbd>
            <span className="hidden sm:inline">to focus</span>
          </div>
        )}
        <Button
          type="submit"
          disabled={isProcessing || !prompt.trim() || pendingDecision}
          size="icon"
          className={cn(
            'absolute right-2 top-1/2 h-10 w-10 -translate-y-1/2 transition-all duration-200',
            prompt.trim() && !isProcessing ? 'scale-100 opacity-100' : 'scale-95 opacity-50',
          )}
        >
          {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>

      <div className="flex items-center justify-between">
        {!prompt && !isProcessing && !pendingDecision && (
          <div className="flex flex-wrap gap-2">
            {examples.slice(0, 3).map((example, index) => (
              <button
                key={`${mode}-${index}`}
                type="button"
                className={cn(
                  'rounded-full border border-transparent px-3 py-1.5 text-xs transition-all duration-200 hover:border-current/20 hover:shadow-sm',
                  bgColor,
                  color,
                )}
                onClick={() => {
                  setPrompt(example)
                  handleSubmitText(example)
                }}
              >
                {example}
              </button>
            ))}
          </div>
        )}

        <div className="ml-auto">
          {isProcessing && (
            <Button type="button" variant="destructive" size="sm" onClick={cancelExecution} className="gap-1.5">
              <Square className="h-3.5 w-3.5 fill-current" />
              Stop
            </Button>
          )}
        </div>
      </div>
    </form>
  )
}
