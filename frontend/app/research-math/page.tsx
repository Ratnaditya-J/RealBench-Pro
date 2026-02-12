'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FlaskConical, Brain, Award, ExternalLink, RefreshCw, Filter, Sparkles, Clock, Users } from 'lucide-react';
import Card, { CardGrid, StatCard } from '@/components/Card';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import EmptyState from '@/components/EmptyState';
import { SkeletonCard, SkeletonTable } from '@/components/Skeleton';

interface OpenProblem {
  problem_id: string;
  title: string;
  field: string;
  short_description: string;
  notability: string;
  attribution: string;
  solved: boolean;
  time_horizon: string;
  solvability: string;
  verifier_type: string;
  verifier_description: string;
  has_prompt: boolean;
}

interface ProblemsResponse {
  problems: OpenProblem[];
  total: number;
  stats: {
    total: number;
    by_notability: Record<string, number>;
    by_field: Record<string, number>;
    solved: number;
    source: string;
    source_url: string;
  };
}

const NOTABILITY_CONFIG: Record<string, { label: string; icon: string; color: string; bgColor: string }> = {
  major_advance: {
    label: 'Major Advance',
    icon: '⭐',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20 border-purple-500/30',
  },
  solid_result: {
    label: 'Solid Result',
    icon: '📊',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20 border-blue-500/30',
  },
  moderately_interesting: {
    label: 'Moderately Interesting',
    icon: '📝',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/20 border-slate-500/30',
  },
};

const FIELD_CONFIG: Record<string, { label: string; icon: string }> = {
  number_theory: { label: 'Number Theory', icon: '🔢' },
  combinatorics: { label: 'Combinatorics', icon: '🧩' },
  algebraic_geometry: { label: 'Algebraic Geometry', icon: '📐' },
  topology_geometry: { label: 'Topology / Geometry', icon: '🔮' },
};

