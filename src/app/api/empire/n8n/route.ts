import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'
import { n8nRequest, normalizeWorkflows } from '@/lib/n8n/client'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { user, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) {
    return mergeAuthResponse(authRequiredResponse(), authResponse)
  }

  try {
    const { searchParams } = new URL(req.url)
    const payload = await n8nRequest<{
      data?: Array<{
        id?: string
        name?: string
        active?: boolean
        updatedAt?: string
        tags?: Array<{ name?: string }>
      }>
      nextCursor?: string | null
    }>('/api/v1/workflows', {
      query: {
        limit: searchParams.get('limit') ?? 20,
        cursor: searchParams.get('cursor'),
        active: searchParams.get('active'),
        name: searchParams.get('name'),
        tags: searchParams.get('tags'),
      },
    })

    const workflows = normalizeWorkflows(payload)

    return NextResponse.json({
      workflows,
      nextCursor: payload.nextCursor ?? null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'n8n unreachable'
    return NextResponse.json({ workflows: [], error: message })
  }
}
