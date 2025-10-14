import { NextRequest } from 'next/server'
import { wrapRoute } from '@/server/http/wrapRoute'
import { DeleteInvitationSchema } from '@/lib/validation/schemas/organization-api.schema'
import { supabaseAdmin } from '@/lib/supabase-server'

interface RouteContext {
  params: {
    id: string
    invitationId: string
  }
}

/**
 * DELETE /api/organizations/[id]/invitations/[invitationId] - Cancel invitation
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  return wrapRoute(DeleteInvitationSchema, async ({ user, correlationId }) => {
    const { id: organizationId, invitationId } = context.params

    // Update invitation status to cancelled
    const { error } = await supabaseAdmin
      .from('organization_invitations')
      .update({ status: 'cancelled' })
      .eq('id', invitationId)
      .eq('organization_id', organizationId)

    if (error) {
      const err: any = new Error('Failed to cancel invitation')
      err.code = 'DATABASE_ERROR'
      err.statusCode = 400
      throw err
    }

    return {
      message: 'Invitation cancelled successfully'
    }
  })(request)
}
