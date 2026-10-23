# 📡 DOKUMENTASI LENGKAP API AI ORCHESTRATION KERJACERDAS
## PT AKM Group — DLKL Coffee & Blanco Court Beef Noodle (BCBN)
**Lokasi Berkas**: `/home/whn-01/work/dev_docs/26_DOKUMENTASI_API_AI_ORCHESTRATION_KERJACERDAS.md`  
**Versi Dokumen**: v1.0.0 (Enterprise Specification)  
**Klasifikasi**: Technical Documentation & Integration Reference  
**Tanggal**: 23 Oktober 2026  

---

## 1. Ikhtisar Arsitektur AI Orchestration

Sistem **Kerja Cerdas** mengimplementasikan arsitektur orkestrasi kecerdasan buatan (*AI Orchestration*) bertingkat yang beroperasi **100% On-Premise** pada workstation mini PC onsite (`whn-01-LS5`, AMD Ryzen AI 9 HX 470, GPU Radeon 890M Vulkan, RAM 28GB).

Orkestrasi AI menjembatani pesan teks bahasa manusia informal dari grup Telegram gerai dan foto fisik dokumen (surat jalan/nota pasar) ke dalam transaksi persediaan dan pengadaan di PostgreSQL secara deterministik, tanpa risiko halusinasi atau *candidate dumping*.

```
+---------------------------------------------------------------------------------------------------+
|                                  ARSITEKTUR API AI ORCHESTRATION                                  |
|                                                                                                   |
|  [ Telegram Gateway / Web UI ]                                                                    |
|            │                                                                                      |
|            ▼ (HTTP POST)                                                                          |
|  [ LAYER 1: RAG & Intent Gatekeeper - Port 8000 ]                                                 |
|     ├── /detect-intent          : Klasifikasi Semantik BGE-M3 (1024-dim) & Domain Guardrails      |
|     ├── /process-input          : Filter Noise 95%, Vektorisasi Qdrant, & Generator Kontrak       |
|     ├── /build-augmented-prompt : Context Fusion (Katalog SKU + Aturan D08 + Skema JSON)          |
|     └── /retrieve & /index      : Manajemen Vektor Pengetahuan (Qdrant Port 6333)                 |
|            │                                                                                      |
|            ▼ (Prepared Contract)                                                                  |
|  [ LAYER 2: Temporal Orchestration Engine - Port 7233 ]                                           |
|     ├── PurchaseRequestWorkflow : Validasi D08, Eksekusi LLM, Commit Atomik ke PostgreSQL         |
|     └── ReceivingWorkflow       : Ekstraksi OCR, 3-Way Line Matching (DO vs PO), Mutasi Stok      |
|            │                                                                                      |
|            ▼ (HTTP Prompt / Native CLI)                                                           |
|  [ LAYER 3: Model Inferensi Lokal ]                                                               |
|     ├── llama-server (Port 8081/8092) : Qwen 9B / 4B LLM (Ekstraksi JSON Deterministik)           |
|     └── llama-mtmd-cli (On-Demand)    : Unlimited-OCR (Digitalisasi Nota & Faktur Fisik)          |
|            │                                                                                      |
|            ▼                                                                                      |
|  [ LAYER 4: Database & User Interface ]                                                           |
|     ├── PostgreSQL 18 (Port 5432)     : System of Record Transaksional                            |
|     └── Control Tower (Port 3000)     : /api/assistant/tenant-chat (Copilot Real-time DB)         |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Layer 1: RAG & Intent Gatekeeper API (Port 8000)

Layanan ini di-host oleh FastAPI (`services/rag/main.py`) di port **8000**. Bertindak sebagai pintu gerbang terdepan yang memvalidasi pesan, menyaring kebisingan, melakukan pencarian kemiripan semantik ke Qdrant, serta merangkai prompt kaya konteks (*augmented prompt*).

---

### 2.1 `POST /process-input` (End-to-End Pre-Storage Gatekeeper)

* **Fungsi API**:  
  Endpoint utama yang dipanggil oleh `telegram_gateway.py` saat ada pesan masuk di grup. Menjalankan fungsi penyaringan 95% *operational noise*, mencatat dokumen yang valid ke Qdrant (`kerjacerdas_documents`), menyusun konteks cabang (*Deterministic Context Resolution*), dan menyiapkan kontrak eksekusi Temporal Workflow.
* **Untuk Apa Responnya**:  
  Memberikan instruksi kepada gateway:
  1. Jika status `ignored`: Gateway tidak membalas apa pun di chat (diam).
  2. Jika status `confirmation_required`: Gateway mengirim tombol konfirmasi ke staf.
  3. Jika status `processed_and_queued`: Gateway mengambil field `temporal_payload` untuk langsung memicu eksekusi `PurchaseRequestWorkflow` di Temporal Server secara asinkron tanpa risiko duplikasi (*idempotent execution*).

#### Request Payload
* **Endpoint**: `http://127.0.0.1:8000/process-input`
* **Method**: `POST`
* **Content-Type**: `application/json`

