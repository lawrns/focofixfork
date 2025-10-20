import { NextRequest, NextResponse } from 'next/server'

export const POST = async (req: NextRequest) => {
  try {
    const body = await req.json()
    const { events } = body

    // For now, just log the events (in production, you'd save to database)
    console.log('Analytics events received:', events?.length || 0)

    return NextResponse.json({ success: true, received: events?.length || 0 })
  } catch (error) {
    console.error('Analytics events error:', error)
    return NextResponse.json({ error: 'Failed to process analytics events' }, { status: 500 })
  }
}
