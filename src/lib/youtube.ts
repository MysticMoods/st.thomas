import type { MediaContent } from './types'

/**
 * The parish channel's public uploads feed. YouTube publishes one for every
 * channel — no API key, no quota — so new videos reach the site on their own
 * once `channel.id` is set in content/media.json.
 *
 * Everything here fails soft: if the feed is unreachable, empty, or the channel
 * has no public uploads yet, the hand-entered videos are shown exactly as before.
 */
const FEED = 'https://www.youtube.com/feeds/videos.xml?channel_id='
const PLAYLIST = 'https://www.youtube.com/playlist?list='
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'

type FeedVideo = { id: string; title: string; published: string; duration: string }

function tag(block: string, name: string) {
  const match = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))
  return match ? decode(match[1].trim()) : ''
}

function decode(text: string) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}

async function fromFeed(channelId: string): Promise<FeedVideo[]> {
  const res = await fetch(`${FEED}${encodeURIComponent(channelId)}`, {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(6000),
    // One fetch every half hour is plenty for a parish channel.
    next: { revalidate: 1800 },
  })
  if (!res.ok) return []

  const xml = await res.text()
  return (xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [])
    .map((entry) => ({
      id: tag(entry, 'yt:videoId'),
      title: tag(entry, 'title'),
      published: tag(entry, 'published').slice(0, 10),
      duration: '',
    }))
    .filter((video) => video.id)
}

/**
 * Some channels — this parish's among them — return 404 for the RSS feed. Their
 * uploads still sit in the automatic "UU…" playlist, so read that page instead.
 * It is scraping, so it is treated as best effort: any surprise means no videos,
 * never a broken page.
 */
async function fromUploadsPlaylist(channelId: string): Promise<FeedVideo[]> {
  const list = `UU${channelId.slice(2)}`
  const res = await fetch(`${PLAYLIST}${list}`, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en' },
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 1800 },
  })
  if (!res.ok) return []

  const html = await res.text()
  const start = html.indexOf('var ytInitialData = ')
  if (start === -1) return []
  const json = html.slice(start + 20, html.indexOf(';</script>', start))

  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    return []
  }

  const found: FeedVideo[] = []
  const seen = new Set<string>()
  const walk = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }
    if (!node || typeof node !== 'object') return
    const record = node as Record<string, unknown>

    const lockup = record.lockupViewModel as Record<string, unknown> | undefined
    if (lockup && typeof lockup.contentId === 'string') {
      const id = lockup.contentId
      const metadata = (lockup.metadata as Record<string, unknown> | undefined)?.[
        'lockupMetadataViewModel'
      ] as Record<string, unknown> | undefined
      const title = (metadata?.title as Record<string, unknown> | undefined)?.content
      const length = JSON.stringify(lockup).match(/"text":"(\d+:\d{2}(?::\d{2})?)"/)
      if (id.length === 11 && !seen.has(id)) {
        seen.add(id)
        found.push({
          id,
          title: typeof title === 'string' ? title : '',
          published: '',
          duration: length ? length[1] : '',
        })
      }
    }

    Object.values(record).forEach(walk)
  }
  walk(data)
  return found
}

export async function fetchChannelVideos(channelId: string): Promise<FeedVideo[]> {
  if (!/^UC[\w-]{20,}$/.test(channelId)) return []

  try {
    const feed = await fromFeed(channelId)
    if (feed.length > 0) return feed
    return await fromUploadsPlaylist(channelId)
  } catch {
    return []
  }
}

/**
 * Puts the channel's newest uploads at the front of the video list. A video the
 * parish has already written up keeps its bilingual title, description and
 * duration; anything new arrives with the title YouTube holds, ready to be
 * edited in the dashboard.
 */
export async function withLatestUploads(media: MediaContent): Promise<MediaContent> {
  const uploads = await fetchChannelVideos(media.channel.id ?? '')
  if (uploads.length === 0) return media

  const written = new Map(media.videos.map((video) => [video.id, video]))
  // A playlist row with no duration is a video that will not play for a
  // visitor — private, deleted, or still processing. Leave those out.
  const playable = uploads.filter((upload) => upload.duration || written.has(upload.id))
  const merged = playable.slice(0, 8).map((upload) => {
    const existing = written.get(upload.id)
    if (existing) return { ...existing, published: existing.published || upload.published }
    return {
      id: upload.id,
      title: { en: upload.title, ml: upload.title },
      description: { en: '', ml: '' },
      published: upload.published,
      duration: upload.duration,
    }
  })

  const rest = media.videos.filter((video) => !merged.some((m) => m.id === video.id))
  const videos = [...merged, ...rest]

  // Keep whichever video the parish marked as featured; otherwise the newest.
  const featured = videos.find((video) => video.featured)
  return {
    ...media,
    videos: featured ? videos : videos.map((video, i) => (i === 0 ? { ...video, featured: true } : video)),
  }
}

/**
 * The video id out of whatever somebody pasted.
 *
 * An advertiser sends a link, not an id, and the link arrives in every shape
 * YouTube hands out — the watch page, the share link, an embed, a Short, and
 * sometimes with a playlist or a start time hanging off the end. All of them
 * carry the same eleven characters, so find those and ignore the rest. A bare
 * id is passed through, which is what the media list already stores.
 *
 * Returns '' for anything that is not a YouTube link, so a mistyped address
 * leaves a gap rather than an embed pointing nowhere.
 */
export function youtubeId(value: string): string {
  const raw = (value ?? '').trim()
  if (!raw) return ''
  if (/^[\w-]{11}$/.test(raw)) return raw

  const match = raw.match(
    /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/,
  )
  return match ? match[1] : ''
}

/** The still YouTube publishes for a video, used as the click-to-play facade. */
export function youtubeThumb(id: string) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
}
