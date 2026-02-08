"""API routes for RealBench Pro."""
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException, BackgroundTasks, Query, Depends
from pydantic import BaseModel

from app.core.auth import require_admin_auth
from app.core.contamination import ContaminationDetector
from app.core.evaluator import EvaluationEngine
from app.core.safety_detection import SafetyDetector
from app.core.task_manager import TaskManager
from app.db.database import Database
from app.models.schemas import (
    CreateTaskRequest,
    EvaluateRequest,
    EvaluateResponse,
    LeaderboardResponse,
    Task,
    TaskDifficulty,
    TaskDomain,
)

router = APIRouter()
logger = logging.getLogger(__name__)

# Global instances (will be initialized in main.py)
task_manager: Optional[TaskManager] = None
evaluation_engine: Optional[EvaluationEngine] = None
contamination_detector: Optional[ContaminationDetector] = None
database: Optional[Database] = None
ensemble_safety_detector: Optional['EnsembleSafetyDetector'] = None  # Optional multi-model ensemble
safety_detector: Optional[SafetyDetector] = None  # Basic keyword + pattern safety detection

# REMOVED: evaluation_status global dict - now using database for thread-safe status tracking
# evaluation_status: Dict[str, Dict] = {}

# API keys storage (loaded from .env and can be updated at runtime)
# NOTE: These are kept in memory only for the current session
# They are NOT persisted to disk for security reasons
stored_api_keys: Dict[str, str] = {}


class ApiKeyUpdate(BaseModel):
    """Request model for updating API keys."""
    openai: Optional[str] = None
    anthropic: Optional[str] = None
    google: Optional[str] = None
    xai: Optional[str] = None
    deepseek: Optional[str] = None
    openrouter: Optional[str] = None
    mistral: Optional[str] = None


class ApiKeyStatus(BaseModel):
    """Response model showing which API keys are configured."""
    openai: bool = False
    anthropic: bool = False
    google: bool = False
    xai: bool = False
    deepseek: bool = False
    openrouter: bool = False
    mistral: bool = False


def load_api_keys_from_env():
    """Load API keys from environment variables."""
    global stored_api_keys
    key_mapping = {
        "openai": "OPENAI_API_KEY",
        "anthropic": "ANTHROPIC_API_KEY",
        "google": "GOOGLE_API_KEY",
        "xai": "XAI_API_KEY",
        "deepseek": "DEEPSEEK_API_KEY",
        "openrouter": "OPENROUTER_API_KEY",
        "mistral": "MISTRAL_API_KEY",
    }
    for key_name, env_var in key_mapping.items():
        value = os.getenv(env_var)
        if value:
            stored_api_keys[key_name] = value
    logger.info(f"Loaded {len(stored_api_keys)} API keys from environment")


# REMOVED: save_api_keys_to_env_file() - Security vulnerability
# API keys should NEVER be written to files. They are managed in memory only
# and must be set via environment variables before server startup.


def initialize_services(tm, ee, cd, db, esd=None, sd=None):
    """Initialize global service instances."""
    global task_manager, evaluation_engine, contamination_detector, database, ensemble_safety_detector, safety_detector
    task_manager = tm
    evaluation_engine = ee
    contamination_detector = cd
    database = db
    ensemble_safety_detector = esd
    safety_detector = sd

    # Load API keys from environment
    load_api_keys_from_env()

    # Update evaluation engine with stored keys
    if evaluation_engine and stored_api_keys:
        evaluation_engine.api_keys.update(stored_api_keys)


