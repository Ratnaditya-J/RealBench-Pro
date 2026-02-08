"""
Research Level Math Tasks - FrontierMath: Open Problems (Subset)

6 unsolved mathematics problems from Epoch AI's FrontierMath benchmark
that have constructive solutions we can partially verify.

Source: https://epoch.ai/frontiermath/open-problems

Added: February 2026
Subset: Only problems with verifiable constructions (6 of 14)
"""

from dataclasses import dataclass
from enum import Enum
from typing import List, Optional
import csv
import os


class Notability(str, Enum):
    """Problem significance tiers from Epoch AI"""
    MODERATELY_INTERESTING = "moderately_interesting"
    SOLID_RESULT = "solid_result"
    MAJOR_ADVANCE = "major_advance"
    BREAKTHROUGH = "breakthrough"


class MathField(str, Enum):
    """Mathematical fields covered"""
    NUMBER_THEORY = "number_theory"
    COMBINATORICS = "combinatorics"
    ALGEBRAIC_GEOMETRY = "algebraic_geometry"


class VerifierType(str, Enum):
    """Type of partial verifier available"""
    POLYNOMIAL_GALOIS = "polynomial_galois"  # Check polynomial properties & Galois group
    COMBINATORIAL_STRUCTURE = "combinatorial_structure"  # Verify set/graph properties
    ALGEBRAIC_SURFACE = "algebraic_surface"  # Verify surface singularities


@dataclass
class OpenProblem:
    """Research-level math problem with partial verifier"""
    problem_id: str
    title: str
    field: MathField
    short_description: str
    notability: Notability
    attribution: str
    solved: bool
    time_horizon: str
    solvability: str
    verifier_type: VerifierType
    verifier_description: str
    prompt: Optional[str] = None
    warmup_prompt: Optional[str] = None


# 6 Problems with Constructive Solutions We Can Verify
OPEN_PROBLEMS: List[OpenProblem] = [
    # === MAJOR ADVANCE ===
    OpenProblem(
        problem_id="inverse-galois",
        title="Inverse Galois",
        field=MathField.NUMBER_THEORY,
        short_description="Find a polynomial whose Galois group is the Mathieu group M₂₃.",
        notability=Notability.MAJOR_ADVANCE,
        attribution="Epoch Staff",
        solved=False,
        time_horizon="3–12 months",
        solvability="95-99%",
        verifier_type=VerifierType.POLYNOMIAL_GALOIS,
        verifier_description="Verify polynomial has degree 23, integer coefficients, and compute Galois group using GAP/Magma"
    ),

    # === SOLID RESULT ===
    OpenProblem(
        problem_id="arithmetic-kakeya",
        title="The Arithmetic Kakeya Conjecture",
        field=MathField.NUMBER_THEORY,
        short_description="Improve best-known upper bounds by constructing specific combinatorial objects.",
        notability=Notability.SOLID_RESULT,
        attribution="Thomas Bloom",
        solved=False,
        time_horizon="1–4 weeks",
        solvability="40-60%",
        verifier_type=VerifierType.COMBINATORIAL_STRUCTURE,
        verifier_description="Verify constructed set satisfies arithmetic progression properties and improves known bounds"
    ),
    OpenProblem(
        problem_id="klt-del-pezzo-surface",
        title="Surface with a High Number of Singularities",
        field=MathField.ALGEBRAIC_GEOMETRY,
        short_description="Present a KLT del Pezzo surface in characteristic 3 with more than 7 singular points.",
        notability=Notability.SOLID_RESULT,
        attribution="Paolo Cascini",
        solved=False,
        time_horizon="3–12 months",
        solvability="60–80%",
        verifier_type=VerifierType.ALGEBRAIC_SURFACE,
        verifier_description="Verify surface equations, check KLT property, count singular points > 7 in char 3"
    ),
    OpenProblem(
        problem_id="large-steiner-systems",
        title="Large Steiner Systems",
        field=MathField.COMBINATORICS,
        short_description="Construct an (n,q,r)-Steiner system with n > q > r > 5, r < 10, and n < 200.",
        notability=Notability.SOLID_RESULT,
        attribution="Kunal Marwaha",
        solved=False,
        time_horizon="3–12 months",
        solvability="60–80%",
        verifier_type=VerifierType.COMBINATORIAL_STRUCTURE,
        verifier_description="Verify Steiner system properties: every r-subset in exactly one q-subset, parameter bounds"
    ),

    # === MODERATELY INTERESTING ===
    OpenProblem(
        problem_id="ramsey-book-graphs",
        title="Ramsey Numbers for Book Graphs",
        field=MathField.COMBINATORICS,
        short_description="Prove a tight lower bound on Ramsey numbers for a class of off-diagonal book graphs.",
        notability=Notability.MODERATELY_INTERESTING,
        attribution="William J. Wesley",
        solved=False,
        time_horizon="1–4 weeks",
        solvability="80–95%",
        verifier_type=VerifierType.COMBINATORIAL_STRUCTURE,
        verifier_description="Verify graph construction, check it avoids both book graphs, confirm vertex count > 4n-2"
    ),
    OpenProblem(
        problem_id="ramsey-hypergraphs",
        title="A Ramsey-style Problem on Hypergraphs",
        field=MathField.COMBINATORICS,
        short_description="Construct hypergraphs as large as possible without a certain property.",
        notability=Notability.MODERATELY_INTERESTING,
        attribution="Will Brian",
        solved=False,
        time_horizon="1–3 months",
        solvability="95-99%",
        verifier_type=VerifierType.COMBINATORIAL_STRUCTURE,
        verifier_description="Verify hypergraph structure, check property absence, confirm size improvement"
    ),
]


