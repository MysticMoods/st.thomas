import { NextResponse } from 'next/server'

import { isAuthenticated } from '@/lib/auth'
import { readRecords } from '@/lib/content'

export const runtime = 'nodejs'

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const [subscribers, messages] = await Promise.all([
    readRecords('subscribers'),
    readRecords('messages'),
  ])

  return NextResponse.json({
    subscribers: subscribers.slice(0, 200),
    messages: messages.slice(0, 100),
  })
}
