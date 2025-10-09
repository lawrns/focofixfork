const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client with service role key to bypass RLS
// Updated: 2025-10-09 - Force redeploy
const supabaseUrl = "https://czijxfbkihrauyjwcgfn.supabase.co"
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6aWp4ZmJraWhyYXV5andjZ2ZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjE3NTk4MywiZXhwIjoyMDY3NzUxOTgzfQ._JnBgXZLk23daPdnCUksfvooIJk2r9mFyclO8MnvfQ8"
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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

    if (event.httpMethod === 'GET') {
      // Get user's organizations - organizations where user is a member
      const { data: memberships, error } = await supabase
        .from('organization_members')
        .select(`
          organization_id,
          role,
          organizations (
            id,
            name,
            created_by,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', userId)

      if (error) {
        console.error('Error fetching organization memberships:', error)
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ success: false, error: 'Failed to fetch organizations' }),
        }
      }

      const organizations = memberships
        ?.map(membership => membership.organizations)
        .filter(Boolean) || []

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: organizations,
        }),
      }
    }

    if (event.httpMethod === 'POST') {
      // Create organization
      const body = JSON.parse(event.body || '{}')
      const { name } = body

      if (!name) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'Organization name is required' }),
        }
      }

      // Create organization
      const { data: organization, error: createError } = await supabase
        .from('organizations')
        .insert({
          name: name.trim(),
          slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          created_by: userId
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating organization:', createError)
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ success: false, error: 'Failed to create organization' }),
        }
      }

      // Add creator as owner in organization_members
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: organization.id,
          user_id: userId,
          role: 'owner',
          joined_at: new Date().toISOString()
        })

      if (memberError) {
        console.error('Error adding creator to organization:', memberError)
        // Don't fail the whole operation, but log the error
      }

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          success: true,
          data: organization,
        }),
      }
    }

    // Method not allowed
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' }),
    }

  } catch (error) {
    console.error('Organizations API error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'Internal server error' }),
    }
  }
}
