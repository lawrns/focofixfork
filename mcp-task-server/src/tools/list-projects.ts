import { z } from 'zod';
import { supabase, Project } from '../db.js';
import { validateAdmin, isAdminOfWorkspace } from '../admin-auth.js';

export const listProjectsSchema = z.object({
  workspace_id: z.string().uuid().describe('The workspace ID to list projects from'),
});

export type ListProjectsInput = z.infer<typeof listProjectsSchema>;

export async function listProjects(input: ListProjectsInput) {
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

  const { data: projects, error } = await supabase
    .from('foco_projects')
    .select('id, workspace_id, name, slug, description, status')
    .eq('workspace_id', input.workspace_id)
    .is('archived_at', null)
    .order('name');

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

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            workspace_id: input.workspace_id,
            projects: projects as Project[],
            count: projects?.length || 0,
          },
          null,
          2
        ),
      },
    ],
  };
}
