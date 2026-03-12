import { z } from 'zod';
import { validateAdmin, isAdminOfWorkspace } from '../admin-auth.js';
import { WorkspaceMcpService } from '../workspace-agent.js';
import { errorResult, okResult } from './workspace-utils.js';

export const listPagesSchema = z.object({
  workspace_id: z.string().uuid().describe('Workspace ID'),
  project_id: z.string().uuid().optional().describe('Optional project filter'),
  parent_id: z.string().uuid().optional().describe('Optional parent page filter'),
  include_archived: z.boolean().default(false).describe('Include archived pages'),
  limit: z.number().min(1).max(100).default(50).describe('Maximum page count'),
});

export type ListPagesInput = z.infer<typeof listPagesSchema>;

export async function listPages(input: ListPagesInput) {
  const admin = await validateAdmin();
  if (!isAdminOfWorkspace(admin, input.workspace_id)) {
    return errorResult('UNAUTHORIZED', `You are not an admin of workspace ${input.workspace_id}`);
  }

  const service = new WorkspaceMcpService();
  const pages = await service.listPages(input.workspace_id, {
    projectId: input.project_id,
    parentId: input.parent_id,
    includeArchived: input.include_archived,
    limit: input.limit,
  });

  return okResult({
    workspace_id: input.workspace_id,
    pages,
    count: pages.length,
  });
}
