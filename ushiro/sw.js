'use strict';
const CACHE='ushiro-shadow-v1';
const FILES=['./','index.html','styles.css','core.js','renderer.js','audio.js','ui.js','assets/sprites.webp','assets/sprites.json','assets/props.webp','assets/props.json','credits.html'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('ushiro-shadow-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;e.respondWith(caches.open(CACHE).then(async c=>{const hit=await c.match(e.request,{ignoreSearch:true});if(hit)return hit;return fetch(e.request);}));});
