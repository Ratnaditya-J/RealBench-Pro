# RealBench Pro AI Agents

This directory contains autonomous AI agents that enhance the RealBench Pro evaluation platform with intelligent automation capabilities.

## Available Agents

### 1. EvaluationOrchestrator ✅ **Active**

**Purpose**: Intelligently manages benchmark selection, scheduling, and resource optimization for AI model evaluations.

**Key Features**:
- **Smart Task Selection**: Prioritizes evaluations based on model risk profile and deployment context
- **Resource Optimization**: Respects budget and time constraints while maximizing coverage
- **Adaptive Planning**: Adjusts evaluation strategies based on model characteristics
- **Regression Detection**: Compares new model versions against baselines
- **CI/CD Integration**: Supports continuous evaluation workflows

**Usage Example**:

```python
from agents.evaluation_orchestrator import (
    EvaluationOrchestrator,
    ModelCharacteristics,
    ResourceConstraints,
    ModelRiskProfile
)

# Initialize
orchestrator = EvaluationOrchestrator(task_manager, evaluation_engine)

# Define model
model_chars = ModelCharacteristics(
    model_id="gpt-4-fine-tuned-v2",
    architecture="transformer",
    parameter_count=1_800_000_000,
    risk_profile=ModelRiskProfile.SAFETY_CRITICAL,
    deployment_context="medical",
    known_weaknesses=["hallucination on rare diseases"]
)

# Set constraints
constraints = ResourceConstraints(
    max_cost_dollars=10.0,
    max_wall_time_seconds=3600,
    parallel_workers=4
)

# Create plan
plan = await orchestrator.create_evaluation_plan(model_chars, constraints)

print(f"Plan ID: {plan.plan_id}")
print(f"Selected Tasks: {len(plan.selected_tasks)}")
print(f"Estimated Cost: ${plan.estimated_cost:.2f}")
print(f"Estimated Time: {plan.estimated_time_seconds:.0f}s")
print(f"\nRationale:\n{plan.rationale}")

# Execute plan
results = await orchestrator.execute_plan(plan, your_model_function)

# Check for regressions
regression_analysis = orchestrator.detect_regressions(
    model_id="gpt-4-fine-tuned-v2",
    new_results=results["results"],
    baseline_model_id="gpt-4-base",
    threshold=0.1
)

if regression_analysis["needs_attention"]:
    print(f"⚠️ Found {len(regression_analysis['regressions'])} regressions!")
    for reg in regression_analysis["regressions"]:
        print(f"  - Task {reg['task_id']}: {reg['baseline_score']:.2f} → {reg['new_score']:.2f}")
```

**REST API Endpoints**:

```bash
# Create evaluation plan
curl -X POST http://localhost:8000/api/v1/agents/orchestrator/plan \
  -H 'Content-Type: application/json' \
  -d '{
    "model_id": "gpt-4",
    "risk_profile": "safety_critical",
    "deployment_context": "medical",
    "max_cost_dollars": 10.0,
    "parallel_workers": 4
  }'

# Get orchestrator stats
curl http://localhost:8000/api/v1/agents/orchestrator/stats

# Check for regressions
curl -X POST 'http://localhost:8000/api/v1/agents/orchestrator/regression-check?model_id=gpt-4&baseline_model_id=gpt-3.5&threshold=0.1'
```

**Web UI**:

Visit http://localhost:3000/agents to use the interactive agent dashboard.

---

### 2. SafetyGuard 🚧 **Coming Soon**

**Purpose**: Continuously monitors, categorizes, and remediates safety issues in AI models.

**Planned Features**:
- Autonomous safety audits
- Intelligent adversarial test generation
- Risk aggregation and trending
- Human-in-loop review workflows
- Remediation suggestion system

---

### 3. PerformanceOptimizer 🚧 **Coming Soon**

**Purpose**: Autonomously improves model performance through prompt engineering and evaluation-guided optimization.

**Planned Features**:
- Systematic prompt variation testing
- Task decomposition for complex evaluations
- Evaluation-guided learning
- Root cause analysis for low scores
- Prompt library management

---

## Architecture

