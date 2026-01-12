'use client'

import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Eye, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import './markdown-preview.css'

interface MarkdownPreviewProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  rows?: number
}

export function MarkdownPreview({
  value,
  onChange,
  placeholder = 'Enter markdown text...',
  disabled = false,
  className,
  rows = 5,
}: MarkdownPreviewProps) {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')

  return (
    <div className={cn('markdown-preview-container', className)}>
      {/* Tab Buttons */}
      <div className="markdown-preview-tabs">
        <Button
          type="button"
          variant={mode === 'edit' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setMode('edit')}
          className="flex items-center gap-2"
        >
          <Edit2 className="w-4 h-4" />
          Edit
        </Button>
        <Button
          type="button"
          variant={mode === 'preview' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setMode('preview')}
          className="flex items-center gap-2"
        >
          <Eye className="w-4 h-4" />
          Preview
        </Button>
      </div>

      {/* Edit Mode */}
      {mode === 'edit' && (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          className="markdown-preview-textarea"
        />
      )}

      {/* Preview Mode */}
      {mode === 'preview' && (
        <div className="markdown-preview">
          <ReactMarkdown
            components={{
              h1: ({ node, ...props }) => <h1 className="markdown-h1" {...props} />,
              h2: ({ node, ...props }) => <h2 className="markdown-h2" {...props} />,
              h3: ({ node, ...props }) => <h3 className="markdown-h3" {...props} />,
              h4: ({ node, ...props }) => <h4 className="markdown-h4" {...props} />,
              h5: ({ node, ...props }) => <h5 className="markdown-h5" {...props} />,
              h6: ({ node, ...props }) => <h6 className="markdown-h6" {...props} />,
              p: ({ node, ...props }) => <p className="markdown-p" {...props} />,
              a: ({ node, ...props }) => <a className="markdown-a" {...props} />,
              blockquote: ({ node, ...props }) => <blockquote className="markdown-blockquote" {...props} />,
              ul: ({ node, ...props }) => <ul className="markdown-ul" {...props} />,
              ol: ({ node, ...props }) => <ol className="markdown-ol" {...props} />,
              li: ({ node, ...props }) => <li className="markdown-li" {...props} />,
              code: ({ node, inline, ...props }: any) =>
                inline ? (
                  <code className="markdown-code-inline" {...props} />
                ) : (
                  <code className="markdown-code-block" {...props} />
                ),
              pre: ({ node, ...props }) => <pre className="markdown-pre" {...props} />,
              img: ({ node, alt, ...props }) => <img className="markdown-img" alt={alt || ''} loading="lazy" {...props} />,
              strong: ({ node, ...props }) => <strong className="markdown-strong" {...props} />,
              em: ({ node, ...props }) => <em className="markdown-em" {...props} />,
            }}
          >
            {value || '*No content to preview*'}
          </ReactMarkdown>
        </div>
      )}
    </div>
  )
}
