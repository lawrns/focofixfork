import { z } from 'zod';
import { validateAdmin, isAdminOfWorkspace } from '../admin-auth.js';
import { WorkspaceMcpService } from '../workspace-agent.js';
import { errorResult, okResult } from './workspace-utils.js';

export const upsertDatabaseRowSchema = z.object({
  workspace_id: z.string().uuid().describe('Workspace ID'),
  database_id: z.string().uuid().describe('Database ID'),
  row_id: z.string().uuid().optional().describe('Optional row ID to update'),
  page_id: z.string().uuid().nullable().optional().describe('Optional linked page'),
  position: z.number().int().min(0).optional().describe('Optional row position'),
  properties: z.record(z.unknown()).describe('Structured row properties'),
});

export type UpsertDatabaseRowInput = z.infer<typeof upsertDatabaseRowSchema>;

export async function upsertDatabaseRow(input: UpsertDatabaseRowInput) {
  const admin = await validateAdmin();
  if (!isAdminOfWorkspace(admin, input.workspace_id)) {
    return errorResult('UNAUTHORIZED', `You are not an admin of workspace ${input.workspace_id}`);
  }

  const service = new WorkspaceMcpService();
  const row = input.row_id
    ? await service.updateDatabaseRow(input.workspace_id, admin.userId, input.row_id, {
      page_id: input.page_id ?? undefined,
      position: input.position,
      properties: input.properties,
    })
    : await service.createDatabaseRow(input.workspace_id, admin.userId, input.database_id, {
      page_id: input.page_id ?? null,
      position: input.position,
      properties: input.properties,
    });

  return okResult({
    workspace_id: input.workspace_id,
    database_id: input.database_id,
    row,
  });
}
