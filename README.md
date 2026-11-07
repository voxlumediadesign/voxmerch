# Voxmerch

MVP print-on-demand berbahasa Indonesia dengan Node.js 24+ dan SQLite. Tidak memerlukan instalasi paket.

## Menjalankan demo lokal

PowerShell, dari root proyek:

```powershell
$env:VOX_DEMO = '1'
$env:VOX_ADMIN_KEY = 'voxmerch-demo-local-2026'
npm start
```

Buka http://127.0.0.1:3000. Masuk lewat **Dashboard** atau buat akun. Cari kaos atau tote di katalog, buka spesifikasi produk, unggah PNG/JPG, simpan draf atau terbitkan, lalu buka tautan produk. Untuk pesanan sampel, gunakan tombol **Pesan sampel** di studio.

Di etalase, isi checkout dan klik **Simulasikan pembayaran** pada halaman pesanan. Buka **Operasional** di footer, masukkan kunci admin, lalu ubah status menjadi **Diproduksi → Dikirim → Terkirim**. Saat mengirim, isi nomor resi. Halaman pelacakan menampilkan status dan resi; dashboard kreator menampilkan margin estimasi.

## Konfigurasi pilot

- Aktifkan `VOX_DEMO=1` hanya untuk demonstrasi. Pada mode manual, operator memverifikasi pembayaran di luar aplikasi dan mengubah status pesanan ke **Dibayar**.
- Setel `VOX_PAYMENT_INSTRUCTIONS` dengan instruksi pembayaran dan kontak operator. Gunakan `VOX_ADMIN_KEY` unik yang kuat.
- `VOX_DATA` menentukan direktori penyimpanan SQLite. Default `data/`. Simpan di volume persisten dan cadangkan secara berkala.
- Gunakan `PORT` dan `HOST` bila diperlukan. Gunakan reverse proxy HTTPS dan `VOX_HTTPS=1` pada deployment HTTPS untuk mengamankan cookie.
- Harga, ongkir tetap, dan varian awal ada di `server.mjs`. Kalibrasikan dengan mitra produksi sebelum pilot berbayar.

## Batasan MVP

Mockup berupa ilustrasi satu area cetak. Operator mengunduh artwork asli dan meneruskannya ke mitra produksi. Status, resi, serta keputusan penanganan keluhan diperbarui manual. Pembayaran otomatis, pencairan margin, notifikasi, pemulihan akun, tarif kurir real-time, dan integrasi marketplace belum tersedia. Sebelum eksposur publik, tambahkan pembatasan laju untuk autentikasi dan checkout, serta kelola retensi data pesanan.

`npm run check` memeriksa sintaks server dan browser.

## GitHub Pages

Jalankan `npm run build:pages` setelah mengubah antarmuka atau katalog. Commit hasilnya di `docs/`.

Di repo GitHub, pilih **Settings → Pages → Deploy from a branch → main → /docs → Save**. URL proyek: https://voxlumediadesign.github.io/voxmerch/.

Preview Pages menyimulasikan katalog, Product Creator, draf, publikasi di tab, sampel, checkout, dan pembayaran. Data hanya berada di memori tab dan hilang saat halaman dimuat ulang. Demo tidak meminta alamat atau kredensial. Gunakan aplikasi Node.js untuk akun, data persisten, dan antrean produksi.
