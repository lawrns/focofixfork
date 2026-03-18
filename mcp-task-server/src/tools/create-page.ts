import { z } from 'zod';
import { validateAdmin, isAdminOfWorkspace } from '../admin-auth.js';
import { WORKSPACE_BLOCK_TYPES, WorkspaceMcpService } from '../workspace-agent.js';
import { errorResult, okResult } from './workspace-utils.js';

const blockInputSchema = z.object({
  parent_block_id: z.string().uuid().nullable().optional(),
  position: z.number().int().min(0).optional(),
  block_type: z.enum(WORKSPACE_BLOCK_TYPES),
  props: z.record(z.unknown()).optional(),
  plain_text: z.string().nullable().optional(),
});

export const createPageSchema = z.object({
  workspace_id: z.string().uuid().describe('Workspace ID'),
  title: z.string().trim().min(1).max(500).describe('Page title'),
  parent_id: z.string().uuid().nullable().optional().describe('Optional parent page'),
  project_id: z.string().uuid().nullable().optional().describe('Optional project'),
  template: z.string().max(120).nullable().optional().describe('Optional template'),
  metadata: z.record(z.unknown()).optional().describe('Optional page metadata'),
  blocks: z.array(blockInputSchema).optional().describe('Optional initial blocks'),
});

export type CreatePageInput = z.infer<typeof createPageSchema>;

export async function createPage(input: CreatePageInput) {
  const admin = await validateAdmin();
  if (!isAdminOfWorkspace(admin, input.workspace_id)) {
    return errorResult('UNAUTHORIZED', `You are not an admin of workspace ${input.workspace_id}`);
  }

  const service = new WorkspaceMcpService();
  const state = await service.createPage(input.workspace_id, admin.userId, {
    title: input.title,
    parent_id: input.parent_id ?? null,
    project_id: input.project_id ?? null,
    template: input.template ?? null,
    metadata: input.metadata,
    blocks: input.blocks,
  });

  return okResult(state);
}
