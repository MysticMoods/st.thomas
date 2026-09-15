import { NextResponse } from 'next/server'

import { requireArea } from '@/lib/auth'

export const runtime = 'nodejs'

const MAX_CHARS = 4000
const LANGS = new Set(['en', 'ml'])

/**
 * Machine translation for the dashboard, so staff type a notice once and get
 * the other language filled in. Always a draft — the editor stays editable and
 * a human should read it before publishing.
 *
 * Set TRANSLATE_ENDPOINT to swap in a paid provider later; the default is the
 * public Google endpoint, which needs no key and is rate limited.
 */
async function translate(text: string, from: string, to: string) {
  const endpoint =
    process.env.TRANSLATE_ENDPOINT ||
    'https://translate.googleapis.com/translate_a/single?client=gtx&dt=t'

  const url = `${endpoint}&sl=${from}&tl=${to}&q=${encodeURIComponent(text)}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`Translation service returned ${res.status}`)

  const body = (await res.json()) as unknown
  // [[[chunk, original, …], …], …] — join the chunks back into one string.
  if (!Array.isArray(body) || !Array.isArray(body[0])) throw new Error('Unexpected response')
  return (body[0] as unknown[])
    .map((part) => (Array.isArray(part) ? String(part[0] ?? '') : ''))
    .join('')
    .trim()
}

export async function POST(request: Request) {
  if (!(await requireArea('pages'))) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  let text = ''
  let from = ''
  let to = ''
  try {
    const body = await request.json()
    text = String(body?.text ?? '')
    from = String(body?.from ?? '')
    to = String(body?.to ?? '')
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!LANGS.has(from) || !LANGS.has(to) || from === to) {
    return NextResponse.json({ error: 'from and to must be en and ml' }, { status: 422 })
  }
  if (!text.trim()) return NextResponse.json({ text: '' })
  if (text.length > MAX_CHARS) {
    return NextResponse.json({ error: `Text longer than ${MAX_CHARS} characters` }, { status: 413 })
  }

  try {
    return NextResponse.json({ text: await translate(text, from, to) })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Translation failed' },
      { status: 502 },
    )
  }
}
