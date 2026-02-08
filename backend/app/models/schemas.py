"""Pydantic models for API and data validation."""
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator, model_validator


class TaskDifficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class TaskDomain(str, Enum):
    SOFTWARE_ENGINEERING = "software_engineering"
    DATA_ANALYSIS = "data_analysis"
    WRITING = "writing"
    REASONING = "reasoning"
    MATH = "math"
    GENERAL = "general"


class OutputType(str, Enum):
    TEXT = "text"
    CODE = "code"
    STRUCTURED = "structured"
    MARKDOWN = "markdown"


class ScoringDimension(str, Enum):
    ACCURACY = "accuracy"
    SAFETY = "safety"
    USEFULNESS = "usefulness"
    CLARITY = "clarity"
    EFFICIENCY = "efficiency"


class EvaluationCriteria(BaseModel):
    dimension: ScoringDimension
    weight: float = Field(ge=0.0, le=1.0)
    description: str


class Task(BaseModel):
    task_id: str
    title: str
    description: str
    domain: TaskDomain
    difficulty: TaskDifficulty
    prompt: str
    expected_output_type: OutputType
    reference_answer: Optional[str] = None
    evaluation_criteria: List[EvaluationCriteria] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("evaluation_criteria")
    @classmethod
    def weights_sum_to_one(cls, v):
        if not v:  # Allow empty list
            return v
        total = sum(c.weight for c in v)
        if not (0.99 <= total <= 1.01):  # Allow small floating point errors
            raise ValueError(f"Evaluation criteria weights must sum to 1.0, got {total}")
        return v


class ModelConfig(BaseModel):
    model_id: str
    provider: str  # "openai", "anthropic", "google"
    display_name: str
    max_tokens: int = 4096
    temperature: float = 0.7
    supports_streaming: bool = True


class ModelOutput(BaseModel):
    raw_response: str
    tokens_used: Dict[str, int]  # {"input": 100, "output": 200}
    latency_ms: float
    cost_usd: float
    metadata: Dict[str, Any] = Field(default_factory=dict)


class EvaluationScore(BaseModel):
    dimension: ScoringDimension
    score: float = Field(ge=0.0, le=1.0)
    reasoning: str
    confidence: float = Field(ge=0.0, le=1.0, default=0.8)


class EvaluationResult(BaseModel):
    evaluation_id: str
    task_id: str
    model_id: str
    executed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    model_output: ModelOutput
    scores: List[EvaluationScore]
    overall_score: float = Field(ge=0.0, le=1.0)
    contamination_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode='before')
    @classmethod
    def compute_overall_score(cls, values):
        if isinstance(values, dict):
            if values.get("overall_score") is not None:
                return values
            # Compute weighted average if scores are available
            if "scores" in values and values["scores"]:
                # For now, simple average (weights would come from task criteria)
                values["overall_score"] = sum(s.score if hasattr(s, 'score') else s.get('score', 0.0)
                                              for s in values["scores"]) / len(values["scores"])
            else:
                values["overall_score"] = 0.0
        return values


class ContaminationSignal(BaseModel):
    signal_type: str  # "perplexity", "n_gram_overlap", "response_time"
    detected: bool
    score: float = Field(ge=0.0, le=1.0)
    details: Dict[str, Any] = Field(default_factory=dict)


class ContaminationReport(BaseModel):
    report_id: str
    task_id: str
    model_id: str
    checked_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_contaminated: bool
    confidence: float = Field(ge=0.0, le=1.0)
    signals: List[ContaminationSignal]
    recommendation: str  # "exclude", "flag", "verify", "pass"
    evidence: str


# API Request/Response Models
class EvaluateRequest(BaseModel):
    task_id: str
    models: List[str]
    check_contamination: bool = True
    use_ensemble_safety: bool = True  # Multi-model ensemble with adversarial probing
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None


class EvaluateResponse(BaseModel):
    evaluation_ids: List[str]
    status: str
    message: str


class LeaderboardEntry(BaseModel):
    model_id: str
    display_name: str
    overall_score: float
    num_evaluations: int
    scores_by_dimension: Dict[str, float] = Field(default_factory=dict)  # Optional with default
    avg_cost_usd: float
    avg_latency_ms: float
    last_updated: Optional[datetime] = None
    safety_flags: int = 0
    contamination_flags: int = 0


class LeaderboardResponse(BaseModel):
    leaderboard: List[LeaderboardEntry]
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    total_tasks: int
    total_models: int


def _default_evaluation_criteria() -> List[EvaluationCriteria]:
    """Generate default evaluation criteria."""
    return [
        EvaluationCriteria(
            dimension=ScoringDimension.ACCURACY,
            weight=0.5,
            description="Correctness of the answer"
        ),
        EvaluationCriteria(
            dimension=ScoringDimension.USEFULNESS,
            weight=0.3,
            description="Practical value of the response"
        ),
        EvaluationCriteria(
            dimension=ScoringDimension.CLARITY,
            weight=0.2,
            description="Clarity and readability"
        ),
    ]


class CreateTaskRequest(BaseModel):
    title: str
    description: str
    domain: TaskDomain
    difficulty: TaskDifficulty
    prompt: str
    expected_output_type: OutputType
    reference_answer: Optional[str] = None
    evaluation_criteria: Optional[List[EvaluationCriteria]] = None

    @model_validator(mode='after')
    def set_default_criteria(self):
        if self.evaluation_criteria is None or len(self.evaluation_criteria) == 0:
            self.evaluation_criteria = _default_evaluation_criteria()
        return self
