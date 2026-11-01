'use client'

import { type FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app'
import {
  type Auth,
  getAuth,
  signInWithEmailAndPassword,
} from 'firebase/auth'

export type FirebaseConfig = {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

export function getFirebaseConfig(): FirebaseConfig {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  }
}

export function isFirebaseConfigured(): boolean {
  const config = getFirebaseConfig()
  return Boolean(config.apiKey && config.projectId)
}

let app: FirebaseApp | null = null
let auth: Auth | null = null

export function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === 'undefined') return null
  if (!isFirebaseConfigured()) return null
  if (!app) {
    const apps = getApps()
    app = apps.length ? getApp() : initializeApp(getFirebaseConfig())
  }
  return app
}

export function getFirebaseAuth(): Auth | null {
  if (typeof window === 'undefined') return null
  const app = getFirebaseApp()
  if (!app) return null
  if (!auth) {
    auth = getAuth(app)
  }
  return auth
}

/** Signs in with Email and Password using Firebase Auth and returns the ID token. */
export async function signInWithFirebaseEmail(email: string, password: string): Promise<string> {
  const auth = getFirebaseAuth()
  if (!auth) {
    throw new Error('Firebase Authentication is not configured.')
  }
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password)
  return credential.user.getIdToken()
}