export default function ResearchMathPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProblemsResponse | null>(null);
  const [filterNotability, setFilterNotability] = useState<string>('all');
  const [filterField, setFilterField] = useState<string>('all');

  useEffect(() => {
    loadProblems();
  }, []);

  const loadProblems = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/research-math/problems');
      if (!response.ok) throw new Error('Failed to fetch');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Failed to load research math problems:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProblems = data?.problems.filter(problem => {
    if (filterNotability !== 'all' && problem.notability !== filterNotability) return false;
    if (filterField !== 'all' && problem.field !== filterField) return false;
    return true;
  }) || [];

  const stats = data?.stats;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/5 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm mb-4">
            <Link href="/" className="text-slate-400 hover:text-white transition-colors">Home</Link>
            <span className="text-slate-600">/</span>
            <Link href="/safety" className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors">
              <span>🟢</span> Capability Evaluation
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-white">Research Math</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <FlaskConical className="w-8 h-8 text-emerald-400" />
                <h1 className="text-3xl font-bold text-white">Research Level Math</h1>
                <Badge variant="success" size="sm">🔬</Badge>
              </div>
              <p className="text-slate-400">
                FrontierMath: Open Problems — Unsolved mathematical questions that would advance human knowledge
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={loadProblems} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <a href="https://epoch.ai/frontiermath/open-problems" target="_blank" rel="noopener noreferrer">
                <Button variant="outline">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Epoch AI
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        {loading ? (
          <CardGrid className="mb-8" cols={4}>
            {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
          </CardGrid>
        ) : stats && (
          <CardGrid className="mb-8" cols={4}>
            <StatCard
              title="Total Problems"
              value={stats.total}
              change="Unsolved research problems"
              trend="neutral"
              icon={<Brain className="w-5 h-5" />}
            />
            <StatCard
              title="Breakthroughs"
              value={stats.by_notability?.breakthrough || 0}
              change="Field-changing results"
              trend="neutral"
              icon={<Award className="w-5 h-5" />}
              variant="warning"
            />
            <StatCard
              title="Solved by AI"
              value={stats.solved}
              change="None yet — be the first!"
              trend="neutral"
              icon={<Sparkles className="w-5 h-5" />}
            />
            <StatCard
              title="Fields Covered"
              value={Object.keys(stats.by_field || {}).length}
              change="Math disciplines"
              trend="neutral"
              icon={<FlaskConical className="w-5 h-5" />}
            />
          </CardGrid>
        )}

        {/* Info Banner */}
        <div className="mb-8 p-6 rounded-xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 backdrop-blur-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-purple-500/20">
              <Brain className="w-6 h-6 text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white mb-2">🔬 Verifiable Research Problems</h3>
              <p className="text-slate-300 text-sm mb-3">
                <strong>6 unsolved problems</strong> with constructive solutions we can partially verify.
                These are problems professional mathematicians have tried and failed to solve.
                Each problem asks for a specific mathematical object — we can verify the construction is valid.
              </p>
              <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Human baseline: 1 week to 12 months
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" /> 2-10 mathematicians have attempted each
                </span>
                <span>✓ Partial verifiers built-in</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notability Tiers */}
        <Card title="Problem Tiers" subtitle="Filter by significance level" className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(NOTABILITY_CONFIG).map(([key, config]) => {
              const count = data?.stats?.by_notability?.[key] || 0;
              const isActive = filterNotability === key;
              return (
                <button
                  key={key}
                  onClick={() => setFilterNotability(isActive ? 'all' : key)}
                  className={`
                    p-4 rounded-xl border text-left transition-all duration-200
                    ${isActive
                      ? config.bgColor
                      : 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600'
                    }
                  `}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{config.icon}</span>
                    <Badge variant="default" size="sm">{count}</Badge>
                  </div>
                  <h4 className={`font-semibold ${isActive ? config.color : 'text-white'} mb-1`}>
                    {config.label}
                  </h4>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Field Filter */}
        <div className="flex items-center gap-4 mb-6">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-400">Filter by field:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterField('all')}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                filterField === 'all'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-slate-800/50 text-slate-400 hover:text-white'
              }`}
            >
              All Fields
            </button>
            {Object.entries(FIELD_CONFIG).map(([key, config]) => (
              <button
                key={key}
                onClick={() => setFilterField(filterField === key ? 'all' : key)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  filterField === key
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-slate-800/50 text-slate-400 hover:text-white'
                }`}
              >
                {config.icon} {config.label}
              </button>
            ))}
          </div>
          {(filterNotability !== 'all' || filterField !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setFilterNotability('all'); setFilterField('all'); }}
            >
              Clear filters
            </Button>
          )}
        </div>

        {/* Problems List */}
        <Card
          title="Open Problems"
          subtitle={`${filteredProblems.length} of ${data?.total || 0} problems`}
        >
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse bg-slate-800/50 rounded-lg h-24" />
              ))}
            </div>
          ) : filteredProblems.length > 0 ? (
            <div className="space-y-4">
              {filteredProblems.map((problem) => {
                const notabilityConfig = NOTABILITY_CONFIG[problem.notability];
                const fieldConfig = FIELD_CONFIG[problem.field];
                return (
                  <a
                    key={problem.problem_id}
                    href={`https://epoch.ai/frontiermath/open-problems/${problem.problem_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-5 rounded-xl bg-slate-800/30 border border-slate-700/50 hover:border-slate-600 transition-all duration-200 group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xl">{notabilityConfig?.icon}</span>
                          <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                            {problem.title}
                          </h3>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium border ${notabilityConfig?.bgColor}`}>
                            {notabilityConfig?.label}
                          </span>
                        </div>
                        <p className="text-slate-400 text-sm mb-3">{problem.short_description}</p>
                        <div className="flex flex-wrap gap-4 text-xs text-slate-500 mb-2">
                          <span>{fieldConfig?.icon} {fieldConfig?.label}</span>
                          <span>⏱️ {problem.time_horizon}</span>
                          <span>📊 Solvability: {problem.solvability}</span>
                          {problem.attribution && <span>👤 {problem.attribution}</span>}
                        </div>
                        <div className="text-xs text-emerald-400/80 flex items-center gap-1">
                          <span>✓</span>
                          <span>{problem.verifier_description}</span>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
                    </div>
                  </a>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="No problems match filters"
              description="Try adjusting your filter criteria."
              action={{ label: 'Clear Filters', onClick: () => { setFilterNotability('all'); setFilterField('all'); } }}
            />
          )}
        </Card>

        {/* Verifier Info */}
        <Card className="mt-8" variant="glass">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <Award className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">Partial Verification Available</h3>
              <p className="text-sm text-slate-400 mb-3">
                These 6 problems have <strong>constructive solutions</strong> — they ask for specific mathematical objects.
                We can verify the construction is valid (correct polynomial, valid graph, etc.) even without knowing the "answer."
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 rounded bg-slate-700/50 text-slate-300">🔢 Polynomial/Galois verification</span>
                <span className="px-2 py-1 rounded bg-slate-700/50 text-slate-300">🧩 Combinatorial structure checks</span>
                <span className="px-2 py-1 rounded bg-slate-700/50 text-slate-300">📐 Algebraic surface analysis</span>
              </div>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
