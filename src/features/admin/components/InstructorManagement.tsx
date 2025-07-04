import {
  AlertTriangle,
  Award,
  Calendar,
  Clock,
  DollarSign,
  Edit,
  Filter,
  GraduationCap, Mail, Phone,
  Plus,
  Search,
  Trash2,
  X
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../../../shared/components/ui/Button'
import { LoadingSpinner } from '../../../shared/components/ui/LoadingSpinner'
import { supabase } from '../../../shared/lib/supabase'

interface Instructor {
  id: string
  name: string
  bio: string
  email: string
  phone: string
  specialties: string[]
  experience_years: number
  certification: string
  avatar_url: string
  is_active: boolean
  created_at: string
  updated_at: string
  // Metrics fields (joined from other tables)
  total_classes?: number
  attended_classes?: number
  upcoming_classes?: number
  total_earnings?: number
}

interface ClassType {
  id: string
  name: string
  description: string
  difficulty_level: string
  price: number
}

interface ScheduledClass {
  id: string
  class_type_id: string
  instructor_id: string
  start_time: string
  end_time: string
  max_participants: number
  current_participants: number
  status: string
  class_type?: ClassType
}

export function InstructorManagement() {
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInstructor, setSelectedInstructor] = useState<Instructor | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [specialtyFilter, setSpecialtyFilter] = useState('all')
  const [activeTab, setActiveTab] = useState<'details' | 'classes' | 'metrics' | 'payments'>('details')
  const [scheduledClasses, setScheduledClasses] = useState<ScheduledClass[]>([])
  const [classLoading, setClassLoading] = useState(false)
  const [availableClassTypes, setAvailableClassTypes] = useState<ClassType[]>([])
  const [showAssignClassModal, setShowAssignClassModal] = useState(false)
  const [newClassForm, setNewClassForm] = useState({
    class_type_id: '',
    start_date: '',
    start_time: '',
    end_time: '',
    max_participants: 20
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState('')
  
  // Form for editing/creating instructors
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    email: '',
    phone: '',
    specialties: [] as string[],
    experience_years: 0,
    certification: '',
    avatar_url: '',
    is_active: true
  })
  
  // For adding specialties
  const [newSpecialty, setNewSpecialty] = useState('')

  useEffect(() => {
    fetchInstructors()
    fetchClassTypes()
  }, [])

  useEffect(() => {
    if (selectedInstructor) {
      fetchInstructorClasses(selectedInstructor.id)
    }
  }, [selectedInstructor])

  const fetchInstructors = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('instructors')
        .select('*')
        .order('name')

      if (error) throw error

      // Add metrics data to instructors
      const enrichedData = await Promise.all(
        (data || []).map(async (instructor) => {
          // Get scheduled classes count
          const { count: scheduledCount, error: scheduledError } = await supabase
            .from('scheduled_classes')
            .select('*', { count: 'exact', head: true })
            .eq('instructor_id', instructor.id)

          // Get completed classes count
          const { count: completedCount, error: completedError } = await supabase
            .from('scheduled_classes')
            .select('*', { count: 'exact', head: true })
            .eq('instructor_id', instructor.id)
            .eq('status', 'completed')
            
          // Get upcoming classes count
          const { count: upcomingCount, error: upcomingError } = await supabase
            .from('scheduled_classes')
            .select('*', { count: 'exact', head: true })
            .eq('instructor_id', instructor.id)
            .eq('status', 'scheduled')
            .gt('start_time', new Date().toISOString())

          // Calculate total earnings (this would be more complex in a real app)
          // Here we're just using a mock calculation based on completed classes
          const totalEarnings = (completedCount || 0) * 50 // $50 per class

          if (scheduledError || completedError || upcomingError) {
            console.error('Error fetching instructor metrics:', { scheduledError, completedError, upcomingError })
          }

          return {
            ...instructor,
            total_classes: scheduledCount || 0,
            attended_classes: completedCount || 0,
            upcoming_classes: upcomingCount || 0,
            total_earnings: totalEarnings
          }
        })
      )

      setInstructors(enrichedData || [])
    } catch (error) {
      console.error('Error fetching instructors:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchClassTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('class_types')
        .select('*')
        .order('name')
        .eq('is_active', true)

      if (error) throw error
      setAvailableClassTypes(data || [])
    } catch (error) {
      console.error('Error fetching class types:', error)
    }
  }

  const fetchInstructorClasses = async (instructorId: string) => {
    try {
      setClassLoading(true)
      const { data, error } = await supabase
        .from('scheduled_classes')
        .select('*, class_type:class_types(*)')
        .eq('instructor_id', instructorId)
        .order('start_time', { ascending: false })

      if (error) throw error
      setScheduledClasses(data || [])
    } catch (error) {
      console.error('Error fetching instructor classes:', error)
    } finally {
      setClassLoading(false)
    }
  }

  const handleSelectInstructor = (instructor: Instructor) => {
    setSelectedInstructor(instructor)
    setFormData({
      name: instructor.name,
      bio: instructor.bio || '',
      email: instructor.email || '',
      phone: instructor.phone || '',
      specialties: instructor.specialties || [],
      experience_years: instructor.experience_years || 0,
      certification: instructor.certification || '',
      avatar_url: instructor.avatar_url || '',
      is_active: instructor.is_active
    })
    setIsEditing(false)
    setActiveTab('details')
  }

  const handleCreateInstructor = () => {
    setSelectedInstructor(null)
    setFormData({
      name: '',
      bio: '',
      email: '',
      phone: '',
      specialties: [],
      experience_years: 0,
      certification: '',
      avatar_url: '',
      is_active: true
    })
    setIsCreating(true)
  }

  const handleDeleteInstructor = async (id: string) => {
    try {
      // Check if instructor has any classes
      const { count, error: countError } = await supabase
        .from('scheduled_classes')
        .select('*', { count: 'exact', head: true })
        .eq('instructor_id', id)

      if (countError) throw countError

      if (count && count > 0) {
        alert(`This instructor has ${count} classes scheduled. Please reassign or delete these classes before removing the instructor.`)
        setShowDeleteConfirm(null)
        return
      }

      const { error } = await supabase
        .from('instructors')
        .delete()
        .eq('id', id)

      if (error) throw error

      setInstructors(instructors.filter(instructor => instructor.id !== id))
      setShowDeleteConfirm(null)
      
      if (selectedInstructor?.id === id) {
        setSelectedInstructor(null)
      }
      
      setSuccessMessage('Instructor deleted successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Error deleting instructor:', error)
    }
  }

  const handleAddSpecialty = () => {
    if (newSpecialty.trim() && !formData.specialties.includes(newSpecialty.trim())) {
      setFormData(prev => ({
        ...prev,
        specialties: [...prev.specialties, newSpecialty.trim()]
      }))
      setNewSpecialty('')
    }
  }

  const handleRemoveSpecialty = (specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.filter(s => s !== specialty)
    }))
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}
    
    if (!formData.name.trim()) errors.name = 'Name is required'
    if (!formData.email.trim()) errors.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Email is invalid'
    
    if (formData.avatar_url && !/^https?:\/\//.test(formData.avatar_url)) {
      errors.avatar_url = 'Avatar URL must be a valid URL'
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return
    
    try {
      if (selectedInstructor && isEditing) {
        // Update existing instructor
        const { error } = await supabase
          .from('instructors')
          .update(formData)
          .eq('id', selectedInstructor.id)
        
        if (error) throw error
        
        // Update local state
        setInstructors(instructors.map(instructor => 
          instructor.id === selectedInstructor.id 
            ? { ...instructor, ...formData } 
            : instructor
        ))
        
        setSelectedInstructor({ ...selectedInstructor, ...formData })
        setIsEditing(false)
        setSuccessMessage('Instructor updated successfully')
      } else {
        // Create new instructor
        const { data, error } = await supabase
          .from('instructors')
          .insert([formData])
          .select()
        
        if (error) throw error
        
        // Add to local state with metrics initialized to 0
        const newInstructor = {
          ...data[0],
          total_classes: 0,
          attended_classes: 0,
          upcoming_classes: 0,
          total_earnings: 0
        }
        
        setInstructors([...instructors, newInstructor])
        setSelectedInstructor(newInstructor)
        setIsCreating(false)
        setSuccessMessage('Instructor created successfully')
      }
      
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Error saving instructor:', error)
      setFormErrors({ submit: 'Failed to save instructor data' })
    }
  }

  const validateClassForm = () => {
    const errors: Record<string, string> = {}
    
    if (!newClassForm.class_type_id) errors.class_type_id = 'Class type is required'
    if (!newClassForm.start_date) errors.start_date = 'Date is required'
    if (!newClassForm.start_time) errors.start_time = 'Start time is required'
    if (!newClassForm.end_time) errors.end_time = 'End time is required'
    if (!newClassForm.max_participants) errors.max_participants = 'Max participants is required'
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleAssignClass = async () => {
    if (!selectedInstructor || !validateClassForm()) return
    
    try {
      const startDateTime = `${newClassForm.start_date}T${newClassForm.start_time}:00`
      const endDateTime = `${newClassForm.start_date}T${newClassForm.end_time}:00`
      
      const classData = {
        instructor_id: selectedInstructor.id,
        class_type_id: newClassForm.class_type_id,
        start_time: startDateTime,
        end_time: endDateTime,
        max_participants: newClassForm.max_participants,
        status: 'scheduled'
      }
      
      const { data, error } = await supabase
        .from('scheduled_classes')
        .insert([classData])
        .select('*, class_type:class_types(*)')
      
      if (error) throw error
      
      // Add to local state
      setScheduledClasses([...scheduledClasses, data[0]])
      setShowAssignClassModal(false)
      
      // Reset form
      setNewClassForm({
        class_type_id: '',
        start_date: '',
        start_time: '',
        end_time: '',
        max_participants: 20
      })
      
      // Update instructor metrics
      if (selectedInstructor) {
        setSelectedInstructor({
          ...selectedInstructor,
          upcoming_classes: (selectedInstructor.upcoming_classes || 0) + 1,
          total_classes: (selectedInstructor.total_classes || 0) + 1
        })
      }
      
      setSuccessMessage('Class assigned successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Error assigning class:', error)
      setFormErrors({ submit: 'Failed to assign class' })
    }
  }

  const handleCancelClass = async (classId: string) => {
    if (!selectedInstructor) return
    
    try {
      const { error } = await supabase
        .from('scheduled_classes')
        .update({ status: 'cancelled' })
        .eq('id', classId)
      
      if (error) throw error
      
      // Update local state
      setScheduledClasses(scheduledClasses.map(c => 
        c.id === classId ? { ...c, status: 'cancelled' } : c
      ))
      
      // Update instructor metrics
      setSelectedInstructor({
        ...selectedInstructor,
        upcoming_classes: (selectedInstructor.upcoming_classes || 0) - 1
      })
      
      setSuccessMessage('Class cancelled successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Error cancelling class:', error)
    }
  }

  // Filter instructors based on search term and specialty filter
  const filteredInstructors = instructors.filter(instructor => {
    const matchesSearch = searchTerm === '' || 
      instructor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (instructor.email && instructor.email.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesSpecialty = specialtyFilter === 'all' || 
      (instructor.specialties && instructor.specialties.includes(specialtyFilter))
    
    return matchesSearch && matchesSpecialty
  })

  // Get unique specialties for filter dropdown
  const allSpecialties = Array.from(new Set(
    instructors.flatMap(instructor => instructor.specialties || [])
  )).sort()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }
  
  const getClassStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      case 'in_progress': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Main list view
  if (!selectedInstructor && !isCreating) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <GraduationCap className="w-6 h-6 mr-2" />
            Instructor Management ({instructors.length})
          </h2>
          <Button onClick={handleCreateInstructor} className="flex items-center">
            <Plus className="w-4 h-4 mr-2" />
            Add Instructor
          </Button>
        </div>

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 flex justify-between items-center">
            <span>{successMessage}</span>
            <button onClick={() => setSuccessMessage('')}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Search and Filter */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {allSpecialties.length > 0 && (
              <div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <select
                    value={specialtyFilter}
                    onChange={(e) => setSpecialtyFilter(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                  >
                    <option value="all">All Specialties</option>
                    {allSpecialties.map(specialty => (
                      <option key={specialty} value={specialty}>{specialty}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Instructors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInstructors.length === 0 ? (
            <div className="col-span-3 text-center py-12">
              <GraduationCap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No instructors found</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || specialtyFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Get started by adding an instructor to the system.'}
              </p>
              <Button onClick={handleCreateInstructor}>
                <Plus className="w-4 h-4 mr-2" />
                Add Instructor
              </Button>
            </div>
          ) : (
            filteredInstructors.map((instructor) => (
              <div
                key={instructor.id}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
              >
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      {instructor.avatar_url ? (
                        <img
                          src={instructor.avatar_url}
                          alt={instructor.name}
                          className="w-12 h-12 rounded-full object-cover mr-4"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg mr-4">
                          {instructor.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{instructor.name}</h3>
                        {instructor.experience_years > 0 && (
                          <p className="text-sm text-gray-600">{instructor.experience_years} years experience</p>
                        )}
                      </div>
                    </div>
                    <div>
                      {instructor.is_active ? (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                          Active
                        </span>
                      ) : (
                        <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {instructor.specialties && instructor.specialties.length > 0 && (
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-1">
                        {instructor.specialties.slice(0, 3).map((specialty, index) => (
                          <span 
                            key={index} 
                            className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                          >
                            {specialty}
                          </span>
                        ))}
                        {instructor.specialties.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{instructor.specialties.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <p className="text-lg font-semibold text-blue-600">{instructor.total_classes || 0}</p>
                      <p className="text-xs text-gray-500">Total Classes</p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <p className="text-lg font-semibold text-green-600">{formatCurrency(instructor.total_earnings || 0)}</p>
                      <p className="text-xs text-gray-500">Earnings</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between">
                    {instructor.email && (
                      <a 
                        href={`mailto:${instructor.email}`}
                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                      >
                        <Mail className="w-3 h-3 mr-1" />
                        Email
                      </a>
                    )}
                    
                    <button 
                      onClick={() => handleSelectInstructor(instructor)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View Details →
                    </button>
                  </div>
                </div>
                
                <div className="p-4 bg-gray-50 flex justify-between">
                  <button
                    onClick={() => {
                      setSelectedInstructor(instructor)
                      setIsEditing(true)
                      setFormData({
                        name: instructor.name,
                        bio: instructor.bio || '',
                        email: instructor.email || '',
                        phone: instructor.phone || '',
                        specialties: instructor.specialties || [],
                        experience_years: instructor.experience_years || 0,
                        certification: instructor.certification || '',
                        avatar_url: instructor.avatar_url || '',
                        is_active: instructor.is_active
                      })
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </button>
                  
                  <button
                    onClick={() => setShowDeleteConfirm(instructor.id)}
                    className="text-red-600 hover:text-red-800 text-sm flex items-center"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Deletion</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this instructor? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleDeleteInstructor(showDeleteConfirm)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Detail view or edit/create form
  return (
    <div className="space-y-6">
      <div className="flex items-center mb-4">
        <button
          onClick={() => {
            setSelectedInstructor(null)
            setIsCreating(false)
            setIsEditing(false)
          }}
          className="text-blue-600 hover:text-blue-800 flex items-center mr-4"
        >
          ← Back to Instructors
        </button>
        <h2 className="text-2xl font-bold text-gray-900">
          {isCreating ? 'Add New Instructor' : isEditing ? 'Edit Instructor' : selectedInstructor?.name}
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

      {(isEditing || isCreating) ? (
        // Edit/Create Form
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="space-y-6">
            {formErrors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  {formErrors.submit}
                </p>
              </div>
            )}
            
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {formErrors.name && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {formErrors.email && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Years of Experience
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.experience_years}
                  onChange={(e) => setFormData({...formData, experience_years: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bio
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tell us about the instructor's background, teaching style, etc."
              />
            </div>
            
            {/* Specialties */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Specialties
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.specialties.map((specialty, index) => (
                  <div
                    key={index}
                    className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center"
                  >
                    {specialty}
                    <button
                      type="button"
                      onClick={() => handleRemoveSpecialty(specialty)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSpecialty}
                  onChange={(e) => setNewSpecialty(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSpecialty())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add a specialty"
                />
                <Button
                  type="button"
                  onClick={handleAddSpecialty}
                  variant="outline"
                  size="sm"
                >
                  Add
                </Button>
              </div>
            </div>
            
            {/* Other Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Certification
                </label>
                <input
                  type="text"
                  value={formData.certification}
                  onChange={(e) => setFormData({...formData, certification: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="E.g., RYT-200, E-RYT 500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Avatar URL
                </label>
                <input
                  type="url"
                  value={formData.avatar_url}
                  onChange={(e) => setFormData({...formData, avatar_url: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.avatar_url ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="https://example.com/avatar.jpg"
                />
                {formErrors.avatar_url && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.avatar_url}</p>
                )}
              </div>
              
              <div className="col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-gray-700">Active Instructor</span>
                </label>
              </div>
            </div>
            
            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => {
                  if (selectedInstructor) {
                    setIsEditing(false)
                    setFormData({
                      name: selectedInstructor.name,
                      bio: selectedInstructor.bio || '',
                      email: selectedInstructor.email || '',
                      phone: selectedInstructor.phone || '',
                      specialties: selectedInstructor.specialties || [],
                      experience_years: selectedInstructor.experience_years || 0,
                      certification: selectedInstructor.certification || '',
                      avatar_url: selectedInstructor.avatar_url || '',
                      is_active: selectedInstructor.is_active
                    })
                  } else {
                    setIsCreating(false)
                  }
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                {isCreating ? 'Create Instructor' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      ) : selectedInstructor ? (
        // Instructor Detail View
        <div className="space-y-6">
          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-lg">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'details'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Details
                </button>
                <button
                  onClick={() => setActiveTab('classes')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'classes'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Classes
                </button>
                <button
                  onClick={() => setActiveTab('metrics')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'metrics'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Metrics
                </button>
                <button
                  onClick={() => setActiveTab('payments')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'payments'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Payments
                </button>
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'details' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {selectedInstructor.avatar_url ? (
                        <img
                          src={selectedInstructor.avatar_url}
                          alt={selectedInstructor.name}
                          className="w-16 h-16 rounded-full object-cover mr-6"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl mr-6">
                          {selectedInstructor.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">{selectedInstructor.name}</h2>
                        <div className="flex items-center mt-1">
                          {selectedInstructor.is_active ? (
                            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                              Active
                            </span>
                          ) : (
                            <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
                              Inactive
                            </span>
                          )}
                          {selectedInstructor.certification && (
                            <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                              {selectedInstructor.certification}
                            </span>
                          )}
                          <span className="ml-2 text-gray-500 text-sm">
                            {selectedInstructor.experience_years} years experience
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => setIsEditing(true)}
                      variant="outline"
                      className="flex items-center"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Contact Information */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Contact Information</h3>
                      <div className="space-y-2">
                        {selectedInstructor.email && (
                          <div className="flex items-center">
                            <Mail className="w-4 h-4 text-gray-400 mr-2" />
                            <a 
                              href={`mailto:${selectedInstructor.email}`} 
                              className="text-blue-600 hover:text-blue-800"
                            >
                              {selectedInstructor.email}
                            </a>
                          </div>
                        )}
                        {selectedInstructor.phone && (
                          <div className="flex items-center">
                            <Phone className="w-4 h-4 text-gray-400 mr-2" />
                            <a 
                              href={`tel:${selectedInstructor.phone}`} 
                              className="text-blue-600 hover:text-blue-800"
                            >
                              {selectedInstructor.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Specialties */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Specialties</h3>
                      {selectedInstructor.specialties && selectedInstructor.specialties.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedInstructor.specialties.map((specialty, index) => (
                            <span 
                              key={index} 
                              className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                            >
                              {specialty}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No specialties listed</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Bio */}
                  {selectedInstructor.bio && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Biography</h3>
                      <p className="text-gray-700">{selectedInstructor.bio}</p>
                    </div>
                  )}
                  
                  {/* Metrics Summary */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Performance Overview</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-blue-700">{selectedInstructor.total_classes || 0}</p>
                        <p className="text-sm text-gray-600">Total Classes</p>
                      </div>
                      
                      <div className="bg-green-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-green-700">{selectedInstructor.attended_classes || 0}</p>
                        <p className="text-sm text-gray-600">Completed</p>
                      </div>
                      
                      <div className="bg-yellow-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-yellow-700">{selectedInstructor.upcoming_classes || 0}</p>
                        <p className="text-sm text-gray-600">Upcoming</p>
                      </div>
                      
                      <div className="bg-purple-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-purple-700">{formatCurrency(selectedInstructor.total_earnings || 0)}</p>
                        <p className="text-sm text-gray-600">Total Earnings</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'classes' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-gray-900">Scheduled Classes</h3>
                    <Button
                      onClick={() => {
                        setShowAssignClassModal(true)
                        setFormErrors({})
                      }}
                      size="sm"
                      className="flex items-center"
                    >
                      <Calendar className="w-4 h-4 mr-1" />
                      Assign Class
                    </Button>
                  </div>
                  
                  {classLoading ? (
                    <div className="flex justify-center py-8">
                      <LoadingSpinner size="md" />
                    </div>
                  ) : scheduledClasses.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No classes scheduled</h3>
                      <p className="text-gray-600 mb-4">This instructor doesn't have any classes scheduled yet.</p>
                      <Button
                        onClick={() => setShowAssignClassModal(true)}
                        size="sm"
                      >
                        Assign First Class
                      </Button>
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Class
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date & Time
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Participants
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Payment
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {scheduledClasses.map((classItem) => (
                            <tr key={classItem.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {classItem.class_type?.name || 'Unknown Class'}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {classItem.class_type?.difficulty_level || ''}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {formatDate(classItem.start_time)}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {formatTime(classItem.start_time)} - {formatTime(classItem.end_time)}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {classItem.current_participants} / {classItem.max_participants}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 text-xs rounded-full ${getClassStatusColor(classItem.status)}`}>
                                  {classItem.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {formatCurrency(classItem.class_type?.price || 0)}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {classItem.status === 'scheduled' && (
                                  <button
                                    onClick={() => handleCancelClass(classItem.id)}
                                    className="text-red-600 hover:text-red-800 text-sm"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'metrics' && (
                <div className="space-y-6">
                  <h3 className="font-semibold text-gray-900">Performance Metrics</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-medium text-gray-500">Total Classes</h4>
                        <Calendar className="w-6 h-6 text-blue-500" />
                      </div>
                      <p className="text-3xl font-bold text-gray-900">{selectedInstructor.total_classes || 0}</p>
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-sm text-gray-500">
                          <span className="font-medium text-green-600">{selectedInstructor.attended_classes || 0}</span> completed
                        </p>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-medium text-gray-500">Upcoming</h4>
                        <Clock className="w-6 h-6 text-green-500" />
                      </div>
                      <p className="text-3xl font-bold text-gray-900">{selectedInstructor.upcoming_classes || 0}</p>
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-sm text-gray-500">
                          Next 7 days: <span className="font-medium text-blue-600">
                            {scheduledClasses.filter(c => {
                              const date = new Date(c.start_time);
                              const now = new Date();
                              const sevenDays = new Date();
                              sevenDays.setDate(sevenDays.getDate() + 7);
                              return date >= now && date <= sevenDays && c.status === 'scheduled';
                            }).length}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-medium text-gray-500">Total Earnings</h4>
                        <DollarSign className="w-6 h-6 text-emerald-500" />
                      </div>
                      <p className="text-3xl font-bold text-gray-900">{formatCurrency(selectedInstructor.total_earnings || 0)}</p>
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-sm text-gray-500">
                          Per class: <span className="font-medium text-emerald-600">
                            {formatCurrency(50)}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-medium text-gray-500">Student Rating</h4>
                        <Award className="w-6 h-6 text-amber-500" />
                      </div>
                      <p className="text-3xl font-bold text-gray-900">4.8</p>
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex text-amber-400">
                          {'★★★★★'.split('').map((_, i) => (
                            <span key={i}>★</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Performance Stats */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h4 className="font-medium text-gray-900 mb-4">Class Statistics</h4>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-600">Attendance Rate</span>
                          <span className="text-sm font-medium text-gray-900">95%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full" style={{ width: '95%' }}></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-600">Class Capacity</span>
                          <span className="text-sm font-medium text-gray-900">85%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-600">Booking Retention</span>
                          <span className="text-sm font-medium text-gray-900">78%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-purple-500 h-2 rounded-full" style={{ width: '78%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'payments' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Payment History</h3>
                    <div className="text-sm bg-gray-100 px-3 py-1 rounded-lg">
                      <span className="font-medium">Rate:</span> {formatCurrency(50)}/class
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="font-medium text-gray-900">Payment Summary</h4>
                      <Button size="sm" className="flex items-center">
                        <DollarSign className="w-4 h-4 mr-1" />
                        Record Payment
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-500 mb-1">Total Paid</p>
                        <p className="text-xl font-bold text-gray-900">{formatCurrency(selectedInstructor.total_earnings || 0)}</p>
                      </div>
                      
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-500 mb-1">This Month</p>
                        <p className="text-xl font-bold text-gray-900">{formatCurrency(350)}</p>
                      </div>
                      
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-500 mb-1">Outstanding</p>
                        <p className="text-xl font-bold text-gray-900">{formatCurrency(0)}</p>
                      </div>
                    </div>
                    
                    <h4 className="font-medium text-gray-900 mb-4 border-b pb-2">Recent Payments</h4>
                    
                    <div className="space-y-4">
                      {[
                        { 
                          id: '1', 
                          date: '2025-07-01', 
                          description: 'June 2025 Classes (7 classes)', 
                          amount: 350,
                          status: 'paid'
                        },
                        { 
                          id: '2', 
                          date: '2025-06-01', 
                          description: 'May 2025 Classes (8 classes)', 
                          amount: 400,
                          status: 'paid'
                        },
                        { 
                          id: '3', 
                          date: '2025-05-01', 
                          description: 'April 2025 Classes (6 classes)', 
                          amount: 300,
                          status: 'paid'
                        }
                      ].map(payment => (
                        <div key={payment.id} className="flex justify-between items-center p-4 hover:bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{payment.description}</p>
                            <p className="text-sm text-gray-500">{formatDate(payment.date)}</p>
                          </div>
                          <div className="flex items-center">
                            <p className="font-medium text-gray-900 mr-3">{formatCurrency(payment.amount)}</p>
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              {payment.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                      <button className="text-blue-600 hover:text-blue-800 text-sm">
                        View All Payments →
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h4 className="font-medium text-gray-900 mb-4">Payment Settings</h4>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Payment Rate</p>
                        <div className="flex items-center">
                          <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                            <span className="font-medium text-gray-900">{formatCurrency(50)}</span> per class
                          </div>
                          <button className="ml-2 text-blue-600 hover:text-blue-800 text-sm">
                            Edit
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Payment Method</p>
                        <div className="flex items-center">
                          <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                            <span className="font-medium text-gray-900">Direct Deposit</span>
                          </div>
                          <button className="ml-2 text-blue-600 hover:text-blue-800 text-sm">
                            Edit
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Payment Schedule</p>
                        <div className="flex items-center">
                          <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                            <span className="font-medium text-gray-900">Monthly</span> (1st of each month)
                          </div>
                          <button className="ml-2 text-blue-600 hover:text-blue-800 text-sm">
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Assign Class Modal */}
      {showAssignClassModal && selectedInstructor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  Assign Class to {selectedInstructor.name}
                </h3>
                <button
                  onClick={() => {
                    setShowAssignClassModal(false)
                    setFormErrors({})
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-6">
                {formErrors.submit && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-600 text-sm flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      {formErrors.submit}
                    </p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Class Type *
                  </label>
                  <select
                    value={newClassForm.class_type_id}
                    onChange={(e) => setNewClassForm({...newClassForm, class_type_id: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formErrors.class_type_id ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select a class type</option>
                    {availableClassTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.name} ({type.difficulty_level})</option>
                    ))}
                  </select>
                  {formErrors.class_type_id && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.class_type_id}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={newClassForm.start_date}
                    onChange={(e) => setNewClassForm({...newClassForm, start_date: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formErrors.start_date ? 'border-red-500' : 'border-gray-300'
                    }`}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  {formErrors.start_date && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.start_date}</p>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time *
                    </label>
                    <input
                      type="time"
                      value={newClassForm.start_time}
                      onChange={(e) => setNewClassForm({...newClassForm, start_time: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formErrors.start_time ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {formErrors.start_time && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.start_time}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time *
                    </label>
                    <input
                      type="time"
                      value={newClassForm.end_time}
                      onChange={(e) => setNewClassForm({...newClassForm, end_time: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formErrors.end_time ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {formErrors.end_time && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.end_time}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Participants *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={newClassForm.max_participants}
                    onChange={(e) => setNewClassForm({...newClassForm, max_participants: parseInt(e.target.value)})}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formErrors.max_participants ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.max_participants && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.max_participants}</p>
                  )}
                </div>
                
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAssignClassModal(false)
                      setFormErrors({})
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleAssignClass}>
                    Assign Class
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}