import { z } from 'zod';
import { validateAdmin, isAdminOfWorkspace } from '../admin-auth.js';
import { WorkspaceMcpService } from '../workspace-agent.js';
import { errorResult, okResult } from './workspace-utils.js';

export const listDatabasesSchema = z.object({
  workspace_id: z.string().uuid().describe('Workspace ID'),
  parent_doc_id: z.string().uuid().optional().describe('Optional parent page filter'),
  include_archived: z.boolean().default(false).describe('Include archived databases'),
  limit: z.number().min(1).max(100).default(50).describe('Maximum database count'),
});

export type ListDatabasesInput = z.infer<typeof listDatabasesSchema>;

export async function listDatabases(input: ListDatabasesInput) {
  const admin = await validateAdmin();
  if (!isAdminOfWorkspace(admin, input.workspace_id)) {
    return errorResult('UNAUTHORIZED', `You are not an admin of workspace ${input.workspace_id}`);
  }

  const service = new WorkspaceMcpService();
  const databases = await service.listDatabases(input.workspace_id, {
    parentDocId: input.parent_doc_id,
    includeArchived: input.include_archived,
    limit: input.limit,
  });

  return okResult({
    workspace_id: input.workspace_id,
    databases,
    count: databases.length,
  });
}
