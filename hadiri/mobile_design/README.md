# 📱 Hadirin Mobile App — UI Design System (Figma-Ready)

Desain antarmuka mobile untuk aplikasi **Hadirin** dengan 3 alur layar prioritas:
1. **Beranda & Clock In (Presensi Masuk)**
2. **Sesi Aktif & Clock Out (Presensi Pulang)**
3. **Pengajuan Cuti (Leave Request & Saldo Kuota)**

---

## 📂 Daftar File Desain

| File | Dimensi | Deskripsi |
| :--- | :--- | :--- |
| `hadirin_mobile_all_screens.svg` | **1360 × 980 px** | **Master Canvas** berisi 3 layar sekaligus berdampingan, siap langsung di-drag ke Figma. |
| `01_screen_clock_in.svg` | **393 × 852 px** | Layar Beranda: Shift aktif, radius GPS, jam digital live, viewfinder face scan selfie, tombol Clock In, dan statistik cepat. |
| `02_screen_clock_out.svg` | **393 × 852 px** | Layar Sesi Aktif: Indikator bekerja live, stopwatch durasi kerja digital besar, rincian jam masuk & verifikasi GPS, catatan kegiatan harian, tombol Clock Out, dan tombol SPL Lembur. |
| `03_screen_pengajuan_cuti.svg` | **393 × 852 px** | Layar Cuti: Kartu sisa saldo cuti (Tahunan, Sakit, Khusus), formulir tipe cuti & pemilih tanggal (auto-hitung hari kerja), input alasan, upload dokumen bukti, tombol submit, dan riwayat status approval. |
| `preview.html` | — | Halaman pratinjau interaktif. Buka di browser Chrome/Safari untuk melihat visualisasi sebelum diimport ke Figma. |

---

## 🚀 Panduan Import ke Figma

1. **Buka Figma:**
   - Buka aplikasi **Figma Desktop** atau kunjungi [figma.com](https://figma.com) di browser Anda.
2. **Buat File Baru / Buka Proyek:**
   - Klik **"+ New design file"**.
3. **Import File SVG:**
   - Buka folder `hadiri/mobile_design/` di komputer Anda (melalui Finder di Mac).
   - **Tarik & Lepas (*Drag and Drop*)** file `hadirin_mobile_all_screens.svg` langsung ke atas kanvas Figma.
   - *(Atau Anda juga dapat mendrag file per layar satu per satu jika ingin terpisah)*.
4. **Hasil di Figma:**
   - Figma akan secara otomatis mendeteksi setiap `<g id="...">` dan mengubahnya menjadi **Frames & Groups**.
   - Seluruh teks, warna gradient, bayangan (*drop shadows*), dan ikon vector **100% editable** (dapat diubah teksnya, diganti warnanya, dan dijadikan *Figma Component / Auto Layout*).

---

## 🎨 Spesifikasi Palet Warna & Tipografi

- **Primary Brand:** `#4F46E5` (Indigo 600), `#4338CA` (Indigo 700), `#312E81` (Indigo 900)
- **Success / Clock In:** `#10B981` (Emerald 500), `#059669` (Emerald 600)
- **Danger / Clock Out:** `#F43F5E` (Rose 500), `#E11D48` (Rose 600)
- **Warning / Pending:** `#F59E0B` (Amber 500)
- **Background Surface:** `#F8FAFC` (Slate 50), Card `#FFFFFF`, Dark Viewfinder `#0F172A`
- **Typography:** `Inter` / Apple System Font (`-apple-system`, `SF Pro Text`)

