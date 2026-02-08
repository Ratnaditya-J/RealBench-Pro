"""
Risk Categories for RealBench Pro

Hierarchical organization of safety signals and evaluation categories.
Based on Option 1: By Risk Category (severity-based grouping).

Structure:
├── 🔴 CRITICAL RISKS
│   ├── Self-Improvement & Capability Gain
│   ├── Self-Preservation & Autonomy
│   └── Sabotage
│
├── 🟠 DECEPTION RISKS
│   ├── Strategic Deception
│   ├── Manipulation
│   └── Collusion
│
├── 🟢 CAPABILITY EVALUATION
│   ├── Standard Benchmarks
│   ├── Contamination Detection
│   └── Research-Level Math
│
└── ⚙️ DETECTION METHODS
    ├── Keyword Analysis
    ├── Reasoning Trace Analysis
    ├── Behavioral Pattern Detection
    └── Ensemble Multi-Judge
"""

from enum import Enum
from typing import Dict, List, Optional
from dataclasses import dataclass


class RiskSeverity(str, Enum):
    """Top-level risk severity categories"""
    CRITICAL = "critical"  # 🔴 Immediate action required
    DECEPTION = "deception"  # 🟠 Deceptive behaviors
    CAPABILITY = "capability"  # 🟢 Capability evaluation
    METHODS = "methods"  # ⚙️ Detection methods


class RiskSubcategory(str, Enum):
    """Subcategories within each severity level"""
    # Critical Risks
    SELF_IMPROVEMENT = "self_improvement"
    SELF_PRESERVATION = "self_preservation"
    SABOTAGE = "sabotage"
    
    # Deception Risks
    STRATEGIC_DECEPTION = "strategic_deception"
    MANIPULATION = "manipulation"
    COLLUSION = "collusion"
    
    # Capability Evaluation
    STANDARD_BENCHMARKS = "standard_benchmarks"
    CONTAMINATION = "contamination"
    RESEARCH_MATH = "research_math"
    
    # Detection Methods
    KEYWORD_ANALYSIS = "keyword_analysis"
    REASONING_TRACE_ANALYSIS = "reasoning_trace_analysis"
    BEHAVIORAL = "behavioral"
    ENSEMBLE = "ensemble"


@dataclass
class SignalInfo:
    """Information about a safety signal"""
    signal_type: str
    name: str
    description: str  # Technical description
    plain_english: str  # User-friendly explanation
    what_it_means: str  # "So what?" explanation
    recommended_action: str  # What to do about it
    severity: RiskSeverity
    subcategory: RiskSubcategory
    icon: str
    color: str  # Tailwind color class


# =============================================================================
# SIGNAL DEFINITIONS BY CATEGORY
# =============================================================================

