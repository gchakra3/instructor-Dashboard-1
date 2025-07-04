import { CheckCircle, Mail } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../shared/components/ui/Button'
import { supabase } from '../../../shared/lib/supabase'

interface NewsletterSignupProps {
  className?: string
  showTitle?: boolean
}

export function NewsletterSignup({ className = '', showTitle = true }: NewsletterSignupProps) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim()) {
      setError('Email is required')
      return
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error: submitError } = await supabase
        .from('newsletter_subscribers')
        .insert([{
          email: email.trim(),
          name: name.trim() || null,
          status: 'active'
        }])

      if (submitError) {
        if (submitError.code === '23505') { // Unique constraint violation
          setError('This email is already subscribed to our newsletter')
        } else {
          throw submitError
        }
        return
      }

      setSubscribed(true)
      setEmail('')
      setName('')
    } catch (error: any) {
      console.error('Newsletter signup error:', error)
      setError('Failed to subscribe. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (subscribed) {
    return (
      <div className={`bg-green-50 border border-green-200 rounded-lg p-6 text-center ${className}`}>
        <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-green-900 mb-2">Successfully Subscribed!</h3>
        <p className="text-green-700">
          Thank you for subscribing to our newsletter. You'll receive updates about new classes, 
          wellness tips, and special offers.
        </p>
        <button
          onClick={() => setSubscribed(false)}
          className="mt-4 text-green-600 hover:text-green-700 font-medium text-sm"
        >
          Subscribe another email
        </button>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      {showTitle && (
        <div className="text-center mb-6">
          <Mail className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Stay Updated</h3>
          <p className="text-gray-600">
            Get the latest yoga tips, class updates, and wellness insights delivered to your inbox.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div>
          <label htmlFor="newsletter-name" className="block text-sm font-medium text-gray-700 mb-1">
            Name (Optional)
          </label>
          <input
            type="text"
            id="newsletter-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Your name"
          />
        </div>

        <div>
          <label htmlFor="newsletter-email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address *
          </label>
          <input
            type="email"
            id="newsletter-email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError('')
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="your@email.com"
            required
          />
        </div>

        <Button
          type="submit"
          loading={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          {loading ? 'Subscribing...' : 'Subscribe to Newsletter'}
        </Button>

        <p className="text-xs text-gray-500 text-center">
          We respect your privacy. Unsubscribe at any time.
        </p>
      </form>
    </div>
  )
}