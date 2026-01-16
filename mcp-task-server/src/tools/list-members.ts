import { z } from 'zod';
import { supabase, WorkspaceMember } from '../db.js';
import { validateAdmin, isAdminOfWorkspace } from '../admin-auth.js';

export const listMembersSchema = z.object({
  workspace_id: z.string().uuid().describe('The workspace ID to list members from'),
});

export type ListMembersInput = z.infer<typeof listMembersSchema>;

export async function listMembers(input: ListMembersInput) {
  const admin = await validateAdmin();

  if (!isAdminOfWorkspace(admin, input.workspace_id)) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            error: 'UNAUTHORIZED',
            message: `You are not an admin of workspace ${input.workspace_id}`,
          }),
        },
      ],
      isError: true,
    };
  }

  // Get workspace members with user info
  const { data: members, error } = await supabase
    .from('workspace_members')
    .select('id, workspace_id, user_id, role')
    .eq('workspace_id', input.workspace_id)
    .order('role');

  if (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            error: 'DATABASE_ERROR',
            message: error.message,
          }),
        },
      ],
      isError: true,
    };
  }

  // Get user emails for each member
  const userIds = members?.map(m => m.user_id) || [];
  const { data: authData } = await supabase.auth.admin.listUsers();
  
  const userMap = new Map<string, { email: string }>();
  (authData?.users || []).forEach((u: any) => {
    userMap.set(u.id, { email: u.email || 'unknown' });
  });

  const enrichedMembers = members?.map(m => ({
    ...m,
    email: userMap.get(m.user_id)?.email || 'unknown',
  })) || [];

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            workspace_id: input.workspace_id,
            members: enrichedMembers,
            count: enrichedMembers.length,
          },
          null,
          2
        ),
      },
    ],
  };
}
