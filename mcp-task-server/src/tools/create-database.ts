import { z } from 'zod';
import { validateAdmin, isAdminOfWorkspace } from '../admin-auth.js';
import { WORKSPACE_DATABASE_PROPERTY_TYPES, WorkspaceMcpService } from '../workspace-agent.js';
import { errorResult, normalizeDatabaseSchema, okResult } from './workspace-utils.js';

const databasePropertySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  type: z.enum(WORKSPACE_DATABASE_PROPERTY_TYPES),
  options: z.array(z.string()).optional(),
  config: z.record(z.unknown()).optional(),
});

export const createDatabaseSchema = z.object({
  workspace_id: z.string().uuid().describe('Workspace ID'),
  parent_doc_id: z.string().uuid().nullable().optional().describe('Optional parent page'),
  title: z.string().trim().min(1).max(200).describe('Database title'),
  description: z.string().max(1000).nullable().optional().describe('Optional description'),
  schema: z.array(databasePropertySchema).min(1).describe('Database property schema'),
  default_view: z.record(z.unknown()).optional().describe('Optional default view settings'),
});

export type CreateDatabaseInput = z.infer<typeof createDatabaseSchema>;

export async function createDatabase(input: CreateDatabaseInput) {
  const admin = await validateAdmin();
  if (!isAdminOfWorkspace(admin, input.workspace_id)) {
    return errorResult('UNAUTHORIZED', `You are not an admin of workspace ${input.workspace_id}`);
  }

  const service = new WorkspaceMcpService();
  const state = await service.createDatabase(input.workspace_id, admin.userId, {
    parent_doc_id: input.parent_doc_id ?? null,
    title: input.title,
    description: input.description ?? null,
    schema: normalizeDatabaseSchema(input.schema),
    default_view: input.default_view,
  });

  return okResult(state);
}
