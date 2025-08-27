'use client'
import { useState } from 'react'
import Image from 'next/image'
import { getGravatarUrl, getUserInitials, getUserInitialsColor } from '@/lib/gravatar'
import { clsx } from 'clsx'

interface AvatarProps {
  email?: string | null
  name?: string | null
  size?: number
  className?: string
  showTooltip?: boolean
}

export function Avatar({ 
  email, 
  name, 
  size = 40, 
  className,
  showTooltip = false 
}: AvatarProps) {
  const [imageError, setImageError] = useState(false)
  const gravatarUrl = getGravatarUrl(email, size)
  const initials = getUserInitials(name)
  const initialsColor = getUserInitialsColor(name)

  // Show initials fallback if no email or image failed to load
  const showInitials = !email || imageError

  return (
    <div 
      className={clsx('relative inline-block', className)}
      title={showTooltip ? (name || email || 'User') : undefined}
    >
      {showInitials ? (
        <div
          className={clsx(
            'flex items-center justify-center text-white font-semibold bg-gradient-to-br rounded-full',
            initialsColor
          )}
          style={{ 
            width: size, 
            height: size, 
            fontSize: Math.max(size * 0.4, 12)
          }}
        >
          {initials}
        </div>
      ) : (
        <Image
          src={gravatarUrl}
          alt={name || 'User avatar'}
          width={size}
          height={size}
          className="rounded-full"
          onError={() => setImageError(true)}
          unoptimized // Gravatar URLs are already optimized
        />
      )}
    </div>
  )
}

interface AvatarGroupProps {
  users: Array<{ email?: string | null; name?: string | null }>
  max?: number
  size?: number
  className?: string
}

export function AvatarGroup({ users, max = 3, size = 32, className }: AvatarGroupProps) {
  const displayUsers = users.slice(0, max)
  const remainingCount = users.length - max

  return (
    <div className={clsx('flex -space-x-2', className)}>
      {displayUsers.map((user, index) => (
        <Avatar
          key={index}
          email={user.email}
          name={user.name}
          size={size}
          showTooltip={true}
          className="border-2 border-white dark:border-slate-800"
        />
      ))}
      {remainingCount > 0 && (
        <div
          className="flex items-center justify-center bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full border-2 border-white dark:border-slate-800 text-xs font-medium"
          style={{ width: size, height: size }}
          title={`+${remainingCount} more users`}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  )
}