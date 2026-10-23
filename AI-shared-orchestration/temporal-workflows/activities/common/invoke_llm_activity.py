"""Activity 1: Invoke LLM Provider Adapter (Mock Simulator on Mac / Ollama on Home PC)."""

import sys
from pathlib import Path
from typing import Any, Dict
from temporalio import activity

GATEKEEPER_ROOT = Path(__file__).resolve().parents[3] / "rag-gatekeeper"
if str(GATEKEEPER_ROOT) not in sys.path:
    sys.path.insert(0, str(GATEKEEPER_ROOT))

from app.adapters.llm import get_llm_provider
from app.domains.hadirin.rules import LEAVE_REQUEST_SCHEMA, OVERTIME_REQUEST_SCHEMA


@activity.defn(name="invoke_llm_activity")
async def invoke_llm_activity(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Execute structured JSON extraction via the configured BaseLLMProvider adapter."""
    intent = str(payload.get("intent") or "ANNUAL_LEAVE_REQUEST")
    raw_text = str(payload.get("raw_text") or "")
    prompt = str(payload.get("prompt_user") or raw_text)
    schema = OVERTIME_REQUEST_SCHEMA if intent == "OVERTIME_CLAIM" else LEAVE_REQUEST_SCHEMA

    activity.logger.info(
        "Invoking LLM Adapter for intent=%s (user_id=%s, telegram_id=%s)",
        intent,
        payload.get("user_id"),
        payload.get("telegram_id"),
    )

    provider = get_llm_provider()
    structured = await provider.extract_structured_json(
        prompt=prompt,
        schema=schema,
        context={"raw_text": raw_text, "intent": intent},
    )
    return structured

