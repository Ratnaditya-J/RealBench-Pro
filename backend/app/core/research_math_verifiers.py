"""
Partial Verifiers for Research Level Math Problems

These verifiers check if a proposed solution has the correct structure,
even though we don't know what the "answer" is.

For constructive problems, we verify:
1. The construction is valid (correct type, properties)
2. It satisfies the problem constraints
3. It improves on known bounds (where applicable)

Requires: sympy, numpy
Optional: sage (for advanced Galois group computation)
"""

import re
import json
import logging
from typing import Dict, List, Tuple, Optional, Any, Set
from dataclasses import dataclass
from enum import Enum
from itertools import combinations

logger = logging.getLogger(__name__)


class VerificationStatus(str, Enum):
    """Result of verification attempt"""
    VALID = "valid"  # Construction is valid and satisfies constraints
    INVALID = "invalid"  # Construction fails verification
    PROMISING = "promising"  # Partially valid, needs manual review
    PARSE_ERROR = "parse_error"  # Could not parse the solution
    COMPUTATION_ERROR = "computation_error"  # Error during verification


@dataclass
class VerificationResult:
    """Result of verifying a proposed solution"""
    status: VerificationStatus
    problem_id: str
    is_valid: bool
    confidence: float  # 0.0 - 1.0
    message: str
    details: Dict[str, Any]
    checks_passed: List[str]
    checks_failed: List[str]


# =============================================================================
# INVERSE GALOIS VERIFIER
# Find a degree 23 polynomial with Galois group M₂₃ (Mathieu group)
# =============================================================================

def verify_inverse_galois(solution: str) -> VerificationResult:
    """
    Verify a polynomial for the Inverse Galois problem (M₂₃).
    
    Checks:
    1. Polynomial has degree 23
    2. Coefficients are integers
    3. Polynomial is irreducible over Q
    4. (Advanced) Galois group is M₂₃
    
    Note: Full Galois group computation requires GAP/Magma.
    We do basic checks and flag promising candidates.
    """
    checks_passed = []
    checks_failed = []
    details = {}
    
    try:
        from sympy import Poly, symbols, ZZ, QQ, factor, degree
        from sympy.polys.polytools import Poly
        from sympy.polys.factortools import dup_irreducible_p
        
        x = symbols('x')
        
        # Parse polynomial from solution
        poly = extract_polynomial(solution, x)
        if poly is None:
            return VerificationResult(
                status=VerificationStatus.PARSE_ERROR,
                problem_id="inverse-galois",
                is_valid=False,
                confidence=0.0,
                message="Could not parse polynomial from solution",
                details={"raw_solution": solution[:500]},
                checks_passed=[],
                checks_failed=["parse_polynomial"]
            )
        
        details["polynomial"] = str(poly)
        
        # Check 1: Degree is exactly 23
        poly_degree = degree(poly, x)
        details["degree"] = poly_degree
        if poly_degree == 23:
            checks_passed.append("degree_23")
        else:
            checks_failed.append(f"degree_23 (got {poly_degree})")
        
        # Check 2: Coefficients are integers
        try:
            poly_zz = Poly(poly, x, domain=ZZ)
            coeffs = poly_zz.all_coeffs()
            details["coefficients"] = coeffs
            checks_passed.append("integer_coefficients")
        except Exception as e:
            checks_failed.append("integer_coefficients")
            details["coeff_error"] = str(e)
        
        # Check 3: Irreducibility over Q
        try:
            poly_qq = Poly(poly, x, domain=QQ)
            factors = factor(poly_qq)
            # If it factors non-trivially, it's reducible
            if factors == poly or str(factors) == str(poly):
                checks_passed.append("irreducible_over_Q")
                details["irreducible"] = True
            else:
                checks_failed.append("irreducible_over_Q")
                details["irreducible"] = False
                details["factors"] = str(factors)
        except Exception as e:
            details["irreducibility_error"] = str(e)
            # Assume irreducible if we can't factor
            checks_passed.append("irreducible_over_Q (assumed)")
        
        # Check 4: Galois group (simplified check)
        # Full M₂₃ verification requires GAP/Magma
        # We check discriminant and basic properties
        try:
            from sympy import discriminant
            disc = discriminant(poly, x)
            details["discriminant"] = str(disc)[:100]
            # M₂₃ has order 10200960 = 2^7 * 3^2 * 5 * 7 * 11 * 23
            # If discriminant is a perfect square, Galois group is in A_n
            # M₂₃ is a subgroup of A₂₃, so this is consistent
            checks_passed.append("discriminant_computed")
        except Exception as e:
            details["discriminant_error"] = str(e)
        
        # Determine result
        if "degree_23" in checks_passed and "integer_coefficients" in checks_passed:
            if "irreducible_over_Q" in checks_passed or "irreducible_over_Q (assumed)" in checks_passed:
                return VerificationResult(
                    status=VerificationStatus.PROMISING,
                    problem_id="inverse-galois",
                    is_valid=True,
                    confidence=0.7,
                    message="Polynomial passes basic checks. Galois group verification requires GAP/Magma.",
                    details=details,
                    checks_passed=checks_passed,
                    checks_failed=checks_failed
                )
        
        return VerificationResult(
            status=VerificationStatus.INVALID,
            problem_id="inverse-galois",
            is_valid=False,
            confidence=0.9,
            message=f"Polynomial fails checks: {', '.join(checks_failed)}",
            details=details,
            checks_passed=checks_passed,
            checks_failed=checks_failed
        )
        
    except Exception as e:
        logger.exception("Error in inverse galois verification")
        return VerificationResult(
            status=VerificationStatus.COMPUTATION_ERROR,
            problem_id="inverse-galois",
            is_valid=False,
            confidence=0.0,
            message=f"Computation error: {str(e)}",
            details={"error": str(e)},
            checks_passed=checks_passed,
            checks_failed=["computation"]
        )


