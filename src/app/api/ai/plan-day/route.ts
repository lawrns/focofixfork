import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { context, preferences } = body

    // Fetch user's tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('work_items')
      .select('*')
      .eq('workspace_id', user.id)
      .in('status', ['todo', 'in_progress'])
      .order('priority', { ascending: false })
      .limit(50)

    if (tasksError) {
      throw tasksError
    }

    // Simple AI planning logic (can be replaced with OpenAI/Anthropic API)
    const planResult = generateDayPlan(tasks || [], context, preferences)

    return NextResponse.json({
      success: true,
      data: planResult,
    })
  } catch (error) {
    console.error('AI Plan Day error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate day plan' },
      { status: 500 }
    )
  }
}

function generateDayPlan(tasks: any[], context?: string, preferences?: any) {
  // Sort tasks by priority and due date
  const sortedTasks = [...tasks].sort((a, b) => {
    // Urgent tasks first
    if (a.priority === 'urgent' && b.priority !== 'urgent') return -1
    if (b.priority === 'urgent' && a.priority !== 'urgent') return 1

    // Then by due date
    if (a.due_date && b.due_date) {
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    }
    if (a.due_date) return -1
    if (b.due_date) return 1

    // Then by priority
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
    return (priorityOrder[a.priority as keyof typeof priorityOrder] || 4) - 
           (priorityOrder[b.priority as keyof typeof priorityOrder] || 4)
  })

  // Categorize into Now, Next, Later
  const now = sortedTasks.slice(0, 3) // Top 3 most important
  const next = sortedTasks.slice(3, 8) // Next 5
  const later = sortedTasks.slice(8) // Rest

  return {
    now: now.map(t => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      estimatedTime: t.estimated_time || '30m',
      reason: getTaskReason(t),
    })),
    next: next.map(t => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      estimatedTime: t.estimated_time || '30m',
    })),
    later: later.map(t => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
    })),
    insights: [
      `You have ${tasks.length} tasks to work on`,
      `${now.length} high-priority items need attention today`,
      context ? `Context: ${context}` : null,
    ].filter(Boolean),
    totalEstimatedTime: calculateTotalTime(now),
  }
}

function getTaskReason(task: any): string {
  if (task.priority === 'urgent') return 'Urgent priority'
  if (task.due_date) {
    const daysUntilDue = Math.ceil(
      (new Date(task.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
    if (daysUntilDue <= 1) return 'Due today or overdue'
    if (daysUntilDue <= 3) return `Due in ${daysUntilDue} days`
  }
  if (task.priority === 'high') return 'High priority'
  return 'Important for project progress'
}

function calculateTotalTime(tasks: any[]): string {
  const totalMinutes = tasks.reduce((sum, task) => {
    const time = task.estimated_time || '30m'
    const minutes = parseInt(time) || 30
    return sum + minutes
  }, 0)

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}
