import { Image, Save, Tag, Video, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import { Button } from '../../../shared/components/ui/Button'
import { Article } from '../../learning/types/article'

interface ArticleEditorProps {
  article?: Article
  onSave: (articleData: Partial<Article>) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

export function ArticleEditor({ article, onSave, onCancel, loading = false }: ArticleEditorProps) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    preview_text: '',
    image_url: '',
    video_url: '',
    category: 'general',
    tags: [] as string[],
    status: 'draft' as 'draft' | 'published'
  })
  const [newTag, setNewTag] = useState('')
  const [errors, setErrors] = useState<any>({})

  useEffect(() => {
    if (article) {
      setFormData({
        title: article.title,
        content: article.content,
        preview_text: article.preview_text,
        image_url: article.image_url || '',
        video_url: article.video_url || '',
        category: article.category,
        tags: article.tags || [],
        status: article.status
      })
    }
  }, [article])

  const categories = [
    'general',
    'beginner',
    'wellness',
    'corporate',
    'advanced',
    'meditation',
    'nutrition'
  ]

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['blockquote', 'code-block'],
      ['link', 'image'],
      ['clean']
    ],
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev: any) => ({ ...prev, [field]: '' }))
    }
  }

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const validateForm = () => {
    const newErrors: any = {}

    if (!formData.title.trim()) newErrors.title = 'Title is required'
    else if (formData.title.length > 60) newErrors.title = 'Title must be 60 characters or less'

    if (!formData.content.trim()) newErrors.content = 'Content is required'

    if (!formData.preview_text.trim()) newErrors.preview_text = 'Preview text is required'
    else if (formData.preview_text.length > 150) newErrors.preview_text = 'Preview text must be 150 characters or less'

    if (formData.image_url && !isValidUrl(formData.image_url)) {
      newErrors.image_url = 'Please enter a valid image URL'
    }

    if (formData.video_url && !isValidVideoUrl(formData.video_url)) {
      newErrors.video_url = 'Please enter a valid YouTube or Vimeo URL'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const isValidUrl = (url: string) => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const isValidVideoUrl = (url: string) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/
    const vimeoRegex = /^(https?:\/\/)?(www\.)?vimeo\.com\/.+/
    return youtubeRegex.test(url) || vimeoRegex.test(url)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    try {
      await onSave(formData)
    } catch (error) {
      console.error('Failed to save article:', error)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">
          {article ? 'Edit Article' : 'Create New Article'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Title *
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.title ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter article title (max 60 characters)"
            maxLength={60}
          />
          <div className="flex justify-between mt-1">
            {errors.title && <p className="text-red-500 text-sm">{errors.title}</p>}
            <p className="text-gray-500 text-sm ml-auto">{formData.title.length}/60</p>
          </div>
        </div>

        {/* Preview Text */}
        <div>
          <label htmlFor="preview_text" className="block text-sm font-medium text-gray-700 mb-1">
            Preview Text *
          </label>
          <textarea
            id="preview_text"
            value={formData.preview_text}
            onChange={(e) => handleInputChange('preview_text', e.target.value)}
            rows={3}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.preview_text ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Brief description that appears in article cards (max 150 characters)"
            maxLength={150}
          />
          <div className="flex justify-between mt-1">
            {errors.preview_text && <p className="text-red-500 text-sm">{errors.preview_text}</p>}
            <p className="text-gray-500 text-sm ml-auto">{formData.preview_text.length}/150</p>
          </div>
        </div>

        {/* Category and Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>

        {/* Image URL */}
        <div>
          <label htmlFor="image_url" className="block text-sm font-medium text-gray-700 mb-1">
            <Image className="w-4 h-4 inline mr-1" />
            Featured Image URL
          </label>
          <input
            type="url"
            id="image_url"
            value={formData.image_url}
            onChange={(e) => handleInputChange('image_url', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.image_url ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="https://example.com/image.jpg"
          />
          {errors.image_url && <p className="text-red-500 text-sm mt-1">{errors.image_url}</p>}
          {formData.image_url && isValidUrl(formData.image_url) && (
            <div className="mt-2">
              <img
                src={formData.image_url}
                alt="Preview"
                className="w-32 h-20 object-cover rounded border"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>
          )}
        </div>

        {/* Video URL */}
        <div>
          <label htmlFor="video_url" className="block text-sm font-medium text-gray-700 mb-1">
            <Video className="w-4 h-4 inline mr-1" />
            Video URL (YouTube/Vimeo)
          </label>
          <input
            type="url"
            id="video_url"
            value={formData.video_url}
            onChange={(e) => handleInputChange('video_url', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.video_url ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="https://youtube.com/watch?v=..."
          />
          {errors.video_url && <p className="text-red-500 text-sm mt-1">{errors.video_url}</p>}
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Tag className="w-4 h-4 inline mr-1" />
            Tags
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {formData.tags.map((tag, index) => (
              <span
                key={index}
                className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add a tag"
            />
            <Button
              type="button"
              onClick={handleAddTag}
              variant="outline"
              size="sm"
            >
              Add Tag
            </Button>
          </div>
        </div>

        {/* Content Editor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Content *
          </label>
          <div className={`border rounded-lg ${errors.content ? 'border-red-500' : 'border-gray-300'}`}>
            <ReactQuill
              value={formData.content}
              onChange={(content) => handleInputChange('content', content)}
              modules={quillModules}
              theme="snow"
              style={{ minHeight: '300px' }}
            />
          </div>
          {errors.content && <p className="text-red-500 text-sm mt-1">{errors.content}</p>}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={loading}
            className="flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : 'Save Article'}
          </Button>
        </div>
      </form>
    </div>
  )
}