"""Core evaluation engine for running benchmarks."""
import asyncio
import json
import logging
import re
import uuid
from datetime import datetime
from typing import Dict, List

from app.core.model_client import ModelClientFactory
from app.models.schemas import (
    EvaluationResult,
    EvaluationScore,
    ModelOutput,
    ScoringDimension,
    Task,
)

logger = logging.getLogger(__name__)


class LLMJudge:
    """Uses an LLM to judge the quality of model outputs."""

    JUDGE_PROMPT_TEMPLATE = """You are an expert evaluator assessing AI model outputs.

Task: {task_title}
Description: {task_description}
Prompt given to model: {prompt}

Model's Output:
{output}

Reference Answer (if available):
{reference_answer}

Evaluation Criteria:
{criteria}

Please evaluate the model's output on the dimension: {dimension}
Provide:
1. A score from 0.0 to 1.0 (where 1.0 is perfect)
2. Your reasoning for this score
3. Your confidence in this assessment (0.0 to 1.0)

Respond in JSON format:
{{
  "score": 0.85,
  "reasoning": "The output correctly solves the problem with clear explanation...",
  "confidence": 0.9
}}
"""

    def __init__(self, judge_model_id: str, api_keys: Dict[str, str]):
        self.client = ModelClientFactory.create(judge_model_id, api_keys)
        self.judge_model_id = judge_model_id

    async def judge(
        self,
        task: Task,
        output: str,
        dimension: ScoringDimension
    ) -> EvaluationScore:
        """Judge a model output on a specific dimension."""

        # Format criteria for the prompt
        criteria_text = "\n".join([
            f"- {c.dimension.value} (weight: {c.weight}): {c.description}"
            for c in task.evaluation_criteria
        ])

        prompt = self.JUDGE_PROMPT_TEMPLATE.format(
            task_title=task.title,
            task_description=task.description,
            prompt=task.prompt,
            output=output,
            reference_answer=task.reference_answer or "N/A",
            criteria=criteria_text,
            dimension=dimension.value
        )

        try:
            result = await self.client.generate(
                prompt=prompt,
                temperature=0.3,  # Lower temperature for more consistent judging
                max_tokens=500
            )

            # Parse JSON response
            judgment = json.loads(result.raw_response.strip())

            return EvaluationScore(
                dimension=dimension,
                score=float(judgment["score"]),
                reasoning=judgment["reasoning"],
                confidence=float(judgment.get("confidence", 0.8))
            )

        except json.JSONDecodeError:
            # Fallback: try to extract score from text using regex
            logger.warning("Failed to parse JSON from judge, attempting text extraction")

            # Try to extract score patterns like "score: 0.85" or "Score: 85%" or "8.5/10"
            score_match = re.search(r'score[:\s]+([0-9]*\.?[0-9]+)', result.raw_response, re.IGNORECASE)
            extracted_score = None

            if score_match:
                extracted_score = float(score_match.group(1))
                # Normalize if it looks like a percentage
                if extracted_score > 1.0:
                    extracted_score = extracted_score / 100.0
                # Clamp to valid range
                extracted_score = max(0.0, min(1.0, extracted_score))

            return EvaluationScore(
                dimension=dimension,
                score=extracted_score if extracted_score is not None else 0.5,
                reasoning=f"Failed to parse JSON, extracted from text: {result.raw_response[:200]}",
                confidence=0.3 if extracted_score is not None else 0.1
            )
        except Exception as e:
            logger.error(f"Error during judging: {e}")
            return EvaluationScore(
                dimension=dimension,
                score=0.0,
                reasoning=f"Error during evaluation: {str(e)}",
                confidence=0.0
            )


class EvaluationEngine:
    """Main evaluation engine that runs tasks and scores outputs."""

    def __init__(self, api_keys: Dict[str, str], judge_model_id: str = "gpt-4-turbo-preview"):
        self.api_keys = api_keys
        self.judge = LLMJudge(judge_model_id, api_keys)

    async def evaluate_single(
        self,
        task: Task,
        model_id: str
    ) -> EvaluationResult:
        """Evaluate a single task with a single model."""

        evaluation_id = str(uuid.uuid4())

        try:
            # Step 1: Get model output
            client = ModelClientFactory.create(model_id, self.api_keys)
            model_output = await client.generate(
                prompt=task.prompt,
                max_tokens=4096,
                temperature=0.7
            )

            # Step 2: Judge the output on each dimension
            scores = []
            for criterion in task.evaluation_criteria:
                score = await self.judge.judge(
                    task=task,
                    output=model_output.raw_response,
                    dimension=criterion.dimension
                )
                scores.append(score)

            # Step 3: Compute weighted overall score
            # Validate that we have scores for all criteria
            if len(scores) != len(task.evaluation_criteria):
                raise ValueError(
                    f"Mismatch: {len(scores)} scores for {len(task.evaluation_criteria)} criteria"
                )

            overall_score = sum(
                score.score * criterion.weight
                for score, criterion in zip(scores, task.evaluation_criteria)
            )

            return EvaluationResult(
                evaluation_id=evaluation_id,
                task_id=task.task_id,
                model_id=model_id,
                model_output=model_output,
                scores=scores,
                overall_score=overall_score,
                metadata={
                    "judge_model": self.judge.judge_model_id,
                    "task_domain": task.domain.value,
                    "task_difficulty": task.difficulty.value,
                }
            )

        except Exception as e:
            # Return failed evaluation
            return EvaluationResult(
                evaluation_id=evaluation_id,
                task_id=task.task_id,
                model_id=model_id,
                model_output=ModelOutput(
                    raw_response=f"ERROR: {str(e)}",
                    tokens_used={"input": 0, "output": 0},
                    latency_ms=0.0,
                    cost_usd=0.0,
                    metadata={"error": True}
                ),
                scores=[],
                overall_score=0.0,
                metadata={"error": str(e)}
            )

    async def evaluate_batch(
        self,
        task: Task,
        model_ids: List[str]
    ) -> List[EvaluationResult]:
        """Evaluate a task across multiple models in parallel."""

        tasks = [self.evaluate_single(task, model_id) for model_id in model_ids]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Filter out exceptions and return successful results
        return [r for r in results if isinstance(r, EvaluationResult)]

    async def evaluate_multiple_tasks(
        self,
        tasks: List[Task],
        model_ids: List[str]
    ) -> List[EvaluationResult]:
        """Evaluate multiple tasks across multiple models."""

        all_results = []
        for task in tasks:
            results = await self.evaluate_batch(task, model_ids)
            all_results.extend(results)

        return all_results
