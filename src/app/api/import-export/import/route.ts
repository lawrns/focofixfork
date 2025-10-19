import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { ImportResult, ImportFormat } from '@/lib/utils/import-export'

export async function POST(request: NextRequest) {
  try {
    const { data, format, userId, mapping } = await request.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }
    
    if (!data) {
      return NextResponse.json({ error: 'Import data is required' }, { status: 400 })
    }
    
    const result: ImportResult = {
      success: true,
      imported: { organizations: 0, projects: 0, tasks: 0, labels: 0 },
      errors: [],
      warnings: []
    }
    
    // Import based on format
    if (format === 'trello') {
      await importTrelloData(data, userId, result)
    } else if (format === 'csv') {
      await importCSVData(data, userId, mapping, result)
    } else {
      result.success = false
      result.errors.push(`Unsupported import format: ${format}`)
    }
    
    return NextResponse.json({
      success: result.success,
      result
    })
    
  } catch (error) {
    console.error('Import API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function importTrelloData(trelloData: any, userId: string, result: ImportResult) {
  try {
    // Import lists as projects
    if (trelloData.lists && Array.isArray(trelloData.lists)) {
      for (const list of trelloData.lists) {
        try {
          const { error } = await supabaseAdmin
            .from('projects')
            .insert({
              name: list.name,
              description: list.desc || '',
              status: list.closed ? 'completed' : 'active',
              user_id: userId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
          
          if (error) {
            result.errors.push(`Failed to import project "${list.name}": ${error.message}`)
          } else {
            result.imported.projects++
          }
        } catch (error) {
          result.errors.push(`Failed to import project "${list.name}": ${error}`)
        }
      }
    }
    
    // Import cards as tasks
    if (trelloData.cards && Array.isArray(trelloData.cards)) {
      for (const card of trelloData.cards) {
        try {
          const { error } = await supabaseAdmin
            .from('tasks')
            .insert({
              title: card.name,
              description: card.desc || '',
              status: 'todo',
              priority: card.labels && card.labels.length > 0 ? card.labels[0] : 'normal',
              due_date: card.due || null,
              user_id: userId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
          
          if (error) {
            result.errors.push(`Failed to import task "${card.name}": ${error.message}`)
          } else {
            result.imported.tasks++
          }
        } catch (error) {
          result.errors.push(`Failed to import task "${card.name}": ${error}`)
        }
      }
    }
    
    // Import labels
    if (trelloData.labels && Array.isArray(trelloData.labels)) {
      for (const label of trelloData.labels) {
        try {
          const { error } = await supabaseAdmin
            .from('labels')
            .insert({
              name: label.name,
              color: label.color || 'blue',
              user_id: userId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
          
          if (error) {
            result.errors.push(`Failed to import label "${label.name}": ${error.message}`)
          } else {
            result.imported.labels++
          }
        } catch (error) {
          result.errors.push(`Failed to import label "${label.name}": ${error}`)
        }
      }
    }
    
  } catch (error) {
    result.success = false
    result.errors.push(`Failed to import Trello data: ${error}`)
  }
}

async function importCSVData(csvData: any, userId: string, mapping: any, result: ImportResult) {
  try {
    // Parse CSV data (assuming it's already parsed into rows)
    if (!Array.isArray(csvData)) {
      result.errors.push('CSV data must be an array of rows')
      return
    }
    
    for (const row of csvData) {
      try {
        // Map CSV data to Foco format
        const mappedData: any = {}
        if (mapping) {
          Object.entries(mapping).forEach(([csvField, focoField]) => {
            if (row[csvField]) {
              mappedData[focoField as string] = row[csvField]
            }
          })
        } else {
          // Use row data as-is if no mapping provided
          Object.assign(mappedData, row)
        }
        
        // Determine if this is a project or task
        if (mappedData.name && !mappedData.title) {
          // This looks like a project
          const { error } = await supabaseAdmin
            .from('projects')
            .insert({
              name: mappedData.name,
              description: mappedData.description || '',
              status: mappedData.status || 'active',
              due_date: mappedData.due_date || null,
              user_id: userId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
          
          if (error) {
            result.errors.push(`Failed to import project "${mappedData.name}": ${error.message}`)
          } else {
            result.imported.projects++
          }
        } else if (mappedData.title) {
          // This looks like a task
          const { error } = await supabaseAdmin
            .from('tasks')
            .insert({
              title: mappedData.title,
              description: mappedData.description || '',
              status: mappedData.status || 'todo',
              priority: mappedData.priority || 'normal',
              due_date: mappedData.due_date || null,
              project_id: mappedData.project_id || null,
              assignee_id: mappedData.assignee_id || null,
              user_id: userId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
          
          if (error) {
            result.errors.push(`Failed to import task "${mappedData.title}": ${error.message}`)
          } else {
            result.imported.tasks++
          }
        }
      } catch (error) {
        result.errors.push(`Failed to import row: ${error}`)
      }
    }
    
  } catch (error) {
    result.success = false
    result.errors.push(`Failed to import CSV data: ${error}`)
  }
}
