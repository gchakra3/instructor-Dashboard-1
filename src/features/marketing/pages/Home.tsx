import { ArrowRight, Award, Building, Globe, Target, User, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../../../shared/components/ui/Button'

export function Home() {
  const services = [
    {
      icon: <User className="w-12 h-12 text-blue-600" />,
      title: "Personalized Online Coaching",
      description: "Individual attention, flexible scheduling, customized programs",
      features: ["1-on-1 sessions", "Personalized routines", "Flexible timing", "Progress tracking"]
    },
    {
      icon: <Users className="w-12 h-12 text-green-600" />,
      title: "Online Group Sessions",
      description: "Build consistency with like-minded professionals",
      features: ["Small group classes", "Community support", "Regular schedule", "Affordable pricing"]
    },
    {
      icon: <Building className="w-12 h-12 text-purple-600" />,
      title: "Corporate Wellness Solutions",
      description: "Enhance team well-being and performance",
      features: ["Team sessions", "Workplace wellness", "Stress reduction", "Productivity boost"]
    }
  ]

  const benefits = [
    {
      icon: <Globe className="w-8 h-8 text-blue-600" />,
      title: "Global Accessibility",
      description: "Join from anywhere in the world with just an internet connection"
    },
    {
      icon: <Building className="w-8 h-8 text-green-600" />,
      title: "Corporate Wellness Focus",
      description: "Specialized programs designed for busy professionals"
    },
    {
      icon: <Target className="w-8 h-8 text-purple-600" />,
      title: "Personalized Approach",
      description: "Customized sessions tailored to your specific needs and goals"
    },
    {
      icon: <Award className="w-8 h-8 text-orange-600" />,
      title: "Professional Experience",
      description: "5+ years of expertise combining traditional practices with modern wellness"
    }
  ]

  const testimonials = [
    {
      name: "Sarah Johnson",
      position: "Marketing Director",
      location: "New York, USA",
      content: "Yogodyaan has transformed how our team approaches wellness. The corporate sessions have reduced stress and improved our overall productivity.",
      image: "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop"
    },
    {
      name: "Raj Patel",
      position: "Software Engineer",
      location: "Mumbai, India",
      content: "The personalized coaching sessions fit perfectly into my busy schedule. I've never felt more balanced and focused.",
      image: "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop"
    },
    {
      name: "Emily Chen",
      position: "Project Manager",
      location: "Singapore",
      content: "The group sessions create such a supportive community. It's amazing how we can connect with people from around the world.",
      image: "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop"
    }
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-50 via-white to-green-50 py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 leading-tight">
                  Transform Your 
                  <span className="block text-blue-600">Workplace, Mind,</span>
                  <span className="block text-green-600">and Body — Online</span>
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed">
                  Yogodyaan brings personalized corporate and wellness yoga programs 
                  to professionals worldwide. Experience the power of yoga from anywhere.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/book-class">
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg font-semibold rounded-lg transition-all duration-300 hover:scale-105 shadow-lg">
                    Book Your Class
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/about">
                  <Button variant="outline" size="lg" className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-4 text-lg font-semibold rounded-lg">
                    Learn More
                  </Button>
                </Link>
              </div>

              <div className="flex items-center space-x-8 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>5+ Years Experience</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Global Reach</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Corporate Focus</span>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="relative z-10">
                <img
                  src="https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop"
                  alt="Professional yoga practice"
                  className="rounded-2xl shadow-2xl"
                />
              </div>
              <div className="absolute -top-4 -right-4 w-full h-full bg-gradient-to-br from-blue-200 to-green-200 rounded-2xl -z-10"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Services</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Choose the perfect yoga program that fits your lifestyle and goals
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <div key={index} className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-blue-200">
                <div className="flex justify-center mb-6">
                  {service.icon}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">{service.title}</h3>
                <p className="text-gray-600 mb-6 text-center">{service.description}</p>
                
                <ul className="space-y-2 mb-8">
                  {service.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center text-gray-700">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <Link to="/book-class">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-all duration-300">
                    Book Your Class
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <img
                src="https://images.pexels.com/photos/3823488/pexels-photo-3823488.jpeg?auto=compress&cs=tinysrgb&w=500&h=600&fit=crop"
                alt="Yoga instructor"
                className="rounded-2xl shadow-lg"
              />
              <div className="absolute -bottom-6 -right-6 bg-white p-6 rounded-xl shadow-lg">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">5+</div>
                  <div className="text-sm text-gray-600">Years Experience</div>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <h2 className="text-4xl font-bold text-gray-900">Your Global Yoga Journey Starts Here</h2>
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>
                  With over 5 years of expertise combining traditional yoga practices with modern wellness needs, 
                  I specialize in bringing the transformative power of yoga to professionals worldwide.
                </p>
                <p>
                  My focus on online teaching and global reach ensures that distance is never a barrier to 
                  your wellness journey. Whether you're a busy executive in New York or a startup founder 
                  in Singapore, personalized yoga guidance is just a click away.
                </p>
                <p>
                  I believe that yoga is not just about physical postures—it's about creating balance, 
                  reducing stress, and enhancing overall well-being in our fast-paced professional lives.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                  <div className="text-2xl font-bold text-blue-600">500+</div>
                  <div className="text-sm text-gray-600">Global Students</div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                  <div className="text-2xl font-bold text-green-600">50+</div>
                  <div className="text-sm text-gray-600">Corporate Programs</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Yogodyaan */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose Yogodyaan</h2>
            <p className="text-xl text-gray-600">
              Experience the difference with our unique approach to online yoga
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center p-6 rounded-xl hover:bg-gray-50 transition-all duration-300">
                <div className="flex justify-center mb-4">
                  {benefit.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-green-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">What Our Global Community Says</h2>
            <p className="text-xl text-gray-600">
              Real stories from professionals who transformed their lives with Yogodyaan
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="flex items-center mb-6">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-16 h-16 rounded-full mr-4 object-cover"
                  />
                  <div>
                    <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                    <p className="text-sm text-gray-600">{testimonial.position}</p>
                    <p className="text-xs text-blue-600">{testimonial.location}</p>
                  </div>
                </div>
                <p className="text-gray-700 italic leading-relaxed">"{testimonial.content}"</p>
                <div className="flex text-yellow-400 mt-4">
                  {[...Array(5)].map((_, i) => (
                    <span key={i}>★</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-green-600 text-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold mb-6">Begin Your Wellness Journey</h2>
          <p className="text-xl mb-8 text-blue-100">
            Join thousands of professionals worldwide who have discovered the transformative power of yoga. 
            Schedule your first class today and take the first step towards a healthier, more balanced life.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/book-class">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 hover:text-blue-700 px-8 py-4 text-lg font-semibold rounded-lg transition-all duration-300 hover:scale-105 shadow-lg">
                Book Your Class Now
              </Button>
            </Link>
            <Link to="/contact">
              <Button variant="outline" size="lg" className="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-8 py-4 text-lg font-semibold rounded-lg transition-all duration-300">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}