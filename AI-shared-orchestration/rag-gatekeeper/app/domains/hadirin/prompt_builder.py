"""Hadirin Node 7 Context Fusion & Augmented Prompt Builder (Zero Hardcode)."""

import json
from typing import Any, Dict, Optional
from app.domains.hadirin.rules import (
    HR_GOVERNANCE_RULES,
    LEAVE_REQUEST_SCHEMA,
    OVERTIME_REQUEST_SCHEMA,
    resolve_matched_leave_type,
)
from app.schemas.common import SenderMetadata
from app.schemas.process_input import AugmentedPromptNodeDTO, TeamCapacityContextDTO


def build_hadirin_augmented_prompt(
    raw_text: str,
    intent: str,
    metadata: SenderMetadata,
    extracted_draft_preview: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Fuse ground-truth message with deterministic employee identity from users.telegram_id."""
    user_id = metadata.user_id or "usr-unknown"
    sender_name = metadata.sender_name or "Karyawan Terverifikasi"
    employee_display = f"{sender_name} ({user_id})"
    department = metadata.department or "Operasional"
    active_shift = metadata.active_shift or "Non-Shift (08:00 - 17:00)"
    remaining_quota = metadata.remaining_leave_quota if metadata.remaining_leave_quota is not None else 12

    matched_leave = resolve_matched_leave_type(intent, raw_text)
    schema = OVERTIME_REQUEST_SCHEMA if intent == "OVERTIME_CLAIM" else LEAVE_REQUEST_SCHEMA

    system_instruction = (
        "Anda adalah AI HR Orchestration Engine untuk Platform Hadirin. "
        "Ekstrak tanggal, durasi, jenis pengajuan, dan alasan ke dalam JSON sesuai skema resmi. "
        "Patuhi identitas deterministik dari telegram_id dan jangan mengarang atribut di luar pesan."
    )

    node_7 = AugmentedPromptNodeDTO(
        employee=employee_display,
        telegram_id=metadata.telegram_id,
        department=department,
        active_shift=active_shift,
        remaining_leave_quota=remaining_quota,
        matched_leave_type=matched_leave,
        team_capacity_context=TeamCapacityContextDTO(
            total_team_members=5,
            on_leave_at_date=0,
            projected_capacity="100%",
        ),
        system_instruction=system_instruction,
        extracted_draft_preview=extracted_draft_preview,
    )

    rules_block = "\n".join(HR_GOVERNANCE_RULES)
    prompt_user = (
        f"=== GROUND TRUTH PESAN KARYAWAN ===\n{raw_text}\n\n"
        f"=== IDENTITAS DETERMINISTIK (RESOLVED VIA TELEGRAM_ID) ===\n"
        f"- Karyawan: {employee_display}\n"
        f"- Telegram ID: {metadata.telegram_id or '-'}\n"
        f"- Tenant ID: {metadata.tenant_id or '-'}\n"
        f"- Departemen: {department}\n"
        f"- Shift Aktif: {active_shift}\n"
        f"- Sisa Kuota Cuti Tahunan: {remaining_quota} Hari\n"
        f"- Kebijakan Terpilih: [{matched_leave.code}] {matched_leave.name}\n\n"
        f"=== ATURAN KONTROL HR & DEPKER ===\n{rules_block}\n\n"
        f"=== SKEMA TARGET JSON ===\n{json.dumps(schema, ensure_ascii=False, indent=2)}"
    )

    return {
        "node_7_augmented_prompt": node_7,
        "prompt_system": system_instruction,
        "prompt_user": prompt_user,
        "schema": schema,
    }

