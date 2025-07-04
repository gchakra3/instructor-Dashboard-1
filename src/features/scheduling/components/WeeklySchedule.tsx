import { Award, Calendar, Clock, Users } from 'lucide-react'
import { LoadingSpinner } from '../../../shared/components/ui/LoadingSpinner'
import { useClassSchedule } from '../hooks/useClassSchedule'

export function WeeklySchedule() {
  const { schedules, loading, error, getDayName, formatTime } = useClassSchedule()

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
                  className="bg-gradient-to-br from-blue-50 to-green-50 rounded-lg p-4 hover:shadow-md transition-all duration-300 cursor-pointer"
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
                  
                  <div className="space-y-2 text-xs text-gray-600">
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
    </div>
  )
}