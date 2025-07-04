import { Eye, EyeOff, Lock, Mail, Shield } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../../shared/components/ui/Button'
import { useAdmin } from '../../admin/contexts/AdminContext'

export function AdminLogin() {
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<any>({})
  
  const { signInAdmin } = useAdmin()
  const navigate = useNavigate()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev: any) => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: any = {}
    
    if (!formData.email.trim()) newErrors.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid'
    
    if (!formData.password) newErrors.password = 'Password is required'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    
    try {
      await signInAdmin(formData.email, formData.password)
      navigate('/admin/dashboard')
    } catch (error: any) {
      setErrors({ general: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link to="/" className="flex items-center justify-center space-x-2 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xl">Y</span>
            </div>
            <span className="text-3xl font-bold text-gradient">Yogodyaan</span>
          </Link>
          <div className="flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-emerald-600 mr-2" />
            <h2 className="text-3xl font-bold text-gray-900">Admin Access</h2>
          </div>
          <p className="mt-2 text-gray-600">
            Sign in to access the admin dashboard
          </p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.general && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{errors.general}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Admin Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter admin email"
                />
              </div>
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            </div>

            <Button
              type="submit"
              loading={loading}
              className="w-full"
            >
              {loading ? 'Signing in...' : 'Sign In to Admin'}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-emerald-50 rounded-lg">
            <h3 className="text-sm font-semibold text-emerald-800 mb-2">How to become an admin:</h3>
            <ol className="text-sm text-emerald-700 space-y-1">
              <li>1. Create a regular user account first</li>
              <li>2. Contact the super admin to add your email to the admin_users table</li>
              <li>3. Or have a super admin add you through the Supabase dashboard</li>
            </ol>
          </div>
        </div>

        <div className="text-center">
          <Link to="/" className="text-emerald-600 hover:text-emerald-700 font-medium">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}