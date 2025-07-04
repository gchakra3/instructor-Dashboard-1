import { Calendar, Eye, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ArticleWithStats } from '../types/article'

interface ArticleCardProps {
  article: ArticleWithStats
}

export function ArticleCard({ article }: ArticleCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const renderStars = (rating: number) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 !== 0

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
        )
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <div key={i} className="relative">
            <Star className="w-4 h-4 text-gray-300" />
            <div className="absolute inset-0 overflow-hidden w-1/2">
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
            </div>
          </div>
        )
      } else {
        stars.push(
          <Star key={i} className="w-4 h-4 text-gray-300" />
        )
      }
    }
    return stars
  }

  return (
    <article className="card overflow-hidden group">
      <Link to={`/learning/${article.id}`}>
        <div className="relative">
          {article.image_url && (
            <img
              src={article.image_url}
              alt={article.title}
              className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          )}
          <div className="absolute top-4 left-4">
            <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium capitalize">
              {article.category}
            </span>
          </div>
        </div>
        
        <div className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
            {article.title}
          </h3>
          
          <p className="text-gray-600 mb-4 line-clamp-3">
            {article.preview_text}
          </p>
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-1">
              {renderStars(article.average_rating)}
              <span className="text-sm text-gray-600 ml-2">
                {article.average_rating > 0 ? article.average_rating.toFixed(1) : 'No ratings'}
              </span>
              {article.total_ratings > 0 && (
                <span className="text-sm text-gray-500">
                  ({article.total_ratings})
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <Eye className="w-4 h-4" />
                <span>{article.view_count}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1 text-sm text-gray-500">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(article.published_at || article.created_at)}</span>
            </div>
            
            <button className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors">
              Read More →
            </button>
          </div>
          
          {article.tags && article.tags.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex flex-wrap gap-2">
                {article.tags.slice(0, 3).map((tag, index) => (
                  <span
                    key={index}
                    className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs"
                  >
                    #{tag}
                  </span>
                ))}
                {article.tags.length > 3 && (
                  <span className="text-gray-500 text-xs">
                    +{article.tags.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </Link>
    </article>
  )
}