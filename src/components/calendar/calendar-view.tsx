'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Settings, Filter, Download, Upload, RefreshCw as Sync, Clock, Users, MapPin, Bell } from 'lucide-react'
import { CalendarEvent, CalendarView as CalendarViewType, CalendarFilter } from '@/lib/models/calendar'
import { CalendarService } from '@/lib/services/calendar-service'
import { useAuth } from '@/lib/hooks/use-auth'
import { useToast } from '@/components/ui/toast'
import { useTranslation } from '@/lib/i18n/context'
import { cn } from '@/lib/utils'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, isSameDay, isSameMonth, isToday, getDay, getDaysInMonth } from 'date-fns'

interface CalendarViewProps {
  className?: string
}

export function CalendarView({ className }: CalendarViewProps) {
  const { user } = useAuth()
  const { t } = useTranslation()
  const { addToast } = useToast()

  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewType, setViewType] = useState<CalendarViewType['type']>('month')
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<CalendarFilter>({})

  const viewConfig: CalendarViewType = {
    type: viewType,
    date: currentDate,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    showWeekends: true,
    workingHours: {
      start: '09:00',
      end: '17:00',
      days: [1, 2, 3, 4, 5] // Monday to Friday
    }
  }

  const loadEvents = useCallback(async () => {
    if (!user) return

    try {
      setIsLoading(true)
      const startDate = getViewStartDate(currentDate, viewType)
      const endDate = getViewEndDate(currentDate, viewType)
      
      const eventsData = await CalendarService.getEvents(user.id, startDate, endDate, filter)
      setEvents(eventsData)
    } catch (error: any) {
      console.error('Failed to load calendar events:', error)
      addToast({
        type: 'error',
        title: t('common.error'),
        description: error.message || t('calendar.loadError'),
      })
    } finally {
      setIsLoading(false)
    }
  }, [user, currentDate, viewType, filter, addToast, t])

  useEffect(() => {
    if (user) {
      loadEvents()
    }
  }, [user, loadEvents])

  const getViewStartDate = (date: Date, view: string): Date => {
    switch (view) {
      case 'month':
        return startOfMonth(date)
      case 'week':
        return startOfWeek(date, { weekStartsOn: 1 })
      case 'day':
        return date
      default:
        return startOfMonth(date)
    }
  }

  const getViewEndDate = (date: Date, view: string): Date => {
    switch (view) {
      case 'month':
        return endOfMonth(date)
      case 'week':
        return endOfWeek(date, { weekStartsOn: 1 })
      case 'day':
        return date
      default:
        return endOfMonth(date)
    }
  }

  const navigateDate = (direction: 'prev' | 'next') => {
    switch (viewType) {
      case 'month':
        setCurrentDate(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1))
        break
      case 'week':
        setCurrentDate(direction === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1))
        break
      case 'day':
        setCurrentDate(direction === 'next' ? addDays(currentDate, 1) : subDays(currentDate, 1))
        break
    }
  }

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    return events.filter(event => {
      const eventStart = new Date(event.start)
      const eventEnd = new Date(event.end)
      
      if (event.allDay) {
        return isSameDay(eventStart, date)
      } else {
        return (eventStart <= date && eventEnd >= date) || isSameDay(eventStart, date)
      }
    })
  }

  const getEventColor = (event: CalendarEvent): string => {
    if (event.source === 'external') {
      return 'bg-blue-100 text-blue-800 border-blue-200'
    }
    
    if (event.projectId) {
      return 'bg-green-100 text-green-800 border-green-200'
    }
    
    if (event.taskId) {
      return 'bg-purple-100 text-purple-800 border-purple-200'
    }
    
    if (event.milestoneId) {
      return 'bg-orange-100 text-orange-800 border-orange-200'
    }
    
    return 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const formatEventTime = (event: CalendarEvent): string => {
    if (event.allDay) {
      return t('calendar.allDay')
    }
    
    const start = new Date(event.start)
    const end = new Date(event.end)
    
    return `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`
  }

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 })
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })
    
    const days = []
    const day = startDate
    
    while (day <= endDate) {
      days.push(new Date(day))
      day.setDate(day.getDate() + 1)
    }
    
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    
    return (
      <div className="grid grid-cols-7 gap-1">
        {/* Week day headers */}
        {weekDays.map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
        
        {/* Calendar days */}
        {days.map(day => {
          const dayEvents = getEventsForDate(day)
          const isCurrentMonth = isSameMonth(day, currentDate)
          const isCurrentDay = isToday(day)
          
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-[100px] p-2 border border-border rounded-md",
                !isCurrentMonth && "bg-muted/50",
                isCurrentDay && "bg-primary/10 border-primary"
              )}
            >
              <div className={cn(
                "text-sm font-medium mb-1",
                !isCurrentMonth && "text-muted-foreground",
                isCurrentDay && "text-primary"
              )}>
                {format(day, 'd')}
              </div>
              
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map(event => (
                  <div
                    key={event.id}
                    className={cn(
                      "text-xs p-1 rounded border truncate cursor-pointer hover:opacity-80",
                      getEventColor(event)
                    )}
                    title={`${event.title} - ${formatEventTime(event)}`}
                  >
                    {event.title}
                  </div>
                ))}
                
                {dayEvents.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
    
    const days = []
    const day = weekStart
    
    while (day <= weekEnd) {
      days.push(new Date(day))
      day.setDate(day.getDate() + 1)
    }
    
    return (
      <div className="grid grid-cols-7 gap-4">
        {days.map(day => {
          const dayEvents = getEventsForDate(day)
          const isCurrentDay = isToday(day)
          
          return (
            <div key={day.toISOString()} className="space-y-2">
              <div className={cn(
                "text-center p-2 border-b",
                isCurrentDay && "bg-primary/10 text-primary font-semibold"
              )}>
                <div className="text-sm font-medium">
                  {format(day, 'EEE')}
                </div>
                <div className="text-lg">
                  {format(day, 'd')}
                </div>
              </div>
              
              <div className="space-y-1">
                {dayEvents.map(event => (
                  <div
                    key={event.id}
                    className={cn(
                      "text-xs p-2 rounded border cursor-pointer hover:opacity-80",
                      getEventColor(event)
                    )}
                  >
                    <div className="font-medium truncate">
                      {event.title}
                    </div>
                    <div className="text-muted-foreground">
                      {formatEventTime(event)}
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderDayView = () => {
    const dayEvents = getEventsForDate(currentDate)
    const isCurrentDay = isToday(currentDate)
    
    return (
      <div className="space-y-4">
        <div className={cn(
          "text-center p-4 border-b",
          isCurrentDay && "bg-primary/10 text-primary"
        )}>
          <div className="text-2xl font-bold">
            {format(currentDate, 'EEEE, MMMM d, yyyy')}
          </div>
          {isCurrentDay && (
            <div className="text-sm text-primary">
              {t('calendar.today')}
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          {dayEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('calendar.noEventsToday')}</p>
            </div>
          ) : (
            dayEvents.map(event => (
              <Card key={event.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{event.title}</h3>
                      <Badge variant="outline" className="text-xs">
                        {formatEventTime(event)}
                      </Badge>
                    </div>
                    
                    {event.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {event.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {event.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>{event.location}</span>
                        </div>
                      )}
                      
                      {event.attendees && event.attendees.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{event.attendees.length} attendees</span>
                        </div>
                      )}
                      
                      {event.reminders && event.reminders.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Bell className="h-3 w-3" />
                          <span>{event.reminders.length} reminders</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {event.source === 'foco' ? t('calendar.focoEvent') : t('calendar.externalEvent')}
                    </Badge>
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    )
  }

  const renderAgendaView = () => {
    const sortedEvents = [...events].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    
    return (
      <div className="space-y-4">
        {sortedEvents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t('calendar.noEvents')}</p>
          </div>
        ) : (
          sortedEvents.map(event => {
            const eventDate = new Date(event.start)
            const isCurrentDay = isToday(eventDate)
            
            return (
              <Card key={event.id} className="p-4">
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "text-center p-2 rounded border min-w-[80px]",
                    isCurrentDay && "bg-primary/10 border-primary"
                  )}>
                    <div className="text-xs font-medium">
                      {format(eventDate, 'MMM')}
                    </div>
                    <div className="text-lg font-bold">
                      {format(eventDate, 'd')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(eventDate, 'EEE')}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{event.title}</h3>
                      <Badge variant="outline" className="text-xs">
                        {formatEventTime(event)}
                      </Badge>
                    </div>
                    
                    {event.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {event.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {event.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>{event.location}</span>
                        </div>
                      )}
                      
                      {event.attendees && event.attendees.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{event.attendees.length} attendees</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {event.source === 'foco' ? t('calendar.focoEvent') : t('calendar.externalEvent')}
                    </Badge>
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </div>
    )
  }

  const renderView = () => {
    switch (viewType) {
      case 'month':
        return renderMonthView()
      case 'week':
        return renderWeekView()
      case 'day':
        return renderDayView()
      case 'agenda':
        return renderAgendaView()
      default:
        return renderMonthView()
    }
  }

  if (!user) {
    return (
      <div className={cn("p-6", className)}>
        <p>{t('auth.notAuthenticated')}</p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CalendarIcon className="h-8 w-8 text-primary" />
            {t('calendar.title')}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('calendar.description')}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Sync className="h-4 w-4" />
            {t('calendar.sync')}
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" />
            {t('calendar.export')}
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4" />
            {t('calendar.createEvent')}
          </Button>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateDate('prev')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                >
                  {t('calendar.today')}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateDate('next')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="text-lg font-semibold">
                {format(currentDate, viewType === 'month' ? 'MMMM yyyy' : viewType === 'week' ? 'MMM d, yyyy' : 'EEEE, MMMM d, yyyy')}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Select value={viewType} onValueChange={(value: any) => setViewType(value)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">{t('calendar.month')}</SelectItem>
                  <SelectItem value="week">{t('calendar.week')}</SelectItem>
                  <SelectItem value="day">{t('calendar.day')}</SelectItem>
                  <SelectItem value="agenda">{t('calendar.agenda')}</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4" />
                {t('calendar.filter')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Content */}
      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            renderView()
          )}
        </CardContent>
      </Card>
    </div>
  )
}
