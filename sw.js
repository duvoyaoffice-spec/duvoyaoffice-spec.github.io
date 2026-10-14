// DUVOYA service worker — the offline shell. Built by apps/web/pwa/plugin.js, which fills in the
// version and the list of files of this exact build (hashed JS/CSS, icons, the page itself).
//   • Pages (navigations): network first, so a new release shows immediately; offline → the cached app.
//   • Built files (/assets/…, hashed): cache first — they never change under the same name.
//   • Google Fonts: stale-while-revalidate, so the typography survives offline.
//   • Everything else — the Supabase API, realtime, partner sites, photos — goes to the network untouched.
const VERSION = '7ff577a74afe';
const SHELL = 'duvoya-shell-' + VERSION;
const FONTS = 'duvoya-fonts-v1';
const PRECACHE = ["/","/apple-touch-icon.png","/assets/accessibility-B6OrJ8Td.js","/assets/affiliate-K5qnwbNf.js","/assets/ai-concierge-DCU61lJP.js","/assets/community-Bvf4vxaX.js","/assets/cookies-CdXDlfKW.js","/assets/core-Cdkqe2Bh.js","/assets/index-B8txFtdb.js","/assets/index-COZDRBUk.css","/assets/privacy-BXq6mb-o.js","/assets/react-DQC8vhiG.js","/assets/terms-BT9A-E7O.js","/favicon.png","/favicon.svg","/frame-guard.js","/icons/duvoya-192.png","/icons/duvoya-512.png","/manifest.webmanifest"];

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(keys.filter(k => k.startsWith('duvoya-shell-') && k !== SHELL).map(k => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    // The app's pages: fresh when online, the cached shell when offline.
    if (req.mode === 'navigate') {
      event.respondWith(
        fetch(req)
          .then(res => {
            if (res.ok && url.pathname === '/') {
              const copy = res.clone();
              caches.open(SHELL).then(c => c.put('/', copy));
            }
            return res;
          })
          .catch(() => caches.match('/', { ignoreSearch: true }).then(r => r || caches.match('/index.html'))),
      );
      return;
    }
    // Hashed build files and icons: cache first.
    if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
      event.respondWith(
        caches.match(req).then(
          hit =>
            hit ||
            fetch(req).then(res => {
              if (res.ok) {
                const copy = res.clone();
                caches.open(SHELL).then(c => c.put(req, copy));
              }
              return res;
            }),
        ),
      );
    }
    return;
  }

  // Google Fonts (CSS + font files): serve the cached copy, refresh in the background.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONTS).then(cache =>
        cache.match(req).then(hit => {
          const fresh = fetch(req)
            .then(res => {
              if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
              return res;
            })
            .catch(() => hit);
          return hit || fresh;
        }),
      ),
    );
  }
});
