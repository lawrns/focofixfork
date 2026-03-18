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

export const appendBlocksSchema = z.object({
  workspace_id: z.string().uuid().describe('Workspace ID'),
  page_id: z.string().uuid().describe('Page ID'),
  mode: z.enum(['append', 'replace']).default('append').describe('Append or replace blocks'),
  blocks: z.array(blockInputSchema).min(1).describe('Blocks to write'),
});

export type AppendBlocksInput = z.infer<typeof appendBlocksSchema>;

export async function appendBlocks(input: AppendBlocksInput) {
  const admin = await validateAdmin();
  if (!isAdminOfWorkspace(admin, input.workspace_id)) {
    return errorResult('UNAUTHORIZED', `You are not an admin of workspace ${input.workspace_id}`);
  }

  const service = new WorkspaceMcpService();
  const updatedBlocks = input.mode === 'replace'
    ? await service.replaceBlocks(input.workspace_id, admin.userId, input.page_id, input.blocks)
    : await service.appendBlocks(input.workspace_id, admin.userId, input.page_id, input.blocks);

  return okResult({
    page_id: input.page_id,
    mode: input.mode,
    blocks: updatedBlocks,
    count: updatedBlocks.length,
  });
}
