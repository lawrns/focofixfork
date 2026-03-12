import type { SupabaseClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

type DataClient = Pick<SupabaseClient, 'from' | 'rpc'>

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
] as const

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
] as const

export type WorkspaceBlockType = (typeof WORKSPACE_BLOCK_TYPES)[number]
export type WorkspaceDatabasePropertyType = (typeof WORKSPACE_DATABASE_PROPERTY_TYPES)[number]

export interface WorkspacePageRecord {
  id: string
  workspace_id: string
  project_id: string | null
  parent_id: string | null
  title: string
  content: string | null
  content_type: string | null
  template: string | null
  metadata: Record<string, unknown> | null
  created_by: string | null
  last_edited_by: string | null
  archived_at?: string | null
  created_at: string | null
  updated_at: string | null
}

export interface WorkspaceBlockRecord {
  id: string
  workspace_id: string
  doc_id: string
  parent_block_id: string | null
  position: number
  block_type: WorkspaceBlockType
  props: Record<string, unknown>
  plain_text: string | null
  created_by: string | null
  last_edited_by: string | null
  archived_at?: string | null
  created_at: string | null
  updated_at: string | null
}

export interface WorkspaceBlockInput {
  id?: string
  parent_block_id?: string | null
  position?: number
  block_type: WorkspaceBlockType
  props?: Record<string, unknown> | null
  plain_text?: string | null
}

export interface WorkspaceDatabaseRecord {
  id: string
  workspace_id: string
  parent_doc_id: string | null
  title: string
  description: string | null
  schema: WorkspaceDatabasePropertyDefinition[]
  default_view: Record<string, unknown>
  created_by: string | null
  last_edited_by: string | null
  archived_at?: string | null
  created_at: string | null
  updated_at: string | null
}

export interface WorkspaceDatabasePropertyDefinition {
  id: string
  name: string
  type: WorkspaceDatabasePropertyType
  options?: string[]
  config?: Record<string, unknown>
}

export interface WorkspaceDatabaseRowRecord {
  id: string
  database_id: string
  workspace_id: string
  page_id: string | null
  position: number
  properties: Record<string, unknown>
  plain_text: string | null
  created_by: string | null
  last_edited_by: string | null
  archived_at?: string | null
  created_at: string | null
  updated_at: string | null
}

export interface WorkspacePageState {
  page: WorkspacePageRecord
  blocks: WorkspaceBlockRecord[]
  databases: WorkspaceDatabaseRecord[]
}

export interface WorkspaceSearchResult {
  id: string
  entity_type: string
  entity_id: string
  parent_entity_type: string | null
  parent_entity_id: string | null
  plain_text: string
  metadata: Record<string, unknown>
  lexical_rank: number | null
  semantic_score: number | null
  combined_score: number | null
}

export interface WorkspaceSearchOptions {
  query: string
  entityTypes?: string[]
  limit?: number
}

export interface DatabaseQueryFilter {
  property: string
  operator: 'eq' | 'contains' | 'in' | 'gt' | 'gte' | 'lt' | 'lte' | 'checked' | 'before' | 'after' | 'is_empty' | 'not_empty'
  value?: unknown
}

export interface DatabaseQuerySort {
  property: string
  direction?: 'asc' | 'desc'
}

export interface DatabaseQueryInput {
  filters?: DatabaseQueryFilter[]
  sorts?: DatabaseQuerySort[]
  limit?: number
  offset?: number
  include_archived?: boolean
}

interface RevisionPayload {
  workspaceId: string
  entityType: 'page' | 'page_blocks' | 'database' | 'database_row'
  entityId: string
  action: string
  snapshot: unknown
  userId: string
}

const OPENAI_EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small'
const EMBEDDING_INPUT_LIMIT = 6000
const openAIEmbeddingClient = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>
  return {}
}

function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : []
}

function safeString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function normalizeBlockRow(row: Record<string, unknown>): WorkspaceBlockRecord {
  return {
    id: String(row.id),
    workspace_id: String(row.workspace_id),
    doc_id: String(row.doc_id),
    parent_block_id: safeString(row.parent_block_id),
    position: Number(row.position ?? 0),
    block_type: String(row.block_type) as WorkspaceBlockType,
    props: asRecord(row.props),
    plain_text: safeString(row.plain_text),
    created_by: safeString(row.created_by),
    last_edited_by: safeString(row.last_edited_by),
    archived_at: safeString(row.archived_at),
    created_at: safeString(row.created_at),
    updated_at: safeString(row.updated_at),
  }
}

function normalizeDatabaseRow(row: Record<string, unknown>): WorkspaceDatabaseRecord {
  return {
    id: String(row.id),
    workspace_id: String(row.workspace_id),
    parent_doc_id: safeString(row.parent_doc_id),
    title: String(row.title),
    description: safeString(row.description),
    schema: asArray(row.schema as WorkspaceDatabasePropertyDefinition[]),
    default_view: asRecord(row.default_view),
    created_by: safeString(row.created_by),
    last_edited_by: safeString(row.last_edited_by),
    archived_at: safeString(row.archived_at),
    created_at: safeString(row.created_at),
    updated_at: safeString(row.updated_at),
  }
}

function normalizeDatabaseEntryRow(row: Record<string, unknown>): WorkspaceDatabaseRowRecord {
  return {
    id: String(row.id),
    database_id: String(row.database_id),
    workspace_id: String(row.workspace_id),
    page_id: safeString(row.page_id),
    position: Number(row.position ?? 0),
    properties: asRecord(row.properties),
    plain_text: safeString(row.plain_text),
    created_by: safeString(row.created_by),
    last_edited_by: safeString(row.last_edited_by),
    archived_at: safeString(row.archived_at),
    created_at: safeString(row.created_at),
    updated_at: safeString(row.updated_at),
  }
}