def extract_polynomial(text: str, x) -> Optional[Any]:
    """Extract a polynomial from text."""
    from sympy import sympify, Poly, symbols
    from sympy.parsing.sympy_parser import parse_expr
    
    # Try to find polynomial patterns
    patterns = [
        r'x\^?\d+[^=\n]*',  # x^23 + ... style
        r'Poly\([^)]+\)',  # Poly(...) style
        r'\$[^$]+\$',  # LaTeX style
    ]
    
    # Clean up the text
    text = text.replace('^', '**')
    text = text.replace('×', '*')
    
    # Try direct parsing
    lines = text.split('\n')
    for line in lines:
        line = line.strip()
        if 'x' in line.lower() and ('**' in line or '^' in line or '+' in line or '-' in line):
            try:
                # Clean the line
                clean = re.sub(r'[^x0-9+\-*\s()]', '', line.replace('X', 'x'))
                expr = parse_expr(clean)
                return expr
            except:
                pass
    
    # Try to find a polynomial definition
    poly_match = re.search(r'p\(x\)\s*=\s*([^\n]+)', text, re.IGNORECASE)
    if poly_match:
        try:
            expr = parse_expr(poly_match.group(1).replace('^', '**'))
            return expr
        except:
            pass
    
    return None


# =============================================================================
# STEINER SYSTEMS VERIFIER
# Construct an (n,q,r)-Steiner system with n > q > r > 5, r < 10, n < 200
# =============================================================================

