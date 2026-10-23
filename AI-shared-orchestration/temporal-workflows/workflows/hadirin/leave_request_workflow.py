"""Leave Request & Quota Check Saga Workflow for Hadirin HR."""

from datetime import timedelta
from typing import Any, Dict

from temporalio import workflow
from temporalio.common import RetryPolicy


@workflow.defn(name="LeaveRequestWorkflow")
class LeaveRequestWorkflow:
    """Durable Temporal State Machine for Hadirin Leave Requests, Sick Leave, and Quota Inquiries.

    Orchestrates 4 atomic activities in sequence:
    1. invoke_llm_activity: Extract structured leave entities via active LLM Provider (Mock / Ollama).
    2. validate_quota_activity: Deterministic quota & Segregation of Duties enforcement against MySQL Hadirin.
    3. commit_leave_activity: Insert pending leave row into hadirin.leaves (supports dry_run).
    4. notify_leader_activity: Create HITL notification & Telegram approval card for employee's manager.
    """

    @workflow.run
    async def run(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        intent = str(payload.get("intent") or "ANNUAL_LEAVE_REQUEST")
        raw_text = str(payload.get("raw_text") or payload.get("raw_message") or "")
        dry_run = bool(payload.get("dry_run", False))
        sender_name = payload.get("sender_name") or "Karyawan"

        workflow.logger.info(
            f"[LeaveRequestWorkflow] Starting for intent={intent} sender={sender_name}"
        )

        default_retry = RetryPolicy(
            initial_interval=timedelta(seconds=1),
            maximum_interval=timedelta(seconds=10),
            maximum_attempts=3,
        )

        augmented_ctx = payload.get("augmented_context") or {}
        prompt_user = augmented_ctx.get("prompt_user") or raw_text

        # Step 1: Invoke LLM Provider Activity (Mock or Ollama) to extract structured parameters
        extracted_draft = await workflow.execute_activity(
            "invoke_llm_activity",
            {
                "intent": intent,
                "raw_text": raw_text,
                "prompt_user": prompt_user,
                "user_id": payload.get("user_id"),
                "telegram_id": payload.get("telegram_id"),
            },
            start_to_close_timeout=timedelta(seconds=45),
            retry_policy=default_retry,
        )

        # Step 2: Deterministic Quota & Anti Self-Approval Validation Activity
        validation_result = await workflow.execute_activity(
            "validate_quota_activity",
            {
                "intent": intent,
                "user_id": payload.get("user_id"),
                "telegram_id": payload.get("telegram_id"),
                "tenant_id": payload.get("tenant_id"),
                "sender_name": sender_name,
                "leader_id": payload.get("leader_id"),
                "remaining_leave_quota": payload.get("remaining_leave_quota", 12),
                "extracted_draft": extracted_draft,
            },
            start_to_close_timeout=timedelta(seconds=15),
            retry_policy=default_retry,
        )

        # If this is strictly a read-only quota inquiry or policy question, return immediately without DB write
        if intent in (
            "ATTENDANCE_STATUS_QUERY",
            "LEAVE_QUOTA_INQUIRY",
            "CHECK_LEAVE_QUOTA",
            "HR_POLICY_QUESTION",
            "HR_POLICY_INQUIRY",
        ):
            rem = validation_result.get("remaining_quota", payload.get("remaining_leave_quota", 12))
            return {
                "workflow": "LeaveRequestWorkflow",
                "status": "COMPLETED_INQUIRY",
                "intent": intent,
                "llm_extraction": extracted_draft,
                "validation": validation_result,
                "commit": None,
                "notification": None,
                "reply_message": (
                    f"Halo {validation_result.get('employee_name', sender_name)}, "
                    f"sisa kuota cuti tahunan Anda saat ini adalah {rem} hari."
                ),
            }

        # If quota validation or Segregation of Duties rejected the leave request, short-circuit before DB commit
        if not validation_result.get("is_valid", False):
            return {
                "workflow": "LeaveRequestWorkflow",
                "status": "REJECTED_BY_POLICY",
                "intent": intent,
                "llm_extraction": extracted_draft,
                "validation": validation_result,
                "commit": None,
                "notification": None,
                "reply_message": (
                    f"Mohon maaf, pengajuan cuti belum dapat diproses: "
                    f"{validation_result.get('reason')}"
                ),
            }

        # Step 3: Commit Leave Record to hadirin.leaves (respects dry_run guard)
        commit_result = await workflow.execute_activity(
            "commit_leave_activity",
            {
                "dry_run": dry_run,
                "validation": validation_result,
                "extracted_draft": extracted_draft,
                "user_id": payload.get("user_id"),
                "tenant_id": payload.get("tenant_id"),
                "raw_text": raw_text,
            },
            start_to_close_timeout=timedelta(seconds=20),
            retry_policy=default_retry,
        )

        # Step 4: Notify Leader on Telegram with Interactive Approval Card (respects dry_run guard)
        notification_result = await workflow.execute_activity(
            "notify_leader_activity",
            {
                "commit_result": commit_result,
                "validation": validation_result,
                "sender_name": sender_name,
            },
            start_to_close_timeout=timedelta(seconds=20),
            retry_policy=default_retry,
        )

        return {
            "workflow": "LeaveRequestWorkflow",
            "status": "PENDING_LEADER_APPROVAL",
            "intent": intent,
            "llm_extraction": extracted_draft,
            "validation": validation_result,
            "commit": commit_result,
            "notification": notification_result,
            "reply_message": notification_result.get("telegram_reply_card"),
        }
