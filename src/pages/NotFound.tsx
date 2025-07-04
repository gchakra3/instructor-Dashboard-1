import { ArrowLeft, Home } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../shared/components/ui/Button'

export function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="text-9xl font-bold text-emerald-600 mb-4">404</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Page Not Found</h1>
          <p className="text-gray-600 mb-8">
            The page you're looking for doesn't exist. It might have been moved, 
            deleted, or you entered the wrong URL.
          </p>
        </div>

        <div className="space-y-4">
          <Link to="/">
            <Button className="w-full flex items-center justify-center">
              <Home className="w-4 h-4 mr-2" />
              Go to Homepage
            </Button>
          </Link>
          
          <button
            onClick={() => window.history.back()}
            className="w-full flex items-center justify-center text-emerald-600 hover:text-emerald-700 font-medium py-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </button>
        </div>

        <div className="mt-12 p-6 bg-white rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Looking for something specific?</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <Link to="/about" className="text-emerald-600 hover:text-emerald-700">
              About Us
            </Link>
            <Link to="/book-class" className="text-emerald-600 hover:text-emerald-700">
              Book Class
            </Link>
            <Link to="/yoga-query" className="text-emerald-600 hover:text-emerald-700">
              Ask Question
            </Link>
            <Link to="/contact" className="text-emerald-600 hover:text-emerald-700">
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}