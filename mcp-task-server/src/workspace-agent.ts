import { supabase, MemberRole } from './db.js';

type DataClient = typeof supabase;

export const WORKSPACE_BLOCK_TYPES = [
  'paragraph',
  'heading_1',
  'heading_2',
  'heading_3',
  'bulleted_list_item',
  'numbered_list_item',
  'to_do',
  'toggle',
  'quote',
  'code',
  'callout',
  'divider',
  'database_inline',
] as const;

export const WORKSPACE_DATABASE_PROPERTY_TYPES = [
  'title',
  'rich_text',
  'number',
  'select',
  'multi_select',
  'checkbox',
  'date',
  'person',
  'relation',
  'url',
] as const;

export type WorkspaceBlockType = (typeof WORKSPACE_BLOCK_TYPES)[number];
export type WorkspaceDatabasePropertyType = (typeof WORKSPACE_DATABASE_PROPERTY_TYPES)[number];

export interface WorkspaceAdminMembership {
  workspaceId: string;
  workspaceName: string;
  role: MemberRole;
}

export interface WorkspaceBlockInput {
  parent_block_id?: string | null;
  position?: number;
  block_type: WorkspaceBlockType;
  props?: Record<string, unknown>;
  plain_text?: string | null;
}

export interface WorkspaceDatabasePropertyDefinition {
  id: string;
  name: string;
  type: WorkspaceDatabasePropertyType;
  options?: string[];
  config?: Record<string, unknown>;
}

export interface DatabaseQueryFilter {
  property: string;
  operator: 'eq' | 'neq' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'checked' | 'is_empty' | 'not_empty' | 'before' | 'after';
  value?: unknown;
}

export interface DatabaseQuerySort {
  property: string;
  direction?: 'asc' | 'desc';
}

function asArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object') : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function safeString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function blockTextFromProps(props: Record<string, unknown>): string {
  const textParts: string[] = [];
  const stack: unknown[] = [props];

  while (stack.length > 0) {
    const current = stack.pop();
    if (typeof current === 'string') {
      textParts.push(current);
      continue;
    }
    if (Array.isArray(current)) {
      for (const item of current) stack.push(item);
      continue;
    }
    if (current && typeof current === 'object') {
      for (const value of Object.values(current as Record<string, unknown>)) stack.push(value);
    }
  }

  return textParts.join(' ').replace(/\s+/g, ' ').trim();
}

function normalizeBlockInput(block: WorkspaceBlockInput, index: number): WorkspaceBlockInput {
  const props = asRecord(block.props);
  const plainText = safeString(block.plain_text) ?? (blockTextFromProps(props) || null);

  return {
    parent_block_id: safeString(block.parent_block_id),
    position: typeof block.position === 'number' ? block.position : index,
    block_type: block.block_type,
    props,
    plain_text: plainText,
  };
}

function renderBlockMarkdown(block: Record<string, unknown>): string {
  const props = asRecord(block.props);
  const text = safeString(block.plain_text) ?? blockTextFromProps(props);
  const blockType = String(block.block_type ?? 'paragraph');

  if (blockType === 'heading_1') return `# ${text}`.trim();
  if (blockType === 'heading_2') return `## ${text}`.trim();
  if (blockType === 'heading_3') return `### ${text}`.trim();
  if (blockType === 'bulleted_list_item') return `- ${text}`.trim();
  if (blockType === 'numbered_list_item') return `1. ${text}`.trim();
  if (blockType === 'to_do') return `- [${Boolean(props.checked) ? 'x' : ' '}] ${text}`.trim();
  if (blockType === 'quote' || blockType === 'callout') return `> ${text}`.trim();
  if (blockType === 'code') {
    const language = safeString(props.language) ?? '';
    return `\`\`\`${language}\n${text}\n\`\`\``;
  }
  if (blockType === 'divider') return '---';
  if (blockType === 'database_inline') {
    const title = safeString(props.title) ?? 'Inline database';
    return `[[database:${title}]]`;
  }
  return text;
}

