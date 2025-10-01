const { createClient } = require('@supabase/supabase-js')

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
      // List projects - get projects where user is a member via organization_members
      const { searchParams } = event.queryStringParameters || {}

      const organizationId = searchParams?.organization_id
      const status = searchParams?.status
      const priority = searchParams?.priority
      const limit = searchParams?.limit ? parseInt(searchParams.limit) : 10
      const offset = searchParams?.offset ? parseInt(searchParams.offset) : 0

      // Build query to get user's projects through organization membership
      let query = supabase
        .from('projects')
        .select(`
          *,
          organizations (
            name
          )
        `)
        .eq('created_by', userId) // Projects created by the user
        .order('created_at', { ascending: false })

      // Apply filters
      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      if (status) {
        query = query.eq('status', status)
      }

      if (priority) {
        query = query.eq('priority', priority)
      }

      // Get total count first
      const { count } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', userId)

      // Apply pagination
      query = query.range(offset, offset + limit - 1)

      const { data: projects, error } = await query

      if (error) {
        console.error('Error fetching projects:', error)
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ success: false, error: 'Failed to fetch projects' }),
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: projects || [],
          pagination: {
            total: count || 0,
            limit,
            offset,
          },
        }),
      }
    }

    if (event.httpMethod === 'POST') {
      // Create project
      const body = JSON.parse(event.body || '{}')

      // Validate required fields
      if (!body.name) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'Project name is required' }),
        }
      }

      const projectData = {
        name: body.name,
        description: body.description || null,
        organization_id: body.organization_id || null,
        status: body.status || 'planning',
        priority: body.priority || 'medium',
        created_by: userId,
        start_date: body.start_date || null,
        due_date: body.due_date || null,
        progress_percentage: body.progress_percentage || 0,
      }

      const { data: project, error } = await supabase
        .from('projects')
        .insert(projectData)
        .select()
        .single()

      if (error) {
        console.error('Error creating project:', error)
        let statusCode = 500
        if (error.code === '23505') { // unique_violation
          statusCode = 409
        }
        return {
          statusCode,
          headers,
          body: JSON.stringify({ success: false, error: 'Failed to create project' }),
        }
      }

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ success: true, data: project }),
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
