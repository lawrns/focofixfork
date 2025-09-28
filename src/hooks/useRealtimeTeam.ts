import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'
import { TeamMember } from '@/lib/validation/schemas/team-member.schema'

interface UseRealtimeTeamOptions {
  projectId?: string
  organizationId?: string
  enabled?: boolean
}

interface TeamMemberEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: TeamMember | null
  old: TeamMember | null
}

export function useRealtimeTeam(options: UseRealtimeTeamOptions = {}) {
  const { projectId, organizationId, enabled = true } = options
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || (!projectId && !organizationId)) return

    let channel: RealtimeChannel

    const setupRealtimeSubscription = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Build the channel name and filter
        const channelName = projectId
          ? `project_team_${projectId}`
          : `organization_team_${organizationId}`

        const table = projectId ? 'project_team_assignments' : 'organization_members'
        const filter = projectId
          ? `project_id=eq.${projectId}`
          : `organization_id=eq.${organizationId}`

        channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table,
              filter,
            },
            (payload) => {
              console.log('Realtime team member change:', payload)

              const event: TeamMemberEvent = {
                eventType: payload.eventType,
                new: payload.new as TeamMember | null,
                old: payload.old as TeamMember | null,
              }

              handleTeamMemberChange(event)
            }
          )
          .subscribe((status) => {
            console.log('Realtime subscription status:', status)
            if (status === 'SUBSCRIBED') {
              setIsLoading(false)
            } else if (status === 'CHANNEL_ERROR') {
              setError('Failed to connect to real-time updates')
              setIsLoading(false)
            } else if (status === 'TIMED_OUT') {
              setError('Real-time connection timed out')
              setIsLoading(false)
            }
          })

        // Initial fetch of team members
        await fetchTeamMembers()

      } catch (err) {
        console.error('Error setting up real-time team subscription:', err)
        setError('Failed to setup real-time updates')
        setIsLoading(false)
      }
    }

    const fetchTeamMembers = async () => {
      try {
        const table = projectId ? 'project_team_assignments' : 'organization_members'
        let query = supabase
          .from(table)
          .select('*')

        if (projectId) {
          query = query.eq('project_id', projectId)
        } else if (organizationId) {
          query = query.eq('organization_id', organizationId)
        }

        const { data, error } = await query

        if (error) {
          console.error('Error fetching team members:', error)
          setError('Failed to fetch team members')
          return
        }

        // Transform data to match TeamMember type
        const transformedData = (data || []).map((item: any) => {
          if (projectId) {
            // Transform project_team_assignments data
            return {
              user_id: item.user_id,
              organization_id: organizationId || '', // Will need to get this from project
              project_id: item.project_id,
              role: item.role,
              added_by: item.assigned_by || '',
              added_at: item.assigned_at || new Date().toISOString(),
            }
          } else {
            // Transform organization_members data
            return {
              user_id: item.user_id,
              organization_id: item.organization_id,
              project_id: null,
              role: item.role,
              added_by: item.invited_by || '',
              added_at: item.invited_at || item.joined_at || new Date().toISOString(),
            }
          }
        })

        setTeamMembers(transformedData)
      } catch (err) {
        console.error('Error in fetchTeamMembers:', err)
        setError('Failed to fetch team members')
      }
    }

    const handleTeamMemberChange = (event: TeamMemberEvent) => {
      setTeamMembers(currentMembers => {
        switch (event.eventType) {
          case 'INSERT':
            if (event.new) {
              // Check if member already exists (avoid duplicates)
              const exists = currentMembers.some(
                m => m.user_id === event.new!.user_id &&
                m.organization_id === event.new!.organization_id &&
                m.project_id === event.new!.project_id
              )
              if (!exists) {
                return [...currentMembers, event.new]
              }
            }
            return currentMembers

          case 'UPDATE':
            if (event.new) {
              return currentMembers.map(member =>
                member.user_id === event.new!.user_id &&
                member.organization_id === event.new!.organization_id &&
                member.project_id === event.new!.project_id
                  ? { ...member, ...event.new }
                  : member
              )
            }
            return currentMembers

          case 'DELETE':
            if (event.old) {
              return currentMembers.filter(member =>
                !(member.user_id === event.old!.user_id &&
                  member.organization_id === event.old!.organization_id &&
                  member.project_id === event.old!.project_id)
              )
            }
            return currentMembers

          default:
            return currentMembers
        }
      })
    }

    setupRealtimeSubscription()

    // Cleanup function
    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [projectId, organizationId, enabled])

  const refetch = async () => {
    // Re-fetch team members manually
    if (!projectId && !organizationId) return

    try {
      const table = projectId ? 'project_team_assignments' : 'organization_members'
      let query = supabase
        .from(table)
        .select('*')

      if (projectId) {
        query = query.eq('project_id', projectId)
      } else if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error refetching team members:', error)
        setError('Failed to refetch team members')
        return
      }

      // Transform data to match TeamMember type
      const transformedData = (data || []).map((item: any) => {
        if (projectId) {
          // Transform project_team_assignments data
          return {
            user_id: item.user_id,
            organization_id: organizationId || '', // Will need to get this from project
            project_id: item.project_id,
            role: item.role,
            added_by: item.assigned_by || '',
            added_at: item.assigned_at || new Date().toISOString(),
          }
        } else {
          // Transform organization_members data
          return {
            user_id: item.user_id,
            organization_id: item.organization_id,
            project_id: null,
            role: item.role,
            added_by: item.invited_by || '',
            added_at: item.invited_at || item.joined_at || new Date().toISOString(),
          }
        }
      })

      setTeamMembers(transformedData)
    } catch (err) {
      console.error('Error in refetch:', err)
      setError('Failed to refetch team members')
    }
  }

  return {
    teamMembers,
    isLoading,
    error,
    refetch,
  }
}

