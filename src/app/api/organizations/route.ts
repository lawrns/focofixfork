import { NextRequest } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

import { OrganizationRepository } from '@/lib/repositories/organization-repository'
import { isError } from '@/lib/repositories/base-repository'
import {
  successResponse,
  authRequiredResponse,
  databaseErrorResponse,
  missingFieldResponse,
  conflictResponse,
  internalErrorResponse,
} from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { user, supabase, error, response: authResponse } = await getAuthUser(req)

    if (error || !user) {
      return authRequiredResponse()
    }

    const orgRepo = new OrganizationRepository(supabase)
    const result = await orgRepo.findByUser(user.id)

    if (isError(result)) {
      return databaseErrorResponse(result.error.message, result.error.details)
    }

    return mergeAuthResponse(successResponse(result.data), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return internalErrorResponse('Failed to fetch organizations', message)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, supabase, error, response: authResponse } = await getAuthUser(req)

    if (error || !user) {
      return authRequiredResponse()
    }

    const body = await req.json()

    if (!body.name) {
      return missingFieldResponse('name')
    }

    // Generate slug
    const slug = body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    const orgRepo = new OrganizationRepository(supabase)
    const result = await orgRepo.createWithMember(
      {
        name: body.name,
        slug,
        description: body.description || null,
        logo_url: body.logo_url || null,
      },
      user.id
    )

    if (isError(result)) {
      if (result.error.code === 'DUPLICATE_ENTRY') {
        return conflictResponse(result.error.message, result.error.details)
      }
      return databaseErrorResponse(result.error.message, result.error.details)
    }

    return mergeAuthResponse(successResponse(result.data, undefined, 201), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return internalErrorResponse('Failed to create organization', message)
  }
}
