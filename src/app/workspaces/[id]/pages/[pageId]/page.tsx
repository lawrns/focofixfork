import { WorkspaceStudioClient } from '@/components/workspaces/workspace-studio-client'

export const dynamic = 'force-dynamic'

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ id: string; pageId: string }>
}) {
  const { id, pageId } = await params
  return <WorkspaceStudioClient workspaceId={id} pageId={pageId} />
}
