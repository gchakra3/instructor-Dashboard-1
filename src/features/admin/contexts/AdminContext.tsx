import { User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../../../shared/lib/supabase';

interface UserRoleData {
  roles: {
    name: string
  } | null
}

interface AdminContextType {
  admin: User | null
  loading: boolean
  isAdmin: boolean
  isMantraCurator: boolean
  signInAdmin: (email: string, password: string) => Promise<void>
  signOutAdmin: () => Promise<void>
}

const AdminContext = createContext<AdminContextType | undefined>(undefined)

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isMantraCurator, setIsMantraCurator] = useState(false)

  const checkUserRoles = async (user: User | null) => {
    if (!user) {
      setIsAdmin(false)
      setIsMantraCurator(false)
      return
    }

    try {
      console.log('Checking roles for user:', user.email)
      
      // Check if user is in admin_users table (legacy admin check)
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();
        
      // Check user roles
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('roles(name)')
        .eq('user_id', user.id) as { data: UserRoleData[] | null, error: any }
        
      console.log('Role check result:', { roleData, roleError });
      
      // User roles from the user_roles table
      const userRoles = roleData?.map(item => item.roles?.name).filter(Boolean) || [];
      
      // Check if user is admin (either in admin_users table OR has admin role)
      const isAdminUser = adminData?.role === 'admin' || adminData?.role === 'super_admin' || 
                         userRoles.includes('admin') || userRoles.includes('super_admin');
                         
      // Check if user is a mantra curator
      const isMantraCuratorUser = userRoles.includes('mantra_curator');

      if (adminError && roleError) {
        console.error('Role check error:', adminError, roleError);
        // For known admin emails during testing
        if (user.email === 'gourab.master@gmail.com') {
          console.log('Allowing access for known admin email');
          setIsAdmin(true);
          setIsMantraCurator(false);
          return;
        }
        setIsAdmin(false);
        setIsMantraCurator(false);
      } else {
        console.log('User roles:', userRoles);
        setIsAdmin(isAdminUser);
        setIsMantraCurator(isMantraCuratorUser);
      }
    } catch (error) {
      // Added better error handling here to prevent uncaught exceptions
      console.error('Exception during admin check:', error)
      
      // For known admin emails during testing
      if (user.email === 'gourab.master@gmail.com') {
        console.log('Exception occurred, but allowing access for known admin email')
        setIsAdmin(true);
        setIsMantraCurator(false);
        return;
      }
      setIsAdmin(false);
      setIsMantraCurator(false);
    } finally {
      // Make sure we always clear loading state
      // even if there was an error
    }
  }

  useEffect(() => {
    let mounted = true

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      
      const user = session?.user ?? null
      console.log('Initial session user:', user?.email)
      setAdmin(user)
      
      // Wrap checkUserRoles in try/catch to prevent uncaught errors
      try {
        checkUserRoles(user).finally(() => {
          if (mounted) setLoading(false)
        })
      } catch (error) {
        console.error('Error in initial role check:', error)
        if (mounted) setLoading(false)
      }
    }).catch(error => {
      console.error('Error getting initial session:', error)
      if (mounted) setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return
        
        const user = session?.user ?? null
        console.log('Auth state changed, user:', user?.email)
        setAdmin(user)
        
        // Wrap checkUserRoles in try/catch to prevent uncaught errors
        try {
          checkUserRoles(user).finally(() => {
            if (mounted) setLoading(false)
          })
        } catch (error) {
          console.error('Error in auth change role check:', error)
          if (mounted) setLoading(false)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, []);

  const signInAdmin = async (email: string, password: string) => {
    console.log('Attempting admin sign in for:', email)
    
    // First, sign in with regular auth
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (authError) {
      console.error('Auth sign in error:', authError)
      throw authError
    }

    console.log('Auth sign in successful, checking admin status...')
    
    // For debugging, allow known admin email to proceed
    if (email === 'gourab.master@gmail.com') {
      console.log('Allowing access for known admin email during debugging');
      return;
    }

    // The rest of the admin checks will happen in the auth change listener via checkUserRoles
    console.log('Sign in successful, checking admin status...');
  }

  const signOutAdmin = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const value = {
    admin,
    loading,
    signInAdmin,
    signOutAdmin,
    isAdmin,
    isMantraCurator,
  }

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin() {
  const context = useContext(AdminContext)
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider')
  }
  return context
}