'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminAuditRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/admin-audit')
  }, [router])

  return null
}