import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Edit,
  Eye,
  Filter,
  Mail,
  Search,
  Trash2,
  X
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../../../shared/components/ui/Button'
import { LoadingSpinner } from '../../../shared/components/ui/LoadingSpinner'
import { supabase } from '../../../shared/lib/supabase'

interface Booking {
  id: string
  user_id: string
  class_name: string
  instructor: string
  class_date: string
  class_time: string
  first_name: string
  last_name: string
  email: string
  phone: string
  experience_level: string
  special_requests: string
  emergency_contact: string
  emergency_phone: string
  status: string
  created_at: string
  updated_at: string
}

export function BookingManagement() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null)
  const [isNotifying, setIsNotifying] = useState(false)
  const [updatedBooking, setUpdatedBooking] = useState<Partial<Booking>>({})
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setBookings(data || [])
    } catch (error) {
      console.error('Error fetching bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewBooking = (booking: Booking) => {
    setSelectedBooking(booking)
    setIsEditing(false)
    setUpdatedBooking({})
  }

  const handleEditBooking = (booking: Booking) => {
    setSelectedBooking(booking)
    setIsEditing(true)
    setUpdatedBooking({
      class_name: booking.class_name,
      instructor: booking.instructor,
      class_date: booking.class_date,
      class_time: booking.class_time,
      status: booking.status,
      special_requests: booking.special_requests,
    })
  }

  const handleDeleteBooking = async (id: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', id)

      if (error) throw error

      setBookings(bookings.filter(booking => booking.id !== id))
      setShowConfirmDelete(null)
      setSelectedBooking(null)
      
      setSuccessMessage('Booking deleted successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Error deleting booking:', error)
    }
  }

  const handleUpdateBookingStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', id)

      if (error) throw error

      // Update local state
      setBookings(bookings.map(booking => 
        booking.id === id ? { ...booking, status } : booking
      ))
      
      if (selectedBooking && selectedBooking.id === id) {
        setSelectedBooking({ ...selectedBooking, status })
      }
      
      setSuccessMessage(`Booking status updated to ${status}`)
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Error updating booking status:', error)
    }
  }

  const handleSaveBooking = async () => {
    if (!selectedBooking) return
    
    try {
      const { error } = await supabase
        .from('bookings')
        .update(updatedBooking)
        .eq('id', selectedBooking.id)

      if (error) throw error

      // Update local state
      const updatedBookings = bookings.map(booking => 
        booking.id === selectedBooking.id 
          ? { ...booking, ...updatedBooking } 
          : booking
      )
      
      setBookings(updatedBookings)
      setSelectedBooking({ ...selectedBooking, ...updatedBooking })
      setIsEditing(false)
      setUpdatedBooking({})
      
      setSuccessMessage('Booking updated successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Error updating booking:', error)
    }
  }

  const sendNotification = async () => {
    if (!selectedBooking) return
    
    setIsNotifying(true)
    try {
      // This would typically call an API or Edge Function
      // For now we'll simulate success
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setSuccessMessage(`Notification sent to ${selectedBooking.email}`)
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Error sending notification:', error)
    } finally {
      setIsNotifying(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'attended': return 'bg-blue-100 text-blue-800'
      case 'no_show': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Filter bookings based on search term and filters
  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = searchTerm === '' || 
      `${booking.first_name} ${booking.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.class_name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter
    
    let matchesDate = true
    const bookingDate = new Date(booking.class_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (dateFilter === 'today') {
      const todayStr = today.toISOString().split('T')[0]
      matchesDate = booking.class_date === todayStr
    } else if (dateFilter === 'upcoming') {
      matchesDate = bookingDate >= today
    } else if (dateFilter === 'past') {
      matchesDate = bookingDate < today
    }
    
    return matchesSearch && matchesStatus && matchesDate
  })

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
          <Calendar className="w-6 h-6 mr-2" />
          Booking Management ({bookings.length})
        </h2>
      </div>

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 flex justify-between items-center">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage('')}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, email, or class..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
                <option value="attended">Attended</option>
                <option value="no_show">No Show</option>
              </select>
            </div>
          </div>

          {/* Date Filter */}
          <div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="upcoming">Upcoming</option>
                <option value="past">Past</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {filteredBookings.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No bookings found</h3>
            <p className="text-gray-600">Try changing your search or filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Class
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {booking.first_name} {booking.last_name}
                        </div>
                        <div className="text-sm text-gray-500">{booking.email}</div>
                        {booking.phone && <div className="text-sm text-gray-500">{booking.phone}</div>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{booking.class_name}</div>
                      <div className="text-sm text-gray-500">{booking.instructor}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{formatDate(booking.class_date)}</div>
                      <div className="text-sm text-gray-500">{booking.class_time}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(booking.status)}`}>
                        {booking.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewBooking(booking)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditBooking(booking)}
                          className="text-indigo-600 hover:text-indigo-900 p-1"
                          title="Edit Booking"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {booking.status !== 'cancelled' && (
                          <button
                            onClick={() => handleUpdateBookingStatus(booking.id, 'cancelled')}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Cancel Booking"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        {booking.status === 'confirmed' && (
                          <button
                            onClick={() => handleUpdateBookingStatus(booking.id, 'attended')}
                            className="text-green-600 hover:text-green-900 p-1"
                            title="Mark as Attended"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setShowConfirmDelete(booking.id)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Delete Booking"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Deletion</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this booking? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowConfirmDelete(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleDeleteBooking(showConfirmDelete)}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  {isEditing ? 'Edit Booking' : 'Booking Details'}
                </h3>
                <button
                  onClick={() => {
                    setSelectedBooking(null)
                    setIsEditing(false)
                    setUpdatedBooking({})
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Class
                    </label>
                    <input
                      type="text"
                      value={updatedBooking.class_name || ''}
                      onChange={(e) => setUpdatedBooking({...updatedBooking, class_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Instructor
                    </label>
                    <input
                      type="text"
                      value={updatedBooking.instructor || ''}
                      onChange={(e) => setUpdatedBooking({...updatedBooking, instructor: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        value={updatedBooking.class_date || ''}
                        onChange={(e) => setUpdatedBooking({...updatedBooking, class_date: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Time
                      </label>
                      <input
                        type="text"
                        value={updatedBooking.class_time || ''}
                        onChange={(e) => setUpdatedBooking({...updatedBooking, class_time: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={updatedBooking.status || ''}
                      onChange={(e) => setUpdatedBooking({...updatedBooking, status: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="confirmed">Confirmed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="attended">Attended</option>
                      <option value="no_show">No Show</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Special Requests
                    </label>
                    <textarea
                      value={updatedBooking.special_requests || ''}
                      onChange={(e) => setUpdatedBooking({...updatedBooking, special_requests: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false)
                        setUpdatedBooking({})
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveBooking}
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Customer Information */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3 border-b pb-2">Customer Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Name</p>
                        <p className="font-medium">{selectedBooking.first_name} {selectedBooking.last_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium">{selectedBooking.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <p className="font-medium">{selectedBooking.phone || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Experience Level</p>
                        <p className="font-medium capitalize">{selectedBooking.experience_level}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Class Details */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3 border-b pb-2">Class Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Class</p>
                        <p className="font-medium">{selectedBooking.class_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Instructor</p>
                        <p className="font-medium">{selectedBooking.instructor}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Date</p>
                        <p className="font-medium">{formatDate(selectedBooking.class_date)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Time</p>
                        <p className="font-medium">{selectedBooking.class_time}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Additional Information */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3 border-b pb-2">Additional Information</h4>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Status</p>
                        <p>
                          <span className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(selectedBooking.status)}`}>
                            {selectedBooking.status.replace('_', ' ')}
                          </span>
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Special Requests</p>
                        <p className="text-gray-700">{selectedBooking.special_requests || 'None'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Emergency Contact</p>
                        <p className="font-medium">{selectedBooking.emergency_contact}</p>
                        <p className="text-sm text-gray-700">{selectedBooking.emergency_phone}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Booking Date</p>
                        <p className="font-medium">{formatDate(selectedBooking.created_at)}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="border-t pt-4 flex flex-wrap gap-3 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditBooking(selectedBooking)}
                      className="flex items-center"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    
                    {selectedBooking.status === 'confirmed' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateBookingStatus(selectedBooking.id, 'attended')}
                          className="flex items-center"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Mark Attended
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateBookingStatus(selectedBooking.id, 'no_show')}
                          className="flex items-center"
                        >
                          <AlertTriangle className="w-4 h-4 mr-1" />
                          Mark No-Show
                        </Button>
                      </>
                    )}
                    
                    {selectedBooking.status !== 'cancelled' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateBookingStatus(selectedBooking.id, 'cancelled')}
                        className="flex items-center"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancel Booking
                      </Button>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={sendNotification}
                      disabled={isNotifying}
                      className="flex items-center"
                    >
                      <Mail className="w-4 h-4 mr-1" />
                      {isNotifying ? 'Sending...' : 'Notify Customer'}
                    </Button>
                    
                    <Button
                      size="sm"
                      onClick={() => setShowConfirmDelete(selectedBooking.id)}
                      className="flex items-center bg-red-600 hover:bg-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}