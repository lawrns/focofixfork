const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client with service role key to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

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
      // List projects - get projects user can access (created by them or in their organizations)
      const { searchParams } = event.queryStringParameters || {}

      const organizationId = searchParams?.organization_id
      const status = searchParams?.status
      const priority = searchParams?.priority
      const limit = searchParams?.limit ? parseInt(searchParams.limit) : 10
      const offset = searchParams?.offset ? parseInt(searchParams.offset) : 0

      // Get user's organization memberships first
      const { data: userOrgs, error: orgError } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', userId)

      if (orgError) {
        console.error('Error fetching user organizations:', orgError)
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ success: false, error: 'Failed to fetch user organizations' }),
        }
      }

      const userOrgIds = userOrgs?.map(org => org.organization_id) || []
      console.log('User belongs to organizations:', userOrgIds)

      // Build query to get all projects user has access to:
      // 1. Projects they created
      // 2. Projects in organizations they belong to
      let query = supabase
        .from('projects')
        .select(`
          *,
          organizations (
            name
          )
        `)

      // Apply access filters - user can see projects if:
      // - They created it, OR
      // - It belongs to an organization they're a member of
      if (userOrgIds.length > 0) {
        query = query.or(`created_by.eq.${userId},organization_id.in.(${userOrgIds.join(',')})`)
      } else {
        // If user has no organization memberships, only show projects they created
        query = query.eq('created_by', userId)
      }

      query = query.order('created_at', { ascending: false })

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

      // Get total count first (apply same filters as main query)
      let countQuery = supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })

      if (userOrgIds.length > 0) {
        countQuery = countQuery.or(`created_by.eq.${userId},organization_id.in.(${userOrgIds.join(',')})`)
      } else {
        countQuery = countQuery.eq('created_by', userId)
      }

      // Apply same filters to count query
      if (organizationId) {
        countQuery = countQuery.eq('organization_id', organizationId)
      }
      if (status && status !== 'all') {
        countQuery = countQuery.eq('status', status)
      }
      if (priority && priority !== 'all') {
        countQuery = countQuery.eq('priority', priority)
      }

      const { count } = await countQuery

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
