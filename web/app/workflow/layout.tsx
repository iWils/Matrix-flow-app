import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Workflow - Matrix Flow',
  description: 'Change request workflow management',
}

export default function WorkflowLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}