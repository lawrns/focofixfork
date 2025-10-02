import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = supabaseAdmin
    const { email, name, role } = await request.json()

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      )
    }

    if (!role || !['owner', 'member'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "owner" or "member"' },
        { status: 400 }
      )
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get current user's organization and role
    const { data: currentUserMember, error: currentUserError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single()

    if (currentUserError || !currentUserMember) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Only owners can invite members
    if (currentUserMember.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only organization owners can invite members' },
        { status: 403 }
      )
    }

    // Generate a random password
    const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!`

    // Check if user already exists in users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    let userId: string

    if (existingUser) {
      // User already exists
      userId = existingUser.id
    } else {
      // Create new user in Supabase Auth
      const { data: authData, error: createAuthError } = await supabase.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          display_name: name
        }
      })

      if (createAuthError) {
        console.error('Error creating auth user:', createAuthError)
        return NextResponse.json(
          { error: 'Failed to create user account' },
          { status: 500 }
        )
      }

      userId = authData.user.id

      // Create user in users table
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email,
          full_name: name,
          is_active: true
        })

      if (userError) {
        console.error('Error creating user record:', userError)
        // Continue anyway, the auth user was created
      }

      // Create user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          user_id: userId,
          bio: `Member of organization`
        })

      if (profileError) {
        console.error('Error creating user profile:', profileError)
        // Continue anyway
      }
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', currentUserMember.organization_id)
      .eq('user_id', userId)
      .single()

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this organization' },
        { status: 400 }
      )
    }

    // Add user to organization
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: currentUserMember.organization_id,
        user_id: userId,
        role,
        is_active: true
      })

    if (memberError) {
      console.error('Error adding member to organization:', memberError)
      return NextResponse.json(
        { error: 'Failed to add member to organization' },
        { status: 500 }
      )
    }

    // Send welcome email
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/send-welcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          password: tempPassword,
          organization: 'Your Organization'
        })
      })
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({ 
      success: true,
      message: `Invitation sent to ${email}`,
      tempPassword // In production, don't return this - only send via email
    })

  } catch (error) {
    console.error('Error in POST /api/organization/invite:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

