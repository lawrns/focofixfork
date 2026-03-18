import { z } from 'zod';
import { validateAdmin, isAdminOfWorkspace } from '../admin-auth.js';
import { WorkspaceMcpService } from '../workspace-agent.js';
import { errorResult, okResult } from './workspace-utils.js';

const filterSchema = z.object({
  property: z.string().min(1),
  operator: z.enum(['eq', 'neq', 'contains', 'gt', 'gte', 'lt', 'lte', 'in', 'checked', 'is_empty', 'not_empty', 'before', 'after']),
  value: z.unknown().optional(),
});

const sortSchema = z.object({
  property: z.string().min(1),
  direction: z.enum(['asc', 'desc']).default('asc'),
});

export const queryDatabaseSchema = z.object({
  workspace_id: z.string().uuid().describe('Workspace ID'),
  database_id: z.string().uuid().describe('Database ID'),
  filters: z.array(filterSchema).optional().describe('Optional filters'),
  sorts: z.array(sortSchema).optional().describe('Optional sort order'),
  include_archived: z.boolean().default(false).describe('Include archived rows'),
  limit: z.number().min(1).max(200).default(50).describe('Maximum rows'),
  offset: z.number().min(0).default(0).describe('Pagination offset'),
});

export type QueryDatabaseInput = z.infer<typeof queryDatabaseSchema>;

export async function queryDatabase(input: QueryDatabaseInput) {
  const admin = await validateAdmin();
  if (!isAdminOfWorkspace(admin, input.workspace_id)) {
    return errorResult('UNAUTHORIZED', `You are not an admin of workspace ${input.workspace_id}`);
  }

  const service = new WorkspaceMcpService();
  const result = await service.queryDatabase(input.workspace_id, input.database_id, {
    filters: input.filters,
    sorts: input.sorts,
    include_archived: input.include_archived,
    limit: input.limit,
    offset: input.offset,
  });

  return okResult({
    workspace_id: input.workspace_id,
    database_id: input.database_id,
    ...result,
  });
}
