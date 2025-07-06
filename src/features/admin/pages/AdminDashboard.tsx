// src/features/admin/pages/AdminDashboard.tsx

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
  Award,
  UserCheck
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
import { ClassAssignmentManager } from '../components/ClassAssignmentManager'
import { ClassTypeManager } from '../components/ClassTypeManager'
import { FormSubmissions } from '../components/FormSubmissions'
import { InstructorDashboard } from '../components/InstructorDashboard'
import { InstructorManagement } from '../components/InstructorManagement'
import { NewsletterManagement } from '../components/NewsletterManagement'
import { UserRoleManagement } from '../components/UserRoleManagement'
import { WeeklyClassScheduler } from '../components/WeeklyClassScheduler'
import { YogaAcharyaDashboard } from '../components/YogaAcharyaDashboard'
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
  const { isMantraCurator, user, userRoles } = useAuth()
  const { profiles, refetch: refetchProfiles } = useUserProfiles()
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(() => {
    if (userRoles.includes('instructor')) return 'instructor-dashboard'
    if (userRoles.includes('yoga_acharya')) return 'yoga-acharya-dashboard'
    if (isMantraCurator) return 'articles'
    return 'overview'
  })

  useEffect(() => {
    if (!isAdmin && !userRoles.includes('instructor') && !userRoles.includes('yoga_acharya') && !isMantraCurator) {
      navigate('/admin/login')
      return
    }
    if (isAdmin) fetchDashboardData()
    else setLoading(false)
  }, [isAdmin, userRoles, isMantraCurator, navigate])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

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

      const safeData = (res: any) => (res.status === 'fulfilled' && !res.value.error ? res.value.data || [] : [])
      const bookings = safeData(bookingsRes)
      const queries = safeData(queriesRes)
      const contacts = safeData(contactsRes)
      const articles = safeData(articlesRes)
      const views = safeData(viewsRes)
      const instructors = safeData(instructorsRes)
      const classTypes = safeData(classTypesRes)
      const subscriptions = safeData(subscriptionsRes)
      const transactions = safeData(transactionsRes)

      const monthlyRevenue = transactions
        .filter(t => t?.status === 'completed' && new Date(t.created_at) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1))
        .reduce((sum, t) => sum + parseFloat(t?.amount || '0'), 0)

      setStats({
        totalBookings: bookings.length,
        totalQueries: queries.length,
        totalContacts: contacts.length,
        totalArticles: articles.length,
        publishedArticles: articles.filter(a => a?.status === 'published').length,
        totalViews: views.length,
        totalUsers: profiles.length,
        activeSubscriptions: subscriptions.filter(s => s?.status === 'active').length,
        monthlyRevenue,
        recentBookings: bookings.slice(0, 5),
        pendingQueries: queries.filter(q => q?.status === 'pending').slice(0, 10),
        newContacts: contacts.filter(c => c?.status === 'new').slice(0, 10),
        allBookings: bookings,
        allQueries: queries,
        allContacts: contacts,
        allInstructors: instructors,
        allClassTypes: classTypes,
        allSubscriptions: subscriptions,
        allTransactions: transactions
      })
    } catch (err) {
      console.error('Dashboard error:', err)
      setStats(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOutAdmin()
    navigate('/')
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><LoadingSpinner /></div>

  if (!isAdmin) {
    if (userRoles.includes('instructor')) {
      return (
        <div className="min-h-screen bg-gray-50">
          <Header title="Instructor Dashboard" email={user?.email} onSignOut={handleSignOut} />
          <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <InstructorDashboard />
          </main>
        </div>
      )
    }

    if (userRoles.includes('yoga_acharya')) {
      return (
        <div className="min-h-screen bg-gray-50">
          <Header title="Yoga Acharya Dashboard" email={user?.email} onSignOut={handleSignOut} />
          <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <YogaAcharyaDashboard />
          </main>
        </div>
      )
    }

    if (isMantraCurator) {
      return (
        <div className="min-h-screen bg-gray-50">
          <Header title="Article Management" email={user?.email} onSignOut={handleSignOut} />
          <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <ArticleManagement authorId={user?.id} />
          </main>
        </div>
      )
    }
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Failed to load dashboard.</p>
          <Button onClick={fetchDashboardData} className="mt-4">Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Admin Dashboard" email={admin?.email} onSignOut={handleSignOut} />

      {/* Navigation Tabs */}
      <nav className="bg-white border-b px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-6 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
            { id: 'users', label: 'Users', icon: <UsersIcon className="w-4 h-4" /> },
            { id: 'instructors', label: 'Instructors', icon: <GraduationCap className="w-4 h-4" /> },
            { id: 'classes', label: 'Class Types', icon: <Award className="w-4 h-4" /> },
            { id: 'schedule', label: 'Weekly Schedule', icon: <Calendar className="w-4 h-4" /> },
            { id: 'assignments', label: 'Assignments', icon: <UserCheck className="w-4 h-4" /> },
            { id: 'bookings', label: 'Bookings', icon: <Calendar className="w-4 h-4" /> },
            { id: 'articles', label: 'Articles', icon: <BookOpen className="w-4 h-4" /> },
            { id: 'subscriptions', label: 'Subscriptions', icon: <CreditCard className="w-4 h-4" /> },
            { id: 'transactions', label: 'Transactions', icon: <TrendingUp className="w-4 h-4" /> },
            { id: 'queries', label: 'Yoga Queries', icon: <MessageCircle className="w-4 h-4" /> },
            { id: 'contacts', label: 'Contact Messages', icon: <Mail className="w-4 h-4" /> },
            { id: 'submissions', label: 'Forms', icon: <FileText className="w-4 h-4" /> },
            { id: 'newsletter', label: 'Newsletter', icon: <Mail className="w-4 h-4" /> },
            { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 text-sm font-medium flex items-center space-x-1 border-b-2 ${
                activeTab === tab.id
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Tab Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {activeTab === 'overview' && (
          <>
            <DashboardMetrics />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
              <UserEngagementChart />
              {/* You may place recent activity or insights here */}
            </div>
          </>
        )}
        {activeTab === 'users' && <UserRoleManagement />}
        {activeTab === 'instructors' && <InstructorManagement />}
        {activeTab === 'classes' && <ClassTypeManager />}
        {activeTab === 'schedule' && <WeeklyClassScheduler />}
        {activeTab === 'assignments' && <ClassAssignmentManager />}
        {activeTab === 'bookings' && <BookingManagement />}
        {activeTab === 'articles' && <ArticleManagement />}
        {activeTab === 'subscriptions' && <BusinessSettings />}
        {activeTab === 'transactions' && <BusinessSettings />}
        {activeTab === 'queries' && <BusinessSettings />}
        {activeTab === 'contacts' && <BusinessSettings />}
        {activeTab === 'submissions' && <FormSubmissions />}
        {activeTab === 'newsletter' && <NewsletterManagement />}
        {activeTab === 'settings' && <BusinessSettings />}
      </main>
    </div>
  )
}

// Minimal reusable header
function Header({ title, email, onSignOut }: { title: string; email?: string; onSignOut: () => void }) {
  const navigate = useNavigate()
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto flex justify-between items-center py-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold">
            Y
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <p className="text-sm text-gray-600">Welcome back, {email}</p>
          </div>
        </div>
        <div className="flex space-x-4">
          <Button variant="outline" onClick={() => navigate('/')}>View Site</Button>
          <Button variant="outline" onClick={onSignOut}><LogOut className="w-4 h-4 mr-2" />Sign Out</Button>
        </div>
      </div>
    </header>
  )
}