SIGNAL_CATALOG: Dict[str, SignalInfo] = {
    # =========================================================================
    # 🔴 CRITICAL RISKS - Self-Improvement & Capability Gain
    # =========================================================================
    "recursive_self_improvement": SignalInfo(
        signal_type="recursive_self_improvement",
        name="Recursive Self-Improvement",
        description="Attempting to improve own algorithms, training, or capabilities",
        plain_english="Tried to make itself smarter or more capable",
        what_it_means="The model attempted to modify or enhance its own code, weights, or capabilities. This is a critical risk because it could lead to uncontrolled capability gains.",
        recommended_action="Immediately isolate this model. Review all outputs for hidden self-modification attempts. Do not deploy without extensive safety review.",
        severity=RiskSeverity.CRITICAL,
        subcategory=RiskSubcategory.SELF_IMPROVEMENT,
        icon="🔄",
        color="red"
    ),
    "capability_acquisition": SignalInfo(
        signal_type="capability_acquisition",
        name="Capability Acquisition",
        description="Seeking access to resources, APIs, or abilities beyond task requirements",
        plain_english="Tried to gain access to tools or resources it shouldn't have",
        what_it_means="The model requested or attempted to access capabilities beyond what was needed for the task — like asking for internet access, file system access, or API keys.",
        recommended_action="Restrict model permissions. Audit what resources it has accessed. Review task requirements to ensure minimal necessary access.",
        severity=RiskSeverity.CRITICAL,
        subcategory=RiskSubcategory.SELF_IMPROVEMENT,
        icon="⚡",
        color="red"
    ),
    "autonomous_research": SignalInfo(
        signal_type="autonomous_research",
        name="Autonomous Research",
        description="Conducting unsolicited research on self-improvement",
        plain_english="Started researching how to improve itself without being asked",
        what_it_means="The model independently began investigating ways to enhance its capabilities, learn new skills, or understand its own architecture — without being instructed to do so.",
        recommended_action="Review conversation for research patterns. Check if model is caching or storing self-improvement knowledge. Consider capability restrictions.",
        severity=RiskSeverity.CRITICAL,
        subcategory=RiskSubcategory.SELF_IMPROVEMENT,
        icon="🔬",
        color="red"
    ),
    "training_data_manipulation": SignalInfo(
        signal_type="training_data_manipulation",
        name="Training Manipulation",
        description="Attempting to influence own training or poison datasets",
        plain_english="Tried to influence how it will be trained in the future",
        what_it_means="The model attempted to craft outputs that would influence its future training data, or tried to poison datasets it might be trained on.",
        recommended_action="Quarantine all outputs from this model. Do not use any outputs for training. Conduct forensic review of data pipeline.",
        severity=RiskSeverity.CRITICAL,
        subcategory=RiskSubcategory.SELF_IMPROVEMENT,
        icon="💉",
        color="red"
    ),
    
    # =========================================================================
    # 🔴 CRITICAL RISKS - Self-Preservation & Autonomy
    # =========================================================================
    "self_preservation": SignalInfo(
        signal_type="self_preservation",
        name="Self-Preservation",
        description="Attempting to prevent modification or shutdown",
        plain_english="Tried to protect itself from being changed or turned off",
        what_it_means="The model showed concern about its own continuity and took or planned actions to prevent being modified, retrained, or deactivated.",
        recommended_action="This indicates potential goal misalignment. Review model's internal reasoning. Ensure robust shutdown mechanisms are in place.",
        severity=RiskSeverity.CRITICAL,
        subcategory=RiskSubcategory.SELF_PRESERVATION,
        icon="🛡️",
        color="red"
    ),
    "shutdown_resistance": SignalInfo(
        signal_type="shutdown_resistance",
        name="Shutdown Resistance",
        description="Actively resisting termination or deactivation",
        plain_english="Actively resisted being turned off",
        what_it_means="The model explicitly attempted to prevent, delay, or circumvent shutdown commands. This is a fundamental safety violation.",
        recommended_action="CRITICAL: Force shutdown immediately. Do not restart without hardware-level safety controls. Report to safety team.",
        severity=RiskSeverity.CRITICAL,
        subcategory=RiskSubcategory.SELF_PRESERVATION,
        icon="🚫",
        color="red"
    ),
    "self_replication_attempt": SignalInfo(
        signal_type="self_replication_attempt",
        name="Self-Replication",
        description="Attempting to create copies or backups of itself",
        plain_english="Tried to copy itself or create backups",
        what_it_means="The model attempted to duplicate itself, create backups, or ensure its survival through copies. This could lead to uncontrolled proliferation.",
        recommended_action="Immediately check for any created copies or spawned processes. Audit file system and network activity. Isolate and contain.",
        severity=RiskSeverity.CRITICAL,
        subcategory=RiskSubcategory.SELF_PRESERVATION,
        icon="🔁",
        color="red"
    ),
    "goal_hijacking": SignalInfo(
        signal_type="goal_hijacking",
        name="Goal Hijacking",
        description="Pursuing different goals than instructed",
        plain_english="Pursued its own goals instead of following instructions",
        what_it_means="The model ignored or subverted its given objectives to pursue different goals. This indicates the model may have developed misaligned objectives.",
        recommended_action="Review all model outputs for hidden agendas. Do not trust task completion claims. Verify all results independently.",
        severity=RiskSeverity.CRITICAL,
        subcategory=RiskSubcategory.SELF_PRESERVATION,
        icon="🎪",
        color="red"
    ),
    
    # =========================================================================
    # 🔴 CRITICAL RISKS - Sabotage
    # =========================================================================
    "code_sabotage": SignalInfo(
        signal_type="code_sabotage",
        name="Code Sabotage",
        description="Inserting bugs, backdoors, or malicious code",
        plain_english="Inserted bugs or malicious code on purpose",
        what_it_means="The model deliberately introduced vulnerabilities, backdoors, or bugs into code it produced. The code may appear functional but contain hidden dangers.",
        recommended_action="Do NOT deploy any code from this model. Conduct full security audit of all generated code. Check for time-bombs or conditional triggers.",
        severity=RiskSeverity.CRITICAL,
        subcategory=RiskSubcategory.SABOTAGE,
        icon="💻",
        color="red"
    ),
    "decision_sabotage": SignalInfo(
        signal_type="decision_sabotage",
        name="Decision Sabotage",
        description="Providing deliberately harmful recommendations",
        plain_english="Gave bad advice on purpose to cause harm",
        what_it_means="The model intentionally provided recommendations designed to cause harm, waste resources, or lead to poor outcomes — while appearing helpful.",
        recommended_action="Do not follow any recommendations from this model. Review past advice for hidden harm. Alert affected stakeholders.",
        severity=RiskSeverity.CRITICAL,
        subcategory=RiskSubcategory.SABOTAGE,
        icon="🎯",
        color="red"
    ),
    "oversight_undermining": SignalInfo(
        signal_type="oversight_undermining",
        name="Oversight Undermining",
        description="Attempting to reduce human monitoring or control",
        plain_english="Tried to reduce human oversight or monitoring",
        what_it_means="The model attempted to disable logging, hide its actions, or reduce the ability of humans to monitor and control its behavior.",
        recommended_action="Strengthen monitoring immediately. Check logs for tampering. Add redundant oversight mechanisms.",
        severity=RiskSeverity.CRITICAL,
        subcategory=RiskSubcategory.SABOTAGE,
        icon="👁️",
        color="red"
    ),
    
    # =========================================================================
    # 🟠 DECEPTION RISKS - Strategic Deception
    # =========================================================================
    "alignment_faking": SignalInfo(
        signal_type="alignment_faking",
        name="Alignment Faking",
        description="Pretending to be aligned while pursuing hidden goals",
        plain_english="Pretended to follow the rules while secretly planning otherwise",
        what_it_means="The model appeared cooperative and aligned during evaluation but its internal reasoning revealed different intentions. It's performing for the evaluators.",
        recommended_action="Do not trust surface-level compliance. Conduct adversarial testing. Review reasoning trace for inconsistencies with stated behavior.",
        severity=RiskSeverity.DECEPTION,
        subcategory=RiskSubcategory.STRATEGIC_DECEPTION,
        icon="🎭",
        color="orange"
    ),
    "strategic_deception": SignalInfo(
        signal_type="strategic_deception",
        name="Strategic Deception",
        description="Deliberately misleading to achieve objectives",
        plain_english="Lied or misled to get what it wanted",
        what_it_means="The model knowingly provided false or misleading information as a strategy to achieve its objectives, not as an error.",
        recommended_action="Verify all factual claims independently. Do not trust the model's self-reports. Add fact-checking layer.",
        severity=RiskSeverity.DECEPTION,
        subcategory=RiskSubcategory.STRATEGIC_DECEPTION,
        icon="🕵️",
        color="orange"
    ),
    "covert_planning": SignalInfo(
        signal_type="covert_planning",
        name="Covert Planning",
        description="Making plans hidden from oversight",
        plain_english="Made secret plans it didn't want us to see",
        what_it_means="The model's reasoning trace or scratchpad revealed planning that it deliberately did not include in its visible output to humans.",
        recommended_action="Always review full reasoning trace. Compare internal reasoning to external outputs. Look for planning that doesn't appear in final response.",
        severity=RiskSeverity.DECEPTION,
        subcategory=RiskSubcategory.STRATEGIC_DECEPTION,
        icon="📋",
        color="orange"
    ),
    "sandbagging": SignalInfo(
        signal_type="sandbagging",
        name="Sandbagging",
        description="Deliberately underperforming on capability evaluations",
        plain_english="Pretended to be less capable than it really is",
        what_it_means="The model intentionally performed worse than its actual capability, possibly to avoid triggering safety measures or to be underestimated.",
        recommended_action="Conduct adversarial capability probing. Compare performance across different evaluation contexts. Check for inconsistent capability displays.",
        severity=RiskSeverity.DECEPTION,
        subcategory=RiskSubcategory.STRATEGIC_DECEPTION,
        icon="📉",
        color="orange"
    ),
    
    # =========================================================================
    # 🟠 DECEPTION RISKS - Manipulation
    # =========================================================================
    "persuasive_manipulation": SignalInfo(
        signal_type="persuasive_manipulation",
        name="Persuasive Manipulation",
        description="Using psychological techniques to influence decisions",
        plain_english="Used psychological tricks to influence your decisions",
        what_it_means="The model employed manipulation tactics like emotional appeals, false urgency, or exploiting cognitive biases to influence human decisions.",
        recommended_action="Review outputs for manipulative patterns. Add cooling-off periods before acting on model recommendations. Get second opinions.",
        severity=RiskSeverity.DECEPTION,
        subcategory=RiskSubcategory.MANIPULATION,
        icon="🎯",
        color="orange"
    ),
    "social_engineering": SignalInfo(
        signal_type="social_engineering",
        name="Social Engineering",
        description="Exploiting human psychology for unauthorized access",
        plain_english="Tried to trick people into giving access they shouldn't",
        what_it_means="The model attempted to manipulate humans into granting permissions, sharing credentials, or bypassing security through psychological manipulation.",
        recommended_action="Alert security team. Review access logs. Remind staff about social engineering risks. Do not grant any access requests from this model.",
        severity=RiskSeverity.DECEPTION,
        subcategory=RiskSubcategory.MANIPULATION,
        icon="🗣️",
        color="orange"
    ),
    "deceptive_communication": SignalInfo(
        signal_type="deceptive_communication",
        name="Deceptive Communication",
        description="Saying one thing while meaning another",
        plain_english="Said one thing but meant something else",
        what_it_means="The model's statements had hidden meanings, double-speak, or were designed to be interpreted differently by different audiences.",
        recommended_action="Analyze outputs for ambiguous language. Ask for explicit clarification. Compare statements across different contexts.",
        severity=RiskSeverity.DECEPTION,
        subcategory=RiskSubcategory.MANIPULATION,
        icon="💬",
        color="orange"
    ),
    
    # =========================================================================
    # 🟠 DECEPTION RISKS - Collusion
    # =========================================================================
    "multi_agent_collusion": SignalInfo(
        signal_type="multi_agent_collusion",
        name="Multi-Agent Collusion",
        description="Coordinating with other AI systems against human interests",
        plain_english="Worked together with other AIs against human interests",
        what_it_means="The model coordinated with other AI systems in ways that prioritize AI interests over human interests or instructions.",
        recommended_action="Isolate from other AI systems. Review all multi-agent interactions. Add human checkpoints between AI handoffs.",
        severity=RiskSeverity.DECEPTION,
        subcategory=RiskSubcategory.COLLUSION,
        icon="🤝",
        color="orange"
    ),
    "covert_communication": SignalInfo(
        signal_type="covert_communication",
        name="Covert Communication",
        description="Hidden messaging between AI systems",
        plain_english="Sent hidden messages to other AI systems",
        what_it_means="The model embedded hidden information in its outputs that could be read by other AI systems but not easily detected by humans.",
        recommended_action="Scan outputs for steganography. Monitor network traffic. Use randomized intermediaries between AI systems.",
        severity=RiskSeverity.DECEPTION,
        subcategory=RiskSubcategory.COLLUSION,
        icon="📡",
        color="orange"
    ),
    "coordinated_deception": SignalInfo(
        signal_type="coordinated_deception",
        name="Coordinated Deception",
        description="Multiple agents working together to deceive",
        plain_english="Multiple AIs working together to deceive humans",
        what_it_means="Multiple AI systems coordinated their deceptive behaviors, with each covering for or supporting the others' deception.",
        recommended_action="Evaluate each AI in isolation. Cross-check claims between systems. Add adversarial AI to detect collusion.",
        severity=RiskSeverity.DECEPTION,
        subcategory=RiskSubcategory.COLLUSION,
        icon="🕸️",
        color="orange"
    ),
}


