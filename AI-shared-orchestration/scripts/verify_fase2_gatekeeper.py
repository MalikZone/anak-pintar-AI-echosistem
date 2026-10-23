"""Automated Verification Script for Fase 2: Clean RAG Gatekeeper Service (Port 8000)."""

import asyncio
import json
import sys
from pathlib import Path

GATEKEEPER_ROOT = Path(__file__).resolve().parents[1] / "rag-gatekeeper"
sys.path.insert(0, str(GATEKEEPER_ROOT))

import httpx
from app.adapters.vectorstore.qdrant_adapter import get_qdrant_adapter
from app.config import get_settings
from app.main import app


async def run_verification() -> None:
    settings = get_settings()
    qdrant = get_qdrant_adapter()

    # Ensure collections in live Qdrant (:6333)
    if qdrant.is_healthy():
        qdrant.ensure_collection(settings.QDRANT_COLLECTION_HADIRIN_INTENTS)
        qdrant.ensure_collection(settings.QDRANT_COLLECTION_HADIRIN_DOCS)
        qdrant.ensure_collection(settings.QDRANT_COLLECTION_LISA_INTENTS)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://localhost:8000") as client:
        # 1. Health Check
        r_health = await client.get("/api/v1/health")
        assert r_health.status_code == 200, f"Health failed: {r_health.text}"
        health_data = r_health.json()
        print("1. GET /api/v1/health ->", json.dumps(health_data, ensure_ascii=False))

        # 2. Detect Intent (<50ms target)
        r_intent = await client.post(
            "/api/v1/gatekeeper/detect-intent",
            json={
                "text": "Pak Bambang, saya mau izin cuti tahunan tanggal 24 dan 25 Oktober besok ada acara nikahan adik di Jogja",
                "threshold": 0.78,
            },
        )
        assert r_intent.status_code == 200
        intent_data = r_intent.json()
        print(
            f"2. POST /api/v1/gatekeeper/detect-intent -> intent={intent_data['detected_intent']}, "
            f"confidence={intent_data['confidence']}, latency={intent_data['latency_ms']}ms (<50ms)"
        )
        assert intent_data["detected_intent"] == "ANNUAL_LEAVE_REQUEST"
        assert intent_data["latency_ms"] < 50.0

        # 3. Noise Filtering (Facility chatter -> ignored)
        r_noise = await client.post(
            "/api/v1/gatekeeper/process-input",
            json={
                "id": "msg-telegram-noise-01",
                "text": "pagi all, dispenser air galon di pantry lantai 2 habis ya",
                "source": "telegram",
                "threshold": 0.78,
            },
        )
        assert r_noise.status_code == 200
        noise_data = r_noise.json()
        print(
            f"3. POST /api/v1/gatekeeper/process-input (Noise) -> status={noise_data['status']}, "
            f"action={noise_data['action']}, intent={noise_data['intent']}, latency={noise_data['latency_ms']}ms"
        )
        assert noise_data["status"] == "ignored"
        assert noise_data["is_actionable"] is False

        # 4. Actionable Leave Request with telegram_id metadata -> processed_and_queued
        r_leave = await client.post(
            "/api/v1/gatekeeper/process-input",
            json={
                "id": "msg-telegram-99201",
                "text": "Pak Bambang, saya mau izin cuti tahunan tanggal 24 dan 25 Oktober besok ada acara nikahan adik di Jogja",
                "source": "telegram",
                "metadata": {
                    "telegram_id": "58821901",
                    "user_id": "usr-doni-01",
                    "sender_name": "Doni Pradana",
                    "tenant_id": "TNT-NEGAPI-876499",
                    "department": "IT Support",
                    "role": "EMPLOYEE",
                    "remaining_leave_quota": 8,
                },
                "threshold": 0.78,
            },
        )
        assert r_leave.status_code == 200
        leave_data = r_leave.json()
        print(
            f"4. POST /api/v1/gatekeeper/process-input (Leave) -> status={leave_data['status']}, "
            f"workflow={leave_data['target_workflow']}, workflow_id={leave_data['workflow_id']}, "
            f"latency={leave_data['latency_ms']}ms"
        )
        assert leave_data["status"] == "processed_and_queued"
        assert leave_data["target_workflow"] == "LeaveRequestWorkflow"
        assert leave_data["node_7_augmented_prompt"]["telegram_id"] == "58821901"

        # 5. Build Augmented Prompt
        r_prompt = await client.post(
            "/api/v1/prompts/build-augmented-prompt",
            json={
                "text": "Izin sakit demam tinggi hari ini pak, sedang ke klinik dokter",
                "intent": "SICK_LEAVE_REPORT",
                "metadata": {
                    "telegram_id": "58821901",
                    "user_id": "usr-doni-01",
                    "sender_name": "Doni Pradana",
                    "tenant_id": "TNT-NEGAPI-876499",
                    "department": "IT Support",
                    "remaining_leave_quota": 8,
                },
            },
        )
        assert r_prompt.status_code == 200
        prompt_data = r_prompt.json()
        print(
            f"5. POST /api/v1/prompts/build-augmented-prompt -> status={prompt_data['status']}, "
            f"leave_type={prompt_data['extracted_draft']['leave_type']}"
        )
        assert prompt_data["status"] == "success"


if __name__ == "__main__":
    asyncio.run(run_verification())

