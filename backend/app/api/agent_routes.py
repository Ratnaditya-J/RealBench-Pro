"""API routes for AI Agents"""
import asyncio
import logging
from typing import Dict, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from agents.evaluation_orchestrator import (
    EvaluationOrchestrator,
    ModelCharacteristics,
    ResourceConstraints,
    ModelRiskProfile,
    EvaluationPriority
)

router = APIRouter(prefix="/agents", tags=["agents"])
logger = logging.getLogger(__name__)

# Global orchestrator instance (will be initialized in main.py)
orchestrator: Optional[EvaluationOrchestrator] = None

# In-memory store for evaluation plans
plans_store: Dict[str, dict] = {}


def initialize_orchestrator(task_manager, evaluation_engine):
    """Initialize the orchestrator instance."""
    global orchestrator
    orchestrator = EvaluationOrchestrator(task_manager, evaluation_engine)
    logger.info("EvaluationOrchestrator initialized via API")


# Request/Response Models
class CreatePlanRequest(BaseModel):
    """Request to create an evaluation plan"""
    model_id: str
    architecture: str = "unknown"
    parameter_count: Optional[int] = None
    training_method: str = "unknown"
    risk_profile: ModelRiskProfile = ModelRiskProfile.STANDARD
    deployment_context: str = "general"
    previous_evaluations: list[str] = Field(default_factory=list)
    known_weaknesses: list[str] = Field(default_factory=list)

    # Resource constraints
    max_cost_dollars: Optional[float] = None
    max_wall_time_seconds: Optional[int] = None
    parallel_workers: int = 1

    # API keys
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None


class PlanResponse(BaseModel):
    """Response with evaluation plan"""
    plan_id: str
    model_id: str
    total_tasks: int
    priority_breakdown: dict
    estimated_cost: float
    estimated_time_seconds: float
    rationale: str
    task_ids: list[str]


class ExecutePlanRequest(BaseModel):
    """Request to execute an evaluation plan"""
    plan_id: str
    # In real implementation, would need model credentials/endpoint


@router.post("/orchestrator/plan", response_model=PlanResponse)
async def create_evaluation_plan(request: CreatePlanRequest):
    """
    Create an intelligent evaluation plan for a model.

    The orchestrator will:
    - Analyze model characteristics and risk profile
    - Select appropriate tasks with priorities
    - Estimate costs and timing
    - Optimize execution order
    """
    if not orchestrator:
        raise HTTPException(status_code=500, detail="Orchestrator not initialized")

    # Build model characteristics
    model_chars = ModelCharacteristics(
        model_id=request.model_id,
        architecture=request.architecture,
        parameter_count=request.parameter_count,
        training_method=request.training_method,
        risk_profile=request.risk_profile,
        previous_evaluations=request.previous_evaluations,
        known_weaknesses=request.known_weaknesses,
        deployment_context=request.deployment_context
    )

    # Build resource constraints
    constraints = ResourceConstraints(
        max_cost_dollars=request.max_cost_dollars,
        max_wall_time_seconds=request.max_wall_time_seconds,
        parallel_workers=request.parallel_workers
    )

    # Create plan
    plan = await orchestrator.create_evaluation_plan(model_chars, constraints)

    # Store plan in memory
    plans_store[plan.plan_id] = {
        "plan_id": plan.plan_id,
        "model_id": plan.model_characteristics.model_id,
        "total_tasks": len(plan.selected_tasks),
        "priority_breakdown": plan.priority_breakdown,
        "estimated_cost": plan.estimated_cost,
        "estimated_time_seconds": plan.estimated_time_seconds,
        "rationale": plan.rationale,
        "task_ids": plan.execution_order,
        "selected_tasks": plan.selected_tasks,
        "plan_object": plan
    }

    return PlanResponse(
        plan_id=plan.plan_id,
        model_id=plan.model_characteristics.model_id,
        total_tasks=len(plan.selected_tasks),
        priority_breakdown=plan.priority_breakdown,
        estimated_cost=plan.estimated_cost,
        estimated_time_seconds=plan.estimated_time_seconds,
        rationale=plan.rationale,
        task_ids=plan.execution_order
    )


@router.get("/orchestrator/plans/{plan_id}")
async def get_plan_details(plan_id: str):
    """Get detailed information about an evaluation plan"""
    if not orchestrator:
        raise HTTPException(status_code=500, detail="Orchestrator not initialized")

    # Look up the plan in memory
    if plan_id not in plans_store:
        raise HTTPException(status_code=404, detail=f"Plan {plan_id} not found")

    plan = plans_store[plan_id]
    return {
        "plan_id": plan["plan_id"],
        "model_id": plan["model_id"],
        "total_tasks": plan["total_tasks"],
        "priority_breakdown": plan["priority_breakdown"],
        "estimated_cost": plan["estimated_cost"],
        "estimated_time_seconds": plan["estimated_time_seconds"],
        "rationale": plan["rationale"],
        "task_ids": plan["task_ids"]
    }


