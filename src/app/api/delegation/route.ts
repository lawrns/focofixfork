import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DelegationService, AgentType } from '@/features/delegation/delegationService'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { taskId, agentType, instructions, requireApproval } = body

  if (!taskId || !agentType) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const result = await DelegationService.delegateTask(
    taskId, agentType as AgentType, user.id,
    { instructions, requireApproval }
  )

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ success: true, data: { runId: result.runId, taskId: result.taskId } })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const taskId = searchParams.get('taskId')
  if (!taskId) return NextResponse.json({ error: 'Missing taskId' }, { status: 400 })

  const result = await DelegationService.cancelDelegation(taskId, user.id)
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 })

  return NextResponse.json({ success: true, data: { taskId } })
}