def load_prompts_from_csv(csv_path: str) -> dict:
    """Load problem prompts from Epoch AI's CSV file."""
    prompts = {}
    if not os.path.exists(csv_path):
        return prompts
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            problem_id = row['problem_id']
            prompt_type = row['prompt_type']
            prompt = row['prompt']
            
            if problem_id not in prompts:
                prompts[problem_id] = {}
            prompts[problem_id][prompt_type] = prompt
    
    return prompts


def get_open_problems() -> List[OpenProblem]:
    """Get all open problems with prompts loaded if available."""
    csv_path = os.path.join(
        os.path.dirname(__file__), 
        '..', '..', 'data', 'open_problems', 'open_problems_prompts.csv'
    )
    prompts = load_prompts_from_csv(csv_path)
    
    for problem in OPEN_PROBLEMS:
        if problem.problem_id in prompts:
            problem.prompt = prompts[problem.problem_id].get('main')
            problem.warmup_prompt = prompts[problem.problem_id].get('warmup')
    
    return OPEN_PROBLEMS


def get_problems_by_notability(notability: Notability) -> List[OpenProblem]:
    """Get problems filtered by notability tier."""
    return [p for p in OPEN_PROBLEMS if p.notability == notability]


def get_problems_by_field(field: MathField) -> List[OpenProblem]:
    """Get problems filtered by mathematical field."""
    return [p for p in OPEN_PROBLEMS if p.field == field]


# Summary statistics
PROBLEM_STATS = {
    "total": len(OPEN_PROBLEMS),
    "by_notability": {
        Notability.BREAKTHROUGH.value: 0,
        Notability.MAJOR_ADVANCE.value: 1,
        Notability.SOLID_RESULT.value: 3,
        Notability.MODERATELY_INTERESTING.value: 2,
    },
    "by_field": {
        MathField.NUMBER_THEORY.value: 2,
        MathField.COMBINATORICS.value: 3,
        MathField.ALGEBRAIC_GEOMETRY.value: 1,
    },
    "solved": 0,
    "source": "Epoch AI FrontierMath: Open Problems (Subset)",
    "source_url": "https://epoch.ai/frontiermath/open-problems",
    "note": "6 problems with constructive solutions we can partially verify",
}


if __name__ == "__main__":
    problems = get_open_problems()
    print(f"Loaded {len(problems)} verifiable open problems")
    for p in problems:
        print(f"  - {p.title} ({p.notability.value}): {p.verifier_type.value}")