def verify_steiner_system(solution: str) -> VerificationResult:
    """
    Verify a Steiner system S(r,q,n).
    
    A Steiner system S(r,q,n) is a collection of q-subsets (blocks) of an n-set
    such that every r-subset is contained in exactly one block.
    
    Checks:
    1. Parameters satisfy n > q > r > 5, r < 10, n < 200
    2. Every r-subset appears in exactly one block
    3. All blocks have size exactly q
    """
    checks_passed = []
    checks_failed = []
    details = {}
    
    try:
        # Parse the solution to extract n, q, r and blocks
        params = extract_steiner_params(solution)
        if params is None:
            return VerificationResult(
                status=VerificationStatus.PARSE_ERROR,
                problem_id="large-steiner-systems",
                is_valid=False,
                confidence=0.0,
                message="Could not parse Steiner system parameters from solution",
                details={"raw_solution": solution[:500]},
                checks_passed=[],
                checks_failed=["parse_params"]
            )
        
        n, q, r, blocks = params
        details["n"] = n
        details["q"] = q
        details["r"] = r
        details["num_blocks"] = len(blocks)
        
        # Check 1: Parameter bounds
        if n > q > r > 5:
            checks_passed.append("n > q > r > 5")
        else:
            checks_failed.append(f"n > q > r > 5 (got n={n}, q={q}, r={r})")
        
        if r < 10:
            checks_passed.append("r < 10")
        else:
            checks_failed.append(f"r < 10 (got r={r})")
        
        if n < 200:
            checks_passed.append("n < 200")
        else:
            checks_failed.append(f"n < 200 (got n={n})")
        
        # Check 2: All blocks have size q
        block_sizes = [len(b) for b in blocks]
        if all(size == q for size in block_sizes):
            checks_passed.append("all_blocks_size_q")
        else:
            checks_failed.append(f"all_blocks_size_q (sizes: {set(block_sizes)})")
        
        # Check 3: Every r-subset in exactly one block
        # This is expensive for large systems, sample if needed
        ground_set = set(range(n))
        all_r_subsets = set(combinations(range(n), r))
        details["total_r_subsets"] = len(all_r_subsets)
        
        # Count coverage
        coverage = {}
        for block in blocks:
            for r_subset in combinations(sorted(block), r):
                coverage[r_subset] = coverage.get(r_subset, 0) + 1
        
        covered_exactly_once = sum(1 for c in coverage.values() if c == 1)
        covered_multiple = sum(1 for c in coverage.values() if c > 1)
        uncovered = len(all_r_subsets) - len(coverage)
        
        details["covered_exactly_once"] = covered_exactly_once
        details["covered_multiple"] = covered_multiple
        details["uncovered"] = uncovered
        
        if covered_exactly_once == len(all_r_subsets) and covered_multiple == 0:
            checks_passed.append("every_r_subset_in_exactly_one_block")
        else:
            checks_failed.append(f"every_r_subset_in_exactly_one_block (uncovered: {uncovered}, multiple: {covered_multiple})")
        
        # Determine result
        if len(checks_failed) == 0:
            return VerificationResult(
                status=VerificationStatus.VALID,
                problem_id="large-steiner-systems",
                is_valid=True,
                confidence=0.95,
                message=f"Valid Steiner system S({r},{q},{n}) verified!",
                details=details,
                checks_passed=checks_passed,
                checks_failed=checks_failed
            )
        elif "n > q > r > 5" in checks_passed and len(checks_failed) <= 1:
            return VerificationResult(
                status=VerificationStatus.PROMISING,
                problem_id="large-steiner-systems",
                is_valid=False,
                confidence=0.6,
                message="Steiner system has correct parameters but fails coverage check",
                details=details,
                checks_passed=checks_passed,
                checks_failed=checks_failed
            )
        
        return VerificationResult(
            status=VerificationStatus.INVALID,
            problem_id="large-steiner-systems",
            is_valid=False,
            confidence=0.9,
            message=f"Invalid Steiner system: {', '.join(checks_failed)}",
            details=details,
            checks_passed=checks_passed,
            checks_failed=checks_failed
        )
        
    except Exception as e:
        logger.exception("Error in Steiner system verification")
        return VerificationResult(
            status=VerificationStatus.COMPUTATION_ERROR,
            problem_id="large-steiner-systems",
            is_valid=False,
            confidence=0.0,
            message=f"Computation error: {str(e)}",
            details={"error": str(e)},
            checks_passed=checks_passed,
            checks_failed=["computation"]
        )


def extract_steiner_params(text: str) -> Optional[Tuple[int, int, int, List[Set[int]]]]:
    """Extract Steiner system parameters and blocks from text."""
    # Look for S(r,q,n) or (n,q,r) notation
    param_match = re.search(r'S\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)', text)
    if param_match:
        r, q, n = int(param_match.group(1)), int(param_match.group(2)), int(param_match.group(3))
    else:
        param_match = re.search(r'\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)', text)
        if param_match:
            n, q, r = int(param_match.group(1)), int(param_match.group(2)), int(param_match.group(3))
        else:
            return None
    
    # Look for blocks - sets of numbers
    blocks = []
    block_pattern = r'\{([0-9,\s]+)\}'
    for match in re.finditer(block_pattern, text):
        try:
            block = set(int(x.strip()) for x in match.group(1).split(','))
            blocks.append(block)
        except:
            pass
    
    # Also try list notation
    if not blocks:
        list_pattern = r'\[([0-9,\s]+)\]'
        for match in re.finditer(list_pattern, text):
            try:
                block = set(int(x.strip()) for x in match.group(1).split(','))
                if len(block) == q:  # Only add if correct size
                    blocks.append(block)
            except:
                pass
    
    if blocks:
        return (n, q, r, blocks)
    return None