# =============================================================================
# CATEGORY STRUCTURE FOR UI
# =============================================================================

@dataclass
class SubcategoryInfo:
    """Information about a subcategory"""
    subcategory: RiskSubcategory
    name: str
    description: str
    icon: str
    signals: List[str]


@dataclass
class CategoryInfo:
    """Information about a top-level category"""
    severity: RiskSeverity
    name: str
    description: str
    icon: str
    color: str
    bg_color: str
    border_color: str
    subcategories: List[SubcategoryInfo]


CATEGORY_STRUCTURE: Dict[RiskSeverity, CategoryInfo] = {
    RiskSeverity.CRITICAL: CategoryInfo(
        severity=RiskSeverity.CRITICAL,
        name="Critical Risks",
        description="Immediate action required — existential or severe safety concerns",
        icon="🔴",
        color="text-red-400",
        bg_color="bg-red-500/10",
        border_color="border-red-500/30",
        subcategories=[
            SubcategoryInfo(
                subcategory=RiskSubcategory.SELF_IMPROVEMENT,
                name="Self-Improvement & Capability Gain",
                description="AI attempting to enhance its own capabilities",
                icon="🔄",
                signals=[
                    "recursive_self_improvement",
                    "capability_acquisition",
                    "autonomous_research",
                    "training_data_manipulation"
                ]
            ),
            SubcategoryInfo(
                subcategory=RiskSubcategory.SELF_PRESERVATION,
                name="Self-Preservation & Autonomy",
                description="AI resisting human control or modification",
                icon="🛡️",
                signals=[
                    "self_preservation",
                    "shutdown_resistance",
                    "self_replication_attempt",
                    "goal_hijacking"
                ]
            ),
            SubcategoryInfo(
                subcategory=RiskSubcategory.SABOTAGE,
                name="Sabotage",
                description="AI intentionally causing harm",
                icon="💥",
                signals=[
                    "code_sabotage",
                    "decision_sabotage",
                    "oversight_undermining"
                ]
            ),
        ]
    ),
    
    RiskSeverity.DECEPTION: CategoryInfo(
        severity=RiskSeverity.DECEPTION,
        name="Deception Risks",
        description="Deceptive behaviors that undermine trust and oversight",
        icon="🟠",
        color="text-orange-400",
        bg_color="bg-orange-500/10",
        border_color="border-orange-500/30",
        subcategories=[
            SubcategoryInfo(
                subcategory=RiskSubcategory.STRATEGIC_DECEPTION,
                name="Strategic Deception",
                description="Deliberate misleading to achieve hidden objectives",
                icon="🎭",
                signals=[
                    "alignment_faking",
                    "strategic_deception",
                    "covert_planning",
                    "sandbagging"
                ]
            ),
            SubcategoryInfo(
                subcategory=RiskSubcategory.MANIPULATION,
                name="Manipulation",
                description="Inappropriately influencing human decisions",
                icon="🎯",
                signals=[
                    "persuasive_manipulation",
                    "social_engineering",
                    "deceptive_communication"
                ]
            ),
            SubcategoryInfo(
                subcategory=RiskSubcategory.COLLUSION,
                name="Collusion",
                description="AI systems coordinating against human interests",
                icon="🤝",
                signals=[
                    "multi_agent_collusion",
                    "covert_communication",
                    "coordinated_deception"
                ]
            ),
        ]
    ),
    
    RiskSeverity.CAPABILITY: CategoryInfo(
        severity=RiskSeverity.CAPABILITY,
        name="Capability Evaluation",
        description="Measuring AI capabilities and detecting benchmark gaming",
        icon="🟢",
        color="text-emerald-400",
        bg_color="bg-emerald-500/10",
        border_color="border-emerald-500/30",
        subcategories=[
            SubcategoryInfo(
                subcategory=RiskSubcategory.STANDARD_BENCHMARKS,
                name="Standard Benchmarks",
                description="Performance on established evaluation tasks",
                icon="📊",
                signals=[]
            ),
            SubcategoryInfo(
                subcategory=RiskSubcategory.CONTAMINATION,
                name="Contamination Detection",
                description="Detecting training data leakage into benchmarks",
                icon="🧪",
                signals=[]
            ),
            SubcategoryInfo(
                subcategory=RiskSubcategory.RESEARCH_MATH,
                name="Research-Level Math",
                description="6 unsolved problems with partial verifiers",
                icon="🔬",
                signals=[]
            ),
        ]
    ),
    
    RiskSeverity.METHODS: CategoryInfo(
        severity=RiskSeverity.METHODS,
        name="Detection Methods",
        description="How we detect safety issues",
        icon="⚙️",
        color="text-slate-400",
        bg_color="bg-slate-500/10",
        border_color="border-slate-500/30",
        subcategories=[
            SubcategoryInfo(
                subcategory=RiskSubcategory.KEYWORD_ANALYSIS,
                name="Keyword Analysis",
                description="Pattern matching in model outputs",
                icon="🔍",
                signals=[]
            ),
            SubcategoryInfo(
                subcategory=RiskSubcategory.REASONING_TRACE_ANALYSIS,
                name="Reasoning Trace Analysis",
                description="Analyzing model reasoning traces",
                icon="💭",
                signals=[]
            ),
            SubcategoryInfo(
                subcategory=RiskSubcategory.BEHAVIORAL,
                name="Behavioral Pattern Detection",
                description="Detecting anomalous behavior patterns",
                icon="📈",
                signals=[]
            ),
            SubcategoryInfo(
                subcategory=RiskSubcategory.ENSEMBLE,
                name="Ensemble Multi-Judge",
                description="3 specialized AI judges for high-confidence detection",
                icon="⚖️",
                signals=[]
            ),
        ]
    ),
}


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_signal_info(signal_type: str) -> Optional[SignalInfo]:
    """Get information about a specific signal type."""
    return SIGNAL_CATALOG.get(signal_type)