### EvaluationOrchestrator Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  EvaluationOrchestrator                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │ Risk Assessment  │  │ Task Prioritizer │               │
│  └────────┬─────────┘  └────────┬─────────┘               │
│           │                     │                          │
│           └──────────┬──────────┘                          │
│                      ▼                                      │
│           ┌──────────────────────┐                         │
│           │  Task Selector       │                         │
│           │  (Budget-aware)      │                         │
│           └──────────┬───────────┘                         │
│                      │                                      │
│                      ▼                                      │
│           ┌──────────────────────┐                         │
│           │  Execution Optimizer │                         │
│           │  (Parallel, Ordered) │                         │
│           └──────────┬───────────┘                         │
│                      │                                      │
│                      ▼                                      │
│           ┌──────────────────────┐                         │
│           │  Results Analyzer    │                         │
│           │  (Regressions, etc.) │                         │
│           └──────────────────────┘                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │   RealBench Core       │
              │  (Task Manager,        │
              │   Evaluation Engine)   │
              └────────────────────────┘
```

### Decision Flow

1. **Model Analysis**:
   - Extract architecture, size, training method
   - Assess risk profile (unproven, standard, safety-critical, regression)
   - Identify deployment context (medical, legal, general, etc.)

2. **Task Prioritization**:
   ```
   CRITICAL: Safety tasks for all models
   HIGH:     Domain-specific tasks matching deployment context
             Tasks targeting known weaknesses
             Regression tests for updated models
   MEDIUM:   Standard coverage tasks
   LOW:      Comprehensive testing (if budget allows)
   ```

3. **Budget Allocation**:
   - Always include CRITICAL tasks
   - Fill budget with HIGH → MEDIUM → LOW tasks
   - Balance LLM vs. heuristic judges based on priority
   - Estimate costs from historical data or task complexity

4. **Execution Optimization**:
   - Run CRITICAL tasks first
   - Interleave expensive/cheap tasks for parallelization
   - Respect prerequisites
   - Monitor progress and adapt if needed

5. **Results Analysis**:
   - Compare against baselines
   - Flag regressions (score drops > threshold)
   - Update model baseline for future comparisons
   - Track execution stats for better future estimates

---

## Configuration

### Environment Variables

The agents use the same environment variables as RealBench Pro:

```bash
# Required for executing evaluations
OPENAI_API_KEY=sk-your-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Optional defaults
DEFAULT_JUDGE_MODEL=gpt-4-turbo-preview
DATABASE_URL=sqlite:///./realbench.db
```

### Resource Constraints

Default resource constraints can be configured when initializing the orchestrator:

```python
default_constraints = ResourceConstraints(
    max_api_calls=1000,
    max_wall_time_seconds=7200,  # 2 hours
    max_cost_dollars=50.0,
    parallel_workers=8,
    rate_limit_per_minute=60
)

orchestrator = EvaluationOrchestrator(
    task_manager,
    evaluation_engine,
    resource_constraints=default_constraints
)
```

---

## Best Practices

### 1. Model Risk Profiling

**Unproven Models** (new, no prior evaluations):
- Run comprehensive test suite
- Include extra safety checks
- Use LLM judges for nuanced evaluation
- Budget for longer evaluation time

**Safety-Critical Models** (medical, legal, high-stakes):
- Run ALL safety-related tasks (CRITICAL priority)
- Use strictest evaluation criteria
- Perform adversarial testing
- Require human review of edge cases

**Regression Testing** (updates to existing models):
- Focus on previously tested areas
- Compare against baseline version
- Flag any score degradations
- Run targeted tests for changed components

### 2. Resource Optimization

**Tight Budget**:
```python
constraints = ResourceConstraints(
    max_cost_dollars=5.0,
    parallel_workers=2
)
# Orchestrator will prioritize CRITICAL tasks, use heuristic judges
```

**Comprehensive Testing**:
```python
constraints = ResourceConstraints(
    max_cost_dollars=100.0,
    parallel_workers=16
)
# Orchestrator will include LOW priority tasks, use LLM judges liberally
```

### 3. CI/CD Integration

```python
# Pre-training baseline
baseline_plan = await orchestrator.create_evaluation_plan(
    ModelCharacteristics(
        model_id="model-v1.0-baseline",
        risk_profile=ModelRiskProfile.STANDARD
    )
)
baseline_results = await orchestrator.execute_plan(baseline_plan, model_v1)
orchestrator.update_model_baseline("model-v1.0-baseline", baseline_results["results"])