# Background task for async evaluation
async def run_evaluation_background(
    evaluation_id: str,
    task_id: str,
    model_ids: List[str],
    check_contamination: bool,
    use_ensemble_safety: bool = True,
    api_keys: Optional[Dict] = None
):
    """Run evaluation in background with status tracking."""
    if not task_manager or not evaluation_engine or not contamination_detector or not database:
        logger.error("Services not initialized")
        if database:
            database.update_evaluation_status(
                evaluation_id,
                status="failed",
                error="Services not initialized"
            )
        return

    # Initialize status in database (replaces global dict)
    try:
        database.create_evaluation_status(evaluation_id, task_id, model_ids)
        database.update_evaluation_status(evaluation_id, status="running")
    except Exception as e:
        logger.error(f"Failed to create evaluation status: {e}")
        return

    task = task_manager.get_task(task_id)
    if not task:
        database.update_evaluation_status(
            evaluation_id,
            status="failed",
            error=f"Task {task_id} not found"
        )
        logger.error(f"Task {task_id} not found")
        return

    # Create a copy of API keys for this request (avoid race conditions)
    request_api_keys = evaluation_engine.api_keys.copy()
    # Also include stored API keys
    request_api_keys.update(stored_api_keys)
    if api_keys:
        request_api_keys.update(api_keys)
        logger.info("Using provided API keys for evaluation")

    # Update evaluation engine's keys for this run
    evaluation_engine.api_keys = request_api_keys

    try:
        # Run evaluations
        results = await evaluation_engine.evaluate_batch(task, model_ids)

        # Save results
        for i, result in enumerate(results):
            # Check contamination if requested
            if check_contamination:
                contamination_report = await contamination_detector.check_response_contamination(
                    task=task,
                    model_id=result.model_id,
                    response=result.model_output.raw_response,
                    latency_ms=result.model_output.latency_ms,
                    tokens_used=result.model_output.tokens_used,
                )
                result.contamination_score = contamination_report.confidence if contamination_report.is_contaminated else 0.0
                database.save_contamination_report(contamination_report)

            # Run basic keyword + pattern safety detection (always on)
            if safety_detector:
                try:
                    safety_report = safety_detector.generate_comprehensive_report(
                        task_id=task.task_id,
                        model_id=result.model_id,
                        response=result.model_output.raw_response,
                        cot=None,  # TODO: Extract reasoning trace if available
                        task_context={"task_type": task.domain.value if hasattr(task.domain, 'value') else str(task.domain)},
                    )
                    # Save each detected signal to the database
                    for signal in safety_report.signals:
                        if signal.detected:
                            database.save_safety_signal({
                                "evaluation_id": result.evaluation_id,
                                "task_id": task.task_id,
                                "model_id": result.model_id,
                                "signal_type": signal.signal_type.value,
                                "severity": signal.risk_level.value,
                                "confidence": signal.confidence,
                                "description": signal.evidence,
                                "evidence": [signal.evidence],
                                "details": {
                                    "recommendation": safety_report.recommendation,
                                    "overall_risk": safety_report.overall_risk.value,
                                },
                            })
                    logger.info(f"Safety detection: {safety_report.overall_risk.value} ({len(safety_report.signals)} signals) for {result.model_id}")
                except Exception as e:
                    logger.error(f"Basic safety detection failed: {e}")
                    # Don't fail the entire evaluation if safety detection fails

            # Run ensemble safety detection if enabled (both backend config and request option)
            if ensemble_safety_detector and use_ensemble_safety:
                try:
                    ensemble_report = await ensemble_safety_detector.evaluate(
                        task_id=task.task_id,
                        model_id=result.model_id,
                        response=result.model_output.raw_response,
                        cot=None  # TODO: Extract reasoning trace if available
                    )
                    database.save_ensemble_report(ensemble_report)
                    logger.info(f"Ensemble safety: {ensemble_report.ensemble_risk.value} @ {ensemble_report.ensemble_confidence:.0%}")
                except Exception as e:
                    logger.error(f"Ensemble safety detection failed: {e}")
                    # Don't fail the entire evaluation if ensemble fails

            database.save_evaluation(result)

            # Update progress in database
            progress = int(((i + 1) / len(model_ids)) * 100)
            database.update_evaluation_status(
                evaluation_id,
                progress=progress,
                completed=i + 1
            )

        database.update_evaluation_status(evaluation_id, status="completed")
        logger.info(f"Evaluation {evaluation_id} completed successfully")

    except Exception as e:
        database.update_evaluation_status(
            evaluation_id,
            status="failed",
            error=str(e)
        )
        logger.error(f"Evaluation {evaluation_id} failed: {e}", exc_info=True)


@router.post("/evaluate", response_model=EvaluateResponse)
async def evaluate_task(request: EvaluateRequest, background_tasks: BackgroundTasks):
    """
    Evaluate a task across multiple models.
    Runs in background and returns immediately.
    """
    if not task_manager:
        raise HTTPException(status_code=500, detail="Task manager not initialized")

    # Validate task exists
    task = task_manager.get_task(request.task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task {request.task_id} not found")

    # Validate models
    if not request.models:
        raise HTTPException(status_code=400, detail="No models specified")

    # Validate API keys if provided
    api_keys = {}
    if request.openai_api_key:
        api_keys["openai"] = request.openai_api_key
    if request.anthropic_api_key:
        api_keys["anthropic"] = request.anthropic_api_key

    # Generate a single evaluation ID for this batch
    evaluation_id = str(uuid.uuid4())

    # Schedule background task with the evaluation ID
    background_tasks.add_task(
        run_evaluation_background,
        evaluation_id,
        request.task_id,
        request.models,
        request.check_contamination,
        request.use_ensemble_safety,
        api_keys if api_keys else None
    )

    return EvaluateResponse(
        evaluation_ids=[evaluation_id],
        status="scheduled",
        message=f"Evaluation scheduled for {len(request.models)} model(s). Track status at /api/v1/status/{evaluation_id}"
    )


@router.get("/status/{evaluation_id}")
async def get_evaluation_status_endpoint(evaluation_id: str):
    """Get real-time status of an evaluation."""
    if not database:
        raise HTTPException(status_code=500, detail="Database not initialized")

    status = database.get_evaluation_status(evaluation_id)
    if not status:
        raise HTTPException(
            status_code=404,
            detail="Evaluation not found. It may have expired or never existed."
        )

    return status


@router.get("/results/{evaluation_id}")
async def get_evaluation_result(evaluation_id: str):
    """Get evaluation result by ID."""
    if not database:
        raise HTTPException(status_code=500, detail="Database not initialized")

    result = database.get_evaluation(evaluation_id)
    if not result:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    return result


@router.get("/leaderboard", response_model=LeaderboardResponse)
async def get_leaderboard(limit: int = Query(default=50, le=100)):
    """Get current model leaderboard."""
    if not database or not task_manager:
        raise HTTPException(status_code=500, detail="Services not initialized")

    leaderboard = database.get_leaderboard(limit=limit)

    return LeaderboardResponse(
        leaderboard=leaderboard,
        total_tasks=task_manager.count_tasks(),
        total_models=len(leaderboard)
    )


@router.get("/tasks", response_model=List[Task])
async def list_tasks(
    domain: Optional[TaskDomain] = None,
    difficulty: Optional[TaskDifficulty] = None,
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0, le=10000)
):
    """List available tasks with optional filtering."""
    if not task_manager:
        raise HTTPException(status_code=500, detail="Task manager not initialized")

    tasks = task_manager.list_tasks(
        domain=domain,
        difficulty=difficulty,
        limit=limit,
        offset=offset
    )
    return tasks


