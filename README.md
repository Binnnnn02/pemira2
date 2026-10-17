# Sistem Penilaian Wawancara Kandidat PEMIRA Sekolah 🗳️

Aplikasi web modern, profesional, akuntabel, dan aman untuk mengelola proses seleksi dan penilaian wawancara calon ketua/wakil ketua OSIS & MPK (Pemilihan Raya Siswa) berbasis **React 19 + Vite + TypeScript + Tailwind CSS + Supabase**.

---

## 🌟 Fitur Utama & Aturan Sistem

### 1. Multi-Peran (Role-Based Access Control)
- **Admin (Pembina / Panitia Inti):**
  - **CRUD Kandidat:** Mengelola nomor urut, biodata, NISN, kelas, target posisi, serta visi & misi kandidat.
  - **CRUD Pewawancara:** Mengelola panelis penguji (Guru BK, Alumni, Pembina).
  - **Penugasan Ketat:** Menetapkan tepat **satu (1) pewawancara aktif per kandidat dalam satu periode** (ditegakkan via database unique index & check constraints).
  - **Jadwal Wawancara:** Mengatur linimasa tanggal, jam, durasi, dan ruang wawancara.
  - **Rubrik & Bobot:** Mengatur aspek penilaian dan persentase bobot dengan meter validasi total bobot wajib tepat 100%.
  - **Pengawasan & Pembukaan Kunci:** Melihat status seluruh penilaian (draft / submitted), serta **membuka kembali penilaian terkunci dengan alasan audit wajib (minimal 5 karakter)**.
  - **Klasemen & Ranking:** Menampilkan podium 3 besar, tabel peringkat per periode, breakdown kontribusi nilai, serta **Ekspor Laporan CSV**.
  - **Audit Log:** Mencatat seluruh tindakan krusial (submit final, buka kunci, perubahan rubrik, dan penugasan).

- **Pewawancara (Panelis Penguji):**
  - Hanya dapat mengakses kandidat dan penilaian yang ditugaskan secara resmi kepada dirinya (Row Level Security).
  - Lembar penilaian interaktif dengan kalkulasi skor akhir terbobot real-time.
  - Penggeser (slider) dan input angka tersinkronisasi (skala 1–100 per aspek) beserta panduan indikator mutu.
  - **Simpan Draft:** Menyimpan progres penilaian sementara tanpa mengunci nilai.
  - **Submit Nilai Final:** Mengunci lembar penilaian dan merekam skor resmi ke klasemen. Lembar penilaian yang terkunci tidak dapat diedit kembali oleh pewawancara.

### 2. Standar 5 Aspek Penilaian Awal (Bobot 20% Masing-Masing)
1. **Kepemimpinan (20%):** Integritas, visi misi organisasi, ketegasan, dan pengambilan keputusan.
2. **Komunikasi (20%):** Artikulasi ide, kesantunan bertutur, kemampuan mendengar aktif, dan persuasi.
3. **Tanggung Jawab (20%):** Kedisiplinan waktu, konsistensi tugas, dan rekam jejak amanah.
4. **Pemecahan Masalah (20%):** Pola pikir kritis, inovasi program kerja, dan resolusi konflik.
5. **Motivasi (20%):** Ketulusan pengabdian, daya juang menghadapi tekanan, dan motivasi internal.

*Admin dapat menambah, mengubah, atau mematikan aspek, tetapi sistem memvalidasi bahwa total bobot seluruh aspek aktif wajib **100%**.*

---

## 📁 Struktur Direktori

