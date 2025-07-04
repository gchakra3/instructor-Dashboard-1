import {
  BookOpen,
  Calendar,
  CreditCard,
  DollarSign,
  Mail,
  MessageCircle,
  TrendingUp,
  Users
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { LoadingSpinner } from '../../../shared/components/ui/LoadingSpinner'
import { supabase } from '../../../shared/lib/supabase'

interface DashboardMetric {
  metric: string
  value: number
  type: string
  last_updated: string
}

export function DashboardMetrics() {
  const [metrics, setMetrics] = useState<DashboardMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMetrics()
  }, [])

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('admin_dashboard_metrics')
        .select('*')

      if (fetchError) throw fetchError

      setMetrics(data || [])
    } catch (err: any) {
      console.error('Error fetching metrics:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getMetricIcon = (metric: string) => {
    switch (metric) {
      case 'total_users':
        return <Users className="w-8 h-8 text-blue-600" />
      case 'total_bookings':
      case 'monthly_bookings':
        return <Calendar className="w-8 h-8 text-green-600" />
      case 'monthly_revenue':
      case 'total_revenue':
        return <DollarSign className="w-8 h-8 text-emerald-600" />
      case 'active_subscriptions':
      case 'total_subscriptions':
        return <CreditCard className="w-8 h-8 text-purple-600" />
      case 'total_articles':
      case 'monthly_articles':
        return <BookOpen className="w-8 h-8 text-indigo-600" />
      case 'total_queries':
      case 'monthly_queries':
        return <MessageCircle className="w-8 h-8 text-orange-600" />
      case 'total_contacts':
      case 'monthly_contacts':
        return <Mail className="w-8 h-8 text-pink-600" />
      case 'user_growth_rate':
        return <TrendingUp className="w-8 h-8 text-cyan-600" />
      default:
        return <TrendingUp className="w-8 h-8 text-gray-600" />
    }
  }

  const getMetricTitle = (metric: string) => {
    if (!metric) return 'Unknown Metric'
    
    switch (metric) {
      case 'total_users':
        return 'Total Users'
      case 'total_bookings':
        return 'Total Bookings'
      case 'monthly_bookings':
        return 'Monthly Bookings'
      case 'monthly_revenue':
        return 'Monthly Revenue'
      case 'total_revenue':
        return 'Total Revenue'
      case 'active_subscriptions':
        return 'Active Subscriptions'
      case 'total_subscriptions':
        return 'Total Subscriptions'
      case 'total_articles':
        return 'Total Articles'
      case 'monthly_articles':
        return 'Monthly Articles'
      case 'total_queries':
        return 'Total Queries'
      case 'monthly_queries':
        return 'Monthly Queries'
      case 'total_contacts':
        return 'Total Contacts'
      case 'monthly_contacts':
        return 'Monthly Contacts'
      case 'user_growth_rate':
        return 'User Growth Rate'
      default:
        return metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }
  }

  const formatValue = (value: number, type: string) => {
    if (typeof value !== 'number') return '0'
    
    if (type === 'currency') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(value)
    }
    if (type === 'percentage') {
      return `${value}%`
    }
    return value.toLocaleString()
  }

  const getBorderColor = (metric: string) => {
    switch (metric) {
      case 'total_users':
        return 'border-blue-500'
      case 'total_bookings':
      case 'monthly_bookings':
        return 'border-green-500'
      case 'monthly_revenue':
      case 'total_revenue':
        return 'border-emerald-500'
      case 'active_subscriptions':
      case 'total_subscriptions':
        return 'border-purple-500'
      case 'total_articles':
      case 'monthly_articles':
        return 'border-indigo-500'
      case 'total_queries':
      case 'monthly_queries':
        return 'border-orange-500'
      case 'total_contacts':
      case 'monthly_contacts':
        return 'border-pink-500'
      case 'user_growth_rate':
        return 'border-cyan-500'
      default:
        return 'border-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error loading metrics: {error}</p>
        <button 
          onClick={fetchMetrics}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    )
  }

  if (metrics.length === 0) {
    return (
      <div className="text-center py-12">
        <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No metrics available</h3>
        <p className="text-gray-600">Metrics will appear here once data is available.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric, index) => (
        <div
          key={`${metric.metric}-${index}`}
          className={`bg-white rounded-xl shadow-lg p-6 border-l-4 ${getBorderColor(metric.metric)} hover:shadow-xl transition-all duration-300`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">
                {getMetricTitle(metric.metric)}
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {formatValue(metric.value, metric.type)}
              </p>
            </div>
            <div className="flex-shrink-0">
              {getMetricIcon(metric.metric)}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}