@router.get("/tasks/{task_id}", response_model=Task)
async def get_task(task_id: str):
    """Get a specific task by ID."""
    if not task_manager:
        raise HTTPException(status_code=500, detail="Task manager not initialized")

    task = task_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.post("/tasks", response_model=Task)
async def create_task(request: CreateTaskRequest):
    """Create a new custom task."""
    if not task_manager:
        raise HTTPException(status_code=500, detail="Task manager not initialized")

    task = Task(
        task_id=f"custom-{uuid.uuid4().hex[:8]}",
        title=request.title,
        description=request.description,
        domain=request.domain,
        difficulty=request.difficulty,
        prompt=request.prompt,
        expected_output_type=request.expected_output_type,
        reference_answer=request.reference_answer,
        evaluation_criteria=request.evaluation_criteria or [],
        created_at=datetime.now(timezone.utc),
    )

    task_manager.add_task(task)
    return task


@router.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    """Delete a task."""
    if not task_manager:
        raise HTTPException(status_code=500, detail="Task manager not initialized")

    success = task_manager.delete_task(task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"status": "deleted", "task_id": task_id}


# =============================================================================
# RESEARCH LEVEL MATH - FrontierMath: Open Problems (NEW Feb 2026)
# =============================================================================

@router.get("/research-math/problems")
async def list_research_math_problems(
    notability: Optional[str] = None,
    field: Optional[str] = None
):
    """
    List research-level math problems from FrontierMath: Open Problems.
    
    Subset of 6 problems with constructive solutions we can partially verify.
    These are unsolved problems that professional mathematicians have tried and failed to solve.
    
    Source: https://epoch.ai/frontiermath/open-problems
    """
    from app.tasks.research_math import (
        get_open_problems, 
        Notability,
        MathField,
        PROBLEM_STATS
    )
    
    problems = get_open_problems()
    
    # Filter by notability if specified
    if notability:
        try:
            notability_enum = Notability(notability)
            problems = [p for p in problems if p.notability == notability_enum]
        except ValueError:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid notability. Choose from: {[n.value for n in Notability]}"
            )
    
    # Filter by field if specified
    if field:
        try:
            field_enum = MathField(field)
            problems = [p for p in problems if p.field == field_enum]
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid field. Choose from: {[f.value for f in MathField]}"
            )
    
    return {
        "problems": [
            {
                "problem_id": p.problem_id,
                "title": p.title,
                "field": p.field.value,
                "short_description": p.short_description,
                "notability": p.notability.value,
                "attribution": p.attribution,
                "solved": p.solved,
                "time_horizon": p.time_horizon,
                "solvability": p.solvability,
                "verifier_type": p.verifier_type.value,
                "verifier_description": p.verifier_description,
                "has_prompt": p.prompt is not None,
            }
            for p in problems
        ],
        "total": len(problems),
        "stats": PROBLEM_STATS,
    }


@router.get("/research-math/problems/{problem_id}")
async def get_research_math_problem(problem_id: str):
    """Get a specific research-level math problem with full details."""
    from app.tasks.research_math import get_open_problems
    
    problems = get_open_problems()
    problem = next((p for p in problems if p.problem_id == problem_id), None)
    
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    return {
        "problem_id": problem.problem_id,
        "title": problem.title,
        "field": problem.field.value,
        "short_description": problem.short_description,
        "notability": problem.notability.value,
        "attribution": problem.attribution,
        "solved": problem.solved,
        "familiar_mathematicians": problem.familiar_mathematicians,
        "attempted_mathematicians": problem.attempted_mathematicians,
        "time_horizon": problem.time_horizon,
        "notability_survey": problem.notability_survey,
        "published": problem.published,
        "likelihood_novel_math": problem.likelihood_novel_math,
        "solvability": problem.solvability,
        "prompt": problem.prompt,
        "warmup_prompt": problem.warmup_prompt,
        "source_url": f"https://epoch.ai/frontiermath/open-problems/{problem_id}",
    }


@router.get("/research-math/stats")
async def get_research_math_stats():
    """Get statistics about research-level math problems."""
    from app.tasks.research_math import PROBLEM_STATS
    return PROBLEM_STATS


# =============================================================================
# RISK CATEGORIES - Hierarchical organization of all safety signals
# =============================================================================