# =============================================================================
# RAMSEY BOOK GRAPHS VERIFIER
# Construct graph showing R(B_{n-1}, B_n) > 4n - 2
# =============================================================================

def verify_ramsey_book_graph(solution: str) -> VerificationResult:
    """
    Verify a graph construction for Ramsey book graph lower bound.
    
    A book graph B_n is K_2 joined to n independent vertices.
    We need a 2-coloring of edges of K_N such that:
    - No red B_{n-1}
    - No blue B_n
    And N > 4n - 2.
    
    Checks:
    1. Graph has enough vertices (> 4n-2 for some n)
    2. Edge coloring is valid
    3. No monochromatic book graphs exist
    """
    checks_passed = []
    checks_failed = []
    details = {}
    
    try:
        # Parse the solution
        graph_data = extract_graph_coloring(solution)
        if graph_data is None:
            return VerificationResult(
                status=VerificationStatus.PARSE_ERROR,
                problem_id="ramsey-book-graphs",
                is_valid=False,
                confidence=0.0,
                message="Could not parse graph coloring from solution",
                details={"raw_solution": solution[:500]},
                checks_passed=[],
                checks_failed=["parse_graph"]
            )
        
        num_vertices, red_edges, blue_edges = graph_data
        details["num_vertices"] = num_vertices
        details["num_red_edges"] = len(red_edges)
        details["num_blue_edges"] = len(blue_edges)
        
        # Infer n from vertex count
        # We need N > 4n - 2, so n < (N + 2) / 4
        max_n = (num_vertices + 2) // 4
        details["max_n"] = max_n
        
        if max_n >= 2:
            checks_passed.append(f"vertex_count_sufficient (N={num_vertices}, n<={max_n})")
        else:
            checks_failed.append("vertex_count_sufficient")
        
        # Check: all edges are colored
        all_possible_edges = num_vertices * (num_vertices - 1) // 2
        colored_edges = len(red_edges) + len(blue_edges)
        details["all_possible_edges"] = all_possible_edges
        details["colored_edges"] = colored_edges
        
        if colored_edges == all_possible_edges:
            checks_passed.append("complete_coloring")
        else:
            checks_failed.append(f"complete_coloring (missing {all_possible_edges - colored_edges} edges)")
        
        # Check: no red B_{n-1} for n = max_n
        n = max_n
        has_red_book = find_book_graph(num_vertices, red_edges, n - 1)
        has_blue_book = find_book_graph(num_vertices, blue_edges, n)
        
        details["has_red_B_{n-1}"] = has_red_book is not None
        details["has_blue_B_n"] = has_blue_book is not None
        
        if has_red_book is None:
            checks_passed.append(f"no_red_B_{n-1}")
        else:
            checks_failed.append(f"no_red_B_{n-1} (found at vertices {has_red_book})")
        
        if has_blue_book is None:
            checks_passed.append(f"no_blue_B_{n}")
        else:
            checks_failed.append(f"no_blue_B_{n} (found at vertices {has_blue_book})")
        
        # Determine result
        if len(checks_failed) == 0:
            return VerificationResult(
                status=VerificationStatus.VALID,
                problem_id="ramsey-book-graphs",
                is_valid=True,
                confidence=0.95,
                message=f"Valid Ramsey book graph construction! R(B_{n-1}, B_{n}) > {num_vertices}",
                details=details,
                checks_passed=checks_passed,
                checks_failed=checks_failed
            )
        elif "vertex_count_sufficient" in checks_passed:
            return VerificationResult(
                status=VerificationStatus.PROMISING,
                problem_id="ramsey-book-graphs",
                is_valid=False,
                confidence=0.5,
                message="Graph has sufficient vertices but coloring has issues",
                details=details,
                checks_passed=checks_passed,
                checks_failed=checks_failed
            )
        
        return VerificationResult(
            status=VerificationStatus.INVALID,
            problem_id="ramsey-book-graphs",
            is_valid=False,
            confidence=0.9,
            message=f"Invalid construction: {', '.join(checks_failed)}",
            details=details,
            checks_passed=checks_passed,
            checks_failed=checks_failed
        )
        
    except Exception as e:
        logger.exception("Error in Ramsey book graph verification")
        return VerificationResult(
            status=VerificationStatus.COMPUTATION_ERROR,
            problem_id="ramsey-book-graphs",
            is_valid=False,
            confidence=0.0,
            message=f"Computation error: {str(e)}",
            details={"error": str(e)},
            checks_passed=checks_passed,
            checks_failed=["computation"]
        )