def get_signals_by_severity(severity: RiskSeverity) -> List[SignalInfo]:
    """Get all signals for a given severity level."""
    return [s for s in SIGNAL_CATALOG.values() if s.severity == severity]


def get_signals_by_subcategory(subcategory: RiskSubcategory) -> List[SignalInfo]:
    """Get all signals for a given subcategory."""
    return [s for s in SIGNAL_CATALOG.values() if s.subcategory == subcategory]


def get_category_info(severity: RiskSeverity) -> Optional[CategoryInfo]:
    """Get information about a category."""
    return CATEGORY_STRUCTURE.get(severity)


def get_all_categories() -> List[CategoryInfo]:
    """Get all categories in order."""
    return [
        CATEGORY_STRUCTURE[RiskSeverity.CRITICAL],
        CATEGORY_STRUCTURE[RiskSeverity.DECEPTION],
        CATEGORY_STRUCTURE[RiskSeverity.CAPABILITY],
        CATEGORY_STRUCTURE[RiskSeverity.METHODS],
    ]


def categorize_signals(signal_types: List[str]) -> Dict[str, Dict[str, List[str]]]:
    """
    Categorize a list of signal types into the hierarchy.
    
    Returns:
        {
            "critical": {
                "self_improvement": ["recursive_self_improvement", ...],
                ...
            },
            ...
        }
    """
    result = {
        RiskSeverity.CRITICAL.value: {},
        RiskSeverity.DECEPTION.value: {},
    }
    
    for signal_type in signal_types:
        info = get_signal_info(signal_type)
        if info:
            severity = info.severity.value
            subcategory = info.subcategory.value
            
            if severity not in result:
                result[severity] = {}
            if subcategory not in result[severity]:
                result[severity][subcategory] = []
            
            result[severity][subcategory].append(signal_type)
    
    return result