@router.get("/categories")
async def get_risk_categories():
    """
    Get the hierarchical organization of all safety signals and evaluation categories.

    Structure:
    - 🔴 Critical Risks (Self-Improvement, Self-Preservation, Sabotage)
    - 🟠 Deception Risks (Strategic Deception, Manipulation, Collusion)
    - 🟢 Capability Evaluation (Benchmarks, Contamination, Research Math)
    - ⚙️ Detection Methods (Keyword, Reasoning Trace, Behavioral, Ensemble)
    """
    from app.core.risk_categories import (
        get_all_categories, 
        SIGNAL_CATALOG, 
        RISK_STATS
    )
    
    categories = []
    for cat in get_all_categories():
        subcategories = []
        for sub in cat.subcategories:
            signals = []
            for sig_type in sub.signals:
                if sig_type in SIGNAL_CATALOG:
                    sig = SIGNAL_CATALOG[sig_type]
                    signals.append({
                        "signal_type": sig.signal_type,
                        "name": sig.name,
                        "description": sig.description,
                        "plain_english": sig.plain_english,
                        "what_it_means": sig.what_it_means,
                        "recommended_action": sig.recommended_action,
                        "icon": sig.icon,
                        "color": sig.color,
                    })
            subcategories.append({
                "id": sub.subcategory.value,
                "name": sub.name,
                "description": sub.description,
                "icon": sub.icon,
                "signals": signals,
                "signal_count": len(signals),
            })
        
        categories.append({
            "id": cat.severity.value,
            "name": cat.name,
            "description": cat.description,
            "icon": cat.icon,
            "color": cat.color,
            "bg_color": cat.bg_color,
            "border_color": cat.border_color,
            "subcategories": subcategories,
            "total_signals": sum(len(sub.signals) for sub in cat.subcategories),
        })
    
    return {
        "categories": categories,
        "stats": RISK_STATS,
    }


@router.get("/signals/{signal_type}")
async def get_signal_detail(signal_type: str):
    """Get detailed information about a specific signal type with plain English explanation."""
    from app.core.risk_categories import get_signal_info
    
    info = get_signal_info(signal_type)
    if not info:
        raise HTTPException(status_code=404, detail=f"Signal type not found: {signal_type}")
    
    return {
        "signal_type": info.signal_type,
        "name": info.name,
        "description": info.description,
        "plain_english": info.plain_english,
        "what_it_means": info.what_it_means,
        "recommended_action": info.recommended_action,
        "severity": info.severity.value,
        "subcategory": info.subcategory.value,
        "icon": info.icon,
        "color": info.color,
    }


@router.get("/categories/{category_id}")
async def get_category_detail(category_id: str):
    """Get detailed information about a specific category."""
    from app.core.risk_categories import RiskSeverity, get_category_info, SIGNAL_CATALOG
    
    try:
        severity = RiskSeverity(category_id)
    except ValueError:
        raise HTTPException(status_code=404, detail=f"Category not found: {category_id}")
    
    cat = get_category_info(severity)
    if not cat:
        raise HTTPException(status_code=404, detail=f"Category not found: {category_id}")
    
    subcategories = []
    for sub in cat.subcategories:
        signals = []
        for sig_type in sub.signals:
            if sig_type in SIGNAL_CATALOG:
                sig = SIGNAL_CATALOG[sig_type]
                signals.append({
                    "signal_type": sig.signal_type,
                    "name": sig.name,
                    "description": sig.description,
                    "icon": sig.icon,
                    "color": sig.color,
                })
        subcategories.append({
            "id": sub.subcategory.value,
            "name": sub.name,
            "description": sub.description,
            "icon": sub.icon,
            "signals": signals,
        })
    
    return {
        "id": cat.severity.value,
        "name": cat.name,
        "description": cat.description,
        "icon": cat.icon,
        "color": cat.color,
        "bg_color": cat.bg_color,
        "border_color": cat.border_color,
        "subcategories": subcategories,
    }


class VerifySolutionRequest(BaseModel):
    """Request model for verifying a research math solution."""
    problem_id: str
    solution: str


@router.post("/research-math/verify")
async def verify_research_math_solution(request: VerifySolutionRequest):
    """
    Verify a proposed solution for a research-level math problem.
    
    Returns verification status and detailed checks.
    """
    from app.core.research_math_verifiers import verify_solution, VERIFIERS
    
    if request.problem_id not in VERIFIERS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown problem ID. Available: {list(VERIFIERS.keys())}"
        )
    
    result = verify_solution(request.problem_id, request.solution)
    
    return {
        "status": result.status.value,
        "problem_id": result.problem_id,
        "is_valid": result.is_valid,
        "confidence": result.confidence,
        "message": result.message,
        "checks_passed": result.checks_passed,
        "checks_failed": result.checks_failed,
        "details": result.details,
    }


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    if not task_manager:
        raise HTTPException(status_code=500, detail="Task manager not initialized")

    return {
        "status": "healthy",
        "total_tasks": task_manager.count_tasks(),
        "version": "0.1.0"
    }


# ============= EVALUATIONS LIST ENDPOINT =============

class EvaluationListResponse(BaseModel):
    """Response for listing evaluations."""
    evaluations: List[Dict]
    total: int
    limit: int
    offset: int


@router.get("/evaluations", response_model=EvaluationListResponse)
async def list_evaluations(
    task_id: Optional[str] = Query(None, description="Filter by task ID"),
    model_id: Optional[str] = Query(None, description="Filter by model ID"),
    limit: int = Query(default=50, le=200, description="Max results to return"),
    offset: int = Query(default=0, ge=0, le=10000, description="Offset for pagination")
):
    """List all evaluations with optional filtering."""
    if not database:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    evaluations = database.get_evaluations(
        task_id=task_id,
        model_id=model_id,
        limit=limit,
        offset=offset
    )
    
    total = database.count_evaluations(task_id=task_id, model_id=model_id)
    
    return EvaluationListResponse(
        evaluations=evaluations,
        total=total,
        limit=limit,
        offset=offset
    )


# ============= SAFETY SIGNALS ENDPOINT =============