```json
{
  "id": "msg-telegram-991201",
  "text": "Sayuti Kitchen Blanco: tolong order bwg putih kating 3kg, daging sengkel 15 kg, kecap asin 2 jerigen buat besok pagi ya dennis",
  "source": "telegram",
  "metadata": {
    "chat_id": -1003965431117,
    "message_id": 4120,
    "sender": "Sayuti",
    "sender_id": 58821901,
    "branch": "Blanco Court Beef Noodle - Pacific Place",
    "tenant_id": "TEN-AKM"
  },
  "threshold": 0.78
}
```

#### Parameter Request
| Field | Tipe Data | Wajib | Keterangan |
| :--- | :--- | :--- | :--- |
| `id` | String | Opsional | ID unik pesan/dokumen. Jika kosong, sistem membuat UUIDv4. |
| `text` | String | **Ya** | Kalimat mentah yang dikirim oleh staf di grup chat. |
| `source` | String | Opsional | Kanal asal pesan (bawaan: `telegram`, opsi lain: `web`, `whatsapp`). |
| `metadata` | Object | Opsional | Informasi kontekstual pengirim (`chat_id`, `message_id`, `tenant_id`, dsb.). |
| `threshold` | Float | Opsional | Nilai ambang keyakinan minimum (bawaan sistem: `0.78`). |

#### Response Payload (Contoh Pesanan Valid Lolos Filter)
* **HTTP Status**: `200 OK`

```json
{
  "status": "processed_and_queued",
  "action": "TRIGGER_WORKFLOW",
  "document_id": "msg-telegram-991201",
  "collection": "kerjacerdas_documents",
  "intent": "PURCHASE_REQUEST",
  "confidence": 0.8842,
  "is_actionable": true,
  "target_workflow": "PurchaseRequestWorkflow",
  "workflow_status": "QUEUED_CONTRACT_READY",
  "workflow_id": "wf-purchase_request-1003965431117-4120",
  "node_7_augmented_prompt": {
    "outlet": "BLANCO • Court • Pacific Place",
    "requester": "Sayuti",
    "matched_skus": [
      {
        "sku": "RAW-VEG-04",
        "name": "Bawang Putih Kating",
        "category": "VEGETABLE",
        "standard_uom": "kg",
        "similarity": 0.912
      },
      {
        "sku": "RAW-MEAT-02",
        "name": "Beef Shank / Sengkel Sapi",
        "category": "MEAT",
        "standard_uom": "kg",
        "similarity": 0.895
      },
      {
        "sku": "RAW-SAUCE-01",
        "name": "Kecap Asin Cap Hati Angsa",
        "category": "SAUCE",
        "standard_uom": "jerigen",
        "similarity": 0.841
      }
    ],
    "formatted_prompt": "[INSTRUCTION: Ekstrak draf pesanan berikut ke format JSON...]"
  },
  "temporal_payload": {
    "workflow_name": "PurchaseRequestWorkflow",
    "workflow_id": "wf-purchase_request-1003965431117-4120",
    "task_queue": "KERJACERDAS_TASK_QUEUE",
    "input": {
      "document_id": "msg-telegram-991201",
      "text": "Sayuti Kitchen Blanco: tolong order bwg putih kating 3kg, daging sengkel 15 kg, kecap asin 2 jerigen buat besok pagi ya dennis",
      "source": "telegram",
      "intent": "PURCHASE_REQUEST",
      "confidence": 0.8842,
      "metadata": {
        "chat_id": -1003965431117,
        "message_id": 4120,
        "sender": "Sayuti",
        "branch": "BLANCO • Court • Pacific Place",
        "tenant_id": "TEN-AKM"
      },
      "node_7_augmented_prompt": { ... }
    }
  }
}
```

