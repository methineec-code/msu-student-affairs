/* Service Worker — ระบบกิจการนิสิต มมส
   กลยุทธ์:
     - ไฟล์หน้าเว็บ (HTML/CSS/ไอคอน)  -> cache first แล้วอัปเดตเบื้องหลัง
     - คำขอไป Apps Script (/exec)     -> network only ไม่แคชเด็ดขาด (ข้อมูลต้องสด)
   เปลี่ยน CACHE_VERSION ทุกครั้งที่อัปไฟล์ใหม่ขึ้น Netlify เพื่อล้างแคชเก่า
*/
const CACHE_VERSION = 'msu-sa-v2';
const SHELL = [
  './',
  './index.html',
  './student.html',
  './staff.html',
  './admin.html',
  './scan.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_VERSION)
      .then(function (c) { return c.addAll(SHELL).catch(function(){ /* ไฟล์ไหนไม่มีก็ข้าม */ }); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE_VERSION) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var url = e.request.url;

  // ข้อมูลจากหลังบ้าน / CDN / กล้อง — ไม่แคช
  if (e.request.method !== 'GET' ||
      url.indexOf('script.google.com') >= 0 ||
      url.indexOf('api.qrserver.com') >= 0) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function (hit) {
      var fresh = fetch(e.request).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic') {
          var copy = res.clone();
          caches.open(CACHE_VERSION).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || fresh;
    })
  );
});
