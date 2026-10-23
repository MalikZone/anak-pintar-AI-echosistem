"""Temporal Worker Entrypoint for Anak Pintar Shared AI Orchestration.

Listens on task queue `HADIRIN_HR_QUEUE` (and optionally `LISA_FINANCE_QUEUE`)
and registers domain-partitioned workflows and atomic activities.
"""

import asyncio
import logging
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from temporalio.client import Client
from temporalio.worker import Worker

# Ensure current directory is on sys.path
CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

# Load environment from AI-shared-orchestration/.env
ROOT_ENV = CURRENT_DIR.parent / ".env"
if ROOT_ENV.exists():
    load_dotenv(ROOT_ENV)

from activities.common.invoke_llm_activity import invoke_llm_activity
from activities.hadirin.commit_leave_activity import commit_leave_activity
from activities.hadirin.notify_leader_activity import notify_leader_activity
from activities.hadirin.validate_quota_activity import validate_quota_activity
from workflows.hadirin.leave_request_workflow import LeaveRequestWorkflow
from workflows.hadirin.overtime_workflow import OvertimeWorkflow
from workflows.lisa.gold_price_cron_workflow import GoldPriceInquiryWorkflow

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("temporal-worker")


async def run_worker() -> None:
    raw_host = os.getenv("TEMPORAL_HOST", "localhost")
    raw_port = os.getenv("TEMPORAL_PORT", "7233")
    temporal_target = raw_host if ":" in raw_host else f"{raw_host}:{raw_port}"
    temporal_namespace = os.getenv("TEMPORAL_NAMESPACE", "default")
    task_queue = os.getenv("TEMPORAL_HADIRIN_TASK_QUEUE", os.getenv("TEMPORAL_HADIRIN_QUEUE", "HADIRIN_HR_QUEUE"))

    logger.info(
        f"Connecting to Temporal Server at {temporal_target} "
        f"(namespace='{temporal_namespace}', queue='{task_queue}')..."
    )
    client = await Client.connect(temporal_target, namespace=temporal_namespace)

    worker = Worker(
        client,
        task_queue=task_queue,
        workflows=[
            LeaveRequestWorkflow,
            OvertimeWorkflow,
            GoldPriceInquiryWorkflow,
        ],
        activities=[
            invoke_llm_activity,
            validate_quota_activity,
            commit_leave_activity,
            notify_leader_activity,
        ],
    )

    logger.info(
        f"Temporal Worker started and polling '{task_queue}'. "
        f"Registered workflows: LeaveRequestWorkflow, OvertimeWorkflow, GoldPriceInquiryWorkflow"
    )
    await worker.run()


if __name__ == "__main__":
    try:
        asyncio.run(run_worker())
    except KeyboardInterrupt:
        logger.info("Temporal Worker shut down gracefully.")
