"""Hadirin Intent Taxonomy, Semantic Guardrails & Disambiguation Engine."""

from typing import Any, Dict, List, Optional

HADIRIN_INTENT_REGISTRY: Dict[str, Dict[str, Any]] = {
    "ANNUAL_LEAVE_REQUEST": {
        "is_actionable": True,
        "target_workflow": "LeaveRequestWorkflow",
        "action": "TRIGGER_WORKFLOW",
        "reason": "Permohonan cuti tahunan/izin pribadi terdeteksi dan siap diproses ke Temporal LeaveRequestWorkflow.",
        "keywords": [
            "cuti",
            "izin cuti",
            "cuti tahunan",
            "ambil cuti",
            "pengajuan cuti",
            "nikahan",
            "acara keluarga",
            "mudik",
            "libur cuti",
            "tidak masuk kerja karena acara",
        ],
        "sample_anchor": "Pak saya mau izin cuti tahunan tanggal 24 dan 25 Oktober ada acara keluarga",
    },
    "SICK_LEAVE_REPORT": {
        "is_actionable": True,
        "target_workflow": "LeaveRequestWorkflow",
        "action": "TRIGGER_WORKFLOW",
        "reason": "Laporan izin sakit karyawan terdeteksi dan siap diproses ke Temporal LeaveRequestWorkflow.",
        "keywords": [
            "izin sakit",
            "sakit demam",
            "tidak enak badan",
            "ke dokter",
            "surat dokter",
            "opname",
            "tipes",
            "flu berat",
            "diare",
            "istirahat sakit",
        ],
        "sample_anchor": "Pagi pak, hari ini saya izin sakit demam tinggi dan sedang periksa ke klinik dokter",
    },
    "OVERTIME_CLAIM": {
        "is_actionable": True,
        "target_workflow": "OvertimeWorkflow",
        "action": "TRIGGER_WORKFLOW",
        "reason": "Pengajuan/klaim lembur (SPL) terdeteksi dan siap diproses ke Temporal OvertimeWorkflow.",
        "keywords": [
            "lembur",
            "spl",
            "overtime",
            "klaim lembur",
            "lanjut lembur",
            "kerja lembur",
            "tambahan jam kerja",
        ],
        "sample_anchor": "Pak saya ajukan lembur SPL malam ini 3 jam dari jam 17:00 sampai 20:00 untuk deployment server",
    },
    "SHIFT_SWAP_REQUEST": {
        "is_actionable": True,
        "target_workflow": "ShiftSwapWorkflow",
        "action": "TRIGGER_WORKFLOW",
        "reason": "Permohonan tukar jadwal shift antar karyawan terdeteksi.",
        "keywords": [
            "tukar shift",
            "ganti shift",
            "switch shift",
            "tukeran jadwal",
            "pindah shift pagi",
            "pindah shift malam",
        ],
        "sample_anchor": "Izin komandan, saya mau tukar shift pagi besok sama Budi karena ada urusan pagi",
    },
    "ATTENDANCE_STATUS_QUERY": {
        "is_actionable": True,
        "target_workflow": None,
        "action": "DIRECT_QUERY_RESPONSE",
        "reason": "Pertanyaan informasi saldo cuti atau status riwayat presensi karyawan.",
        "keywords": [
            "sisa cuti",
            "kuota cuti",
            "riwayat absen",
            "jam masuk tadi",
            "cek absen",
            "saldo cuti saya",
        ],
        "sample_anchor": "Halo min, sisa kuota cuti tahunan saya tahun ini tinggal berapa hari ya?",
    },
    "POLICY_HR_QUERY": {
        "is_actionable": True,
        "target_workflow": None,
        "action": "RAG_KNOWLEDGE_RESPONSE",
        "reason": "Pertanyaan terkait SOP HR atau Peraturan Perusahaan.",
        "keywords": [
            "aturan cuti",
            "sop lembur",
            "peraturan perusahaan",
            "syarat surat dokter",
            "maksimal lembur",
        ],
        "sample_anchor": "Bagaimana aturan SOP pengajuan izin sakit lebih dari 2 hari di perusahaan?",
    },
    "FACILITY_CHATTER": {
        "is_actionable": False,
        "target_workflow": None,
        "action": "IGNORE_NOISE",
        "reason": "Pesan teridentifikasi sebagai obrolan umum/fasilitas kantor. Tidak memicu alur cuti/presensi.",
        "keywords": [
            "dispenser",
            "galon",
            "pantry",
            "ac mati",
            "ac rusak",
            "wifi lemot",
            "lampu mati",
            "parkiran",
            "kantin",
        ],
        "sample_anchor": "pagi all, dispenser air galon di pantry lantai 2 habis ya",
    },
    "CASUAL_CHATTER": {
        "is_actionable": False,
        "target_workflow": None,
        "action": "IGNORE_NOISE",
        "reason": "Pesan teridentifikasi sebagai sapaan atau obrolan santai non-operasional.",
        "keywords": [
            "selamat pagi",
            "pagi semua",
            "makan siang",
            "ngopi",
            "terima kasih",
            "mantap",
            "siap pak",
            "oke siap",
        ],
        "sample_anchor": "Selamat pagi teman-teman semua semoga lancar kerjaan hari ini",
    },
}


