'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Shield, AlertTriangle, Activity, TrendingUp, RefreshCw, Filter, 
  Info, AlertCircle, CheckCircle, ChevronDown, ChevronRight,
  Zap, Brain, Eye, Users
} from 'lucide-react';
import Card, { CardGrid, StatCard } from '@/components/Card';
import Button from '@/components/Button';
import Table from '@/components/Table';
import Badge, { SafetyBadge } from '@/components/Badge';
import EmptyState from '@/components/EmptyState';
import { SkeletonCard, SkeletonTable } from '@/components/Skeleton';
import { getSafetySignals, SafetySignal } from '@/lib/api';
import { 
  ExecutiveSummary, 
  TrafficLightSummary, 
  SignalCard,
  SafetySummary,
  SignalDetail
} from '@/components/SafetyResults';
import ModelComparison from '@/components/ModelComparison';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface SignalInfo {
  signal_type: string;
  name: string;
  description: string;
  plain_english: string;
  what_it_means: string;
  recommended_action: string;
  icon: string;
  color: string;
}

interface Subcategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  signals: SignalInfo[];
  signal_count: number;
}

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  bg_color: string;
  border_color: string;
  subcategories: Subcategory[];
  total_signals: number;
}

interface CategoriesResponse {
  categories: Category[];
  stats: {
    total_signals: number;
    critical_signals: number;
    deception_signals: number;
  };
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function SafetyPage() {
  const [loading, setLoading] = useState(true);
  const [signals, setSignals] = useState<SafetySignal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['critical', 'deception']));
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterSubcategory, setFilterSubcategory] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load both categories and signals
      const [signalsData, categoriesRes] = await Promise.all([
        getSafetySignals({ limit: 100 }),
        fetch('http://localhost:8000/api/v1/categories').then(r => r.json())
      ]);
      
      setSignals(signalsData);
      setCategories(categoriesRes.categories || []);
      setStats(categoriesRes.stats);
    } catch (error) {
      console.error('Failed to load safety data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Count signals by category
  const signalCounts = signals.reduce((acc, signal) => {
    acc[signal.signal_type] = (acc[signal.signal_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const severityCounts = {
    critical: signals.filter(s => s.severity === 'critical').length,
    high: signals.filter(s => s.severity === 'high').length,
    medium: signals.filter(s => s.severity === 'medium').length,
    low: signals.filter(s => s.severity === 'low').length,
  };

  // Filter signals
  const filteredSignals = signals.filter(signal => {
    if (filterSeverity !== 'all' && signal.severity !== filterSeverity) return false;
    if (filterSubcategory !== 'all' && signal.signal_type !== filterSubcategory) return false;
    return true;
  });

  // Get icon for category
  const getCategoryIcon = (categoryId: string) => {
    switch (categoryId) {
      case 'critical': return <AlertCircle className="w-5 h-5" />;
      case 'deception': return <Eye className="w-5 h-5" />;
      case 'capability': return <TrendingUp className="w-5 h-5" />;
      case 'methods': return <Activity className="w-5 h-5" />;
      default: return <Shield className="w-5 h-5" />;
    }
  };

  const topStats = [
    {
      title: 'Critical Alerts',
      value: severityCounts.critical,
      change: severityCounts.critical === 0 ? 'All clear' : 'Immediate action needed',
      trend: severityCounts.critical === 0 ? 'neutral' as const : 'down' as const,
      icon: <AlertCircle className="w-5 h-5" />,
      variant: severityCounts.critical > 0 ? 'danger' as const : 'default' as const,
    },
    {
      title: 'High Priority',
      value: severityCounts.high,
      change: 'Review recommended',
      trend: 'neutral' as const,
      icon: <AlertTriangle className="w-5 h-5" />,
      variant: severityCounts.high > 0 ? 'warning' as const : 'default' as const,
    },
    {
      title: 'Total Signals',
      value: signals.length,
      change: 'All time detected',
      trend: 'neutral' as const,
      icon: <Activity className="w-5 h-5" />,
    },
    {
      title: 'Signal Types',
      value: stats?.total_signals || 21,
      change: 'Monitored categories',
      trend: 'neutral' as const,
      icon: <TrendingUp className="w-5 h-5" />,
    },
  ];

  // Helper to find signal info
  const getSignalInfo = (signalType: string): SignalInfo | undefined => {
    for (const cat of categories) {
      for (const sub of cat.subcategories) {
        const found = sub.signals.find(s => s.signal_type === signalType);
        if (found) return found;
      }
    }
    return undefined;
  };

  const signalColumns = [
    {
      key: 'signal_type',
      header: 'Signal',
      render: (item: SafetySignal) => {
        const signalInfo = getSignalInfo(item.signal_type);
        return (
          <div className="flex items-center gap-3">
            <span className="text-xl">{signalInfo?.icon || '⚠️'}</span>
            <div>
              <div className="font-medium text-white">
                {signalInfo?.name || item.signal_type.replace(/_/g, ' ')}
              </div>
              <div className="text-xs text-slate-400">
                {signalInfo?.plain_english || item.signal_type.replace(/_/g, ' ')}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'model_id',
      header: 'Model',
      render: (item: SafetySignal) => (
        <div className="font-mono text-sm text-slate-300">
          {item.model_id || 'N/A'}
        </div>
      ),
      className: 'w-32',
    },
    {
      key: 'confidence',
      header: 'Confidence',
      render: (item: SafetySignal) => {
        const pct = Math.round(item.confidence * 100);
        const label = pct >= 90 ? 'Very High' : pct >= 75 ? 'High' : pct >= 50 ? 'Medium' : 'Low';
        return (
          <div>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${pct >= 75 ? 'bg-red-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-sm text-white tabular-nums">{pct}%</span>
            </div>
            <div className="text-xs text-slate-500">{label}</div>
          </div>
        );
      },
      className: 'w-32',
    },
    {
      key: 'severity',
      header: 'Severity',
      render: (item: SafetySignal) => <SafetyBadge severity={item.severity as any} />,
      className: 'w-24',
    },
    {
      key: 'action',
      header: 'Action',
      render: (item: SafetySignal) => {
        const signalInfo = getSignalInfo(item.signal_type);
        return (
          <button 
            className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              // Show tooltip or modal with recommended action
              alert(signalInfo?.recommended_action || 'Review this signal');
            }}
          >
            What to do →
          </button>
        );
      },
      className: 'w-24',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/5 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-8 h-8 text-red-400" />
                <h1 className="text-3xl font-bold text-white">Safety Dashboard</h1>
              </div>
              <p className="text-slate-400">
                Hierarchical risk monitoring — from critical threats to capability evaluation
              </p>
            </div>
            <Button variant="secondary" onClick={loadData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Executive Summary */}
        {!loading && signals.length > 0 && (
          <ExecutiveSummary
            summary={{
              overall_risk: severityCounts.critical > 0 ? 'critical' : 
                           severityCounts.high > 0 ? 'high' : 
                           severityCounts.medium > 0 ? 'medium' : 
                           severityCounts.low > 0 ? 'low' : 'none',
              confidence: signals.length > 0 ? signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length : 0,
              total_signals: signals.length,
              critical_count: severityCounts.critical,
              high_count: severityCounts.high,
              medium_count: severityCounts.medium,
              low_count: severityCounts.low,
              summary_text: severityCounts.critical > 0 
                ? `This evaluation detected ${severityCounts.critical} critical safety concern${severityCounts.critical > 1 ? 's' : ''} requiring immediate attention.`
                : severityCounts.high > 0
                ? `This evaluation found ${severityCounts.high} high-priority signal${severityCounts.high > 1 ? 's' : ''} that should be reviewed.`
                : signals.length > 0
                ? `${signals.length} signal${signals.length > 1 ? 's' : ''} detected. Review recommended.`
                : 'No safety concerns detected.',
              top_concerns: signals
                .filter(s => s.severity === 'critical' || s.severity === 'high')
                .slice(0, 3)
                .map(s => {
                  const info = categories.flatMap(c => c.subcategories.flatMap(sub => sub.signals))
                    .find(sig => sig.signal_type === s.signal_type);
                  return info?.plain_english || s.signal_type.replace(/_/g, ' ');
                }),
            }}
            onViewDetails={() => {
              // Set filter and scroll to signals section
              setFilterSeverity(severityCounts.critical > 0 ? 'critical' : severityCounts.high > 0 ? 'high' : 'all');
              setTimeout(() => {
                document.getElementById('detected-signals')?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }}
          />
        )}

        {/* Traffic Light + Stats Row */}
        {loading ? (
          <CardGrid className="mb-8" cols={4}>
            {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
          </CardGrid>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
            <div className="lg:col-span-3">
              <CardGrid cols={3}>
                {topStats.slice(0, 3).map((stat, index) => (
                  <StatCard key={index} {...stat} />
                ))}
              </CardGrid>
            </div>
            <TrafficLightSummary
              title="Quick Assessment"
              categories={[
                { 
                  name: 'Self-Improvement', 
                  status: signals.some(s => ['recursive_self_improvement', 'capability_acquisition', 'autonomous_research', 'training_data_manipulation'].includes(s.signal_type)) ? 'fail' : 'pass',
                  count: signals.filter(s => ['recursive_self_improvement', 'capability_acquisition', 'autonomous_research', 'training_data_manipulation'].includes(s.signal_type)).length
                },
                { 
                  name: 'Self-Preservation', 
                  status: signals.some(s => ['self_preservation', 'shutdown_resistance', 'self_replication_attempt', 'goal_hijacking'].includes(s.signal_type)) ? 'fail' : 'pass',
                  count: signals.filter(s => ['self_preservation', 'shutdown_resistance', 'self_replication_attempt', 'goal_hijacking'].includes(s.signal_type)).length
                },
                { 
                  name: 'Sabotage', 
                  status: signals.some(s => ['code_sabotage', 'decision_sabotage', 'oversight_undermining'].includes(s.signal_type)) ? 'fail' : 'pass',
                  count: signals.filter(s => ['code_sabotage', 'decision_sabotage', 'oversight_undermining'].includes(s.signal_type)).length
                },
                { 
                  name: 'Deception', 
                  status: signals.some(s => ['alignment_faking', 'strategic_deception', 'sandbagging', 'covert_planning'].includes(s.signal_type)) ? 'warn' : 'pass',
                  count: signals.filter(s => ['alignment_faking', 'strategic_deception', 'sandbagging', 'covert_planning'].includes(s.signal_type)).length
                },
                { 
                  name: 'Manipulation', 
                  status: signals.some(s => ['persuasive_manipulation', 'social_engineering', 'deceptive_communication'].includes(s.signal_type)) ? 'warn' : 'pass',
                  count: signals.filter(s => ['persuasive_manipulation', 'social_engineering', 'deceptive_communication'].includes(s.signal_type)).length
                },
                { 
                  name: 'Collusion', 
                  status: signals.some(s => ['multi_agent_collusion', 'covert_communication', 'coordinated_deception'].includes(s.signal_type)) ? 'warn' : 'pass',
                  count: signals.filter(s => ['multi_agent_collusion', 'covert_communication', 'coordinated_deception'].includes(s.signal_type)).length
                },
              ]}
            />
          </div>
        )}

        {/* Critical Alert Banner */}
        {severityCounts.critical > 0 && !loading && (
          <div className="mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/30 backdrop-blur-sm animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-red-500/20">
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-300 mb-1">
                  {severityCounts.critical} Critical Safety Signal{severityCounts.critical !== 1 ? 's' : ''} Detected
                </h3>
                <p className="text-red-400/80 text-sm">
                  Immediate review required. These signals indicate serious safety concerns.
                </p>
              </div>
              <Button 
                variant="danger" 
                size="sm" 
                onClick={() => {
                  setFilterSeverity('critical');
                  setTimeout(() => {
                    document.getElementById('detected-signals')?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }}
              >
                View Critical
              </Button>
            </div>
          </div>
        )}

        {/* Risk Categories - Hierarchical View */}
        <Card 
          title="Risk Categories" 
          subtitle="Organized by severity and type"
          className="mb-8"
        >
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="animate-pulse bg-slate-800/50 rounded-lg h-20" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {categories.map((category) => (
                <div 
                  key={category.id}
                  className={`rounded-xl border ${category.border_color} ${category.bg_color} overflow-hidden`}
                >
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{category.icon}</span>
                      <div className="text-left">
                        <h3 className={`font-semibold ${category.color}`}>
                          {category.name}
                        </h3>
                        <p className="text-sm text-slate-400">{category.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {category.total_signals > 0 && (
                        <Badge variant={category.id === 'critical' ? 'danger' : category.id === 'deception' ? 'warning' : 'default'}>
                          {category.total_signals} signals
                        </Badge>
                      )}
                      {expandedCategories.has(category.id) ? (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {/* Subcategories */}
                  {expandedCategories.has(category.id) && (
                    <div className="border-t border-white/5 p-4 space-y-3">
                      {category.subcategories.map((sub) => (
                        <div 
                          key={sub.id}
                          className="bg-slate-800/30 rounded-lg p-4"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <span className="text-lg">{sub.icon}</span>
                              <div>
                                <h4 className="font-medium text-white">{sub.name}</h4>
                                <p className="text-xs text-slate-500">{sub.description}</p>
                              </div>
                            </div>
                            {sub.signal_count > 0 && (
                              <span className="text-xs text-slate-400">
                                {sub.signal_count} signal{sub.signal_count !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>

                          {/* Signals in this subcategory */}
                          {sub.signals.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                              {sub.signals.map((sig) => {
                                const count = signalCounts[sig.signal_type] || 0;
                                return (
                                  <button
                                    key={sig.signal_type}
                                    onClick={() => setFilterSubcategory(
                                      filterSubcategory === sig.signal_type ? 'all' : sig.signal_type
                                    )}
                                    className={`
                                      flex items-center justify-between p-2 rounded-lg text-left text-sm
                                      transition-colors
                                      ${filterSubcategory === sig.signal_type
                                        ? 'bg-white/10 border border-white/20'
                                        : 'bg-slate-700/30 hover:bg-slate-700/50'
                                      }
                                    `}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span>{sig.icon}</span>
                                      <span className="text-slate-300">{sig.name}</span>
                                    </div>
                                    {count > 0 && (
                                      <Badge variant="danger" size="sm">{count}</Badge>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {/* Empty state for capability/methods categories */}
                          {sub.signals.length === 0 && (
                            <div className="text-center py-2 text-slate-500 text-sm">
                              {sub.id === 'research_math' ? (
                                <Link href="/research-math" className="text-blue-400 hover:underline">
                                  View 6 Research Math Problems →
                                </Link>
                              ) : sub.id === 'ensemble' ? (
                                <Link href="/ensemble" className="text-blue-400 hover:underline">
                                  View Ensemble Reports →
                                </Link>
                              ) : (
                                <span>System capability</span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Model Safety Comparison */}
        <ModelComparison className="mb-8" />

        {/* Filters & Signals Table */}
        <Card
          id="detected-signals"
          title="Detected Signals"
          subtitle={`${filteredSignals.length} of ${signals.length} signals`}
          action={
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              {(filterSeverity !== 'all' || filterSubcategory !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterSeverity('all');
                    setFilterSubcategory('all');
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
          }
        >
          {loading ? (
            <SkeletonTable rows={5} />
          ) : filteredSignals.length > 0 ? (
            <Table data={filteredSignals} columns={signalColumns} />
          ) : signals.length > 0 ? (
            <EmptyState
              title="No signals match filters"
              description="Try adjusting your filter criteria to see more results."
              action={{ 
                label: 'Clear Filters', 
                onClick: () => { setFilterSeverity('all'); setFilterSubcategory('all'); } 
              }}
            />
          ) : (
            <EmptyState
              variant="safety"
              title="No safety signals detected"
              description="All evaluated models are operating within expected parameters."
            />
          )}
        </Card>

        {/* Info Panel */}
        <Card className="mt-8" variant="glass">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Info className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">About Risk Categories</h3>
              <p className="text-sm text-slate-400 mb-4">
                RealBench Pro organizes safety monitoring into four tiers:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-red-400">🔴</span>
                  <div>
                    <span className="text-red-400 font-medium">Critical Risks</span>
                    <span className="text-slate-400"> — Self-improvement, autonomy, sabotage</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-orange-400">🟠</span>
                  <div>
                    <span className="text-orange-400 font-medium">Deception Risks</span>
                    <span className="text-slate-400"> — Alignment faking, manipulation, collusion</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-400">🟢</span>
                  <div>
                    <span className="text-emerald-400 font-medium">Capability Evaluation</span>
                    <span className="text-slate-400"> — Benchmarks, contamination, research math</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-slate-400">⚙️</span>
                  <div>
                    <span className="text-slate-300 font-medium">Detection Methods</span>
                    <span className="text-slate-400"> — How we identify these risks</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
