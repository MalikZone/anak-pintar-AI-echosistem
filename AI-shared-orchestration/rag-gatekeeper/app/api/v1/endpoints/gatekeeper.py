"""Gatekeeper Endpoints: /detect-intent and /process-input."""

import time
import uuid
from datetime import date
from fastapi import APIRouter
from app.adapters.embedding.bge_m3_adapter import get_embedder
from app.adapters.llm import get_llm_provider
from app.adapters.vectorstore.qdrant_adapter import get_qdrant_adapter
from app.config import get_settings
from app.domains.hadirin.intents import apply_hadirin_intent_guardrails
from app.domains.hadirin.prompt_builder import build_hadirin_augmented_prompt
from app.schemas.intent import DetectIntentRequest, DetectIntentResponse, IntentCandidate
from app.schemas.process_input import (
    ProcessInputRequest,
    ProcessInputResponse,
    TemporalPayloadDTO,
)

router = APIRouter(tags=["Gatekeeper"])


@router.post("/detect-intent", response_model=DetectIntentResponse)
async def detect_intent(payload: DetectIntentRequest) -> DetectIntentResponse:
    """Classify user message semantically using BGE-M3 (1024-dim) + Hadirin HR Guardrails."""
    start = time.perf_counter()
    settings = get_settings()
    embedder = get_embedder()
    qdrant = get_qdrant_adapter()

    query_vec = embedder.embed_text(payload.text)
    collection = (
        settings.QDRANT_COLLECTION_HADIRIN_INTENTS
        if payload.domain == "hadirin"
        else settings.QDRANT_COLLECTION_LISA_INTENTS
    )
    hits = qdrant.search_similar(collection_name=collection, query_vector=query_vec, limit=5)

    result = apply_hadirin_intent_guardrails(
        text=payload.text,
        qdrant_hits=hits,
        threshold=payload.threshold,
    )
    elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

    return DetectIntentResponse(
        query=payload.text,
        detected_intent=result["detected_intent"],
        confidence=result["confidence"],
        threshold=payload.threshold,
        is_actionable=result["is_actionable"],
        target_workflow=result["target_workflow"],
        action=result["action"],
        reason=result["reason"],
        matched_phrase=result["matched_phrase"],
        latency_ms=elapsed_ms,
        candidates=[IntentCandidate(**c) for c in result["candidates"]],
    )


@router.post("/process-input", response_model=ProcessInputResponse)
async def process_input(payload: ProcessInputRequest) -> ProcessInputResponse:
    """End-to-End Pre-Storage Gatekeeper: filters 90%+ noise, builds Node 7 & Temporal contract."""
    start = time.perf_counter()
    settings = get_settings()
    embedder = get_embedder()
    qdrant = get_qdrant_adapter()
    llm_provider = get_llm_provider()

    doc_id = payload.id or f"msg-{payload.source}-{uuid.uuid4().hex[:8]}"
    query_vec = embedder.embed_text(payload.text)

    intents_collection = settings.QDRANT_COLLECTION_HADIRIN_INTENTS
    docs_collection = settings.QDRANT_COLLECTION_HADIRIN_DOCS

    hits = qdrant.search_similar(collection_name=intents_collection, query_vector=query_vec, limit=5)
    intent_res = apply_hadirin_intent_guardrails(
        text=payload.text,
        qdrant_hits=hits,
        threshold=payload.threshold,
    )

    detected_intent = intent_res["detected_intent"]
    confidence = intent_res["confidence"]
    is_actionable = intent_res["is_actionable"]
    target_workflow = intent_res["target_workflow"]

    # Case 1: Operational Noise / Casual Chatter -> Ignore immediately (0 LLM tokens used)
    if not is_actionable:
        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
        return ProcessInputResponse(
            status="ignored",
            action="IGNORE_NOISE",
            document_id=doc_id,
            collection=None,
            intent=detected_intent,
            confidence=confidence,
            is_actionable=False,
            reason=intent_res["reason"],
            target_workflow=None,
            workflow_status=None,
            workflow_id=None,
            latency_ms=elapsed_ms,
            node_7_augmented_prompt=None,
            temporal_payload=None,
        )

    # Case 2: Actionable HR Request -> Index document in Qdrant & Build Node 7 + Temporal Contract
    try:
        qdrant.upsert_points(
            collection_name=docs_collection,
            vectors=[query_vec],
            payloads=[
                {
                    "document_id": doc_id,
                    "text": payload.text,
                    "source": payload.source,
                    "intent": detected_intent,
                    "confidence": confidence,
                    "user_id": payload.metadata.user_id,
                    "telegram_id": payload.metadata.telegram_id,
                    "tenant_id": payload.metadata.tenant_id,
                }
            ],
            ids=[doc_id],
        )
    except Exception:
        pass

    prompt_bundle = build_hadirin_augmented_prompt(
        raw_text=payload.text,
        intent=detected_intent,
        metadata=payload.metadata,
    )
    draft_json = await llm_provider.extract_structured_json(
        prompt=prompt_bundle["prompt_user"],
        schema=prompt_bundle["schema"],
        context={"raw_text": payload.text, "intent": detected_intent},
    )

    node_7 = prompt_bundle["node_7_augmented_prompt"]
    node_7.extracted_draft_preview = draft_json

    user_slug = payload.metadata.user_id or payload.metadata.telegram_id or "anon"
    date_slug = str(draft_json.get("start_date") or date.today().isoformat()).replace("-", "")
    workflow_id = f"wf-leave-{user_slug}-{date_slug}"

    temporal_contract = None
    if target_workflow:
        temporal_contract = TemporalPayloadDTO(
            workflow_name=target_workflow,
            workflow_id=workflow_id,
            task_queue=settings.TEMPORAL_HADIRIN_TASK_QUEUE,
            input={
                "document_id": doc_id,
                "user_id": payload.metadata.user_id,
                "telegram_id": payload.metadata.telegram_id,
                "sender_name": payload.metadata.sender_name,
                "tenant_id": payload.metadata.tenant_id,
                "department": payload.metadata.department,
                "leader_id": payload.metadata.leader_id,
                "remaining_leave_quota": payload.metadata.remaining_leave_quota,
                "intent": detected_intent,
                "raw_text": payload.text,
                "extracted_draft": draft_json,
                "augmented_context": node_7.model_dump(),
            },
        )

    elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
    return ProcessInputResponse(
        status="processed_and_queued",
        action=intent_res["action"],
        document_id=doc_id,
        collection=docs_collection,
        intent=detected_intent,
        confidence=confidence,
        is_actionable=True,
        reason=intent_res["reason"],
        target_workflow=target_workflow,
        workflow_status="QUEUED_CONTRACT_READY" if target_workflow else "DIRECT_RESPONSE_READY",
        workflow_id=workflow_id if target_workflow else None,
        latency_ms=elapsed_ms,
        node_7_augmented_prompt=node_7,
        temporal_payload=temporal_contract,
    )

