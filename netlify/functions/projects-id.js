const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// Simple validation schema (inline instead of importing)
function validateProjectUpdate(data) {
  const errors = []

  if (data.name !== undefined && (typeof data.name !== 'string' || data.name.length < 1 || data.name.length > 500)) {
    errors.push('Name must be a string between 1 and 500 characters')
  }

  if (data.description !== undefined && data.description !== null && (typeof data.description !== 'string' || data.description.length > 2000)) {
    errors.push('Description must be a string with max 2000 characters')
  }

  if (data.status !== undefined && !['planning', 'active', 'on_hold', 'completed', 'cancelled'].includes(data.status)) {
    errors.push('Invalid status value')
  }

  if (data.priority !== undefined && !['low', 'medium', 'high', 'urgent'].includes(data.priority)) {
    errors.push('Invalid priority value')
  }

  if (data.progress_percentage !== undefined && (typeof data.progress_percentage !== 'number' || data.progress_percentage < 0 || data.progress_percentage > 100)) {
    errors.push('Progress percentage must be a number between 0 and 100')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-user-id',
    'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  }

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    }
  }

  try {
    const userId = event.headers['x-user-id']

    if (!userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ success: false, error: 'Authentication required' }),
      }
    }

    // Extract project ID from path
    const pathParts = event.path.split('/')
    const projectId = pathParts[pathParts.length - 1]

    if (!projectId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Project ID is required' }),
      }
    }

    if (event.httpMethod === 'GET') {
      // Get project - check if user owns it
      const { data: project, error } = await supabase
        .from('projects')
        .select(`
          *,
          organizations (
            name
          )
        `)
        .eq('id', projectId)
        .eq('created_by', userId)
        .single()

      if (error || !project) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ success: false, error: 'Project not found' }),
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data: project }),
      }
    }

    if (event.httpMethod === 'PUT') {
      // Update project
      const body = JSON.parse(event.body || '{}')

      // Validate request body
      const validation = validateProjectUpdate(body)
      if (!validation.isValid) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Validation failed',
            details: validation.errors
          }),
        }
      }

      // Check if project exists and user owns it
      const { data: existingProject, error: checkError } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('created_by', userId)
        .single()

      if (checkError || !existingProject) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ success: false, error: 'Project not found' }),
        }
      }

      // Prepare update data
      const updateData = {
        ...body,
        updated_at: new Date().toISOString()
      }

      const { data: project, error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', projectId)
        .eq('created_by', userId)
        .select()
        .single()

      if (error) {
        console.error('Error updating project:', error)
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ success: false, error: 'Failed to update project' }),
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data: project }),
      }
    }

    if (event.httpMethod === 'DELETE') {
      // Delete project - check ownership first
      const { data: existingProject, error: checkError } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('created_by', userId)
        .single()

      if (checkError || !existingProject) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ success: false, error: 'Project not found' }),
        }
      }

      // Delete the project
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('created_by', userId)

      if (error) {
        console.error('Error deleting project:', error)
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ success: false, error: 'Failed to delete project' }),
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Project deleted successfully' }),
      }
    }

    // Method not allowed
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' }),
    }

  } catch (error) {
    console.error('Project API error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'Internal server error' }),
    }
  }
}
