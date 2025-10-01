const { createClient } = require('@supabase/supabase-js')
const { ProjectsService } = require('../../lib/services/projects')
const { UpdateProjectSchema } = require('../../lib/validation/schemas/project.schema')

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

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
      // Get project
      const result = await ProjectsService.getProjectById(userId, projectId)

      if (!result.success) {
        const statusCode = result.error === 'Project not found' ? 404 : 500
        return {
          statusCode,
          headers,
          body: JSON.stringify({ success: false, error: result.error }),
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data: result.data }),
      }
    }

    if (event.httpMethod === 'PUT') {
      // Update project
      const body = JSON.parse(event.body)

      // Validate request body
      const validationResult = UpdateProjectSchema.safeParse(body)
      if (!validationResult.success) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Validation failed',
            details: validationResult.error.issues
          }),
        }
      }

      // Transform null values to undefined
      const updateData = {
        ...validationResult.data,
        description: validationResult.data.description === null ? undefined : validationResult.data.description,
        start_date: validationResult.data.start_date === null ? undefined : validationResult.data.start_date,
        due_date: validationResult.data.due_date === null ? undefined : validationResult.data.due_date,
      }

      const result = await ProjectsService.updateProject(userId, projectId, updateData)

      if (!result.success) {
        let statusCode = 500
        if (result.error === 'Project not found') {
          statusCode = 404
        } else if (result.error?.includes('already exists')) {
          statusCode = 409
        } else if (result.error?.includes('Invalid') || result.error?.includes('check your')) {
          statusCode = 400
        }

        return {
          statusCode,
          headers,
          body: JSON.stringify({ success: false, error: result.error }),
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data: result.data }),
      }
    }

    if (event.httpMethod === 'DELETE') {
      // Delete project
      const result = await ProjectsService.deleteProject(userId, projectId)

      if (!result.success) {
        const statusCode = result.error === 'Project not found' ? 404 : 500
        return {
          statusCode,
          headers,
          body: JSON.stringify({ success: false, error: result.error }),
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
