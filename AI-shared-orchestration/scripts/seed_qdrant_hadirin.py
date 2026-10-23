"""Fase 3: Seeding Koleksi Intensi & Dokumen SOP Hadirin ke Qdrant Vector Database."""

import json
import logging
import sys
import time
from pathlib import Path
from typing import Any, Dict, List

BASE_DIR = Path(__file__).resolve().parents[1]
GATEKEEPER_DIR = BASE_DIR / "rag-gatekeeper"
KNOWLEDGE_DIR = BASE_DIR / "knowledge-base"

sys.path.insert(0, str(GATEKEEPER_DIR))

from app.adapters.embedding.bge_m3_adapter import get_embedder
from app.adapters.vectorstore.qdrant_adapter import get_qdrant_adapter
from app.config import get_settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
)
logger = logging.getLogger("seed-qdrant")


def seed_hadirin_intents(qdrant, embedder, collection_name: str) -> int:
    """Seed 60+ conversational Indonesian/English anchor phrases into hadirin_intents."""
    phrases_path = KNOWLEDGE_DIR / "hadirin" / "anchor_phrases.json"
    with phrases_path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    texts: List[str] = []
    payloads: List[Dict[str, Any]] = []
    point_ids: List[str] = []

    for group in data.get("intents", []):
        intent_code = group["intent"]
        is_actionable = bool(group["is_actionable"])
        target_workflow = group.get("target_workflow")
        action = group.get("action", "IGNORE_NOISE")

        for idx, phrase in enumerate(group.get("phrases", []), start=1):
            point_id = f"hadirin-intent-{intent_code.lower()}-{idx:03d}"
            texts.append(phrase)
            point_ids.append(point_id)
            payloads.append(
                {
                    "anchor_id": point_id,
                    "domain": "hadirin",
                    "intent": intent_code,
                    "text": phrase,
                    "is_actionable": is_actionable,
                    "target_workflow": target_workflow,
                    "action": action,
                }
            )

    vectors = embedder.embed_batch(texts)
    count = qdrant.upsert_points(
        collection_name=collection_name,
        vectors=vectors,
        payloads=payloads,
        ids=point_ids,
    )
    logger.info("Seeded %d anchor phrase vectors into collection '%s'.", count, collection_name)
    return count


def seed_hadirin_documents(qdrant, embedder, collection_name: str) -> int:
    """Seed HR SOP & Depnaker regulation documents into hadirin_documents."""
    policies_path = KNOWLEDGE_DIR / "hadirin" / "company_leave_policies.json"
    with policies_path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    texts: List[str] = []
    payloads: List[Dict[str, Any]] = []
    point_ids: List[str] = []

    for doc in data.get("documents", []):
        doc_id = doc["doc_id"]
        combined_text = f"{doc['title']}. {doc['content']}"
        texts.append(combined_text)
        point_ids.append(doc_id)
        payloads.append(
            {
                "document_id": doc_id,
                "domain": "hadirin",
                "title": doc["title"],
                "category": doc["category"],
                "tenant_id": doc.get("tenant_id", "GLOBAL"),
                "text": doc["content"],
                "source": "company_leave_policies.json",
            }
        )

    vectors = embedder.embed_batch(texts)
    count = qdrant.upsert_points(
        collection_name=collection_name,
        vectors=vectors,
        payloads=payloads,
        ids=point_ids,
    )
    logger.info("Seeded %d HR policy knowledge vectors into collection '%s'.", count, collection_name)
    return count


def seed_lisa_intents(qdrant, embedder, collection_name: str) -> int:
    """Seed initial LISA gold investment anchor phrases into lisa_intents."""
    lisa_path = KNOWLEDGE_DIR / "lisa" / "gold_glossary.json"
    if not lisa_path.exists():
        return 0

    with lisa_path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    texts: List[str] = []
    payloads: List[Dict[str, Any]] = []
    point_ids: List[str] = []

    for group in data.get("intents", []):
        intent_code = group["intent"]
        for idx, phrase in enumerate(group.get("phrases", []), start=1):
            point_id = f"lisa-intent-{intent_code.lower()}-{idx:03d}"
            texts.append(phrase)
            point_ids.append(point_id)
            payloads.append(
                {
                    "anchor_id": point_id,
                    "domain": "lisa",
                    "intent": intent_code,
                    "text": phrase,
                    "is_actionable": bool(group.get("is_actionable", True)),
                    "target_workflow": group.get("target_workflow"),
                }
            )

    vectors = embedder.embed_batch(texts)
    count = qdrant.upsert_points(
        collection_name=collection_name,
        vectors=vectors,
        payloads=payloads,
        ids=point_ids,
    )
    logger.info("Seeded %d LISA anchor vectors into collection '%s'.", count, collection_name)
    return count


def main() -> None:
    start_time = time.perf_counter()
    settings = get_settings()
    qdrant = get_qdrant_adapter()
    embedder = get_embedder()

    if not qdrant.is_healthy():
        raise RuntimeError(
            f"Qdrant server at {settings.QDRANT_HOST}:{settings.QDRANT_PORT} is not reachable. "
            "Ensure Docker container 'anakpintar-qdrant' is running."
        )

    intents_count = seed_hadirin_intents(
        qdrant, embedder, settings.QDRANT_COLLECTION_HADIRIN_INTENTS
    )
    docs_count = seed_hadirin_documents(
        qdrant, embedder, settings.QDRANT_COLLECTION_HADIRIN_DOCS
    )
    lisa_count = seed_lisa_intents(
        qdrant, embedder, settings.QDRANT_COLLECTION_LISA_INTENTS
    )

    # Verify semantic search against seeded Qdrant collections
    sample_queries = [
        ("Pak saya mau izin cuti tahunan 2 hari besok ada nikahan adik", settings.QDRANT_COLLECTION_HADIRIN_INTENTS),
        ("Pagi komandan, hari ini saya izin sakit demam tinggi ke dokter", settings.QDRANT_COLLECTION_HADIRIN_INTENTS),
        ("dispenser air galon di pantry lantai 2 habis ya", settings.QDRANT_COLLECTION_HADIRIN_INTENTS),
        ("Bagaimana aturan wajib surat keterangan dokter jika sakit lebih dari 1 hari?", settings.QDRANT_COLLECTION_HADIRIN_DOCS),
    ]

    print("\n=== VERIFIKASI PENCARIAN VEKTOR QDRANT (COSINE SIMILARITY 1024-DIM) ===")
    for query_text, col_name in sample_queries:
        q_vec = embedder.embed_text(query_text)
        hits = qdrant.search_similar(collection_name=col_name, query_vector=q_vec, limit=1)
        top_hit = hits[0] if hits else {}
        payload = top_hit.get("payload", {})
        matched_label = payload.get("intent") or payload.get("document_id") or "N/A"
        matched_text = payload.get("title") or payload.get("text", "")[:65]
        print(
            f"• [{col_name}] Query: '{query_text[:52]}...'\n"
            f"  -> Top Match: {matched_label} (Score: {top_hit.get('score', 0.0):.4f}) | '{matched_text}'"
        )

    elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
    print(
        f"\n✅ Seeding Qdrant Selesai dalam {elapsed_ms}ms! "
        f"(hadirin_intents={intents_count}, hadirin_documents={docs_count}, lisa_intents={lisa_count})"
    )


if __name__ == "__main__":
    main()

