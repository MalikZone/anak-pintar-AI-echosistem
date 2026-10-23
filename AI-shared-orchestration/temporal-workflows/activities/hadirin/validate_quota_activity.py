"""Activity 2: Validate Employee Quota, Shift & Anti Self-Approval against MySQL Hadirin."""

import sys
from pathlib import Path
from typing import Any, Dict
import pymysql
from temporalio import activity

GATEKEEPER_ROOT = Path(__file__).resolve().parents[3] / "rag-gatekeeper"
if str(GATEKEEPER_ROOT) not in sys.path:
    sys.path.insert(0, str(GATEKEEPER_ROOT))

from app.config import get_settings


@activity.defn(name="validate_quota_activity")
async def validate_quota_activity(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Validate leave quota, overtime cap, and Segregation of Duties (Anti Self-Approval)."""
    settings = get_settings()
    user_id = payload.get("user_id")
    telegram_id = payload.get("telegram_id")
    tenant_id = payload.get("tenant_id")
    draft = payload.get("extracted_draft") or {}
    leave_type = str(draft.get("leave_type") or "ANNUAL").upper()
    total_days = int(draft.get("total_days") or 1)

    remaining_quota = int(payload.get("remaining_leave_quota") or 12)
    leader_id = payload.get("leader_id")
    employee_name = payload.get("sender_name") or "Karyawan"
    db_verified = False

    # Query real employee row from MySQL hadirin.users (Read-Only SELECT)
    try:
        conn = pymysql.connect(
            host=settings.HADIRIN_DB_HOST,
            port=settings.HADIRIN_DB_PORT,
            user=settings.HADIRIN_DB_USER,
            password=settings.HADIRIN_DB_PASSWORD,
            database=settings.HADIRIN_DB_NAME,
            cursorclass=pymysql.cursors.DictCursor,
            connect_timeout=3,
        )
        with conn.cursor() as cur:
            if telegram_id:
                cur.execute(
                    """
                    SELECT id, tenant_id, name, role, department, leader_id,
                           leave_remaining_annual, telegram_id
                    FROM users
                    WHERE (telegram_id = %s OR id = %s) AND deleted_at IS NULL AND is_active = 1
                    LIMIT 1
                    """,
                    (str(telegram_id), str(user_id or "")),
                )
            elif user_id:
                cur.execute(
                    """
                    SELECT id, tenant_id, name, role, department, leader_id,
                           leave_remaining_annual, telegram_id
                    FROM users
                    WHERE id = %s AND deleted_at IS NULL AND is_active = 1
                    LIMIT 1
                    """,
                    (str(user_id),),
                )
            else:
                cur.execute("SELECT NULL LIMIT 0")

            row = cur.fetchone()
            if row:
                db_verified = True
                user_id = row["id"]
                tenant_id = row["tenant_id"]
                employee_name = row["name"]
                leader_id = row["leader_id"]
                remaining_quota = int(row.get("leave_remaining_annual") or remaining_quota)
        conn.close()
    except Exception as exc:
        activity.logger.warning("MySQL lookup warning (using payload metadata fallback): %s", exc)

    # Rule 1: Anti Self-Approval (Segregation of Duties)
    if leader_id and user_id and str(leader_id) == str(user_id):
        return {
            "is_valid": False,
            "reason": "Pelanggaran Segregation of Duties: Karyawan tidak boleh menjadi approver bagi dirinya sendiri.",
            "remaining_quota": remaining_quota,
            "requested_days": total_days,
        }

    # Rule 2: Overtime Daily Cap Check (PP No. 35 Tahun 2021: max 4 jam/hari)
    intent = str(payload.get("intent") or "")
    if intent in ("OVERTIME_CLAIM", "OVERTIME_REQUEST") or "duration_hours" in draft:
        duration_hours = float(draft.get("duration_hours") or 3.0)
        if duration_hours > 4.0:
            return {
                "is_valid": False,
                "reason": (
                    f"Pengajuan lembur ({duration_hours} jam) melebihi batas maksimal "
                    "PP No. 35 Tahun 2021 (maksimal 4 jam/hari kerja)."
                ),
                "duration_hours": duration_hours,
            }
        return {
            "is_valid": True,
            "db_verified": db_verified,
            "user_id": user_id,
            "tenant_id": tenant_id,
            "employee_name": employee_name,
            "leader_id": leader_id,
            "duration_hours": duration_hours,
            "reason": f"Durasi lembur ({duration_hours} jam) sesuai batas regulasi (<= 4 jam/hari).",
            "target_initial_status": "pending_leader" if leader_id else "pending_hr",
        }

    # Rule 3: Annual Leave Quota Check
    if leave_type == "ANNUAL" and total_days > remaining_quota:
        return {
            "is_valid": False,
            "reason": (
                f"Sisa kuota cuti tahunan tidak mencukupi "
                f"(Tersisa: {remaining_quota} hari, Diajukan: {total_days} hari)."
            ),
            "remaining_quota": remaining_quota,
            "requested_days": total_days,
        }

    return {
        "is_valid": True,
        "db_verified": db_verified,
        "user_id": user_id,
        "tenant_id": tenant_id,
        "employee_name": employee_name,
        "leader_id": leader_id,
        "remaining_quota": remaining_quota,
        "requested_days": total_days,
        "projected_remaining_quota": max(0, remaining_quota - total_days) if leave_type == "ANNUAL" else remaining_quota,
        "target_initial_status": "pending_leader" if leader_id else "pending_hr",
        "reason": f"Kuota mencukupi (Tersisa: {remaining_quota} hari, Diajukan: {total_days} hari).",
    }
