import { z } from 'zod';
import { validateAdmin, isAdminOfWorkspace } from '../admin-auth.js';
import { WorkspaceMcpService } from '../workspace-agent.js';
import { errorResult, okResult } from './workspace-utils.js';

export const searchWorkspaceSchema = z.object({
  workspace_id: z.string().uuid().describe('Workspace ID'),
  query: z.string().trim().min(1).describe('Search query'),
  entity_types: z.array(z.string()).optional().describe('Optional entity type filter'),
  limit: z.number().min(1).max(50).default(20).describe('Maximum result count'),
});

export type SearchWorkspaceInput = z.infer<typeof searchWorkspaceSchema>;

export async function searchWorkspace(input: SearchWorkspaceInput) {
  const admin = await validateAdmin();
  if (!isAdminOfWorkspace(admin, input.workspace_id)) {
    return errorResult('UNAUTHORIZED', `You are not an admin of workspace ${input.workspace_id}`);
  }

  const service = new WorkspaceMcpService();
  const results = await service.searchWorkspace(input.workspace_id, {
    query: input.query,
    entityTypes: input.entity_types,
    limit: input.limit,
  });

  return okResult({
    workspace_id: input.workspace_id,
    query: input.query,
    results,
    count: results.length,
  });
}
