# 🧠 AI-Shared-Orchestration (Clean Architecture Edition)
**Ekosistem Anak-Pintar — Shared AI Core untuk Platform Hadirin & LISA**

Infrastruktur orkestrasi kecerdasan buatan bersama (*Shared Multi-Domain AI Orchestration*) yang mengimplementasikan **Clean Architecture** dan **Domain-Driven Design (DDD)**. Memisahkan penyaringan deterministik (*Layer 1: RAG & Intent Gatekeeper*), *state machine* bisnis (*Layer 2: Temporal Workflows*), dan *LLM Adapter* (*Layer 3: Mock Simulator / Ollama Qwen 2.5*).

---

## 🚀 Daftar Layanan & Port Infrastruktur (Fase 1)

| Service | Container Name | Port Host | Fungsi & URL Akses |
| :--- | :--- | :--- | :--- |
| **Qdrant Vector DB** | `anakpintar-qdrant` | `6333` (HTTP)<br/>`6334` (gRPC) | Penyimpanan vektor intensi & SOP (`http://localhost:6333/dashboard`) |
| **Temporal Server** | `anakpintar-temporal` | `7233` (gRPC) | Engine *stateful workflow* (`LeaveRequestWorkflow`, `OvertimeWorkflow`) |
| **Temporal Web UI** | `anakpintar-temporal-ui` | `8088` (HTTP) | Dashboard pemantauan eksekusi workflow (`http://localhost:8088`) |
| **Temporal Postgres** | `anakpintar-temporal-db` | `5433` (TCP) | Penyimpanan internal persistensi state Temporal (`postgres:16-alpine`) |
| **RAG Gatekeeper API** | *(Fase 2 - FastAPI)* | `8000` (HTTP) | Endpoint `/api/v1/gatekeeper/process-input` & `/detect-intent` |

---

## 🛠️ Perintah Operasional Docker

```bash
# 1. Menjalankan seluruh container infrastruktur di background
cd "AI-shared-orchestration"
docker compose up -d

# 2. Memeriksa status kesehatan container
docker compose ps

# 3. Memeriksa log Temporal atau Qdrant
docker compose logs -f qdrant
docker compose logs -f temporal
```

---

## 📂 Struktur Direktori Clean Architecture

```text
AI-shared-orchestration/
├── docker-compose.yml
├── .env.example
├── README.md
├── rag-gatekeeper/          # Layer 1: FastAPI Gatekeeper (Port 8000)
│   └── app/
│       ├── schemas/         # Pydantic DTOs (Request/Response Contracts)
│       ├── adapters/        # Qdrant, FastEmbed BGE-M3, LLM Provider (Mock/Ollama)
│       ├── domains/         # Pure Domain Logic (hadirin/ & lisa/)
│       └── api/v1/          # Delivery Endpoints
├── temporal-workflows/      # Layer 2: Temporal Workflows & Atomic Activities
│   ├── workflows/           # hadirin/ & lisa/
│   └── activities/          # hadirin/, common/
├── knowledge-base/          # Anchor Phrases & Company Policies JSON
│   ├── hadirin/
│   └── lisa/
└── scripts/                 # Seeding & Automated Pipeline Verification
```

