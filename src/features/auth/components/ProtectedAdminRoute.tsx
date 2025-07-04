import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LoadingSpinner } from '../../../shared/components/ui/LoadingSpinner'
import { useAdmin } from '../../admin/contexts/AdminContext'
import { useAuth } from '../../auth/contexts/AuthContext'

interface ProtectedAdminRouteProps {
  children: React.ReactNode
}

export function ProtectedAdminRoute({ children }: ProtectedAdminRouteProps) {
  const { admin, isAdmin, loading } = useAdmin()
  const { userRoles } = useAuth()
  const navigate = useNavigate()

  // Check if user has any role that grants admin dashboard access
  const canAccessAdminDashboard = isAdmin || userRoles.includes('mantra_curator') || 
                                 userRoles.includes('admin') || userRoles.includes('super_admin')

  useEffect(() => {
    if (!loading && (!admin || !canAccessAdminDashboard)) {
      navigate('/admin/login')
    }
  }, [admin, isAdmin, canAccessAdminDashboard, loading, navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!admin || !canAccessAdminDashboard) {
    return null
  }

  return <>{children}</>
}