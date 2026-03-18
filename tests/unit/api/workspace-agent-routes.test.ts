import { beforeEach, describe, expect, test, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const {
  mockMergeAuthResponse,
  mockGetWorkspaceAgentRouteContext,
  mockService,
} = vi.hoisted(() => ({
  mockMergeAuthResponse: vi.fn((response: NextResponse) => response),
  mockGetWorkspaceAgentRouteContext: vi.fn(),
  mockService: {
    listPages: vi.fn(),
    createPage: vi.fn(),
    getPageState: vi.fn(),
    appendBlocks: vi.fn(),
    replaceBlocks: vi.fn(),
    searchWorkspace: vi.fn(),
    restorePageRevision: vi.fn(),
  },
}));

vi.mock('@/lib/api/auth-helper', () => ({
  mergeAuthResponse: mockMergeAuthResponse,
}));

vi.mock('@/lib/workspace-agent/api', () => ({
  getWorkspaceAgentRouteContext: mockGetWorkspaceAgentRouteContext,
}));

import { GET as getPages, POST as createPage } from '@/app/api/workspaces/[id]/pages/route';
import { PUT as putBlocks } from '@/app/api/workspaces/[id]/pages/[pageId]/blocks/route';
import { GET as searchWorkspace } from '@/app/api/workspaces/[id]/search/route';
import { POST as restoreRevision } from '@/app/api/workspaces/[id]/pages/[pageId]/revisions/[revisionId]/restore/route';

const workspaceId = '11111111-1111-1111-1111-111111111111';
const pageId = '22222222-2222-2222-2222-222222222222';
const revisionId = '33333333-3333-3333-3333-333333333333';

describe('workspace agent routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetWorkspaceAgentRouteContext.mockResolvedValue({
      ok: true,
      context: {
        authResponse: NextResponse.next(),
        service: mockService,
        user: { id: 'user-1' },
      },
    });
  });

  test('lists workspace pages', async () => {
    mockService.listPages.mockResolvedValue([
      { id: pageId, title: 'Plan', workspace_id: workspaceId },
    ]);

    const res = await getPages(
      new NextRequest(`http://localhost:4000/api/workspaces/${workspaceId}/pages?limit=10`),
      { params: Promise.resolve({ id: workspaceId }) }
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.pages).toHaveLength(1);
    expect(mockService.listPages).toHaveBeenCalledWith(workspaceId, {
      projectId: null,
      parentId: null,
      includeArchived: false,
      limit: 10,
    });
  });

  test('creates a workspace page', async () => {
    mockService.createPage.mockResolvedValue({
      page: { id: pageId, title: 'New doc' },
      blocks: [],
      databases: [],
    });

    const req = new NextRequest(`http://localhost:4000/api/workspaces/${workspaceId}/pages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New doc' }),
    });

    const res = await createPage(req, { params: Promise.resolve({ id: workspaceId }) });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.data.page.title).toBe('New doc');
    expect(mockService.createPage).toHaveBeenCalledWith(workspaceId, 'user-1', {
      title: 'New doc',
    });
  });

  test('appends page blocks when requested', async () => {
    mockService.getPageState.mockResolvedValue({
      page: { id: pageId, title: 'Plan' },
      blocks: [],
      databases: [],
    });
    mockService.appendBlocks.mockResolvedValue([
      { id: '44444444-4444-4444-4444-444444444444', block_type: 'paragraph' },
    ]);

    const req = new NextRequest(`http://localhost:4000/api/workspaces/${workspaceId}/pages/${pageId}/blocks`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'append',
        blocks: [
          { block_type: 'paragraph', plain_text: 'Hello world' },
        ],
      }),
    });

    const res = await putBlocks(req, { params: Promise.resolve({ id: workspaceId, pageId }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mockService.appendBlocks).toHaveBeenCalledWith(workspaceId, 'user-1', pageId, [
      { block_type: 'paragraph', plain_text: 'Hello world' },
    ]);
  });

  test('rejects workspace search without a query', async () => {
    const res = await searchWorkspace(
      new NextRequest(`http://localhost:4000/api/workspaces/${workspaceId}/search`),
      { params: Promise.resolve({ id: workspaceId }) }
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error.message).toBe('q is required');
    expect(mockService.searchWorkspace).not.toHaveBeenCalled();
  });

  test('restores a page revision and maps missing revisions to 404', async () => {
    mockService.restorePageRevision.mockRejectedValue(new Error('Revision not found'));

    const res = await restoreRevision(
      new NextRequest(`http://localhost:4000/api/workspaces/${workspaceId}/pages/${pageId}/revisions/${revisionId}/restore`, {
        method: 'POST',
      }),
      { params: Promise.resolve({ id: workspaceId, pageId, revisionId }) }
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.ok).toBe(false);
    expect(body.error.message).toBe('Revision not found');
  });
});
