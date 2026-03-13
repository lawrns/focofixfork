import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const { mockGetAuthUser, mockMergeAuthResponse, mockHasAdminAccess } =
  vi.hoisted(() => ({
    mockGetAuthUser: vi.fn(),
    mockMergeAuthResponse: vi.fn((response: NextResponse) => response),
    mockHasAdminAccess: vi.fn(),
  }));

const updateChain = {
  eq: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  single: vi.fn(),
};

const supabaseMock = {
  from: vi.fn((table: string) => {
    if (table === "foco_workspace_members") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(),
      };
    }

    if (table === "foco_workspaces") {
      return {
        update: vi.fn(() => updateChain),
      };
    }

    return {};
  }),
};

vi.mock("@/lib/api/auth-helper", () => ({
  getAuthUser: mockGetAuthUser,
  mergeAuthResponse: mockMergeAuthResponse,
}));

vi.mock("@/lib/repositories/workspace-repository", () => ({
  WorkspaceRepository: vi.fn().mockImplementation(() => ({
    hasAdminAccess: mockHasAdminAccess,
  })),
}));

import { PATCH as patchWorkspace } from "@/app/api/workspaces/[id]/route";

describe("workspaces route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateChain.eq.mockReturnThis();
    updateChain.select.mockReturnThis();
    updateChain.single.mockResolvedValue({
      data: {
        id: "11111111-1111-1111-1111-111111111111",
        name: "Ops",
        description: "Desc",
      },
      error: null,
    });
    mockGetAuthUser.mockResolvedValue({
      user: { id: "user-1" },
      supabase: supabaseMock,
      error: null,
      response: NextResponse.next(),
    });
    mockHasAdminAccess.mockResolvedValue({ ok: true, data: true });
  });

  test("allows partial workspace updates for admins", async () => {
    const req = new NextRequest(
      "http://localhost:4000/api/workspaces/11111111-1111-1111-1111-111111111111",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "Updated purpose" }),
      },
    );

    const res = await patchWorkspace(req, {
      params: Promise.resolve({ id: "11111111-1111-1111-1111-111111111111" }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(updateChain.eq).toHaveBeenCalledWith(
      "id",
      "11111111-1111-1111-1111-111111111111",
    );
  });

  test("rejects patch requests from non-admin members", async () => {
    mockHasAdminAccess.mockResolvedValue({ ok: true, data: false });

    const req = new NextRequest(
      "http://localhost:4000/api/workspaces/11111111-1111-1111-1111-111111111111",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "Updated purpose" }),
      },
    );

    const res = await patchWorkspace(req, {
      params: Promise.resolve({ id: "11111111-1111-1111-1111-111111111111" }),
    });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("Admin access required");
  });

  test("rejects patch requests with no fields", async () => {
    const req = new NextRequest(
      "http://localhost:4000/api/workspaces/11111111-1111-1111-1111-111111111111",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
    );

    const res = await patchWorkspace(req, {
      params: Promise.resolve({ id: "11111111-1111-1111-1111-111111111111" }),
    });

    expect(res.status).toBe(400);
  });
});
