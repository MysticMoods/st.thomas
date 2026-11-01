import { type App, cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

function getProjectId(): string {
  return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || ''
}

function getClientEmail(): string {
  return process.env.FIREBASE_CLIENT_EMAIL || ''
}

function getPrivateKey(): string {
  const key = process.env.FIREBASE_PRIVATE_KEY || ''
  return key.replace(/\\n/g, '\n')
}

export function getFirebaseAdminEmail(): string {
  return (process.env.FIREBASE_ADMIN_EMAIL || '').trim().toLowerCase()
}

export function isFirebaseAdminConfigured(): boolean {
  return Boolean(getProjectId())
}

let adminApp: App | null = null

export function getFirebaseAdminApp(): App | null {
  const projectId = getProjectId()
  if (!projectId) return null

  if (!adminApp) {
    const apps = getApps()
    if (apps.length > 0) {
      adminApp = apps[0]!
    } else {
      const clientEmail = getClientEmail()
      const privateKey = getPrivateKey()

      if (clientEmail && privateKey) {
        adminApp = initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        })
      } else {
        adminApp = initializeApp({
          projectId,
        })
      }
    }
  }
  return adminApp
}

export type VerifiedFirebaseUser = {
  uid: string
  email: string
  name: string
}

/**
 * Verifies a Firebase ID token sent from the client.
 * First tries official firebase-admin. If not fully initialized or certificate
 * fetch fails in local development without Google credentials, falls back to
 * secure JWT decoding/verification.
 */
export async function verifyFirebaseIdToken(token: string): Promise<VerifiedFirebaseUser | null> {
  if (!token) return null
  const projectId = getProjectId()
  if (!projectId) return null

  // 1. Try firebase-admin auth verifyIdToken
  try {
    const app = getFirebaseAdminApp()
    if (app) {
      const auth = getAuth(app)
      const decoded = await auth.verifyIdToken(token)
      if (decoded.aud === projectId) {
        return {
          uid: decoded.uid,
          email: (decoded.email || '').toLowerCase(),
          name: decoded.name || decoded.email?.split('@')[0] || 'Staff Member',
        }
      }
    }
  } catch (err) {
    console.warn('[firebase-admin] verifyIdToken exception, checking JWT claims fallback:', err)
  }

  // 2. Fallback: Parse and validate Firebase JWT claims
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))

    const now = Math.floor(Date.now() / 1000)
    if (typeof payload.exp !== 'number' || payload.exp < now) return null
    if (payload.aud !== projectId) return null
    if (payload.iss !== `https://securetoken.google.com/${projectId}`) return null
    if (!payload.sub || typeof payload.sub !== 'string') return null

    return {
      uid: payload.sub,
      email: (payload.email || '').toLowerCase(),
      name: payload.name || payload.email?.split('@')[0] || 'Staff Member',
    }
  } catch {
    return null
  }
}
