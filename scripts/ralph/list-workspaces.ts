#!/usr/bin/env bun
/**
 * List all workspaces to find the Fyves workspace ID
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function listWorkspaces() {
  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data: workspaces, error } = await supabase
    .from('workspaces')
    .select('id, name, slug')
    .order('name')

  if (error) {
    console.error('Error:', error)
    process.exit(1)
  }

  console.log('Available workspaces:')
  console.log('')

  workspaces?.forEach((ws) => {
    console.log(`  ID: ${ws.id}`)
    console.log(`  Name: ${ws.name}`)
    console.log(`  Slug: ${ws.slug}`)
    console.log('')
  })

  // Find Fyves workspace
  const fyvesWorkspace = workspaces?.find(
    (ws) => ws.slug === 'fyves-team' || ws.name.toLowerCase().includes('fyves')
  )

  if (fyvesWorkspace) {
    console.log('✅ Fyves workspace found!')
    console.log(`   ID: ${fyvesWorkspace.id}`)
    console.log('')
    console.log(`To insert the course, run:`)
    console.log(`   bun scripts/ralph/insert-cursos-course.ts ${fyvesWorkspace.id}`)
  } else {
    console.log('⚠️  No Fyves workspace found with slug="fyves-team"')
    console.log('')
    console.log('Workspaces with "fyves" in the name might be the one you are looking for.')
  }
}

listWorkspaces()