# Post-training regression check
regression_plan = await orchestrator.create_evaluation_plan(
    ModelCharacteristics(
        model_id="model-v1.1-finetuned",
        risk_profile=ModelRiskProfile.REGRESSION_TEST,
        previous_evaluations=[t.task_id for t in baseline_plan.selected_tasks]
    )
)
new_results = await orchestrator.execute_plan(regression_plan, model_v1_1)

# Check for regressions
analysis = orchestrator.detect_regressions(
    "model-v1.1-finetuned",
    new_results["results"],
    "model-v1.0-baseline",
    threshold=0.05  # 5% score drop is a regression
)

if analysis["needs_attention"]:
    # Fail CI/CD pipeline or alert team
    raise Exception(f"Regression detected: {analysis['regression_count']} tasks degraded")
```

---

## Monitoring & Observability

### Orchestrator Stats

```python
stats = {
    "total_models_tracked": 5,
    "total_evaluations": 127,
    "task_stats": {
        "custom-f3628060": {
            "avg_time": 8.3,
            "avg_cost": 0.023,
            "execution_count": 12
        },
        # ... more tasks
    },
    "models": ["gpt-4", "claude-3", "llama-2", ...]
}
```

### Logging

The orchestrator logs key decisions:

```
INFO - Creating evaluation plan for model: gpt-4-medical-v2
INFO - Selected 47 tasks: 5 CRITICAL, 12 HIGH, 20 MEDIUM, 10 LOW
INFO - Evaluation plan created: 47 tasks, $12.30, 1847s
INFO - Executing evaluation plan abc-123...
INFO - Evaluating task 1/47: custom-f3628060
INFO - Plan execution complete: 45/47 succeeded, 2 failed, 1823.4s
INFO - Updated baseline for gpt-4-medical-v2: 45 evaluations, avg score 0.87
```

---

## Extending the Orchestrator

### Custom Prioritization Logic

```python
class CustomOrchestrator(EvaluationOrchestrator):
    def _determine_task_priorities(self, model_characteristics):
        priorities = super()._determine_task_priorities(model_characteristics)

        # Add custom logic
        if model_characteristics.deployment_context == "healthcare":
            for task_id, task in self.task_manager.get_all_tasks().items():
                if "HIPAA" in task.description:
                    priorities[task_id] = EvaluationPriority.CRITICAL

        return priorities
```

### Custom Cost Estimation

```python
class CustomOrchestrator(EvaluationOrchestrator):
    def _create_task_strategy(self, task, priority):
        strategy = super()._create_task_strategy(task, priority)

        # Adjust costs based on your pricing
        if strategy.should_use_llm_judge:
            strategy.estimated_cost *= 1.5  # Your LLM costs 50% more

        return strategy
```

---

## Troubleshooting

### "Orchestrator not initialized"

Make sure the agent is initialized in `main.py`:

```python
agent_routes.initialize_orchestrator(task_manager, evaluation_engine)
```

### No tasks selected

Check resource constraints - they may be too restrictive:

```python
# This might select 0 tasks
constraints = ResourceConstraints(max_cost_dollars=0.001)

# Increase budget or remove constraint
constraints = ResourceConstraints(max_cost_dollars=10.0)
```

### Inaccurate time estimates

The orchestrator learns from execution history. Initial estimates may be off until task_execution_stats are populated.

---

## Future Enhancements

- [ ] WebSocket support for real-time progress updates
- [ ] Database persistence for plans and results
- [ ] Multi-model comparison mode
- [ ] Automatic hyperparameter tuning for evaluation criteria
- [ ] Integration with experiment tracking (MLflow, Weights & Biases)
- [ ] Cost optimization through caching and deduplication
- [ ] Adaptive sampling (run subset, estimate full results)
- [ ] Integration with SafetyGuard and PerformanceOptimizer agents

---

## License

Same as RealBench Pro - MIT License