function renderBlocksToMarkdown(blocks: Record<string, unknown>[]): string {
  return [...blocks]
    .sort((left, right) => Number(left.position ?? 0) - Number(right.position ?? 0))
    .map(renderBlockMarkdown)
    .filter(Boolean)
    .join('\n\n')
    .trim();
}

function propertyValueToText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(propertyValueToText).filter(Boolean).join(' ');
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>).map(propertyValueToText).filter(Boolean).join(' ');
  return '';
}

function summarizeRowProperties(properties: Record<string, unknown>): string {
  return Object.entries(properties)
    .map(([key, value]) => `${key}: ${propertyValueToText(value)}`)
    .join(' | ')
    .trim();
}

function isMissingRelationError(error: unknown): boolean {
  const code = error && typeof error === 'object' ? String((error as { code?: string }).code ?? '') : '';
  return code === '42P01' || code === 'PGRST200';
}

async function recordRevision(
  client: DataClient,
  workspaceId: string,
  entityType: string,
  entityId: string,
  action: string,
  snapshot: unknown,
  userId: string
): Promise<void> {
  const { error } = await client.from('workspace_revisions').insert({
    workspace_id: workspaceId,
    entity_type: entityType,
    entity_id: entityId,
    action,
    snapshot,
    created_by: userId,
  });

  if (error) {
    console.error('[mcp workspace-agent] failed to record revision', error);
  }
}

async function logActivity(
  client: DataClient,
  workspaceId: string,
  entityType: string,
  entityId: string,
  action: string,
  userId: string,
  changes: Record<string, unknown>
): Promise<void> {
  const { error } = await client.from('activity_log').insert({
    workspace_id: workspaceId,
    entity_type: entityType,
    entity_id: entityId,
    action,
    changes,
    user_id: userId,
    is_ai_action: false,
    can_undo: action.includes('restore'),
  });

  if (error) {
    console.error('[mcp workspace-agent] failed to log activity', error);
  }
}

async function upsertSearchChunk(
  client: DataClient,
  workspaceId: string,
  sourceKey: string,
  entityType: string,
  entityId: string,
  plainText: string,
  metadata: Record<string, unknown>,
  parentEntityType?: string | null,
  parentEntityId?: string | null
): Promise<void> {
  const nextText = plainText.trim();
  if (!nextText) return;

  const { error } = await client.from('workspace_search_chunks').upsert({
    workspace_id: workspaceId,
    source_key: sourceKey,
    entity_type: entityType,
    entity_id: entityId,
    parent_entity_type: parentEntityType ?? null,
    parent_entity_id: parentEntityId ?? null,
    plain_text: nextText,
    metadata,
    embedding: null,
  }, {
    onConflict: 'source_key',
  });

  if (error) {
    console.error('[mcp workspace-agent] failed to upsert search chunk', error);
  }
}

async function deleteSearchChunk(client: DataClient, workspaceId: string, sourceKey: string): Promise<void> {
  const { error } = await client
    .from('workspace_search_chunks')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('source_key', sourceKey);

  if (error) {
    console.error('[mcp workspace-agent] failed to delete search chunk', error);
  }
}

async function deleteSearchChunksForParent(
  client: DataClient,
  workspaceId: string,
  entityType: string,
  parentEntityId: string
): Promise<void> {
  const { error } = await client
    .from('workspace_search_chunks')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('entity_type', entityType)
    .eq('parent_entity_id', parentEntityId);

  if (error) {
    console.error('[mcp workspace-agent] failed to delete search chunks', error);
  }
}

export async function resolveDocumentWorkspaceId(workspaceId: string): Promise<string> {
  const { data: directWorkspaces } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .limit(1);

  if (Array.isArray(directWorkspaces) && directWorkspaces.length > 0) {
    return workspaceId;
  }

  const { data: focoWorkspace } = await supabase
    .from('foco_workspaces')
    .select('id, slug, name')
    .eq('id', workspaceId)
    .maybeSingle();

  if (!focoWorkspace) return workspaceId;

  if (safeString((focoWorkspace as Record<string, unknown>).slug)) {
    const { data: bySlug } = await supabase
      .from('workspaces')
      .select('id')
      .eq('slug', String((focoWorkspace as Record<string, unknown>).slug))
      .limit(1);

    if (Array.isArray(bySlug) && bySlug.length > 0) {
      return String((bySlug[0] as Record<string, unknown>).id);
    }
  }

  if (safeString((focoWorkspace as Record<string, unknown>).name)) {
    const { data: byName } = await supabase
      .from('workspaces')
      .select('id')
      .eq('name', String((focoWorkspace as Record<string, unknown>).name))
      .limit(1);

    if (Array.isArray(byName) && byName.length > 0) {
      return String((byName[0] as Record<string, unknown>).id);
    }
  }

  return workspaceId;
}

