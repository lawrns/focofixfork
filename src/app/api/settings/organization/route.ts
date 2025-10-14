import { NextRequest } from 'next/server'
import { wrapRoute } from '@/server/http/wrapRoute'
import { GetOrganizationSettingsSchema, UpdateOrganizationSettingsSchema } from '@/lib/validation/schemas/settings-api.schema'
import { supabaseAdmin } from '@/lib/supabase-server'
import { ForbiddenError } from '@/server/auth/requireAuth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return wrapRoute(GetOrganizationSettingsSchema, async ({ input, user, correlationId }) => {
    const supabase = supabaseAdmin
    const orgId = input.query?.organizationId

    if (orgId) {
      // Get specific organization
      const { data: orgMember, error: orgError } = await supabase
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', user.id)
        .eq('organization_id', orgId)
        .single()

      if (orgError || !orgMember) {
        const err: any = new Error('Organization not found or access denied')
        err.code = 'ORGANIZATION_NOT_FOUND'
        err.statusCode = 404
        throw err
      }

      // Get organization details
      const { data: organization, error } = await supabase
        .from('organizations')
        .select('id, name, description, slug, logo_url, website, is_active, created_at, updated_at')
        .eq('id', orgMember.organization_id)
        .single()

      if (error) {
        const err: any = new Error(error.message)
        err.code = 'DATABASE_ERROR'
        err.statusCode = 500
        throw err
      }

      return { organization, role: orgMember.role }
    } else {
      // Get user's first organization (primary)
      const { data: orgMembers, error: orgError } = await supabase
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)

      if (orgError || !orgMembers || orgMembers.length === 0) {
        const err: any = new Error('No organization found')
        err.code = 'ORGANIZATION_NOT_FOUND'
        err.statusCode = 404
        throw err
      }

      const orgMember = orgMembers[0]

      // Get organization details
      const { data: organization, error } = await supabase
        .from('organizations')
        .select('id, name, description, slug, logo_url, website, is_active, created_at, updated_at')
        .eq('id', orgMember.organization_id)
        .single()

      if (error) {
        const err: any = new Error(error.message)
        err.code = 'DATABASE_ERROR'
        err.statusCode = 500
        throw err
      }

      return { organization, role: orgMember.role }
    }
  })(request)
}

export async function PUT(request: NextRequest) {
  return wrapRoute(UpdateOrganizationSettingsSchema, async ({ input, user, correlationId }) => {
    const supabase = supabaseAdmin
    const { organizationId, name, description, slug, logo_url, website } = input.body

    // Get user's organization membership
    const { data: orgMember, error: orgError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .single()

    if (orgError || !orgMember) {
      const err: any = new Error('Organization not found or access denied')
      err.code = 'ORGANIZATION_NOT_FOUND'
      err.statusCode = 404
      throw err
    }

    // Check if user is admin or owner
    if (!['admin', 'owner'].includes(orgMember.role)) {
      throw new ForbiddenError('Insufficient permissions')
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (slug !== undefined) updateData.slug = slug
    if (logo_url !== undefined) updateData.logo_url = logo_url
    if (website !== undefined) updateData.website = website

    const { error } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', organizationId)

    if (error) {
      const err: any = new Error(error.message)
      err.code = 'DATABASE_ERROR'
      err.statusCode = 500
      throw err
    }

    return { success: true, message: 'Organization settings updated successfully' }
  })(request)
}