#### Response Payload (Contoh Noise Operasional / 95% Percakapan)
Jika staf mengirim: `"pagi all, tolong teknisi ac segera datang ke lt 4 ya pendingin mati"`

```json
{
  "status": "ignored",
  "action": "IGNORE_NOISE",
  "intent": "FACILITY_MAINTENANCE",
  "confidence": 0.8412,
  "is_actionable": false,
  "reason": "Pesan teridentifikasi sebagai noise operasional, fasilitas, atau obrolan umum (Non-Actionable).",
  "documents_indexed": 0,
  "target_workflow": null,
  "temporal_payload": null
}
```

---

### 2.2 `POST /detect-intent` (Dynamic Semantic Intent Classifier)

* **Fungsi API**:  
  Menganalisis teks menggunakan representasi vektor padat BAAI/BGE-M3 (1024-dimensi) terhadap koleksi `kerjacerdas_intents` di Qdrant. Dilengkapi dengan **Domain Disambiguation Guardrails** (membedakan order barang vs komplain selisih) dan **HR Chatter Guardrail** (mencegah pesan izin sakit/absensi disalahartikan sebagai stok opname).
* **Untuk Apa Responnya**:  
  Digunakan untuk audit klasifikasi, pengujian akurasi kamus frase jangkar, atau pengecekan intensi mandiri sebelum teks diproses lebih lanjut.

#### Request Payload
* **Endpoint**: `http://127.0.0.1:8000/detect-intent`
* **Method**: `POST`
* **Content-Type**: `application/json`

```json
{
  "text": "order daging wagyu ribeye mb5 10 pack",
  "threshold": 0.78
}
```

#### Response Payload
* **HTTP Status**: `200 OK`

```json
{
  "query": "order daging wagyu ribeye mb5 10 pack",
  "detected_intent": "PURCHASE_REQUEST",
  "confidence": 0.8754,
  "threshold": 0.78,
  "is_actionable": true,
  "target_workflow": "PurchaseRequestWorkflow",
  "action": "TRIGGER_WORKFLOW",
  "reason": "Transaksi pengadaan/operasional valid teridentifikasi. Siap memicu Temporal Workflow.",
  "matched_phrase": "order bahan baku kitchen dapur",
  "candidates": [
    {
      "intent": "PURCHASE_REQUEST",
      "score": 0.8754,
      "is_actionable": true,
      "target_workflow": "PurchaseRequestWorkflow",
      "sample_anchor": "order bahan baku kitchen dapur"
    },
    {
      "intent": "STOCK_OPNAME_SUBMIT",
      "score": 0.6921,
      "is_actionable": true,
      "target_workflow": null,
      "sample_anchor": "stok opname mingguan"
    },
    {
      "intent": "CASUAL_CHATTER",
      "score": 0.5810,
      "is_actionable": false,
      "target_workflow": null,
      "sample_anchor": "selamat pagi teman teman"
    }
  ]
}
```

---

### 2.3 `POST /build-augmented-prompt` (Node 7 Context Fusion Engine)

* **Fungsi API**:  
  Mengintegrasikan prinsip **Zero Hardcode** dengan menggabungkan input pengguna asli (*Ground Truth*), nama cabang deterministik, pemohon, hasil pencarian kemiripan Master SKU dari database relasional, 10 Aturan Kontrol D08, kamus istilah slang F&B pasar, dan skema JSON keluaran.
