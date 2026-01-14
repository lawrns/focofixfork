import { NextRequest } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { OrganizationRepository } from '@/lib/repositories/organization-repository'
import { isError } from '@/lib/repositories/base-repository'
import {
  successResponse,
  authRequiredResponse,
  forbiddenResponse,
  notFoundResponse,
  databaseErrorResponse,
  internalErrorResponse,
} from '@/lib/api/response-helpers'

/**
 * GET /api/organizations/[id]
 * Fetches a single workspace (organization) by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, supabase, error: authError, response: authResponse } = await getAuthUser(request)

    if (authError || !user) {
      return authRequiredResponse()
    }

    const organizationId = params.id
    const orgRepo = new OrganizationRepository(supabase)

    // Verify user has access to this organization
    const memberResult = await orgRepo.isMember(organizationId, user.id)
    if (isError(memberResult)) {
      return databaseErrorResponse(memberResult.error.message, memberResult.error.details)
    }

    if (!memberResult.data) {
      const errorRes = forbiddenResponse('Access denied to this organization')
      return mergeAuthResponse(errorRes, authResponse)
    }

    // Fetch organization details
    const result = await orgRepo.findById(organizationId)

    if (isError(result)) {
      if (result.error.code === 'NOT_FOUND') {
        const errorRes = notFoundResponse('Organization', organizationId)
        return mergeAuthResponse(errorRes, authResponse)
      }
      return databaseErrorResponse(result.error.message, result.error.details)
    }

    const successRes = successResponse(result.data)
    return mergeAuthResponse(successRes, authResponse)
  } catch (error) {
    console.error('Organization fetch error:', error)
    return internalErrorResponse('Failed to fetch organization', error instanceof Error ? error.message : 'Unknown error')
  }
}

/**
 * PATCH /api/organizations/[id]
 * Updates workspace details
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, supabase, error: authError, response: authResponse } = await getAuthUser(request)

    if (authError || !user) {
      return authRequiredResponse()
    }

    const organizationId = params.id
    const orgRepo = new OrganizationRepository(supabase)

    // Verify user has admin access
    const adminResult = await orgRepo.hasAdminAccess(organizationId, user.id)
    if (isError(adminResult)) {
      return databaseErrorResponse(adminResult.error.message, adminResult.error.details)
    }

    if (!adminResult.data) {
      const errorRes = forbiddenResponse('Admin access required')
      return mergeAuthResponse(errorRes, authResponse)
    }

    const body = await request.json()
    const updates: any = {}

    if (body.name) updates.name = body.name
    if (body.description !== undefined) updates.description = body.description
    if (body.logo_url !== undefined) updates.logo_url = body.logo_url

    const result = await orgRepo.update(organizationId, updates)

    if (isError(result)) {
      if (result.error.code === 'NOT_FOUND') {
        const errorRes = notFoundResponse('Organization', organizationId)
        return mergeAuthResponse(errorRes, authResponse)
      }
      return databaseErrorResponse(result.error.message, result.error.details)
    }

    const successRes = successResponse(result.data)
    return mergeAuthResponse(successRes, authResponse)
  } catch (error) {
    console.error('Organization update error:', error)
    return internalErrorResponse('Failed to update organization', error instanceof Error ? error.message : 'Unknown error')
  }
}
