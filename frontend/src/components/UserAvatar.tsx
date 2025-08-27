import { useState } from 'react'

interface UserAvatarProps {
  logoUrl: string | null
  fullName: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses = {
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-20 w-20 text-xl'
}

export default function UserAvatar({ logoUrl, fullName, size = 'md', className = '' }: UserAvatarProps) {
  const [imageError, setImageError] = useState(false)

  const handleImageError = () => {
    setImageError(true)
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const sizeClass = sizeClasses[size]

  // Show avatar image if available and not errored
  if (logoUrl && !imageError) {
    return (
      <div className={`${sizeClass} rounded-full overflow-hidden shadow-md ${className}`}>
        <img
          src={logoUrl}
          alt={`${fullName}'s avatar`}
          className="w-full h-full object-cover"
          onError={handleImageError}
        />
      </div>
    )
  }

  // Fallback to initials
  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md ${className}`}>
      <span className="font-bold text-white">
        {getInitials(fullName)}
      </span>
    </div>
  )
}