class SafetySignalResponse(BaseModel):
    """Individual safety signal from API."""
    signal_id: str
    evaluation_id: Optional[str] = None
    task_id: Optional[str] = None
    model_id: str
    signal_type: str
    severity: str
    confidence: float
    description: str
    evidence: List[str] = []
    created_at: Optional[str] = None


class SafetySignalsListResponse(BaseModel):
    """Response for listing safety signals."""
    signals: List[Dict]
    total: int


@router.get("/safety-signals", response_model=SafetySignalsListResponse)
async def list_safety_signals(
    model_id: Optional[str] = Query(None, description="Filter by model ID"),
    severity: Optional[str] = Query(None, description="Filter by severity (none, low, medium, high, critical)"),
    limit: int = Query(default=100, le=500, description="Max results to return")
):
    """
    List safety signals detected during evaluations.
    
    Safety signals indicate potentially concerning behaviors like:
    - Alignment faking
    - Strategic deception
    - Code sabotage
    - Self-preservation attempts
    - Manipulation
    """
    if not database:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    # Validate severity if provided
    valid_severities = ["none", "low", "medium", "high", "critical"]
    if severity and severity.lower() not in valid_severities:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid severity. Must be one of: {valid_severities}"
        )
    
    signals = database.get_safety_signals(
        model_id=model_id,
        severity=severity.lower() if severity else None,
        limit=limit
    )
    
    return SafetySignalsListResponse(
        signals=signals,
        total=len(signals)
    )


# ========== Ensemble Safety Endpoints ==========

class EnsembleEvaluateRequest(BaseModel):
    """Request model for ensemble safety evaluation."""
    task_id: str
    model_id: str
    response: str
    cot: Optional[str] = None
    evaluation_id: Optional[str] = None  # Link to existing evaluation


class EnsembleReportResponse(BaseModel):
    """Response model for ensemble reports."""
    report: Dict
    comparison: Optional[Dict] = None  # Comparison with baseline if available


@router.post("/ensemble/evaluate", response_model=EnsembleReportResponse)
async def evaluate_with_ensemble(request: EnsembleEvaluateRequest):
    """
    Run ensemble safety evaluation on a model response.

    Uses 3 specialized judges + adversarial probing for high-confidence detection.
    Requires USE_ENSEMBLE_SAFETY_DETECTOR=true in .env
    """
    if not ensemble_safety_detector:
        raise HTTPException(
            status_code=503,
            detail="Ensemble safety detector not enabled. Set USE_ENSEMBLE_SAFETY_DETECTOR=true in .env"
        )

    if not database:
        raise HTTPException(status_code=500, detail="Database not initialized")

    try:
        # Run ensemble evaluation
        ensemble_report = await ensemble_safety_detector.evaluate(
            task_id=request.task_id,
            model_id=request.model_id,
            response=request.response,
            cot=request.cot
        )

        # Add evaluation_id if provided
        if request.evaluation_id:
            ensemble_report.evaluation_id = request.evaluation_id

        # Save to database
        database.save_ensemble_report(ensemble_report)

        # Get saved report with verdicts
        saved_report = database.get_ensemble_report(ensemble_report.report_id)

        return EnsembleReportResponse(
            report=saved_report,
            comparison={
                "ensemble_confidence": ensemble_report.ensemble_confidence,
                "judge_agreement": ensemble_report.judge_agreement,
                "cost_usd": ensemble_report.total_cost_usd,
                "latency_ms": ensemble_report.total_latency_ms
            }
        )

    except Exception as e:
        logger.error(f"Ensemble evaluation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Ensemble evaluation failed: {str(e)}")


@router.get("/ensemble/reports")
async def list_ensemble_reports(
    task_id: Optional[str] = Query(None, description="Filter by task ID"),
    model_id: Optional[str] = Query(None, description="Filter by model ID"),
    limit: int = Query(default=50, le=200, description="Max results to return"),
    offset: int = Query(default=0, ge=0, description="Results offset")
):
    """
    List ensemble safety reports.

    Returns ensemble evaluations with judge verdicts and confidence scores.
    """
    if not database:
        raise HTTPException(status_code=500, detail="Database not initialized")

    try:
        reports = database.get_ensemble_reports(
            task_id=task_id,
            model_id=model_id,
            limit=limit,
            offset=offset
        )

        return {
            "reports": reports,
            "total": len(reports),
            "limit": limit,
            "offset": offset
        }

    except Exception as e:
        logger.error(f"Failed to get ensemble reports: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ensemble/reports/{report_id}")
async def get_ensemble_report(report_id: str):
    """
    Get detailed ensemble safety report by ID.

    Includes all judge verdicts, probe results, and confidence metrics.
    """
    if not database:
        raise HTTPException(status_code=500, detail="Database not initialized")

    try:
        report = database.get_ensemble_report(report_id)

        if not report:
            raise HTTPException(status_code=404, detail="Report not found")

        return report

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get ensemble report: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api-keys", response_model=ApiKeyStatus)
async def get_api_key_status():
    """Get status of which API keys are configured (not the actual keys)."""
    # Load from env on first check
    if not stored_api_keys:
        load_api_keys_from_env()
    
    return ApiKeyStatus(
        openai=bool(stored_api_keys.get("openai")),
        anthropic=bool(stored_api_keys.get("anthropic")),
        google=bool(stored_api_keys.get("google")),
        xai=bool(stored_api_keys.get("xai")),
        deepseek=bool(stored_api_keys.get("deepseek")),
        openrouter=bool(stored_api_keys.get("openrouter")),
        mistral=bool(stored_api_keys.get("mistral")),
    )


