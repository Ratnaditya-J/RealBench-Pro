"""
RealBench Pro AI Agents

This package contains autonomous agents that enhance the RealBench Pro platform:
- EvaluationOrchestrator: Dynamic benchmark management and resource optimization
- SafetyGuard: Continuous safety monitoring and remediation
- PerformanceOptimizer: Prompt engineering and evaluation-guided optimization
"""

from .evaluation_orchestrator import EvaluationOrchestrator

__all__ = ["EvaluationOrchestrator"]
