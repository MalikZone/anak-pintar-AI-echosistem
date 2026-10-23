"""Overtime Request Saga Workflow for Hadirin HR."""

from datetime import timedelta
from typing import Any, Dict

from temporalio import workflow
from temporalio.common import RetryPolicy


@workflow.defn(name="OvertimeWorkflow")
class OvertimeWorkflow:
    """Durable Temporal State Machine for Hadirin Overtime Submissions (`OVERTIME_CLAIM`)."""

    @workflow.run
    async def run(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        intent = str(payload.get("intent") or "OVERTIME_CLAIM")
        raw_text = str(payload.get("raw_text") or payload.get("raw_message") or "")
        dry_run = bool(payload.get("dry_run", False))
        sender_name = payload.get("sender_name") or "Karyawan"

        workflow.logger.info(
            f"[OvertimeWorkflow] Starting for sender={sender_name}"
        )

        default_retry = RetryPolicy(
            initial_interval=timedelta(seconds=1),
            maximum_interval=timedelta(seconds=10),
            maximum_attempts=3,
        )

        # Step 1: Extract overtime hours & reason via LLM Provider Activity
        extracted_draft = await workflow.execute_activity(
            "invoke_llm_activity",
            {
                "intent": "OVERTIME_CLAIM",
                "raw_text": raw_text,
                "prompt_user": raw_text,
                "user_id": payload.get("user_id"),
                "telegram_id": payload.get("telegram_id"),
            },
            start_to_close_timeout=timedelta(seconds=45),
            retry_policy=default_retry,
        )

        # Step 2: Validate against UU Cipta Kerja / PP 35/2021 Overtime Limits (max 4h/day)
        validation_result = await workflow.execute_activity(
            "validate_quota_activity",
            {
                "intent": "OVERTIME_CLAIM",
                "user_id": payload.get("user_id"),
                "telegram_id": payload.get("telegram_id"),
                "tenant_id": payload.get("tenant_id"),
                "sender_name": sender_name,
                "leader_id": payload.get("leader_id"),
                "extracted_draft": extracted_draft,
            },
            start_to_close_timeout=timedelta(seconds=15),
            retry_policy=default_retry,
        )

        if not validation_result.get("is_valid", False):
            return {
                "workflow": "OvertimeWorkflow",
                "status": "REJECTED_BY_POLICY",
                "intent": intent,
                "llm_extraction": extracted_draft,
                "validation": validation_result,
                "notification": None,
                "reply_message": (
                    f"Pengajuan lembur melebihi batas regulasi: {validation_result.get('reason')}"
                ),
            }

        # Step 3: Notify Leader for Overtime Approval
        hours = validation_result.get("duration_hours", extracted_draft.get("duration_hours", 3.0))
        synthetic_commit = {
            "dry_run": dry_run,
            "leave_id": f"OT-AI-{str(payload.get('user_id') or '01')[-4:]}",
            "tenant_id": validation_result.get("tenant_id") or payload.get("tenant_id"),
            "start_date": extracted_draft.get("date"),
            "end_date": extracted_draft.get("date"),
            "total_days": f"{hours} jam",
            "reason": extracted_draft.get("reason", "Lembur operasional"),
            "status": validation_result.get("target_initial_status", "pending_leader"),
        }

        notification_result = await workflow.execute_activity(
            "notify_leader_activity",
            {
                "commit_result": synthetic_commit,
                "validation": validation_result,
                "sender_name": sender_name,
            },
            start_to_close_timeout=timedelta(seconds=20),
            retry_policy=default_retry,
        )

        return {
            "workflow": "OvertimeWorkflow",
            "status": "PENDING_LEADER_APPROVAL",
            "intent": intent,
            "llm_extraction": extracted_draft,
            "validation": validation_result,
            "notification": notification_result,
            "reply_message": notification_result.get("telegram_reply_card"),
        }

