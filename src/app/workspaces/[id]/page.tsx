import { WorkspaceStudioClient } from '@/components/workspaces/workspace-studio-client'

export const dynamic = 'force-dynamic'

export default async function WorkspaceHomePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <WorkspaceStudioClient workspaceId={id} />
}
