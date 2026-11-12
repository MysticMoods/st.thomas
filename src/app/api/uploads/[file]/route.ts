import { promises as fs } from 'node:fs'
import path from 'node:path'

export const runtime = 'nodejs'

/**
 * `next start` learns what is in public/ once, when it boots, so a photograph
 * uploaded afterwards is a 404 until the next restart. next.config.mjs sends
 * any /uploads/... that the static files did not answer here, and this reads
 * it off the disk as it is now.
 */

const UPLOADS = path.join(process.cwd(), 'public', 'uploads')

const TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.pdf': 'application/pdf',
}

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params
  const type = TYPES[path.extname(file).toLowerCase()]

  // One flat folder of names the upload route made: nothing with a slash or a
  // leading dot is ever ours.
  if (!type || file !== path.basename(file) || file.startsWith('.')) {
    return new Response('Not found', { status: 404 })
  }

  try {
    const body = await fs.readFile(path.join(UPLOADS, file))
    return new Response(new Uint8Array(body), {
      headers: {
        'Content-Type': type,
        'Content-Length': String(body.byteLength),
        // Every upload's name carries the moment it was made, so it never changes.
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
