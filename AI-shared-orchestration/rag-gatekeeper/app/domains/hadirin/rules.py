"""Hadirin HR Domain Rules, Policies & Output JSON Schemas."""

from typing import Any, Dict
from app.schemas.process_input import MatchedLeaveTypeDTO

LEAVE_REQUEST_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "required": ["leave_type", "start_date", "end_date", "total_days", "reason"],
    "properties": {
        "leave_type": {"type": "string", "enum": ["ANNUAL", "SICK", "SPECIAL"]},
        "start_date": {"type": "string", "format": "date"},
        "end_date": {"type": "string", "format": "date"},
        "total_days": {"type": "integer", "minimum": 1},
        "reason": {"type": "string"},
    },
}

OVERTIME_REQUEST_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "required": ["overtime_type", "date", "start_time", "end_time", "duration_hours", "reason"],
    "properties": {
        "overtime_type": {"type": "string", "enum": ["WORKDAY", "HOLIDAY"]},
        "date": {"type": "string", "format": "date"},
        "start_time": {"type": "string"},
        "end_time": {"type": "string"},
        "duration_hours": {"type": "number", "maximum": 14.0},
        "reason": {"type": "string"},
    },
}

HR_GOVERNANCE_RULES = [
    "1. Segregation of Duties (Anti Self-Approval): Pengaju cuti tidak boleh menyetujui pengajuannya sendiri.",
    "2. Validasi Kuota Cuti Tahunan: Total hari cuti tahunan yang diajukan tidak boleh melebihi sisa kuota cuti karyawan.",
    "3. Izin Sakit > 1 Hari: Wajib melampirkan Surat Keterangan Dokter (SKD) untuk pengesahan HR.",
    "4. Batas Lembur (SPL): Maksimal 4 jam/hari pada hari kerja atau 14 jam/minggu sesuai regulasi Depnaker.",
    "5. Zero Hallucination: Dilarang keras mengarang tanggal atau alasan yang tidak disebutkan oleh karyawan.",
]


def resolve_matched_leave_type(intent: str, raw_text: str) -> MatchedLeaveTypeDTO:
    """Resolve leave policy type deterministically from classified intent & text."""
    lower = raw_text.lower()
    if intent == "SICK_LEAVE_REPORT" or "sakit" in lower or "demam" in lower or "rawat" in lower:
        return MatchedLeaveTypeDTO(
            code="SICK_LEAVE",
            name="Izin Sakit (Sick Leave)",
            requires_attachment=("surat dokter" in lower or "2 hari" in lower or "3 hari" in lower),
        )
    return MatchedLeaveTypeDTO(
        code="ANNUAL_LEAVE",
        name="Cuti Tahunan",
        requires_attachment=False,
    )

