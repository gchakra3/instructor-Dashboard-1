import { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../../../shared/lib/supabase';

interface UserRoleData {
  roles: {
    name: string
  } | null
}

interface AuthContextType {
  user: User | null
  loading: boolean
  userRoles: string[]
  isMantraCurator: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userRoles, setUserRoles] = useState<string[]>([])
  const [isMantraCurator, setIsMantraCurator] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchUserRoles = async (session: Session | null) => {
    if (!session?.user) {
      setUserRoles([])
      setIsMantraCurator(false)
      return
    }

    try {
      // First try to get roles from user_roles table
      const { data, error } = await supabase
        .from('user_roles')
        .select('roles(name)')
        .eq('user_id', session.user.id) as { data: UserRoleData[] | null, error: any }
        
      if (error) throw error
        
      const roles = data?.map(item => item.roles?.name).filter((name): name is string => name != null) || []
      setUserRoles(roles)
      setIsMantraCurator(roles.includes('mantra_curator'))
      
    } catch (error) {
      console.error('Error fetching user roles:', error)
      
      // As a fallback, check the admin_users table
      try {
        const { data: adminData } = await supabase
          .from('admin_users')
          .select('role')
          .eq('email', session.user.email)
          .maybeSingle()
          
        if (adminData?.role === 'admin' || adminData?.role === 'super_admin') {
          setUserRoles([adminData.role])
          setIsMantraCurator(false)
        } else {
          setUserRoles(['user']) // Default fallback role
          setIsMantraCurator(false)
        }
      } catch (adminError) {
        console.error('Error checking admin status:', adminError)
        setUserRoles(['user']) // Default fallback role
        setIsMantraCurator(false)
      }
    }
  }

  useEffect(() => {
    let mounted = true

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      setUser(session?.user ?? null)
      fetchUserRoles(session).finally(() => {
        if (mounted) setLoading(false)
      })
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return
        setUser(session?.user ?? null)
        fetchUserRoles(session).finally(() => {
          if (mounted) setLoading(false)
        })
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const value = {
    user,
    loading,
    userRoles,
    isMantraCurator,
    signIn,
    signUp,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}