import { Eye, Mail, Plus, Send, Trash2, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../../../shared/components/ui/Button'
import { LoadingSpinner } from '../../../shared/components/ui/LoadingSpinner'
import { supabase } from '../../../shared/lib/supabase'

interface Newsletter {
  id: string
  title: string
  content: string
  subject: string
  status: string
  sent_at: string
  created_at: string
}

interface Subscriber {
  id: string
  email: string
  name: string
  status: string
  subscribed_at: string
}

export function NewsletterManagement() {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([])
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('newsletters')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const [newslettersRes, subscribersRes] = await Promise.all([
        supabase.from('newsletters').select('*').order('created_at', { ascending: false }),
        supabase.from('newsletter_subscribers').select('*').order('subscribed_at', { ascending: false })
      ])

      if (newslettersRes.error) throw newslettersRes.error
      if (subscribersRes.error) throw subscribersRes.error

      setNewsletters(newslettersRes.data || [])
      setSubscribers(subscribersRes.data || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteNewsletter = async (id: string) => {
    if (!confirm('Are you sure you want to delete this newsletter?')) return

    try {
      const { error } = await supabase
        .from('newsletters')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchData()
    } catch (error) {
      console.error('Error deleting newsletter:', error)
    }
  }

  const handleCreateNewsletter = () => {
    // TODO: Implement newsletter creation form/modal
    console.log('Create newsletter clicked - form/modal to be implemented')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const activeSubscribers = subscribers.filter(s => s.status === 'active')

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Mail className="w-6 h-6 mr-2" />
          Newsletter Management
        </h2>
        {activeTab === 'newsletters' && (
          <Button onClick={handleCreateNewsletter} className="flex items-center">
            <Plus className="w-4 h-4 mr-2" />
            Create Newsletter
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Subscribers</p>
              <p className="text-3xl font-bold text-gray-900">{subscribers.length}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Subscribers</p>
              <p className="text-3xl font-bold text-gray-900">{activeSubscribers.length}</p>
            </div>
            <Mail className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Newsletters Sent</p>
              <p className="text-3xl font-bold text-gray-900">
                {newsletters.filter(n => n.status === 'sent').length}
              </p>
            </div>
            <Send className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-lg">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('newsletters')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'newsletters'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Newsletters ({newsletters.length})
            </button>
            <button
              onClick={() => setActiveTab('subscribers')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'subscribers'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Subscribers ({subscribers.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'newsletters' ? (
            <div className="space-y-4">
              {newsletters.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No newsletters yet</h3>
                  <p className="text-gray-600 mb-4">Create your first newsletter to get started.</p>
                </div>
              ) : (
                newsletters.map((newsletter) => (
                  <div key={newsletter.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{newsletter.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{newsletter.subject}</p>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          <span>Created: {formatDate(newsletter.created_at)}</span>
                          {newsletter.sent_at && (
                            <span>Sent: {formatDate(newsletter.sent_at)}</span>
                          )}
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            newsletter.status === 'sent' 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {newsletter.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => console.log('Edit newsletter:', newsletter.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteNewsletter(newsletter.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {subscribers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No subscribers yet</h3>
                  <p className="text-gray-600">Subscribers will appear here when they sign up for your newsletter.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Subscriber
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Subscribed
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {subscribers.map((subscriber) => (
                        <tr key={subscriber.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {subscriber.name || 'No name'}
                              </div>
                              <div className="text-sm text-gray-500">{subscriber.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              subscriber.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {subscriber.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {formatDate(subscriber.subscribed_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}