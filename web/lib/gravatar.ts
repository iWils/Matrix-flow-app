import { createHash } from 'crypto'

/**
 * Generate Gravatar URL from email address
 * @param email - User's email address
 * @param size - Avatar size in pixels (default: 80)
 * @param defaultImage - Default image type (default: 'identicon')
 * @returns Gravatar URL
 */
export function getGravatarUrl(
  email: string | null | undefined,
  size: number = 80,
  defaultImage: 'mp' | 'identicon' | 'monsterid' | 'wavatar' | 'retro' | 'robohash' | 'blank' = 'identicon'
): string {
  if (!email) {
    // Return a default avatar URL if no email provided
    return `https://www.gravatar.com/avatar/00000000000000000000000000000000?s=${size}&d=${defaultImage}&r=g`
  }

  // Normalize email: trim whitespace and convert to lowercase
  const normalizedEmail = email.trim().toLowerCase()
  
  // Generate MD5 hash of the email
  const hash = createHash('md5').update(normalizedEmail).digest('hex')
  
  // Construct Gravatar URL
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=${defaultImage}&r=g`
}

/**
 * Generate user initials from name
 * @param name - User's full name
 * @returns Initials (up to 2 characters)
 */
export function getUserInitials(name: string | null | undefined): string {
  if (!name || name.trim() === '') {
    return '?'
  }

  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0][0].toUpperCase()
  }
  
  return (parts[0][0] + (parts[parts.length - 1][0] || '')).toUpperCase()
}

/**
 * Generate a consistent color for user initials based on name
 * @param name - User's name
 * @returns CSS color class
 */
export function getUserInitialsColor(name: string | null | undefined): string {
  if (!name) return 'from-gray-500 to-gray-600'
  
  const colors = [
    'from-blue-500 to-blue-600',
    'from-green-500 to-green-600',
    'from-purple-500 to-purple-600',
    'from-red-500 to-red-600',
    'from-yellow-500 to-yellow-600',
    'from-pink-500 to-pink-600',
    'from-indigo-500 to-indigo-600',
    'from-teal-500 to-teal-600',
  ]
  
  // Use name length to pick a consistent color
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
}