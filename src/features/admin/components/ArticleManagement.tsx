import { BarChart3, Edit, Eye, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../../../shared/components/ui/Button'
import { LoadingSpinner } from '../../../shared/components/ui/LoadingSpinner'
import { supabase } from '../../../shared/lib/supabase'
import { useAuth } from '../../auth/contexts/AuthContext'
import { Article } from '../../learning/types/article'
import { ArticleEditor } from './ArticleEditor'

interface ArticleManagementProps {
  authorId?: string; // Optional prop for filtering by author
}

export function ArticleManagement({ authorId }: ArticleManagementProps) {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditor, setShowEditor] = useState(false)
  const [editingArticle, setEditingArticle] = useState<Article | null>(null)
  const [saving, setSaving] = useState(false)
  const { user, isMantraCurator } = useAuth()

  useEffect(() => {
    fetchArticles()
  }, [])

  const fetchArticles = async () => {
    try {
      setLoading(true)
      
      // Build query based on whether we're filtering by author
      let query = supabase.from('articles').select('*')
      
      // If authorId is provided or user is a mantra curator, filter by author
      if (authorId) {
        query = query.eq('author_id', authorId)
      } else if (isMantraCurator && user) {
        // Mantra curators can only see their own articles
        query = query.eq('author_id', user.id)
      }
      
      // Sort by created date
      query = query.order('created_at', { ascending: false })
      
      const { data, error } = await query

      if (error) throw error
      setArticles(data || [])
    } catch (error) {
      console.error('Error fetching articles:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveArticle = async (articleData: Partial<Article>) => {
    try {
      setSaving(true)
      
      if (editingArticle) {
        // Update existing article
        // Ensure we only update articles the user owns (for mantra curators)
        let query = supabase
          .from('articles')
          .update(articleData)
          .eq('id', editingArticle.id)
        
        // Add author check for mantra curators
        if (isMantraCurator && user) {
          query = query.eq('author_id', user.id)
        }
        
        const { error } = await query
        if (error) throw error
      } else {
        // Create new article
        // Set author_id if user is a mantra curator
        const newArticleData = {
          ...articleData,
          author_id: user?.id || null
        }
        
        const { error } = await supabase
          .from('articles')
          .insert([newArticleData])
        
        if (error) throw error
      }

      await fetchArticles()
      setShowEditor(false)
      setEditingArticle(null)
    } catch (error) {
      console.error('Error saving article:', error)
      throw error
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteArticle = async (id: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return
    
    try {
      // Start building the query
      let query = supabase
        .from('articles')
        .delete()
        .eq('id', id)
      
      // Add author check for mantra curators
      if (isMantraCurator && user) {
        query = query.eq('author_id', user.id)
      }
      
      const { error } = await query

      if (error) throw error
      await fetchArticles()
    } catch (error) {
      console.error('Error deleting article:', error)
    }
  }

  const handleEditArticle = (article: Article) => {
    setEditingArticle(article)
    setShowEditor(true)
  }

  const handleCreateNew = () => {
    setEditingArticle(null)
    setShowEditor(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (showEditor) {
    return (
      <ArticleEditor
        article={editingArticle || undefined}
        onSave={handleSaveArticle}
        onCancel={() => {
          setShowEditor(false)
          setEditingArticle(null)
        }}
        loading={saving}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Article Management</h2>
        <Button onClick={handleCreateNew} className="flex items-center">
          <Plus className="w-4 h-4 mr-2" /> 
          Create New Article
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Article
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Views
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {articles.map((article) => (
                  <tr key={article.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {article.image_url && (
                          <img
                            src={article.image_url}
                            alt=""
                            className="w-12 h-12 rounded object-cover mr-4"
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900 line-clamp-1">
                            {article.title}
                          </div>
                          <div className="text-sm text-gray-500 line-clamp-2">
                            {article.preview_text}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium capitalize">
                        {article.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        article.status === 'published'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {article.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Eye className="w-4 h-4 mr-1 text-gray-400" />
                        {article.view_count}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(article.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {article.status === 'published' && (
                          <a
                            href={`/learning/${article.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Eye className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={() => handleEditArticle(article)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteArticle(article.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {articles.length === 0 && (
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No articles yet</h3>
              <p className="text-gray-600 mb-4">Create your first article to get started.</p>
              <Button onClick={handleCreateNew}>
                <Plus className="w-4 h-4 mr-2" />
                Create Article
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}