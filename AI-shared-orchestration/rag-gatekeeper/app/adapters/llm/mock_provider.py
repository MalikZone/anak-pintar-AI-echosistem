"""Mock LLM Provider for Instant Deterministic JSON Extraction on Mac (Pre-LLM Phase)."""

import re
from datetime import date, timedelta
from typing import Any, Dict
from app.adapters.llm.base import BaseLLMProvider


MONTH_MAP_ID = {
    "januari": 1,
    "jan": 1,
    "februari": 2,
    "feb": 2,
    "maret": 3,
    "mar": 3,
    "april": 4,
    "apr": 4,
    "mei": 5,
    "juni": 6,
    "jun": 6,
    "juli": 7,
    "jul": 7,
    "agustus": 8,
    "agu": 8,
    "agt": 8,
    "september": 9,
    "sep": 9,
    "oktober": 10,
    "okt": 10,
    "november": 11,
    "nov": 11,
    "desember": 12,
    "des": 12,
}


class MockLLMProvider(BaseLLMProvider):
    """Deterministic parser that simulates Qwen 2.5 JSON extraction in <10ms."""

    async def extract_structured_json(
        self,
        prompt: str,
        schema: Dict[str, Any],
        context: Dict[str, Any] | None = None,
    ) -> Dict[str, Any]:
        ctx = context or {}
        raw_text = str(ctx.get("raw_text") or prompt)
        lower_text = raw_text.lower()
        intent = str(ctx.get("intent") or "ANNUAL_LEAVE_REQUEST")

        today = date.today()
        year = today.year

        # 1. Detect leave type
        leave_type = "ANNUAL"
        if "sakit" in lower_text or "demam" in lower_text or "dokter" in lower_text or intent == "SICK_LEAVE_REPORT":
            leave_type = "SICK"

        # 2. Extract date range from Indonesian natural phrasing (e.g. "tanggal 24 dan 25 Oktober")
        start_dt = today + timedelta(days=1)
        end_dt = start_dt

        range_match = re.search(
            r"tanggal\s+(\d{1,2})\s*(?:dan|sampai|s/d|-|hingga)\s*(\d{1,2})\s+([a-zA-Z]+)?",
            lower_text,
        )
        single_match = re.search(r"tanggal\s+(\d{1,2})\s+([a-zA-Z]+)", lower_text)
        iso_matches = re.findall(r"(\d{4}-\d{2}-\d{2})", lower_text)

        if len(iso_matches) >= 2:
            start_dt = date.fromisoformat(iso_matches[0])
            end_dt = date.fromisoformat(iso_matches[1])
        elif len(iso_matches) == 1:
            start_dt = date.fromisoformat(iso_matches[0])
            end_dt = start_dt
        elif range_match:
            d1 = int(range_match.group(1))
            d2 = int(range_match.group(2))
            m_str = (range_match.group(3) or "").strip().lower()
            month = MONTH_MAP_ID.get(m_str, today.month)
            try:
                start_dt = date(year, month, d1)
                end_dt = date(year, month, max(d1, d2))
            except ValueError:
                pass
        elif single_match:
            d1 = int(single_match.group(1))
            m_str = single_match.group(2).strip().lower()
            month = MONTH_MAP_ID.get(m_str, today.month)
            try:
                start_dt = date(year, month, d1)
                end_dt = start_dt
            except ValueError:
                pass
        elif "lusa" in lower_text:
            start_dt = today + timedelta(days=2)
            end_dt = start_dt
        elif "hari ini" in lower_text:
            start_dt = today
            end_dt = today

        total_days = max(1, (end_dt - start_dt).days + 1)

        # 3. Extract clean reason
        reason = raw_text.strip()
        for marker in ["karena ", "ada acara ", "soalnya ", "untuk keperluan ", "mau "]:
            if marker in lower_text:
                idx = lower_text.find(marker)
                extracted = raw_text[idx:].strip()
                if len(extracted) >= 5:
                    reason = extracted[0].upper() + extracted[1:]
                    break

        if intent == "OVERTIME_CLAIM":
            return {
                "overtime_type": "WORKDAY",
                "date": start_dt.isoformat(),
                "start_time": "17:00",
                "end_time": "20:00",
                "duration_hours": 3.0,
                "reason": reason,
                "provider": "mock_provider",
            }

        return {
            "leave_type": leave_type,
            "start_date": start_dt.isoformat(),
            "end_date": end_dt.isoformat(),
            "total_days": total_days,
            "reason": reason,
            "provider": "mock_provider",
        }

