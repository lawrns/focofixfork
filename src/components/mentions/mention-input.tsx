'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/data-display/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  AtSign,
  User,
  Hash,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface User {
  id: string
  username: string
  display_name: string
  avatar?: string
}

interface MentionInputProps {
  value: string
  onChange: (value: string) => void
  onMentionsChange?: (mentions: Array<{ user: User; position: number; length: number }>) => void
  placeholder?: string
  users: User[]
  disabled?: boolean
  multiline?: boolean
  rows?: number
  className?: string
  maxLength?: number
}

interface MentionSuggestion {
  user: User
  query: string
  position: number
}

export default function MentionInput({
  value,
  onChange,
  onMentionsChange,
  placeholder = 'Type @ to mention someone...',
  users,
  disabled = false,
  multiline = false,
  rows = 3,
  className,
  maxLength
}: MentionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<User[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionStart, setMentionStart] = useState(-1)
  const [currentMentions, setCurrentMentions] = useState<Array<{
    user: User
    position: number
    length: number
  }>>([])

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Parse mentions from current value
  const parseMentions = useCallback((text: string) => {
    const mentions: Array<{ user: User; position: number; length: number }> = []
    const mentionRegex = /@(\w+)/g
    let match

    while ((match = mentionRegex.exec(text)) !== null) {
      const username = match[1]
      const user = users.find(u => u.username === username)

      if (user) {
        mentions.push({
          user,
          position: match.index,
          length: match[0].length
        })
      }
    }

    return mentions
  }, [users])

  // Update mentions when value changes
  useEffect(() => {
    const mentions = parseMentions(value)
    setCurrentMentions(mentions)
    onMentionsChange?.(mentions)
  }, [value, parseMentions, onMentionsChange])

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const newValue = e.target.value
    const cursorPosition = e.target.selectionStart || 0

    onChange(newValue)

    // Check for mention trigger
    const textBeforeCursor = newValue.substring(0, cursorPosition)
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/)

    if (mentionMatch) {
      const query = mentionMatch[1]
      setMentionQuery(query)
      setMentionStart(cursorPosition - query.length - 1) // -1 for the @

      // Filter users based on query
      const filteredUsers = users.filter(user =>
        user.username.toLowerCase().includes(query.toLowerCase()) ||
        user.display_name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5) // Limit to 5 suggestions

      setSuggestions(filteredUsers)
      setShowSuggestions(filteredUsers.length > 0)
      setSelectedIndex(0)
    } else {
      setShowSuggestions(false)
      setMentionQuery('')
      setMentionStart(-1)
    }
  }

  // Handle key down for navigation and selection
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (!showSuggestions) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break

      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : prev)
        break

      case 'Enter':
      case 'Tab':
        e.preventDefault()
        if (suggestions[selectedIndex]) {
          selectMention(suggestions[selectedIndex])
        }
        break

      case 'Escape':
        setShowSuggestions(false)
        break
    }
  }

  // Select a mention from suggestions
  const selectMention = (user: User) => {
    if (mentionStart === -1) return

    const beforeMention = value.substring(0, mentionStart)
    const afterMention = value.substring((inputRef.current?.selectionStart || 0))
    const mentionText = `@${user.username} `

    const newValue = beforeMention + mentionText + afterMention
    onChange(newValue)

    setShowSuggestions(false)
    setMentionQuery('')
    setMentionStart(-1)

    // Focus back to input and set cursor position
    setTimeout(() => {
      const currentRef = multiline ? textareaRef.current : inputRef.current
      if (currentRef) {
        const newCursorPosition = beforeMention.length + mentionText.length
        currentRef.focus()
        if ('setSelectionRange' in currentRef) {
          currentRef.setSelectionRange(newCursorPosition, newCursorPosition)
        }
      }
    }, 0)
  }

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const baseInputProps = {
    value,
    onChange: handleInputChange,
    onKeyDown: handleKeyDown,
    placeholder,
    disabled,
    maxLength,
    className: cn(
      'relative',
      multiline ? 'resize-none' : '',
      className
    )
  }

  return (
    <div className="relative">
      {multiline ? (
        <Textarea
          {...baseInputProps}
          ref={textareaRef}
          rows={rows}
        />
      ) : (
        <Input
          {...baseInputProps}
          ref={inputRef}
        />
      )}

      {/* Mention Suggestions */}
      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            ref={suggestionsRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-64 bg-popover border border-border rounded-lg shadow-lg mt-1"
            style={{
              top: multiline ? 'auto' : '100%',
              left: 0
            }}
          >
            <ScrollArea className="max-h-48">
              <div className="p-2">
                <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <AtSign className="w-3 h-3" />
                  Mention someone
                </div>

                {suggestions.map((user, index) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      'flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted transition-colors',
                      index === selectedIndex && 'bg-muted'
                    )}
                    onClick={() => selectMention(user)}
                  >
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback className="text-xs">
                        {user.display_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {user.display_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        @{user.username}
                      </p>
                    </div>
                  </motion.div>
                ))}

                {suggestions.length === 0 && (
                  <div className="p-3 text-center text-sm text-muted-foreground">
                    No users found
                  </div>
                )}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Current Mentions Display */}
      {currentMentions.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {currentMentions.map((mention, index) => (
            <motion.div
              key={`${mention.user.id}-${mention.position}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 rounded-full text-xs"
            >
              <AtSign className="w-3 h-3" />
              {mention.user.display_name}
            </motion.div>
          ))}
        </div>
      )}

      {/* Helper Text */}
      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
        <AtSign className="w-3 h-3" />
        Type @ to mention team members
      </div>
    </div>
  )
}

// Rich text renderer for mentions (displays mentions with highlighting)
export function MentionRenderer({
  content,
  mentions,
  className
}: {
  content: string
  mentions: Array<{ user: User; position: number; length: number }>
  className?: string
}) {
  if (mentions.length === 0) {
    return <span className={className}>{content}</span>
  }

  // Sort mentions by position (reverse for replacement)
  const sortedMentions = [...mentions].sort((a, b) => b.position - a.position)

  let result = content

  sortedMentions.forEach(mention => {
    const before = result.substring(0, mention.position)
    const mentionText = result.substring(mention.position, mention.position + mention.length)
    const after = result.substring(mention.position + mention.length)

    result = `${before}<span class="mention-highlight bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 px-1 py-0.5 rounded font-medium" data-user-id="${mention.user.id}">${mentionText}</span>${after}`
  })

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: result }}
    />
  )
}

// Mention tooltip component
export function MentionTooltip({
  user,
  children
}: {
  user: User
  children: React.ReactNode
}) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {children}

      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute z-50 bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-popover border border-border rounded-lg shadow-lg p-3 min-w-48"
          >
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user.avatar} />
                <AvatarFallback>
                  {user.display_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div>
                <p className="font-medium text-sm">{user.display_name}</p>
                <p className="text-xs text-muted-foreground">@{user.username}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
