/* Budgeting PWA - revisi 058. Hanya cache halaman offline dan ikon. */
'use strict';

const CACHE_PREFIX = 'budgeting-pwa-offline-';
const CACHE_NAME = `${CACHE_PREFIX}058`;
const APP_BASE = new URL('./', self.location.href);
const OFFLINE_URL = new URL('offline.html', APP_BASE).href;
const OFFLINE_FILES = [
    OFFLINE_URL,
    new URL('icons/icon-192.png', APP_BASE).href,
    new URL('icons/icon-512.png', APP_BASE).href,
    new URL('icons/favicon-32.png', APP_BASE).href,
    new URL('icons/apple-touch-icon.png', APP_BASE).href
];

self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(OFFLINE_FILES.map(url => new Request(url, { cache: 'reload' })));
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
            .map(name => caches.delete(name)));
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);
    // Jangan menangani GAS, CDN, old.html, atau halaman lain di repository.
    if (request.method !== 'GET' || url.origin !== APP_BASE.origin) return;

    const isMainPage = url.pathname === APP_BASE.pathname ||
        url.pathname === new URL('index.html', APP_BASE).pathname;

    if (request.mode === 'navigate' && isMainPage) {
        event.respondWith((async () => {
            try {
                // Selalu minta index terbaru dari jaringan; tidak menyimpan index/data.
                return await fetch(request, { cache: 'no-store' });
            } catch (error) {
                const cached = await caches.match(OFFLINE_URL, { cacheName: CACHE_NAME });
                return cached || new Response('Anda sedang offline. Hubungkan ke internet untuk melanjutkan.', {
                    status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
                });
            }
        })());
        return;
    }

    if (OFFLINE_FILES.includes(url.href)) {
        event.respondWith((async () => {
            const cached = await caches.match(request, { cacheName: CACHE_NAME });
            return cached || fetch(request);
        })());
    }
});