```text
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   └── AppLayout.tsx           # Layout navigasi sidebar & header
│   │   └── ui/
│   │       ├── Badge.tsx               # Status & role badges
│   │       ├── EmptyState.tsx          # Tampilan state kosong
│   │       ├── Modal.tsx               # Accessible modal dialog
│   │       └── StatCard.tsx            # Komponen statistik ringkasan
│   ├── context/
│   │   ├── AuthContext.tsx             # Manajemen sesi & pergantian peran
│   │   └── ToastContext.tsx            # Sistem notifikasi toast
│   ├── lib/
│   │   ├── dataService.ts              # Lapisan data terpadu (Supabase + Demo)
│   │   ├── mockData.ts                 # Data awal seed untuk simulasi offline
│   │   └── supabase.ts                 # Inisialisasi Supabase client aman
│   ├── pages/
│   │   ├── admin/                      # Seluruh halaman dashboard admin
│   │   ├── auth/                       # Halaman login modern
│   │   └── interviewer/                # Lembar kerja & dashboard pewawancara
│   ├── tests/
│   │   └── scoring.test.ts             # 8 automated unit tests untuk logika bisnis
│   ├── types/
│   │   └── index.ts                    # TypeScript domain definitions
│   ├── App.tsx                         # Router & guard hak akses
│   ├── index.css                       # Styling Tailwind v4
│   └── main.tsx                        # Entry point React
├── supabase/
│   └── migrations/
│       └── 20261016_initial_schema.sql # Skema database Supabase lengkap & RLS
├── .env.example                        # Template environment variables
├── package.json
└── vite.config.ts
```

---

## 🚀 Panduan Setup & Menjalankan Aplikasi

### Mode 1: Mode Demo / Simulasi (Langsung Siap Pakai)
Aplikasi telah dilengkapi **Dual-Backend Engine**. Jika belum menghubungkan database Supabase, aplikasi secara otomatis berjalan dalam **Mode Demo** interaktif dengan data tersimpan di browser:
1. Jalankan aplikasi:
   ```bash
   npm install
   npm run dev
   ```
2. Buka browser di `http://localhost:5173`.
3. Pada halaman Login, Anda dapat langsung mengklik tombol cepat:
   - **Masuk Admin** (Drs. Bambang Sutrisno, M.Pd)
   - **Masuk Pewawancara** (Dewi Lestari, S.Pd)
4. Terdapat banner kuning di bagian atas untuk berpindah peran secara instan (1-klik) dan mereset data demo kapan saja.

---

### Mode 2: Menghubungkan ke Proyek Supabase Baru