export async function listAdminWorkspaceMemberships(userId: string): Promise<WorkspaceAdminMembership[]> {
  const focoResult = await supabase
    .from('foco_workspace_members')
    .select(`
      workspace_id,
      role,
      foco_workspaces!inner (
        id,
        name,
        slug
      )
    `)
    .eq('user_id', userId)
    .in('role', ['owner', 'admin']);

  if (!focoResult.error && focoResult.data && focoResult.data.length > 0) {
    return focoResult.data.map((membership: any) => ({
      workspaceId: membership.workspace_id,
      workspaceName: membership.foco_workspaces?.name || 'Unknown workspace',
      role: membership.role as MemberRole,
    }));
  }

  const legacyResult = await supabase
    .from('workspace_members')
    .select(`
      workspace_id,
      role,
      workspaces!inner (
        id,
        name,
        slug
      )
    `)
    .eq('user_id', userId)
    .in('role', ['owner', 'admin']);

  if (legacyResult.error) {
    if (focoResult.error && !isMissingRelationError(focoResult.error)) {
      throw new Error(`Failed to fetch admin workspaces: ${focoResult.error.message}`);
    }
    throw new Error(`Failed to fetch admin workspaces: ${legacyResult.error.message}`);
  }

  return (legacyResult.data || []).map((membership: any) => ({
    workspaceId: membership.workspace_id,
    workspaceName: membership.workspaces?.name || 'Unknown workspace',
    role: membership.role as MemberRole,
  }));
}

export async function isWorkspaceMember(workspaceId: string, userId: string): Promise<boolean> {
  const focoResult = await supabase
    .from('foco_workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!focoResult.error && focoResult.data) {
    return true;
  }

  const legacyResult = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle();

  return Boolean(legacyResult.data);
}

export async function listWorkspaceMembers(workspaceId: string): Promise<Record<string, unknown>[]> {
  const focoResult = await supabase
    .from('foco_workspace_members')
    .select('id, workspace_id, user_id, role')
    .eq('workspace_id', workspaceId)
    .order('role');

  if (!focoResult.error) {
    return asArray(focoResult.data);
  }

  const legacyResult = await supabase
    .from('workspace_members')
    .select('id, workspace_id, user_id, role')
    .eq('workspace_id', workspaceId)
    .order('role');

  if (legacyResult.error) {
    throw new Error(`Failed to list workspace members: ${legacyResult.error.message}`);
  }

  return asArray(legacyResult.data);
}

export class WorkspaceMcpService {
  constructor(private readonly client: DataClient = supabase) {}

  async listPages(
    workspaceId: string,
    options?: {
      projectId?: string;
      parentId?: string;
      includeArchived?: boolean;
      limit?: number;
    }
  ): Promise<Record<string, unknown>[]> {
    const docWorkspaceId = await resolveDocumentWorkspaceId(workspaceId);
    let query: any = this.client
      .from('docs')
      .select('*')
      .eq('workspace_id', docWorkspaceId)
      .order('updated_at', { ascending: false })
      .limit(Math.min(options?.limit ?? 50, 100));

    if (options?.projectId) query = query.eq('project_id', options.projectId);
    if (options?.parentId) query = query.eq('parent_id', options.parentId);
    if (!options?.includeArchived) query = query.is('archived_at', null);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to list pages: ${error.message}`);

    return asArray(data).map((row) => ({ ...row, workspace_id: workspaceId }));
  }

  async getPageState(
    workspaceId: string,
    pageId: string,
    options?: {
      includeBlocks?: boolean;
      includeDatabases?: boolean;
      includeArchived?: boolean;
    }
  ): Promise<Record<string, unknown> | null> {
    const docWorkspaceId = await resolveDocumentWorkspaceId(workspaceId);
    let query: any = this.client
      .from('docs')
      .select('*')
      .eq('workspace_id', docWorkspaceId)
      .eq('id', pageId)
      .limit(1);

    if (!options?.includeArchived) query = query.is('archived_at', null);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch page: ${error.message}`);