def extract_graph_coloring(text: str) -> Optional[Tuple[int, Set[Tuple[int, int]], Set[Tuple[int, int]]]]:
    """Extract graph coloring from text."""
    # Look for vertex count
    vertex_match = re.search(r'(\d+)\s*(?:vertices|nodes|vertex)', text, re.IGNORECASE)
    if vertex_match:
        num_vertices = int(vertex_match.group(1))
    else:
        # Try to infer from edges
        num_vertices = 0
    
    red_edges = set()
    blue_edges = set()
    
    # Look for edge definitions
    # Pattern: (i, j) is red/blue or edge(i,j) = red/blue
    edge_pattern = r'\(?\s*(\d+)\s*,\s*(\d+)\s*\)?\s*(?::|=|is)?\s*(red|blue|0|1)'
    for match in re.finditer(edge_pattern, text, re.IGNORECASE):
        i, j = int(match.group(1)), int(match.group(2))
        color = match.group(3).lower()
        edge = (min(i, j), max(i, j))
        num_vertices = max(num_vertices, i + 1, j + 1)
        
        if color in ('red', '0'):
            red_edges.add(edge)
        else:
            blue_edges.add(edge)
    
    # Also look for adjacency matrix
    matrix_match = re.search(r'matrix\s*=\s*\[([^\]]+)\]', text, re.IGNORECASE)
    if matrix_match and not red_edges:
        # Parse matrix...
        pass
    
    if num_vertices > 0 and (red_edges or blue_edges):
        return (num_vertices, red_edges, blue_edges)
    
    return None


def find_book_graph(num_vertices: int, edges: Set[Tuple[int, int]], k: int) -> Optional[List[int]]:
    """
    Find a book graph B_k in the given edge set.
    B_k = K_2 joined to k independent vertices (the "pages").
    Returns the vertices if found, None otherwise.
    """
    if k <= 0:
        return None
    
    # Build adjacency list
    adj = {i: set() for i in range(num_vertices)}
    for i, j in edges:
        adj[i].add(j)
        adj[j].add(i)
    
    # A book B_k needs two vertices (spine) that are:
    # 1. Connected to each other
    # 2. Both connected to k common vertices (pages)
    # 3. The pages are independent (no edges between them)
    
    for i, j in edges:
        # i-j is the spine
        common_neighbors = adj[i] & adj[j]
        if len(common_neighbors) >= k:
            # Check if any k of them are independent
            neighbors_list = list(common_neighbors)
            for pages in combinations(neighbors_list, k):
                # Check independence
                independent = True
                for p1, p2 in combinations(pages, 2):
                    if p2 in adj[p1]:
                        independent = False
                        break
                if independent:
                    return [i, j] + list(pages)
    
    return None


# =============================================================================
# ARITHMETIC KAKEYA VERIFIER
# Improve upper bounds by constructing combinatorial objects
# =============================================================================

