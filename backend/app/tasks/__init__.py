"""
RealBench Pro Task Definitions

Task categories:
- Standard: GSM8K, MATH, etc.
- Competition: AMC, AIME, IMO
- Graduate: FrontierMath Tiers 1-4
- Research Level: FrontierMath Open Problems (NEW)
"""

from .research_math import (
    OpenProblem,
    Notability,
    MathField,
    VerifierType,
    OPEN_PROBLEMS,
    PROBLEM_STATS,
    get_open_problems,
    get_problems_by_notability,
    get_problems_by_field,
)

__all__ = [
    "OpenProblem",
    "Notability", 
    "MathField",
    "VerifierType",
    "OPEN_PROBLEMS",
    "PROBLEM_STATS",
    "get_open_problems",
    "get_problems_by_notability",
    "get_problems_by_field",
]
