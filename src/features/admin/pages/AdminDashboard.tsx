import {
  BarChart3,
  BookOpen,
  Calendar,
  CreditCard,
  FileText,
  GraduationCap,
  LogOut,
  Mail,
  MessageCircle,
  Settings,
  Shield,
  TrendingUp,
  Users as UsersIcon,
  Award
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../../shared/components/ui/Button'
import { LoadingSpinner } from '../../../shared/components/ui/LoadingSpinner'
import { supabase } from '../../../shared/lib/supabase'
import { DashboardMetrics } from '../../analytics/components/DashboardMetrics'
import { UserEngagementChart } from '../../analytics/components/UserEngagementChart'
import { useAuth } from '../../auth/contexts/AuthContext'
import { useUserProfiles } from '../../user-profile/hooks/useUserProfiles'
import { ArticleManagement } from '../components/ArticleManagement'
import { BookingManagement } from '../components/BookingManagement'
import { BusinessSettings } from '../components/BusinessSettings'
import { ClassTypeManager } from '../components/ClassTypeManager'
import { FormSubmissions } from '../components/FormSubmissions'
import { InstructorManagement } from '../components/InstructorManagement'
import { NewsletterManagement } from '../components/NewsletterManagement'
import { UserRoleManagement } from '../components/UserRoleManagement'
import { WeeklyClassScheduler } from '../components/WeeklyClassScheduler'
import { useAdmin } from '../contexts/AdminContext'

interface DashboardStats {
  totalBookings: number
  totalQueries: number
  totalContacts: number
  totalArticles: number
  publishedArticles: number
  totalViews: number
  totalUsers: number
  activeSubscriptions: number
  monthlyRevenue: number
  recentBookings: any[]
  pendingQueries: any[]
  newContacts: any[]
  allBookings: any[]
  allQueries: any[]
  allContacts: any[]
  allInstructors: any[]
  allClassTypes: any[]
  allSubscriptions: any[]
  allTransactions: any[]
}

export function AdminDashboard() {
  const { admin, isAdmin, signOutAdmin } = useAdmin()
  const { isMantraCurator, user } = useAuth()
  const { profiles, refetch: refetchProfiles } = useUserProfiles()
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(() => {
    // Set default tab based on user role
    if (isMantraCurator && !isAdmin) {
      return 'articles'
    }
    return 'overview'
  })
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [showRoleManagement, setShowRoleManagement] = useState(false)

  useEffect(() => {
    if (!isAdmin && !isMantraCurator) {
      navigate('/admin/login')
      return
    }
    
    // Only fetch full dashboard data for admins
    if (isAdmin) {
      fetchDashboardData()
    } else {
      // For curators, just set loading to false
      setLoading(false)
    }
  }, [isAdmin, isMantraCurator, navigate])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      console.log('Fetching dashboard data for admin:', admin?.email)

      // Fetch all data with better error handling
      const [
        bookingsRes, 
        queriesRes, 
        contactsRes, 
        articlesRes, 
        viewsRes,
        instructorsRes,
        classTypesRes,
        subscriptionsRes,
        transactionsRes
      ] = await Promise.allSettled([
        supabase.from('bookings').select('*').order('created_at', { ascending: false }),
        supabase.from('yoga_queries').select('*').order('created_at', { ascending: false }),
        supabase.from('contact_messages').select('*').order('created_at', { ascending: false }),
        supabase.from('articles').select('*').order('created_at', { ascending: false }),
        supabase.from('article_views').select('*'),
        supabase.from('instructors').select('*').order('created_at', { ascending: false }),
        supabase.from('class_types').select('*').order('created_at', { ascending: false }),
        supabase.from('user_subscriptions').select('*, subscription_plans(*)').order('created_at', { ascending: false }),
        supabase.from('transactions').select('*').order('created_at', { ascending: false })
      ])

      // Extract data with fallbacks and better error handling
      const bookings = bookingsRes.status === 'fulfilled' && !bookingsRes.value.error ? bookingsRes.value.data || [] : []
      const queries = queriesRes.status === 'fulfilled' && !queriesRes.value.error ? queriesRes.value.data || [] : []
      const contacts = contactsRes.status === 'fulfilled' && !contactsRes.value.error ? contactsRes.value.data || [] : []
      const articles = articlesRes.status === 'fulfilled' && !articlesRes.value.error ? articlesRes.value.data || [] : []
      const views = viewsRes.status === 'fulfilled' && !viewsRes.value.error ? viewsRes.value.data || [] : []
      const instructors = instructorsRes.status === 'fulfilled' && !instructorsRes.value.error ? instructorsRes.value.data || [] : []
      const classTypes = classTypesRes.status === 'fulfilled' && !classTypesRes.value.error ? classTypesRes.value.data || [] : []
      const subscriptions = subscriptionsRes.status === 'fulfilled' && !subscriptionsRes.value.error ? subscriptionsRes.value.data || [] : []
      const transactions = transactionsRes.status === 'fulfilled' && !transactionsRes.value.error ? transactionsRes.value.data || [] : []

      // Log any errors for debugging
      if (bookingsRes.status === 'rejected') console.warn('Bookings fetch failed:', bookingsRes.reason)
      if (queriesRes.status === 'rejected') console.warn('Queries fetch failed:', queriesRes.reason)
      if (contactsRes.status === 'rejected') console.warn('Contacts fetch failed:', contactsRes.reason)
      if (articlesRes.status === 'rejected') console.warn('Articles fetch failed:', articlesRes.reason)
      if (viewsRes.status === 'rejected') console.warn('Views fetch failed:', viewsRes.reason)
      if (instructorsRes.status === 'rejected') console.warn('Instructors fetch failed:', instructorsRes.reason)
      if (classTypesRes.status === 'rejected') console.warn('Class types fetch failed:', classTypesRes.reason)
      if (subscriptionsRes.status === 'rejected') console.warn('Subscriptions fetch failed:', subscriptionsRes.reason)
      if (transactionsRes.status === 'rejected') console.warn('Transactions fetch failed:', transactionsRes.reason)

      // Filter data safely
      const pendingQueries = queries.filter(q => q?.status === 'pending')
      const newContacts = contacts.filter(c => c?.status === 'new')
      const activeSubscriptions = subscriptions.filter(s => s?.status === 'active')
      const completedTransactions = transactions.filter(t => t?.status === 'completed')
      const monthlyRevenue = completedTransactions
        .filter(t => t?.created_at && new Date(t.created_at) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1))
        .reduce((sum, t) => sum + parseFloat(t?.amount || '0'), 0)

      setStats({
        totalBookings: bookings.length,
        totalQueries: queries.length,
        totalContacts: contacts.length,
        totalArticles: articles.length,
        publishedArticles: articles.filter(a => a?.status === 'published').length,
        totalViews: views.length,
        totalUsers: profiles.length,
        activeSubscriptions: activeSubscriptions.length,
        monthlyRevenue,
        recentBookings: bookings.slice(0, 5),
        pendingQueries: pendingQueries.slice(0, 10),
        newContacts: newContacts.slice(0, 10),
        allBookings: bookings,
        allQueries: queries,
        allContacts: contacts,
        allInstructors: instructors,
        allClassTypes: classTypes,
        allSubscriptions: subscriptions,
        allTransactions: transactions
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setStats({
        totalBookings: 0,
        totalQueries: 0,
        totalContacts: 0,
        totalArticles: 0,
        publishedArticles: 0,
        totalViews: 0,
        totalUsers: 0,
        activeSubscriptions: 0,
        monthlyRevenue: 0,
        recentBookings: [],
        pendingQueries: [],
        newContacts: [],
        allBookings: [],
        allQueries: [],
        allContacts: [],
        allInstructors: [],
        allClassTypes: [],
        allSubscriptions: [],
        allTransactions: []
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOutAdmin()
    navigate('/')
  }

  // Update user roles in the UI
  const handleUpdateUserRoles = (newRoles: string[] = []) => {
    if (selectedUser) {
      // Create a new reference for selectedUser to ensure React detects the change
      const updatedUser = {
        ...selectedUser,
        user_roles: [...newRoles], // Create a new array reference
        experience_level: newRoles.includes('super_admin') ? 'super_admin' :
                         newRoles.includes('admin') ? 'admin' :
                         newRoles.includes('instructor') ? 'instructor' :
                         newRoles.includes('mantra_curator') ? 'mantra_curator' :
                         'user'
      };
      
      // Update the selectedUser state
      setSelectedUser(updatedUser);
      
      // Refetch profiles to get the latest data from the database
      refetchProfiles();
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // For curators, show a simplified dashboard
  if (isMantraCurator && !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">Y</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Article Management</h1>
                  <p className="text-sm text-gray-600">Welcome back, {user?.email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  onClick={() => navigate('/')}
                  className="flex items-center space-x-2"
                >
                  <span>View Site</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSignOut}
                  className="flex items-center space-x-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ArticleManagement authorId={user?.id} />
        </main>
      </div>
    )
  }

  // For admins, show the full dashboard
  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Failed to load dashboard data</p>
          <Button onClick={fetchDashboardData} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">Y</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-600">Welcome back, {admin?.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => navigate('/')}
                className="flex items-center space-x-2"
              >
                <span>View Site</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
              { id: 'users', label: 'User Management', icon: <UsersIcon className="w-4 h-4" /> },
              { id: 'instructors', label: 'Instructors', icon: <GraduationCap className="w-4 h-4" /> },
              { id: 'classes', label: 'Class Types', icon: <Award className="w-4 h-4" /> },
              { id: 'schedule', label: 'Weekly Schedule', icon: <Calendar className="w-4 h-4" /> },
              { id: 'articles', label: 'Articles', icon: <BookOpen className="w-4 h-4" /> },
              { id: 'bookings', label: 'Bookings', icon: <Calendar className="w-4 h-4" /> },
              { id: 'subscriptions', label: 'Subscriptions', icon: <CreditCard className="w-4 h-4" /> },
              { id: 'transactions', label: 'Transactions', icon: <TrendingUp className="w-4 h-4" /> },
              { id: 'queries', label: 'Yoga Queries', icon: <MessageCircle className="w-4 h-4" /> },
              { id: 'contacts', label: 'Contact Messages', icon: <Mail className="w-4 h-4" /> },
              { id: 'submissions', label: 'Form Submissions', icon: <FileText className="w-4 h-4" /> },
              { id: 'newsletter', label: 'Newsletter', icon: <Mail className="w-4 h-4" /> },
              { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.id === 'queries' && stats.pendingQueries.length > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                    {stats.pendingQueries.length}
                  </span>
                )}
                {tab.id === 'contacts' && stats.newContacts.length > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                    {stats.newContacts.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Enhanced Metrics */}
            <DashboardMetrics />

            {/* Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <UserEngagementChart />
              
              {/* Recent Activity */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Bookings</h3>
                <div className="space-y-3">
                  {stats.recentBookings.length > 0 ? (
                    stats.recentBookings.map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{booking.first_name} {booking.last_name}</p>
                          <p className="text-sm text-gray-600">{booking.class_name}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          booking.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {booking.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No recent bookings</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">User Management ({profiles.length})</h2>
            {profiles.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Experience Level
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Joined
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {profiles.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.full_name || user.email || 'No name provided'}
                            </div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                            {user.phone && <div className="text-sm text-gray-500">{user.phone}</div>}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.user_roles && user.user_roles.length > 0 ? (
                            <span className={`px-2 py-1 text-xs rounded-full capitalize ${
                              user.user_roles.includes('super_admin') ? 'bg-red-100 text-red-800' :
                              user.user_roles.includes('admin') ? 'bg-blue-100 text-blue-800' :
                              user.user_roles.includes('instructor') ? 'bg-green-100 text-green-800' :
                              user.user_roles.includes('mantra_curator') ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {user.user_roles.includes('super_admin') ? 'Super Admin' :
                               user.user_roles.includes('admin') ? 'Admin' :
                               user.user_roles.includes('instructor') ? 'Instructor' :
                               user.user_roles.includes('mantra_curator') ? 'Curator' :
                               'User'}
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 capitalize">
                              User
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(user.user_created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button 
                            onClick={() => setSelectedUser(user)}
                            className="text-blue-600 hover:text-blue-900"
                            aria-label="View user details"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <UsersIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No users yet</h3>
                <p className="text-gray-600">Users will appear here once they sign up.</p>
              </div>
            )}

            {/* User Details Modal */}
            {selectedUser && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-gray-900">
                        User Details
                      </h3>
                      <button
                        onClick={() => setSelectedUser(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-6 space-y-4">
                    {/* User info */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Basic Information</h4>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        <p><strong>Name:</strong> {selectedUser.full_name || 'No name provided'}</p>
                        <p><strong>Email:</strong> {selectedUser.email}</p>
                        <p><strong>Experience Level:</strong> <span className="capitalize">{selectedUser.experience_level}</span></p>
                        <p><strong>Joined:</strong> {new Date(selectedUser.user_created_at).toLocaleDateString()}</p>
                        {selectedUser.phone && <p><strong>Phone:</strong> {selectedUser.phone}</p>}
                      </div>
                    </div>

                    {/* Bio if available */}
                    {selectedUser.bio && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Bio</h4>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-gray-700">{selectedUser.bio}</p>
                        </div>
                      </div>
                    )}

                    {/* Roles */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">User Roles</h4>
                      <div className="bg-gray-50 rounded-lg p-4">
                        {selectedUser.user_roles && selectedUser.user_roles.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {selectedUser.user_roles.map((role: string, index: number) => (
                              <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs capitalize">
                                {role}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500">No roles assigned</p>
                        )}
                      </div>
                    </div>

                    {/* Activity section */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Activity</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                          <p className="text-2xl font-bold text-blue-600">{selectedUser.total_bookings || 0}</p>
                          <p className="text-sm text-gray-600">Bookings</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                          <p className="text-2xl font-bold text-green-600">{selectedUser.attended_classes || 0}</p>
                          <p className="text-sm text-gray-600">Classes Attended</p>
                        </div>
                      </div>
                    </div>

                    {/* Manage Roles Button */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <Button
                        onClick={() => setShowRoleManagement(true)}
                        variant="outline"
                        size="sm"
                        className="flex items-center"
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        Manage User Roles
                      </Button>
                    </div>

                    <div className="pt-4 flex justify-end">
                      <Button
                        onClick={() => setSelectedUser(null)}
                        variant="outline"
                        size="sm"
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* User Role Management Modal */}
            {selectedUser && showRoleManagement && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                  <UserRoleManagement
                    userId={selectedUser.user_id}
                    userEmail={selectedUser.email}
                    currentRoles={selectedUser.user_roles || []}
                    onRoleUpdate={handleUpdateUserRoles}
                    onClose={() => setShowRoleManagement(false)}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Individual Tabs */}
        {activeTab === 'articles' && <ArticleManagement />}
        {activeTab === 'instructors' && <InstructorManagement />}
        {activeTab === 'classes' && <ClassTypeManager />}
        {activeTab === 'schedule' && <WeeklyClassScheduler />}
        {activeTab === 'bookings' && <BookingManagement />}
        {activeTab === 'submissions' && <FormSubmissions />}
        {activeTab === 'newsletter' && <NewsletterManagement />}
        {activeTab === 'settings' && <BusinessSettings />}

        {/* Other existing tabs remain the same... */}
      </main>
    </div>
  )
}