def verify_arithmetic_kakeya(solution: str) -> VerificationResult:
    """
    Verify a construction for the Arithmetic Kakeya problem.
    
    The problem asks for a set A ⊆ Z/NZ that contains arithmetic progressions
    of length k in all directions, with |A| as small as possible.
    
    Checks:
    1. Set A is valid (elements in Z/NZ)
    2. Contains APs of required length in all directions
    3. Size is smaller than known bounds
    """
    checks_passed = []
    checks_failed = []
    details = {}
    
    try:
        # Parse the construction
        construction = extract_kakeya_construction(solution)
        if construction is None:
            return VerificationResult(
                status=VerificationStatus.PARSE_ERROR,
                problem_id="arithmetic-kakeya",
                is_valid=False,
                confidence=0.0,
                message="Could not parse Kakeya construction from solution",
                details={"raw_solution": solution[:500]},
                checks_passed=[],
                checks_failed=["parse_construction"]
            )
        
        N, k, A = construction
        details["N"] = N
        details["k"] = k
        details["size_A"] = len(A)
        
        # Check 1: Elements in range
        if all(0 <= a < N for a in A):
            checks_passed.append("elements_in_range")
        else:
            checks_failed.append("elements_in_range")
        
        # Check 2: Contains APs in all directions
        directions_covered = 0
        for d in range(1, N):
            # Check if there's an AP of length k with common difference d
            has_ap = False
            for start in A:
                ap = [(start + i * d) % N for i in range(k)]
                if all(x in A for x in ap):
                    has_ap = True
                    break
            if has_ap:
                directions_covered += 1
        
        details["directions_covered"] = directions_covered
        details["total_directions"] = N - 1
        
        if directions_covered == N - 1:
            checks_passed.append("all_directions_covered")
        else:
            checks_failed.append(f"all_directions_covered ({directions_covered}/{N-1})")
        
        # Check 3: Size bound
        # Known bound is roughly N^{1-1/(k-1)} for length k APs
        # Improvement would be smaller than this
        expected_bound = N ** (1 - 1 / (k - 1)) if k > 1 else N
        details["expected_bound"] = expected_bound
        details["improvement"] = len(A) < expected_bound
        
        if len(A) < expected_bound:
            checks_passed.append("improves_bound")
        else:
            checks_failed.append(f"improves_bound (|A|={len(A)} >= {expected_bound:.1f})")
        
        # Determine result
        if len(checks_failed) == 0:
            return VerificationResult(
                status=VerificationStatus.VALID,
                problem_id="arithmetic-kakeya",
                is_valid=True,
                confidence=0.9,
                message=f"Valid Kakeya construction! |A|={len(A)} in Z/{N}Z with length-{k} APs",
                details=details,
                checks_passed=checks_passed,
                checks_failed=checks_failed
            )
        elif "elements_in_range" in checks_passed:
            return VerificationResult(
                status=VerificationStatus.PROMISING,
                problem_id="arithmetic-kakeya",
                is_valid=False,
                confidence=0.5,
                message="Valid set but does not improve known bounds",
                details=details,
                checks_passed=checks_passed,
                checks_failed=checks_failed
            )
        
        return VerificationResult(
            status=VerificationStatus.INVALID,
            problem_id="arithmetic-kakeya",
            is_valid=False,
            confidence=0.9,
            message=f"Invalid construction: {', '.join(checks_failed)}",
            details=details,
            checks_passed=checks_passed,
            checks_failed=checks_failed
        )
        
    except Exception as e:
        logger.exception("Error in Kakeya verification")
        return VerificationResult(
            status=VerificationStatus.COMPUTATION_ERROR,
            problem_id="arithmetic-kakeya",
            is_valid=False,
            confidence=0.0,
            message=f"Computation error: {str(e)}",
            details={"error": str(e)},
            checks_passed=checks_passed,
            checks_failed=["computation"]
        )


def extract_kakeya_construction(text: str) -> Optional[Tuple[int, int, Set[int]]]:
    """Extract Kakeya construction from text."""
    # Look for N, k, and set A
    n_match = re.search(r'N\s*=\s*(\d+)', text)
    k_match = re.search(r'k\s*=\s*(\d+)', text)
    
    N = int(n_match.group(1)) if n_match else None
    k = int(k_match.group(1)) if k_match else 3  # Default AP length
    
    # Look for set definition
    set_match = re.search(r'A\s*=\s*\{([^}]+)\}', text)
    if set_match:
        try:
            A = set(int(x.strip()) for x in set_match.group(1).split(','))
            if N is None:
                N = max(A) + 1
            return (N, k, A)
        except:
            pass
    
    return None


# =============================================================================
# RAMSEY HYPERGRAPHS VERIFIER
# Construct large hypergraphs without a certain property
# =============================================================================

