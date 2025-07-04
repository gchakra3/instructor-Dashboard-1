interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: string
}

export function LoadingSpinner({ size = 'md', color = 'text-emerald-600' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }

  return (
    <div className="flex justify-center items-center">
      <div className={`animate-spin rounded-full border-b-2 border-current ${sizeClasses[size]} ${color}`}></div>
    </div>
  )
}