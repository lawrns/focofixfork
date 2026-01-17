import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const logs: any[] = []
  
  try {
    logs.push({ step: 'start', cookies: req.cookies.getAll().map(c => c.name) })
    
    let response = NextResponse.next()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll().map(cookie => ({
              name: cookie.name,
              value: cookie.value,
            }))
          },
          setAll(cookies) {
            cookies.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )
    
    logs.push({ step: 'supabase_created' })
    
    // Try getUser
    const { data: userData, error: userError } = await supabase.auth.getUser()
    logs.push({ 
      step: 'getUser_result', 
      hasUser: !!userData?.user,
      userId: userData?.user?.id,
      error: userError?.message 
    })
    
    // Try getSession
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    logs.push({ 
      step: 'getSession_result', 
      hasSession: !!sessionData?.session,
      userId: sessionData?.session?.user?.id,
      error: sessionError?.message 
    })
    
    // Try workspace_members query
    if (userData?.user) {
      const { data: members, error: membersError } = await supabase
        .from('workspace_members')
        .select('workspace_id, role')
        .eq('user_id', userData.user.id)
      
      logs.push({ 
        step: 'workspace_members_query', 
        count: members?.length || 0,
        error: membersError?.message 
      })
      
      // Try workspaces query
      if (members && members.length > 0) {
        const workspaceIds = members.map(m => m.workspace_id)
        const { data: workspaces, error: workspacesError } = await supabase
          .from('workspaces')
          .select('id, name')
          .in('id', workspaceIds)
        
        logs.push({ 
          step: 'workspaces_query', 
          count: workspaces?.length || 0,
          error: workspacesError?.message 
        })
      }
    }
    
    return NextResponse.json({ success: true, logs })
    
  } catch (error) {
    logs.push({ 
      step: 'error', 
      message: error instanceof Error ? error.message : 'Unknown',
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 3) : undefined
    })
    return NextResponse.json({ success: false, logs }, { status: 500 })
  }
}
