/*
 * St. Thomas Church, Mangalassery — offline shell.
 *
 * Photographs, fonts and static assets are served cache-first so the site opens
 * instantly on a poor connection. Pages are network-first so parish notices are
 * never stale. Nothing under /api or /admin is ever cached.
 */
const VERSION = 'stc-v1'
const ASSETS = `${VERSION}-assets`
const PAGES = `${VERSION}-pages`
const OFFLINE_URL = '/'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(ASSETS)
      .then((cache) => cache.addAll(['/icon.svg', '/icon-192.png', '/manifest.webmanifest']))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  )
})

function cacheable(url) {
  return (
    url.origin === self.location.origin &&
    !url.pathname.startsWith('/api') &&
    !url.pathname.startsWith('/admin')
  )
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (!cacheable(url) && url.origin === self.location.origin) return

  const isAsset =
    url.pathname.startsWith('/images/') ||
    url.pathname.startsWith('/uploads/') ||
    url.pathname.startsWith('/_next/static/') ||
    /\.(css|js|woff2?|svg|png|jpe?g|webp|avif|ico)$/.test(url.pathname)

  if (isAsset) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            const copy = response.clone()
            caches.open(ASSETS).then((cache) => cache.put(request, copy))
            return response
          }),
      ),
    )
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(PAGES).then((cache) => cache.put(request, copy))
          return response
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match(OFFLINE_URL))),
    )
  }
})