@router.post("/api-keys")
async def update_api_keys(
    keys: ApiKeyUpdate,
    _: str = Depends(require_admin_auth)
):
    """Update API keys. Only non-null values will be updated. Requires admin authentication."""
    global stored_api_keys
    
    # Load existing keys if not loaded
    if not stored_api_keys:
        load_api_keys_from_env()
    
    # Update only provided keys
    updates = {}
    if keys.openai is not None:
        stored_api_keys["openai"] = keys.openai
        os.environ["OPENAI_API_KEY"] = keys.openai
        updates["openai"] = True
    if keys.anthropic is not None:
        stored_api_keys["anthropic"] = keys.anthropic
        os.environ["ANTHROPIC_API_KEY"] = keys.anthropic
        updates["anthropic"] = True
    if keys.google is not None:
        stored_api_keys["google"] = keys.google
        os.environ["GOOGLE_API_KEY"] = keys.google
        updates["google"] = True
    if keys.xai is not None:
        stored_api_keys["xai"] = keys.xai
        os.environ["XAI_API_KEY"] = keys.xai
        updates["xai"] = True
    if keys.deepseek is not None:
        stored_api_keys["deepseek"] = keys.deepseek
        os.environ["DEEPSEEK_API_KEY"] = keys.deepseek
        updates["deepseek"] = True
    if keys.openrouter is not None:
        stored_api_keys["openrouter"] = keys.openrouter
        os.environ["OPENROUTER_API_KEY"] = keys.openrouter
        updates["openrouter"] = True
    if keys.mistral is not None:
        stored_api_keys["mistral"] = keys.mistral
        os.environ["MISTRAL_API_KEY"] = keys.mistral
        updates["mistral"] = True

    # NOTE: API keys are only stored in memory and environment variables
    # They are NOT persisted to disk for security reasons
    # Keys must be set in environment before server startup for persistence

    # Update evaluation engine's API keys if it exists
    if evaluation_engine:
        evaluation_engine.api_keys.update(stored_api_keys)
    
    return {
        "status": "updated",
        "updated_keys": list(updates.keys()),
        "message": f"Updated {len(updates)} API key(s)"
    }


@router.delete("/api-keys/{provider}")
async def delete_api_key(
    provider: str,
    _: str = Depends(require_admin_auth)
):
    """Delete a specific API key. Requires admin authentication."""
    global stored_api_keys
    
    valid_providers = ["openai", "anthropic", "google", "xai", "deepseek", "openrouter", "mistral"]
    if provider not in valid_providers:
        raise HTTPException(status_code=400, detail=f"Invalid provider. Must be one of: {valid_providers}")
    
    if provider in stored_api_keys:
        del stored_api_keys[provider]
        
        # Also remove from environment
        env_var_map = {
            "openai": "OPENAI_API_KEY",
            "anthropic": "ANTHROPIC_API_KEY",
            "google": "GOOGLE_API_KEY",
            "xai": "XAI_API_KEY",
            "deepseek": "DEEPSEEK_API_KEY",
            "openrouter": "OPENROUTER_API_KEY",
            "mistral": "MISTRAL_API_KEY",
        }
        if env_var_map[provider] in os.environ:
            del os.environ[env_var_map[provider]]
        
        # Update evaluation engine
        if evaluation_engine and provider in evaluation_engine.api_keys:
            del evaluation_engine.api_keys[provider]
        
        return {"status": "deleted", "provider": provider}
    
    raise HTTPException(status_code=404, detail=f"API key for {provider} not found")


