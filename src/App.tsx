import { Route, BrowserRouter as Router, Routes } from 'react-router-dom'

// Context imports - updated paths
import { AdminProvider } from './features/admin/contexts/AdminContext'
import { AuthProvider } from './features/auth/contexts/AuthContext'
import { ThemeProvider } from './shared/contexts/ThemeContext'

// Layout components - updated paths
import { Footer } from './shared/components/layout/Footer'
import { Header } from './shared/components/layout/Header'

// Auth components - updated paths
import { ProtectedAdminRoute } from './features/auth/components/ProtectedAdminRoute'

// Page imports - updated paths
import { AdminDashboard } from './features/admin/pages/AdminDashboard'
import { AdminLogin } from './features/auth/pages/AdminLogin'
import { Login } from './features/auth/pages/Login'
import { ArticleView } from './features/learning/pages/ArticleView'
import { Learning } from './features/learning/pages/Learning'
import { About } from './features/marketing/pages/About'
import { Contact } from './features/marketing/pages/Contact'
import { Home } from './features/marketing/pages/Home'
import { Services } from './features/marketing/pages/Services'
import { Testimonials } from './features/marketing/pages/Testimonials'
import { BookClass } from './features/scheduling/pages/BookClass'
import { Schedule } from './features/scheduling/pages/Schedule'
import { Profile } from './features/user-profile/pages/Profile'
import { NotFound } from './pages/NotFound'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AdminProvider>
          <Router>
            <Routes>
              {/* Admin Routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route 
                path="/admin/dashboard" 
                element={
                  <ProtectedAdminRoute>
                    <AdminDashboard />
                  </ProtectedAdminRoute>
                } 
              />
              
              {/* Public Routes */}
              <Route path="/*" element={
                <div className="min-h-screen flex flex-col">
                  <Header />
                  <main className="flex-grow">
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/about" element={<About />} />
                      <Route path="/services" element={<Services />} />
                      <Route path="/schedule" element={<Schedule />} />
                      <Route path="/testimonials" element={<Testimonials />} />
                      <Route path="/book-class" element={<BookClass />} />
                      <Route path="/contact" element={<Contact />} />
                      <Route path="/learning" element={<Learning />} />
                      <Route path="/learning/:id" element={<ArticleView />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </main>
                  <Footer />
                </div>
              } />
            </Routes>
          </Router>
        </AdminProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App