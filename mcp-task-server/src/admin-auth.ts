import { supabase, MemberRole } from './db.js';
import { CONFIG } from './config.js';
import { listAdminWorkspaceMemberships } from './workspace-agent.js';

export interface AdminContext {
  userId: string;
  email: string;
  workspaces: Array<{
    workspaceId: string;
    workspaceName: string;
    role: MemberRole;
  }>;
}

let cachedAdminContext: AdminContext | null = null;

export async function validateAdmin(): Promise<AdminContext> {
  if (cachedAdminContext) {
    return cachedAdminContext;
  }

  let userId = CONFIG.ADMIN_USER_ID;
  let email = CONFIG.ADMIN_EMAIL;

  // If we have email but no userId, look up the user
  if (!userId && email) {
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      throw new Error(`Failed to find admin user: ${authError.message}`);
    }
    const foundUser = (authData?.users || []).find((u: any) => u.email === email);
    if (!foundUser) {
      throw new Error(`Admin user with email ${email} not found`);
    }
    userId = foundUser.id;
  }

  if (!userId) {
    throw new Error('ADMIN_USER_ID or ADMIN_EMAIL must be set in environment');
  }

  // Get user email if not set
  if (!email) {
    const { data: authData } = await supabase.auth.admin.getUserById(userId);
    if (authData?.user) {
      email = authData.user.email || 'unknown';
    }
  }

  const workspaces = await listAdminWorkspaceMemberships(userId!);
  if (workspaces.length === 0) {
    throw new Error(`User ${email} is not an admin or owner of any workspace`);
  }

  cachedAdminContext = {
    userId: userId!,
    email: email || 'unknown',
    workspaces,
  };

  return cachedAdminContext;
}

export function isAdminOfWorkspace(ctx: AdminContext, workspaceId: string): boolean {
  return ctx.workspaces.some(w => w.workspaceId === workspaceId);
}

export function clearAdminCache(): void {
  cachedAdminContext = null;
}
