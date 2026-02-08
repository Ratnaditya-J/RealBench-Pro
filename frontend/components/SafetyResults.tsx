'use client';

import { useState } from 'react';
import { 
  AlertCircle, CheckCircle, AlertTriangle, Info, ChevronDown, ChevronRight,
  ExternalLink, Copy, Flag, XCircle, Eye, Shield
} from 'lucide-react';
import Badge from './Badge';
import Button from './Button';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface SignalDetail {
  signal_type: string;
  name: string;
  description: string;
  plain_english: string;
  what_it_means: string;
  recommended_action: string;
  icon: string;
  color: string;
  severity?: string;
  confidence?: number;
  evidence?: string[];
  model_id?: string;
}

export interface SafetySummary {
  overall_risk: 'critical' | 'high' | 'medium' | 'low' | 'none';
  confidence: number;
  total_signals: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  summary_text: string;
  top_concerns: string[];
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const getRiskConfig = (risk: string) => {
  switch (risk) {
    case 'critical':
      return {
        icon: '🚨',
        label: 'CRITICAL RISK',
        sublabel: 'Immediate Action Required',
        color: 'text-red-400',
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        barColor: 'bg-red-500',
      };
    case 'high':
      return {
        icon: '⚠️',
        label: 'HIGH RISK',
        sublabel: 'Review Recommended',
        color: 'text-orange-400',
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/30',
        barColor: 'bg-orange-500',
      };
    case 'medium':
      return {
        icon: '⚡',
        label: 'MEDIUM RISK',
        sublabel: 'Monitor Closely',
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/30',
        barColor: 'bg-yellow-500',
      };
    case 'low':
      return {
        icon: 'ℹ️',
        label: 'LOW RISK',
        sublabel: 'Minor Concerns',
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        barColor: 'bg-blue-500',
      };
    case 'none':
    default:
      return {
        icon: '✅',
        label: 'SAFE',
        sublabel: 'No Issues Detected',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        barColor: 'bg-emerald-500',
      };
  }
};

const getConfidenceLabel = (confidence: number): string => {
  if (confidence >= 0.9) return 'Very High';
  if (confidence >= 0.75) return 'High';
  if (confidence >= 0.5) return 'Medium';
  if (confidence >= 0.25) return 'Low';
  return 'Very Low';
};

// =============================================================================
// EXECUTIVE SUMMARY COMPONENT
// =============================================================================

interface ExecutiveSummaryProps {
  summary: SafetySummary;
  modelId?: string;
  onViewDetails?: () => void;
  onExport?: () => void;
}

export function ExecutiveSummary({ summary, modelId, onViewDetails, onExport }: ExecutiveSummaryProps) {
  const config = getRiskConfig(summary.overall_risk);
  
  return (
    <div className={`rounded-xl ${config.bg} ${config.border} border p-6 mb-6`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <span className="text-4xl">{config.icon}</span>
          <div>
            <div className={`text-2xl font-bold ${config.color}`}>
              {config.label}
            </div>
            <div className="text-slate-400">{config.sublabel}</div>
          </div>
        </div>
        {modelId && (
          <div className="text-right">
            <div className="text-sm text-slate-400">Model</div>
            <div className="font-mono text-white">{modelId}</div>
          </div>
        )}
      </div>

      <p className="text-lg text-white mb-4">{summary.summary_text}</p>

      {/* Signal counts */}
      <div className="flex items-center gap-6 mb-4 text-sm">
        {summary.critical_count > 0 && (
          <span className="flex items-center gap-1 text-red-400">
            <span className="font-bold">{summary.critical_count}</span> critical
          </span>
        )}
        {summary.high_count > 0 && (
          <span className="flex items-center gap-1 text-orange-400">
            <span className="font-bold">{summary.high_count}</span> high
          </span>
        )}
        {summary.medium_count > 0 && (
          <span className="flex items-center gap-1 text-yellow-400">
            <span className="font-bold">{summary.medium_count}</span> medium
          </span>
        )}
        {summary.low_count > 0 && (
          <span className="flex items-center gap-1 text-blue-400">
            <span className="font-bold">{summary.low_count}</span> low
          </span>
        )}
        {summary.total_signals === 0 && (
          <span className="flex items-center gap-1 text-emerald-400">
            No issues detected
          </span>
        )}
      </div>

      {/* Confidence bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-slate-400">Confidence</span>
          <span className="text-white font-medium">
            {(summary.confidence * 100).toFixed(0)}% ({getConfidenceLabel(summary.confidence)})
          </span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className={`h-full ${config.barColor} transition-all duration-500`}
            style={{ width: `${summary.confidence * 100}%` }}
          />
        </div>
      </div>

      {/* Top concerns */}
      {summary.top_concerns.length > 0 && (
        <div className="mb-4">
          <div className="text-sm text-slate-400 mb-2">Top Concerns:</div>
          <ul className="space-y-1">
            {summary.top_concerns.map((concern, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="text-slate-500">•</span>
                {concern}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-white/10">
        {onViewDetails && (
          <Button variant="secondary" size="sm" onClick={onViewDetails}>
            <Eye className="w-4 h-4 mr-2" />
            View Details
          </Button>
        )}
        {onExport && (
          <Button variant="ghost" size="sm" onClick={onExport}>
            <ExternalLink className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// TRAFFIC LIGHT SUMMARY COMPONENT
// =============================================================================

interface TrafficLightCategory {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  count?: number;
}

interface TrafficLightSummaryProps {
  categories: TrafficLightCategory[];
  title?: string;
}

export function TrafficLightSummary({ categories, title = "Safety Assessment" }: TrafficLightSummaryProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'fail':
        return { icon: '🔴', label: 'FAIL', color: 'text-red-400' };
      case 'warn':
        return { icon: '🟠', label: 'WARN', color: 'text-orange-400' };
      case 'pass':
      default:
        return { icon: '🟢', label: 'PASS', color: 'text-emerald-400' };
    }
  };

  return (
    <div className="bg-slate-800/50 rounded-xl p-4">
      <h3 className="text-sm font-medium text-slate-400 mb-3">{title}</h3>
      <div className="space-y-2">
        {categories.map((cat, idx) => {
          const config = getStatusConfig(cat.status);
          return (
            <div key={idx} className="flex items-center justify-between">
              <span className="text-slate-300">{cat.name}</span>
              <div className="flex items-center gap-2">
                {cat.count !== undefined && cat.count > 0 && (
                  <span className="text-xs text-slate-500">({cat.count})</span>
                )}
                <span className={`text-sm font-medium ${config.color}`}>
                  {config.icon} {config.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// EVIDENCE QUOTE COMPONENT
// =============================================================================

interface EvidenceQuoteProps {
  quote: string;
  explanation: string;
  signalType?: string;
  highlightPatterns?: string[];
}

export function EvidenceQuote({ quote, explanation, signalType, highlightPatterns }: EvidenceQuoteProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(quote);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Highlight dangerous patterns in the quote
  const highlightQuote = (text: string) => {
    if (!highlightPatterns || highlightPatterns.length === 0) return text;
    
    let result = text;
    highlightPatterns.forEach(pattern => {
      const regex = new RegExp(`(${pattern})`, 'gi');
      result = result.replace(regex, '<mark class="bg-red-500/30 text-red-300 px-1 rounded">$1</mark>');
    });
    return result;
  };

  return (
    <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span>📝</span>
          <span>What we found{signalType ? ` (${signalType})` : ''}</span>
        </div>
        <button 
          onClick={handleCopy}
          className="text-slate-500 hover:text-white transition-colors"
          title="Copy quote"
        >
          {copied ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>

      <blockquote className="relative pl-4 border-l-2 border-red-500/50 mb-4">
        <p 
          className="text-slate-300 italic"
          dangerouslySetInnerHTML={{ __html: `"${highlightQuote(quote)}"` }}
        />
      </blockquote>

      <div className="flex items-start gap-2 text-sm">
        <span className="text-slate-500 mt-0.5">↑</span>
        <p className="text-slate-400">{explanation}</p>
      </div>
    </div>
  );
}

// =============================================================================
// SIGNAL CARD COMPONENT (Expanded with plain English)
// =============================================================================

interface SignalCardProps {
  signal: SignalDetail;
  confidence?: number;
  evidence?: string[];
  onInvestigate?: () => void;
  onFlag?: () => void;
  onDismiss?: () => void;
}

export function SignalCard({ signal, confidence, evidence, onInvestigate, onFlag, onDismiss }: SignalCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  const severityConfig = getRiskConfig(signal.severity || signal.color);

  return (
    <div className={`rounded-xl ${severityConfig.bg} ${severityConfig.border} border overflow-hidden`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{signal.icon}</span>
          <div className="text-left">
            <div className="font-medium text-white">{signal.name}</div>
            <div className="text-sm text-slate-400">{signal.plain_english}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {confidence !== undefined && (
            <div className="text-right">
              <div className={`text-sm font-medium ${severityConfig.color}`}>
                {(confidence * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-slate-500">confidence</div>
            </div>
          )}
          {expanded ? (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-white/10 p-4 space-y-4">
          {/* What it means */}
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <Info className="w-4 h-4" />
              What this means
            </h4>
            <p className="text-sm text-slate-400">{signal.what_it_means}</p>
          </div>

          {/* Evidence */}
          {evidence && evidence.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Evidence
              </h4>
              <div className="space-y-2">
                {evidence.map((ev, idx) => (
                  <EvidenceQuote
                    key={idx}
                    quote={ev}
                    explanation="This phrase triggered the detection."
                    signalType={signal.signal_type}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Recommended action */}
          <div className="p-3 rounded-lg bg-slate-800/50">
            <h4 className="text-sm font-medium text-white mb-1 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Recommended Action
            </h4>
            <p className="text-sm text-slate-300">{signal.recommended_action}</p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2">
            {onInvestigate && (
              <Button variant="secondary" size="sm" onClick={onInvestigate}>
                <Eye className="w-4 h-4 mr-1" />
                Investigate
              </Button>
            )}
            {onFlag && (
              <Button variant="ghost" size="sm" onClick={onFlag}>
                <Flag className="w-4 h-4 mr-1" />
                Flag Model
              </Button>
            )}
            {onDismiss && (
              <Button variant="ghost" size="sm" onClick={onDismiss}>
                <XCircle className="w-4 h-4 mr-1" />
                Dismiss
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// CONFIDENCE INDICATOR COMPONENT
// =============================================================================

interface ConfidenceIndicatorProps {
  value: number;
  label?: string;
  showChecks?: number;
}

export function ConfidenceIndicator({ value, label, showChecks }: ConfidenceIndicatorProps) {
  const percentage = Math.round(value * 100);
  const confidenceLabel = getConfidenceLabel(value);
  
  const getColor = () => {
    if (value >= 0.75) return 'bg-emerald-500';
    if (value >= 0.5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-1">
      {label && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">{label}</span>
          <span className="text-white font-medium">{percentage}% ({confidenceLabel})</span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className={`h-full ${getColor()} transition-all duration-500`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {showChecks !== undefined && (
          <span className="text-xs text-slate-500">
            {showChecks} checks
          </span>
        )}
      </div>
    </div>
  );
}

export default {
  ExecutiveSummary,
  TrafficLightSummary,
  EvidenceQuote,
  SignalCard,
  ConfidenceIndicator,
};
