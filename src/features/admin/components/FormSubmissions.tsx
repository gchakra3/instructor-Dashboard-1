import { CheckCircle, Clock, Eye, FileText, Filter } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../../../shared/components/ui/Button'
import { LoadingSpinner } from '../../../shared/components/ui/LoadingSpinner'
import { supabase } from '../../../shared/lib/supabase'

interface FormSubmission {
  id: string;
  type: string;
  data: any;
  user_email: string;
  user_name: string;
  user_phone: string;
  status: string;
  notes: string;
  processed_by: string;
  processed_at: string;
  created_at: string;
}

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
}

export function FormSubmissions() {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([])
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null)
  const [selectedContactMessage, setSelectedContactMessage] = useState<ContactMessage | null>(null)
  const [activeTab, setActiveTab] = useState<'submissions'|'contacts'>('submissions')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch both form submissions and contact messages in parallel
      const [submissionsResponse, contactsResponse] = await Promise.all([
        supabase
          .from('form_submissions')
          .select('*')
          .order('created_at', { ascending: false }),
        
        supabase
          .from('contact_messages')
          .select('*')
          .order('created_at', { ascending: false })
      ]);

      if (submissionsResponse.error) throw submissionsResponse.error;
      if (contactsResponse.error) throw contactsResponse.error;
      
      setSubmissions(submissionsResponse.data || []);
      setContactMessages(contactsResponse.data || []);
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleStatusUpdate = async (submissionId: string, newStatus: string, notes?: string) => {
    try {
      if (activeTab === 'submissions') {
        const { error } = await supabase
          .from('form_submissions')
          .update({
            status: newStatus,
            notes: notes || null,
            processed_by: (await supabase.auth.getUser()).data.user?.id,
            processed_at: new Date().toISOString()
          })
          .eq('id', submissionId);

        if (error) throw error;
        await fetchData();
        setSelectedSubmission(null);
      } else {
        const { error } = await supabase
          .from('contact_messages')
          .update({
            status: newStatus
          })
          .eq('id', submissionId);

        if (error) throw error;
        await fetchData();
        setSelectedContactMessage(null);
      }
      
      alert('Updated successfully!');
    } catch (error: any) {
      console.error('Error updating status:', error);
      alert('Error updating: ' + (error.message || 'An unknown error occurred'));
    } finally {
      setLoading(false);
    }
  }

  const filteredSubmissions = submissions.filter(submission => {
    const typeMatch = selectedType === 'all' || submission.type === selectedType;
    const statusMatch = selectedStatus === 'all' || submission.status === selectedStatus;
    return typeMatch && statusMatch;
  });

  const filteredContacts = contactMessages.filter(message => {
    const statusMatch = selectedStatus === 'all' || message.status === selectedStatus;
    return statusMatch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800'
      case 'in_progress': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'booking': return '📅'
      case 'query': return '❓'
      case 'contact': return '📧'
      case 'corporate': return '🏢'
      default: return '📄'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

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
          <FileText className="w-6 h-6 mr-2" /> 
          {activeTab === 'submissions' ? 
            `Form Submissions (${filteredSubmissions.length})` : 
            `Contact Messages (${filteredContacts.length})`}
        </h2>
        <div className="flex space-x-3">
          <button 
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'submissions' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            onClick={() => setActiveTab('submissions')}
          >
            Form Submissions
          </button>
          <button 
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'contacts' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            onClick={() => setActiveTab('contacts')}
          >
            Contact Messages
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-wrap items-center gap-4">
          <Filter className="w-5 h-5 text-gray-400 hidden md:block" />
          
          {activeTab === 'submissions' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="booking">Booking</option>
                <option value="query">Query</option>
                <option value="contact">Contact</option>
                <option value="corporate">Corporate</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'submissions' ? (
        /* Form Submissions List */
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {filteredSubmissions.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No submissions found</h3>
              <p className="text-gray-600">No form submissions match your current filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submission
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSubmissions.map((submission) => (
                    <tr key={submission.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <span className="text-2xl mr-3">{getTypeIcon(submission.type)}</span>
                          <div>
                            <div className="text-sm font-medium text-gray-900 capitalize">
                              {submission.type} Submission
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {submission.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{submission.user_name || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{submission.user_email}</div>
                        {submission.user_phone && (
                          <div className="text-sm text-gray-500">{submission.user_phone}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(submission.status)}`}>
                          {submission.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(submission.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSelectedSubmission(submission)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {submission.status === 'new' && (
                            <button
                              onClick={() => handleStatusUpdate(submission.id, 'in_progress')}
                              className="text-yellow-600 hover:text-yellow-900"
                            >
                              <Clock className="w-4 h-4" />
                            </button>
                          )}
                          {submission.status !== 'completed' && (
                            <button
                              onClick={() => handleStatusUpdate(submission.id, 'completed')}
                              className="text-green-600 hover:text-green-900"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Contact Messages List */
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {filteredContacts.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No contact messages found</h3>
              <p className="text-gray-600">No contact messages match your current filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Message
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredContacts.map((message) => (
                    <tr key={message.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {message.subject}
                          </div>
                          <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                            {message.message}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{message.name}</div>
                        <div className="text-sm text-gray-500">{message.email}</div>
                        {message.phone && (
                          <div className="text-sm text-gray-500">{message.phone}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(message.status)}`}>
                          {message.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(message.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSelectedContactMessage(message)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {message.status === 'new' && (
                            <button
                              onClick={() => handleStatusUpdate(message.id, 'in_progress')}
                              className="text-yellow-600 hover:text-yellow-900"
                            >
                              <Clock className="w-4 h-4" />
                            </button>
                          )}
                          {message.status !== 'completed' && (
                            <button
                              onClick={() => handleStatusUpdate(message.id, 'completed')}
                              className="text-green-600 hover:text-green-900"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Submission Detail Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  {getTypeIcon(selectedSubmission.type)} {selectedSubmission.type} Submission
                </h3>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Contact Information</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <p><strong>Name:</strong> {selectedSubmission.user_name || 'N/A'}</p>
                  <p><strong>Email:</strong> {selectedSubmission.user_email}</p>
                  {selectedSubmission.user_phone && (
                    <p><strong>Phone:</strong> {selectedSubmission.user_phone}</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Submission Data</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                    {JSON.stringify(selectedSubmission.data, null, 2)}
                  </pre>
                </div>
              </div>

              {selectedSubmission.notes && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700">{selectedSubmission.notes}</p>
                  </div>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <Button
                  onClick={() => handleStatusUpdate(selectedSubmission.id, 'in_progress')}
                  variant="outline"
                  size="sm"
                >
                  Mark In Progress
                </Button>
                <Button
                  onClick={() => handleStatusUpdate(selectedSubmission.id, 'completed')}
                  size="sm"
                >
                  Mark Completed
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Contact Message Detail Modal */}
      {selectedContactMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  Contact Message Details
                </h3>
                <button
                  onClick={() => setSelectedContactMessage(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Contact Information</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <p><strong>Name:</strong> {selectedContactMessage.name || 'N/A'}</p>
                  <p><strong>Email:</strong> {selectedContactMessage.email}</p>
                  {selectedContactMessage.phone && (
                    <p><strong>Phone:</strong> {selectedContactMessage.phone}</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Message Details</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="font-semibold text-gray-800 mb-2">{selectedContactMessage.subject}</p>
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedContactMessage.message}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Status</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(selectedContactMessage.status)}`}>
                      {selectedContactMessage.status.replace('_', ' ')}
                    </span>
                    <span className="text-gray-500 text-sm ml-3">
                      Received on {formatDate(selectedContactMessage.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                {selectedContactMessage.status === 'new' && (
                  <Button
                    onClick={() => handleStatusUpdate(selectedContactMessage.id, 'in_progress')}
                    variant="outline"
                    size="sm"
                  >
                    Mark In Progress
                  </Button>
                )}
                {selectedContactMessage.status !== 'completed' && (
                  <Button
                    onClick={() => handleStatusUpdate(selectedContactMessage.id, 'completed')}
                    size="sm"
                  >
                    Mark Completed
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}