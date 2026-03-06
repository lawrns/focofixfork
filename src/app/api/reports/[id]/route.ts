import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse, databaseErrorResponse, notFoundResponse, successResponse } from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let authResponse: NextResponse | undefined
  try {
    const { user, supabase, error, response } = await getAuthUser(req)
    authResponse = response
    if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

    const { data, error: dbError } = await supabase
      .from('reports')
      .select('*')
      .eq('id', params.id)
      .single()

    if (dbError || !data) {
      return mergeAuthResponse(notFoundResponse('report', params.id), authResponse)
    }

    return mergeAuthResponse(successResponse({ report: data }), authResponse)
  } catch (error) {
    return mergeAuthResponse(databaseErrorResponse('Failed to load report', error), authResponse)
  }
}
