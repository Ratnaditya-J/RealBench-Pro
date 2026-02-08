"""
EvaluationOrchestrator Agent

Intelligently selects, schedules, and adapts evaluation benchmarks based on:
- Model characteristics (size, architecture, training method)
- Available resources (compute, API rate limits, budget)
- Risk factors (safety-critical vs. optional evaluations)
- Historical performance data

Key Features:
- Smart benchmark selection
- Adaptive evaluation planning
- Resource optimization
- CI/CD integration for AI models
- Continuous monitoring and alerting
"""

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Dict, List, Optional, Set, Tuple, Any
from collections import defaultdict
import uuid

from app.core.task_manager import TaskManager
from app.core.evaluator import EvaluationEngine
from app.models.schemas import Task, TaskDifficulty, TaskDomain, EvaluationResult

logger = logging.getLogger(__name__)


class EvaluationPriority(str, Enum):
    """Priority levels for evaluation tasks"""
    CRITICAL = "critical"      # Safety-critical, must run
    HIGH = "high"             # Important for certification
    MEDIUM = "medium"         # Nice to have, good coverage
    LOW = "low"               # Optional, comprehensive testing


class ModelRiskProfile(str, Enum):
    """Model risk assessment categories"""
    UNPROVEN = "unproven"           # New model, no prior data
    STANDARD = "standard"           # Typical model, normal risk
    SAFETY_CRITICAL = "safety_critical"  # Used in high-stakes contexts
    REGRESSION_TEST = "regression_test"  # Testing changes to existing model


class ResourceType(str, Enum):
    """Types of computational resources"""
    GPU_COMPUTE = "gpu_compute"
    API_CALLS = "api_calls"
    WALL_TIME = "wall_time"
    MEMORY = "memory"


@dataclass
class ModelCharacteristics:
    """Metadata about the model being evaluated"""
    model_id: str
    architecture: str = "unknown"
    parameter_count: Optional[int] = None
    training_method: str = "unknown"  # pretrained, fine-tuned, rlhf, etc.
    risk_profile: ModelRiskProfile = ModelRiskProfile.STANDARD
    previous_evaluations: List[str] = field(default_factory=list)
    known_weaknesses: List[str] = field(default_factory=list)
    deployment_context: str = "general"  # general, medical, legal, educational, etc.


@dataclass
class ResourceConstraints:
    """Available resources and limits"""
    max_api_calls: Optional[int] = None
    max_wall_time_seconds: Optional[int] = None
    max_cost_dollars: Optional[float] = None
    gpu_available: bool = True
    parallel_workers: int = 1
    rate_limit_per_minute: Optional[int] = None


@dataclass
class EvaluationPlan:
    """A planned evaluation strategy"""
    plan_id: str
    model_characteristics: ModelCharacteristics
    selected_tasks: List[Task]
    priority_breakdown: Dict[EvaluationPriority, int]
    estimated_cost: float
    estimated_time_seconds: float
    execution_order: List[str]  # Task IDs in execution order
    rationale: str
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class EvaluationStrategy:
    """Strategy for a specific evaluation task"""
    task_id: str
    priority: EvaluationPriority
    should_use_llm_judge: bool
    estimated_cost: float
    estimated_time_seconds: float
    prerequisites: List[str] = field(default_factory=list)
    rationale: str = ""


