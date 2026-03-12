import { z } from 'zod';
import { validateAdmin, isAdminOfWorkspace } from '../admin-auth.js';
import { WorkspaceMcpService } from '../workspace-agent.js';
import { errorResult, okResult } from './workspace-utils.js';

export const getPageSchema = z.object({
  workspace_id: z.string().uuid().describe('Workspace ID'),
  page_id: z.string().uuid().describe('Page ID'),
  include_blocks: z.boolean().default(true).describe('Include page blocks'),
  include_databases: z.boolean().default(true).describe('Include databases attached to the page'),
  include_archived: z.boolean().default(false).describe('Include archived records'),
});

export type GetPageInput = z.infer<typeof getPageSchema>;

export async function getPage(input: GetPageInput) {
  const admin = await validateAdmin();
  if (!isAdminOfWorkspace(admin, input.workspace_id)) {
    return errorResult('UNAUTHORIZED', `You are not an admin of workspace ${input.workspace_id}`);
  }

  const service = new WorkspaceMcpService();
  const state = await service.getPageState(input.workspace_id, input.page_id, {
    includeBlocks: input.include_blocks,
    includeDatabases: input.include_databases,
    includeArchived: input.include_archived,
  });

  if (!state) {
    return errorResult('NOT_FOUND', `Page ${input.page_id} not found`);
  }

  return okResult(state);
}