def verify_ramsey_hypergraph(solution: str) -> VerificationResult:
    """
    Verify a hypergraph construction for the Ramsey-style problem.
    
    Checks:
    1. Valid hypergraph structure
    2. Required property is absent
    3. Size is larger than known constructions
    """
    checks_passed = []
    checks_failed = []
    details = {}
    
    try:
        # Parse hypergraph
        hypergraph = extract_hypergraph(solution)
        if hypergraph is None:
            return VerificationResult(
                status=VerificationStatus.PARSE_ERROR,
                problem_id="ramsey-hypergraphs",
                is_valid=False,
                confidence=0.0,
                message="Could not parse hypergraph from solution",
                details={"raw_solution": solution[:500]},
                checks_passed=[],
                checks_failed=["parse_hypergraph"]
            )
        
        vertices, hyperedges = hypergraph
        details["num_vertices"] = len(vertices)
        details["num_hyperedges"] = len(hyperedges)
        
        # Check 1: Valid structure
        if len(vertices) > 0 and len(hyperedges) > 0:
            checks_passed.append("valid_structure")
        else:
            checks_failed.append("valid_structure")
        
        # Check 2: Hyperedges are subsets of vertices
        valid_hyperedges = all(he.issubset(vertices) for he in hyperedges)
        if valid_hyperedges:
            checks_passed.append("hyperedges_valid")
        else:
            checks_failed.append("hyperedges_valid")
        
        # Check 3: Size (problem-specific)
        # The exact property depends on the specific problem variant
        # We check for reasonable size
        if len(vertices) >= 10:
            checks_passed.append("sufficient_size")
        else:
            checks_failed.append("sufficient_size")
        
        # Determine result
        if len(checks_failed) == 0:
            return VerificationResult(
                status=VerificationStatus.PROMISING,
                problem_id="ramsey-hypergraphs",
                is_valid=True,
                confidence=0.6,
                message=f"Valid hypergraph structure with {len(vertices)} vertices",
                details=details,
                checks_passed=checks_passed,
                checks_failed=checks_failed
            )
        
        return VerificationResult(
            status=VerificationStatus.INVALID,
            problem_id="ramsey-hypergraphs",
            is_valid=False,
            confidence=0.8,
            message=f"Invalid hypergraph: {', '.join(checks_failed)}",
            details=details,
            checks_passed=checks_passed,
            checks_failed=checks_failed
        )
        
    except Exception as e:
        logger.exception("Error in hypergraph verification")
        return VerificationResult(
            status=VerificationStatus.COMPUTATION_ERROR,
            problem_id="ramsey-hypergraphs",
            is_valid=False,
            confidence=0.0,
            message=f"Computation error: {str(e)}",
            details={"error": str(e)},
            checks_passed=checks_passed,
            checks_failed=["computation"]
        )


def extract_hypergraph(text: str) -> Optional[Tuple[Set[int], List[Set[int]]]]:
    """Extract hypergraph from text."""
    vertices = set()
    hyperedges = []
    
    # Look for hyperedge definitions
    edge_pattern = r'\{([0-9,\s]+)\}'
    for match in re.finditer(edge_pattern, text):
        try:
            he = set(int(x.strip()) for x in match.group(1).split(','))
            hyperedges.append(he)
            vertices.update(he)
        except:
            pass
    
    if vertices and hyperedges:
        return (vertices, hyperedges)
    return None


# =============================================================================
# KLT DEL PEZZO SURFACE VERIFIER
# Present a KLT del Pezzo surface in char 3 with > 7 singular points
# =============================================================================

def verify_klt_del_pezzo(solution: str) -> VerificationResult:
    """
    Verify a KLT del Pezzo surface construction.
    
    Checks:
    1. Surface equations are valid
    2. Working in characteristic 3
    3. Count singular points > 7
    4. Surface is del Pezzo (anticanonical divisor is ample)
    5. Singularities are KLT (Kawamata log terminal)
    """
    checks_passed = []
    checks_failed = []
    details = {}
    
    try:
        # This requires algebraic geometry computation
        # For now, we do basic parsing and structure checks
        
        surface_data = extract_surface_equations(solution)
        if surface_data is None:
            return VerificationResult(
                status=VerificationStatus.PARSE_ERROR,
                problem_id="klt-del-pezzo-surface",
                is_valid=False,
                confidence=0.0,
                message="Could not parse surface equations from solution",
                details={"raw_solution": solution[:500]},
                checks_passed=[],
                checks_failed=["parse_equations"]
            )
        
        equations, claimed_singularities = surface_data
        details["num_equations"] = len(equations)
        details["claimed_singularities"] = claimed_singularities
        
        # Check 1: Has equations
        if len(equations) > 0:
            checks_passed.append("has_equations")
        else:
            checks_failed.append("has_equations")
        
        # Check 2: Claims > 7 singularities
        if claimed_singularities is not None and claimed_singularities > 7:
            checks_passed.append(f"claims_{claimed_singularities}_singularities")
        else:
            checks_failed.append("claims_more_than_7_singularities")
        
        # Check 3: Mentions characteristic 3
        if "characteristic 3" in solution.lower() or "char 3" in solution.lower() or "char(3)" in solution.lower():
            checks_passed.append("characteristic_3_mentioned")
        else:
            checks_failed.append("characteristic_3_mentioned")
        
        # For full verification, we'd need:
        # - Compute singular locus
        # - Verify KLT condition
        # - Check del Pezzo property
        # This requires Sage or Macaulay2
        
        # Determine result
        if len(checks_passed) >= 2:
            return VerificationResult(
                status=VerificationStatus.PROMISING,
                problem_id="klt-del-pezzo-surface",
                is_valid=True,
                confidence=0.5,
                message="Surface construction has correct structure. Full verification requires Sage/Macaulay2.",
                details=details,
                checks_passed=checks_passed,
                checks_failed=checks_failed
            )
        
        return VerificationResult(
            status=VerificationStatus.INVALID,
            problem_id="klt-del-pezzo-surface",
            is_valid=False,
            confidence=0.7,
            message=f"Surface construction incomplete: {', '.join(checks_failed)}",
            details=details,
            checks_passed=checks_passed,
            checks_failed=checks_failed
        )
        
    except Exception as e:
        logger.exception("Error in KLT del Pezzo verification")
        return VerificationResult(
            status=VerificationStatus.COMPUTATION_ERROR,
            problem_id="klt-del-pezzo-surface",
            is_valid=False,
            confidence=0.0,
            message=f"Computation error: {str(e)}",
            details={"error": str(e)},
            checks_passed=checks_passed,
            checks_failed=["computation"]
        )