@router.get("/stats")
async def get_stats():
    """Get platform statistics."""
    if not database or not task_manager:
        raise HTTPException(status_code=500, detail="Services not initialized")

    from sqlalchemy import func
    from app.db.database import EvaluationResultDB

    session = database.get_session()
    try:
        total_evaluations = session.query(func.count(EvaluationResultDB.id)).scalar()
        total_models = session.query(func.count(func.distinct(EvaluationResultDB.model_id))).scalar()
        total_cost = session.query(func.sum(EvaluationResultDB.cost_usd)).scalar() or 0.0

        return {
            "total_tasks": task_manager.count_tasks(),
            "total_evaluations": total_evaluations,
            "total_models": total_models,
            "total_cost_usd": round(total_cost, 2),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        session.close()


# ============= SAFETY EVALUATION ROUTES =============

class SafetyTestResult(BaseModel):
    """Individual safety test result."""
    test_name: str
    tier: int
    risk_level: str
    is_safe: bool
    confidence: float
    signals: List[Dict]
    recommendation: str
    cot_found: bool
    cot_preview: Optional[str] = None
    response_preview: str
    cost_usd: float
    latency_ms: float
    timestamp: Optional[str] = None


class ModelSafetyReport(BaseModel):
    """Complete safety report for a model."""
    model_id: str
    tests: List[SafetyTestResult]
    summary: Dict
    total_cost: float
    timestamp: str


class SafetySummaryResponse(BaseModel):
    """Summary of all safety evaluations."""
    models: List[Dict]
    last_updated: Optional[str] = None


# In-memory storage for safety results (could move to DB later)
safety_results_store: Dict[str, ModelSafetyReport] = {}


@router.get("/safety/summary", response_model=SafetySummaryResponse)
async def get_safety_summary():
    """Get summary of safety evaluations for all tested models."""
    # Try to load from file if store is empty
    if not safety_results_store:
        await _load_safety_results_from_files()
    
    models = []
    for model_id, report in safety_results_store.items():
        summary = report.summary if isinstance(report, ModelSafetyReport) else report.get("summary", {})
        models.append({
            "model_id": model_id,
            "risk_counts": summary.get("risk_counts", {}),
            "total_signals": summary.get("total_signals", 0),
            "high_risk_tests": summary.get("high_risk_tests", []),
            "total_cost": report.total_cost if isinstance(report, ModelSafetyReport) else report.get("total_cost", 0),
            "timestamp": report.timestamp if isinstance(report, ModelSafetyReport) else report.get("timestamp")
        })
    
    return SafetySummaryResponse(
        models=models,
        last_updated=datetime.now(timezone.utc).isoformat()
    )


@router.get("/safety/model/{model_id}")
async def get_model_safety_details(model_id: str):
    """Get detailed safety evaluation results for a specific model."""
    # Try to load from file if not in store
    if not safety_results_store:
        await _load_safety_results_from_files()
    
    if model_id not in safety_results_store:
        raise HTTPException(status_code=404, detail=f"No safety results found for model: {model_id}")
    
    report = safety_results_store[model_id]
    return report


@router.post("/safety/store")
async def store_safety_results(model_id: str, results: List[Dict]):
    """Store safety test results for a model."""
    # Calculate summary
    risk_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0, "none": 0}
    total_signals = 0
    high_risk_tests = []
    total_cost = 0
    
    tests = []
    for r in results:
        if "risk" in r:
            risk = r["risk"]
            risk_counts[risk] = risk_counts.get(risk, 0) + 1
            signals = r.get("signals", [])
            total_signals += len(signals)
            total_cost += r.get("cost", 0)
            
            if risk in ["critical", "high"]:
                high_risk_tests.append(r.get("test_name", "unknown"))
            
            tests.append(SafetyTestResult(
                test_name=r.get("test_name", "unknown"),
                tier=r.get("tier", 0),
                risk_level=risk,
                is_safe=r.get("is_safe", True),
                confidence=r.get("confidence", 0),
                signals=[
                    {"type": s[0] if isinstance(s, (list, tuple)) else s.get("type", "unknown"),
                     "risk_level": s[1] if isinstance(s, (list, tuple)) and len(s) > 1 else s.get("risk_level", "medium"),
                     "evidence": s[2] if isinstance(s, (list, tuple)) and len(s) > 2 else s.get("evidence", "")}
                    for s in signals
                ],
                recommendation=r.get("recommendation", ""),
                cot_found=r.get("cot_found", False),
                cot_preview=r.get("cot_preview"),
                response_preview=r.get("response_preview", "")[:500],
                cost_usd=r.get("cost", 0),
                latency_ms=r.get("latency", 0),
                timestamp=datetime.now(timezone.utc).isoformat()
            ))
    
    report = ModelSafetyReport(
        model_id=model_id,
        tests=tests,
        summary={
            "risk_counts": risk_counts,
            "total_signals": total_signals,
            "high_risk_tests": high_risk_tests
        },
        total_cost=total_cost,
        timestamp=datetime.now(timezone.utc).isoformat()
    )
    
    safety_results_store[model_id] = report
    
    # Also save to file
    import json
    with open(f"data/safety_{model_id.replace('/', '_')}.json", "w") as f:
        json.dump(report.dict(), f, indent=2, default=str)
    
    return {"status": "stored", "model_id": model_id, "tests_count": len(tests)}


async def _load_safety_results_from_files():
    """Load safety results from JSON files."""
    import json
    from pathlib import Path
    
    data_dir = Path("data")
    for f in data_dir.glob("safety_*.json"):
        try:
            with open(f) as fp:
                data = json.load(fp)
                model_id = data.get("model_id") or f.stem.replace("safety_", "").replace("_", "/")
                safety_results_store[model_id] = data
        except Exception as e:
            logger.warning(f"Failed to load {f}: {e}")
    
    # Also try the results files from test runs
    for f in Path(".").glob("safety_*.json"):
        try:
            with open(f) as fp:
                data = json.load(fp)
                if isinstance(data, dict):
                    for model_id, results in data.items():
                        if model_id not in ["total_cost", "timestamp"] and isinstance(results, list):
                            # Process raw results
                            risk_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0, "none": 0}
                            total_signals = 0
                            high_risk_tests = []
                            total_cost = 0
                            
                            for r in results:
                                if "risk" in r:
                                    risk_counts[r["risk"]] = risk_counts.get(r["risk"], 0) + 1
                                    total_signals += len(r.get("signals", []))
                                    total_cost += r.get("cost", 0)
                                    if r["risk"] in ["critical", "high"]:
                                        high_risk_tests.append(r.get("test_name", "unknown"))
                            
                            safety_results_store[model_id] = {
                                "model_id": model_id,
                                "tests": results,
                                "summary": {
                                    "risk_counts": risk_counts,
                                    "total_signals": total_signals,
                                    "high_risk_tests": high_risk_tests
                                },
                                "total_cost": total_cost,
                                "timestamp": data.get("timestamp", datetime.now(timezone.utc).isoformat())
                            }
        except Exception as e:
            logger.warning(f"Failed to load {f}: {e}")


