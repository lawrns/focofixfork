import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser, mergeAuthResponse } from "@/lib/api/auth-helper";
import { isError } from "@/lib/repositories/base-repository";
import { WorkspaceRepository } from "@/lib/repositories/workspace-repository";

export const dynamic = "force-dynamic";

const updateWorkspaceSchema = z
  .object({
    name: z.string().trim().min(1).max(160).optional(),
    description: z.string().trim().max(500).optional(),
  })
  .refine(
    (value) => value.name !== undefined || value.description !== undefined,
    {
      message: "At least one field must be provided",
      path: ["name"],
    },
  );

/**
 * GET /api/workspaces/[id]
 * Fetches workspace details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const {
      user,
      supabase,
      error: authError,
      response: authResponse,
    } = await getAuthUser(request);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized", success: false },
        { status: 401 },
      );
    }

    const { id: workspaceId } = await params;

    // Check if user is a member of this workspace
    const { data: membership, error: membershipError } = await supabase
      .from("foco_workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError || !membership) {
      return mergeAuthResponse(
        NextResponse.json(
          { error: "Access denied", success: false },
          { status: 403 },
        ),
        authResponse,
      );
    }

    // Fetch workspace details
    const { data: workspace, error: workspaceError } = await supabase
      .from("foco_workspaces")
      .select("*")
      .eq("id", workspaceId)
      .single();

    if (workspaceError || !workspace) {
      return mergeAuthResponse(
        NextResponse.json(
          { error: "Workspace not found", success: false },
          { status: 404 },
        ),
        authResponse,
      );
    }

    return mergeAuthResponse(
      NextResponse.json({
        success: true,
        data: workspace,
      }),
      authResponse,
    );
  } catch (error) {
    console.error("[Workspaces API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", success: false },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const {
      user,
      supabase,
      error: authError,
      response: authResponse,
    } = await getAuthUser(request);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized", success: false },
        { status: 401 },
      );
    }

    const { id: workspaceId } = await params;
    const body = await request.json().catch(() => null);
    const parsed = updateWorkspaceSchema.safeParse(body);

    if (!parsed.success) {
      return mergeAuthResponse(
        NextResponse.json(
          {
            error: "Invalid workspace payload",
            success: false,
            details: parsed.error.flatten(),
          },
          { status: 400 },
        ),
        authResponse,
      );
    }

    const repo = new WorkspaceRepository(supabase as any);
    const access = await repo.hasAdminAccess(workspaceId, user.id);
    if (isError(access) || !access.data) {
      return mergeAuthResponse(
        NextResponse.json(
          { error: "Admin access required", success: false },
          { status: 403 },
        ),
        authResponse,
      );
    }

    const update: Record<string, string> = {};
    if (parsed.data.name !== undefined) {
      update.name = parsed.data.name;
    }
    if (parsed.data.description !== undefined) {
      update.description = parsed.data.description;
    }

    const { data: workspace, error: updateError } = await supabase
      .from("foco_workspaces")
      .update(update)
      .eq("id", workspaceId)
      .select("*")
      .single();

    if (updateError || !workspace) {
      return mergeAuthResponse(
        NextResponse.json(
          { error: "Failed to update workspace", success: false },
          { status: 500 },
        ),
        authResponse,
      );
    }

    return mergeAuthResponse(
      NextResponse.json({
        success: true,
        data: workspace,
      }),
      authResponse,
    );
  } catch (error) {
    console.error("[Workspaces API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", success: false },
      { status: 500 },
    );
  }
}