    const page = asArray(data)[0];
    if (!page) return null;

    return {
      page: { ...page, workspace_id: workspaceId },
      blocks: options?.includeBlocks === false ? [] : await this.getBlocks(workspaceId, pageId, options?.includeArchived),
      databases: options?.includeDatabases === false
        ? []
        : await this.listDatabases(workspaceId, {
          parentDocId: pageId,
          includeArchived: options?.includeArchived,
        }),
    };
  }

  async createPage(
    workspaceId: string,
    userId: string,
    input: {
      title: string;
      parent_id?: string | null;
      project_id?: string | null;
      template?: string | null;
      metadata?: Record<string, unknown>;
      blocks?: WorkspaceBlockInput[];
    }
  ): Promise<Record<string, unknown>> {
    const docWorkspaceId = await resolveDocumentWorkspaceId(workspaceId);
    const { data, error } = await this.client
      .from('docs')
      .insert({
        workspace_id: docWorkspaceId,
        parent_id: input.parent_id ?? null,
        project_id: input.project_id ?? null,
        title: input.title.trim(),
        content: null,
        content_type: 'blocks',
        template: input.template ?? null,
        metadata: input.metadata ?? {},
        created_by: userId,
        last_edited_by: userId,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Failed to create page: ${error?.message ?? 'unknown error'}`);
    }

    if (input.blocks?.length) {
      await this.replaceBlocks(workspaceId, userId, String((data as Record<string, unknown>).id), input.blocks, false);
    } else {
      await this.syncPageProjection(workspaceId, userId, String((data as Record<string, unknown>).id), []);
    }

    const state = await this.getPageState(workspaceId, String((data as Record<string, unknown>).id), {
      includeBlocks: true,
      includeDatabases: true,
    });

    await recordRevision(this.client, workspaceId, 'page', String((data as Record<string, unknown>).id), 'created', state, userId);
    await logActivity(this.client, workspaceId, 'workspace_page', String((data as Record<string, unknown>).id), 'workspace_page.created', userId, {
      title: input.title,
      parent_id: input.parent_id ?? null,
      project_id: input.project_id ?? null,
    });

    return state ?? {};
  }

  async getBlocks(workspaceId: string, pageId: string, includeArchived = false): Promise<Record<string, unknown>[]> {
    let query: any = this.client
      .from('doc_blocks')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('doc_id', pageId)
      .order('position', { ascending: true });

    if (!includeArchived) query = query.is('archived_at', null);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch blocks: ${error.message}`);
    return asArray(data);
  }

  async replaceBlocks(
    workspaceId: string,
    userId: string,
    pageId: string,
    blocks: WorkspaceBlockInput[],
    recordPreviousRevision = true
  ): Promise<Record<string, unknown>[]> {
    if (recordPreviousRevision) {
      const previousBlocks = await this.getBlocks(workspaceId, pageId, true);
      await recordRevision(this.client, workspaceId, 'page_blocks', pageId, 'replaced', {
        page_id: pageId,
        blocks: previousBlocks,
      }, userId);
    }

    const { error: deleteError } = await this.client
      .from('doc_blocks')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('doc_id', pageId);

    if (deleteError) throw new Error(`Failed to reset blocks: ${deleteError.message}`);

    if (blocks.length === 0) {
      await this.syncPageProjection(workspaceId, userId, pageId, []);
      return [];
    }

    const normalizedBlocks = blocks.map(normalizeBlockInput);
    const { data, error } = await this.client
      .from('doc_blocks')
      .insert(normalizedBlocks.map((block, index) => ({
        workspace_id: workspaceId,
        doc_id: pageId,
        parent_block_id: block.parent_block_id ?? null,
        position: typeof block.position === 'number' ? block.position : index,
        block_type: block.block_type,
        props: block.props ?? {},
        plain_text: block.plain_text ?? null,
        created_by: userId,
        last_edited_by: userId,
      })))
      .select('*');

    if (error) throw new Error(`Failed to save blocks: ${error.message}`);

    const savedBlocks = asArray(data);
    await this.syncPageProjection(workspaceId, userId, pageId, savedBlocks);
    await logActivity(this.client, workspaceId, 'workspace_page', pageId, 'workspace_page.blocks_replaced', userId, {
      block_count: savedBlocks.length,
    });

    return savedBlocks;
  }

  async appendBlocks(
    workspaceId: string,
    userId: string,
    pageId: string,
    blocks: WorkspaceBlockInput[]
  ): Promise<Record<string, unknown>[]> {
    const previousBlocks = await this.getBlocks(workspaceId, pageId, false);
    await recordRevision(this.client, workspaceId, 'page_blocks', pageId, 'appended', {
      page_id: pageId,
      blocks: previousBlocks,
    }, userId);

    const offset = previousBlocks.length === 0 ? 0 : Math.max(...previousBlocks.map((block) => Number(block.position ?? 0))) + 1;
    const normalizedBlocks = blocks.map(normalizeBlockInput);

    const { error } = await this.client
      .from('doc_blocks')
      .insert(normalizedBlocks.map((block, index) => ({
        workspace_id: workspaceId,
        doc_id: pageId,
        parent_block_id: block.parent_block_id ?? null,
        position: typeof block.position === 'number' ? block.position : offset + index,
        block_type: block.block_type,
        props: block.props ?? {},
        plain_text: block.plain_text ?? null,
        created_by: userId,
        last_edited_by: userId,
      })));

    if (error) throw new Error(`Failed to append blocks: ${error.message}`);

    const updatedBlocks = await this.getBlocks(workspaceId, pageId, false);
    await this.syncPageProjection(workspaceId, userId, pageId, updatedBlocks);
    await logActivity(this.client, workspaceId, 'workspace_page', pageId, 'workspace_page.blocks_appended', userId, {
      appended_count: blocks.length,
    });

    return updatedBlocks;
  }

  async listDatabases(
    workspaceId: string,
    options?: {
      parentDocId?: string;
      includeArchived?: boolean;
      limit?: number;
    }
  ): Promise<Record<string, unknown>[]> {
    let query: any = this.client
      .from('doc_databases')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('updated_at', { ascending: false })
      .limit(Math.min(options?.limit ?? 50, 100));

    if (options?.parentDocId) query = query.eq('parent_doc_id', options.parentDocId);
    if (!options?.includeArchived) query = query.is('archived_at', null);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to list databases: ${error.message}`);
    return asArray(data);
  }

  async getDatabase(
    workspaceId: string,
    databaseId: string,
    options?: {
      includeRows?: boolean;
      includeArchived?: boolean;
    }
  ): Promise<Record<string, unknown> | null> {
    let query: any = this.client
      .from('doc_databases')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('id', databaseId)
      .limit(1);

    if (!options?.includeArchived) query = query.is('archived_at', null);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch database: ${error.message}`);

    const database = asArray(data)[0];
    if (!database) return null;

    return {
      database,
      rows: options?.includeRows === false ? [] : await this.listDatabaseRows(workspaceId, databaseId, options?.includeArchived),
    };
  }

  async createDatabase(
    workspaceId: string,
    userId: string,
    input: {
      parent_doc_id?: string | null;
      title: string;
      description?: string | null;
      schema: WorkspaceDatabasePropertyDefinition[];
      default_view?: Record<string, unknown>;
    }
  ): Promise<Record<string, unknown>> {
    const { data, error } = await this.client
      .from('doc_databases')
      .insert({
        workspace_id: workspaceId,
        parent_doc_id: input.parent_doc_id ?? null,
        title: input.title.trim(),
        description: input.description ?? null,
        schema: input.schema,
        default_view: input.default_view ?? {},
        created_by: userId,
        last_edited_by: userId,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Failed to create database: ${error?.message ?? 'unknown error'}`);
    }

    await this.syncDatabaseSearch(workspaceId, String((data as Record<string, unknown>).id));
    const state = await this.getDatabase(workspaceId, String((data as Record<string, unknown>).id), { includeRows: true });
    await recordRevision(this.client, workspaceId, 'database', String((data as Record<string, unknown>).id), 'created', state, userId);
    await logActivity(this.client, workspaceId, 'workspace_database', String((data as Record<string, unknown>).id), 'workspace_database.created', userId, {
      title: input.title,
      parent_doc_id: input.parent_doc_id ?? null,
    });
    return state ?? {};
  }

  async listDatabaseRows(workspaceId: string, databaseId: string, includeArchived = false): Promise<Record<string, unknown>[]> {
    let query: any = this.client
      .from('doc_database_rows')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('database_id', databaseId)
      .order('position', { ascending: true });

    if (!includeArchived) query = query.is('archived_at', null);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch database rows: ${error.message}`);
    return asArray(data);
  }

  async getDatabaseRow(workspaceId: string, rowId: string, includeArchived = false): Promise<Record<string, unknown> | null> {
    let query: any = this.client
      .from('doc_database_rows')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('id', rowId)
      .limit(1);

    if (!includeArchived) query = query.is('archived_at', null);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch database row: ${error.message}`);
    return asArray(data)[0] ?? null;
  }

  async createDatabaseRow(
    workspaceId: string,
    userId: string,
    databaseId: string,
    input: {
      page_id?: string | null;
      position?: number;
      properties: Record<string, unknown>;
    }
  ): Promise<Record<string, unknown>> {
    const existingRows = await this.listDatabaseRows(workspaceId, databaseId, false);
    const nextPosition = typeof input.position === 'number'
      ? input.position
      : existingRows.length === 0
        ? 0
        : Math.max(...existingRows.map((row) => Number(row.position ?? 0))) + 1;

    const { data, error } = await this.client
      .from('doc_database_rows')
      .insert({
        workspace_id: workspaceId,
        database_id: databaseId,
        page_id: input.page_id ?? null,
        position: nextPosition,
        properties: input.properties,
        plain_text: summarizeRowProperties(input.properties),
        created_by: userId,
        last_edited_by: userId,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Failed to create database row: ${error?.message ?? 'unknown error'}`);
    }

    await this.syncDatabaseSearch(workspaceId, databaseId);
    await recordRevision(this.client, workspaceId, 'database_row', String((data as Record<string, unknown>).id), 'created', { row: data }, userId);
    await logActivity(this.client, workspaceId, 'workspace_database_row', String((data as Record<string, unknown>).id), 'workspace_database_row.created', userId, {
      database_id: databaseId,
    });

    return asRecord(data);
  }

  async updateDatabaseRow(
    workspaceId: string,
    userId: string,
    rowId: string,
    input: {
      page_id?: string | null;
      position?: number;
      properties?: Record<string, unknown>;
    }
  ): Promise<Record<string, unknown>> {
    const existing = await this.getDatabaseRow(workspaceId, rowId, true);
    if (!existing) throw new Error('Database row not found');

    const nextProperties = input.properties ?? asRecord(existing.properties);
    await recordRevision(this.client, workspaceId, 'database_row', rowId, 'updated', { row: existing }, userId);

    const updatePayload: Record<string, unknown> = {
      last_edited_by: userId,
      plain_text: summarizeRowProperties(nextProperties),
    };
    if (input.page_id !== undefined) updatePayload.page_id = input.page_id;
    if (input.position !== undefined) updatePayload.position = input.position;
    if (input.properties !== undefined) updatePayload.properties = input.properties;

    const { data, error } = await this.client
      .from('doc_database_rows')
      .update(updatePayload)
      .eq('workspace_id', workspaceId)
      .eq('id', rowId)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Failed to update database row: ${error?.message ?? 'unknown error'}`);
    }

    await this.syncDatabaseSearch(workspaceId, String((data as Record<string, unknown>).database_id));
    await logActivity(this.client, workspaceId, 'workspace_database_row', rowId, 'workspace_database_row.updated', userId, updatePayload);
    return asRecord(data);
  }

  async queryDatabase(
    workspaceId: string,
    databaseId: string,
    input: {
      filters?: DatabaseQueryFilter[];
      sorts?: DatabaseQuerySort[];
      limit?: number;
      offset?: number;
      include_archived?: boolean;
    }
  ): Promise<{ rows: Record<string, unknown>[]; count: number }> {
    const rows = await this.listDatabaseRows(workspaceId, databaseId, input.include_archived === true);
    let filtered = rows.filter((row) => this.matchesDatabaseFilters(row, input.filters ?? []));
    filtered = this.sortDatabaseRows(filtered, input.sorts ?? []);

    const offset = Math.max(input.offset ?? 0, 0);
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);

    return {
      count: filtered.length,
      rows: filtered.slice(offset, offset + limit),
    };
  }

  async searchWorkspace(
    workspaceId: string,
    input: {
      query: string;
      entityTypes?: string[];
      limit?: number;
    }
  ): Promise<Record<string, unknown>[]> {
    const query = input.query.trim();
    if (!query) return [];

    const { data, error } = await this.client.rpc('search_workspace_chunks', {
      p_workspace_id: workspaceId,
      p_query: query,
      p_query_embedding: null,
      p_entity_types: input.entityTypes ?? null,
      p_limit: Math.min(input.limit ?? 20, 50),
    });

    if (error) throw new Error(`Failed to search workspace: ${error.message}`);
    return asArray(data);
  }

  private async syncPageProjection(
    workspaceId: string,
    userId: string,
    pageId: string,
    blocks?: Record<string, unknown>[]
  ): Promise<void> {
    const pageState = await this.getPageState(workspaceId, pageId, {
      includeBlocks: false,
      includeDatabases: false,
      includeArchived: true,
    });
    const page = pageState && typeof pageState === 'object' ? asRecord((pageState as Record<string, unknown>).page) : {};
    const nextBlocks = blocks ?? await this.getBlocks(workspaceId, pageId, true);
    const markdown = renderBlocksToMarkdown(nextBlocks);

    const { error } = await this.client
      .from('docs')
      .update({
        content: markdown || null,
        content_type: 'blocks',
        last_edited_by: userId,
      })
      .eq('id', pageId);

    if (error) {
      console.error('[mcp workspace-agent] failed to sync page projection', error);
    }

    const pageTitle = safeString(page.title) ?? 'Untitled';
    await upsertSearchChunk(
      this.client,
      workspaceId,
      `page:${pageId}`,
      'page',
      pageId,
      `${pageTitle}\n\n${markdown}`.trim(),
      {
        title: pageTitle,
        parent_id: safeString(page.parent_id),
        project_id: safeString(page.project_id),
      }
    );

    await deleteSearchChunksForParent(this.client, workspaceId, 'block', pageId);
    for (const block of nextBlocks) {
      const blockId = safeString(block.id);
      if (!blockId) continue;
      const plainText = safeString(block.plain_text) ?? blockTextFromProps(asRecord(block.props));
      await upsertSearchChunk(
        this.client,
        workspaceId,
        `block:${blockId}`,
        'block',
        blockId,
        plainText,
        {
          doc_id: pageId,
          block_type: safeString(block.block_type),
          position: Number(block.position ?? 0),
        },
        'page',
        pageId
      );
    }
  }

  private async syncDatabaseSearch(workspaceId: string, databaseId: string): Promise<void> {
    const state = await this.getDatabase(workspaceId, databaseId, {
      includeRows: true,
      includeArchived: true,
    });
    if (!state) {
      await deleteSearchChunk(this.client, workspaceId, `database:${databaseId}`);
      await deleteSearchChunksForParent(this.client, workspaceId, 'database_row', databaseId);
      return;
    }

    const database = asRecord((state as Record<string, unknown>).database);
    const rows = asArray((state as Record<string, unknown>).rows);
    const databaseTitle = safeString(database.title) ?? 'Untitled database';
    const databaseDescription = safeString(database.description) ?? '';

    await upsertSearchChunk(
      this.client,
      workspaceId,
      `database:${databaseId}`,
      'database',
      databaseId,
      `${databaseTitle}\n\n${databaseDescription}`.trim(),
      {
        title: databaseTitle,
        parent_doc_id: safeString(database.parent_doc_id),
      },
      'page',
      safeString(database.parent_doc_id)
    );

    await deleteSearchChunksForParent(this.client, workspaceId, 'database_row', databaseId);
    for (const row of rows) {
      const rowId = safeString(row.id);
      if (!rowId) continue;
      await upsertSearchChunk(
        this.client,
        workspaceId,
        `database_row:${rowId}`,
        'database_row',
        rowId,
        safeString(row.plain_text) ?? summarizeRowProperties(asRecord(row.properties)),
        {
          database_id: databaseId,
          page_id: safeString(row.page_id),
          position: Number(row.position ?? 0),
        },
        'database',
        databaseId
      );
    }
  }

  private matchesDatabaseFilters(row: Record<string, unknown>, filters: DatabaseQueryFilter[]): boolean {
    const properties = asRecord(row.properties);

    return filters.every((filter) => {
      const rawValue = properties[filter.property];
      if (filter.operator === 'is_empty') {
        return rawValue === null || rawValue === undefined || rawValue === '' || (Array.isArray(rawValue) && rawValue.length === 0);
      }
      if (filter.operator === 'not_empty') {
        return !(rawValue === null || rawValue === undefined || rawValue === '' || (Array.isArray(rawValue) && rawValue.length === 0));
      }
      if (filter.operator === 'contains') {
        return propertyValueToText(rawValue).toLowerCase().includes(String(filter.value ?? '').toLowerCase());
      }
      if (filter.operator === 'checked') {
        return Boolean(rawValue) === Boolean(filter.value);
      }
      if (filter.operator === 'in') {
        const values = Array.isArray(filter.value) ? filter.value.map((value) => String(value)) : [String(filter.value)];
        if (Array.isArray(rawValue)) return rawValue.some((value) => values.includes(String(value)));
        return values.includes(String(rawValue));
      }
      if (filter.operator === 'before' || filter.operator === 'after') {
        const left = new Date(String(rawValue ?? ''));
        const right = new Date(String(filter.value ?? ''));
        if (Number.isNaN(left.getTime()) || Number.isNaN(right.getTime())) return false;
        return filter.operator === 'before' ? left < right : left > right;
      }
      if (filter.operator === 'eq') {
        return propertyValueToText(rawValue) === propertyValueToText(filter.value);
      }
      if (filter.operator === 'neq') {
        return propertyValueToText(rawValue) !== propertyValueToText(filter.value);
      }

      const leftValue = Number(rawValue);
      const rightValue = Number(filter.value);
      if (Number.isNaN(leftValue) || Number.isNaN(rightValue)) return false;
      if (filter.operator === 'gt') return leftValue > rightValue;
      if (filter.operator === 'gte') return leftValue >= rightValue;
      if (filter.operator === 'lt') return leftValue < rightValue;
      if (filter.operator === 'lte') return leftValue <= rightValue;
      return true;
    });
  }

  private sortDatabaseRows(rows: Record<string, unknown>[], sorts: DatabaseQuerySort[]): Record<string, unknown>[] {
    if (sorts.length === 0) {
      return [...rows].sort((left, right) => Number(left.position ?? 0) - Number(right.position ?? 0));
    }

    return [...rows].sort((left, right) => {
      const leftProperties = asRecord(left.properties);
      const rightProperties = asRecord(right.properties);

      for (const sort of sorts) {
        const leftValue = propertyValueToText(leftProperties[sort.property]);
        const rightValue = propertyValueToText(rightProperties[sort.property]);

        if (leftValue === rightValue) continue;
        const comparison = leftValue.localeCompare(rightValue, undefined, { numeric: true, sensitivity: 'base' });
        return sort.direction === 'desc' ? comparison * -1 : comparison;
      }

      return Number(left.position ?? 0) - Number(right.position ?? 0);
    });
  }
}
