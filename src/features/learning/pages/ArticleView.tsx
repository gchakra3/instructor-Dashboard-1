import { ArrowLeft, Calendar, Clock, Eye, User } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { LoadingSpinner } from '../../../shared/components/ui/LoadingSpinner'
import { RatingModule } from '../components/RatingModule'
import { ShareButtons } from '../components/ShareButtons'
import { useArticle } from '../hooks/useArticle'

export function ArticleView() {
  const { id } = useParams<{ id: string }>()
  const { 
    article, 
    averageRating, 
    totalRatings, 
    userRating, 
    loading, 
    error, 
    submitRating 
  } = useArticle(id!)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Article Not Found</h1>
          <p className="text-gray-600 mb-6">
            {error || 'The article you\'re looking for doesn\'t exist or has been removed.'}
          </p>
          <Link to="/learning" className="btn-primary">
            ← Back to Learning Center
          </Link>
        </div>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const estimatedReadTime = Math.ceil(article.content.replace(/<[^>]*>/g, '').split(' ').length / 200)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            to="/learning"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Learning Center
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <article className="bg-white rounded-xl shadow-lg overflow-hidden">
              {/* Featured Image */}
              {article.image_url && (
                <div className="relative h-96 overflow-hidden">
                  <img
                    src={article.image_url}
                    alt={article.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-6 left-6">
                    <span className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium capitalize">
                      {article.category}
                    </span>
                  </div>
                </div>
              )}

              {/* Article Header */}
              <div className="p-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
                  {article.title}
                </h1>

                <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 mb-6 pb-6 border-b border-gray-200">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4" />
                    <span>Yogodyaan Team</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(article.published_at || article.created_at)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span>{estimatedReadTime} min read</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Eye className="w-4 h-4" />
                    <span>{article.view_count} views</span>
                  </div>
                </div>

                {/* Article Content */}
                <div 
                  className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 prose-strong:text-gray-900 prose-ul:text-gray-700 prose-ol:text-gray-700"
                  dangerouslySetInnerHTML={{ __html: article.content }}
                />

                {/* Video Embed */}
                {article.video_url && (
                  <div className="mt-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Related Video</h3>
                    <div className="aspect-video rounded-lg overflow-hidden">
                      <iframe
                        src={article.video_url}
                        title="Related Video"
                        className="w-full h-full"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}

                {/* Tags */}
                {article.tags.length > 0 && (
                  <div className="mt-8 pt-8 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {article.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </article>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Rating Module */}
              <RatingModule
                averageRating={averageRating}
                totalRatings={totalRatings}
                userRating={userRating}
                onSubmitRating={submitRating}
              />

              {/* Share Buttons */}
              <ShareButtons
                title={article.title}
                url={`/learning/${article.id}`}
              />

              {/* Quick Navigation */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Navigation</h3>
                <div className="space-y-3">
                  <Link
                    to="/learning"
                    className="block text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    ← All Articles
                  </Link>
                  <Link
                    to={`/learning?category=${article.category}`}
                    className="block text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    More in {article.category}
                  </Link>
                  <Link
                    to="/book-class"
                    className="block text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Book a Class →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}