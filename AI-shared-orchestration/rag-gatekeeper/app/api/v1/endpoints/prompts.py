"""Context Fusion & Augmented Prompt Endpoint (/build-augmented-prompt)."""

from fastapi import APIRouter
from app.adapters.llm import get_llm_provider
from app.domains.hadirin.prompt_builder import build_hadirin_augmented_prompt
from app.schemas.process_input import (
    BuildAugmentedPromptRequest,
    BuildAugmentedPromptResponse,
)

router = APIRouter(tags=["Prompts"])


@router.post("/build-augmented-prompt", response_model=BuildAugmentedPromptResponse)
async def build_augmented_prompt(
    payload: BuildAugmentedPromptRequest,
) -> BuildAugmentedPromptResponse:
    """Build Node 7 Augmented Prompt fusing ground-truth text and deterministic telegram_id profile."""
    llm_provider = get_llm_provider()
    bundle = build_hadirin_augmented_prompt(
        raw_text=payload.text,
        intent=payload.intent,
        metadata=payload.metadata,
    )
    extracted_draft = await llm_provider.extract_structured_json(
        prompt=bundle["prompt_user"],
        schema=bundle["schema"],
        context={"raw_text": payload.text, "intent": payload.intent},
    )
    node_7 = bundle["node_7_augmented_prompt"]
    node_7.extracted_draft_preview = extracted_draft

    user_id = payload.metadata.user_id or "usr-unknown"
    sender_name = payload.metadata.sender_name or "Karyawan Terverifikasi"

    return BuildAugmentedPromptResponse(
        status="success",
        domain=payload.domain,
        intent=payload.intent,
        employee=f"{sender_name} ({user_id})",
        telegram_id=payload.metadata.telegram_id,
        tenant_id=payload.metadata.tenant_id,
        node_7_augmented_prompt=node_7,
        prompt_system=bundle["prompt_system"],
        prompt_user=bundle["prompt_user"],
        extracted_draft=extracted_draft,
    )

