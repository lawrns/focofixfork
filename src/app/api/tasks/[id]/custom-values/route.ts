import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api/auth-helper'

export const dynamic = 'force-dynamic';
/**
 * GET /api/tasks/[id]/custom-values
 * Get all custom field values for a task
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase, error } = await getAuthUser(req)

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: taskId } = await params

    // Verify task exists
    const { data: task, error: taskError } = await supabase
      .from('work_items')
      .select('id, project_id')
      .eq('id', taskId)
      .single()

    if (taskError || !task) {
      // Try legacy tasks table
      const { data: legacyTask, error: legacyError } = await supabase
        .from('tasks')
        .select('id, project_id')
        .eq('id', taskId)
        .single()

      if (legacyError || !legacyTask) {
        return NextResponse.json(
          { success: false, error: 'Task not found' },
          { status: 404 }
        )
      }
    }

    // Fetch custom values with field metadata
    const { data: values, error: valuesError } = await supabase
      .from('task_custom_values')
      .select(
        `
        id,
        task_id,
        field_id,
        value_text,
        value_number,
        value_date,
        created_at,
        updated_at,
        custom_fields!inner(
          id,
          field_name,
          field_type,
          options
        )
        `
      )
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })

    if (valuesError) {
      console.error('Custom values fetch error:', valuesError)
      return NextResponse.json(
        { success: false, error: valuesError.message },
        { status: 500 }
      )
    }

    // Flatten the response to include field metadata
    const flattenedValues = values?.map((val: any) => ({
      id: val.id,
      task_id: val.task_id,
      field_id: val.field_id,
      value_text: val.value_text,
      value_number: val.value_number,
      value_date: val.value_date,
      created_at: val.created_at,
      updated_at: val.updated_at,
      field_name: val.custom_fields?.field_name,
      field_type: val.custom_fields?.field_type,
      options: val.custom_fields?.options,
    })) || []

    return NextResponse.json({
      success: true,
      data: flattenedValues,
    })
  } catch (err: any) {
    console.error('Custom values GET error:', err)
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/tasks/[id]/custom-values
 * Set or update a custom field value for a task
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase, error } = await getAuthUser(req)

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: taskId } = await params
    const body = await req.json()

    // Validate required fields
    if (!body.field_id) {
      return NextResponse.json(
        { success: false, error: 'field_id is required' },
        { status: 400 }
      )
    }

    // Verify task exists
    const { data: task, error: taskError } = await supabase
      .from('work_items')
      .select('id, project_id')
      .eq('id', taskId)
      .single()

    let projectId = task?.project_id

    if (taskError || !task) {
      // Try legacy tasks table
      const { data: legacyTask, error: legacyError } = await supabase
        .from('tasks')
        .select('id, project_id')
        .eq('id', taskId)
        .single()

      if (legacyError || !legacyTask) {
        return NextResponse.json(
          { success: false, error: 'Task not found' },
          { status: 404 }
        )
      }
      projectId = legacyTask.project_id
    }

    // Verify field exists and belongs to the task's project
    const { data: field, error: fieldError } = await supabase
      .from('custom_fields')
      .select('id, field_type, options, project_id')
      .eq('id', body.field_id)
      .eq('project_id', projectId)
      .single()

    if (fieldError || !field) {
      return NextResponse.json(
        { success: false, error: 'Custom field not found in this project' },
        { status: 404 }
      )
    }

    // Validate value based on field type
    const value = body.value
    let valueText = null
    let valueNumber = null
    let valueDate = null

    if (value === null || value === undefined || value === '') {
      // Allow null values
    } else if (field.field_type === 'text') {
      valueText = String(value)
    } else if (field.field_type === 'number') {
      const numValue = Number(value)
      if (isNaN(numValue)) {
        return NextResponse.json(
          { success: false, error: 'Invalid number value' },
          { status: 400 }
        )
      }
      valueNumber = numValue
    } else if (field.field_type === 'date') {
      // Validate date format (YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
        return NextResponse.json(
          { success: false, error: 'Invalid date format (use YYYY-MM-DD)' },
          { status: 400 }
        )
      }
      valueDate = String(value)
    } else if (field.field_type === 'dropdown') {
      if (!field.options?.includes(value)) {
        return NextResponse.json(
          { success: false, error: `Invalid option. Valid options are: ${field.options?.join(', ')}` },
          { status: 400 }
        )
      }
      valueText = String(value)
    }

    // Upsert the custom value
    const { data: customValue, error: upsertError } = await supabase
      .from('task_custom_values')
      .upsert(
        [
          {
            task_id: taskId,
            field_id: body.field_id,
            value_text: valueText,
            value_number: valueNumber,
            value_date: valueDate,
          },
        ],
        { onConflict: 'task_id,field_id' }
      )
      .select()
      .single()

    if (upsertError) {
      console.error('Custom value upsert error:', upsertError)
      return NextResponse.json(
        { success: false, error: upsertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: customValue,
      },
      { status: 201 }
    )
  } catch (err: any) {
    console.error('Custom values POST error:', err)
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    )
  }
}
