import { NextRequest, NextResponse } from 'next/server'

// Ensure Node runtime for Netlify compatibility
export const runtime = 'nodejs'

/**
 * GET /api/orderbook/stream - Stub endpoint to prevent 404 spam
 * This endpoint is called by browser extensions or cached requests
 */
export async function GET(request: NextRequest) {
  // Return 204 No Content to stop console noise
  return new NextResponse(null, { status: 204 })
}
