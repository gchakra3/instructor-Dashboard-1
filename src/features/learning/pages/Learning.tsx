import { Award, BookOpen, TrendingUp } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { LoadingSpinner } from '../../../shared/components/ui/LoadingSpinner'
import { ArticleCard } from '../components/ArticleCard'
import { ArticleFilters } from '../components/ArticleFilters'
import { useArticles } from '../hooks/useArticles'

export function Learning() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'highest_rated'>('latest')
  
  const { articles, loading, error, refetch } = useArticles()

  // Memoize filtered articles to prevent unnecessary re-renders
  const filteredArticles = useMemo(() => {
    return articles.filter(article => {
      const matchesSearch = searchTerm === '' || 
        article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.preview_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory
      
      return matchesSearch && matchesCategory
    })
  }, [articles, searchTerm, selectedCategory])

  // Refetch when filters change (but not search term)
  useEffect(() => {
    refetch({
      category: selectedCategory,
      sortBy: sortBy
    })
  }, [selectedCategory, sortBy, refetch])

  // Memoize stats to prevent recalculation
  const stats = useMemo(() => [
    {
      icon: <BookOpen className="w-8 h-8 text-blue-600" />,
      title: "Total Articles",
      value: articles.length.toString(),
      description: "Comprehensive yoga guides"
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-green-600" />,
      title: "Most Popular",
      value: articles.length > 0 ? Math.max(...articles.map(a => a.view_count)).toString() : "0",
      description: "Views on top article"
    },
    {
      icon: <Award className="w-8 h-8 text-yellow-600" />,
      title: "Highest Rated",
      value: articles.length > 0 ? Math.max(...articles.map(a => a.average_rating)).toFixed(1) : "0",
      description: "Average rating"
    }
  ], [articles])

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load articles: {error}</p>
          <button
            onClick={() => refetch()}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-green-50 py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">Yoga Learning Center</h1>
          <p className="text-xl text-gray-600 leading-relaxed">
            Discover comprehensive guides, expert insights, and practical tips to deepen your yoga practice. 
            From beginner fundamentals to advanced techniques, find everything you need for your wellness journey.
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center p-6 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all duration-300">
                <div className="flex justify-center mb-4">
                  {stat.icon}
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</div>
                <div className="text-lg font-semibold text-gray-700 mb-1">{stat.title}</div>
                <div className="text-gray-600 text-sm">{stat.description}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Filters */}
          <ArticleFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          )}

          {/* Articles Grid */}
          {!loading && (
            <>
              {filteredArticles.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No articles found</h3>
                  <p className="text-gray-600">
                    {searchTerm || selectedCategory !== 'all'
                      ? 'Try adjusting your search or filter criteria.'
                      : 'Check back soon for new content!'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {searchTerm ? `Search results for "${searchTerm}"` : 'Latest Articles'}
                    </h2>
                    <p className="text-gray-600">
                      {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''} found
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredArticles.map((article) => (
                      <ArticleCard key={article.id} article={article} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-green-600 text-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold mb-6">Ready to Start Your Practice?</h2>
          <p className="text-xl mb-8 text-blue-100">
            Take your learning to the next level with personalized yoga sessions. 
            Book a class with our expert instructors today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/book-class"
              className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 text-lg font-semibold rounded-lg transition-all duration-300 hover:scale-105 inline-block"
            >
              Book Your Class
            </a>
            <a
              href="/contact"
              className="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-8 py-4 text-lg font-semibold rounded-lg transition-all duration-300 inline-block"
            >
              Ask Questions
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}