/**
 * One-time seeder for agent trust system.
 * Creates canonical agent records for known CLAWD backends.
 *
 * Usage: npx tsx scripts/seed-agents.ts
 *
 * Requires: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

interface SeedAgent {
  backend: 'crico' | 'clawdbot' | 'bosun' | 'openclaw'
  agent_key: string
  display_name: string
  description: string
}

const AGENTS: SeedAgent[] = [
  {
    backend: 'clawdbot',
    agent_key: 'clawdbot-main',
    display_name: 'AI Engine Main',
    description: 'Lead execution operator for high-context work and live routing.',
  },
  {
    backend: 'crico',
    agent_key: 'crico-conductor',
    display_name: 'Intelligence Conductor',
    description: 'Operations intelligence and structured decision support.',
  },
  {
    backend: 'bosun',
    agent_key: 'bosun-scheduler',
    display_name: 'Scheduler',
    description: 'Scheduling, automation, and repeatable task orchestration.',
  },
  {
    backend: 'openclaw',
    agent_key: 'openclaw-relay',
    display_name: 'Browser Agent',
    description: 'Browser-based agent for web interactions and general dispatch.',
  },
]

async function main() {
  // Get first workspace
  const { data: workspaces, error: wsError } = await supabase
    .from('foco_workspaces')
    .select('id, name')
    .limit(1)

  if (wsError || !workspaces?.length) {
    console.error('No workspaces found:', wsError?.message)
    process.exit(1)
  }

  const workspace = workspaces[0]
  console.log(`Seeding agents into workspace: ${workspace.name} (${workspace.id})`)

  for (const agent of AGENTS) {
    const slug = agent.display_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    const { data, error } = await supabase
      .from('agents')
      .upsert(
        {
          workspace_id: workspace.id,
          backend: agent.backend,
          agent_key: agent.agent_key,
          display_name: agent.display_name,
          slug,
          description: agent.description,
        },
        { onConflict: 'workspace_id,backend,agent_key' },
      )
      .select('id, display_name')
      .single()

    if (error) {
      console.error(`  Failed: ${agent.display_name} — ${error.message}`)
    } else {
      console.log(`  Seeded: ${data.display_name} (${data.id})`)

      // Create initial trust score
      const { error: scoreError } = await supabase
        .from('agent_trust_scores')
        .upsert(
          { agent_id: data.id, workspace_id: workspace.id, score: 50.0 },
          { onConflict: 'agent_id,workspace_id' },
        )

      if (scoreError) {
        console.error(`    Score init failed: ${scoreError.message}`)
      } else {
        console.log(`    Trust score initialized at 50.00`)
      }
    }
  }

  console.log('Done.')
}

main().catch(console.error)
