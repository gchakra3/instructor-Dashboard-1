import { Clock, Globe, Mail, MessageCircle, Send } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../shared/components/ui/Button'
import { supabase } from '../../../shared/lib/supabase'

export function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState<any>({})

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev: any) => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: any = {}
    
    if (!formData.name.trim()) newErrors.name = 'Name is required'
    if (!formData.email.trim()) newErrors.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid'
    if (!formData.subject.trim()) newErrors.subject = 'Subject is required'
    if (!formData.message.trim()) newErrors.message = 'Message is required'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    
    try {
      const contactData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || '',
        subject: formData.subject,
        message: formData.message,
        status: 'new'
      }

      const { error } = await supabase
        .from('contact_messages')
        .insert([contactData])

      if (error) {
        throw error
      }

      setSubmitted(true)
    } catch (error: any) {
      setErrors({ general: error.message || 'An error occurred while sending your message.' })
    } finally {
      setLoading(false)
    }
  }

  const contactInfo = [
    {
      icon: <Globe className="w-6 h-6 text-blue-600" />,
      title: "Global Reach",
      details: ["Available worldwide", "Online sessions only"],
      action: null
    },
    {
      icon: <Mail className="w-6 h-6 text-green-600" />,
      title: "Email Us",
      details: ["hello@yogodaan.com"],
      action: "Send Email"
    },
    {
      icon: <MessageCircle className="w-6 h-6 text-purple-600" />,
      title: "Quick Response",
      details: ["24-48 hour response time"],
      action: null
    },
    {
      icon: <Clock className="w-6 h-6 text-orange-600" />,
      title: "Flexible Hours",
      details: ["Sessions available 24/7", "Across all time zones"],
      action: null
    }
  ]

  const timeZones = [
    { zone: "PST (UTC-8)", time: "06:00 AM - 10:00 PM" },
    { zone: "EST (UTC-5)", time: "09:00 AM - 01:00 AM" },
    { zone: "GMT (UTC+0)", time: "02:00 PM - 06:00 AM" },
    { zone: "IST (UTC+5:30)", time: "07:30 PM - 11:30 AM" },
    { zone: "JST (UTC+9)", time: "11:00 PM - 03:00 PM" },
    { zone: "AEST (UTC+10)", time: "12:00 AM - 04:00 PM" }
  ]

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto px-4">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Message Sent!</h2>
            <p className="text-gray-600 mb-6">
              Thank you for contacting us. We'll get back to you within 24-48 hours.
            </p>
            <Button onClick={() => {
              setSubmitted(false)
              setFormData({
                name: '',
                email: '',
                phone: '',
                subject: '',
                message: ''
              })
            }}>
              Send Another Message
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-green-50 py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">Begin Your Wellness Journey</h1>
          <p className="text-xl text-gray-600 leading-relaxed">
            Schedule a class or learn more about our programs. We're here to support your 
            wellness goals and answer any questions you may have.
          </p>
        </div>
      </section>

      {/* Contact Info */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            {contactInfo.map((info, index) => (
              <div key={index} className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition-all duration-300">
                <div className="flex justify-center mb-4">
                  {info.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{info.title}</h3>
                <div className="space-y-1 mb-4">
                  {info.details.map((detail, idx) => (
                    <p key={idx} className="text-gray-600 text-sm">{detail}</p>
                  ))}
                </div>
                {info.action && (
                  <button className="text-blue-600 hover:text-blue-700 font-medium transition-colors text-sm">
                    {info.action}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Contact Form and Time Zones */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Send Us a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                {errors.general && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-600 text-sm">{errors.general}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Your full name"
                    />
                    {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="your@email.com"
                    />
                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Phone (Optional)
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                      Subject *
                    </label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.subject ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="How can we help?"
                    />
                    {errors.subject && <p className="text-red-500 text-sm mt-1">{errors.subject}</p>}
                  </div>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={5}
                    value={formData.message}
                    onChange={handleInputChange}
                    placeholder="Tell us about your wellness goals, questions about our services, or how we can help you..."
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.message ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.message && <p className="text-red-500 text-sm mt-1">{errors.message}</p>}
                </div>

                <Button
                  type="submit"
                  loading={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center"
                >
                  {loading ? (
                    'Sending...'
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
              </form>
            </div>

            {/* Global Time Zone Reference */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Global Time Zone Reference</h2>
              <p className="text-gray-600 mb-6">
                We offer sessions across all time zones. Here are our typical availability windows:
              </p>
              
              <div className="space-y-4">
                {timeZones.map((tz, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-900">{tz.zone}</span>
                    <span className="text-sm text-gray-600">{tz.time}</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Flexible Scheduling</h3>
                <p className="text-sm text-blue-800">
                  Can't find a suitable time? Contact us for custom scheduling options. 
                  We're committed to finding a time that works for your busy lifestyle.
                </p>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Social Media</h3>
                  <div className="flex space-x-4">
                    <a href="#" className="text-blue-600 hover:text-blue-700 transition-colors">
                      LinkedIn
                    </a>
                    <a href="#" className="text-blue-600 hover:text-blue-700 transition-colors">
                      Instagram
                    </a>
                    <a href="#" className="text-blue-600 hover:text-blue-700 transition-colors">
                      YouTube
                    </a>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Quick Links</h3>
                  <div className="space-y-2">
                    <a href="/book-class" className="block text-blue-600 hover:text-blue-700 transition-colors text-sm">
                      Book a Session
                    </a>
                    <a href="/services" className="block text-blue-600 hover:text-blue-700 transition-colors text-sm">
                      View Services
                    </a>
                    <a href="/testimonials" className="block text-blue-600 hover:text-blue-700 transition-colors text-sm">
                      Read Testimonials
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}