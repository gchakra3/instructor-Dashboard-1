import { Calendar, Clock, Plus, Save, Trash2, Users, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../../../shared/components/ui/Button'
import { LoadingSpinner } from '../../../shared/components/ui/LoadingSpinner'
import { supabase } from '../../../shared/lib/supabase'

interface ClassType {
  id: string
  name: string
  description: string
  difficulty_level: string
  price: number
  duration_minutes: number
  max_participants: number
}

interface Instructor {
  id: string
  name: string
  bio: string
  specialties: string[]
}

interface ClassSchedule {
  id?: string
  class_type_id: string
  instructor_id: string
  day_of_week: number
  start_time: string
  duration_minutes: number
  max_participants: number
  is_active: boolean
  effective_from: string
  effective_until?: string
  class_type?: ClassType
  instructor?: Instructor
}

export function WeeklyClassScheduler() {
  const [schedules, setSchedules] = useState<ClassSchedule[]>([])
  const [classTypes, setClassTypes] = useState<ClassType[]>([])
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<ClassSchedule | null>(null)
  const [errors, setErrors] = useState<any>({})

  const [formData, setFormData] = useState<Partial<ClassSchedule>>({
    class_type_id: '',
    instructor_id: '',
    day_of_week: 0,
    start_time: '',
    duration_minutes: 60,
    max_participants: 20,
    is_active: true,
    effective_from: new Date().toISOString().split('T')[0]
  })

  const daysOfWeek = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
  ]

  const timeSlots = [
    '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
    '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30'
  ]

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const [schedulesRes, classTypesRes, instructorsRes] = await Promise.all([
        supabase
          .from('class_schedules')
          .select(`
            *,
            class_type:class_types(*),
            instructor:instructors(*)
          `)
          .order('day_of_week')
          .order('start_time'),
        
        supabase
          .from('class_types')
          .select('*')
          .eq('is_active', true)
          .order('name'),
        
        supabase
          .from('instructors')
          .select('*')
          .eq('is_active', true)
          .order('name')
      ])

      if (schedulesRes.error) throw schedulesRes.error
      if (classTypesRes.error) throw classTypesRes.error
      if (instructorsRes.error) throw instructorsRes.error

      setSchedules(schedulesRes.data || [])
      setClassTypes(classTypesRes.data || [])
      setInstructors(instructorsRes.data || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev: any) => ({ ...prev, [field]: '' }))
    }

    // Auto-fill duration and max participants when class type changes
    if (field === 'class_type_id') {
      const selectedClassType = classTypes.find(ct => ct.id === value)
      if (selectedClassType) {
        setFormData(prev => ({
          ...prev,
          [field]: value,
          duration_minutes: selectedClassType.duration_minutes,
          max_participants: selectedClassType.max_participants
        }))
      }
    }
  }

  const validateForm = () => {
    const newErrors: any = {}

    if (!formData.class_type_id) newErrors.class_type_id = 'Class type is required'
    if (!formData.instructor_id) newErrors.instructor_id = 'Instructor is required'
    if (formData.day_of_week === undefined) newErrors.day_of_week = 'Day of week is required'
    if (!formData.start_time) newErrors.start_time = 'Start time is required'
    if (!formData.duration_minutes || formData.duration_minutes < 15) {
      newErrors.duration_minutes = 'Duration must be at least 15 minutes'
    }
    if (!formData.max_participants || formData.max_participants < 1) {
      newErrors.max_participants = 'Max participants must be at least 1'
    }
    if (!formData.effective_from) newErrors.effective_from = 'Effective from date is required'

    // Check for scheduling conflicts
    const conflictingSchedule = schedules.find(schedule => {
      if (editingSchedule && schedule.id === editingSchedule.id) return false
      
      if (schedule.day_of_week === formData.day_of_week && 
          schedule.instructor_id === formData.instructor_id) {
        
        const existingStart = new Date(`2000-01-01T${schedule.start_time}`)
        const existingEnd = new Date(existingStart.getTime() + schedule.duration_minutes * 60000)
        const newStart = new Date(`2000-01-01T${formData.start_time}`)
        const newEnd = new Date(newStart.getTime() + (formData.duration_minutes || 0) * 60000)
        
        return (newStart < existingEnd && newEnd > existingStart)
      }
      return false
    })

    if (conflictingSchedule) {
      newErrors.general = 'This instructor already has a class scheduled at this time'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    try {
      setSaving(true)

      if (editingSchedule) {
        // Update existing schedule
        const { error } = await supabase
          .from('class_schedules')
          .update(formData)
          .eq('id', editingSchedule.id)

        if (error) throw error
      } else {
        // Create new schedule
        const { error } = await supabase
          .from('class_schedules')
          .insert([formData])

        if (error) throw error
      }

      await fetchData()
      resetForm()
      alert(editingSchedule ? 'Schedule updated successfully!' : 'Schedule created successfully!')
    } catch (error: any) {
      setErrors({ general: error.message })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (schedule: ClassSchedule) => {
    setEditingSchedule(schedule)
    setFormData({
      class_type_id: schedule.class_type_id,
      instructor_id: schedule.instructor_id,
      day_of_week: schedule.day_of_week,
      start_time: schedule.start_time,
      duration_minutes: schedule.duration_minutes,
      max_participants: schedule.max_participants,
      is_active: schedule.is_active,
      effective_from: schedule.effective_from,
      effective_until: schedule.effective_until
    })
    setShowAddForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this class schedule?')) return

    try {
      const { error } = await supabase
        .from('class_schedules')
        .delete()
        .eq('id', id)

      if (error) throw error

      await fetchData()
      alert('Schedule deleted successfully!')
    } catch (error) {
      console.error('Error deleting schedule:', error)
      alert('Failed to delete schedule')
    }
  }

  const resetForm = () => {
    setFormData({
      class_type_id: '',
      instructor_id: '',
      day_of_week: 0,
      start_time: '',
      duration_minutes: 60,
      max_participants: 20,
      is_active: true,
      effective_from: new Date().toISOString().split('T')[0]
    })
    setEditingSchedule(null)
    setShowAddForm(false)
    setErrors({})
  }

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800'
      case 'advanced': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Group schedules by day for better visualization
  const schedulesByDay = schedules.reduce((acc, schedule) => {
    const day = schedule.day_of_week
    if (!acc[day]) acc[day] = []
    acc[day].push(schedule)
    return acc
  }, {} as Record<number, ClassSchedule[]>)

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
          Weekly Class Scheduler
        </h2>
        <Button
          onClick={() => setShowAddForm(true)}
          className="flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add New Schedule
        </Button>
      </div>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingSchedule ? 'Edit Class Schedule' : 'Add New Class Schedule'}
                </h3>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {errors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm">{errors.general}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Class Type *
                  </label>
                  <select
                    value={formData.class_type_id}
                    onChange={(e) => handleInputChange('class_type_id', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.class_type_id ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select class type</option>
                    {classTypes.map(classType => (
                      <option key={classType.id} value={classType.id}>
                        {classType.name} ({classType.difficulty_level})
                      </option>
                    ))}
                  </select>
                  {errors.class_type_id && <p className="text-red-500 text-sm mt-1">{errors.class_type_id}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Instructor *
                  </label>
                  <select
                    value={formData.instructor_id}
                    onChange={(e) => handleInputChange('instructor_id', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.instructor_id ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select instructor</option>
                    {instructors.map(instructor => (
                      <option key={instructor.id} value={instructor.id}>
                        {instructor.name}
                      </option>
                    ))}
                  </select>
                  {errors.instructor_id && <p className="text-red-500 text-sm mt-1">{errors.instructor_id}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Day of Week *
                  </label>
                  <select
                    value={formData.day_of_week}
                    onChange={(e) => handleInputChange('day_of_week', parseInt(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.day_of_week ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    {daysOfWeek.map(day => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                  {errors.day_of_week && <p className="text-red-500 text-sm mt-1">{errors.day_of_week}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time *
                  </label>
                  <select
                    value={formData.start_time}
                    onChange={(e) => handleInputChange('start_time', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.start_time ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select start time</option>
                    {timeSlots.map(time => (
                      <option key={time} value={time}>
                        {formatTime(time)}
                      </option>
                    ))}
                  </select>
                  {errors.start_time && <p className="text-red-500 text-sm mt-1">{errors.start_time}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (minutes) *
                  </label>
                  <input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => handleInputChange('duration_minutes', parseInt(e.target.value))}
                    min="15"
                    max="180"
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.duration_minutes ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.duration_minutes && <p className="text-red-500 text-sm mt-1">{errors.duration_minutes}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Participants *
                  </label>
                  <input
                    type="number"
                    value={formData.max_participants}
                    onChange={(e) => handleInputChange('max_participants', parseInt(e.target.value))}
                    min="1"
                    max="50"
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.max_participants ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.max_participants && <p className="text-red-500 text-sm mt-1">{errors.max_participants}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Effective From *
                  </label>
                  <input
                    type="date"
                    value={formData.effective_from}
                    onChange={(e) => handleInputChange('effective_from', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.effective_from ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.effective_from && <p className="text-red-500 text-sm mt-1">{errors.effective_from}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Effective Until (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.effective_until || ''}
                    onChange={(e) => handleInputChange('effective_until', e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => handleInputChange('is_active', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                  Active Schedule
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={saving}
                  className="flex items-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : (editingSchedule ? 'Update Schedule' : 'Create Schedule')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Weekly Schedule Grid */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Current Weekly Schedule</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-7 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
          {daysOfWeek.map(day => (
            <div key={day.value} className="p-4">
              <h4 className="font-semibold text-gray-900 mb-4 text-center">
                {day.label}
              </h4>
              
              <div className="space-y-3">
                {schedulesByDay[day.value]?.map(schedule => (
                  <div
                    key={schedule.id}
                    className={`rounded-lg p-3 border-l-4 ${
                      schedule.is_active 
                        ? 'bg-blue-50 border-blue-500' 
                        : 'bg-gray-50 border-gray-400'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="font-medium text-gray-900 text-sm">
                        {schedule.class_type?.name}
                      </h5>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleEdit(schedule)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Edit"
                        >
                          <Calendar className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(schedule.id!)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-1 text-xs text-gray-600">
                      <div className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatTime(schedule.start_time)} ({schedule.duration_minutes}min)
                      </div>
                      
                      <div className="flex items-center">
                        <Users className="w-3 h-3 mr-1" />
                        Max {schedule.max_participants}
                      </div>
                      
                      <div className="text-gray-700 font-medium">
                        {schedule.instructor?.name}
                      </div>
                      
                      {schedule.class_type && (
                        <span className={`inline-block px-2 py-1 rounded text-xs ${getDifficultyColor(schedule.class_type.difficulty_level)}`}>
                          {schedule.class_type.difficulty_level}
                        </span>
                      )}
                      
                      {!schedule.is_active && (
                        <span className="inline-block px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs">
                          Inactive
                        </span>
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

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 text-center">
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {schedules.filter(s => s.is_active).length}
          </div>
          <div className="text-gray-600">Active Schedules</div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6 text-center">
          <div className="text-3xl font-bold text-green-600 mb-2">
            {new Set(schedules.filter(s => s.is_active).map(s => s.instructor_id)).size}
          </div>
          <div className="text-gray-600">Active Instructors</div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6 text-center">
          <div className="text-3xl font-bold text-purple-600 mb-2">
            {new Set(schedules.filter(s => s.is_active).map(s => s.class_type_id)).size}
          </div>
          <div className="text-gray-600">Class Types</div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6 text-center">
          <div className="text-3xl font-bold text-orange-600 mb-2">
            {schedules.filter(s => s.is_active).reduce((sum, s) => sum + s.max_participants, 0)}
          </div>
          <div className="text-gray-600">Total Capacity</div>
        </div>
      </div>
    </div>
  )
}