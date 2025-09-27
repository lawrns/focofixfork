'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Sparkles,
  Lightbulb,
  Plus,
  CheckCircle,
  XCircle,
  RefreshCw,
  Copy,
  Edit,
  Target,
  Clock,
  AlertTriangle,
  Zap
} from 'lucide-react'
import { AIService, MilestoneSuggestion, TaskSuggestion } from '@/lib/services/ai'
import { cn } from '@/lib/utils'

interface AISuggestionsPanelProps {
  context: 'project' | 'milestone' | 'task'
  projectData?: any
  milestoneData?: any
  taskData?: any
  onApplySuggestion?: (suggestion: any, type: string) => void
  className?: string
}

export default function AISuggestionsPanel({
  context,
  projectData,
  milestoneData,
  taskData,
  onApplySuggestion,
  className
}: AISuggestionsPanelProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<{
    milestones?: MilestoneSuggestion[]
    tasks?: TaskSuggestion[]
    priority?: any
    deadline?: any
    content?: string
  }>({})
  const [activeTab, setActiveTab] = useState('milestones')
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkAIHealth()
  }, [])

  const checkAIHealth = async () => {
    try {
      const health = await AIService.checkHealth()
      setAiAvailable(health.available)
    } catch (error) {
      setAiAvailable(false)
    }
  }

  const generateMilestoneSuggestions = async () => {
    if (!projectData?.description) {
      setError('Project description is required for milestone suggestions')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const milestoneSuggestions = await AIService.suggestMilestones(
        projectData.description,
        projectData.existing_milestones || []
      )

      setSuggestions(prev => ({
        ...prev,
        milestones: milestoneSuggestions
      }))
    } catch (error) {
      setError('Failed to generate milestone suggestions')
      console.error('Milestone suggestion error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateTaskSuggestions = async () => {
    if (!milestoneData?.name) {
      setError('Milestone data is required for task suggestions')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const taskSuggestions = await AIService.suggestTasks(
        milestoneData.name,
        milestoneData.description || '',
        projectData?.name
      )

      setSuggestions(prev => ({
        ...prev,
        tasks: taskSuggestions
      }))
    } catch (error) {
      setError('Failed to generate task suggestions')
      console.error('Task suggestion error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generatePrioritySuggestion = async () => {
    const itemData = context === 'milestone' ? milestoneData : taskData
    if (!itemData) {
      setError('Item data is required for priority suggestion')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const prioritySuggestion = await AIService.suggestPriority(itemData, projectData)

      setSuggestions(prev => ({
        ...prev,
        priority: prioritySuggestion
      }))
    } catch (error) {
      setError('Failed to generate priority suggestion')
      console.error('Priority suggestion error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateDeadlineSuggestion = async () => {
    const itemData = context === 'milestone' ? milestoneData : taskData
    if (!itemData) {
      setError('Item data is required for deadline suggestion')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const deadlineSuggestion = await AIService.suggestDeadline(itemData, projectData)

      setSuggestions(prev => ({
        ...prev,
        deadline: deadlineSuggestion
      }))
    } catch (error) {
      setError('Failed to generate deadline suggestion')
      console.error('Deadline suggestion error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateContentSuggestion = async (contentType: string) => {
    const contextData = {
      project_name: projectData?.name,
      milestone_name: milestoneData?.name,
      task_name: taskData?.name,
      existing_content: context === 'milestone' ? milestoneData?.description :
                       context === 'task' ? taskData?.description :
                       projectData?.description
    }

    setIsLoading(true)
    setError(null)

    try {
      const contentSuggestion = await AIService.generateContent({
        type: contentType as any,
        context: contextData,
        tone: 'professional'
      })

      setSuggestions(prev => ({
        ...prev,
        content: contentSuggestion
      }))
    } catch (error) {
      setError('Failed to generate content suggestion')
      console.error('Content suggestion error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleApplySuggestion = (suggestion: any, type: string) => {
    onApplySuggestion?.(suggestion, type)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300'
      case 'medium': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300'
    }
  }

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600'
    if (score >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (aiAvailable === false) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <XCircle className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">AI Service Unavailable</h3>
          <p className="text-muted-foreground text-center mb-4">
            AI suggestions are not available at the moment. Please ensure Ollama is running locally.
          </p>
          <Button variant="outline" onClick={checkAIHealth}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Check Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Suggestions
            {aiAvailable && (
              <Badge variant="secondary" className="text-xs">
                <Zap className="w-3 h-3 mr-1" />
                AI Active
              </Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent>
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            {context === 'project' && (
              <TabsTrigger value="milestones" className="text-xs">
                Milestones
              </TabsTrigger>
            )}
            {context === 'milestone' && (
              <TabsTrigger value="tasks" className="text-xs">
                Tasks
              </TabsTrigger>
            )}
            {(context === 'milestone' || context === 'task') && (
              <>
                <TabsTrigger value="priority" className="text-xs">
                  Priority
                </TabsTrigger>
                <TabsTrigger value="deadline" className="text-xs">
                  Deadline
                </TabsTrigger>
              </>
            )}
            <TabsTrigger value="content" className="text-xs">
              Content
            </TabsTrigger>
          </TabsList>

          {/* Milestones Tab */}
          {context === 'project' && (
            <TabsContent value="milestones" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  AI-generated milestone suggestions for your project
                </p>
                <Button
                  onClick={generateMilestoneSuggestions}
                  disabled={isLoading}
                  size="sm"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Lightbulb className="w-4 h-4 mr-2" />
                  )}
                  Generate
                </Button>
              </div>

              <AnimatePresence>
                {suggestions.milestones?.map((milestone, index) => (
                  <motion.div
                    key={milestone.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.1 }}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{milestone.name}</h4>
                          <Badge className={getPriorityColor(milestone.priority)}>
                            {milestone.priority}
                          </Badge>
                          <Badge variant="outline" className={getConfidenceColor(milestone.confidence_score)}>
                            {(milestone.confidence_score * 100).toFixed(0)}% confident
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {milestone.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {milestone.estimated_duration} days
                          </span>
                          {milestone.dependencies && milestone.dependencies.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Target className="w-3 h-3" />
                              Depends on: {milestone.dependencies.join(', ')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 italic">
                          {milestone.rationale}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApplySuggestion(milestone, 'milestone')}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Milestone
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigator.clipboard.writeText(JSON.stringify(milestone, null, 2))}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </TabsContent>
          )}

          {/* Tasks Tab */}
          {context === 'milestone' && (
            <TabsContent value="tasks" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  AI-generated task suggestions for this milestone
                </p>
                <Button
                  onClick={generateTaskSuggestions}
                  disabled={isLoading}
                  size="sm"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Generate
                </Button>
              </div>

              <AnimatePresence>
                {suggestions.tasks?.map((task, index) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.1 }}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{task.name}</h4>
                        <Badge variant="outline">
                          {task.estimated_duration}h
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {task.description}
                      </p>
                      {task.assignee_suggestion && (
                        <p className="text-xs text-muted-foreground mb-2">
                          Suggested assignee: {task.assignee_suggestion}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground italic">
                        {task.rationale}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApplySuggestion(task, 'task')}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Task
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigator.clipboard.writeText(JSON.stringify(task, null, 2))}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </TabsContent>
          )}

          {/* Priority Tab */}
          {(context === 'milestone' || context === 'task') && (
            <TabsContent value="priority" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  AI-suggested priority level
                </p>
                <Button
                  onClick={generatePrioritySuggestion}
                  disabled={isLoading}
                  size="sm"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Target className="w-4 h-4 mr-2" />
                  )}
                  Generate
                </Button>
              </div>

              <AnimatePresence>
                {suggestions.priority && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="border rounded-lg p-4"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <Badge className={getPriorityColor(suggestions.priority.priority)}>
                        {suggestions.priority.priority}
                      </Badge>
                      <Badge variant="outline" className={getConfidenceColor(suggestions.priority.confidence)}>
                        {(suggestions.priority.confidence * 100).toFixed(0)}% confidence
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {suggestions.priority.rationale}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => handleApplySuggestion(suggestions.priority, 'priority')}
                    >
                      Apply Priority
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>
          )}

          {/* Deadline Tab */}
          {(context === 'milestone' || context === 'task') && (
            <TabsContent value="deadline" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  AI-suggested deadline
                </p>
                <Button
                  onClick={generateDeadlineSuggestion}
                  disabled={isLoading}
                  size="sm"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Clock className="w-4 h-4 mr-2" />
                  )}
                  Generate
                </Button>
              </div>

              <AnimatePresence>
                {suggestions.deadline && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="border rounded-lg p-4"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <Badge variant="outline">
                        {new Date(suggestions.deadline.suggested_date).toLocaleDateString()}
                      </Badge>
                      <Badge variant="outline" className={getConfidenceColor(suggestions.deadline.confidence)}>
                        {(suggestions.deadline.confidence * 100).toFixed(0)}% confidence
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {suggestions.deadline.rationale}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => handleApplySuggestion(suggestions.deadline, 'deadline')}
                    >
                      Apply Deadline
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>
          )}

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                AI-generated content suggestions
              </p>
              <Button
                onClick={() => generateContentSuggestion(`${context}_description`)}
                disabled={isLoading}
                size="sm"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Edit className="w-4 h-4 mr-2" />
                )}
                Generate
              </Button>
            </div>

            <AnimatePresence>
              {suggestions.content && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="border rounded-lg p-4"
                >
                  <Textarea
                    value={suggestions.content}
                    readOnly
                    className="min-h-[100px] mb-3"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApplySuggestion(suggestions.content, 'content')}
                    >
                      Apply Content
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => suggestions.content && navigator.clipboard.writeText(suggestions.content)}
                      disabled={!suggestions.content}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
