import { TrendingDown, TrendingUp, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { LoadingSpinner } from '../../../shared/components/ui/LoadingSpinner'
import { supabase } from '../../../shared/lib/supabase'

interface EngagementData {
  user_id: string
  email: string
  full_name: string
  total_bookings: number
  attended_classes: number
  articles_viewed: number
  last_activity: string
  engagement_status: 'active' | 'inactive' | 'dormant'
}

export function UserEngagementChart() {
  const [engagementData, setEngagementData] = useState<EngagementData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchEngagementData()
  }, [])

  const fetchEngagementData = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('user_engagement_metrics')
        .select('*')
        .order('total_bookings', { ascending: false })
        .limit(10)

      if (fetchError) throw fetchError

      setEngagementData(data || [])
    } catch (err: any) {
      console.error('Error fetching engagement data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'inactive':
        return 'bg-yellow-100 text-yellow-800'
      case 'dormant':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <TrendingUp className="w-4 h-4" />
      case 'inactive':
        return <TrendingDown className="w-4 h-4" />
      case 'dormant':
        return <TrendingDown className="w-4 h-4" />
      default:
        return <Users className="w-4 h-4" />
    }
  }

  const formatLastActivity = (dateString: string) => {
    if (!dateString) return 'Never'
    
    const date = new Date(dateString)
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffInDays === 0) return 'Today'
    if (diffInDays === 1) return 'Yesterday'
    if (diffInDays < 7) return `${diffInDays} days ago`
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
    return `${Math.floor(diffInDays / 30)} months ago`
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">User Engagement</h3>
        <div className="flex justify-center py-8">
          <LoadingSpinner size="md" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">User Engagement</h3>
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">Error loading engagement data: {error}</p>
          <button 
            onClick={fetchEngagementData}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Engaged Users</h3>
      
      <div className="space-y-4">
        {engagementData.length > 0 ? (
          engagementData.map((user) => (
            <div
              key={user.user_id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">
                    {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {user.full_name || 'No name'}
                  </p>
                  <p className="text-sm text-gray-600">{user.email}</p>
                  <p className="text-xs text-gray-500">
                    Last active: {formatLastActivity(user.last_activity)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {user.total_bookings || 0} bookings
                  </p>
                  <p className="text-xs text-gray-600">
                    {user.attended_classes || 0} attended
                  </p>
                  <p className="text-xs text-gray-600">
                    {user.articles_viewed || 0} articles viewed
                  </p>
                </div>
                
                <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(user.engagement_status)}`}>
                  {getStatusIcon(user.engagement_status)}
                  <span className="capitalize">{user.engagement_status}</span>
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No engagement data available</p>
            <p className="text-sm text-gray-500 mt-2">
              Data will appear here once users start interacting with the platform
            </p>
          </div>
        )}
      </div>
    </div>
  )
}