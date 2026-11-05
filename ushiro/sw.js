'use strict';
// Retire the deleted offline game; never remove caches or pages from other games.
const SCOPE=new URL(self.registration.scope);
const REMOVED='<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>公開終了</title></head><body style="background:#10151c;color:#cbd1d4;font:16px/2 sans-serif;padding:40px 24px"><p>このゲームは削除されました。</p></body></html>';
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();await Promise.all(keys.filter(key=>key.startsWith('ushiro-shadow-')).map(key=>caches.delete(key)));
 await self.clients.claim();
 const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
 await self.registration.unregister();
 // Do not await navigation inside activation: that would block its own fetch.
 for(const client of windows){const u=new URL(client.url);if(u.origin===SCOPE.origin&&u.pathname.startsWith(SCOPE.pathname))client.navigate(new URL('?removed=1',SCOPE).href).catch(()=>{});}
})()));
self.addEventListener('fetch',event=>{const u=new URL(event.request.url);if(event.request.mode==='navigate'&&u.origin===SCOPE.origin&&u.pathname.startsWith(SCOPE.pathname))event.respondWith(new Response(REMOVED,{status:410,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}}));});
