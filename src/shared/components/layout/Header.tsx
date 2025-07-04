import { BookOpen, ChevronDown, ChevronUp, LayoutDashboard, LogOut, Menu, User, UserCircle, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAdmin as useAdminContext } from '../../../features/admin/contexts/AdminContext'
import { useAuth } from '../../../features/auth/contexts/AuthContext'
import { Button } from '../ui/Button'

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const { user, isMantraCurator: authMantraCurator, signOut } = useAuth()
  const { isAdmin, isMantraCurator: adminMantraCurator } = useAdminContext()
  const location = useLocation()
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Combine curator status from both contexts for backward compatibility
  const isMantraCurator = authMantraCurator || adminMantraCurator

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'About', href: '/about' },
    { name: 'Services', href: '/services' },
    { name: 'Schedule', href: '/schedule' },
    { name: 'Learning', href: '/learning' },
    { name: 'Testimonials', href: '/testimonials' },
    { name: 'Contact', href: '/contact' },
  ]

  const isActive = (path: string) => location.pathname === path

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const getUserDisplayName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name
    }
    // If no full name, extract name from email (before @)
    if (user?.email) {
      return user.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }
    return 'User'
  }

  const handleSignOut = () => {
    signOut()
    setIsDropdownOpen(false)
  }

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">Y</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">Yogodyaan</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`font-medium transition-colors duration-200 ${
                  isActive(item.href)
                    ? 'text-blue-600 border-b-2 border-blue-600 pb-1'
                    : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-gray-50"
                >
                  <User size={20} />
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium">
                      {getUserDisplayName()}
                      {isAdmin && <span className="text-blue-600 ml-1">(Admin)</span>}
                      {isMantraCurator && !isAdmin && <span className="text-emerald-600 ml-1">(Curator)</span>}
                    </span>
                  </div>
                  {isDropdownOpen ? (
                    <ChevronUp size={16} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={16} className="text-gray-400" />
                  )}
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                    <Link
                      to="/profile"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <UserCircle size={16} className="mr-2" />
                      Profile
                    </Link>

                    {isMantraCurator && (
                      <Link
                        to="/admin/dashboard"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <BookOpen size={16} className="mr-2" />
                        Manage Articles
                      </Link>
                    )}
                    
                    {isAdmin && (
                      <Link
                        to="/admin/dashboard"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <LayoutDashboard size={16} className="mr-2" />
                        Admin Dashboard
                      </Link>
                    )}
                    
                    <hr className="my-1" />
                    
                    <button
                      onClick={handleSignOut}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <LogOut size={16} className="mr-2" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login">
                <Button variant="outline" size="sm">Sign In</Button>
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <nav className="flex flex-col space-y-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`font-medium transition-colors duration-200 ${
                    isActive(item.href)
                      ? 'text-blue-600'
                      : 'text-gray-700 hover:text-blue-600'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <div className="pt-4 border-t">
                {user ? (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-gray-700 mb-3">
                      <User size={20} />
                      <span className="text-sm font-medium">
                        {getUserDisplayName()}
                        {isAdmin && <span className="text-blue-600 ml-1">(Admin)</span>}
                        {isMantraCurator && !isAdmin && <span className="text-emerald-600 ml-1">(Curator)</span>}
                      </span>
                    </div>
                    
                    <Link
                      to="/profile"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors py-2"
                    >
                      <UserCircle size={16} />
                      <span>Profile</span>
                    </Link>

                    {isMantraCurator && (
                      <Link
                        to="/admin/dashboard"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors py-2"
                      >
                        <BookOpen size={16} />
                        <span>Manage Articles</span>
                      </Link>
                    )}
                    
                    {isAdmin && (
                      <Link
                        to="/admin/dashboard"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors py-2"
                      >
                        <LayoutDashboard size={16} />
                        <span>Admin Dashboard</span>
                      </Link>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        signOut()
                        setIsMenuOpen(false)
                      }}
                      className="flex items-center space-x-1 w-full justify-center"
                    >
                      <LogOut size={16} />
                      <span>Sign Out</span>
                    </Button>
                  </div>
                ) : (
                  <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full">Sign In</Button>
                  </Link>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}