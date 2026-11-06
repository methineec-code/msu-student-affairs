/* Service Worker — ระบบกิจการนิสิต มมส
   กลยุทธ์:
     - หน้าเว็บ (HTML)            -> network first  เอาของใหม่เสมอ ถ้าเน็ตล่มค่อยใช้แคช
     - ไอคอน / manifest / ไฟล์นิ่ง -> cache first แล้วอัปเดตเบื้องหลัง
     - คำขอไป Apps Script (/exec) -> ไม่แคชเด็ดขาด ข้อมูลต้องสด
*/
const CACHE_VERSION = 'msu-sa-v6';
const SHELL = [
  './',
  './index.html',
  './student.html',
  './activities.html',
  './staff.html',
  './admin.html',
  './scan.html',
  './manifest.json',
  './icon-192.png',
  './icon-maskable.png',
  './apple-touch-icon.png',
  './icon-512.png',
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

/* หน้าเว็บหรือไม่ */
function isPage(req) {
  if (req.mode === 'navigate') return true;
  var u = req.url.split('?')[0];
  return /\.html$/.test(u) || /\/$/.test(u);
}

self.addEventListener('fetch', function (e) {
  var url = e.request.url;

  // ข้อมูลจากหลังบ้าน / รูป QR — ไม่แคช
  if (e.request.method !== 'GET' ||
      url.indexOf('script.google.com') >= 0 ||
      url.indexOf('api.qrserver.com') >= 0 ||
      url.indexOf('drive.google.com') >= 0) {
    return;
  }

  // ---- หน้าเว็บ: เอาของใหม่ก่อนเสมอ ----
  if (isPage(e.request)) {
    e.respondWith(
      fetch(e.request).then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(CACHE_VERSION).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match(e.request).then(function (hit) {
          return hit || caches.match('./index.html');
        });
      })
    );
    return;
  }

  // ---- ไฟล์นิ่ง: ใช้แคชก่อน แล้วอัปเดตเบื้องหลัง ----
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
