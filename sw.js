// ===================================================================
// LOTO DIGITAL — Service Worker
// Guarda en caché los archivos de la app para que abra rápido y el
// editor de cartones funcione aunque no haya internet. Las llamadas a
// Firebase/Google NUNCA se cachean: siempre van directo a la red.
// ===================================================================

const CACHE_NAME = 'loto-digital-v1';
const ARCHIVOS_CACHE = [
    './',
    'index.html',
    'pantalla.html',
    'css/estilos.css',
    'css/pantalla.css',
    'js/firebase-config.js',
    'js/carton.js',
    'js/historial.js',
    'js/tombola.js',
    'js/partidas.js',
    'js/pantalla.js',
    'js/app.js',
    'manifest.json',
    'icons/icon-192.png',
    'icons/icon-512.png'
];

self.addEventListener('install', (evento) => {
    evento.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ARCHIVOS_CACHE))
            .catch((err) => console.error('SW install:', err))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
    evento.waitUntil(
        caches.keys().then((nombres) =>
            Promise.all(nombres.filter((nombre) => nombre !== CACHE_NAME).map((nombre) => caches.delete(nombre)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (evento) => {
    const url = evento.request.url;

    // Firebase (base de datos y SDK) siempre debe ir a la red, nunca a caché.
    if (url.includes('firebaseio.com') || url.includes('gstatic.com') || url.includes('googleapis.com')) {
        return;
    }

    evento.respondWith(
        caches.match(evento.request).then((respuestaCache) => respuestaCache || fetch(evento.request))
    );
});