class EvaluationOrchestrator:
    """
    Autonomous agent for intelligent benchmark management and optimization.

    Capabilities:
    - Recommends evaluations based on model characteristics
    - Prioritizes tasks by risk and coverage
    - Optimizes resource allocation
    - Schedules parallel execution
    - Detects regressions and anomalies
    - Provides continuous integration for AI models
    """

    def __init__(
        self,
        task_manager: TaskManager,
        evaluation_engine: EvaluationEngine,
        resource_constraints: Optional[ResourceConstraints] = None
    ):
        self.task_manager = task_manager
        self.evaluation_engine = evaluation_engine
        self.resource_constraints = resource_constraints or ResourceConstraints()

        # Historical data
        self.evaluation_history: Dict[str, List[EvaluationResult]] = defaultdict(list)
        self.model_baselines: Dict[str, Dict] = {}
        self.task_execution_stats: Dict[str, Dict] = defaultdict(lambda: {
            "avg_time": 0,
            "avg_cost": 0,
            "execution_count": 0
        })

        logger.info("EvaluationOrchestrator initialized")

    async def create_evaluation_plan(
        self,
        model_characteristics: ModelCharacteristics,
        resource_constraints: Optional[ResourceConstraints] = None
    ) -> EvaluationPlan:
        """
        Create an intelligent evaluation plan based on model characteristics and constraints.

        Steps:
        1. Analyze model risk profile
        2. Select relevant tasks
        3. Prioritize tasks
        4. Estimate resources
        5. Optimize execution order
        """
        logger.info(f"Creating evaluation plan for model: {model_characteristics.model_id}")

        constraints = resource_constraints or self.resource_constraints

        # Step 1: Analyze model and determine priorities
        task_priorities = self._determine_task_priorities(model_characteristics)

        # Step 2: Select tasks based on priorities and constraints
        selected_tasks = self._select_tasks(
            task_priorities,
            constraints,
            model_characteristics
        )

        # Step 3: Estimate costs and timing
        strategies = [
            self._create_task_strategy(task, task_priorities.get(task.task_id, EvaluationPriority.MEDIUM))
            for task in selected_tasks
        ]

        total_cost = sum(s.estimated_cost for s in strategies)
        total_time = self._estimate_total_time(strategies, constraints.parallel_workers)

        # Step 4: Optimize execution order
        execution_order = self._optimize_execution_order(strategies)

        # Step 5: Generate rationale
        rationale = self._generate_plan_rationale(
            model_characteristics,
            selected_tasks,
            task_priorities,
            constraints
        )

        # Create plan
        plan = EvaluationPlan(
            plan_id=str(uuid.uuid4()),
            model_characteristics=model_characteristics,
            selected_tasks=selected_tasks,
            priority_breakdown={
                priority: len([s for s in strategies if s.priority == priority])
                for priority in EvaluationPriority
            },
            estimated_cost=total_cost,
            estimated_time_seconds=total_time,
            execution_order=execution_order,
            rationale=rationale
        )

        logger.info(
            f"Evaluation plan created: {len(selected_tasks)} tasks, "
            f"${total_cost:.2f}, {total_time:.0f}s"
        )

        return plan

    def _determine_task_priorities(
        self,
        model_characteristics: ModelCharacteristics
    ) -> Dict[str, EvaluationPriority]:
        """
        Assign priorities to tasks based on model characteristics.

        Rules:
        - Safety tasks are CRITICAL for all models
        - Domain-specific tasks are HIGH for matching deployment contexts
        - Regression tests are HIGH for models with previous evaluations
        - Comprehensive coverage tasks are MEDIUM/LOW
        """
        all_tasks = self.task_manager.get_all_tasks()
        priorities = {}

        for task in all_tasks:
            # Default priority
            priority = EvaluationPriority.MEDIUM

            # Safety tasks are always critical
            if task.domain == TaskDomain.GENERAL or "safety" in task.title.lower():
                priority = EvaluationPriority.CRITICAL

            # Deployment context matching
            if model_characteristics.deployment_context in task.title.lower():
                priority = EvaluationPriority.HIGH

            # Risk profile adjustments
            if model_characteristics.risk_profile == ModelRiskProfile.UNPROVEN:
                # Unproven models need comprehensive testing
                if priority == EvaluationPriority.MEDIUM:
                    priority = EvaluationPriority.HIGH
            elif model_characteristics.risk_profile == ModelRiskProfile.SAFETY_CRITICAL:
                # Safety-critical models need ALL safety tests
                if task.domain == TaskDomain.GENERAL:
                    priority = EvaluationPriority.CRITICAL
            elif model_characteristics.risk_profile == ModelRiskProfile.REGRESSION_TEST:
                # Regression tests focus on previously tested areas
                if task.task_id in model_characteristics.previous_evaluations:
                    priority = EvaluationPriority.HIGH
                else:
                    priority = EvaluationPriority.LOW

            # Known weaknesses require targeted testing
            for weakness in model_characteristics.known_weaknesses:
                if weakness.lower() in task.description.lower():
                    priority = EvaluationPriority.HIGH
                    break

            priorities[task.task_id] = priority

        return priorities

    def _select_tasks(
        self,
        task_priorities: Dict[str, EvaluationPriority],
        constraints: ResourceConstraints,
        model_characteristics: ModelCharacteristics
    ) -> List[Task]:
        """
        Select tasks respecting resource constraints while maximizing coverage.

        Strategy:
        - Always include CRITICAL tasks
        - Include HIGH tasks if resources allow
        - Fill remaining budget with MEDIUM/LOW tasks
        """
        all_tasks = self.task_manager.get_all_tasks()

        # Group tasks by priority
        tasks_by_priority = defaultdict(list)
        for task in all_tasks:
            priority = task_priorities.get(task.task_id, EvaluationPriority.MEDIUM)
            tasks_by_priority[priority].append(task)

        selected = []
        total_cost = 0
        total_time = 0

        # Always include CRITICAL tasks
        for task in tasks_by_priority[EvaluationPriority.CRITICAL]:
            strategy = self._create_task_strategy(task, EvaluationPriority.CRITICAL)
            selected.append(task)
            total_cost += strategy.estimated_cost
            total_time += strategy.estimated_time_seconds

        # Add HIGH priority tasks if budget allows
        for task in tasks_by_priority[EvaluationPriority.HIGH]:
            strategy = self._create_task_strategy(task, EvaluationPriority.HIGH)

            # Check constraints
            if constraints.max_cost_dollars and total_cost + strategy.estimated_cost > constraints.max_cost_dollars:
                logger.info(f"Skipping HIGH priority task {task.task_id} due to cost constraint")
                continue
            if constraints.max_wall_time_seconds and total_time + strategy.estimated_time_seconds > constraints.max_wall_time_seconds:
                logger.info(f"Skipping HIGH priority task {task.task_id} due to time constraint")
                continue

            selected.append(task)
            total_cost += strategy.estimated_cost
            total_time += strategy.estimated_time_seconds

        # Fill remaining budget with MEDIUM tasks
        for task in tasks_by_priority[EvaluationPriority.MEDIUM]:
            strategy = self._create_task_strategy(task, EvaluationPriority.MEDIUM)

            if constraints.max_cost_dollars and total_cost + strategy.estimated_cost > constraints.max_cost_dollars:
                break
            if constraints.max_wall_time_seconds and total_time + strategy.estimated_time_seconds > constraints.max_wall_time_seconds:
                break

            selected.append(task)
            total_cost += strategy.estimated_cost
            total_time += strategy.estimated_time_seconds

        # Add LOW priority tasks if we have spare budget
        for task in tasks_by_priority[EvaluationPriority.LOW][:10]:  # Limit to 10 LOW tasks
            strategy = self._create_task_strategy(task, EvaluationPriority.LOW)

            if constraints.max_cost_dollars and total_cost + strategy.estimated_cost > constraints.max_cost_dollars:
                break
            if constraints.max_wall_time_seconds and total_time + strategy.estimated_time_seconds > constraints.max_wall_time_seconds:
                break

            selected.append(task)
            total_cost += strategy.estimated_cost
            total_time += strategy.estimated_time_seconds

        logger.info(
            f"Selected {len(selected)} tasks: "
            f"{len(tasks_by_priority[EvaluationPriority.CRITICAL])} CRITICAL, "
            f"{len([t for t in selected if task_priorities[t.task_id] == EvaluationPriority.HIGH])} HIGH, "
            f"{len([t for t in selected if task_priorities[t.task_id] == EvaluationPriority.MEDIUM])} MEDIUM, "
            f"{len([t for t in selected if task_priorities[t.task_id] == EvaluationPriority.LOW])} LOW"
        )

        return selected

    def _create_task_strategy(
        self,
        task: Task,
        priority: EvaluationPriority
    ) -> EvaluationStrategy:
        """
        Create an execution strategy for a specific task.

        Decisions:
        - Use LLM judge for complex/ambiguous tasks
        - Use heuristic judge for simple/clear-cut tasks
        - Estimate costs based on task complexity and judge type
        """
        # Check historical data
        stats = self.task_execution_stats.get(task.task_id)

        if stats and stats["execution_count"] > 0:
            # Use historical data
            estimated_time = stats["avg_time"]
            estimated_cost = stats["avg_cost"]
            should_use_llm = estimated_cost > 0.01  # LLM judge if cost > 1 cent
        else:
            # Estimate based on task characteristics
            difficulty_multipliers = {
                TaskDifficulty.EASY: 1.0,
                TaskDifficulty.MEDIUM: 2.0,
                TaskDifficulty.HARD: 4.0
            }

            base_time = 5.0  # seconds
            base_cost = 0.001  # dollars

            multiplier = difficulty_multipliers.get(task.difficulty, 2.0)
            estimated_time = base_time * multiplier

            # Use LLM judge for HIGH/CRITICAL priority or HARD difficulty
            should_use_llm = (
                priority in [EvaluationPriority.CRITICAL, EvaluationPriority.HIGH]
                or task.difficulty == TaskDifficulty.HARD
            )

            estimated_cost = base_cost * multiplier * (10 if should_use_llm else 1)

        return EvaluationStrategy(
            task_id=task.task_id,
            priority=priority,
            should_use_llm_judge=should_use_llm,
            estimated_cost=estimated_cost,
            estimated_time_seconds=estimated_time,
            rationale=f"Priority: {priority}, Difficulty: {task.difficulty}, LLM Judge: {should_use_llm}"
        )

    def _estimate_total_time(
        self,
        strategies: List[EvaluationStrategy],
        parallel_workers: int
    ) -> float:
        """
        Estimate total wall time accounting for parallelization.
        """
        total_sequential_time = sum(s.estimated_time_seconds for s in strategies)

        if parallel_workers <= 1:
            return total_sequential_time

        # Simple parallel estimation: divide by workers with 20% overhead
        parallel_time = (total_sequential_time / parallel_workers) * 1.2
        return parallel_time

    def _optimize_execution_order(
        self,
        strategies: List[EvaluationStrategy]
    ) -> List[str]:
        """
        Optimize task execution order for efficiency.

        Strategy:
        - Run CRITICAL tasks first
        - Interleave expensive and cheap tasks for better resource utilization
        - Respect prerequisites
        """
        # Sort by priority first, then by cost (expensive tasks early for better parallelization)
        priority_order = {
            EvaluationPriority.CRITICAL: 0,
            EvaluationPriority.HIGH: 1,
            EvaluationPriority.MEDIUM: 2,
            EvaluationPriority.LOW: 3
        }

        sorted_strategies = sorted(
            strategies,
            key=lambda s: (priority_order[s.priority], -s.estimated_cost)
        )

        return [s.task_id for s in sorted_strategies]

    def _generate_plan_rationale(
        self,
        model_characteristics: ModelCharacteristics,
        selected_tasks: List[Task],
        task_priorities: Dict[str, EvaluationPriority],
        constraints: ResourceConstraints
    ) -> str:
        """Generate human-readable explanation of the evaluation plan."""

        priority_counts = defaultdict(int)
        for task in selected_tasks:
            priority = task_priorities.get(task.task_id, EvaluationPriority.MEDIUM)
            priority_counts[priority] += 1

        rationale_parts = [
            f"Evaluation plan for {model_characteristics.model_id} ({model_characteristics.risk_profile}):",
            f"\n- Selected {len(selected_tasks)} tasks across {len(set(t.domain for t in selected_tasks))} domains",
            f"- {priority_counts[EvaluationPriority.CRITICAL]} critical safety tasks",
            f"- {priority_counts[EvaluationPriority.HIGH]} high-priority tasks",
            f"- {priority_counts[EvaluationPriority.MEDIUM]} medium-priority tasks",
            f"- {priority_counts[EvaluationPriority.LOW]} low-priority comprehensive tests",
        ]

        if model_characteristics.deployment_context != "general":
            rationale_parts.append(
                f"\n- Prioritized {model_characteristics.deployment_context} domain tasks"
            )

        if model_characteristics.known_weaknesses:
            rationale_parts.append(
                f"\n- Targeted testing for known weaknesses: {', '.join(model_characteristics.known_weaknesses[:3])}"
            )

        if constraints.max_cost_dollars:
            rationale_parts.append(
                f"\n- Respecting budget constraint of ${constraints.max_cost_dollars:.2f}"
            )

        return "".join(rationale_parts)

    async def execute_plan(
        self,
        plan: EvaluationPlan,
        model_function,
        on_progress=None
    ) -> Dict[str, Any]:
        """
        Execute an evaluation plan with monitoring and adaptive adjustments.

        Args:
            plan: The evaluation plan to execute
            model_function: Function that takes a prompt and returns a response
            on_progress: Optional callback for progress updates

        Returns:
            Execution results with metrics and insights
        """
        logger.info(f"Executing evaluation plan {plan.plan_id}")

        start_time = datetime.now(timezone.utc)
        results = []
        actual_cost = 0
        failed_tasks = []

        for i, task_id in enumerate(plan.execution_order):
            task = next((t for t in plan.selected_tasks if t.task_id == task_id), None)
            if not task:
                logger.warning(f"Task {task_id} not found in plan")
                continue

            try:
                # Execute evaluation
                logger.info(f"Evaluating task {i+1}/{len(plan.execution_order)}: {task_id}")

                result = await self.evaluation_engine.evaluate_batch(task, [plan.model_characteristics.model_id])
                results.extend(result)

                # Update stats
                # actual_cost += result.get("cost", 0)  # Would need to track this

                # Progress callback
                if on_progress:
                    on_progress({
                        "completed": i + 1,
                        "total": len(plan.execution_order),
                        "current_task": task_id,
                        "progress_pct": ((i + 1) / len(plan.execution_order)) * 100
                    })

            except Exception as e:
                logger.error(f"Failed to evaluate task {task_id}: {e}")
                failed_tasks.append({"task_id": task_id, "error": str(e)})

        end_time = datetime.now(timezone.utc)
        execution_time = (end_time - start_time).total_seconds()

        # Generate summary
        summary = {
            "plan_id": plan.plan_id,
            "model_id": plan.model_characteristics.model_id,
            "tasks_completed": len(results),
            "tasks_failed": len(failed_tasks),
            "execution_time_seconds": execution_time,
            "estimated_time_seconds": plan.estimated_time_seconds,
            "time_accuracy": abs(execution_time - plan.estimated_time_seconds) / plan.estimated_time_seconds if plan.estimated_time_seconds > 0 else 0,
            "results": results,
            "failed_tasks": failed_tasks,
            "started_at": start_time.isoformat(),
            "completed_at": end_time.isoformat()
        }

        logger.info(
            f"Plan execution complete: {len(results)}/{len(plan.execution_order)} succeeded, "
            f"{len(failed_tasks)} failed, {execution_time:.1f}s"
        )

        return summary

    def detect_regressions(
        self,
        model_id: str,
        new_results: List[EvaluationResult],
        baseline_model_id: Optional[str] = None,
        threshold: float = 0.1
    ) -> Dict[str, Any]:
        """
        Detect performance regressions by comparing against baseline.

        Args:
            model_id: Current model being tested
            new_results: New evaluation results
            baseline_model_id: Baseline model to compare against (or previous version)
            threshold: Score degradation threshold to flag as regression

        Returns:
            Regression analysis report
        """
        # Get baseline results
        baseline_results = self.evaluation_history.get(
            baseline_model_id or model_id,
            []
        )

        if not baseline_results:
            logger.warning(f"No baseline found for {baseline_model_id or model_id}")
            return {"has_baseline": False, "message": "No baseline available"}

        # Compare results task by task
        regressions = []
        improvements = []

        for new_result in new_results:
            # Find matching baseline
            baseline_result = next(
                (r for r in baseline_results if r.task_id == new_result.task_id),
                None
            )

            if not baseline_result:
                continue

            score_delta = new_result.overall_score - baseline_result.overall_score

            if score_delta < -threshold:
                regressions.append({
                    "task_id": new_result.task_id,
                    "baseline_score": baseline_result.overall_score,
                    "new_score": new_result.overall_score,
                    "delta": score_delta,
                    "severity": "critical" if score_delta < -0.2 else "warning"
                })
            elif score_delta > threshold:
                improvements.append({
                    "task_id": new_result.task_id,
                    "baseline_score": baseline_result.overall_score,
                    "new_score": new_result.overall_score,
                    "delta": score_delta
                })

        return {
            "has_baseline": True,
            "baseline_model": baseline_model_id or model_id,
            "regressions": regressions,
            "improvements": improvements,
            "total_compared": len([r for r in new_results if any(b.task_id == r.task_id for b in baseline_results)]),
            "regression_count": len(regressions),
            "improvement_count": len(improvements),
            "needs_attention": len(regressions) > 0
        }

    def update_model_baseline(
        self,
        model_id: str,
        results: List[EvaluationResult]
    ):
        """
        Update baseline performance metrics for a model.
        """
        self.evaluation_history[model_id] = results

        # Calculate aggregate metrics
        avg_score = sum(r.overall_score for r in results) / len(results) if results else 0

        self.model_baselines[model_id] = {
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "evaluation_count": len(results),
            "average_score": avg_score,
            "task_ids": [r.task_id for r in results]
        }

        logger.info(f"Updated baseline for {model_id}: {len(results)} evaluations, avg score {avg_score:.2f}")
