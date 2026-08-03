import { promises as fs } from 'fs'
import path from 'path'

import { NextResponse } from 'next/server'

import { isAuthenticated } from '@/lib/auth'

export const runtime = 'nodejs'

const UPLOADS = path.join(process.cwd(), 'public', 'uploads')
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
  if (!(await isAuthenticated())) {
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

  await fs.mkdir(UPLOADS, { recursive: true })
  const filename = `${slug(file.name)}-${Date.now().toString(36)}.${extension}`
  await fs.writeFile(
    path.join(UPLOADS, filename),
    Buffer.from(await file.arrayBuffer()),
  )

  return NextResponse.json({ ok: true, path: `/uploads/${filename}` })
}
