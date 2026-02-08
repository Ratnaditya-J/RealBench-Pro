"""CLI tool for quick testing and manual evaluation."""
import asyncio
import json
import os
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv

from app.core.evaluator import EvaluationEngine
from app.core.task_manager import TaskManager
from app.core.contamination import ContaminationDetector

load_dotenv()


async def main():
    """Main CLI function."""
    print("🎯 RealBench Pro CLI\n")

    # Check for API keys
    api_keys = {
        "openai": os.getenv("OPENAI_API_KEY"),
        "anthropic": os.getenv("ANTHROPIC_API_KEY"),
    }

    if not api_keys["openai"] and not api_keys["anthropic"]:
        print("❌ Error: No API keys found. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY in .env")
        return

    # Initialize services
    task_manager = TaskManager()
    evaluation_engine = EvaluationEngine(api_keys=api_keys)
    contamination_detector = ContaminationDetector(api_keys=api_keys)

    print(f"✅ Loaded {task_manager.count_tasks()} tasks\n")

    # Parse command line arguments
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python cli.py list                    - List all tasks")
        print("  python cli.py eval <task_id> <model>  - Evaluate a task")
        print("  python cli.py compare <task_id>       - Compare GPT-4 vs Claude")
        return

    command = sys.argv[1]

    if command == "list":
        # List all tasks
        tasks = task_manager.get_all_tasks()
        print(f"{'ID':<20} {'Title':<40} {'Domain':<20} {'Difficulty':<10}")
        print("-" * 90)
        for task in tasks:
            print(f"{task.task_id:<20} {task.title:<40} {task.domain.value:<20} {task.difficulty.value:<10}")

    elif command == "eval":
        if len(sys.argv) < 4:
            print("Usage: python cli.py eval <task_id> <model>")
            return

        task_id = sys.argv[2]
        model_id = sys.argv[3]

        task = task_manager.get_task(task_id)
        if not task:
            print(f"❌ Task '{task_id}' not found")
            return

        print(f"📋 Task: {task.title}")
        print(f"🤖 Model: {model_id}")
        print(f"\n{'='*80}\n")

        # Run evaluation
        print("⏳ Running evaluation...")
        result = await evaluation_engine.evaluate_single(task, model_id)

        print(f"\n{'='*80}\n")
        print("📊 Results:")
        print(f"\nOverall Score: {result.overall_score:.3f}")
        print(f"\nCost: ${result.model_output.cost_usd:.4f}")
        print(f"Latency: {result.model_output.latency_ms:.0f}ms")
        print(f"Tokens: {result.model_output.tokens_used['input']} in, {result.model_output.tokens_used['output']} out")

        print(f"\nScores by dimension:")
        for score in result.scores:
            print(f"  {score.dimension.value:<15}: {score.score:.3f} (confidence: {score.confidence:.2f})")
            print(f"    Reasoning: {score.reasoning[:100]}...")

        print(f"\nModel Output:")
        print(f"{'-'*80}")
        print(result.model_output.raw_response[:500])
        if len(result.model_output.raw_response) > 500:
            print(f"\n... (truncated, {len(result.model_output.raw_response)} chars total)")

        # Check contamination
        print(f"\n{'='*80}\n")
        print("🔍 Checking for contamination...")
        contamination_report = await contamination_detector.check_response_contamination(
            task=task,
            model_id=model_id,
            response=result.model_output.raw_response,
            latency_ms=result.model_output.latency_ms,
            tokens_used=result.model_output.tokens_used,
        )

        print(f"\nContamination: {'⚠️  DETECTED' if contamination_report.is_contaminated else '✅ CLEAN'}")
        print(f"Confidence: {contamination_report.confidence:.2f}")
        print(f"Recommendation: {contamination_report.recommendation}")
        print(f"\nEvidence: {contamination_report.evidence}")

    elif command == "compare":
        if len(sys.argv) < 3:
            print("Usage: python cli.py compare <task_id>")
            return

        task_id = sys.argv[2]
        task = task_manager.get_task(task_id)
        if not task:
            print(f"❌ Task '{task_id}' not found")
            return

        # Compare GPT-4 vs Claude
        models = []
        if api_keys["openai"]:
            models.append("gpt-4-turbo-preview")
        if api_keys["anthropic"]:
            models.append("claude-3-5-sonnet-20241022")

        if len(models) < 2:
            print("❌ Need both OpenAI and Anthropic API keys for comparison")
            return

        print(f"📋 Task: {task.title}")
        print(f"🤖 Models: {' vs '.join(models)}")
        print(f"\n{'='*80}\n")

        # Run evaluations
        print("⏳ Running evaluations...")
        results = await evaluation_engine.evaluate_batch(task, models)

        # Display comparison
        print(f"\n{'='*80}\n")
        print("📊 Comparison:")
        print(f"\n{'Metric':<20} {models[0]:<30} {models[1]:<30}")
        print("-" * 80)

        print(f"{'Overall Score':<20} {results[0].overall_score:.3f}{' '*26} {results[1].overall_score:.3f}")
        print(f"{'Cost':<20} ${results[0].model_output.cost_usd:.4f}{' '*25} ${results[1].model_output.cost_usd:.4f}")
        print(f"{'Latency':<20} {results[0].model_output.latency_ms:.0f}ms{' '*26} {results[1].model_output.latency_ms:.0f}ms")

        print(f"\n{'Dimension':<20} {models[0]:<30} {models[1]:<30}")
        print("-" * 80)
        for i, criterion in enumerate(task.evaluation_criteria):
            score1 = results[0].scores[i].score if i < len(results[0].scores) else 0
            score2 = results[1].scores[i].score if i < len(results[1].scores) else 0
            print(f"{criterion.dimension.value:<20} {score1:.3f}{' '*26} {score2:.3f}")

        # Winner
        winner_idx = 0 if results[0].overall_score > results[1].overall_score else 1
        print(f"\n🏆 Winner: {models[winner_idx]} (by {abs(results[0].overall_score - results[1].overall_score):.3f})")

    else:
        print(f"Unknown command: {command}")


if __name__ == "__main__":
    asyncio.run(main())
