/* Lead-Suite — service worker básico (Fase A)
   Cachea el shell de la app para carga instantánea y soporte offline básico.
   En Fase B se ampliará con estrategias por tipo de recurso. */
const CACHE = 'lead-suite-v1'
const SHELL = ['/', '/manifest.json', '/icon.svg']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const clone = res.clone()
        caches.open(CACHE).then((c) => c.put(e.request, clone))
        return res
      })
      .catch(() => caches.match(e.request).then((m) => m ?? caches.match('/')))
  )
})