function normalizePageRow(row: Record<string, unknown>, workspaceId: string): WorkspacePageRecord {
  return {
    id: String(row.id),
    workspace_id: workspaceId,
    project_id: safeString(row.project_id),
    parent_id: safeString(row.parent_id),
    title: String(row.title),
    content: safeString(row.content),
    content_type: safeString(row.content_type),
    template: safeString(row.template),
    metadata: asRecord(row.metadata),
    created_by: safeString(row.created_by),
    last_edited_by: safeString(row.last_edited_by),
    archived_at: safeString(row.archived_at),
    created_at: safeString(row.created_at),
    updated_at: safeString(row.updated_at),
  }
}

function blockTextFromProps(props: Record<string, unknown>): string {
  const textParts: string[] = []
  const stack: unknown[] = [props]

  while (stack.length > 0) {
    const current = stack.pop()
    if (typeof current === 'string') {
      textParts.push(current)
      continue
    }
    if (Array.isArray(current)) {
      for (const item of current) stack.push(item)
      continue
    }
    if (current && typeof current === 'object') {
      for (const value of Object.values(current as Record<string, unknown>)) stack.push(value)
    }
  }

  return textParts.join(' ').replace(/\s+/g, ' ').trim()
}

function normalizeBlockInput(block: WorkspaceBlockInput, index: number): WorkspaceBlockInput {
  const props = asRecord(block.props)
  const plainText = safeString(block.plain_text) ?? (blockTextFromProps(props) || null)

  return {
    id: safeString(block.id) ?? undefined,
    parent_block_id: safeString(block.parent_block_id),
    position: typeof block.position === 'number' ? block.position : index,
    block_type: block.block_type,
    props,
    plain_text: plainText,
  }
}

function renderBlockMarkdown(block: WorkspaceBlockRecord): string {
  const text = block.plain_text ?? blockTextFromProps(block.props)
  if (block.block_type === 'heading_1') return `# ${text}`.trim()
  if (block.block_type === 'heading_2') return `## ${text}`.trim()
  if (block.block_type === 'heading_3') return `### ${text}`.trim()
  if (block.block_type === 'bulleted_list_item') return `- ${text}`.trim()
  if (block.block_type === 'numbered_list_item') return `1. ${text}`.trim()
  if (block.block_type === 'to_do') {
    const checked = Boolean(block.props.checked)
    return `- [${checked ? 'x' : ' '}] ${text}`.trim()
  }
  if (block.block_type === 'quote') return `> ${text}`.trim()
  if (block.block_type === 'code') {
    const language = safeString(block.props.language) ?? ''
    return `\`\`\`${language}\n${text}\n\`\`\``
  }
  if (block.block_type === 'callout') return `> ${text}`.trim()
  if (block.block_type === 'divider') return '---'
  if (block.block_type === 'database_inline') {
    const title = safeString(block.props.title) ?? 'Inline database'
    return `[[database:${title}]]`
  }
  return text
}

function renderBlocksToMarkdown(blocks: WorkspaceBlockRecord[]): string {
  return blocks
    .sort((left, right) => left.position - right.position)
    .map(renderBlockMarkdown)
    .filter(Boolean)
    .join('\n\n')
    .trim()
}

function propertyValueToText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map(propertyValueToText).filter(Boolean).join(' ')
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>).map(propertyValueToText).filter(Boolean).join(' ')
  return ''
}

function summarizeRowProperties(properties: Record<string, unknown>): string {
  return Object.entries(properties)
    .map(([key, value]) => `${key}: ${propertyValueToText(value)}`)
    .join(' | ')
    .trim()
}

async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!openAIEmbeddingClient) return null
  const input = text.trim().slice(0, EMBEDDING_INPUT_LIMIT)
  if (!input) return null

  try {
    const response = await openAIEmbeddingClient.embeddings.create({
      model: OPENAI_EMBEDDING_MODEL,
      input,
    })
    return response.data[0]?.embedding ?? null
  } catch (error) {
    console.error('[workspace-agent] failed to generate embedding', error)
    return null
  }
}

