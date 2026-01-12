'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Lightbulb,
  Sparkles,
  Code,
  Target,
  FileText,
  CheckCircle,
  X,
  RefreshCw,
  AlertCircle,
  MessageSquare,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { aiService, AISuggestion } from '@/lib/services/ai'
import { cn } from '@/lib/utils'

interface SuggestionPanelProps {
  projectId?: string
  milestoneId?: string
  taskId?: string
  context?: string
  onAcceptSuggestion?: (suggestion: AISuggestion) => void
  onDismissSuggestion?: (suggestionId: string) => void
  className?: string
}

const SuggestionPanel: React.FC<SuggestionPanelProps> = ({
  projectId,
  milestoneId,
  taskId,
  context,
  onAcceptSuggestion,
  onDismissSuggestion,
  className
}) => {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking')
  const [generatingType, setGeneratingType] = useState<string | null>(null)

  // Check Ollama connection on mount
  useEffect(() => {
    checkOllamaStatus()
  }, [])

  const checkOllamaStatus = async () => {
    try {
      const status = await aiService.testConnection()
      setOllamaStatus(status.success ? 'connected' : 'disconnected')
      if (!status.success) {
        setError('Ollama server is not available. Please start Ollama and try again.')
      }
    } catch (error) {
      setOllamaStatus('disconnected')
      setError('Failed to connect to Ollama server')
    }
  }

  const getSuggestionIcon = (type: AISuggestion['type']) => {
    switch (type) {
      case 'task':
        return CheckCircle
      case 'milestone':
        return Target
      case 'code':
        return Code
      case 'analysis':
        return Lightbulb
      default:
        return MessageSquare
    }
  }

  const getSuggestionColor = (type: AISuggestion['type']) => {
    switch (type) {
      case 'task':
        return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/40'
      case 'milestone':
        return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/40'
      case 'code':
        return 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/40'
      case 'analysis':
        return 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/40'
      default:
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/40'
    }
  }

  const generateTaskSuggestions = async () => {
    if (!projectId) return

    setLoading(true)
    setError(null)
    setGeneratingType('tasks')

    try {
      const newSuggestions = await aiService.suggestTasks(projectId, context)
      setSuggestions(prev => [...newSuggestions, ...prev])
    } catch (error: any) {
      setError('Failed to generate task suggestions')
      console.error('Task suggestion error:', error)
    } finally {
      setLoading(false)
      setGeneratingType(null)
    }
  }

  const generateMilestoneSuggestions = async () => {
    if (!projectId) return

    setLoading(true)
    setError(null)
    setGeneratingType('milestones')

    try {
      // Get existing tasks for context
      const { data: tasks } = await fetch(`/api/tasks?project_id=${projectId}`).then(r => r.json())

      const newSuggestions = await aiService.suggestMilestones(projectId, tasks?.data || [])
      setSuggestions(prev => [...newSuggestions, ...prev])
    } catch (error: any) {
      setError('Failed to generate milestone suggestions')
      console.error('Milestone suggestion error:', error)
    } finally {
      setLoading(false)
      setGeneratingType(null)
    }
  }

  const generateCodeSuggestions = async () => {
    if (!taskId) return

    setLoading(true)
    setError(null)
    setGeneratingType('code')

    try {
      // Get task details
      const { data: task } = await fetch(`/api/tasks/${taskId}`).then(r => r.json())

      if (task?.data) {
        // Code suggestions not implemented in OpenAI service yet
        setError('Code suggestions not yet available')
      }
    } catch (error: any) {
      setError('Failed to generate code suggestions')
      console.error('Code suggestion error:', error)
    } finally {
      setLoading(false)
      setGeneratingType(null)
    }
  }

  const generateAnalysis = async () => {
    if (!projectId) return

    setLoading(true)
    setError(null)
    setGeneratingType('analysis')

    try {
      // Get project data
      const [{ data: project }, { data: tasksData }, { data: milestonesData }] = await Promise.all([
        fetch(`/api/projects/${projectId}`).then(r => r.json()),
        fetch(`/api/tasks?project_id=${projectId}`).then(r => r.json()),
        fetch(`/api/milestones?project_id=${projectId}`).then(r => r.json())
      ])

      if (project?.data) {
        const analysisText = await aiService.analyzeProject(project.data)
        const analysis: AISuggestion = {
          id: `analysis-${Date.now()}`,
          type: 'analysis',
          title: 'Project Analysis',
          content: analysisText,
          confidence: 0.9,
          created_at: new Date().toISOString()
        }
        setSuggestions(prev => [analysis, ...prev])
      }
    } catch (error: any) {
      setError('Failed to generate project analysis')
      console.error('Analysis error:', error)
    } finally {
      setLoading(false)
      setGeneratingType(null)
    }
  }

  const handleAcceptSuggestion = (suggestion: AISuggestion) => {
    onAcceptSuggestion?.(suggestion)
    // Remove from suggestions after accepting
    setSuggestions(prev => prev.filter(s => s.id !== suggestion.id))
  }

  const handleDismissSuggestion = (suggestionId: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId))
    onDismissSuggestion?.(suggestionId)
  }

  const clearAllSuggestions = () => {
    setSuggestions([])
  }

  if (ollamaStatus === 'checking') {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span className="text-sm text-muted-foreground">Checking AI service...</span>
        </CardContent>
      </Card>
    )
  }

  if (ollamaStatus === 'disconnected') {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              AI suggestions are not available. Please start Ollama server to enable AI features.
              <Button
                variant="outline"
                size="sm"
                className="ml-2"
                onClick={checkOllamaStatus}
              >
                Retry Connection
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Suggestions
            <Badge variant="secondary" className="text-xs">
              {suggestions.length}
            </Badge>
          </CardTitle>

          <div className="flex items-center gap-2">
            {suggestions.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllSuggestions}
                className="text-xs"
              >
                Clear All
              </Button>
            )}

            <div className="flex gap-1">
              {projectId && !taskId && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateTaskSuggestions}
                    disabled={loading}
                    className="text-xs"
                  >
                    {generatingType === 'tasks' ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <CheckCircle className="h-3 w-3" />
                    )}
                    Tasks
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateMilestoneSuggestions}
                    disabled={loading}
                    className="text-xs"
                  >
                    {generatingType === 'milestones' ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <Target className="h-3 w-3" />
                    )}
                    Milestones
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateAnalysis}
                    disabled={loading}
                    className="text-xs"
                  >
                    {generatingType === 'analysis' ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <Lightbulb className="h-3 w-3" />
                    )}
                    Analyze
                  </Button>
                </>
              )}

              {taskId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateCodeSuggestions}
                  disabled={loading}
                  className="text-xs"
                >
                  {generatingType === 'code' ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    <Code className="h-3 w-3" />
                  )}
                  Code Help
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <ScrollArea className="h-96">
          <AnimatePresence>
            {suggestions.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 text-muted-foreground"
              >
                <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm mb-2">No AI suggestions yet</p>
                <p className="text-xs">Click a button above to generate suggestions</p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {suggestions.map((suggestion, index) => {
                  const IconComponent = getSuggestionIcon(suggestion.type)

                  return (
                    <motion.div
                      key={suggestion.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.1 }}
                      className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            'p-1.5 rounded-full',
                            getSuggestionColor(suggestion.type)
                          )}>
                            <IconComponent className="h-3 w-3" />
                          </div>
                          <div>
                            <h4 className="text-sm font-medium">{suggestion.title}</h4>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{suggestion.type}</span>
                              <span>•</span>
                              <span>{Math.round(suggestion.confidence * 100)}% confidence</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAcceptSuggestion(suggestion)}
                            className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <CheckCircle className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDismissSuggestion(suggestion.id)}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-red-600"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {suggestion.content}
                      </p>

                      {suggestion.metadata && Object.keys(suggestion.metadata).length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {Object.entries(suggestion.metadata).map(([key, value]) => (
                            <Badge key={key} variant="outline" className="text-xs">
                              {key}: {String(value)}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            )}
          </AnimatePresence>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

export default SuggestionPanel
