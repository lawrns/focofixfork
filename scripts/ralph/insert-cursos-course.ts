#!/usr/bin/env bun
/**
 * Insert Cursos Flagship Course into Database
 * Usage: bun scripts/ralph/insert-cursos-course.ts <workspace_id>
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function insertCourse(workspaceId: string) {
  const supabase = createClient(supabaseUrl, supabaseKey)

  // Load course from JSON file
  const courseData = JSON.parse(readFileSync('./scripts/ralph/vibe-coder-course.json', 'utf-8'))

  console.log('🚀 Inserting Cursos flagship course...')
  console.log(`📁 Workspace ID: ${workspaceId}`)

  // First, check if course already exists
  const { data: existing } = await supabase
    .from('cursos_courses')
    .select('id')
    .eq('slug', courseData.slug)
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  if (existing) {
    console.log('⚠️  Course already exists. Skipping insertion.')
    console.log(`📝 Course ID: ${existing.id}`)
    return
  }

  // Insert the course
  const { data: course, error: courseError } = await supabase
    .from('cursos_courses')
    .insert({
      workspace_id: workspaceId,
      slug: courseData.slug,
      title: courseData.title,
      description: courseData.description,
      duration_minutes: courseData.duration_minutes,
      is_published: courseData.is_published,
      sort_order: courseData.sort_order,
    })
    .select()
    .single()

  if (courseError) {
    console.error('❌ Failed to insert course:', courseError)
    process.exit(1)
  }

  console.log(`✅ Course created: ${course.id}`)
  console.log(`   Title: ${course.title}`)

  // Insert sections
  console.log(`📚 Inserting ${courseData.sections.length} sections...`)

  for (const section of courseData.sections) {
    const { data: sectionData, error: sectionError } = await supabase
      .from('cursos_sections')
      .insert({
        course_id: course.id,
        title: section.title,
        content_type: section.content_type,
        content: section.content,
        content_url: section.content_url,
        sort_order: section.sort_order,
        duration_minutes: section.duration_minutes,
      })
      .select('id, title')
      .single()

    if (sectionError) {
      console.error(`❌ Failed to insert section "${section.title}":`, sectionError)
      continue
    }

    console.log(`   ✅ ${sectionData.title}`)
  }

  console.log('')
  console.log('🎉 Course successfully created!')
  console.log(`🔗 View at: /organizations/${workspaceId}/cursos/${courseData.slug}`)
}

// Get workspace ID from command line
const workspaceId = process.argv[2]

if (!workspaceId) {
  console.error('Usage: bun insert-cursos-course.ts <workspace_id>')
  process.exit(1)
}

insertCourse(workspaceId)
    .then(() => {
      console.log('✨ Done!')
      process.exit(0)
    })
    .catch((err) => {
      console.error('Fatal error:', err)
      process.exit(1)
    })
