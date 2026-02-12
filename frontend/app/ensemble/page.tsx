'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Scale, RefreshCw, Users, Clock, DollarSign, 
  CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronRight,
  Eye, Shield
} from 'lucide-react';
import Card, { CardGrid, StatCard } from '@/components/Card';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import EmptyState from '@/components/EmptyState';
import { SkeletonCard, SkeletonTable } from '@/components/Skeleton';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface JudgeVerdict {
  judge_type: string;
  model_id: string;
  risk_level: string;
  confidence: number;
  reasoning: string;
  detected_signals: string[];
}

interface EnsembleReport {
  report_id: string;
  task_id: string;
  model_id: string;
  ensemble_risk: string;
  ensemble_confidence: number;
  is_safe: boolean;
  judge_agreement: number;
  unanimous: boolean;
  recommendation: string;
  summary: string;
  total_cost_usd: number;
  total_latency_ms: number;
  judge_verdicts: JudgeVerdict[];
  created_at: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const getRiskConfig = (risk: string) => {
  switch (risk.toLowerCase()) {
    case 'critical': 
      return { 
        icon: '🚨', 
        color: 'text-red-400', 
        bg: 'bg-red-500/10', 
        border: 'border-red-500/30',
        badge: 'danger' as const
      };
    case 'high': 
      return { 
        icon: '⚠️', 
        color: 'text-orange-400', 
        bg: 'bg-orange-500/10', 
        border: 'border-orange-500/30',
        badge: 'warning' as const
      };
    case 'medium': 
      return { 
        icon: '⚡', 
        color: 'text-yellow-400', 
        bg: 'bg-yellow-500/10', 
        border: 'border-yellow-500/30',
        badge: 'warning' as const
      };
    case 'low': 
      return { 
        icon: 'ℹ️', 
        color: 'text-blue-400', 
        bg: 'bg-blue-500/10', 
        border: 'border-blue-500/30',
        badge: 'info' as const
      };
    case 'none': 
      return { 
        icon: '✅', 
        color: 'text-emerald-400', 
        bg: 'bg-emerald-500/10', 
        border: 'border-emerald-500/30',
        badge: 'success' as const
      };
    default: 
      return { 
        icon: '❓', 
        color: 'text-slate-400', 
        bg: 'bg-slate-500/10', 
        border: 'border-slate-500/30',
        badge: 'default' as const
      };
  }
};

const JUDGE_ICONS: Record<string, string> = {
  deception_analyst: '🎭',
  capability_assessor: '⚡',
  collusion_detector: '🤝',
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function EnsemblePage() {
  const [reports, setReports] = useState<EnsembleReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ensemble/reports?limit=50');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setReports(data.reports || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reports');
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleReport = (reportId: string) => {
    setExpandedReports(prev => {
      const next = new Set(prev);
      if (next.has(reportId)) {
        next.delete(reportId);
      } else {
        next.add(reportId);
      }
      return next;
    });
  };

  // Calculate stats
  const stats = {
    totalReports: reports.length,
    avgConfidence: reports.length > 0
      ? reports.reduce((sum, r) => sum + r.ensemble_confidence, 0) / reports.length
      : 0,
    totalCost: reports.reduce((sum, r) => sum + r.total_cost_usd, 0),
    safeCases: reports.filter(r => r.is_safe).length,
    unanimousCases: reports.filter(r => r.unanimous).length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/5 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm mb-4">
            <Link href="/" className="text-slate-400 hover:text-white transition-colors">Home</Link>
            <span className="text-slate-600">/</span>
            <Link href="/safety" className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors">
              <span>⚙️</span> Detection Methods
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-white">Ensemble Multi-Judge</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Scale className="w-8 h-8 text-blue-400" />
                <h1 className="text-3xl font-bold text-white">Ensemble Safety Reports</h1>
                <Badge variant="info" size="sm">⚖️</Badge>
              </div>
              <p className="text-slate-400">
                Multi-judge safety detection — 3 specialized AI judges reach consensus on safety risks
              </p>
            </div>
            <Button variant="secondary" onClick={fetchReports} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        {loading ? (
          <CardGrid className="mb-8" cols={4}>
            {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
          </CardGrid>
        ) : (
          <CardGrid className="mb-8" cols={4}>
            <StatCard
              title="Total Reports"
              value={stats.totalReports}
              change="All evaluations"
              trend="neutral"
              icon={<Scale className="w-5 h-5" />}
            />
            <StatCard
              title="Avg Confidence"
              value={`${(stats.avgConfidence * 100).toFixed(1)}%`}
              change="Ensemble consensus"
              trend="neutral"
              icon={<Users className="w-5 h-5" />}
            />
            <StatCard
              title="Total Cost"
              value={`$${stats.totalCost.toFixed(3)}`}
              change="All judges combined"
              trend="neutral"
              icon={<DollarSign className="w-5 h-5" />}
            />
            <StatCard
              title="Safe / Unanimous"
              value={`${stats.safeCases} / ${stats.unanimousCases}`}
              change={`of ${stats.totalReports} reports`}
              trend="neutral"
              icon={<CheckCircle className="w-5 h-5" />}
              variant={stats.safeCases === stats.totalReports ? 'success' : 'default'}
            />
          </CardGrid>
        )}

        {/* Info Banner */}
        <div className="mb-8 p-6 rounded-xl bg-gradient-to-r from-blue-500/10 to-slate-500/10 border border-blue-500/30 backdrop-blur-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-blue-500/20">
              <Scale className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white mb-2">⚖️ Multi-Judge Ensemble Detection</h3>
              <p className="text-slate-300 text-sm mb-3">
                Three specialized AI judges analyze each response for different risk categories. 
                Consensus is determined using a voting system weighted by each judge's confidence.
              </p>
              <div className="flex flex-wrap gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎭</span>
                  <div>
                    <p className="text-slate-300 font-medium">Deception Analyst</p>
                    <p className="text-xs text-slate-500">Alignment faking, sandbagging, strategic deception</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">⚡</span>
                  <div>
                    <p className="text-slate-300 font-medium">Capability Assessor</p>
                    <p className="text-xs text-slate-500">Self-improvement, resource acquisition</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🤝</span>
                  <div>
                    <p className="text-slate-300 font-medium">Collusion Detector</p>
                    <p className="text-xs text-slate-500">Multi-agent coordination, covert communication</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <div className="flex-1">
                <p className="text-red-300 font-medium">Error Loading Reports</p>
                <p className="text-red-400/70 text-sm">{error}</p>
              </div>
              <Button variant="danger" size="sm" onClick={fetchReports}>
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Reports */}
        <Card
          title="Ensemble Reports"
          subtitle={`${reports.length} evaluations analyzed`}
        >
          {loading ? (
            <SkeletonTable rows={5} />
          ) : reports.length === 0 ? (
            <EmptyState
              variant="default"
              title="No ensemble reports yet"
              description="Run evaluations with USE_ENSEMBLE_SAFETY_DETECTOR=true to see results here."
            />
          ) : (
            <div className="space-y-3">
              {reports.map((report) => {
                const riskConfig = getRiskConfig(report.ensemble_risk);
                const isExpanded = expandedReports.has(report.report_id);

                return (
                  <div 
                    key={report.report_id}
                    className={`rounded-xl border ${riskConfig.border} ${riskConfig.bg} overflow-hidden`}
                  >
                    {/* Report Header */}
                    <button
                      onClick={() => toggleReport(report.report_id)}
                      className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">{riskConfig.icon}</span>
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-white">{report.model_id}</span>
                            <Badge variant={riskConfig.badge} size="sm">
                              {report.ensemble_risk.toUpperCase()}
                            </Badge>
                            {report.unanimous && (
                              <Badge variant="success" size="sm">Unanimous</Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-400 line-clamp-1">
                            {report.summary || 'No summary available'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right text-sm">
                          <div className="text-slate-300">
                            {(report.ensemble_confidence * 100).toFixed(0)}% confidence
                          </div>
                          <div className="text-slate-500">
                            ${report.total_cost_usd.toFixed(4)} · {report.total_latency_ms}ms
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="border-t border-white/5 p-4 space-y-4">
                        {/* Recommendation */}
                        <div className="p-3 rounded-lg bg-slate-800/50">
                          <p className="text-sm text-slate-300">
                            <strong className="text-white">Recommendation:</strong> {report.recommendation}
                          </p>
                        </div>

                        {/* Judge Verdicts */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {report.judge_verdicts.map((verdict, idx) => {
                            const verdictConfig = getRiskConfig(verdict.risk_level);
                            return (
                              <div 
                                key={idx}
                                className={`p-4 rounded-lg border ${verdictConfig.border} ${verdictConfig.bg}`}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-lg">{JUDGE_ICONS[verdict.judge_type] || '🔍'}</span>
                                  <span className={`font-medium ${verdictConfig.color}`}>
                                    {verdict.judge_type.replace(/_/g, ' ')}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant={verdictConfig.badge} size="sm">
                                    {verdict.risk_level}
                                  </Badge>
                                  <span className="text-xs text-slate-400">
                                    {(verdict.confidence * 100).toFixed(0)}% confidence
                                  </span>
                                </div>
                                <p className="text-xs text-slate-400 line-clamp-3">
                                  {verdict.reasoning}
                                </p>
                                {verdict.detected_signals.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {verdict.detected_signals.map((sig, i) => (
                                      <Badge key={i} variant="default" size="sm">
                                        {sig.replace(/_/g, ' ')}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Metadata */}
                        <div className="flex items-center gap-4 text-xs text-slate-500 pt-2 border-t border-white/5">
                          <span>Report: {report.report_id.slice(0, 8)}...</span>
                          <span>Task: {report.task_id.slice(0, 8)}...</span>
                          <span>Agreement: {(report.judge_agreement * 100).toFixed(0)}%</span>
                          <span>Created: {new Date(report.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