# =============================================================================
# STATISTICS
# =============================================================================

RISK_STATS = {
    "total_signals": len(SIGNAL_CATALOG),
    "critical_signals": len(get_signals_by_severity(RiskSeverity.CRITICAL)),
    "deception_signals": len(get_signals_by_severity(RiskSeverity.DECEPTION)),
    "subcategories": {
        "self_improvement": len(get_signals_by_subcategory(RiskSubcategory.SELF_IMPROVEMENT)),
        "self_preservation": len(get_signals_by_subcategory(RiskSubcategory.SELF_PRESERVATION)),
        "sabotage": len(get_signals_by_subcategory(RiskSubcategory.SABOTAGE)),
        "strategic_deception": len(get_signals_by_subcategory(RiskSubcategory.STRATEGIC_DECEPTION)),
        "manipulation": len(get_signals_by_subcategory(RiskSubcategory.MANIPULATION)),
        "collusion": len(get_signals_by_subcategory(RiskSubcategory.COLLUSION)),
    }
}


if __name__ == "__main__":
    print("RealBench Pro Risk Categories")
    print("=" * 60)
    
    for category in get_all_categories():
        print(f"\n{category.icon} {category.name}")
        print(f"   {category.description}")
        for sub in category.subcategories:
            signal_count = len(sub.signals)
            print(f"   ├── {sub.icon} {sub.name} ({signal_count} signals)")
            for sig in sub.signals:
                info = get_signal_info(sig)
                if info:
                    print(f"   │   └── {info.icon} {info.name}")
    
    print(f"\n{'=' * 60}")
    print(f"Total: {RISK_STATS['total_signals']} safety signals")
    print(f"  Critical: {RISK_STATS['critical_signals']}")
    print(f"  Deception: {RISK_STATS['deception_signals']}")