* **Untuk Apa Responnya**:  
  Menghasilkan *system prompt* dan *user prompt* yang siap disuapkan ke LLM lokal (Node 8: Qwen 3.8 27B / 9B) untuk menghasilkan draf pesanan yang 100% akurat dan mencegah *Candidate Dumping* (*Ground Rule #7*: AI dilarang menambah barang yang tidak diminta).

#### Request Payload
* **Endpoint**: `http://127.0.0.1:8000/build-augmented-prompt`
* **Method**: `POST`
* **Content-Type**: `application/json`

```json
{
  "text": "order susu uht diamond 5 karton sama sirup vanila 2 botol",
  "outlet": "DLKL • Cafe • Lebak Bulus",
  "requester": "Yovan (HeadBar)",
  "intent": "PURCHASE_REQUEST",
  "tenant_id": "TEN-AKM"
}
```

#### Response Payload
* **HTTP Status**: `200 OK`

```json
{
  "status": "success",
  "outlet": "DLKL • Cafe • Lebak Bulus",
  "requester": "Yovan (HeadBar)",
  "intent": "PURCHASE_REQUEST",
  "matched_items_count": 2,
  "matched_items": [
    {
      "sku": "RAW-MILK-02",
      "name": "Diamond UHT Milk Full Cream 1L",
      "uom": "karton",
      "price_per_unit": 215000,
      "supplier_default": "PT Sukanda Djaya"
    },
    {
      "sku": "RAW-SYR-03",
      "name": "Monin Syrup Vanilla 700ml",
      "uom": "botol",
      "price_per_unit": 145000,
      "supplier_default": "CV Toffin Indonesia"
    }
  ],
  "prompt_system": "Anda adalah AI Procurement Engine untuk PT AKM Group. Ekstrak teks pengguna menjadi JSON sesuai skema po_draft_schema.json...",
  "prompt_user": "=== GROUND TRUTH ORDER DARI PENGGUNA ===\norder susu uht diamond 5 karton sama sirup vanila 2 botol\n\n=== METADATA GERAI & PEMOHON ===\nGerai: DLKL • Cafe • Lebak Bulus\nPemohon: Yovan (HeadBar)\n\n=== REKOMENDASI MASTER DATA SKU ===\n1. [RAW-MILK-02] Diamond UHT Milk Full Cream 1L (UOM: karton)\n2. [RAW-SYR-03] Monin Syrup Vanilla 700ml (UOM: botol)\n\n=== ATURAN KONTROL D08 ===\n- Toleransi kuantiti 0%\n- Dilarang menambahkan item selain yang diminta (Ground Rule #7)\n..."
}
```

---

### 2.4 `POST /retrieve` (Semantic Vector Retrieval ke Qdrant)

* **Fungsi API**:  
  Melakukan pencarian tetangga terdekat (*k-Nearest Neighbors*) pada koleksi dokumen vektor `kerjacerdas_documents` menggunakan Cosine Similarity.
* **Untuk Apa Responnya**:  
  Digunakan oleh sistem pencocokan barang, pencarian SOP, atau validasi dokumen riwayat sebelumnya.

#### Request Payload
* **Endpoint**: `http://127.0.0.1:8000/retrieve`
* **Method**: `POST`
* **Content-Type**: `application/json`

```json
{
  "query": "daging sengkel soup based blanco",
  "top_k": 3
}
```

#### Response Payload
* **HTTP Status**: `200 OK`

```json
{
  "query": "daging sengkel soup based blanco",
  "total_results": 3,
  "results": [
    {
      "id": "SKU-BLANCO-BEEF-SHANK",
      "score": 0.8924,
      "content": "Beef Shank Sapi Impor Segar untuk Soup Based Blanco Court Beef Noodle",
      "metadata": {
        "sku": "RAW-MEAT-02",
        "category": "MEAT",
        "standard_uom": "kg",
        "branch": "Blanco Court Beef Noodle - Pacific Place"
      }
    },
    {
      "id": "SKU-BLANCO-BEEF-TENDON",
      "score": 0.8142,
      "content": "Beef Tendon / Urat Sapi Segar Rebusan Kuah Kaldu Herbal",
      "metadata": {
        "sku": "RAW-MEAT-05",
        "category": "MEAT",
        "standard_uom": "kg"
      }
    },
    {
      "id": "DOC-RECIPE-SOUP-BASED-01",
      "score": 0.7781,
      "content": "Formula Resep Dasar Kitchen Soup Based Blanco Court Beef Noodle",
      "metadata": {
        "doc_type": "BOM_RECIPE",
        "version": "2026.08"
      }
    }
  ]
}
```

---

### 2.5 `POST /index` (Ingesti Dokumen & Vektorisasi Batch)

* **Fungsi API**:  
  Mengonversi array dokumen teks menjadi embedding BGE-M3 (1024-dimensi) dan menyimpannya ke koleksi Qdrant `kerjacerdas_documents`.
* **Untuk Apa Responnya**:  
  Mengonfirmasi jumlah dokumen yang berhasil di-upsert dan ID yang dialokasikan.

#### Request Payload
* **Endpoint**: `http://127.0.0.1:8000/index`
* **Method**: `POST`

```json
{
  "documents": [
    {
      "id": "SKU-RAW-TEA-01",
      "content": "Teh Hitam Earl Grey Premium DLKL Coffee UOM Tin 250gr",
      "source": "master_catalog",
      "metadata": {
        "tenant_id": "TEN-AKM",
        "sku": "RAW-TEA-01",
        "category": "BEVERAGE_RAW"
      }
    }
  ]
}
```

#### Response Payload
```json
{
  "status": "ok",
  "indexed_count": 1,
  "collection": "kerjacerdas_documents"
}
```

---

### 2.6 Manajemen Intensi Dinamis (`GET`, `POST`, `DELETE /intents`)

* **`GET /intents`**: Mengambil seluruh daftar intensi yang aktif beserta contoh kalimat jangkar.
* **`POST /intents`**: Mendaftarkan intensi baru atau menambah frase jangkar tanpa perlu me-restart server.
* **`DELETE /intents/{intent_name}`**: Menghapus intensi dari indeks Qdrant.

#### Contoh Request `POST /intents`
```json
{
  "intents": [
    {
      "intent": "WASTE_REPORT",
      "description": "Laporan bahan baku rusak atau terbuang di gerai",
      "is_actionable": true,
      "target_workflow": "ExceptionWorkflow",
      "phrases": [
        "lapor bahan basi dibuang",
        "catat waste kitchen hari ini",
        "susu basi terpaksa dibuang 2 liter"
      ]
    }
  ]
}
```

---

## 3. Layer 2: Kontrak Temporal Workflow Engine (Port 7233)

Temporal Server (`kerjacerdas-temporal`) bertindak sebagai pengendali *state machine* bisnis jangka panjang (*stateful long-running workflows*). Klien (seperti `telegram_gateway.py` atau `server.py`) memicu workflow menggunakan antarmuka gRPC port **7233**.

Berikut adalah kontrak struktur payload data yang dieksekusi oleh Activity di dalam Temporal:

---

### 3.1 Kontrak Eksekusi `PurchaseRequestWorkflow`

* **Workflow Name**: `PurchaseRequestWorkflow`
* **Task Queue**: `KERJACERDAS_TASK_QUEUE`
* **Tahapan Orkestrasi**:
  1. `invoke_llm_activity`: Memanggil LLM lokal (port 8081) dengan batas waktu HTTP 600 detik dan timeout Temporal 660 detik.
  2. `validate_d08_rules_activity`: Memvalidasi kepatuhan 10 Aturan Kontrol D08 (batas persetujuan Pak Densu Rp 500rb, Segregation of Duties / anti self-approval).
  3. `commit_purchase_request_activity`: Menulis draf PR dan item ke tabel `purchase_requests` dan `purchase_request_items` di PostgreSQL secara atomik.

#### Payload Input Workflow
```json
{
  "document_id": "msg-telegram-991201",
  "text": "Sayuti Kitchen Blanco: tolong order bwg putih kating 3kg, daging sengkel 15 kg",
  "source": "telegram",
  "intent": "PURCHASE_REQUEST",
  "confidence": 0.8842,
  "metadata": {
    "chat_id": -1003965431117,
    "message_id": 4120,
    "sender": "Sayuti",
    "branch": "BLANCO • Court • Pacific Place",
    "tenant_id": "TEN-AKM"
  },
  "node_7_augmented_prompt": { ... }
}
```

#### Hasil Kembalian Workflow (`run()` Return Value)
```json
{
  "status": "COMPLETED",
  "workflow_name": "PurchaseRequestWorkflow",
  "purchase_request_id": "PR-BLANCO_PP-20261023-0001",
  "outlet_id": "blanco_pp",
  "items_count": 2,
  "total_estimated_amount": 1845000,
  "approval_state": "PENDING_APPROVAL",
  "d08_compliance": {
    "passed": true,
    "requires_director_approval": true,
    "reason": "Total nilai pesanan (Rp 1.845.000) melebihi batas batas wewenang cabang (Rp 500.000)."
  },
  "summary": "2 item berhasil dirangkum dalam draf PR-BLANCO_PP-20261023-0001."
}
```

---

### 3.2 Kontrak Eksekusi `ReceivingWorkflow` (3-Way Line Matching)

* **Workflow Name**: `ReceivingWorkflow`
* **Tahapan Orkestrasi**:
  1. Menerima bukti gambar DO / Nota Pasar.
  2. Menjalankan Vision-OCR lokal (`extract_receipt_ocr.py`).
  3. Memanggil `execute_receiving_matching_activity` untuk mencocokkan baris barang fisik terhadap Purchase Order aktif (`ISSUED`).
  4. Cabang A (Cocok 100%): Menerbitkan Goods Receipt `CONFIRMED`, ubah PO ke `RECEIVED`, dan posting mutasi stok.
  5. Cabang B (Ada Selisih): Menerbitkan Goods Receipt `DISCREPANT`, ubah PO ke `PARTIALLY_RECEIVED`, buka tiket selisih otomatis, dan aktifkan **Payment Hold Trigger** pada vendor.

#### Payload Input Workflow
```json
{
  "document_id": "doc-photo-do-8821",
  "full_image_path": "/home/whn-01/work/spesimen/Invoice Supplier IMG-20260807-WA0055 - Dennis Kristianus (1).jpg",
  "po_id": "PO-BLANCO_PP-20261022-0004",
  "outlet_id": "blanco_pp",
  "tenant_id": "TEN-AKM",
  "received_by": "Sayuti"
}
```

#### Hasil Kembalian Workflow
```json
{
  "success": true,
  "gr_id": "GR-BLANCO_PP-20261023-0002",
  "po_id": "PO-BLANCO_PP-20261022-0004",
  "surat_jalan_no": "202607-08",
  "status": "CONFIRMED",
  "has_discrepancy": false,
  "items_count": 15,
  "match_rate": 1.0,
  "payment_hold": false,
  "telegram_message": "✅ *PENERIMAAN BARANG LENGKAP*\nNo GR: `GR-BLANCO_PP-20261023-0002`\nPO Rujukan: `PO-BLANCO_PP-20261022-0004`\nVendor: ADELITA MANDIRI SEJATI\n15 item diterima 100% sesuai order."
}
```

---

## 4. Layer 3: Inferensi LLM Lokal OpenAI-Compatible (Port 8081, 8092, 8090)

Server `llama-server` menyediakan antarmuka standar OpenAI `/v1/chat/completions` yang berjalan di beberapa porta sesuai hirarki beban (*Tiering*):
* **Port 8081**: Tier 2/3 Deep Reasoning & Analytics (`Qwen 3.5 9B` / `Qwen 3.8 27B`).
* **Port 8092**: Tier 1 Fast Operational (`Ministral 3B` / `Qwen 3.5 4B`).
* **Port 8090**: Tier 0 Public / Telegram Lightweight (`Qwen 2.5 1.5B`).

---

### 4.1 `POST /v1/chat/completions` (JSON Structured Extraction)

* **Fungsi API**:  
  Mengekstrak entitas barang F&B dari prompt terstruktur menjadi format JSON murni.
* **Untuk Apa Responnya**:  
  Respon berupa teks string JSON yang di-parse oleh Temporal Activity menjadi kamus objek Python untuk divalidasi ke katalog SKU dan aturan D08.

#### Request Payload
* **Endpoint**: `http://127.0.0.1:8081/v1/chat/completions`
* **Method**: `POST`
* **Content-Type**: `application/json`

```json
{
  "model": "qwen-27b",
  "temperature": 0.1,
  "max_tokens": 1024,
  "response_format": { "type": "json_object" },
  "messages": [
    {
      "role": "system",
      "content": "Anda adalah parser pesanan pengadaan F&B. Kembalikan HANYA format JSON valid tanpa penjelasan markdown."
    },
    {
      "role": "user",
      "content": "Ekstrak pesanan: tolong pesan wortel import 4kg dan lobak 4kg ke supplier Adelita"
    }
  ]
}
```

#### Response Payload
* **HTTP Status**: `200 OK`

```json
{
  "id": "chatcmpl-qwen-local-01",
  "object": "chat.completion",
  "created": 1729654900,
  "model": "qwen-27b",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "{\"supplier\": \"ADELITA MANDIRI SEJATI\", \"items\": [{\"name\": \"WORTEL IMPORT\", \"qty\": 4.0, \"uom\": \"kg\"}, {\"name\": \"LOBAK\", \"qty\": 4.0, \"uom\": \"kg\"}]}"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 78,
    "completion_tokens": 46,
    "total_tokens": 124
  }
}
```

---

## 5. Layer 4: AI Copilot & Assistant API (Web Control Tower - Port 3000)

Layanan ini di-host oleh `frontend-web/server.py` dan menjadi asisten percakapan cerdas yang dapat membaca basis data real-time tenant secara aman berkat proteksi **PostgreSQL Row-Level Security (RLS)**.

---

### 5.1 `POST /api/assistant/tenant-chat` (Copilot Private Chat Box)

* **Fungsi API**:  
  Menjawab pertanyaan analitis dan operasional staf atau manajer tenant (status PR, PO terbuka, selisih GR, saldo stok bahan, tren penjualan kasir Moka POS, biaya OPEX, estimasi margin P&L, resep BOM).
* **Untuk Apa Responnya**:  
  Menampilkan balasan percakapan asisten pada antarmuka *AI Copilot Drawer* di sudut kanan bawah portal web, lengkap dengan tombol aksi cepat (*quick action recommendations*).

#### Request Payload
* **Endpoint**: `http://127.0.0.1:3000/api/assistant/tenant-chat`
* **Method**: `POST`
* **Headers**:
  * `Content-Type`: `application/json`
  * `Cookie`: `session_id=<token_sesi_login_pengguna>`

```json
{
  "message": "Bagaimana status Purchase Order yang masih terbuka dan apakah ada barang yang tertahan pembayarannya?",
  "history": [
    {
      "role": "user",
      "content": "Halo, selamat pagi"
    },
    {
      "role": "assistant",
      "content": "Halo! Ada yang bisa saya bantu terkait operasional Blanco Court Beef Noodle hari ini?"
    }
  ]
}
```

#### Response Payload
* **HTTP Status**: `200 OK`

```json
{
  "ok": true,
  "tenant_id": "TEN-AKM",
  "tenant_name": "PT AKM Group",
  "reply": "Saat ini terdapat **3 Purchase Order aktif** senilai total Rp 4.250.000.\n\nDari total penerimaan barang (GR), terdeteksi **1 dokumen berstatus DISCREPANT** (kurang kirim 2 kg daging sengkel pada PO-BLANCO_PP-20261022-0004), sehingga sistem telah mengaktifkan **Payment Hold** senilai Rp 320.000 sampai klaim selisih diselesaikan oleh vendor Adelita.",
  "model_used": "Qwen 3.5 9B (Tier 2 Deep Reasoning)",
  "is_deep_reasoning": true,
  "mode": "deep_reasoning",
  "quick_actions": [
    {
      "label": "📋 Cek PR Terkini",
      "query": "Bagaimana status Purchase Request (PR) terbaru kami?"
    },
    {
      "label": "🚚 Cek Penerimaan GR",
      "query": "Apakah ada barang yang baru diterima atau ada selisih di GR?"
    },
    {
      "label": "📊 Cek Saldo Stok",
      "query": "Bagaimana kondisi saldo stok bahan kami saat ini?"
    }
  ]
}
```

---

### 5.2 `POST /assistant/public` (Public AI Knowledge Assistant - Port 8100)

* **Fungsi API**:  
  Asisten interaktif publik yang hanya memiliki akses ke dokumen panduan dan pengetahuan publik sistem Kerja Cerdas (bebas dari data rahasia tenant).
* **Untuk Apa Responnya**:  
  Menjawab pertanyaan calon klien atau pengunjung portal mengenai fitur produk, SOP umum, dan panduan penggunaan sistem.

#### Request Payload
* **Endpoint**: `http://127.0.0.1:8100/assistant/public`
* **Method**: `POST`

```json
{
  "message": "Bagaimana cara kerja penerimaan barang jika suplier mengirim barang secara bertahap?",
  "conversation_id": "conv-public-4412",
  "stream": false
}
```

#### Response Payload
```json
{
  "ok": true,
  "conversation_id": "conv-public-4412",
  "reply": "Pada sistem Kerja Cerdas, staf gerai cukup me-reply chat notifikasi PO atau konfirmasi GR sebelumnya di grup Telegram dengan melampirkan foto surat jalan pengiriman bertahap tersebut. Sistem akan otomatis mencatat penerimaan parsial, menghitung sisa barang yang belum tiba, dan memperbarui status PO menjadi PARTIAL tanpa menganggapnya sebagai barang cacat."
}
```

---

## 6. Ringkasan Matriks Endpoint API AI Orchestration

| Layanan / Modul | Porta | Endpoint | Metode | Fungsi Utama |
| :--- | :--- | :--- | :--- | :--- |
| **RAG Gatekeeper** | `8000` | `/process-input` | `POST` | Pre-storage gatekeeper, filter noise 95%, Qdrant index, kontrak Temporal. |
| **RAG Gatekeeper** | `8000` | `/detect-intent` | `POST` | Klasifikasi semantik BGE-M3 (1024-dim), guardrail HR chatter & order. |
| **RAG Gatekeeper** | `8000` | `/build-augmented-prompt` | `POST` | Context fusion: SKU match + Aturan D08 + Kamus Slang + JSON Schema. |
| **RAG Gatekeeper** | `8000` | `/retrieve` | `POST` | Pencarian vektor k-NN pada koleksi `kerjacerdas_documents`. |
| **RAG Gatekeeper** | `8000` | `/index` | `POST` | Vektorisasi batch dan penyimpanan dokumen ke Qdrant. |
| **RAG Gatekeeper** | `8000` | `/intents` | `GET/POST` | Melihat dan memperbarui taksonomi intensi dinamis. |
| **RAG Gatekeeper** | `8000` | `/health` | `GET` | Healthcheck konektivitas PostgreSQL, Qdrant, dan FastEmbed. |
| **Temporal Engine** | `7233` | `PurchaseRequestWorkflow` | `gRPC` | State machine pembuatan PR, validasi D08, persistensi PostgreSQL. |
| **Temporal Engine** | `7233` | `ReceivingWorkflow` | `gRPC` | 3-Way matching DO fisik vs PO aktif, penerbitan GR, payment hold. |
| **Local LLM Engine**| `8081` | `/v1/chat/completions` | `POST` | Inferensi LLM lokal OpenAI-compatible Qwen 9B/27B. |
| **Control Tower** | `3000` | `/api/assistant/tenant-chat`| `POST` | AI Private Copilot analitis & operasional tenant berbasis RLS. |
| **Public AI** | `8100` | `/assistant/public` | `POST` | Asisten publik terisolasi untuk panduan penggunaan platform. |

---

*Dokumen ini disusun untuk melengkapi seluruh artefak teknis dan pengujian integrasi sistem Kerja Cerdas pada PT AKM Group.*
