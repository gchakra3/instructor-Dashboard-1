import { useEffect, useState } from 'react'
import { supabase } from '../../../shared/lib/supabase'
import { getFingerprint } from '../../../shared/utils/fingerprint'
import { Article, Rating } from '../types/article'

export function useArticle(id: string) {
  const [article, setArticle] = useState<Article | null>(null)
  const [ratings, setRatings] = useState<Rating[]>([])
  const [userRating, setUserRating] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchArticle = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch article
      const { data: articleData, error: articleError } = await supabase
        .from('articles')
        .select('*')
        .eq('id', id)
        .eq('status', 'published')
        .single()

      if (articleError) throw articleError
      setArticle(articleData)

      // Fetch ratings
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('ratings')
        .select('*')
        .eq('article_id', id)

      if (ratingsError) throw ratingsError
      setRatings(ratingsData || [])

      // Check if user has already rated
      const fingerprint = await getFingerprint()
      const existingRating = ratingsData?.find(r => r.fingerprint === fingerprint)
      setUserRating(existingRating?.rating || null)

      // Record view
      await recordView(id, fingerprint)

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const recordView = async (articleId: string, fingerprint: string) => {
    try {
      await supabase
        .from('article_views')
        .insert([{
          article_id: articleId,
          fingerprint: fingerprint
        }])
    } catch (error) {
      // Silently fail - view tracking is not critical
      console.warn('Failed to record article view:', error)
    }
  }

  const submitRating = async (rating: number) => {
    try {
      const fingerprint = await getFingerprint()

      const { error } = await supabase
        .from('ratings')
        .upsert([{
          article_id: id,
          rating: rating,
          fingerprint: fingerprint
        }], {
          onConflict: 'article_id,fingerprint'
        })

      if (error) throw error

      setUserRating(rating)
      // Refetch ratings to update the display
      fetchArticle()
    } catch (err: any) {
      throw new Error(err.message)
    }
  }

  useEffect(() => {
    if (id) {
      fetchArticle()
    }
  }, [id])

  const averageRating = ratings.length > 0 
    ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
    : 0

  return {
    article,
    ratings,
    userRating,
    averageRating: Math.round(averageRating * 10) / 10,
    totalRatings: ratings.length,
    loading,
    error,
    submitRating,
    refetch: fetchArticle
  }
}