import { Star } from 'lucide-react'
import { useState } from 'react'

interface RatingModuleProps {
  averageRating: number
  totalRatings: number
  userRating: number | null
  onSubmitRating: (rating: number) => Promise<void>
  className?: string
}

export function RatingModule({
  averageRating,
  totalRatings,
  userRating,
  onSubmitRating,
  className = ''
}: RatingModuleProps) {
  const [hoveredRating, setHoveredRating] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleRatingClick = async (rating: number) => {
    try {
      setSubmitting(true)
      await onSubmitRating(rating)
    } catch (error) {
      console.error('Failed to submit rating:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const renderStars = (rating: number, interactive = false) => {
    const stars = []
    
    for (let i = 1; i <= 5; i++) {
      const isFilled = i <= rating
      const isHovered = interactive && hoveredRating !== null && i <= hoveredRating
      
      stars.push(
        <button
          key={i}
          onClick={() => interactive && handleRatingClick(i)}
          onMouseEnter={() => interactive && setHoveredRating(i)}
          onMouseLeave={() => interactive && setHoveredRating(null)}
          disabled={!interactive || submitting}
          className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-all duration-200 ${
            interactive ? 'p-1' : ''
          }`}
        >
          <Star
            className={`w-5 h-5 ${
              isFilled || isHovered
                ? 'text-yellow-400 fill-current'
                : 'text-gray-300'
            }`}
          />
        </button>
      )
    }
    
    return stars
  }

  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Rate this Article</h3>
      
      {/* Average Rating Display */}
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-2">
          <div className="flex space-x-1">
            {renderStars(averageRating)}
          </div>
          <span className="text-lg font-semibold text-gray-900">
            {averageRating > 0 ? averageRating.toFixed(1) : 'No ratings yet'}
          </span>
        </div>
        <p className="text-sm text-gray-600">
          {totalRatings === 0 
            ? 'Be the first to rate this article!'
            : `Based on ${totalRatings} rating${totalRatings !== 1 ? 's' : ''}`
          }
        </p>
      </div>

      {/* User Rating Interface */}
      <div className="border-t border-gray-200 pt-6">
        <p className="text-sm font-medium text-gray-700 mb-3">
          {userRating ? 'Your rating:' : 'Rate this article:'}
        </p>
        
        <div className="flex items-center space-x-1 mb-4">
          {renderStars(userRating || hoveredRating || 0, true)}
        </div>
        
        {userRating && (
          <p className="text-sm text-green-600 mb-2">
            Thank you for rating this article!
          </p>
        )}
        
        <p className="text-xs text-gray-500">
          Your rating helps other readers discover quality content.
        </p>
      </div>
    </div>
  )
}