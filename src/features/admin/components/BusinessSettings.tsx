import { Clock, Globe, Mail, Phone, Save, Settings } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../../../shared/components/ui/Button'
import { LoadingSpinner } from '../../../shared/components/ui/LoadingSpinner'
import { supabase } from '../../../shared/lib/supabase'

export function BusinessSettings() {
  const [settings, setSettings] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<any>({})

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('business_settings')
        .select('*')

      if (error) throw error

      const settingsMap = data.reduce((acc, setting) => {
        acc[setting.key] = setting.value
        return acc
      }, {})

      setSettings(settingsMap)
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    if (errors[key]) {
      setErrors((prev: any) => ({ ...prev, [key]: '' }))
    }
  }

  const handleNestedChange = (key: string, nestedKey: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [nestedKey]: value
      }
    }))
  }

  const validateSettings = () => {
    const newErrors: any = {}
    
    if (!settings.site_name?.trim()) newErrors.site_name = 'Site name is required'
    if (!settings.contact_email?.trim()) newErrors.contact_email = 'Contact email is required'
    else if (!/\S+@\S+\.\S+/.test(settings.contact_email)) newErrors.contact_email = 'Invalid email format'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateSettings()) return

    try {
      setSaving(true)

      // Update each setting
      for (const [key, value] of Object.entries(settings)) {
        const { error } = await supabase
          .from('business_settings')
          .upsert({
            key,
            value: JSON.stringify(value),
            updated_by: (await supabase.auth.getUser()).data.user?.id
          })

        if (error) throw error
      }

      alert('Settings saved successfully!')
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Failed to save settings')
    } finally {
      setSaving(false)
    }
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
          <Settings className="w-6 h-6 mr-2" />
          Business Settings
        </h2>
        <Button
          onClick={handleSave}
          loading={saving}
          className="flex items-center"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Settings
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Basic Information */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Site Name
              </label>
              <input
                type="text"
                value={settings.site_name || ''}
                onChange={(e) => handleInputChange('site_name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.site_name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Your business name"
              />
              {errors.site_name && <p className="text-red-500 text-sm mt-1">{errors.site_name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Mail className="w-4 h-4 inline mr-1" />
                Contact Email
              </label>
              <input
                type="email"
                value={settings.contact_email || ''}
                onChange={(e) => handleInputChange('contact_email', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.contact_email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="contact@example.com"
              />
              {errors.contact_email && <p className="text-red-500 text-sm mt-1">{errors.contact_email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Phone className="w-4 h-4 inline mr-1" />
                Contact Phone
              </label>
              <input
                type="tel"
                value={settings.contact_phone || ''}
                onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>
        </div>

        {/* Social Media */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            <Globe className="w-5 h-5 inline mr-2" />
            Social Media
          </h3>
          
          <div className="space-y-4">
            {['facebook', 'instagram', 'twitter', 'youtube'].map((platform) => (
              <div key={platform}>
                <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                  {platform}
                </label>
                <input
                  type="url"
                  value={settings.social_media?.[platform] || ''}
                  onChange={(e) => handleNestedChange('social_media', platform, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`https://${platform}.com/yourpage`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Business Hours */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            <Clock className="w-5 h-5 inline mr-2" />
            Business Hours
          </h3>
          
          <div className="space-y-3">
            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
              <div key={day} className="flex items-center space-x-3">
                <label className="w-20 text-sm font-medium text-gray-700 capitalize">
                  {day}
                </label>
                <input
                  type="text"
                  value={settings.business_hours?.[day] || ''}
                  onChange={(e) => handleNestedChange('business_hours', day, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="9:00 AM - 5:00 PM"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Booking Settings */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Settings</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Advance Booking Days
              </label>
              <input
                type="number"
                value={settings.booking_settings?.advance_booking_days || 30}
                onChange={(e) => handleNestedChange('booking_settings', 'advance_booking_days', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                max="365"
              />
              <p className="text-sm text-gray-500 mt-1">How many days in advance can users book classes</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cancellation Hours
              </label>
              <input
                type="number"
                value={settings.booking_settings?.cancellation_hours || 2}
                onChange={(e) => handleNestedChange('booking_settings', 'cancellation_hours', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                max="48"
              />
              <p className="text-sm text-gray-500 mt-1">Minimum hours before class to allow cancellation</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Max Participants
              </label>
              <input
                type="number"
                value={settings.booking_settings?.max_participants_default || 20}
                onChange={(e) => handleNestedChange('booking_settings', 'max_participants_default', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                max="100"
              />
              <p className="text-sm text-gray-500 mt-1">Default maximum participants for new classes</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}