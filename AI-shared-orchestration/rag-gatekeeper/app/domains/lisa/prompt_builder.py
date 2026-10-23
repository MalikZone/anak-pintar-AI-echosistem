"""LISA Domain Context Fusion Prompt Builder (Stub for Multi-Domain Expansion)."""

from typing import Dict


def build_lisa_augmented_prompt(raw_text: str, user_id: str) -> Dict[str, str]:
    """Build augmented prompt for LISA gold market assistant."""
    return {
        "prompt_system": "Anda adalah LISA, asisten analisis investasi emas berbasis data.",
        "prompt_user": f"[User: {user_id}] Pertanyaan: {raw_text}",
    }

