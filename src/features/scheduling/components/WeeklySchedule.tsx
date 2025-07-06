import { Award, Calendar, Clock, Users } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../../shared/components/ui/Button'
import { LoadingSpinner } from '../../../shared/components/ui/LoadingSpinner'
import { supabase } from '../../../shared/lib/supabase'
import { useAuth } from '../../auth/contexts/AuthContext'
import { useClassSchedule } from '../hooks/useClassSchedule'

export function WeeklySchedule() {
  const { schedules, loading, error, getDayName, formatTime } = useClassSchedule()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [bookingLoading, setBookingLoading] = useState<string | null>(null)

  const handleBookClass = async (schedule: any) => {
    if (!user) {
      // Redirect to login with return URL
      navigate('/login?redirect=/schedule')
      return
    }

    setBookingLoading(schedule.id)

    try {
      // Get next occurrence of this class (find the next date for this day of week)
      const today = new Date()
      const targetDay = schedule.day_of_week
      const daysUntilTarget = (targetDay - today.getDay() + 7) % 7
      const nextClassDate = new Date(today)
      nextClassDate.setDate(today.getDate() + (daysUntilTarget === 0 ? 7 : daysUntilTarget))
      
      const classDate = nextClassDate.toISOString().split('T')[0]

      // Check if user already has a booking for this class on this date
      const { data: existingBooking, error: checkError } = await supabase
        .from('bookings')
        .select('id')
        .eq('user_id', user.id)
        .eq('class_date', classDate)
        .eq('class_time', schedule.start_time)
        .eq('class_name', schedule.class_type.name)
        .maybeSingle()

      if (checkError) {
        throw checkError
      }

      if (existingBooking) {
        alert('You already have a booking for this class on this date.')
        return
      }

      // Create booking
      const bookingData = {
        user_id: user.id,
        class_name: schedule.class_type.name,
        instructor: schedule.instructor.name,
        class_date: classDate,
        class_time: schedule.start_time,
        first_name: user.user_metadata?.full_name?.split(' ')[0] || '',
        last_name: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
        email: user.email,
        phone: user.user_metadata?.phone || '',
        experience_level: 'beginner',
        special_requests: '',
        emergency_contact: '',
        emergency_phone: '',
        status: 'confirmed'
      }

      const { error: bookingError } = await supabase
        .from('bookings')
        .insert([bookingData])

      if (bookingError) throw bookingError

      alert(`Successfully booked ${schedule.class_type.name} for ${nextClassDate.toLocaleDateString()}!`)
    } catch (error: any) {
      console.error('Booking error:', error)
      alert('Failed to book class. Please try again.')
    } finally {
      setBookingLoading(null)
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
        <p className="text-red-600">Error loading schedule: {error}</p>
      </div>
    )
  }

  // Group schedules by day
  const schedulesByDay = schedules.reduce((acc, schedule) => {
    const day = schedule.day_of_week
    if (!acc[day]) acc[day] = []
    acc[day].push(schedule)
    return acc
  }, {} as Record<number, typeof schedules>)

  const days = [0, 1, 2, 3, 4, 5, 6] // Sunday to Saturday

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Calendar className="w-6 h-6 mr-2 text-blue-600" />
          Weekly Class Schedule
        </h2>
        <p className="text-gray-600 mt-1">Regular weekly classes - book your spot today!</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-7 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
        {days.map(day => (
          <div key={day} className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4 text-center">
              {getDayName(day)}
            </h3>
            
            <div className="space-y-3">
              {schedulesByDay[day]?.map(schedule => (
                <div
                  key={schedule.id}
                  className="bg-gradient-to-br from-blue-50 to-green-50 rounded-lg p-4 hover:shadow-md transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900 text-sm leading-tight">
                      {schedule.class_type.name}
                    </h4>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      schedule.class_type.difficulty_level === 'beginner' 
                        ? 'bg-green-100 text-green-800'
                        : schedule.class_type.difficulty_level === 'intermediate'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {schedule.class_type.difficulty_level}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-xs text-gray-600 mb-3">
                    <div className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatTime(schedule.start_time)} ({schedule.duration_minutes}min)
                    </div>
                    
                    <div className="flex items-center">
                      <Users className="w-3 h-3 mr-1" />
                      Max {schedule.max_participants} students
                    </div>
                    
                    <div className="flex items-center">
                      <Award className="w-3 h-3 mr-1" />
                      {schedule.instructor.name}
                    </div>
                    
                    {schedule.class_type.price && (
                      <div className="text-blue-600 font-semibold">
                        ${schedule.class_type.price}
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={() => handleBookClass(schedule)}
                    loading={bookingLoading === schedule.id}
                    size="sm"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-2"
                  >
                    {bookingLoading === schedule.id ? 'Booking...' : 'Book Now'}
                  </Button>
                </div>
              )) || (
                <div className="text-center text-gray-500 text-sm py-8">
                  No classes scheduled
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Booking Information */}
      <div className="p-6 bg-gray-50 border-t border-gray-200">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">How Booking Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                <span className="text-blue-600 font-semibold">1</span>
              </div>
              <p>Click "Book Now" on any class</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                <span className="text-blue-600 font-semibold">2</span>
              </div>
              <p>Sign in to your account</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                <span className="text-blue-600 font-semibold">3</span>
              </div>
              <p>Get instant confirmation</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-500">
            * Bookings are made for the next occurrence of the selected class
          </p>
        </div>
      </div>
    </div>
  )
}