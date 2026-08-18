import type { Metadata } from 'next'

import { isAuthenticated } from '@/lib/auth'

import { AdminApp } from './AdminApp'
import { AutoTranslateProvider } from './AutoTranslate'
import { LoginForm } from './LoginForm'

export const metadata: Metadata = {
  title: 'Parish Dashboard',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  // The session cookie is HMAC signed and verified here on the server, so the
  // dashboard never renders for an unauthenticated visitor.
  if (!(await isAuthenticated())) return <LoginForm />
  return (
    <AutoTranslateProvider>
      <AdminApp />
    </AutoTranslateProvider>
  )
}
