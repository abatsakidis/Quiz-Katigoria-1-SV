const CACHE_NAME = 'quiz-cache-v3'; // άλλαξε για να αναγκαστεί ανανέωση
const VERSION_URL = 'https://abatsakidis.github.io/Quiz-Katigoria-1-SV/version.json';
const VERSION_CACHE = 'version-cache';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        './',
        './index.html',
        './manifest.json',
        './icon-192.png',
        './icon-512.png'
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Διαγραφή παλιών caches
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== VERSION_CACHE) {
            return caches.delete(key);
          }
        })
      );
      await checkForUpdate(); // Έλεγχος στην ενεργοποίηση
    })()
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});

// === Έλεγχος νέας έκδοσης ===
async function checkForUpdate() {
  try {
    const res = await fetch(VERSION_URL, { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    const savedVersion = await getSavedVersion();
    if (data.version && data.version !== savedVersion) {
      await saveVersion(data.version);
      notifyClientsAboutUpdate();
    }
  } catch (err) {
    console.warn('Σφάλμα ελέγχου έκδοσης:', err);
  }
}

function getSavedVersion() {
  return caches.open(VERSION_CACHE).then((cache) =>
    cache.match('version').then((res) => (res ? res.text() : null))
  );
}

function saveVersion(version) {
  return caches.open(VERSION_CACHE).then((cache) =>
    cache.put('version', new Response(version))
  );
}

function notifyClientsAboutUpdate() {
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({ type: 'NEW_VERSION_AVAILABLE' });
    });
  });
}

// === Ακρόαση μηνυμάτων από το main JS ===
self.addEventListener('message', (event) => {
  if (event.data === 'CHECK_FOR_UPDATE') {
    checkForUpdate();
  }
});