async function recordRevision(client: DataClient, payload: RevisionPayload): Promise<void> {
  const { error } = await client
    .from('workspace_revisions')
    .insert({
      workspace_id: payload.workspaceId,
      entity_type: payload.entityType,
      entity_id: payload.entityId,
      action: payload.action,
      snapshot: payload.snapshot,
      created_by: payload.userId,
    })

  if (error) {
    console.error('[workspace-agent] failed to record revision', error)
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
  const { error } = await client
    .from('activity_log')
    .insert({
      workspace_id: workspaceId,
      entity_type: entityType,
      entity_id: entityId,
      action,
      changes,
      user_id: userId,
      is_ai_action: false,
      can_undo: action.includes('restore'),
    })

  if (error) {
    console.error('[workspace-agent] failed to log activity', error)
  }
}

async function upsertSearchChunk(
  client: DataClient,
  args: {
    workspaceId: string
    sourceKey: string
    entityType: string
    entityId: string
    parentEntityType?: string | null
    parentEntityId?: string | null
    plainText: string
    metadata?: Record<string, unknown>
  }
): Promise<void> {
  const plainText = args.plainText.trim()
  if (!plainText) return

  const embedding = await generateEmbedding(plainText)
  const { error } = await client
    .from('workspace_search_chunks')
    .upsert({
      workspace_id: args.workspaceId,
      source_key: args.sourceKey,
      entity_type: args.entityType,
      entity_id: args.entityId,
      parent_entity_type: args.parentEntityType ?? null,
      parent_entity_id: args.parentEntityId ?? null,
      plain_text: plainText,
      metadata: args.metadata ?? {},
      embedding,
    }, {
      onConflict: 'source_key',
    })

  if (error) {
    console.error('[workspace-agent] failed to upsert search chunk', error)
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
    .eq('parent_entity_id', parentEntityId)

  if (error) {
    console.error('[workspace-agent] failed to delete child search chunks', error)
  }
}

async function deleteSearchChunk(client: DataClient, workspaceId: string, sourceKey: string): Promise<void> {
  const { error } = await client
    .from('workspace_search_chunks')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('source_key', sourceKey)

  if (error) {
    console.error('[workspace-agent] failed to delete search chunk', error)
  }
}

export async function resolveDocumentWorkspaceId(client: DataClient, workspaceId: string): Promise<string> {
  const { data: directWorkspaces } = await client
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .limit(1)

  if (Array.isArray(directWorkspaces) && directWorkspaces.length > 0) {
    return workspaceId
  }

  const { data: focoWorkspace } = await client
    .from('foco_workspaces')
    .select('id, slug, name')
    .eq('id', workspaceId)
    .maybeSingle()

  if (!focoWorkspace) return workspaceId

  if (safeString((focoWorkspace as Record<string, unknown>).slug)) {
    const { data: bySlug } = await client
      .from('workspaces')
      .select('id')
      .eq('slug', String((focoWorkspace as Record<string, unknown>).slug))
      .limit(1)

    if (Array.isArray(bySlug) && bySlug.length > 0) {
      return String((bySlug[0] as Record<string, unknown>).id)
    }
  }

  if (safeString((focoWorkspace as Record<string, unknown>).name)) {
    const { data: byName } = await client
      .from('workspaces')
      .select('id')
      .eq('name', String((focoWorkspace as Record<string, unknown>).name))
      .limit(1)

    if (Array.isArray(byName) && byName.length > 0) {
      return String((byName[0] as Record<string, unknown>).id)
    }
  }

  return workspaceId
}

export class WorkspaceAgentService {
  constructor(private readonly client: DataClient) {}

  async listPages(
    workspaceId: string,
    options?: {
      projectId?: string | null
      parentId?: string | null
      includeArchived?: boolean
      limit?: number
    }
  ): Promise<WorkspacePageRecord[]> {
    const docWorkspaceId = await resolveDocumentWorkspaceId(this.client, workspaceId)

    let query = this.client
      .from('docs')
      .select('*')
      .eq('workspace_id', docWorkspaceId)
      .order('updated_at', { ascending: false })
      .limit(Math.min(options?.limit ?? 50, 100))

    if (options?.projectId) query = query.eq('project_id', options.projectId)
    if (options?.parentId) query = query.eq('parent_id', options.parentId)
    if (!options?.includeArchived) query = query.is('archived_at', null)

    const { data, error } = await query
    if (error) throw new Error(`Failed to list pages: ${error.message}`)

    return asArray(data as Record<string, unknown>[]).map((row) => normalizePageRow(row, workspaceId))
  }

  async getPageState(
    workspaceId: string,
    pageId: string,
    options?: {
      includeBlocks?: boolean
      includeDatabases?: boolean
      includeArchived?: boolean
    }
  ): Promise<WorkspacePageState | null> {
    const docWorkspaceId = await resolveDocumentWorkspaceId(this.client, workspaceId)
    let pageQuery = this.client
      .from('docs')
      .select('*')
      .eq('id', pageId)
      .eq('workspace_id', docWorkspaceId)
      .limit(1)

    if (!options?.includeArchived) pageQuery = pageQuery.is('archived_at', null)

    const { data: pages, error } = await pageQuery
    if (error) throw new Error(`Failed to fetch page: ${error.message}`)
    const pageRow = asArray(pages as Record<string, unknown>[])[0]
    if (!pageRow) return null

    const page = normalizePageRow(pageRow, workspaceId)
    const blocks = options?.includeBlocks === false ? [] : await this.getBlocks(workspaceId, pageId, options?.includeArchived === true)
    const databases = options?.includeDatabases === false ? [] : await this.listDatabases(workspaceId, {
      parentDocId: pageId,
      includeArchived: options?.includeArchived,
    })

    return { page, blocks, databases }
  }

  async createPage(
    workspaceId: string,
    userId: string,
    input: {
      title: string
      parent_id?: string | null
      project_id?: string | null
      template?: string | null
      metadata?: Record<string, unknown> | null
      blocks?: WorkspaceBlockInput[]
    }
  ): Promise<WorkspacePageState> {
    const docWorkspaceId = await resolveDocumentWorkspaceId(this.client, workspaceId)
    const { data: created, error } = await this.client
      .from('docs')
      .insert({
        workspace_id: docWorkspaceId,
        project_id: input.project_id ?? null,
        parent_id: input.parent_id ?? null,
        title: input.title.trim(),
        content: null,
        content_type: 'blocks',
        template: input.template ?? null,
        created_by: userId,
        last_edited_by: userId,
        metadata: input.metadata ?? {},
      })
      .select('*')
      .single()

    if (error || !created) {
      throw new Error(`Failed to create page: ${error?.message ?? 'unknown error'}`)
    }

    const page = normalizePageRow(created as Record<string, unknown>, workspaceId)
    let blocks: WorkspaceBlockRecord[] = []
    if (input.blocks && input.blocks.length > 0) {
      blocks = await this.replaceBlocks(workspaceId, userId, page.id, input.blocks, false)
    } else {
      await this.syncPageProjection(workspaceId, userId, page.id, [])
    }

    const state = await this.getPageState(workspaceId, page.id) as WorkspacePageState

    await recordRevision(this.client, {
      workspaceId,
      entityType: 'page',
      entityId: page.id,
      action: 'created',
      snapshot: {
        page: state.page,
        blocks,
      },
      userId,
    })

    await logActivity(this.client, workspaceId, 'workspace_page', page.id, 'workspace_page.created', userId, {
      title: page.title,
      parent_id: page.parent_id,
      project_id: page.project_id,
    })

    return state
  }

  async updatePage(
    workspaceId: string,
    userId: string,
    pageId: string,
    input: {
      title?: string
      parent_id?: string | null
      project_id?: string | null
      template?: string | null
      metadata?: Record<string, unknown> | null
    }
  ): Promise<WorkspacePageState> {
    const existing = await this.getPageState(workspaceId, pageId, { includeBlocks: true, includeDatabases: true })
    if (!existing) throw new Error('Page not found')

    await recordRevision(this.client, {
      workspaceId,
      entityType: 'page',
      entityId: pageId,
      action: 'updated',
      snapshot: existing,
      userId,
    })

    const updatePayload: Record<string, unknown> = {
      last_edited_by: userId,
    }
    if (input.title !== undefined) updatePayload.title = input.title.trim()
    if (input.parent_id !== undefined) updatePayload.parent_id = input.parent_id
    if (input.project_id !== undefined) updatePayload.project_id = input.project_id
    if (input.template !== undefined) updatePayload.template = input.template
    if (input.metadata !== undefined) updatePayload.metadata = input.metadata ?? {}

    const { error } = await this.client
      .from('docs')
      .update(updatePayload)
      .eq('id', pageId)

    if (error) throw new Error(`Failed to update page: ${error.message}`)

    await this.syncPageProjection(workspaceId, userId, pageId)

    const state = await this.getPageState(workspaceId, pageId) as WorkspacePageState
    await logActivity(this.client, workspaceId, 'workspace_page', pageId, 'workspace_page.updated', userId, updatePayload)
    return state
  }

  async archivePage(workspaceId: string, userId: string, pageId: string): Promise<void> {
    const existing = await this.getPageState(workspaceId, pageId, { includeBlocks: true, includeDatabases: true })
    if (!existing) throw new Error('Page not found')

    const archivedAt = new Date().toISOString()
    await recordRevision(this.client, {
      workspaceId,
      entityType: 'page',
      entityId: pageId,
      action: 'archived',
      snapshot: existing,
      userId,
    })

    const { error } = await this.client
      .from('docs')
      .update({
        archived_at: archivedAt,
        last_edited_by: userId,
      })
      .eq('id', pageId)

    if (error) throw new Error(`Failed to archive page: ${error.message}`)

    await this.client
      .from('doc_blocks')
      .update({ archived_at: archivedAt, last_edited_by: userId })
      .eq('doc_id', pageId)
      .is('archived_at', null)

    await this.client
      .from('doc_databases')
      .update({ archived_at: archivedAt, last_edited_by: userId })
      .eq('parent_doc_id', pageId)
      .is('archived_at', null)

    await deleteSearchChunk(this.client, workspaceId, `page:${pageId}`)
    await deleteSearchChunksForParent(this.client, workspaceId, 'block', pageId)
    await deleteSearchChunksForParent(this.client, workspaceId, 'database', pageId)
    await logActivity(this.client, workspaceId, 'workspace_page', pageId, 'workspace_page.archived', userId, {
      archived_at: archivedAt,
    })
  }

  async getBlocks(workspaceId: string, pageId: string, includeArchived = false): Promise<WorkspaceBlockRecord[]> {
    let query = this.client
      .from('doc_blocks')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('doc_id', pageId)
      .order('position', { ascending: true })

    if (!includeArchived) query = query.is('archived_at', null)

    const { data, error } = await query
    if (error) throw new Error(`Failed to fetch blocks: ${error.message}`)
    return asArray(data as Record<string, unknown>[]).map(normalizeBlockRow)
  }

  async replaceBlocks(
    workspaceId: string,
    userId: string,
    pageId: string,
    blocks: WorkspaceBlockInput[],
    recordPreviousRevision = true
  ): Promise<WorkspaceBlockRecord[]> {
    if (recordPreviousRevision) {
      const previousBlocks = await this.getBlocks(workspaceId, pageId, true)
      await recordRevision(this.client, {
        workspaceId,
        entityType: 'page_blocks',
        entityId: pageId,
        action: 'replaced',
        snapshot: {
          page_id: pageId,
          blocks: previousBlocks,
        },
        userId,
      })
    }

    const { error: deleteError } = await this.client
      .from('doc_blocks')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('doc_id', pageId)

    if (deleteError) throw new Error(`Failed to reset blocks: ${deleteError.message}`)

    if (blocks.length === 0) {
      await this.syncPageProjection(workspaceId, userId, pageId, [])
      return []
    }

    const normalizedBlocks = blocks.map(normalizeBlockInput)
    const payload = normalizedBlocks.map((block, index) => ({
      workspace_id: workspaceId,
      doc_id: pageId,
      parent_block_id: block.parent_block_id ?? null,
      position: block.position ?? index,
      block_type: block.block_type,
      props: block.props ?? {},
      plain_text: block.plain_text ?? null,
      created_by: userId,
      last_edited_by: userId,
    }))

    const { data, error } = await this.client
      .from('doc_blocks')
      .insert(payload)
      .select('*')

    if (error) throw new Error(`Failed to save blocks: ${error.message}`)

    const savedBlocks = asArray(data as Record<string, unknown>[]).map(normalizeBlockRow)
    await this.syncPageProjection(workspaceId, userId, pageId, savedBlocks)
    await logActivity(this.client, workspaceId, 'workspace_page', pageId, 'workspace_page.blocks_replaced', userId, {
      block_count: savedBlocks.length,
    })
    return savedBlocks
  }

  async appendBlocks(
    workspaceId: string,
    userId: string,
    pageId: string,
    blocks: WorkspaceBlockInput[]
  ): Promise<WorkspaceBlockRecord[]> {
    const previousBlocks = await this.getBlocks(workspaceId, pageId)
    await recordRevision(this.client, {
      workspaceId,
      entityType: 'page_blocks',
      entityId: pageId,
      action: 'appended',
      snapshot: {
        page_id: pageId,
        blocks: previousBlocks,
      },
      userId,
    })

    const offset = previousBlocks.length === 0
      ? 0
      : Math.max(...previousBlocks.map((block) => block.position)) + 1

    const payload = blocks.map((block, index) => {
      const normalized = normalizeBlockInput(block, index)
      return {
        workspace_id: workspaceId,
        doc_id: pageId,
        parent_block_id: normalized.parent_block_id ?? null,
        position: normalized.position ?? (offset + index),
        block_type: normalized.block_type,
        props: normalized.props ?? {},
        plain_text: normalized.plain_text ?? null,
        created_by: userId,
        last_edited_by: userId,
      }
    })

    const { error } = await this.client
      .from('doc_blocks')
      .insert(payload)

    if (error) throw new Error(`Failed to append blocks: ${error.message}`)

    const updatedBlocks = await this.getBlocks(workspaceId, pageId)
    await this.syncPageProjection(workspaceId, userId, pageId, updatedBlocks)
    await logActivity(this.client, workspaceId, 'workspace_page', pageId, 'workspace_page.blocks_appended', userId, {
      appended_count: blocks.length,
    })
    return updatedBlocks
  }

  async listDatabases(
    workspaceId: string,
    options?: {
      parentDocId?: string | null
      includeArchived?: boolean
      limit?: number
    }
  ): Promise<WorkspaceDatabaseRecord[]> {
    let query = this.client
      .from('doc_databases')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('updated_at', { ascending: false })
      .limit(Math.min(options?.limit ?? 50, 100))

    if (options?.parentDocId) query = query.eq('parent_doc_id', options.parentDocId)
    if (!options?.includeArchived) query = query.is('archived_at', null)

    const { data, error } = await query
    if (error) throw new Error(`Failed to list databases: ${error.message}`)
    return asArray(data as Record<string, unknown>[]).map(normalizeDatabaseRow)
  }

  async getDatabase(
    workspaceId: string,
    databaseId: string,
    options?: { includeRows?: boolean; includeArchived?: boolean }
  ): Promise<{ database: WorkspaceDatabaseRecord; rows: WorkspaceDatabaseRowRecord[] } | null> {
    let query = this.client
      .from('doc_databases')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('id', databaseId)
      .limit(1)

    if (!options?.includeArchived) query = query.is('archived_at', null)

    const { data, error } = await query
    if (error) throw new Error(`Failed to fetch database: ${error.message}`)
    const databaseRow = asArray(data as Record<string, unknown>[])[0]
    if (!databaseRow) return null

    const database = normalizeDatabaseRow(databaseRow)
    const rows = options?.includeRows === false
      ? []
      : await this.listDatabaseRows(workspaceId, databaseId, { includeArchived: options?.includeArchived })
    return { database, rows }
  }

  async createDatabase(
    workspaceId: string,
    userId: string,
    input: {
      parent_doc_id?: string | null
      title: string
      description?: string | null
      schema: WorkspaceDatabasePropertyDefinition[]
      default_view?: Record<string, unknown>
    }
  ): Promise<{ database: WorkspaceDatabaseRecord; rows: WorkspaceDatabaseRowRecord[] }> {
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
      .single()

    if (error || !data) throw new Error(`Failed to create database: ${error?.message ?? 'unknown error'}`)

    const database = normalizeDatabaseRow(data as Record<string, unknown>)
    await this.syncDatabaseSearch(workspaceId, database.id)
    await recordRevision(this.client, {
      workspaceId,
      entityType: 'database',
      entityId: database.id,
      action: 'created',
      snapshot: { database, rows: [] },
      userId,
    })
    await logActivity(this.client, workspaceId, 'workspace_database', database.id, 'workspace_database.created', userId, {
      title: database.title,
      parent_doc_id: database.parent_doc_id,
    })
    return { database, rows: [] }
  }

  async updateDatabase(
    workspaceId: string,
    userId: string,
    databaseId: string,
    input: {
      title?: string
      description?: string | null
      schema?: WorkspaceDatabasePropertyDefinition[]
      default_view?: Record<string, unknown>
      parent_doc_id?: string | null
    }
  ): Promise<{ database: WorkspaceDatabaseRecord; rows: WorkspaceDatabaseRowRecord[] }> {
    const existing = await this.getDatabase(workspaceId, databaseId, { includeRows: true, includeArchived: true })
    if (!existing) throw new Error('Database not found')

    await recordRevision(this.client, {
      workspaceId,
      entityType: 'database',
      entityId: databaseId,
      action: 'updated',
      snapshot: existing,
      userId,
    })

    const updatePayload: Record<string, unknown> = { last_edited_by: userId }
    if (input.title !== undefined) updatePayload.title = input.title.trim()
    if (input.description !== undefined) updatePayload.description = input.description
    if (input.schema !== undefined) updatePayload.schema = input.schema
    if (input.default_view !== undefined) updatePayload.default_view = input.default_view
    if (input.parent_doc_id !== undefined) updatePayload.parent_doc_id = input.parent_doc_id

    const { error } = await this.client
      .from('doc_databases')
      .update(updatePayload)
      .eq('workspace_id', workspaceId)
      .eq('id', databaseId)

    if (error) throw new Error(`Failed to update database: ${error.message}`)

    await this.syncDatabaseSearch(workspaceId, databaseId)
    await logActivity(this.client, workspaceId, 'workspace_database', databaseId, 'workspace_database.updated', userId, updatePayload)
    return await this.getDatabase(workspaceId, databaseId, { includeRows: true }) as { database: WorkspaceDatabaseRecord; rows: WorkspaceDatabaseRowRecord[] }
  }

  async archiveDatabase(workspaceId: string, userId: string, databaseId: string): Promise<void> {
    const existing = await this.getDatabase(workspaceId, databaseId, { includeRows: true, includeArchived: true })
    if (!existing) throw new Error('Database not found')

    const archivedAt = new Date().toISOString()
    await recordRevision(this.client, {
      workspaceId,
      entityType: 'database',
      entityId: databaseId,
      action: 'archived',
      snapshot: existing,
      userId,
    })

    const { error } = await this.client
      .from('doc_databases')
      .update({ archived_at: archivedAt, last_edited_by: userId })
      .eq('workspace_id', workspaceId)
      .eq('id', databaseId)

    if (error) throw new Error(`Failed to archive database: ${error.message}`)

    await this.client
      .from('doc_database_rows')
      .update({ archived_at: archivedAt, last_edited_by: userId })
      .eq('workspace_id', workspaceId)
      .eq('database_id', databaseId)
      .is('archived_at', null)

    await deleteSearchChunk(this.client, workspaceId, `database:${databaseId}`)
    await deleteSearchChunksForParent(this.client, workspaceId, 'database_row', databaseId)
    await logActivity(this.client, workspaceId, 'workspace_database', databaseId, 'workspace_database.archived', userId, {
      archived_at: archivedAt,
    })
  }

  async listDatabaseRows(
    workspaceId: string,
    databaseId: string,
    options?: { includeArchived?: boolean }
  ): Promise<WorkspaceDatabaseRowRecord[]> {
    let query = this.client
      .from('doc_database_rows')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('database_id', databaseId)
      .order('position', { ascending: true })

    if (!options?.includeArchived) query = query.is('archived_at', null)

    const { data, error } = await query
    if (error) throw new Error(`Failed to fetch database rows: ${error.message}`)
    return asArray(data as Record<string, unknown>[]).map(normalizeDatabaseEntryRow)
  }

  async createDatabaseRow(
    workspaceId: string,
    userId: string,
    databaseId: string,
    input: {
      page_id?: string | null
      position?: number
      properties: Record<string, unknown>
    }
  ): Promise<WorkspaceDatabaseRowRecord> {
    const existingRows = await this.listDatabaseRows(workspaceId, databaseId)
    const nextPosition = typeof input.position === 'number'
      ? input.position
      : existingRows.length === 0
        ? 0
        : Math.max(...existingRows.map((row) => row.position)) + 1

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
      .single()

    if (error || !data) throw new Error(`Failed to create database row: ${error?.message ?? 'unknown error'}`)
    const row = normalizeDatabaseEntryRow(data as Record<string, unknown>)
    await this.syncDatabaseSearch(workspaceId, databaseId)
    await recordRevision(this.client, {
      workspaceId,
      entityType: 'database_row',
      entityId: row.id,
      action: 'created',
      snapshot: { row },
      userId,
    })
    await logActivity(this.client, workspaceId, 'workspace_database_row', row.id, 'workspace_database_row.created', userId, {
      database_id: databaseId,
    })
    return row
  }

  async updateDatabaseRow(
    workspaceId: string,
    userId: string,
    rowId: string,
    input: {
      page_id?: string | null
      position?: number
      properties?: Record<string, unknown>
    }
  ): Promise<WorkspaceDatabaseRowRecord> {
    const existing = await this.getDatabaseRow(workspaceId, rowId, true)
    if (!existing) throw new Error('Database row not found')

    await recordRevision(this.client, {
      workspaceId,
      entityType: 'database_row',
      entityId: rowId,
      action: 'updated',
      snapshot: { row: existing },
      userId,
    })

    const nextProperties = input.properties ?? existing.properties
    const updatePayload: Record<string, unknown> = {
      last_edited_by: userId,
      plain_text: summarizeRowProperties(nextProperties),
    }
    if (input.page_id !== undefined) updatePayload.page_id = input.page_id
    if (input.position !== undefined) updatePayload.position = input.position
    if (input.properties !== undefined) updatePayload.properties = input.properties

    const { data, error } = await this.client
      .from('doc_database_rows')
      .update(updatePayload)
      .eq('workspace_id', workspaceId)
      .eq('id', rowId)
      .select('*')
      .single()

    if (error || !data) throw new Error(`Failed to update database row: ${error?.message ?? 'unknown error'}`)
    const updated = normalizeDatabaseEntryRow(data as Record<string, unknown>)
    await this.syncDatabaseSearch(workspaceId, updated.database_id)
    await logActivity(this.client, workspaceId, 'workspace_database_row', rowId, 'workspace_database_row.updated', userId, updatePayload)
    return updated
  }

  async archiveDatabaseRow(workspaceId: string, userId: string, rowId: string): Promise<void> {
    const existing = await this.getDatabaseRow(workspaceId, rowId, true)
    if (!existing) throw new Error('Database row not found')

    const archivedAt = new Date().toISOString()
    await recordRevision(this.client, {
      workspaceId,
      entityType: 'database_row',
      entityId: rowId,
      action: 'archived',
      snapshot: { row: existing },
      userId,
    })

    const { error } = await this.client
      .from('doc_database_rows')
      .update({ archived_at: archivedAt, last_edited_by: userId })
      .eq('workspace_id', workspaceId)
      .eq('id', rowId)

    if (error) throw new Error(`Failed to archive database row: ${error.message}`)
    await this.syncDatabaseSearch(workspaceId, existing.database_id)
    await logActivity(this.client, workspaceId, 'workspace_database_row', rowId, 'workspace_database_row.archived', userId, {
      archived_at: archivedAt,
      database_id: existing.database_id,
    })
  }

  async getDatabaseRow(workspaceId: string, rowId: string, includeArchived = false): Promise<WorkspaceDatabaseRowRecord | null> {
    let query = this.client
      .from('doc_database_rows')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('id', rowId)
      .limit(1)

    if (!includeArchived) query = query.is('archived_at', null)

    const { data, error } = await query
    if (error) throw new Error(`Failed to fetch database row: ${error.message}`)
    const row = asArray(data as Record<string, unknown>[])[0]
    return row ? normalizeDatabaseEntryRow(row) : null
  }

  async queryDatabase(
    workspaceId: string,
    databaseId: string,
    input: DatabaseQueryInput
  ): Promise<{ rows: WorkspaceDatabaseRowRecord[]; count: number }> {
    const rows = await this.listDatabaseRows(workspaceId, databaseId, {
      includeArchived: input.include_archived === true,
    })

    let filtered = rows.filter((row) => this.matchesDatabaseFilters(row, input.filters ?? []))
    filtered = this.sortDatabaseRows(filtered, input.sorts ?? [])

    const offset = Math.max(input.offset ?? 0, 0)
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200)

    return {
      count: filtered.length,
      rows: filtered.slice(offset, offset + limit),
    }
  }

  async listRevisions(
    workspaceId: string,
    entityId: string,
    entityTypes: Array<'page' | 'page_blocks' | 'database' | 'database_row'> = ['page', 'page_blocks']
  ): Promise<Record<string, unknown>[]> {
    const { data, error } = await this.client
      .from('workspace_revisions')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('entity_id', entityId)
      .in('entity_type', entityTypes)
      .order('created_at', { ascending: false })

    if (error) throw new Error(`Failed to fetch revisions: ${error.message}`)
    return asArray(data as Record<string, unknown>[])
  }

  async restorePageRevision(
    workspaceId: string,
    userId: string,
    pageId: string,
    revisionId: string
  ): Promise<WorkspacePageState> {
    const { data: revisions, error } = await this.client
      .from('workspace_revisions')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('entity_id', pageId)
      .eq('id', revisionId)
      .limit(1)

    if (error) throw new Error(`Failed to load revision: ${error.message}`)

    const revision = asArray(revisions as Record<string, unknown>[])[0]
    if (!revision) throw new Error('Revision not found')

    const snapshot = asRecord(revision.snapshot)
    const entityType = String(revision.entity_type)
    if (entityType === 'page') {
      const page = asRecord(snapshot.page)
      const updatePayload = {
        title: safeString(page.title) ?? 'Untitled',
        parent_id: safeString(page.parent_id),
        project_id: safeString(page.project_id),
        content_type: safeString(page.content_type) ?? 'blocks',
        template: safeString(page.template),
        metadata: asRecord(page.metadata),
        archived_at: safeString(page.archived_at),
        last_edited_by: userId,
      }

      const { error: updateError } = await this.client
        .from('docs')
        .update(updatePayload)
        .eq('id', pageId)

      if (updateError) throw new Error(`Failed to restore page revision: ${updateError.message}`)

      const blocks = asArray(snapshot.blocks as Record<string, unknown>[]).map((block) => ({
        parent_block_id: safeString(block.parent_block_id),
        position: Number(block.position ?? 0),
        block_type: String(block.block_type) as WorkspaceBlockType,
        props: asRecord(block.props),
        plain_text: safeString(block.plain_text),
      }))

      await this.replaceBlocks(workspaceId, userId, pageId, blocks, false)
    } else if (entityType === 'page_blocks') {
      const blocks = asArray(snapshot.blocks as Record<string, unknown>[]).map((block) => ({
        parent_block_id: safeString(block.parent_block_id),
        position: Number(block.position ?? 0),
        block_type: String(block.block_type) as WorkspaceBlockType,
        props: asRecord(block.props),
        plain_text: safeString(block.plain_text),
      }))
      await this.replaceBlocks(workspaceId, userId, pageId, blocks, false)
    } else {
      throw new Error(`Unsupported revision type: ${entityType}`)
    }

    const state = await this.getPageState(workspaceId, pageId) as WorkspacePageState
    await recordRevision(this.client, {
      workspaceId,
      entityType: 'page',
      entityId: pageId,
      action: 'restored',
      snapshot: state,
      userId,
    })
    await logActivity(this.client, workspaceId, 'workspace_page', pageId, 'workspace_page.restored', userId, {
      revision_id: revisionId,
      revision_type: entityType,
    })
    return state
  }

  async searchWorkspace(
    workspaceId: string,
    options: WorkspaceSearchOptions
  ): Promise<WorkspaceSearchResult[]> {
    const query = options.query.trim()
    if (!query) return []

    const embedding = await generateEmbedding(query)
    const { data, error } = await this.client.rpc('search_workspace_chunks', {
      p_workspace_id: workspaceId,
      p_query: query,
      p_query_embedding: embedding,
      p_entity_types: options.entityTypes ?? null,
      p_limit: Math.min(options.limit ?? 20, 50),
    })

    if (error) throw new Error(`Failed to search workspace: ${error.message}`)

    return asArray(data as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      entity_type: String(row.entity_type),
      entity_id: String(row.entity_id),
      parent_entity_type: safeString(row.parent_entity_type),
      parent_entity_id: safeString(row.parent_entity_id),
      plain_text: String(row.plain_text ?? ''),
      metadata: asRecord(row.metadata),
      lexical_rank: typeof row.lexical_rank === 'number' ? row.lexical_rank : null,
      semantic_score: typeof row.semantic_score === 'number' ? row.semantic_score : null,
      combined_score: typeof row.combined_score === 'number' ? row.combined_score : null,
    }))
  }

  private matchesDatabaseFilters(row: WorkspaceDatabaseRowRecord, filters: DatabaseQueryFilter[]): boolean {
    return filters.every((filter) => {
      const rawValue = row.properties[filter.property]
      if (filter.operator === 'is_empty') {
        return rawValue === null || rawValue === undefined || rawValue === '' || (Array.isArray(rawValue) && rawValue.length === 0)
      }
      if (filter.operator === 'not_empty') {
        return !(rawValue === null || rawValue === undefined || rawValue === '' || (Array.isArray(rawValue) && rawValue.length === 0))
      }
      if (filter.operator === 'contains') {
        return propertyValueToText(rawValue).toLowerCase().includes(String(filter.value ?? '').toLowerCase())
      }
      if (filter.operator === 'checked') {
        return Boolean(rawValue) === Boolean(filter.value)
      }
      if (filter.operator === 'in') {
        const values = Array.isArray(filter.value) ? filter.value.map((value) => String(value)) : [String(filter.value)]
        if (Array.isArray(rawValue)) return rawValue.some((value) => values.includes(String(value)))
        return values.includes(String(rawValue))
      }
      if (filter.operator === 'before' || filter.operator === 'after') {
        const left = new Date(String(rawValue ?? ''))
        const right = new Date(String(filter.value ?? ''))
        if (Number.isNaN(left.getTime()) || Number.isNaN(right.getTime())) return false
        return filter.operator === 'before' ? left < right : left > right
      }
      if (filter.operator === 'eq') {
        return propertyValueToText(rawValue) === propertyValueToText(filter.value)
      }

      const leftValue = Number(rawValue)
      const rightValue = Number(filter.value)
      if (Number.isNaN(leftValue) || Number.isNaN(rightValue)) return false
      if (filter.operator === 'gt') return leftValue > rightValue
      if (filter.operator === 'gte') return leftValue >= rightValue
      if (filter.operator === 'lt') return leftValue < rightValue
      if (filter.operator === 'lte') return leftValue <= rightValue
      return false
    })
  }

  private sortDatabaseRows(rows: WorkspaceDatabaseRowRecord[], sorts: DatabaseQuerySort[]): WorkspaceDatabaseRowRecord[] {
    if (sorts.length === 0) {
      return [...rows].sort((left, right) => left.position - right.position)
    }

    return [...rows].sort((left, right) => {
      for (const sort of sorts) {
        const leftValue = propertyValueToText(left.properties[sort.property])
        const rightValue = propertyValueToText(right.properties[sort.property])
        if (leftValue === rightValue) continue
        const factor = sort.direction === 'desc' ? -1 : 1
        return leftValue.localeCompare(rightValue, undefined, { numeric: true }) * factor
      }
      return left.position - right.position
    })
  }

  private async syncPageProjection(
    workspaceId: string,
    userId: string,
    pageId: string,
    providedBlocks?: WorkspaceBlockRecord[]
  ): Promise<void> {
    const pageState = await this.getPageState(workspaceId, pageId, { includeBlocks: true, includeDatabases: false, includeArchived: true })
    if (!pageState) return

    const blocks = providedBlocks ?? pageState.blocks
    const content = renderBlocksToMarkdown(blocks)

    const { error } = await this.client
      .from('docs')
      .update({
        content,
        content_type: 'blocks',
        last_edited_by: userId,
      })
      .eq('id', pageId)

    if (error) {
      console.error('[workspace-agent] failed to sync page projection', error)
    }

    await upsertSearchChunk(this.client, {
      workspaceId,
      sourceKey: `page:${pageId}`,
      entityType: 'page',
      entityId: pageId,
      plainText: [pageState.page.title, content].filter(Boolean).join('\n\n'),
      metadata: {
        page_id: pageId,
        project_id: pageState.page.project_id,
        parent_id: pageState.page.parent_id,
        title: pageState.page.title,
      },
    })

    await deleteSearchChunksForParent(this.client, workspaceId, 'block', pageId)
    for (const block of blocks) {
      if (!block.plain_text && Object.keys(block.props).length === 0) continue
      await upsertSearchChunk(this.client, {
        workspaceId,
        sourceKey: `block:${block.id}`,
        entityType: 'block',
        entityId: block.id,
        parentEntityType: 'page',
        parentEntityId: pageId,
        plainText: [pageState.page.title, block.plain_text ?? blockTextFromProps(block.props)].filter(Boolean).join('\n'),
        metadata: {
          doc_id: pageId,
          block_type: block.block_type,
          position: block.position,
          title: pageState.page.title,
        },
      })
    }
  }

  private async syncDatabaseSearch(workspaceId: string, databaseId: string): Promise<void> {
    const databaseState = await this.getDatabase(workspaceId, databaseId, { includeRows: true, includeArchived: true })
    if (!databaseState) return

    await upsertSearchChunk(this.client, {
      workspaceId,
      sourceKey: `database:${databaseId}`,
      entityType: 'database',
      entityId: databaseId,
      parentEntityType: databaseState.database.parent_doc_id ? 'page' : null,
      parentEntityId: databaseState.database.parent_doc_id,
      plainText: [
        databaseState.database.title,
        databaseState.database.description ?? '',
        ...databaseState.database.schema.map((property) => `${property.name} (${property.type})`),
      ].filter(Boolean).join('\n'),
      metadata: {
        parent_doc_id: databaseState.database.parent_doc_id,
        title: databaseState.database.title,
        schema: databaseState.database.schema,
      },
    })

    await deleteSearchChunksForParent(this.client, workspaceId, 'database_row', databaseId)
    for (const row of databaseState.rows.filter((entry) => !entry.archived_at)) {
      await upsertSearchChunk(this.client, {
        workspaceId,
        sourceKey: `database_row:${row.id}`,
        entityType: 'database_row',
        entityId: row.id,
        parentEntityType: 'database',
        parentEntityId: databaseId,
        plainText: [
          databaseState.database.title,
          summarizeRowProperties(row.properties),
        ].filter(Boolean).join('\n'),
        metadata: {
          database_id: databaseId,
          page_id: row.page_id,
          properties: row.properties,
          title: databaseState.database.title,
        },
      })
    }
  }
}
