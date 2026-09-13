/* Service Worker — KenaliKu (Rumah Aisyiyah)
   Tugasnya cuma satu: nyimpen gambar & audio game ke Cache Storage supaya
   pemain yang udah pernah buka game-nya nggak perlu download ulang semua
   asset tiap kali balik main. Progres pemain (STATE) TETAP di localStorage
   seperti biasa — ini murni buat file gambar/suara, bukan data permainan.

   Strategi: "cache-first" khusus buat folder images/ dan audio/ — kalau
   filenya udah ada di cache, langsung dipakai dari situ (nggak nunggu
   jaringan sama sekali). Kalau belum ada, diambil dari jaringan dulu
   sekalian disimpan ke cache buat kunjungan berikutnya.

   CATATAN PENTING:
   - Service worker cuma jalan kalau game-nya dibuka lewat https:// (atau
     http://localhost pas develop). Kalau dibuka langsung dari file lokal
     (file://index.html di komputer/HP), browser nggak izinin service
     worker jalan — jadi caching ini otomatis nggak aktif, TAPI game-nya
     tetap jalan normal seperti biasa (nggak ada javascript error).
   - Ganti CACHE_NAME (misal jadi "kenaliku-assets-v2") kalau suatu saat
     ganti/update gambar-gambar di folder images/, supaya versi lama di
     cache pemain otomatis dibuang dan diganti yang baru. */

const CACHE_NAME = "kenaliku-assets-v1";
const ASSET_FOLDER_PATTERNS = [/\/images\//, /\/audio\//, /\/video\//];

self.addEventListener("install", (event) => {
  self.skipWaiting(); // versi baru sw.js langsung aktif, nggak nunggu semua tab lama ditutup
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  const isGameAsset = ASSET_FOLDER_PATTERNS.some((p) => p.test(url.pathname));
  if (!isGameAsset) return; // biarin HTML/JS/request lain jalan normal tanpa campur tangan sw

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(req).then((cached) => {
        if (cached) return cached; // sudah ada di storage -> langsung pakai, nggak ke jaringan
        return fetch(req)
          .then((resp) => {
            if (resp && resp.status === 200) {
              cache.put(req, resp.clone());
            }
            return resp;
          })
          .catch(() => cached); // offline & belum sempat ke-cache -> biarin gagal wajar
      })
    )
  );
});
