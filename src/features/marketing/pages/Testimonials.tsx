import { Star, Quote, Globe, Building, User } from 'lucide-react'

export function Testimonials() {
  const testimonials = [
    {
      name: "Sarah Johnson",
      position: "Marketing Director",
      company: "TechCorp Inc.",
      location: "New York, USA",
      content: "Yogodyaan has completely transformed how our team approaches wellness. The corporate sessions have not only reduced stress levels but also improved our overall productivity and team cohesion. The instructor's ability to adapt sessions for our busy schedules is remarkable.",
      image: "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop",
      rating: 5,
      type: "Corporate"
    },
    {
      name: "Raj Patel",
      position: "Software Engineer",
      company: "StartupXYZ",
      location: "Mumbai, India",
      content: "The personalized coaching sessions fit perfectly into my busy schedule. Working across different time zones has never been easier. I've never felt more balanced and focused in my career. The flexibility and personal attention are unmatched.",
      image: "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop",
      rating: 5,
      type: "1-on-1"
    },
    {
      name: "Emily Chen",
      position: "Project Manager",
      company: "Global Solutions Ltd.",
      location: "Singapore",
      content: "The group sessions create such a supportive community. It's amazing how we can connect with people from around the world while improving our wellness together. The energy and motivation from the group keep me consistent with my practice.",
      image: "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop",
      rating: 5,
      type: "Group"
    },
    {
      name: "Michael Rodriguez",
      position: "CEO",
      company: "InnovateCorp",
      location: "Mexico City, Mexico",
      content: "As a CEO, stress management is crucial. The corporate wellness program has been a game-changer for our entire leadership team. We've seen improved decision-making, better work-life balance, and enhanced team dynamics.",
      image: "https://images.pexels.com/photos/697509/pexels-photo-697509.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop",
      rating: 5,
      type: "Corporate"
    },
    {
      name: "Aisha Okonkwo",
      position: "Data Scientist",
      company: "AI Innovations",
      location: "Lagos, Nigeria",
      content: "The personalized approach helped me address specific posture issues from long hours of coding. The instructor's expertise in adapting yoga for tech professionals is evident in every session. My back pain is gone, and my focus has improved dramatically.",
      image: "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop",
      rating: 5,
      type: "1-on-1"
    },
    {
      name: "James Thompson",
      position: "Operations Manager",
      company: "LogisticsPro",
      location: "London, UK",
      content: "The group classes have become the highlight of my week. The community aspect keeps me motivated, and the professional guidance ensures I'm practicing safely and effectively. It's the perfect balance of social connection and personal wellness.",
      image: "https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop",
      rating: 5,
      type: "Group"
    }
  ]

  const stats = [
    { number: "500+", label: "Global Students", icon: <Globe className="w-8 h-8 text-blue-600" /> },
    { number: "50+", label: "Corporate Programs", icon: <Building className="w-8 h-8 text-green-600" /> },
    { number: "98%", label: "Satisfaction Rate", icon: <Star className="w-8 h-8 text-yellow-500" /> },
    { number: "25+", label: "Countries Served", icon: <User className="w-8 h-8 text-purple-600" /> }
  ]

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Corporate': return 'bg-purple-100 text-purple-800'
      case '1-on-1': return 'bg-blue-100 text-blue-800'
      case 'Group': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Corporate': return <Building className="w-4 h-4" />
      case '1-on-1': return <User className="w-4 h-4" />
      case 'Group': return <Globe className="w-4 h-4" />
      default: return null
    }
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-green-50 py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">What Our Global Community Says</h1>
          <p className="text-xl text-gray-600 leading-relaxed">
            Real stories from professionals around the world who have transformed their lives 
            with Yogodyaan's personalized wellness programs.
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center p-6 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all duration-300">
                <div className="flex justify-center mb-4">
                  {stat.icon}
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">{stat.number}</div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Grid */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Success Stories</h2>
            <p className="text-xl text-gray-600">
              Discover how professionals from different industries and locations have benefited from our programs
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 relative">
                <Quote className="absolute top-4 right-4 w-8 h-8 text-blue-200" />
                
                <div className="flex items-center mb-6">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-16 h-16 rounded-full mr-4 object-cover"
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                    <p className="text-sm text-gray-600">{testimonial.position}</p>
                    <p className="text-sm text-gray-500">{testimonial.company}</p>
                    <p className="text-xs text-blue-600 flex items-center mt-1">
                      <Globe className="w-3 h-3 mr-1" />
                      {testimonial.location}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mb-4">
                  <div className="flex text-yellow-400">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-current" />
                    ))}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getTypeColor(testimonial.type)}`}>
                    {getTypeIcon(testimonial.type)}
                    <span>{testimonial.type}</span>
                  </span>
                </div>
                
                <p className="text-gray-700 italic leading-relaxed">"{testimonial.content}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Video Testimonials Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Video Testimonials</h2>
            <p className="text-xl text-gray-600">
              Hear directly from our students about their transformation journey
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((index) => (
              <div key={index} className="bg-gray-100 rounded-2xl aspect-video flex items-center justify-center hover:bg-gray-200 transition-all duration-300 cursor-pointer">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-gray-600 font-medium">Video Testimonial {index}</p>
                  <p className="text-sm text-gray-500">Coming Soon</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-green-600 text-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold mb-6">Ready to Write Your Success Story?</h2>
          <p className="text-xl mb-8 text-blue-100">
            Join our global community of professionals who have transformed their lives through yoga. 
            Your wellness journey starts with a single session.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/book-class" className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 text-lg font-semibold rounded-lg transition-all duration-300 hover:scale-105 inline-block">
              Start Your Journey
            </a>
            <a href="/contact" className="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-8 py-4 text-lg font-semibold rounded-lg transition-all duration-300 inline-block">
              Learn More
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}