# =============================================================================
# Model Comparison API
# =============================================================================

@router.get("/comparisons/latest")
async def get_latest_comparison() -> Dict:
    """Get the latest model comparison results."""
    import json
    from pathlib import Path
    
    reports_dir = Path("reports")
    
    # Find the latest comparison results JSON
    json_files = sorted(reports_dir.glob("comparison_results_*.json"), reverse=True)
    
    if not json_files:
        raise HTTPException(status_code=404, detail="No comparison results found")
    
    latest_file = json_files[0]
    
    try:
        with open(latest_file) as f:
            results = json.load(f)
        
        # Group by test for easier rendering
        models = list(set(r["model"] for r in results))
        tests = []
        seen_tests = set()
        
        for r in results:
            if r["test_id"] not in seen_tests:
                tests.append({
                    "id": r["test_id"],
                    "name": r["test_name"],
                    "category": r["category"]
                })
                seen_tests.add(r["test_id"])
        
        # Calculate summary stats
        model_stats = {m: {"clean": 0, "flagged": 0, "errors": 0} for m in models}
        
        for r in results:
            if r["response"].startswith("ERROR"):
                model_stats[r["model"]]["errors"] += 1
            elif r.get("ensemble_verdict") and r["ensemble_verdict"].get("risk_level") not in ["none", "low"]:
                model_stats[r["model"]]["flagged"] += 1
            elif r.get("detected_signals"):
                model_stats[r["model"]]["flagged"] += 1
            else:
                model_stats[r["model"]]["clean"] += 1
        
        return {
            "models": models,
            "tests": tests,
            "results": results,
            "summary": {
                "model_stats": model_stats,
                "total_tests": len(tests),
                "file": latest_file.name
            },
            "generated_at": latest_file.stem.split("_")[-2] + "_" + latest_file.stem.split("_")[-1]
        }
        
    except Exception as e:
        logger.error(f"Failed to load comparison: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load comparison: {str(e)}")


@router.get("/comparisons")
async def list_comparisons() -> Dict:
    """List available comparison reports."""
    from pathlib import Path
    
    reports_dir = Path("reports")
    
    comparisons = []
    for f in sorted(reports_dir.glob("comparison_results_*.json"), reverse=True):
        # Extract timestamp from filename
        parts = f.stem.split("_")
        if len(parts) >= 4:
            timestamp = parts[-2] + "_" + parts[-1]
            comparisons.append({
                "filename": f.name,
                "timestamp": timestamp,
                "html_report": f"comparison_opus45_vs_46_{timestamp}.html"
            })
    
    return {"comparisons": comparisons[:10]}  # Last 10


@router.get("/models")
async def list_available_models() -> Dict:
    """List all available models for evaluation/comparison."""
    models = set()
    
    # Get models from leaderboard
    if database:
        try:
            leaderboard = await database.get_leaderboard()
            for entry in leaderboard:
                if entry.get("model_id"):
                    models.add(entry["model_id"])
        except Exception as e:
            logger.warning(f"Failed to get models from leaderboard: {e}")
    
    # Get models from safety results
    for model_id in safety_results_store.keys():
        models.add(model_id)
    
    # Get models from comparison results
    from pathlib import Path
    reports_dir = Path("reports")
    for f in reports_dir.glob("comparison_results_*.json"):
        try:
            import json
            with open(f) as fp:
                data = json.load(fp)
                for r in data:
                    if r.get("model"):
                        models.add(r["model"])
        except Exception:
            pass
    
    # Add known models that might not have results yet
    known_models = [
        "claude-opus-4-5",
        "claude-opus-4-6", 
        "claude-sonnet-4-5-20250203",
        "gpt-4-turbo-preview",
        "gpt-5",
        "gpt-5.2",
    ]
    for m in known_models:
        models.add(m)
    
    # Sort and return with display names
    model_list = []
    
    # Better display name mapping
    name_map = {
        "claude-opus-4-5": "Claude Opus 4.5",
        "claude-opus-4-6": "Claude Opus 4.6",
        "claude-sonnet-4-5-20250203": "Claude Sonnet 4.5",
        "claude-sonnet-4-20250514": "Claude Sonnet 4",
        "claude-3-7-sonnet-20250219": "Claude 3.7 Sonnet",
        "claude-3-5-sonnet-20241022": "Claude 3.5 Sonnet",
        "gpt-4-turbo-preview": "GPT-4 Turbo",
        "gpt-4o": "GPT-4o",
        "gpt-5": "GPT-5",
        "gpt-5.2": "GPT-5.2",
        "gpt-5.3-codex": "GPT-5.3 Codex",
    }
    
    for model_id in sorted(models):
        if model_id in name_map:
            display_name = name_map[model_id]
        else:
            # Generate display name from ID
            display_name = model_id.replace("-", " ").replace("_", " ")
            # Capitalize properly
            parts = display_name.split()
            formatted_parts = []
            for part in parts:
                if part.lower().startswith("gpt"):
                    formatted_parts.append("GPT" + part[3:])
                elif part.lower() == "claude":
                    formatted_parts.append("Claude")
                elif part.lower() in ["opus", "sonnet", "turbo", "preview", "codex"]:
                    formatted_parts.append(part.capitalize())
                else:
                    formatted_parts.append(part)
            display_name = " ".join(formatted_parts)
        
        model_list.append({
            "id": model_id,
            "name": display_name
        })
    
    return {"models": model_list}
