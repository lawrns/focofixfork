import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { resolvePrimaryWorkspace } from '@/server/workspaces/primary'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export default async function WorkspacesIndexPage() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll().map((cookie) => ({
            name: cookie.name,
            value: cookie.value,
          }))
        },
        setAll() {
          // Route redirects only; cookie mutation is not required here.
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const scope = await resolvePrimaryWorkspace({
    user,
    client: supabaseAdmin ?? supabase,
    createIfMissing: true,
  })

  if (!scope.ok || !scope.workspaceId) {
    redirect('/organizations')
  }

  redirect(`/workspaces/${scope.workspaceId}`)
}
