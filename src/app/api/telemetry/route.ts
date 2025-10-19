import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

interface TelemetryEvent {
  id: string
  type: string
  category: 'user-action' | 'performance' | 'error' | 'feature-usage' | 'system'
  timestamp: Date
  userId?: string
  sessionId: string
  properties: Record<string, any>
  metadata?: Record<string, any>
}

interface TelemetryPayload {
  events: TelemetryEvent[]
  sessionId: string
  userId?: string
  timestamp: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = supabaseAdmin
    
    // Get current user (optional for anonymous tracking)
    const { data: { user } } = await supabase.auth.getUser()
    
    const payload: TelemetryPayload = await request.json()
    const { events, sessionId, userId, timestamp } = payload

    // Validate payload
    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: 'Invalid events payload' }, { status: 400 })
    }

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    // Rate limiting check
    const clientIp = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    const rateLimitKey = `telemetry:${clientIp}:${new Date().toISOString().split('T')[0]}`
    
    // Check if we've exceeded rate limit (1000 events per day per IP)
    const { data: existingEvents } = await supabase
      .from('telemetry_events')
      .select('id')
      .eq('client_ip', clientIp)
      .gte('created_at', new Date().toISOString().split('T')[0])
      .limit(1000)

    if (existingEvents && existingEvents.length >= 1000) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    // Process events
    const processedEvents = events.map(event => ({
      id: event.id,
      type: event.type,
      category: event.category,
      timestamp: event.timestamp,
      user_id: userId || user?.id || null,
      session_id: sessionId,
      properties: event.properties,
      metadata: event.metadata,
      client_ip: clientIp,
      created_at: new Date().toISOString()
    }))

    // Insert events into database
    const { error: insertError } = await supabase
      .from('telemetry_events')
      .insert(processedEvents)

    if (insertError) {
      console.error('Telemetry insert error:', insertError)
      return NextResponse.json({ error: 'Failed to store events' }, { status: 500 })
    }

    // Update session metrics
    await updateSessionMetrics(supabase, sessionId, events.length, userId || user?.id)

    // Update daily metrics
    await updateDailyMetrics(supabase, events, clientIp)

    return NextResponse.json({ 
      success: true, 
      processed: events.length,
      sessionId 
    })

  } catch (error) {
    console.error('Telemetry API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update session metrics
async function updateSessionMetrics(
  supabase: any, 
  sessionId: string, 
  eventCount: number, 
  userId?: string
) {
  try {
    const { data: existingSession } = await supabase
      .from('telemetry_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single()

    if (existingSession) {
      // Update existing session
      await supabase
        .from('telemetry_sessions')
        .update({
          event_count: existingSession.event_count + eventCount,
          last_activity: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('session_id', sessionId)
    } else {
      // Create new session
      await supabase
        .from('telemetry_sessions')
        .insert({
          session_id: sessionId,
          user_id: userId,
          event_count: eventCount,
          created_at: new Date().toISOString(),
          last_activity: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
    }
  } catch (error) {
    console.error('Session metrics update error:', error)
  }
}

// Update daily metrics
async function updateDailyMetrics(
  supabase: any, 
  events: TelemetryEvent[], 
  clientIp: string
) {
  try {
    const today = new Date().toISOString().split('T')[0]
    
    // Count events by category
    const categoryCounts = events.reduce((acc, event) => {
      acc[event.category] = (acc[event.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Count events by type
    const typeCounts = events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Check if daily metrics exist
    const { data: existingMetrics } = await supabase
      .from('telemetry_daily_metrics')
      .select('*')
      .eq('date', today)
      .single()

    if (existingMetrics) {
      // Update existing metrics
      const updatedCategoryCounts = { ...existingMetrics.category_counts }
      const updatedTypeCounts = { ...existingMetrics.type_counts }

      Object.entries(categoryCounts).forEach(([category, count]) => {
        updatedCategoryCounts[category] = (updatedCategoryCounts[category] || 0) + count
      })

      Object.entries(typeCounts).forEach(([type, count]) => {
        updatedTypeCounts[type] = (updatedTypeCounts[type] || 0) + count
      })

      await supabase
        .from('telemetry_daily_metrics')
        .update({
          total_events: existingMetrics.total_events + events.length,
          category_counts: updatedCategoryCounts,
          type_counts: updatedTypeCounts,
          updated_at: new Date().toISOString()
        })
        .eq('date', today)
    } else {
      // Create new daily metrics
      await supabase
        .from('telemetry_daily_metrics')
        .insert({
          date: today,
          total_events: events.length,
          category_counts: categoryCounts,
          type_counts: typeCounts,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
    }
  } catch (error) {
    console.error('Daily metrics update error:', error)
  }
}

// GET endpoint for telemetry data (admin only)
export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseAdmin
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const category = searchParams.get('category')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '100')

    // Build query
    let query = supabase
      .from('telemetry_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (date) {
      query = query.eq('created_at', date)
    }

    if (category) {
      query = query.eq('category', category)
    }

    if (type) {
      query = query.eq('type', type)
    }

    const { data: events, error } = await query

    if (error) {
      console.error('Telemetry GET error:', error)
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
    }

    return NextResponse.json({ events })

  } catch (error) {
    console.error('Telemetry GET API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
