import { NextResponse } from 'next/server'

import { audit } from '@/lib/audit'
import { currentSession } from '@/lib/auth'
import { store } from '@/lib/store'

export const runtime = 'nodejs'

const MAX_BYTES = 8 * 1024 * 1024
const ALLOWED: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'application/pdf': 'pdf',
}

function slug(name: string) {
  return name
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'file'
}

export async function POST(request: Request) {
  const session = await currentSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const form = await request.formData()
  const file = form.get('file')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file received' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File is larger than 8 MB' }, { status: 413 })
  }

  const extension = ALLOWED[file.type]
  if (!extension) {
    return NextResponse.json(
      { error: 'Only JPG, PNG, WebP, AVIF images and PDF bulletins are accepted' },
      { status: 415 },
    )
  }

  // Where this lands depends on the store: the parish's own public/uploads
  // folder, or the bucket. Either way it comes back as a path the page can use.
  const filename = `${slug(file.name)}-${Date.now().toString(36)}.${extension}`
  const stored = await store.putFile(
    filename,
    Buffer.from(await file.arrayBuffer()),
    file.type,
  )

  await audit({
    request,
    actor: session.username,
    role: session.role,
    action: 'upload',
    target: filename,
    detail: `${Math.round(file.size / 1024)} KB ${file.type}`,
  })

  return NextResponse.json({ ok: true, path: stored.url })
}
