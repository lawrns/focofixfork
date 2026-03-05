import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

function resolveArtifactUrl(uri: string, req: NextRequest): URL | null {
  try {
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      return new URL(uri)
    }
    if (uri.startsWith('/')) {
      return new URL(uri, req.nextUrl.origin)
    }
    return null
  } catch {
    return null
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const { data, error: dbError } = await supabase
    .from('artifacts')
    .select('id, uri')
    .eq('id', params.id)
    .single()

  if (dbError || !data) return NextResponse.json({ error: 'Artifact not found' }, { status: 404 })

  const target = resolveArtifactUrl(data.uri, req)
  if (!target) {
    return NextResponse.json({ error: 'Artifact URI is not downloadable' }, { status: 400 })
  }

  return NextResponse.redirect(target, { status: 302 })
}
