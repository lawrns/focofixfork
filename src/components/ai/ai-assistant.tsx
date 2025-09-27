'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  Send,
  Bot,
  User,
  Sparkles,
  Loader2,
  Minimize2,
  Maximize2,
  X,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ollamaService } from '@/lib/services/ollama'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  metadata?: {
    type?: string
    confidence?: number
    suggestions?: any[]
  }
}

interface AIAssistantProps {
  projectId?: string
  milestoneId?: string
  taskId?: string
  context?: string
  className?: string
  initialMessages?: Message[]
  onSuggestionAccept?: (suggestion: any) => void
}

const AIAssistant: React.FC<AIAssistantProps> = ({
  projectId,
  milestoneId,
  taskId,
  context,
  className,
  initialMessages = [],
  onSuggestionAccept
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Check Ollama connection on mount
  useEffect(() => {
    checkOllamaStatus()
  }, [])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const checkOllamaStatus = async () => {
    try {
      const status = await ollamaService.testConnection()
      setOllamaStatus(status.success ? 'connected' : 'disconnected')
    } catch (error) {
      setOllamaStatus('disconnected')
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || ollamaStatus !== 'connected') return

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsTyping(true)

    try {
      // Build context for the AI
      let conversationContext = `You are an AI assistant helping with project management in Foco. `

      if (projectId) {
        conversationContext += `The user is working on project ID: ${projectId}. `
      }
      if (milestoneId) {
        conversationContext += `They are focused on milestone ID: ${milestoneId}. `
      }
      if (taskId) {
        conversationContext += `They are working on task ID: ${taskId}. `
      }
      if (context) {
        conversationContext += `Additional context: ${context}. `
      }

      conversationContext += `\n\nUser message: ${userMessage.content}\n\nProvide helpful, actionable assistance related to project management. If appropriate, suggest specific tasks, milestones, or improvements.`

      const response = await ollamaService.generate({
        model: ollamaService.config.chatModel,
        prompt: conversationContext,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          num_predict: 300
        }
      })

      const assistantMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
        metadata: {
          type: 'chat_response',
          confidence: 0.8
        }
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error: any) {
      console.error('AI assistant error:', error)
      const errorMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: 'I apologize, but I encountered an error while processing your request. Please try again or check that the AI service is running.',
        timestamp: new Date(),
        metadata: {
          type: 'error'
        }
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const clearConversation = () => {
    setMessages([])
  }

  const generateQuickSuggestions = async (type: 'tasks' | 'milestones' | 'analysis') => {
    if (!projectId) return

    setIsTyping(true)

    try {
      let suggestions: any[] = []

      switch (type) {
        case 'tasks':
          suggestions = await ollamaService.suggestTasks(projectId, context)
          break
        case 'milestones':
          const { data: milestoneTasksData } = await fetch(`/api/tasks?project_id=${projectId}`)
            .then(r => r.json())
          suggestions = await ollamaService.suggestMilestones(projectId, milestoneTasksData?.data || [])
          break
        case 'analysis':
          const [{ data: project }, { data: tasksData }, { data: milestonesData }] = await Promise.all([
            fetch(`/api/projects/${projectId}`).then(r => r.json()),
            fetch(`/api/tasks?project_id=${projectId}`).then(r => r.json()),
            fetch(`/api/milestones?project_id=${projectId}`).then(r => r.json())
          ])

          if (project?.data) {
            const analysis = await ollamaService.analyzeProject(
              project.data,
              tasksData?.data || [],
              milestonesData?.data || []
            )
            suggestions = [analysis]
          }
          break
      }

      // Save suggestions
      for (const suggestion of suggestions) {
        await ollamaService.saveSuggestion(suggestion)
      }

      // Add to conversation
      const suggestionMessage: Message = {
        id: `suggestions-${Date.now()}`,
        role: 'assistant',
        content: `I've generated ${suggestions.length} ${type} suggestions for you. You can find them in the AI Suggestions panel.`,
        timestamp: new Date(),
        metadata: {
          type: 'suggestions',
          suggestions
        }
      }

      setMessages(prev => [...prev, suggestionMessage])
    } catch (error) {
      console.error('Quick suggestion error:', error)
    } finally {
      setIsTyping(false)
    }
  }

  if (!isOpen) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={cn('fixed bottom-4 right-4 z-50', className)}
      >
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="rounded-full w-14 h-14 shadow-lg"
        >
          <Bot className="h-6 w-6" />
        </Button>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn('fixed bottom-4 right-4 z-50', className)}
    >
      <Card className={cn(
        'w-96 shadow-xl border-2',
        isMinimized ? 'h-14' : 'h-[600px]'
      )}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="h-5 w-5 text-primary" />
              AI Assistant
              <Badge
                variant={ollamaStatus === 'connected' ? 'default' : 'destructive'}
                className="text-xs"
              >
                {ollamaStatus === 'connected' ? 'Online' : 'Offline'}
              </Badge>
            </CardTitle>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-6 w-6 p-0"
              >
                {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <AnimatePresence>
          {!isMinimized && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <CardContent className="p-0 h-[520px] flex flex-col">
                {/* Quick Actions */}
                {projectId && (
                  <div className="p-3 border-b bg-muted/50">
                    <div className="flex gap-1 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateQuickSuggestions('tasks')}
                        disabled={ollamaStatus !== 'connected' || isTyping}
                        className="text-xs h-7"
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        Suggest Tasks
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateQuickSuggestions('milestones')}
                        disabled={ollamaStatus !== 'connected' || isTyping}
                        className="text-xs h-7"
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        Suggest Milestones
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateQuickSuggestions('analysis')}
                        disabled={ollamaStatus !== 'connected' || isTyping}
                        className="text-xs h-7"
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        Analyze Project
                      </Button>
                    </div>
                  </div>
                )}

                {/* Messages */}
                <ScrollArea className="flex-1 p-3">
                  <div className="space-y-4">
                    {messages.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">How can I help you with your project?</p>
                        <p className="text-xs mt-1">Ask me anything about project management, tasks, or milestones.</p>
                      </div>
                    )}

                    <AnimatePresence>
                      {messages.map((message) => (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className={cn(
                            'flex gap-3',
                            message.role === 'user' ? 'justify-end' : 'justify-start'
                          )}
                        >
                          {message.role === 'assistant' && (
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarFallback className="bg-primary text-primary-foreground">
                                <Bot className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                          )}

                          <div className={cn(
                            'max-w-[80%] rounded-lg px-3 py-2',
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          )}>
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            <span className="text-xs opacity-70 mt-1 block">
                              {message.timestamp.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>

                          {message.role === 'user' && (
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarFallback>
                                <User className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {isTyping && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex gap-3"
                      >
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            <Bot className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="bg-muted rounded-lg px-3 py-2">
                          <div className="flex items-center gap-1">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm text-muted-foreground">Thinking...</span>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Input */}
                <div className="p-3 border-t">
                  <div className="flex gap-2">
                    <Textarea
                      ref={textareaRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={
                        ollamaStatus === 'connected'
                          ? "Ask me about your project..."
                          : "AI service unavailable"
                      }
                      disabled={ollamaStatus !== 'connected'}
                      className="min-h-[60px] resize-none"
                      rows={1}
                    />
                    <div className="flex flex-col gap-1">
                      <Button
                        onClick={handleSendMessage}
                        disabled={!inputValue.trim() || ollamaStatus !== 'connected' || isTyping}
                        size="sm"
                        className="h-8 w-8 p-0"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                      {messages.length > 0 && (
                        <Button
                          onClick={clearConversation}
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  )
}

export default AIAssistant
