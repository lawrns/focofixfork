import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'
import { n8nRequest } from '@/lib/n8n/client'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { user, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const { id } = await params

  try {
    const workflow = await n8nRequest(`/api/v1/workflows/${encodeURIComponent(id)}/deactivate`, {
      method: 'POST',
      body: {},
    })

    if (supabaseAdmin) {
      await supabaseAdmin
        .from('automation_jobs')
        .update({
          enabled: false,
          last_status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('external_id', id)
    }

    return NextResponse.json({ workflow })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to deactivate workflow'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

