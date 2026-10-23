"""Activity 4: Send Interactive Approval Notification Card to Leader / HR (HITL)."""

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


@activity.defn(name="notify_leader_activity")
async def notify_leader_activity(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Create in-app approval notification card and format Telegram HITL message."""
    settings = get_settings()
    commit_data = payload.get("commit_result") or {}
    validation = payload.get("validation") or {}
    dry_run = bool(commit_data.get("dry_run", True))

    leave_id = commit_data.get("leave_id", "LV-AI-0000")
    employee_name = validation.get("employee_name") or payload.get("sender_name") or "Karyawan"
    leader_id = validation.get("leader_id")
    tenant_id = commit_data.get("tenant_id")
    start_date = commit_data.get("start_date")
    end_date = commit_data.get("end_date")
    total_days = commit_data.get("total_days", 1)
    reason = commit_data.get("reason", "-")

    notif_id = f"NTF-AI-{uuid.uuid4().hex[:8].upper()}"
    title = f"Pengajuan Cuti AI Baru: {employee_name}"
    message = (
        f"{employee_name} mengajukan cuti ({total_days} hari: {start_date} s/d {end_date}) "
        f"via AI Orchestration. Alasan: {reason}"
    )

    if not dry_run and leader_id and tenant_id:
        try:
            conn = pymysql.connect(
                host=settings.HADIRIN_DB_HOST,
                port=settings.HADIRIN_DB_PORT,
                user=settings.HADIRIN_DB_USER,
                password=settings.HADIRIN_DB_PASSWORD,
                database=settings.HADIRIN_DB_NAME,
                connect_timeout=3,
            )
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO notifications (
                        id, tenant_id, user_id, type, title, message, link, is_read, created_at, updated_at
                    ) VALUES (%s, %s, %s, 'leave_request', %s, %s, '/leader/approvals', 0, NOW(), NOW())
                    """,
                    (notif_id, tenant_id, leader_id, title, message),
                )
            conn.commit()
            conn.close()
        except Exception as exc:
            activity.logger.warning("Non-critical notification insert warning: %s", exc)

    telegram_card = (
        f"✅ *PENGAJUAN CUTI TERCATAT (MENUNGGU PERSETUJUAN)*\n"
        f"• ID Pengajuan: `{leave_id}`\n"
        f"• Pemohon: *{employee_name}*\n"
        f"• Periode: `{start_date}` s/d `{end_date}` ({total_days} Hari)\n"
        f"• Alasan: _{reason}_\n"
        f"• Status: `{commit_data.get('status', 'pending_leader').upper()}`"
    )

    return {
        "notified": True,
        "notification_id": notif_id,
        "target_approver_id": leader_id or "HR_ADMIN",
        "telegram_reply_card": telegram_card,
    }

