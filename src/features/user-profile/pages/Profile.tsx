import { Calendar, Edit2, Mail, Save, Shield, User, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../../../shared/components/ui/Button'
import { LoadingSpinner } from '../../../shared/components/ui/LoadingSpinner'
import { supabase } from '../../../shared/lib/supabase'
import { useAdmin } from '../../admin/contexts/AdminContext'
import { useAuth } from '../../auth/contexts/AuthContext'

export function Profile() {
  const { user } = useAuth()
  const { isAdmin } = useAdmin()
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [userBookings, setUserBookings] = useState<any[]>([])
  const [userQueries, setUserQueries] = useState<any[]>([])
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    phone: '',
    bio: ''
  })
  const [errors, setErrors] = useState<any>({})

  useEffect(() => {
    if (user) {
      // Initialize profile data from user metadata
      setProfileData({
        fullName: user.user_metadata?.full_name || '',
        email: user.email || '',
        phone: user.user_metadata?.phone || '',
        bio: user.user_metadata?.bio || ''
      })
      
      fetchUserData()
    }
  }, [user])

  const fetchUserData = async () => {
    if (!user) return

    try {
      setLoading(true)

      // Fetch user's bookings
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (bookingsError) throw bookingsError

      // Fetch user's queries
      const { data: queries, error: queriesError } = await supabase
        .from('yoga_queries')
        .select('*')
        .eq('email', user.email)
        .order('created_at', { ascending: false })

      if (queriesError) throw queriesError

      setUserBookings(bookings || [])
      setUserQueries(queries || [])
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setProfileData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev: any) => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: any = {}
    
    if (!profileData.fullName.trim()) newErrors.fullName = 'Full name is required'
    if (!profileData.email.trim()) newErrors.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(profileData.email)) newErrors.email = 'Email is invalid'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSaveProfile = async () => {
    if (!validateForm()) return

    try {
      setLoading(true)

      // Update user metadata in Supabase Auth
      const { error } = await supabase.auth.updateUser({
        email: profileData.email,
        data: {
          full_name: profileData.fullName,
          phone: profileData.phone,
          bio: profileData.bio
        }
      })

      if (error) throw error

      setEditing(false)
      alert('Profile updated successfully!')
    } catch (error: any) {
      setErrors({ general: error.message })
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'responded': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">Please sign in to view your profile.</p>
          <a href="/login" className="btn-primary">
            Sign In
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {profileData.fullName || 'Your Profile'}
                </h1>
                <div className="flex items-center space-x-4 mt-2">
                  <p className="text-gray-600 flex items-center">
                    <Mail className="w-4 h-4 mr-1" />
                    {user.email}
                  </p>
                  {isAdmin && (
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium flex items-center">
                      <Shield className="w-3 h-3 mr-1" />
                      Admin
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              {editing ? (
                <>
                  <Button
                    onClick={() => setEditing(false)}
                    variant="outline"
                    size="sm"
                    className="flex items-center"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveProfile}
                    loading={loading}
                    size="sm"
                    className="flex items-center"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Save
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setEditing(true)}
                  variant="outline"
                  size="sm"
                  className="flex items-center"
                >
                  <Edit2 className="w-4 h-4 mr-1" />
                  Edit Profile
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Information */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Profile Information</h2>
              
              {errors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-red-600 text-sm">{errors.general}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      name="fullName"
                      value={profileData.fullName}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.fullName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter your full name"
                    />
                  ) : (
                    <p className="text-gray-900">{profileData.fullName || 'Not provided'}</p>
                  )}
                  {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  {editing ? (
                    <input
                      type="email"
                      name="email"
                      value={profileData.email}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter your email"
                    />
                  ) : (
                    <p className="text-gray-900">{profileData.email}</p>
                  )}
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  {editing ? (
                    <input
                      type="tel"
                      name="phone"
                      value={profileData.phone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your phone number"
                    />
                  ) : (
                    <p className="text-gray-900">{profileData.phone || 'Not provided'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bio
                  </label>
                  {editing ? (
                    <textarea
                      name="bio"
                      rows={3}
                      value={profileData.bio}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Tell us about yourself..."
                    />
                  ) : (
                    <p className="text-gray-900">{profileData.bio || 'No bio provided'}</p>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    Member since {formatDate(user.created_at)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Activity */}
          <div className="lg:col-span-2">
            <div className="space-y-8">
              {/* Recent Bookings */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Bookings</h2>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner size="md" />
                  </div>
                ) : userBookings.length > 0 ? (
                  <div className="space-y-4">
                    {userBookings.slice(0, 5).map((booking) => (
                      <div key={booking.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-gray-900">{booking.class_name}</h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(booking.status)}`}>
                            {booking.status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>Instructor: {booking.instructor}</p>
                          <p>Date: {formatDate(booking.class_date)}</p>
                          <p>Time: {booking.class_time}</p>
                        </div>
                      </div>
                    ))}
                    {userBookings.length > 5 && (
                      <p className="text-sm text-gray-500 text-center">
                        And {userBookings.length - 5} more booking{userBookings.length - 5 !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No bookings yet</p>
                    <a href="/book-class" className="text-blue-600 hover:text-blue-700 font-medium">
                      Book your first class →
                    </a>
                  </div>
                )}
              </div>

              {/* Recent Queries */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Your Questions</h2>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner size="md" />
                  </div>
                ) : userQueries.length > 0 ? (
                  <div className="space-y-4">
                    {userQueries.slice(0, 3).map((query) => (
                      <div key={query.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-gray-900">{query.subject}</h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(query.status)}`}>
                            {query.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{query.message}</p>
                        <div className="text-xs text-gray-500">
                          Asked on {formatDate(query.created_at)}
                        </div>
                        {query.response && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-900">{query.response}</p>
                            {query.responded_at && (
                              <p className="text-xs text-blue-600 mt-1">
                                Responded on {formatDate(query.responded_at)}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {userQueries.length > 3 && (
                      <p className="text-sm text-gray-500 text-center">
                        And {userQueries.length - 3} more question{userQueries.length - 3 !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No questions asked yet</p>
                    <a href="/contact" className="text-blue-600 hover:text-blue-700 font-medium">
                      Ask a question →
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}