def apply_hadirin_intent_guardrails(
    text: str,
    qdrant_hits: List[Dict[str, Any]],
    threshold: float = 0.78,
) -> Dict[str, Any]:
    """Combine Qdrant BGE-M3 cosine similarity with deterministic HR guardrails."""
    clean_text = text.lower().strip()
    scores: Dict[str, float] = {}
    matched_phrases: Dict[str, str] = {}

    # 1. Seed scores from Qdrant vector hits if available
    for hit in qdrant_hits:
        payload = hit.get("payload", {})
        intent_code = payload.get("intent")
        if intent_code in HADIRIN_INTENT_REGISTRY:
            hit_score = float(hit.get("score", 0.0))
            if hit_score > scores.get(intent_code, 0.0):
                scores[intent_code] = hit_score
                matched_phrases[intent_code] = payload.get(
                    "text",
                    HADIRIN_INTENT_REGISTRY[intent_code]["sample_anchor"],
                )

    # 2. Apply deterministic lexical & guardrail scoring
    for intent_code, meta in HADIRIN_INTENT_REGISTRY.items():
        kw_matches = sum(1 for kw in meta["keywords"] if kw in clean_text)
        if kw_matches > 0:
            lexical_boost = min(0.94, 0.82 + (kw_matches - 1) * 0.04)
            current = scores.get(intent_code, 0.0)
            scores[intent_code] = max(current, round((current * 0.4 + lexical_boost * 0.6) if current > 0 else lexical_boost, 4))
            matched_phrases.setdefault(intent_code, meta["sample_anchor"])
        else:
            scores.setdefault(intent_code, 0.42)
            matched_phrases.setdefault(intent_code, meta["sample_anchor"])

    # 3. Domain Disambiguation Guardrails:
    # Facility noise override (e.g. dispenser, galon, pantry, ac mati) unless explicit leave keyword present
    has_leave_keyword = any(w in clean_text for w in ["cuti", "izin sakit", "ajukan lembur", "tukar shift"])
    if not has_leave_keyword and any(
        w in clean_text for w in ["dispenser", "galon", "pantry", "ac mati", "ac rusak", "parkiran", "wifi"]
    ):
        scores["FACILITY_CHATTER"] = max(scores.get("FACILITY_CHATTER", 0.0), 0.8854)

    # Sick leave vs Annual leave disambiguation
    if any(w in clean_text for w in ["sakit", "demam", "dokter", "klinik", "opname", "rawat", "flu", "pusing"]):
        if "aturan" not in clean_text and "sop" not in clean_text:
            scores["SICK_LEAVE_REPORT"] = max(scores.get("SICK_LEAVE_REPORT", 0.0), 0.8950)
    elif any(w in clean_text for w in ["cuti", "izin", "nikahan", "acara", "pulang kampung", "mudik"]):
        if "sisa" not in clean_text and "berapa" not in clean_text and "aturan" not in clean_text:
            scores["ANNUAL_LEAVE_REQUEST"] = max(scores.get("ANNUAL_LEAVE_REQUEST", 0.0), 0.8921)

    # Sort candidates by score descending
    sorted_intents = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    top_intent, top_score = sorted_intents[0]
    top_meta = HADIRIN_INTENT_REGISTRY[top_intent]

    is_actionable = bool(top_meta["is_actionable"]) and top_score >= threshold
    target_workflow: Optional[str] = top_meta["target_workflow"] if is_actionable else None
    action = top_meta["action"] if is_actionable else "IGNORE_NOISE"
    reason = (
        top_meta["reason"]
        if is_actionable or not top_meta["is_actionable"]
        else f"Skor keyakinan ({top_score:.4f}) di bawah ambang batas ({threshold})."
    )

    candidates = [
        {
            "intent": code,
            "score": round(sc, 4),
            "is_actionable": bool(HADIRIN_INTENT_REGISTRY[code]["is_actionable"]),
            "target_workflow": HADIRIN_INTENT_REGISTRY[code]["target_workflow"],
            "sample_anchor": matched_phrases.get(code, HADIRIN_INTENT_REGISTRY[code]["sample_anchor"]),
        }
        for code, sc in sorted_intents[:4]
    ]

    return {
        "detected_intent": top_intent,
        "confidence": round(top_score, 4),
        "is_actionable": is_actionable,
        "target_workflow": target_workflow,
        "action": action,
        "reason": reason,
        "matched_phrase": matched_phrases.get(top_intent, top_meta["sample_anchor"]),
        "candidates": candidates,
    }

