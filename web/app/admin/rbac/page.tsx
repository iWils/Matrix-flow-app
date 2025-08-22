'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminRbacRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/admin-rbac')
  }, [router])

  return null
}