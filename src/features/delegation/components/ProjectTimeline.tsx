'use client'

import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { TimelineItem } from '../delegationService'
import { GitBranch, CheckCircle2, Clock, XCircle, Loader2, FileText, Bot } from 'lucide-react'

interface ProjectTimelineProps {
  projectId: string
  limit?: number
}

const statusIcons: Record<string, React.ElementType> = {
  completed: CheckCircle2, failed: XCircle, pending: Clock, running: Loader2, cancelled: XCircle
}

export function ProjectTimeline({ projectId, limit = 20 }: ProjectTimelineProps) {
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/delegation/timeline?projectId=${projectId}&limit=${limit}`)
      .then(r => r.json())
      .then(data => {
        setTimeline(data.data || [])
        setIsLoading(false)
      })
  }, [projectId, limit])

  if (isLoading) return <Card><CardContent className="p-8"><Skeleton className="h-32" /></CardContent></Card>

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="w-5 h-5" /> Activity Timeline
          <Badge variant="secondary">{timeline.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {timeline.length === 0 ? (
          <p className="text-center text-zinc-500 py-8">No activity yet</p>
        ) : (
          <div className="space-y-4">
            {timeline.map(item => (
              <div key={item.id} className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center">
                  {item.type === 'run' ? <Bot className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-zinc-500">{formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ProjectTimeline