#### Langkah 1: Buat Proyek Supabase Baru
1. Masuk ke [supabase.com](https://supabase.com) dan buat proyek baru (misal: `pemira-wawancara`).
2. Masuk ke menu **Project Settings > API**.
3. Salin **Project URL** dan **anon / public key** (jangan gunakan `service_role` key pada frontend).

#### Langkah 2: Jalankan Migrasi Database SQL
1. Di Dashboard Supabase, buka menu **SQL Editor**.
2. Buat query baru, buka file [`supabase/migrations/20261016_initial_schema.sql`](file:///supabase/migrations/20261016_initial_schema.sql), lalu salin seluruh kodenya dan klik **Run**.
3. Migrasi ini akan secara otomatis:
   - Membuat enum, tabel profil, periode, kandidat, penugasan, jadwal, rubrik, penilaian, detail nilai, dan audit log.
   - Mengaktifkan **Row Level Security (RLS)** pada seluruh tabel.
   - Memasang indeks unik `unique_active_interviewer_per_candidate_period` (1 pewawancara aktif per kandidat per periode).
   - Memasang trigger database yang mencegah pengubahan nilai yang sudah berstatus `submitted`.
   - Mengisi data periode aktif awal dan 5 kriteria rubrik (20% masing-masing).

#### Langkah 3: Konfigurasi File `.env`
Salin template `.env.example` ke file `.env`:
```bash
cp .env.example .env
```
Isi variabel dengan kredensial dari langkah 1:
```env
VITE_SUPABASE_URL=https://proyek-anda.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_ENABLE_DEMO_FALLBACK=false
```

#### Langkah 4: Membuat Akun Admin Pertama di Supabase
1. Masuk ke Dashboard Supabase > **Authentication > Users**.
2. Klik **Add User > Create User** (masukkan email, misalnya `admin@pemira.sch.id`, dan password Anda).
3. Setelah user terbuat, salin `User UID` akun tersebut.
4. Buka **SQL Editor** dan jalankan perintah berikut untuk mengangkat akun tersebut sebagai Administrator:
   ```sql
   INSERT INTO public.profiles (id, email, name, role, phone, is_active)
   VALUES (
     'PASTE-USER-UID-DISINI',
     'admin@pemira.sch.id',
     'Pembina OSIS Utama',
     'admin',
     '081234567890',
     true
   )
   ON CONFLICT (id) DO UPDATE SET role = 'admin', is_active = true;
   ```
5. Sekarang Anda dapat login menggunakan email dan password tersebut di aplikasi web!

---

## 🧪 Menjalankan Pengujian Otomatis (Automated Tests)

Sistem telah dilengkapi dengan pengujian unit otomatis menggunakan Vitest untuk menguji seluruh aturan dan batasan sistem:

```bash
npm test
```

### Daftar 8 Skenario Uji Terverifikasi:
1. ✅ Memiliki 5 aspek awal dengan bobot masing-masing 20% dan total tepat 100%.
2. ✅ Menolak penyimpanan rubrik jika total bobot tidak sama dengan 100%.
3. ✅ Menghitung nilai akhir proporsional terbobot saat submit final: `Σ (Nilai × Bobot%)`.
4. ✅ Mengunci penilaian yang sudah disubmit dan menolak edit draft.
5. ✅ Membuka kunci penilaian **hanya oleh Admin** dan wajib mencatat alasan minimal 5 karakter pada Audit Log.
6. ✅ Menerapkan aturan: tepat satu (1) pewawancara aktif per kandidat dalam satu periode.
7. ✅ Klasemen ranking hanya memproses penilaian final (`submitted`) per periode dan diurutkan descending.
8. ✅ Ekspor CSV menghasilkan format laporan terstruktur dengan penanganan UTF-8 BOM untuk Microsoft Excel.

---

## 📦 Build Produksi & Panduan Deployment

### Build Produksi Lokal
Jalankan kompilasi TypeScript dan bundler Vite:
```bash
npm run build
```
File siap saji akan dibuat di dalam folder `dist/`.

### Deployment ke Vercel / Netlify / Cloudflare Pages
1. Hubungkan repository GitHub proyek ini ke platform hosting pilihan Anda (Vercel / Netlify).
2. Tentukan build configuration:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Masukkan Environment Variables di dashboard hosting:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_ENABLE_DEMO_FALLBACK`
4. Untuk penanganan Single Page Application (SPA routing), file konfigurasi rewrite sudah didukung secara default.

---

## 🛡️ Catatan Keamanan
- Tidak ada `service_role` key yang disimpan di frontend; seluruh otorisasi dikawal langsung oleh PostgreSQL Row Level Security (RLS).
- Fungsi Stored Procedure `submit_assessment` dan `unlock_assessment` dijalankan secara atomik (transaksional) di database untuk menjamin integritas data penilaian PEMIRA.

## Fitur tambahan: identitas aplikasi dan akun pewawancara

### Pengaturan identitas
Admin dapat membuka **Pengaturan** dari sidebar untuk mengubah nama kegiatan, nama sekolah, nama organisasi, dan daftar jabatan kandidat. Di mode Supabase, jalankan migration `supabase/migrations/20261016_app_settings.sql` setelah migration schema awal. Di mode demo, pengaturan disimpan pada local storage browser.

### Membuat akun pewawancara
Di mode Supabase, fitur tambah pewawancara menggunakan Edge Function `create-interviewer` agar password tidak disimpan di tabel profil dan service-role key tidak pernah dikirim ke browser. Deploy fungsi dari root project menggunakan Supabase CLI:

```bash
supabase functions deploy create-interviewer
```

Fungsi menggunakan environment variables bawaan Supabase: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, dan `SUPABASE_SERVICE_ROLE_KEY`. Jangan pernah menaruh service-role key dalam file `VITE_*` atau kode frontend. Akun yang dibuat akan memiliki role `interviewer` dan email terkonfirmasi sehingga dapat login menggunakan email/password yang dibuat admin.

Setelah migration dan function siap, isi `.env` lokal berdasarkan `.env.example`, lalu jalankan `npm install` dan `npm run dev`. Mode demo tidak membuat akun autentikasi Supabase sungguhan; gunakan proyek Supabase terkonfigurasi untuk login pewawancara dengan password.
#   p e m i r a 2  
 