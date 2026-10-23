"""Lisa Domain Multi-App Isolation Demo Workflow (Gold Price & Buyback)."""

from datetime import timedelta
from typing import Any, Dict

from temporalio import workflow
from temporalio.common import RetryPolicy


@workflow.defn(name="GoldPriceInquiryWorkflow")
class GoldPriceInquiryWorkflow:
    """Isolated Temporal Workflow for the Lisa Gold/Financial App (`LISA_FINANCE_QUEUE`)."""

    @workflow.run
    async def run(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        workflow.logger.info(
            f"[GoldPriceInquiryWorkflow] Executing Lisa workflow for intent={payload.get('intent')}"
        )

        llm_result = await workflow.execute_activity(
            "invoke_llm_activity",
            {
                "intent": payload.get("intent", "GOLD_PRICE_INQUIRY"),
                "raw_message": payload.get("raw_message", ""),
                "employee_context": payload.get("employee_context", {}),
                "policy_chunks": payload.get("policy_chunks", []),
                "llm_provider": payload.get("llm_provider"),
            },
            start_to_close_timeout=timedelta(seconds=30),
            retry_policy=RetryPolicy(maximum_attempts=2),
        )

        return {
            "workflow": "GoldPriceInquiryWorkflow",
            "status": "COMPLETED",
            "domain": "lisa",
            "llm_extraction": llm_result,
        }

