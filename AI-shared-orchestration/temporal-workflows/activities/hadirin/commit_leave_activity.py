"""Activity 3: Commit Leave Draft to MySQL hadirin.leaves (with dry_run protection)."""

import sys
import uuid
from pathlib import Path
from typing import Any, Dict
import pymysql
from temporalio import activity

GATEKEEPER_ROOT = Path(__file__).resolve().parents[3] / "rag-gatekeeper"
if str(GATEKEEPER_ROOT) not in sys.path:
    sys.path.insert(0, str(GATEKEEPER_ROOT))

from app.config import get_settings


@activity.defn(name="commit_leave_activity")
async def commit_leave_activity(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Insert validated leave request into hadirin.leaves with status pending_leader/pending_hr."""
    settings = get_settings()
    dry_run = bool(payload.get("dry_run", False))
    validation = payload.get("validation") or {}
    draft = payload.get("extracted_draft") or {}

    user_id = validation.get("user_id") or payload.get("user_id")
    tenant_id = validation.get("tenant_id") or payload.get("tenant_id")
    initial_status = validation.get("target_initial_status") or "pending_leader"

    leave_id = f"LV-AI-{uuid.uuid4().hex[:8].upper()}"
    leave_type_raw = str(draft.get("leave_type") or "ANNUAL").upper()
    db_leave_type = "sick" if leave_type_raw == "SICK" else "annual"
    start_date = str(draft.get("start_date"))
    end_date = str(draft.get("end_date"))
    total_days = int(draft.get("total_days") or 1)
    reason = str(draft.get("reason") or payload.get("raw_text") or "Pengajuan via AI Orchestration")

    if dry_run or not validation.get("db_verified", False):
        activity.logger.info(
            "Dry-run / simulation mode active for leave_id=%s (user_id=%s). Skipping DB write to preserve production data.",
            leave_id,
            user_id,
        )
        return {
            "committed": True,
            "dry_run": True,
            "leave_id": leave_id,
            "user_id": user_id,
            "tenant_id": tenant_id,
            "type": db_leave_type,
            "start_date": start_date,
            "end_date": end_date,
            "total_days": total_days,
            "reason": reason,
            "status": initial_status,
        }

    conn = pymysql.connect(
        host=settings.HADIRIN_DB_HOST,
        port=settings.HADIRIN_DB_PORT,
        user=settings.HADIRIN_DB_USER,
        password=settings.HADIRIN_DB_PASSWORD,
        database=settings.HADIRIN_DB_NAME,
        cursorclass=pymysql.cursors.DictCursor,
        connect_timeout=5,
    )
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO leaves (
                    id, tenant_id, user_id, type, start_date, end_date,
                    total_days, reason, status, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                """,
                (
                    leave_id,
                    tenant_id,
                    user_id,
                    db_leave_type,
                    start_date,
                    end_date,
                    total_days,
                    reason,
                    initial_status,
                ),
            )
        conn.commit()
    finally:
        conn.close()

    return {
        "committed": True,
        "dry_run": False,
        "leave_id": leave_id,
        "user_id": user_id,
        "tenant_id": tenant_id,
        "type": db_leave_type,
        "start_date": start_date,
        "end_date": end_date,
        "total_days": total_days,
        "reason": reason,
        "status": initial_status,
    }

