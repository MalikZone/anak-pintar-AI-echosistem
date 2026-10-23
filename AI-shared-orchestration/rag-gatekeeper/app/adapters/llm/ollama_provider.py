"""Ollama LLM Provider (OpenAI-Compatible Endpoint for Qwen 2.5 at Home PC)."""

import json
from typing import Any, Dict
import httpx
from app.adapters.llm.base import BaseLLMProvider
from app.config import get_settings


class OllamaLLMProvider(BaseLLMProvider):
    """Calls local/edge Ollama server (/v1/chat/completions) with JSON schema enforcement."""

    def __init__(self, base_url: str | None = None, model: str | None = None) -> None:
        settings = get_settings()
        self.base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        self.model = model or settings.OLLAMA_MODEL

    async def extract_structured_json(
        self,
        prompt: str,
        schema: Dict[str, Any],
        context: Dict[str, Any] | None = None,
    ) -> Dict[str, Any]:
        system_msg = (
            "Anda adalah mesin ekstraksi JSON deterministik Hadirin HR. "
            "Keluarkan HANYA objek JSON valid sesuai skema berikut tanpa markdown:\n"
            f"{json.dumps(schema, ensure_ascii=False)}"
        )
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_msg},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.0,
            "response_format": {"type": "json_object"},
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(f"{self.base_url}/chat/completions", json=payload)
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            return json.loads(content)

