const { createClient } = require('@supabase/supabase-js')
const { ProjectsService } = require('../../lib/services/projects')

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-user-id',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

    // Handle different HTTP methods
    if (event.httpMethod === 'GET') {
      // List projects
      const { searchParams } = new URL(event.rawUrl + '?' + event.rawQueryString)

      const organizationId = searchParams.get('organization_id')
      const status = searchParams.get('status')
      const priority = searchParams.get('priority')
      const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')) : 10
      const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')) : 0

      const result = await ProjectsService.getUserProjects(userId, {
        organization_id: organizationId,
        status,
        priority,
        limit,
        offset,
      })

      if (!result.success) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ success: false, error: result.error }),
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: result.data,
          pagination: result.pagination,
        }),
      }
    }

    if (event.httpMethod === 'POST') {
      // Create project
      const body = JSON.parse(event.body)

      const result = await ProjectsService.createProject(userId, body)

      if (!result.success) {
        let statusCode = 500
        if (result.error?.includes('already exists')) {
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
        statusCode: 201,
        headers,
        body: JSON.stringify({ success: true, data: result.data }),
      }
    }

    // Method not allowed
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' }),
    }

  } catch (error) {
    console.error('Projects API error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'Internal server error' }),
    }
  }
}
