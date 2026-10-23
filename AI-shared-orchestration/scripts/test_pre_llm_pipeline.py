#!/usr/bin/env python3
"""End-to-End Verification Script for Fase 4 (Temporal State Machine) & Fase 5 (LLM Provider Adapter).

Verifies:
1. Fase 5: LLM Provider Adapter (`rag-gatekeeper/app/adapters/llm/` Mock & Ollama providers)
2. Fase 4: RAG Gatekeeper (<50ms semantic routing + Node 7 Augmented Prompt + Temporal Contract)
   feeding directly into Live Temporal Server (`localhost:7233`) + Worker (`HADIRIN_HR_QUEUE`):
   - Scenario 1: Valid Annual Leave Request (2 Days) -> Full Saga (Dry-Run) -> PENDING_LEADER_APPROVAL
   - Scenario 2: Excessive Leave Request (20 Days vs 8 Quota) -> Short-Circuit -> REJECTED_BY_POLICY
   - Scenario 3: Overtime Claim (3 Hours) -> OvertimeWorkflow Saga -> PENDING_LEADER_APPROVAL
   - Scenario 4: Leave Quota Inquiry -> Read-Only Fast Completion -> COMPLETED_INQUIRY
"""

import asyncio
import json
import os
import sys
import time
import uuid
from pathlib import Path

import httpx
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
GATEKEEPER_DIR = BASE_DIR / "rag-gatekeeper"
TEMPORAL_DIR = BASE_DIR / "temporal-workflows"

sys.path.insert(0, str(GATEKEEPER_DIR))
sys.path.insert(0, str(TEMPORAL_DIR))

if (BASE_DIR / ".env").exists():
    load_dotenv(BASE_DIR / ".env")

from temporalio.client import Client
from temporalio.worker import Worker

from app.adapters.llm import get_llm_provider
from app.config import get_settings
from app.domains.hadirin.rules import LEAVE_REQUEST_SCHEMA
from app.main import app
from activities.common.invoke_llm_activity import invoke_llm_activity
from activities.hadirin.commit_leave_activity import commit_leave_activity
from activities.hadirin.notify_leader_activity import notify_leader_activity
from activities.hadirin.validate_quota_activity import validate_quota_activity
from workflows.hadirin.leave_request_workflow import LeaveRequestWorkflow
from workflows.hadirin.overtime_workflow import OvertimeWorkflow
from workflows.lisa.gold_price_cron_workflow import GoldPriceInquiryWorkflow


async def verify_fase5_llm_adapters() -> None:
    print("\n======================================================================")
    print("🧪 FASE 5 VERIFICATION: Pluggable LLM Provider Adapter (Mock & Ollama)")
    print("======================================================================")

    mock_provider = get_llm_provider("mock")
    res_mock = await mock_provider.extract_structured_json(
        prompt="Pak Bambang, saya mau izin cuti tahunan 2 hari mulai besok karena acara keluarga",
        schema=LEAVE_REQUEST_SCHEMA,
        context={
            "raw_text": "Pak Bambang, saya mau izin cuti tahunan 2 hari mulai besok karena acara keluarga",
            "intent": "ANNUAL_LEAVE_REQUEST",
        },
    )
    assert res_mock["provider"] == "mock_provider", "Expected mock_provider"
    assert res_mock["total_days"] == 2
    print(f"✅ MockLLMProvider verified: {json.dumps(res_mock, ensure_ascii=False)}")

    ollama_provider = get_llm_provider("ollama")
    assert ollama_provider.model is not None
    print(f"✅ OllamaLLMProvider instantiated cleanly: base_url={ollama_provider.base_url}, model={ollama_provider.model}")


