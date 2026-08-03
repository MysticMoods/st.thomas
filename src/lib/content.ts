import { promises as fs } from 'fs'
import path from 'path'

import type { Content, ContentKey } from './types'
import { CONTENT_KEYS } from './types'

const DIR = path.join(process.cwd(), 'content')

function file(key: ContentKey) {
  return path.join(DIR, `${key}.json`)
}

/** Reads one content file. Throws if the key is not part of the schema. */
export async function readContent<T = unknown>(key: ContentKey): Promise<T> {
  if (!CONTENT_KEYS.includes(key)) throw new Error(`Unknown content key: ${key}`)
  const raw = await fs.readFile(file(key), 'utf-8')
  return JSON.parse(raw) as T
}

/** Writes one content file, pretty printed so it stays reviewable in git. */
export async function writeContent(key: ContentKey, data: unknown): Promise<void> {
  if (!CONTENT_KEYS.includes(key)) throw new Error(`Unknown content key: ${key}`)
  await fs.writeFile(file(key), JSON.stringify(data, null, 2) + '\n', 'utf-8')
}

/** Loads every content file for the public site. */
export async function getContent(): Promise<Content> {
  const [
    site,
    about,
    mass,
    events,
    clergy,
    pastPriests,
    stats,
    ministries,
    gallery,
    notices,
    feast,
    media,
  ] = await Promise.all([
    readContent('site'),
    readContent('about'),
    readContent('mass'),
    readContent('events'),
    readContent('clergy'),
    readContent('past-priests'),
    readContent('stats'),
    readContent('ministries'),
    readContent('gallery'),
    readContent('notices'),
    readContent('feast'),
    readContent('media'),
  ])

  return {
    site,
    about,
    mass,
    events,
    clergy,
    pastPriests,
    stats,
    ministries,
    gallery,
    notices,
    feast,
    media,
  } as Content
}

/** Appends a record to a small JSON list under content/ (subscribers, messages). */
export async function appendRecord(name: 'subscribers' | 'messages', record: unknown) {
  const target = path.join(DIR, `${name}.json`)
  let list: unknown[] = []
  try {
    list = JSON.parse(await fs.readFile(target, 'utf-8'))
    if (!Array.isArray(list)) list = []
  } catch {
    list = []
  }
  list.unshift(record)
  await fs.writeFile(target, JSON.stringify(list.slice(0, 2000), null, 2) + '\n', 'utf-8')
}

export async function readRecords(name: 'subscribers' | 'messages') {
  try {
    const raw = await fs.readFile(path.join(DIR, `${name}.json`), 'utf-8')
    const list = JSON.parse(raw)
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}
