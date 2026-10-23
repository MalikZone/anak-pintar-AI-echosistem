# Hadirin Frontend (Smart Attendance & HRIS)

Frontend platform presensi dan manajemen kehadiran cerdas ala **Talenta by Mekari**, dibangun dengan **Vite + React** dan **Tailwind CSS**. Aplikasi ini responsif untuk semua perangkat (Mobile Smartphone, Tablet, dan Desktop) dan dirancang sebagai antarmuka awal sub-proyek `hadirin` dalam ekosistem **Anak-Pintar**.

---

## 🚀 Cara Menjalankan

Masuk ke folder `hadiri/frontend`:

```bash
cd "hadiri/frontend"
npm run dev
```

Buka browser di `http://localhost:3000` (atau port yang ditampilkan terminal).

Untuk build production:
```bash
npm run build
npm run preview
```

---

## ✨ Fitur yang Tersedia

### 1. Dual-Role Switcher (Karyawan vs HR/Admin)
Di bagian header/navbar atas, terdapat tombol beralih cepat:
* **Karyawan (ESS)**: Antarmuka portal mandiri karyawan.
* **HR / Admin**: Antarmuka pemantauan dan pengelolaan persetujuan tim.

### 2. Fitur Karyawan (Employee Self-Service)
* **Live Attendance (Clock-In & Clock-Out)**:
  * Jam digital live *real-time* WIB.
  * Kartu jadwal shift aktif (*WFO - Reguler Pagi 08:30 - 17:30*).
  * Status geofencing lokasi kantor (Menara Batavia) dengan tombol simulasi Ubah Radius (Dalam / Luar kantor).
  * Tombol Clock-In interaktif dengan modal simulasi kamera *Selfie Verification* dan deteksi wajah.
  * *Live Working Duration Tracker* menghitung jam & menit kerja berjalan.
  * Tombol Clock-Out saat shift selesai.
* **Form Pengajuan Cuti & Izin Sakit**:
  * Pilihan jenis izin (Izin Sakit, Cuti Tahunan, Izin Khusus).
  * Pemilihan rentang tanggal & kalkulasi otomatis total hari kerja.
  * Komponen upload surat keterangan dokter dengan simulasi *AI OCR Document Analysis*.
* **Riwayat Kehadiran (Attendance History)**:
  * Ringkasan bulanan (Total hari, Tepat Waktu, Terlambat, Cuti).
  * Filter status (Semua, Tepat Waktu, Terlambat).
  * Tampilan tabel responsif di desktop & card view di mobile.

### 3. Fitur HR / Administrator
* **Live Attendance Command Center**:
  * Headcount metrik: Total Staf, Hadir Tepat, Terlambat, Cuti/Sakit, dan Belum Hadir.
  * Pencarian instan dan filter berdasarkan departemen (Technology, Product, Finance, Marketing, Operations).
  * Live feed presensi seluruh staf secara *real-time*.
* **Pusat Persetujuan (Approval Center)**:
  * Meninjau permohonan cuti dan izin sakit yang menunggu persetujuan (*Pending*).
  * Pratinjau dokumen surat dokter lengkap dengan hasil analisis AI OCR.
  * Tombol aksi: **Setujui (Approve)** atau **Tolak (Reject)** dengan pembaruan data instan.
* **Direktori Karyawan**:
  * Katalog seluruh staf dengan avatar, status kehadiran, shift kerja, dan departemen.

### 4. Responsivitas Multi-Perangkat
* **Mobile (Smartphone)**:
  * *Bottom Navigation Bar* modern (Beranda, Presensi, Cuti/Izin, Riwayat).
  * Elemen sentuh (*touch-friendly*) berukuran nyaman.
* **Tablet & Desktop**:
  * *Collapsible Sidebar* dengan indikator status AI Architecture.
  * Grid data multi-kolom yang optimal memanfaatkan lebar layar.