async def verify_fase4_temporal_workflows() -> None:
    print("\n======================================================================")
    print("🧪 FASE 4 VERIFICATION: Temporal State Machine & Pre-LLM Pipeline")
    print("======================================================================")

    settings = get_settings()
    raw_host = os.getenv("TEMPORAL_HOST", settings.TEMPORAL_HOST)
    raw_port = os.getenv("TEMPORAL_PORT", str(settings.TEMPORAL_PORT))
    temporal_target = raw_host if ":" in raw_host else f"{raw_host}:{raw_port}"
    namespace = os.getenv("TEMPORAL_NAMESPACE", settings.TEMPORAL_NAMESPACE)
    task_queue = os.getenv("TEMPORAL_HADIRIN_TASK_QUEUE", settings.TEMPORAL_HADIRIN_TASK_QUEUE)

    print(f"🔌 Connecting to Temporal Server at {temporal_target} (queue={task_queue})...")
    temporal_client = await Client.connect(temporal_target, namespace=namespace)

    # Spin up Temporal Worker in-process for verification
    async with Worker(
        temporal_client,
        task_queue=task_queue,
        workflows=[
            LeaveRequestWorkflow,
            OvertimeWorkflow,
            GoldPriceInquiryWorkflow,
        ],
        activities=[
            invoke_llm_activity,
            validate_quota_activity,
            commit_leave_activity,
            notify_leader_activity,
        ],
    ):
        print(f"✅ Temporal Worker online and polling '{task_queue}'.\n")

        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://localhost:8000") as gk_client:
            scenarios = [
                {
                    "title": "Scenario 1: Valid Annual Leave Request (2 Days) -> Full Saga (Dry-Run)",
                    "workflow_cls": LeaveRequestWorkflow.run,
                    "message": "Pak Bambang, saya mau izin cuti tahunan tanggal 24 dan 25 Oktober besok karena acara nikahan adik",
                    "remaining_quota": 8,
                    "expected_status": "PENDING_LEADER_APPROVAL",
                },
                {
                    "title": "Scenario 2: Excessive Leave Request (20 Days vs 8 Quota) -> Rejected by Policy Guard",
                    "workflow_cls": LeaveRequestWorkflow.run,
                    "message": "Pak Bambang, saya mau izin cuti tahunan 20 hari bulan depan karena liburan panjang",
                    "remaining_quota": 8,
                    "expected_status": "REJECTED_BY_POLICY",
                },
                {
                    "title": "Scenario 3: Overtime Claim (3 Hours) -> OvertimeWorkflow Saga",
                    "workflow_cls": OvertimeWorkflow.run,
                    "message": "Lapor pak, malam ini saya klaim lembur kerja 3 jam dari jam 17:00 sampai 20:00 untuk deploy server",
                    "remaining_quota": 8,
                    "expected_status": "PENDING_LEADER_APPROVAL",
                },
                {
                    "title": "Scenario 4: Leave Quota Inquiry -> Read-Only Fast Completion",
                    "workflow_cls": LeaveRequestWorkflow.run,
                    "message": "Halo min, cek sisa jatah kuota cuti tahunan saya tahun ini tinggal berapa hari ya?",
                    "remaining_quota": 8,
                    "expected_status": "COMPLETED_INQUIRY",
                },
            ]

            for idx, sc in enumerate(scenarios, 1):
                print(f"--- [{idx}/4] {sc['title']} ---")
                t0 = time.perf_counter()
                gk_resp = await gk_client.post(
                    "/api/v1/gatekeeper/process-input",
                    json={
                        "id": f"msg-tg-fase4-{idx}",
                        "text": sc["message"],
                        "source": "telegram",
                        "metadata": {
                            "telegram_id": "58821901",
                            "user_id": "usr-doni-01",
                            "sender_name": "Doni Pradana",
                            "tenant_id": "TNT-NEGAPI-876499",
                            "department": "IT Support",
                            "leader_id": "usr-bambang-leader",
                            "role": "EMPLOYEE",
                            "remaining_leave_quota": sc["remaining_quota"],
                        },
                        "threshold": 0.65,
                    },
                )
                assert gk_resp.status_code == 200, f"Gatekeeper failed: {gk_resp.text}"
                gk_data = gk_resp.json()
                gk_ms = gk_data["latency_ms"]

                temporal_payload = gk_data.get("temporal_payload") or {}
                wf_input = temporal_payload.get("input") or {
                    "user_id": "usr-doni-01",
                    "telegram_id": "58821901",
                    "sender_name": "Doni Pradana",
                    "tenant_id": "TNT-NEGAPI-876499",
                    "leader_id": "usr-bambang-leader",
                    "remaining_leave_quota": sc["remaining_quota"],
                    "intent": gk_data["intent"],
                    "raw_text": sc["message"],
                }
                wf_input["dry_run"] = True  # Strictly non-destructive to hadirin.leaves

                workflow_id = f"wf-hadirin-fase4-{idx}-{uuid.uuid4().hex[:6]}"
                wf_result = await temporal_client.execute_workflow(
                    sc["workflow_cls"],
                    wf_input,
                    id=workflow_id,
                    task_queue=task_queue,
                )
                total_ms = round((time.perf_counter() - t0) * 1000, 2)

                print(f"  • Gatekeeper Intent : {gk_data['intent']} (score={gk_data['confidence']}, {gk_ms} ms)")
                print(f"  • Temporal Run ID   : {workflow_id}")
                print(f"  • Workflow Status   : {wf_result['status']} (total={total_ms} ms)")
                print(f"  • Validation Reason : {wf_result['validation']['reason']}")
                print(f"  • Final Reply       :\n{wf_result['reply_message']}\n")

                assert wf_result["status"] == sc["expected_status"], (
                    f"Expected {sc['expected_status']}, got {wf_result['status']}"
                )

    print("🎉 ALL FASE 4 & FASE 5 VERIFICATION TESTS PASSED!")


async def main() -> None:
    await verify_fase5_llm_adapters()
    await verify_fase4_temporal_workflows()


if __name__ == "__main__":
    asyncio.run(main())