async def _background_execute_plan(plan_id: str, plan: dict):
    """Background task to execute plan evaluations."""
    try:
        logger.info(f"Starting background execution of plan {plan_id}")
        task_ids = plan.get("task_ids", [])
        model_id = plan.get("model_id")
        all_results = []

        if not model_id:
            logger.error(f"Plan {plan_id} is missing model_id, cannot execute")
            plans_store[plan_id]["status"] = "failed"
            plans_store[plan_id]["error"] = "Missing model_id"
            return

        plans_store[plan_id]["status"] = "running"

        # Execute each task in the plan
        for idx, task_id in enumerate(task_ids):
            try:
                logger.info(f"Executing task {idx + 1}/{len(task_ids)}: {task_id}")

                if orchestrator and orchestrator.evaluation_engine and orchestrator.task_manager:
                    # Get the task object from the task manager
                    task = orchestrator.task_manager.get_task(task_id)
                    if task is None:
                        logger.warning(f"Task {task_id} not found, skipping")
                        continue

                    # Run the evaluation using the correct method
                    result = await orchestrator.evaluation_engine.evaluate_single(task, model_id)
                    all_results.append(result)
                    logger.info(f"Task {task_id} completed: score={result.overall_score:.3f}")
                else:
                    logger.warning(f"Evaluation engine or task manager not available for task {task_id}")

            except Exception as e:
                logger.error(f"Error executing task {task_id}: {e}")
                continue

        # Update evaluation history and baselines for regression tracking
        if orchestrator and all_results:
            orchestrator.update_model_baseline(model_id, all_results)
            logger.info(f"Updated baseline for {model_id} with {len(all_results)} results")

        plans_store[plan_id]["status"] = "completed"
        plans_store[plan_id]["results_count"] = len(all_results)
        logger.info(f"Background execution of plan {plan_id} completed: {len(all_results)}/{len(task_ids)} tasks")

    except Exception as e:
        logger.error(f"Background execution of plan {plan_id} failed: {e}")
        plans_store[plan_id]["status"] = "failed"
        plans_store[plan_id]["error"] = str(e)


@router.post("/orchestrator/execute/{plan_id}")
async def execute_plan(plan_id: str):
    """
    Execute an evaluation plan (background task).

    Note: This is a simplified version. In production, you would:
    - Store the plan in a database
    - Run execution in a background worker
    - Provide real-time status updates
    """
    if not orchestrator:
        raise HTTPException(status_code=500, detail="Orchestrator not initialized")

    # Look up the plan
    if plan_id not in plans_store:
        raise HTTPException(status_code=404, detail=f"Plan {plan_id} not found")

    plan = plans_store[plan_id]

    # Create a background task to execute the plan
    asyncio.create_task(_background_execute_plan(plan_id, plan))

    return {
        "plan_id": plan_id,
        "status": "started",
        "message": "Plan execution started in background"
    }


@router.get("/orchestrator/stats")
async def get_orchestrator_stats():
    """Get orchestrator statistics and metrics"""
    if not orchestrator:
        raise HTTPException(status_code=500, detail="Orchestrator not initialized")

    return {
        "total_models_tracked": len(orchestrator.model_baselines),
        "total_evaluations": sum(
            baseline["evaluation_count"]
            for baseline in orchestrator.model_baselines.values()
        ),
        "task_stats": dict(orchestrator.task_execution_stats),
        "models": list(orchestrator.model_baselines.keys())
    }


@router.post("/orchestrator/regression-check")
async def check_regressions(
    model_id: str,
    baseline_model_id: Optional[str] = None,
    threshold: float = 0.1
):
    """
    Check for performance regressions against baseline.

    Compares recent evaluation results against a baseline model/version.
    """
    if not orchestrator:
        raise HTTPException(status_code=500, detail="Orchestrator not initialized")

    # Get latest results for the model
    results = orchestrator.evaluation_history.get(model_id, [])

    if not results:
        raise HTTPException(
            status_code=404,
            detail=f"No evaluation results found for model {model_id}"
        )

    # Perform regression analysis
    analysis = orchestrator.detect_regressions(
        model_id=model_id,
        new_results=results,
        baseline_model_id=baseline_model_id,
        threshold=threshold
    )

    return analysis
