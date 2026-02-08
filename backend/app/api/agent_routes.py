"""API routes for AI Agents"""
import logging
from typing import Optional
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

    # In a real implementation, would store plans in a database
    return {"message": "Plan details endpoint - to be implemented with persistent storage"}


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

    return {
        "message": "Plan execution would be started in background",
        "plan_id": plan_id,
        "status": "This endpoint needs model credentials to execute evaluations"
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
