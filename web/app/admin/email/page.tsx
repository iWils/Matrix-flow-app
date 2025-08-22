'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminEmailRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/admin-email')
  }, [router])

  return null
}