import { z } from 'zod';
import { validateAdmin } from '../admin-auth.js';

export const listWorkspacesSchema = z.object({});

export async function listWorkspaces() {
  const admin = await validateAdmin();

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            admin: {
              userId: admin.userId,
              email: admin.email,
            },
            workspaces: admin.workspaces.map(w => ({
              id: w.workspaceId,
              name: w.workspaceName,
              role: w.role,
            })),
          },
          null,
          2
        ),
      },
    ],
  };
}
