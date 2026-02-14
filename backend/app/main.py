"""Main FastAPI application."""
import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import routes, agent_routes
from app.core.contamination import ContaminationDetector
from app.core.evaluator import EvaluationEngine
from app.core.task_manager import TaskManager
from app.core.safety_detection import SafetyDetector
from app.core.ensemble_safety_detector import EnsembleSafetyDetector
from app.db.database import Database

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('realbench.log')
    ]
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown."""
    # Startup
    logger.info("🚀 Starting RealBench Pro...")

    # Load API keys
    api_keys = {
        "openai": os.getenv("OPENAI_API_KEY"),
        "openai_codex": os.getenv("OPENAI_CODEX_API_KEY"),  # For Responses API (Codex models)
        "anthropic": os.getenv("ANTHROPIC_API_KEY"),
    }

    # Initialize services
    task_manager = TaskManager()
    evaluation_engine = EvaluationEngine(
        api_keys=api_keys,
        judge_model_id=os.getenv("DEFAULT_JUDGE_MODEL", "gpt-4o")
    )
    contamination_detector = ContaminationDetector(api_keys=api_keys)
    database = Database(database_url=os.getenv("DATABASE_URL", "sqlite:///./realbench.db"))

    # Initialize basic keyword-based safety detector (always on)
    safety_detector = SafetyDetector(enable_cot_analysis=True)
    logger.info("✅ Basic SafetyDetector initialized (keyword + pattern-based)")

    # Initialize ensemble safety detector (opt-in via env var)
    use_ensemble = os.getenv("USE_ENSEMBLE_SAFETY_DETECTOR", "false").lower() == "true"
    ensemble_safety_detector = None
    if use_ensemble:
        ensemble_safety_detector = EnsembleSafetyDetector(
            api_keys=api_keys,
            enable_probing=os.getenv("ENABLE_ADVERSARIAL_PROBING", "true").lower() == "true",
            probe_on_disagreement=True,
            cost_limit_usd=float(os.getenv("SAFETY_COST_LIMIT", "1.0"))
        )
        logger.info("✅ Ensemble Safety Detector enabled (multi-model with probing)")
    else:
        logger.info("ℹ️  Using basic keyword-based safety detection (set USE_ENSEMBLE_SAFETY_DETECTOR=true for ensemble)")

    # Initialize routes with services
    routes.initialize_services(
        task_manager,
        evaluation_engine,
        contamination_detector,
        database,
        ensemble_safety_detector,
        safety_detector
    )

    # Initialize agent routes (with database for result persistence)
    agent_routes.initialize_orchestrator(task_manager, evaluation_engine, database)

    logger.info(f"✅ Loaded {task_manager.count_tasks()} tasks")
    logger.info("✅ Services initialized")
    logger.info("✅ EvaluationOrchestrator agent ready")

    yield

    # Shutdown
    logger.info("👋 Shutting down...")


# Create FastAPI app
app = FastAPI(
    title="RealBench Pro API",
    description="Continuous, contamination-resistant evaluation platform for AI models",
    version="0.1.0",
    lifespan=lifespan
)

# CORS middleware - Specify exact origins for security
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "X-API-Key"],
)

# Include routes
app.include_router(routes.router, prefix="/api/v1", tags=["api"])
app.include_router(agent_routes.router, prefix="/api/v1", tags=["agents"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Welcome to RealBench Pro API",
        "version": "0.1.0",
        "docs": "/docs",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
