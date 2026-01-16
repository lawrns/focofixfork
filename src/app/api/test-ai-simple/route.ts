import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('=== Test AI Simple Start ===')
    
    // Test 1: Environment variables
    console.log('Environment check:')
    console.log('- AI_PROVIDER:', process.env.AI_PROVIDER)
    console.log('- DEEPSEEK_API_KEY exists:', !!process.env.DEEPSEEK_API_KEY)
    console.log('- DEEPSEEK_MODEL:', process.env.DEEPSEEK_MODEL)
    
    // Test 2: Supabase connection
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: request.headers.get('Authorization') || ''
          }
        }
      }
    )
    
    // Test 3: Simple task query
    const { data: task, error: taskError } = await supabase
      .from('work_items')
      .select('id, title')
      .eq('id', '8e20cc6c-eb78-4bcb-821a-9ce120bf61df')
      .single()
    
    console.log('Task query result:', { task: task?.title, error: taskError })
    
    if (taskError) {
      return NextResponse.json({ error: 'Task not found', details: taskError }, { status: 404 })
    }
    
    // Test 4: Direct AI service call
    const AIService = (await import('@/lib/services/ai-service')).AIService
    const aiService = new AIService()
    
    console.log('Calling AI service...')
    const response = await aiService.chatCompletion([
      { role: 'user', content: 'Say hello' }
    ])
    
    console.log('AI response:', response)
    
    return NextResponse.json({ 
      success: true,
      taskTitle: task.title,
      aiResponse: response
    })
    
  } catch (error) {
    console.error('Test AI Simple Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
