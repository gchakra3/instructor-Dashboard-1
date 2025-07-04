import { useEffect, useState } from 'react'
import { supabase } from '../../../shared/lib/supabase'

interface UserProfile {
  id: string
  user_id: string
  full_name: string
  phone: string
  bio: string
  experience_level: string
  created_at: string
  updated_at: string
  email: string
  user_created_at: string  
  user_roles?: string[]
  total_bookings?: number
  attended_classes?: number
  articles_viewed?: number
}

export function useUserProfiles() {
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfiles = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .rpc('get_user_profiles_for_admin')

      if (fetchError) {
        console.error('RPC Error:', fetchError)
        throw fetchError
      }

      setProfiles(data || [])
    } catch (err: any) {
      console.error('Error fetching user profiles:', err)
      setError(err.message || 'Failed to load user profiles')
      
      // Fallback: try to fetch profiles directly if RPC fails
      try {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('profiles')
          .select(`*`)
          .order('created_at', { ascending: false })

        if (fallbackError) throw fallbackError

        const transformedData = (fallbackData || []).map(profile => ({
          ...profile,
          user_id: profile.user_id || profile.id, // Ensure user_id is set
          experience_level: profile.role || 'user', 
          user_created_at: profile.created_at, 
          total_bookings: 0, 
          attended_classes: 0, 
          articles_viewed: 0, 
          user_roles: ['user'] // Default role
        }))

        setProfiles(transformedData)
        setError(null)
      } catch (fallbackErr: any) {
        console.error('Fallback fetch also failed:', fallbackErr)
        setError(fallbackErr.message)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfiles()
  }, [])

  return {
    profiles,
    loading,
    error,
    refetch: fetchProfiles
  }
}