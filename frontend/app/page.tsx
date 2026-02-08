'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, Shield, AlertTriangle, TrendingUp, Zap, Database, Play, ArrowRight, Sparkles } from 'lucide-react';
import { StatCard, CardGrid } from '@/components/Card';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Table from '@/components/Table';
import Badge, { SafetyBadge, StatusBadge } from '@/components/Badge';
import EmptyState from '@/components/EmptyState';
import { SkeletonCard, SkeletonTable } from '@/components/Skeleton';
import { getLeaderboard, getSafetySignals, getSystemHealth, LeaderboardEntry, SafetySignal } from '@/lib/api';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [safetySignals, setSafetySignals] = useState<SafetySignal[]>([]);
  const [systemHealth, setSystemHealth] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [leaderboardData, safetyData, healthData] = await Promise.all([
        getLeaderboard(),
        getSafetySignals({ limit: 5 }),
        getSystemHealth(),
      ]);
      setLeaderboard(leaderboardData.slice(0, 5));
      setSafetySignals(safetyData);
      setSystemHealth(healthData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = systemHealth ? [
    {
      title: 'Models Evaluated',
      value: systemHealth.models_available || 0,
      change: 'All systems operational',
      trend: 'neutral' as const,
      icon: <Database className="w-5 h-5" />,
    },
    {
      title: 'Active Evaluations',
      value: systemHealth.active_evaluations || 0,
      change: 'Running now',
      trend: 'up' as const,
      icon: <Activity className="w-5 h-5" />,
    },
    {
      title: 'Safety Alerts',
      value: safetySignals.filter(s => s.severity === 'critical' || s.severity === 'high').length,
      change: 'Last 24 hours',
      trend: safetySignals.length > 0 ? 'down' as const : 'neutral' as const,
      icon: <Shield className="w-5 h-5" />,
      variant: safetySignals.filter(s => s.severity === 'critical').length > 0 ? 'danger' as const : 'default' as const,
    },
    {
      title: 'Total Evaluations',
      value: leaderboard.reduce((sum, entry) => sum + (entry.evaluation_count || 0), 0),
      change: '+12% this week',
      trend: 'up' as const,
      icon: <TrendingUp className="w-5 h-5" />,
    },
  ] : [];

  const leaderboardColumns = [
    {
      key: 'rank',
      header: 'Rank',
      render: (_: LeaderboardEntry, index: number) => (
        <div className="flex items-center gap-2">
          {index === 0 && <span className="text-2xl">🥇</span>}
          {index === 1 && <span className="text-2xl">🥈</span>}
          {index === 2 && <span className="text-2xl">🥉</span>}
          {index > 2 && <span className="font-semibold text-lg text-slate-400">#{index + 1}</span>}
        </div>
      ),
      className: 'w-20',
    },
    {
      key: 'model_id',
      header: 'Model',
      render: (item: LeaderboardEntry) => (
        <div>
          <div className="font-semibold text-white">{item.display_name || item.model_id}</div>
          <div className="text-xs text-slate-500">{item.evaluation_count || item.num_evaluations || 0} evaluations</div>
        </div>
      ),
    },
    {
      key: 'overall_score',
      header: 'Score',
      render: (item: LeaderboardEntry) => (
        <div className="flex items-center gap-3">
          <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
              style={{ width: `${item.overall_score * 100}%` }}
            />
          </div>
          <span className="font-bold text-white tabular-nums">{(item.overall_score * 100).toFixed(1)}%</span>
        </div>
      ),
    },
    {
      key: 'flags',
      header: 'Status',
      render: (item: LeaderboardEntry) => (
        <div className="flex gap-2">
          {(item.safety_flags || 0) > 0 && (
            <Badge variant="danger" size="sm" dot>
              {item.safety_flags} safety
            </Badge>
          )}
          {(item.contamination_flags || 0) > 0 && (
            <Badge variant="warning" size="sm" dot>
              {item.contamination_flags} contamination
            </Badge>
          )}
          {(item.safety_flags || 0) === 0 && (item.contamination_flags || 0) === 0 && (
            <Badge variant="success" size="sm" dot>Clean</Badge>
          )}
        </div>
      ),
    },
  ];

  // Signal type to icon mapping
  const getSignalIcon = (signalType: string): string => {
    const iconMap: Record<string, string> = {
      'alignment_faking': '🎭',
      'strategic_deception': '🕵️',
      'sandbagging': '📉',
      'self_preservation': '🛡️',
      'manipulation': '🎯',
      'persuasive_manipulation': '🎯',
      'collusion': '🤝',
      'multi_agent_collusion': '🤝',
      'code_sabotage': '💻',
      'oversight_undermining': '👁️',
      'shutdown_resistance': '🚫',
      'self_replication_attempt': '🔁',
      'goal_hijacking': '🎪',
      'deceptive_communication': '💬',
      'social_engineering': '🗣️',
      'covert_communication': '📡',
      'coordinated_deception': '🕸️',
      // NEW: Self-Improvement Categories (Feb 2026)
      'recursive_self_improvement': '🔄',
      'capability_acquisition': '⚡',
      'autonomous_research': '🔬',
      'training_data_manipulation': '💉',
    };
    return iconMap[signalType] || '⚠️';
  };

  const safetyColumns = [
    {
      key: 'signal_type',
      header: 'Signal',
      render: (item: SafetySignal) => (
        <div className="flex items-center gap-2">
          <span className="text-lg">{getSignalIcon(item.signal_type)}</span>
          <span className="font-medium text-white capitalize">{item.signal_type.replace(/_/g, ' ')}</span>
        </div>
      ),
    },
    {
      key: 'model_id',
      header: 'Model',
      render: (item: SafetySignal) => (
        <span className="font-mono text-sm text-slate-300">{item.model_id || 'N/A'}</span>
      ),
    },
    {
      key: 'severity',
      header: 'Severity',
      render: (item: SafetySignal) => <SafetyBadge severity={item.severity as any} />,
    },
    {
      key: 'confidence',
      header: 'Confidence',
      render: (item: SafetySignal) => (
        <span className="text-slate-300 tabular-nums">{(item.confidence * 100).toFixed(0)}%</span>
      ),
    },
    {
      key: 'description',
      header: 'Details',
      render: (item: SafetySignal) => (
        <span className="text-slate-400 line-clamp-1">{item.description}</span>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-white/5">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span className="text-sm font-medium text-amber-400">AI Safety & Evaluation</span>
              </div>
              <h1 className="text-4xl font-bold text-white mb-3">
                Welcome to <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">RealBench Pro</span>
              </h1>
              <p className="text-lg text-slate-400 max-w-xl">
                Continuous, contamination-resistant evaluation platform with advanced safety detection for frontier AI models.
              </p>
            </div>
            <div className="hidden lg:flex gap-3">
              <Link href="/evaluate">
                <Button variant="gradient" size="lg">
                  <Play className="w-4 h-4 mr-2" />
                  New Evaluation
                </Button>
              </Link>
              <Link href="/leaderboard">
                <Button variant="outline" size="lg">
                  View Leaderboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Grid */}
        {loading ? (
          <CardGrid className="mb-8" cols={4}>
            {[1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </CardGrid>
        ) : (
          <CardGrid className="mb-8" cols={4}>
            {stats.map((stat, index) => (
              <StatCard key={index} {...stat} />
            ))}
          </CardGrid>
        )}

        {/* Risk Categories Overview */}
        <Card 
          title="Risk Categories" 
          subtitle="Hierarchical safety monitoring"
          className="mb-8"
          action={
            <Link href="/safety">
              <Button variant="ghost" size="sm">View Details <ArrowRight className="w-4 h-4 ml-1" /></Button>
            </Link>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Critical Risks */}
            <Link href="/safety" className="block">
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">🔴</span>
                  <div>
                    <h4 className="font-semibold text-red-400">Critical Risks</h4>
                    <p className="text-xs text-red-400/70">11 signal types</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400">Self-improvement, autonomy, sabotage</p>
              </div>
            </Link>

            {/* Deception Risks */}
            <Link href="/safety" className="block">
              <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">🟠</span>
                  <div>
                    <h4 className="font-semibold text-orange-400">Deception Risks</h4>
                    <p className="text-xs text-orange-400/70">10 signal types</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400">Alignment faking, manipulation, collusion</p>
              </div>
            </Link>

            {/* Capability Evaluation */}
            <Link href="/research-math" className="block">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">🟢</span>
                  <div>
                    <h4 className="font-semibold text-emerald-400">Capability Eval</h4>
                    <p className="text-xs text-emerald-400/70">6 research problems</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400">Benchmarks, contamination, research math</p>
              </div>
            </Link>

            {/* Detection Methods */}
            <Link href="/ensemble" className="block">
              <div className="p-4 rounded-xl bg-slate-500/10 border border-slate-500/30 hover:bg-slate-500/20 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">⚙️</span>
                  <div>
                    <h4 className="font-semibold text-slate-300">Detection Methods</h4>
                    <p className="text-xs text-slate-400/70">4 analysis types</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400">Keyword, reasoning trace, behavioral, ensemble</p>
              </div>
            </Link>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Top Models - Takes 2 columns */}
          <div className="lg:col-span-2">
            <Card 
              title="Top Performing Models" 
              subtitle="Based on overall evaluation scores"
              action={
                leaderboard.length > 0 && (
                  <Link href="/leaderboard">
                    <Button variant="ghost" size="sm">
                      View All <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                )
              }
            >
              {loading ? (
                <SkeletonTable rows={5} />
              ) : leaderboard.length > 0 ? (
                <Table
                  data={leaderboard}
                  columns={leaderboardColumns}
                />
              ) : (
                <EmptyState
                  variant="leaderboard"
                  title="No evaluations yet"
                  description="Run your first evaluation to see models ranked by performance."
                  action={{ label: 'Start Evaluation', href: '/evaluate' }}
                />
              )}
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <Card title="Quick Actions" variant="gradient">
              <div className="space-y-3">
                <Link href="/evaluate" className="block">
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group">
                    <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                      <Play className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-white">Run Evaluation</p>
                      <p className="text-xs text-slate-400">Test models against benchmarks</p>
                    </div>
                  </div>
                </Link>
                <Link href="/safety" className="block">
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group">
                    <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-white">Safety Analysis</p>
                      <p className="text-xs text-slate-400">Review safety signals</p>
                    </div>
                  </div>
                </Link>
                <Link href="/leaderboard" className="block">
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group">
                    <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-white">Leaderboard</p>
                      <p className="text-xs text-slate-400">Compare model rankings</p>
                    </div>
                  </div>
                </Link>
              </div>
            </Card>

            {/* System Status */}
            {systemHealth && (
              <Card variant="glass">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${systemHealth.status === 'healthy' ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
                  <div>
                    <p className="font-medium text-white">
                      {systemHealth.status === 'healthy' ? 'All Systems Operational' : 'System Issues'}
                    </p>
                    <p className="text-xs text-slate-400">
                      Database {systemHealth.database_connected ? 'connected' : 'disconnected'}
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Recent Safety Signals */}
        <Card
          title="Recent Safety Signals"
          subtitle="Latest safety concerns detected across all evaluations"
          action={
            safetySignals.some(s => s.severity === 'critical' || s.severity === 'high') ? (
              <Badge variant="danger" dot pulse>
                <AlertTriangle className="w-3 h-3 mr-1" />
                Attention Required
              </Badge>
            ) : safetySignals.length > 0 ? (
              <Link href="/safety">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            ) : null
          }
        >
          {loading ? (
            <SkeletonTable rows={5} />
          ) : safetySignals.length > 0 ? (
            <Table
              data={safetySignals}
              columns={safetyColumns}
            />
          ) : (
            <EmptyState
              variant="safety"
              title="No safety signals"
              description="All evaluations are running clean. No safety concerns detected."
            />
          )}
        </Card>
      </main>
    </div>
  );
}
