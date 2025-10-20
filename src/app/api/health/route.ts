import { NextResponse } from 'next/server'

// Ensure Node runtime for Netlify compatibility
export const runtime = 'nodejs'

/**
 * GET /api/health - Health check endpoint
 */
export async function GET() {
  return NextResponse.json({ 
    ok: true, 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  })
}