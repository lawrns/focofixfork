import { WorkspaceStudioClient } from '@/components/workspaces/workspace-studio-client'

export const dynamic = 'force-dynamic'

export default async function WorkspaceDatabasePage({
  params,
}: {
  params: Promise<{ id: string; databaseId: string }>
}) {
  const { id, databaseId } = await params
  return <WorkspaceStudioClient workspaceId={id} databaseId={databaseId} />
}
