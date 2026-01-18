/**
 * API routes for work item (task) dependency management
 *
 * POST   /api/work-items/[id]/dependencies    - Add a dependency
 * DELETE /api/work-items/[id]/dependencies    - Remove a dependency
 * GET    /api/work-items/[id]/dependencies    - List dependencies
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

import {
  canCreateDependency,
  type Dependency,
} from '@/features/tasks/validation/task-dependency-validation'
import {
  addDependencySchema,
  removeDependencySchema,
} from '@/features/tasks/validation/dependency.schema'

export const dynamic = 'force-dynamic'

/**
 * GET /api/work-items/[id]/dependencies
 * Retrieve all dependencies for a work item
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let authResponse: NextResponse | undefined;
  try {
    const { user, supabase, error, response } = await getAuthUser(req)
    authResponse = response;

    if (error || !user) {
      return mergeAuthResponse(NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }), authResponse)
    }

    const { id } = params

    // Get all dependencies where this work item depends on others
    const { data: dependencies, error: queryError } = await supabase
      .from('work_item_dependencies')
      .select('*')
      .eq('work_item_id', id)

    if (queryError) {
      return mergeAuthResponse(NextResponse.json(
        { success: false, error: 'Failed to fetch dependencies' },
        { status: 500 }
      ), authResponse)
    }

    return mergeAuthResponse(NextResponse.json({
      success: true,
      data: dependencies || [],
    }), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return mergeAuthResponse(NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    ), authResponse)
  }
}

/**
 * POST /api/work-items/[id]/dependencies
 * Add a new dependency (work_item_id depends on depends_on_id)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let authResponse: NextResponse | undefined;
  try {
    const { user, supabase, error, response } = await getAuthUser(req)
    authResponse = response;

    if (error || !user) {
      return mergeAuthResponse(NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }), authResponse)
    }

    const { id: workItemId } = params
    const body = await req.json()

    // If depends_on_id is provided in request, use it; otherwise use from body
    const depends_on_id = body.depends_on_id

    if (!depends_on_id) {
      return NextResponse.json(
        { success: false, error: 'depends_on_id is required' },
        { status: 400 }
      )
    }

    // Validate input schema
    const validationResult = addDependencySchema.safeParse({
      work_item_id: workItemId,
      depends_on_id,
    })

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input',
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      )
    }

    // Fetch all existing dependencies for this work item
    const { data: existingDependencies, error: fetchError } = await supabase
      .from('work_item_dependencies')
      .select('work_item_id, depends_on_id')

    if (fetchError) {
      return mergeAuthResponse(NextResponse.json(
        { success: false, error: 'Failed to validate dependencies' },
        { status: 500 }
      ), authResponse)
    }

    // Perform client-side validation
    const dependencyValidation = canCreateDependency(
      workItemId,
      depends_on_id,
      existingDependencies || []
    )

    if (!dependencyValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: dependencyValidation.error || 'Invalid dependency',
          code: getDependencyErrorCode(dependencyValidation.error),
        },
        { status: 400 }
      )
    }

    // Check if both work items exist in the same workspace
    const { data: workItem, error: workItemError } = await supabase
      .from('work_items')
      .select('workspace_id')
      .eq('id', workItemId)
      .single()

    if (workItemError || !workItem) {
      return mergeAuthResponse(NextResponse.json(
        { success: false, error: 'Work item not found' },
        { status: 404 }
      ), authResponse)
    }

    const { data: dependsOnItem, error: depError } = await supabase
      .from('work_items')
      .select('workspace_id')
      .eq('id', depends_on_id)
      .single()

    if (depError || !dependsOnItem) {
      return mergeAuthResponse(NextResponse.json(
        { success: false, error: 'Dependency target not found' },
        { status: 404 }
      ), authResponse)
    }

    // Ensure both items are in the same workspace
    if (workItem.workspace_id !== dependsOnItem.workspace_id) {
      return mergeAuthResponse(NextResponse.json(
        { success: false, error: 'Cannot create cross-workspace dependencies' },
        { status: 400 }
      ), authResponse)
    }

    // Create the dependency
    const { data: newDependency, error: insertError } = await supabase
      .from('work_item_dependencies')
      .insert({
        work_item_id: workItemId,
        depends_on_id,
        dependency_type: 'blocks',
      })
      .select()
      .single()

    if (insertError) {

      // Check if it's a unique constraint violation
      if (insertError.code === '23505') {
        return mergeAuthResponse(NextResponse.json(
          {
            success: false,
            error: 'This dependency already exists',
            code: 'DUPLICATE_DEPENDENCY',
          },
          { status: 400 }
        ), authResponse)
      }

      return mergeAuthResponse(NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      ), authResponse)
    }

    return mergeAuthResponse(NextResponse.json(
      { success: true, data: newDependency },
      { status: 201 }
    ), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return mergeAuthResponse(NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    ), authResponse)
  }
}

/**
 * DELETE /api/work-items/[id]/dependencies
 * Remove a dependency
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let authResponse: NextResponse | undefined;
  try {
    const { user, supabase, error, response } = await getAuthUser(req)
    authResponse = response;

    if (error || !user) {
      return mergeAuthResponse(NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }), authResponse)
    }

    const { id: workItemId } = params
    const body = await req.json()

    const { depends_on_id } = body

    if (!depends_on_id) {
      return NextResponse.json(
        { success: false, error: 'depends_on_id is required' },
        { status: 400 }
      )
    }

    // Validate input schema
    const validationResult = removeDependencySchema.safeParse({
      work_item_id: workItemId,
      depends_on_id,
    })

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input',
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      )
    }

    // Delete the dependency
    const { error: deleteError } = await supabase
      .from('work_item_dependencies')
      .delete()
      .eq('work_item_id', workItemId)
      .eq('depends_on_id', depends_on_id)

    if (deleteError) {
      return mergeAuthResponse(NextResponse.json(
        { success: false, error: deleteError.message },
        { status: 500 }
      ), authResponse)
    }

    return mergeAuthResponse(NextResponse.json({
      success: true,
      data: { deleted: true },
    }), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return mergeAuthResponse(NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    ), authResponse)
  }
}

/**
 * Helper function to map validation errors to error codes
 */
function getDependencyErrorCode(
  errorMessage: string | undefined
): 'SELF_DEPENDENCY' | 'CIRCULAR_DEPENDENCY' | 'DUPLICATE_DEPENDENCY' | 'VALIDATION_ERROR' {
  if (!errorMessage) return 'VALIDATION_ERROR'

  if (errorMessage.includes('cannot depend on itself')) {
    return 'SELF_DEPENDENCY'
  }

  if (errorMessage.includes('circular')) {
    return 'CIRCULAR_DEPENDENCY'
  }

  if (errorMessage.includes('already exists')) {
    return 'DUPLICATE_DEPENDENCY'
  }

  return 'VALIDATION_ERROR'
}