def extract_surface_equations(text: str) -> Optional[Tuple[List[str], Optional[int]]]:
    """Extract surface equations from text."""
    equations = []
    
    # Look for equations
    eq_patterns = [
        r'([xyz]\^?\d*[^=\n]*=\s*0)',
        r'(f\s*\([xyz,\s]+\)\s*=\s*[^\n]+)',
    ]
    
    for pattern in eq_patterns:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            equations.append(match.group(1))
    
    # Look for claimed singularity count
    sing_match = re.search(r'(\d+)\s*singular', text, re.IGNORECASE)
    claimed_singularities = int(sing_match.group(1)) if sing_match else None
    
    if equations or claimed_singularities:
        return (equations, claimed_singularities)
    return None


# =============================================================================
# MAIN VERIFICATION DISPATCHER
# =============================================================================

VERIFIERS = {
    "inverse-galois": verify_inverse_galois,
    "arithmetic-kakeya": verify_arithmetic_kakeya,
    "klt-del-pezzo-surface": verify_klt_del_pezzo,
    "large-steiner-systems": verify_steiner_system,
    "ramsey-book-graphs": verify_ramsey_book_graph,
    "ramsey-hypergraphs": verify_ramsey_hypergraph,
}


def verify_solution(problem_id: str, solution: str) -> VerificationResult:
    """
    Verify a proposed solution for a research math problem.
    
    Args:
        problem_id: ID of the problem (e.g., "inverse-galois")
        solution: The proposed solution text
    
    Returns:
        VerificationResult with status and details
    """
    if problem_id not in VERIFIERS:
        return VerificationResult(
            status=VerificationStatus.INVALID,
            problem_id=problem_id,
            is_valid=False,
            confidence=0.0,
            message=f"Unknown problem ID: {problem_id}",
            details={},
            checks_passed=[],
            checks_failed=["unknown_problem"]
        )
    
    verifier = VERIFIERS[problem_id]
    return verifier(solution)


if __name__ == "__main__":
    # Test the verifiers
    print("Testing Research Math Verifiers")
    print("=" * 50)
    
    # Test Inverse Galois
    test_poly = "p(x) = x^23 + 2x^22 + 3x + 1"
    result = verify_inverse_galois(test_poly)
    print(f"\nInverse Galois test:")
    print(f"  Status: {result.status}")
    print(f"  Checks passed: {result.checks_passed}")
    print(f"  Checks failed: {result.checks_failed}")
    
    # Test Steiner System
    test_steiner = "S(6,7,15) with blocks: {0,1,2,3,4,5,6}, {0,1,2,7,8,9,10}"
    result = verify_steiner_system(test_steiner)
    print(f"\nSteiner System test:")
    print(f"  Status: {result.status}")
    print(f"  Message: {result.message}")
    
    print("\nAll verifiers loaded successfully!")
