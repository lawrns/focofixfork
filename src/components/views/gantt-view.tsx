'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Calendar, Settings, Link, Unlink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import CriticalPathAnalysis from '@/components/analysis/critical-path-analysis'

interface Milestone {
  id: string
  name: string
  start_date: string
  due_date: string
  status: 'planning' | 'active' | 'completed' | 'cancelled'
  progress_percentage?: number
  dependencies?: string[]
}

interface Task {
  id: string
  milestone_id: string
  name: string
  start_date?: string
  due_date?: string
  status: 'todo' | 'in_progress' | 'completed'
  assignee_id?: string
}

interface Project {
  id: string
  name: string
  milestones: Milestone[]
  tasks: Task[]
}

interface GanttViewProps {
  project: Project
  className?: string
}

interface GanttItem {
  id: string
  name: string
  start: Date
  end: Date
  status: string
  progress?: number
  type: 'milestone' | 'task'
  dependencies?: string[]
  level: number // indentation level
}

const GanttView: React.FC<GanttViewProps> = ({ project, className }) => {
  const [zoom, setZoom] = useState<'day' | 'week' | 'month'>('week')
  const [startDate, setStartDate] = useState<Date>(new Date())
  const [endDate, setEndDate] = useState<Date>(new Date())
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [showDependencyModal, setShowDependencyModal] = useState(false)
  const [selectedDependency, setSelectedDependency] = useState<{from: string, to: string} | null>(null)
  const [dependencyMode, setDependencyMode] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Calculate date range based on project data
  useEffect(() => {
    if (!project.milestones.length) return

    const allDates = project.milestones.flatMap(m => [
      new Date(m.start_date),
      new Date(m.due_date)
    ]).concat(
      project.tasks
        .filter(t => t.start_date && t.due_date)
        .flatMap(t => [new Date(t.start_date!), new Date(t.due_date!)])
    )

    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())))
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())))

    // Add some padding
    minDate.setDate(minDate.getDate() - 7)
    maxDate.setDate(maxDate.getDate() + 7)

    setStartDate(minDate)
    setEndDate(maxDate)
  }, [project])

  // Prepare Gantt data
  const ganttData = useMemo((): GanttItem[] => {
    const items: GanttItem[] = []

    // Add milestones
    project.milestones.forEach(milestone => {
      items.push({
        id: milestone.id,
        name: milestone.name,
        start: new Date(milestone.start_date),
        end: new Date(milestone.due_date),
        status: milestone.status,
        progress: milestone.progress_percentage,
        type: 'milestone',
        dependencies: milestone.dependencies,
        level: 0
      })

      // Add tasks under this milestone
      project.tasks
        .filter(task => task.milestone_id === milestone.id)
        .forEach(task => {
          if (task.start_date && task.due_date) {
            items.push({
              id: task.id,
              name: task.name,
              start: new Date(task.start_date),
              end: new Date(task.due_date),
              status: task.status,
              type: 'task',
              level: 1
            })
          }
        })
    })

    return items.sort((a, b) => a.start.getTime() - b.start.getTime())
  }, [project])

  // Memoize tasks for CriticalPathAnalysis to prevent infinite re-renders
  const criticalPathTasks = useMemo(() => {
    return ganttData.map(item => ({
      id: item.id,
      name: item.name,
      duration: Math.max(1, Math.ceil((item.end.getTime() - item.start.getTime()) / (1000 * 60 * 60 * 24))),
      dependencies: item.dependencies || []
    }))
  }, [ganttData])

  // Generate timeline columns
  const timelineColumns = useMemo(() => {
    const columns = []
    const current = new Date(startDate)
    const end = new Date(endDate)

    while (current <= end) {
      const columnDate = new Date(current)
      let label = ''

      switch (zoom) {
        case 'day':
          label = columnDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          current.setDate(current.getDate() + 1)
          break
        case 'week':
          const weekStart = new Date(columnDate)
          weekStart.setDate(columnDate.getDate() - columnDate.getDay())
          const weekEnd = new Date(weekStart)
          weekEnd.setDate(weekStart.getDate() + 6)
          label = `${weekStart.getMonth() + 1}/${weekStart.getDate()} - ${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`
          current.setDate(current.getDate() + 7)
          break
        case 'month':
          label = columnDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
          current.setMonth(current.getMonth() + 1)
          break
      }

      columns.push({
        date: columnDate,
        label
      })
    }

    return columns
  }, [startDate, endDate, zoom])

  // Calculate item position and width
  const getItemPosition = (item: GanttItem) => {
    const totalDuration = endDate.getTime() - startDate.getTime()
    const itemStart = item.start.getTime() - startDate.getTime()
    const itemDuration = item.end.getTime() - item.start.getTime()

    const left = (itemStart / totalDuration) * 100
    const width = Math.max((itemDuration / totalDuration) * 100, 1) // Minimum 1% width

    return { left: `${left}%`, width: `${width}%` }
  }

  // Get status color
  const getStatusColor = (status: string, type: 'milestone' | 'task') => {
    const baseColors = {
      planning: 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/40 dark:border-blue-500 dark:text-blue-300',
      active: 'bg-green-100 border-green-300 text-green-800 dark:bg-green-900/40 dark:border-green-500 dark:text-green-300',
      completed: 'bg-gray-100 border-gray-300 text-gray-800 dark:bg-gray-700/40 dark:border-gray-500 dark:text-gray-300',
      cancelled: 'bg-red-100 border-red-300 text-red-800 dark:bg-red-900/40 dark:border-red-500 dark:text-red-300',
      todo: 'bg-gray-100 border-gray-300 text-gray-600 dark:bg-gray-700/40 dark:border-gray-500 dark:text-gray-400',
      in_progress: 'bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900/40 dark:border-yellow-500 dark:text-yellow-300'
    }

    return baseColors[status as keyof typeof baseColors] || baseColors.completed
  }

  const handleZoomIn = () => {
    if (zoom === 'month') setZoom('week')
    else if (zoom === 'week') setZoom('day')
  }

  const handleZoomOut = () => {
    if (zoom === 'day') setZoom('week')
    else if (zoom === 'week') setZoom('month')
  }

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 200
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  // Dependency management functions
  const handleCreateDependency = (fromId: string, toId: string) => {
    // TODO: Implement dependency creation in project data
    console.log(`Create dependency: ${fromId} → ${toId}`)
    setDependencyMode(false)
  }

  const handleDeleteDependency = (fromId: string, toId: string) => {
    // TODO: Implement dependency deletion in project data
    console.log(`Delete dependency: ${fromId} → ${toId}`)
    setSelectedDependency(null)
    setShowDependencyModal(false)
  }

  const handleItemClick = (itemId: string) => {
    if (dependencyMode && selectedItem && selectedItem !== itemId) {
      // Create dependency between selected items
      handleCreateDependency(selectedItem, itemId)
      setSelectedItem(null)
    } else {
      setSelectedItem(itemId)
    }
  }

  return (
    <Card className={cn('h-full flex flex-col', className)}>
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Gantt Chart</span>
          </CardTitle>

          <div className="flex items-center space-x-2">
            {/* Zoom Controls */}
            <div className="flex items-center border rounded-lg">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoom === 'month'}
                className="rounded-r-none"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="px-3 py-1 text-sm font-medium min-w-[60px] text-center">
                {zoom.charAt(0).toUpperCase() + zoom.slice(1)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoom === 'day'}
                className="rounded-l-none"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>

            {/* Scroll Controls */}
            <Button variant="outline" size="sm" onClick={() => handleScroll('left')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleScroll('right')}>
              <ChevronRight className="h-4 w-4" />
            </Button>

            {/* Dependency Management */}
            <Button
              variant={dependencyMode ? "default" : "outline"}
              size="sm"
              onClick={() => setDependencyMode(!dependencyMode)}
              className={dependencyMode ? "bg-blue-600 hover:bg-blue-700" : ""}
              title="Toggle dependency creation mode"
            >
              <Link className="h-4 w-4" />
            </Button>

            {/* Settings */}
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden">
        <Tabs defaultValue="gantt" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="gantt">Gantt Chart</TabsTrigger>
            <TabsTrigger value="analysis">Critical Path Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="gantt" className="flex-1 overflow-hidden mt-4">
            {/* Dependency Mode Indicator */}
            <AnimatePresence>
              {dependencyMode && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
                >
                  <div className="flex items-center space-x-2">
                    <Link className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Dependency Mode Active
                    </span>
                    <span className="text-xs text-blue-700 dark:text-blue-300">
                      Click on two items to create a dependency
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="h-full flex flex-col">
          {/* Timeline Header */}
          <div className="flex-shrink-0 border-b">
            <div className="flex">
              {/* Task List Header */}
              <div className="w-80 flex-shrink-0 border-r bg-muted/20 p-4">
                <h3 className="font-medium text-sm">Tasks & Milestones</h3>
              </div>

              {/* Timeline Header */}
              <div className="flex-1 overflow-hidden">
                <div
                  ref={scrollRef}
                  className="flex overflow-x-auto"
                  style={{ scrollbarWidth: 'thin' }}
                >
                  {timelineColumns.map((column, index) => (
                    <div
                      key={index}
                      className="flex-shrink-0 w-32 border-r border-border/50 text-center py-2 px-1"
                    >
                      <span className="text-xs font-medium text-muted-foreground">
                        {column.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Gantt Chart Body */}
          <div className="flex-1 overflow-hidden">
            <div className="flex h-full">
              {/* Task List */}
              <div className="w-80 flex-shrink-0 border-r bg-muted/10 overflow-y-auto">
                <div className="divide-y divide-border/50">
                  {ganttData.map((item) => (
                    <motion.div
                      key={item.id}
                      className={cn(
                        'p-3 cursor-pointer hover:bg-muted/50 transition-colors',
                        selectedItem === item.id && 'bg-muted'
                      )}
                      style={{ paddingLeft: `${16 + item.level * 20}px` }}
                      onClick={() => handleItemClick(item.id)}
                      whileHover={{ scale: 1.01 }}
                      transition={{ duration: 0.1 }}
                    >
                      <div className="flex items-center space-x-2">
                        <div className={cn(
                          'w-3 h-3 rounded-full flex-shrink-0',
                          item.type === 'milestone' ? 'bg-blue-500' : 'bg-green-500'
                        )} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge
                              variant="secondary"
                              className={cn('text-xs', getStatusColor(item.status, item.type))}
                            >
                              {item.status}
                            </Badge>
                            {item.progress !== undefined && (
                              <span className="text-xs text-muted-foreground">
                                {item.progress}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Timeline Grid */}
              <div className="flex-1 overflow-hidden">
                <div className="relative h-full">
                  {/* Background Grid */}
                  <div className="absolute inset-0">
                    <div
                      className="flex h-full"
                      ref={scrollRef}
                      style={{ scrollbarWidth: 'thin' }}
                    >
                      {timelineColumns.map((_, index) => (
                        <div
                          key={index}
                          className="flex-shrink-0 w-32 border-r border-border/20"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Gantt Bars */}
                  <div className="relative z-10 h-full overflow-y-auto">
                    {ganttData.map((item, index) => {
                      const position = getItemPosition(item)

                      return (
                        <motion.div
                          key={item.id}
                          className={cn(
                            'absolute rounded-sm border-2 cursor-pointer transition-all duration-200',
                            'hover:shadow-md hover:z-20',
                            selectedItem === item.id && 'ring-2 ring-primary ring-offset-2 z-20',
                            getStatusColor(item.status, item.type)
                          )}
                          style={{
                            left: position.left,
                            width: position.width,
                            top: `${index * 48 + 12}px`,
                            height: '32px'
                          }}
                          onClick={() => handleItemClick(item.id)}
                          whileHover={{ y: -2 }}
                          transition={{ duration: 0.1 }}
                        >
                          {/* Progress Indicator */}
                          {item.progress !== undefined && item.progress > 0 && (
                            <div
                              className="h-full bg-current opacity-30 rounded-sm"
                              style={{ width: `${item.progress}%` }}
                            />
                          )}

                          {/* Item Label */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-medium text-current truncate px-2">
                              {item.name}
                            </span>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>

                  {/* Dependency Lines */}
                  <svg className="absolute inset-0 pointer-events-none z-5">
                    {ganttData
                      .filter(item => item.dependencies?.length)
                      .map(item => {
                        const itemIndex = ganttData.findIndex(i => i.id === item.id)
                        if (itemIndex === -1) return null

                        return item.dependencies?.map(depId => {
                          const depIndex = ganttData.findIndex(i => i.id === depId)
                          if (depIndex === -1) return null

                          // Calculate positions relative to the timeline
                          const itemPos = getItemPosition(item)
                          const depItem = ganttData.find(i => i.id === depId)
                          if (!depItem) return null
                          const depPos = getItemPosition(depItem)

                          const itemY = itemIndex * 48 + 28
                          const depY = depIndex * 48 + 28

                          // Calculate actual pixel positions for the dependency line
                          const timelineWidth = scrollRef.current?.clientWidth || 0
                          const itemX = parseFloat(itemPos.left) / 100 * timelineWidth
                          const depX = (parseFloat(depPos.left) + parseFloat(depPos.width)) / 100 * timelineWidth

                          // Create curved dependency line
                          const midX = (itemX + depX) / 2
                          const controlOffset = Math.abs(itemY - depY) * 0.3

                          const pathData = itemY > depY
                            ? `M ${depX} ${depY} Q ${midX - controlOffset} ${(itemY + depY) / 2} ${itemX} ${itemY}`
                            : `M ${depX} ${depY} Q ${midX + controlOffset} ${(itemY + depY) / 2} ${itemX} ${itemY}`

                          return (
                            <g key={`${item.id}-${depId}`}>
                              {/* Dependency line */}
                              <path
                                d={pathData}
                                stroke="currentColor"
                                strokeWidth="2"
                                fill="none"
                                opacity="0.6"
                                markerEnd="url(#arrowhead)"
                                className="drop-shadow-sm"
                              />

                              {/* Invisible wider path for better hover detection */}
                              <path
                                d={pathData}
                                stroke="transparent"
                                strokeWidth="8"
                                fill="none"
                                className="cursor-pointer hover:stroke-blue-300 hover:opacity-30"
                                style={{ pointerEvents: 'stroke' }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedDependency({ from: depId, to: item.id })
                                  setShowDependencyModal(true)
                                }}
                              />
                            </g>
                          )
                        })
                      })}
                    <defs>
                      <marker
                        id="arrowhead"
                        markerWidth="12"
                        markerHeight="9"
                        refX="11"
                        refY="4.5"
                        orient="auto"
                      >
                        <polygon
                          points="0 0, 12 4.5, 0 9"
                          fill="currentColor"
                          opacity="0.6"
                        />
                      </marker>
                    </defs>
                  </svg>
                </div>
              </div>
            </div>
          </div>
            </div>
          </TabsContent>

          <TabsContent value="analysis" className="flex-1 overflow-hidden mt-4">
            <CriticalPathAnalysis
              tasks={criticalPathTasks}
            />
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Dependency Management Modal */}
      <Dialog open={showDependencyModal} onOpenChange={setShowDependencyModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Manage Dependency</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {selectedDependency && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">
                    {ganttData.find(item => item.id === selectedDependency.from)?.name || 'Unknown'}
                  </Badge>
                  <span className="text-sm text-muted-foreground">→</span>
                  <Badge variant="outline">
                    {ganttData.find(item => item.id === selectedDependency.to)?.name || 'Unknown'}
                  </Badge>
                </div>

                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteDependency(selectedDependency.from, selectedDependency.to)}
                    className="flex items-center space-x-2 text-destructive hover:text-destructive"
                  >
                    <Unlink className="h-4 w-4" />
                    <span>Remove Dependency</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export default GanttView