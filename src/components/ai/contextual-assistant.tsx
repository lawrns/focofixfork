'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/design-system'
import { 
  MessageCircle, 
  X, 
  Send, 
  Bot, 
  Sparkles,
  Lightbulb,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/contexts/auth-context'

interface ContextualAssistantProps {
  className?: string
}

interface Message {
  id: string
  type: 'user' | 'assistant' | 'suggestion'
  content: string
  timestamp: Date
  actions?: Array<{
    label: string
    action: string
    onClick: () => void
  }>
}

export function ContextualAssistant({ className }: ContextualAssistantProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasNewMessage, setHasNewMessage] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Add welcome message on first open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome',
        type: 'assistant',
        content: `Hello${user ? ` ${user.user_metadata?.full_name || user.email}` : ''}! I'm your AI assistant. I can help you with project management, task creation, team collaboration, and more. What would you like to know?`,
        timestamp: new Date(),
        actions: [
          {
            label: 'Create Project',
            action: 'create_project',
            onClick: () => handleQuickAction('create_project')
          },
          {
            label: 'Add Task',
            action: 'add_task',
            onClick: () => handleQuickAction('add_task')
          },
          {
            label: 'View Analytics',
            action: 'view_analytics',
            onClick: () => handleQuickAction('view_analytics')
          }
        ]
      }
      setMessages([welcomeMessage])
    }
  }, [isOpen, messages.length, user])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      // Simulate AI response
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: generateAIResponse(inputValue),
        timestamp: new Date(),
        actions: generateResponseActions(inputValue)
      }

      setMessages(prev => [...prev, aiResponse])
      setHasNewMessage(true)
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateAIResponse = (input: string): string => {
    const lowerInput = input.toLowerCase()
    
    if (lowerInput.includes('project')) {
      return "I can help you create and manage projects! Would you like me to guide you through creating a new project or help you organize your existing ones?"
    } else if (lowerInput.includes('task')) {
      return "Tasks are the building blocks of successful projects. I can help you create tasks, set priorities, assign team members, and track progress. What specific task management help do you need?"
    } else if (lowerInput.includes('team') || lowerInput.includes('collaboration')) {
      return "Team collaboration is key to project success! I can help you invite team members, manage permissions, set up communication channels, and coordinate workflows."
    } else if (lowerInput.includes('analytics') || lowerInput.includes('report')) {
      return "Analytics help you understand your project performance and team productivity. I can help you generate reports, analyze trends, and identify areas for improvement."
    } else if (lowerInput.includes('deadline') || lowerInput.includes('schedule')) {
      return "Managing deadlines and schedules is crucial for project success. I can help you set realistic timelines, track progress, and send reminders to keep everything on track."
    } else {
      return "I'm here to help with all aspects of project management! You can ask me about creating projects, managing tasks, team collaboration, analytics, deadlines, or any other project management topic. What would you like to explore?"
    }
  }

  const generateResponseActions = (input: string): Message['actions'] => {
    const lowerInput = input.toLowerCase()
    
    if (lowerInput.includes('project')) {
      return [
        {
          label: 'Create New Project',
          action: 'create_project',
          onClick: () => handleQuickAction('create_project')
        },
        {
          label: 'View Projects',
          action: 'view_projects',
          onClick: () => handleQuickAction('view_projects')
        }
      ]
    } else if (lowerInput.includes('task')) {
      return [
        {
          label: 'Add Task',
          action: 'add_task',
          onClick: () => handleQuickAction('add_task')
        },
        {
          label: 'View Tasks',
          action: 'view_tasks',
          onClick: () => handleQuickAction('view_tasks')
        }
      ]
    }
    
    return []
  }

  const handleQuickAction = (action: string) => {
    // Handle quick actions
    switch (action) {
      case 'create_project':
        window.location.href = '/projects?create=true'
        break
      case 'add_task':
        window.location.href = '/tasks?create=true'
        break
      case 'view_analytics':
        window.location.href = '/dashboard/analytics'
        break
      case 'view_projects':
        window.location.href = '/projects'
        break
      case 'view_tasks':
        window.location.href = '/tasks'
        break
      default:
        break
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const toggleAssistant = () => {
    setIsOpen(!isOpen)
    setHasNewMessage(false)
  }

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized)
  }

  return (
    <div className={cn('fixed bottom-4 right-4 z-50', className)}>
      {/* Minimized State */}
      {!isOpen && (
        <Button
          onClick={toggleAssistant}
          className="w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-primary-600 hover:bg-primary-700"
        >
          <MessageCircle className="w-6 h-6 text-white" />
          {hasNewMessage && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          )}
        </Button>
      )}

      {/* Expanded State */}
      {isOpen && (
        <Card className="w-80 h-96 flex flex-col shadow-xl border-0">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-t-lg">
            <div className="flex items-center space-x-2">
              <Bot className="w-5 h-5" />
              <span className="font-semibold">AI Assistant</span>
            </div>
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMinimize}
                className="text-white hover:bg-white/20 p-1"
              >
                {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleAssistant}
                className="text-white hover:bg-white/20 p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          {!isMinimized && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex',
                      message.type === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[80%] rounded-lg px-3 py-2 text-sm',
                        message.type === 'user'
                          ? 'bg-primary-600 text-white'
                          : message.type === 'suggestion'
                          ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                          : 'bg-gray-100 text-gray-900'
                      )}
                    >
                      <p>{message.content}</p>
                      
                      {message.actions && message.actions.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {message.actions.map((action, index) => (
                            <Button
                              key={index}
                              variant="outline"
                              size="sm"
                              onClick={action.onClick}
                              className="w-full text-xs"
                            >
                              {action.label}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600"></div>
                        <span>Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me anything..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={isLoading}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isLoading}
                    size="sm"
                    className="px-3"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  )
}
