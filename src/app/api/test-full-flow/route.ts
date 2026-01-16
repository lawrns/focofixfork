import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const logs: any[] = []
  
  try {
    logs.push({ step: 'start', time: new Date().toISOString() })
    
    // Test 1: Check environment
    logs.push({ 
      step: 'env_check',
      DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL,
      AI_PROVIDER: process.env.AI_PROVIDER,
      hasApiKey: !!process.env.DEEPSEEK_API_KEY
    })
    
    // Test 2: Create AI Service
    const AIService = (await import('@/lib/services/ai-service')).AIService
    const aiService = new AIService()
    logs.push({ step: 'ai_service_created' })
    
    // Test 3: Simple AI call
    const aiResponse = await aiService.chatCompletion([
      { role: 'user', content: 'Say "test working"' }
    ])
    logs.push({ step: 'ai_call_success', response: aiResponse })
    
    // Test 4: Check Supabase connection
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    logs.push({ step: 'supabase_created' })
    
    // Test 5: Check task exists
    const { data: task, error: taskError } = await supabase
      .from('work_items')
      .select('id, title, workspace_id')
      .eq('id', '8e20cc6c-eb78-4bcb-821a-9ce120bf61df')
      .single()
    
    if (taskError) {
      logs.push({ step: 'task_error', error: taskError })
    } else {
      logs.push({ step: 'task_found', task: task })
    }
    
    // Test 6: Check workspace membership
    const { data: member, error: memberError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', 'd7de1d3e-cae6-4210-ae4e-775fb84ddb7d')
      .eq('user_id', '60c44927-9d61-40e2-8c41-7e44cf7f7981')
      .single()
    
    if (memberError) {
      logs.push({ step: 'member_error', error: memberError })
    } else {
      logs.push({ step: 'member_found', role: member })
    }
    
    return NextResponse.json({ 
      success: true,
      logs
    })
    
  } catch (error) {
    logs.push({ 
      step: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return NextResponse.json({ 
      success: false,
      logs
    }, { status: 500 })
  }
}
