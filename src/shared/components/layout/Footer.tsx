import { Facebook, Instagram, Mail, MapPin, Phone, Twitter } from 'lucide-react'
import { Link } from 'react-router-dom'
import { NewsletterSignup } from '../../../features/marketing/components/NewsletterSignup'

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">Y</span>
              </div>
              <span className="text-2xl font-bold">Yogodyaan</span>
            </div>
            <p className="text-gray-300 mb-6 max-w-md">
              Transform your life through the ancient practice of yoga. Join our community and discover inner peace, strength, and wellness.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-emerald-400 transition-colors">
                <Facebook size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-emerald-400 transition-colors">
                <Instagram size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-emerald-400 transition-colors">
                <Twitter size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link to="/about" className="text-gray-300 hover:text-emerald-400 transition-colors">About Us</Link></li>
              <li><Link to="/book-class" className="text-gray-300 hover:text-emerald-400 transition-colors">Book Class</Link></li>
              <li><Link to="/learning" className="text-gray-300 hover:text-emerald-400 transition-colors">Learning Center</Link></li>
              <li><Link to="/contact" className="text-gray-300 hover:text-emerald-400 transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Info</h3>
            <ul className="space-y-3">
              <li className="flex items-center space-x-2">
                <Mail size={16} className="text-emerald-400" />
                <span className="text-gray-300">info@yogodyaan.com</span>
              </li>
              <li className="flex items-center space-x-2">
                <Phone size={16} className="text-emerald-400" />
                <span className="text-gray-300">+1 (555) 123-4567</span>
              </li>
              <li className="flex items-start space-x-2">
                <MapPin size={16} className="text-emerald-400 mt-1" />
                <span className="text-gray-300">123 Wellness Street<br />Yoga City, YC 12345</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Newsletter Signup */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="max-w-md mx-auto">
            <NewsletterSignup 
              className="bg-gray-800 border border-gray-700" 
              showTitle={false}
            />
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-400">
            © 2024 Yogodyaan. All rights reserved. Made with ❤️ for your wellness journey.
          </p>
        </div>
      </div>
    </footer>
  )
}