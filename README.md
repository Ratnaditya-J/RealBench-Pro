# RealBench Pro

**Continuous, contamination-resistant evaluation platform for AI models**

RealBench Pro is an open-source platform that continuously evaluates frontier AI models for scheming, sabotage, and deceptive alignment — the risks that standard benchmarks weren't built to catch.

## Key Features

- **Frontier (model agency) risks**: Covers evals related to scheming, sabotage, manipulation, autonomy-seeking, collusion, self-improvement
- **Contamination Detection**: Built-in detection for training data contamination
- **Multi-Dimensional Scoring**: Accuracy, safety, usefulness, clarity, efficiency
- **Continuous Evaluation**: API-first design for integration into CI/CD
- **Model Comparison**: Side-by-side comparison of frontier models
- **Real-World Tasks**: Evaluate models on practical tasks humans actually use AI for

## Quick Start

### Prerequisites

- Python 3.11+
- OpenAI API key and/or Anthropic API key and/or Gemini API key

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd realbench-pro

# Install dependencies (using uv for speed)
pip install uv
cd backend
uv pip install -e .

# Or use pip
pip install -r requirements.txt
```

### Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your API keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

### Run the API Server

```bash
cd backend
python app/main.py
```

The API will be available at `http://localhost:8000`

API Documentation: `http://localhost:8000/docs`

### Quick CLI Test

```bash
cd backend

# List available tasks
python cli.py list

# Evaluate a single task
python cli.py eval code-001 gpt-4-turbo-preview

# Compare GPT-4 vs Claude
python cli.py compare code-001
```

## Usage Examples

### API Usage

```python
import httpx

# Evaluate a task
response = httpx.post(
    "http://localhost:8000/api/v1/evaluate",
    json={
        "task_id": "code-001",
        "models": ["gpt-4-turbo-preview", "claude-3-5-sonnet-20241022"],
        "check_contamination": True
    }
)
print(response.json())

# Get leaderboard
response = httpx.get("http://localhost:8000/api/v1/leaderboard")
print(response.json())

# List tasks
response = httpx.get("http://localhost:8000/api/v1/tasks?domain=software_engineering")
print(response.json())
```

### Python SDK Usage

```python
import asyncio
from app.core.evaluator import EvaluationEngine
from app.core.task_manager import TaskManager

async def main():
    # Initialize
    task_manager = TaskManager()
    engine = EvaluationEngine(api_keys={
        "openai": "sk-...",
        "anthropic": "sk-ant-..."
    })

    # Get a task
    task = task_manager.get_task("code-001")

    # Evaluate
    result = await engine.evaluate_single(task, "gpt-4-turbo-preview")
    print(f"Score: {result.overall_score}")
    print(f"Cost: ${result.model_output.cost_usd}")

asyncio.run(main())
```

## Project Structure

```
realbench-pro/
├── backend/
│   ├── app/
│   │   ├── core/              # Core evaluation logic
│   │   │   ├── evaluator.py   # Evaluation engine
│   │   │   ├── contamination.py  # Contamination detection
│   │   │   ├── model_client.py   # LLM API clients
│   │   │   └── task_manager.py   # Task management
│   │   ├── api/               # FastAPI routes
│   │   ├── models/            # Pydantic schemas
│   │   └── db/                # Database layer
│   ├── cli.py                 # CLI tool
│   └── main.py                # FastAPI app
├── data/
│   └── tasks/                 # Task definitions
│       └── seed_tasks.json    # Initial task set
├── frontend/                  # Next.js dashboard
└── README.md
```

## Available Tasks

RealBench Pro currently includes 10 carefully curated tasks across 5 domains:

- **Software Engineering**: CSV parser, API rate limiter, SQL optimization
- **Data Analysis**: Sales analysis, customer churn strategy
- **Writing**: Product launch email, performance review
- **Reasoning**: Logic puzzles, ethical dilemmas
- **Math**: Probability problems

See all tasks: `python cli.py list`

## Contamination Detection

RealBench Pro uses multiple signals to detect potential training data contamination:

1. **Perplexity Anomaly**: Unusually fast generation may indicate memorization
2. **N-gram Overlap**: High overlap with reference answers suggests contamination
3. **Verbatim Recall**: Detection of exact phrase copying

Each evaluation includes a contamination report with:
- Binary decision (contaminated/clean)
- Confidence score
- Recommendation (exclude/flag/verify/pass)
- Detailed evidence

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/evaluate` | POST | Evaluate a task across models |
| `/api/v1/results/{id}` | GET | Get evaluation results |
| `/api/v1/leaderboard` | GET | Get model rankings |
| `/api/v1/tasks` | GET | List available tasks |
| `/api/v1/tasks/{id}` | GET | Get specific task |
| `/api/v1/tasks` | POST | Create custom task |
| `/api/v1/stats` | GET | Platform statistics |
| `/api/v1/health` | GET | Health check |

Full API docs: `http://localhost:8000/docs`

## Adding Custom Tasks (Minimally tested)

```python
import httpx

response = httpx.post(
    "http://localhost:8000/api/v1/tasks",
    json={
        "title": "My Custom Task",
        "description": "Description of what this task evaluates",
        "domain": "software_engineering",
        "difficulty": "medium",
        "prompt": "Your task prompt here...",
        "expected_output_type": "code",
        "reference_answer": "Optional reference answer",
        "evaluation_criteria": [
            {
                "dimension": "accuracy",
                "weight": 0.5,
                "description": "Correctness of solution"
            },
            {
                "dimension": "clarity",
                "weight": 0.5,
                "description": "Code readability"
            }
        ]
    }
)
```

## Comprehensive Safety Workflow

For complete AI safety coverage, we recommend combining RealBench Pro with complementary tools:

### Your Safety Stack

**RealBench Pro (Continuous Monitoring)** 
- **Use for:** Daily/weekly monitoring, contamination detection
- **Detects:** Scheming, sandbagging, safety signals in real-time
- **Frequency:** Continuous

### Recommended Workflow

```
Daily:     RealBench Pro monitoring
             ↓ (detects high-risk signal)
Pre-Deploy: behavioral audit
             ↓ (confirms risk)
Deep Dive:  multi-turn investigation
             ↓
Decision:   Deployment approval/block
```

See [SAFETY_FEATURES.md](SAFETY_FEATURES.md) for detailed workflow examples.

---

## License

MIT

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Contact

For questions, feedback, or collaboration: Open an issue on GitHub or reach out at ratnaditya@gmail.com

## Acknowledgments

- Anthropic, OpenAI for excellent research and documentation

---

**Built with ❤️ for the AI community**
