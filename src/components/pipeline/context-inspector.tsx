'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'

interface ContextInspectorProps {
  label: string
  text: string
  value?: string
}

export function ContextInspector({ label, text, value = 'item' }: ContextInspectorProps) {
  const tokenEstimate = Math.round(text.length / 4)

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value={value} className="border-none">
        <AccordionTrigger className="text-xs text-muted-foreground py-2 hover:no-underline">
          <span>{label}</span>
          <Badge variant="secondary" className="ml-auto mr-2 text-[10px]">
            ~{tokenEstimate.toLocaleString()} tokens
          </Badge>
        </AccordionTrigger>
        <AccordionContent>
          <ScrollArea className="h-40">
            <pre className="text-[11px] font-mono p-3 whitespace-pre-wrap leading-relaxed text-foreground/80">
              {text.slice(0, 3000)}
              {text.length > 3000 && '\n… (truncated)'}
            </pre>
          </ScrollArea>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
