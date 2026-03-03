/**
 * GET /api/dashboard/autonomous-stats
 *
 * Lightweight read of cached crico_project_health data.
 * Returns aggregate autonomous improvement counts — no heavy computation.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { user, error: authError, response: authResponse } = await getAuthUser(req)
  if (authError || !user) {
    return mergeAuthResponse(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      authResponse
    )
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ improvementsWeek: 0, improvementsMonth: 0 })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('crico_project_health')
      .select('autonomous_improvements_week, autonomous_improvements_month')

    if (error || !data) {
      return NextResponse.json({ improvementsWeek: 0, improvementsMonth: 0 })
    }

    const rows = data as Array<{ autonomous_improvements_week?: number; autonomous_improvements_month?: number }>
    const improvementsWeek = rows.reduce((s, r) => s + (r.autonomous_improvements_week ?? 0), 0)
    const improvementsMonth = rows.reduce((s, r) => s + (r.autonomous_improvements_month ?? 0), 0)

    return NextResponse.json({ improvementsWeek, improvementsMonth })
  } catch {
    return NextResponse.json({ improvementsWeek: 0, improvementsMonth: 0 })
  }
}
