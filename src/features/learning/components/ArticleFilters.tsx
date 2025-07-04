import { Filter, Search } from 'lucide-react'

interface ArticleFiltersProps {
  searchTerm: string
  onSearchChange: (term: string) => void
  selectedCategory: string
  onCategoryChange: (category: string) => void
  sortBy: 'latest' | 'popular' | 'highest_rated'
  onSortChange: (sort: 'latest' | 'popular' | 'highest_rated') => void
}

export function ArticleFilters({
  searchTerm,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  sortBy,
  onSortChange
}: ArticleFiltersProps) {
  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'beginner', label: 'Beginner' },
    { value: 'wellness', label: 'Wellness' },
    { value: 'corporate', label: 'Corporate' },
    { value: 'advanced', label: 'Advanced' },
    { value: 'meditation', label: 'Meditation' },
    { value: 'nutrition', label: 'Nutrition' }
  ]

  const sortOptions = [
    { value: 'latest', label: 'Latest' },
    { value: 'popular', label: 'Most Popular' },
    { value: 'highest_rated', label: 'Highest Rated' }
  ]

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              id="article-search"
              name="article-search"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="lg:w-48">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
              id="category-filter"
              name="category-filter"
            >
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sort Options */}
        <div className="lg:w-48">
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as any)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
            id="sort-filter"
            name="sort-filter"
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}