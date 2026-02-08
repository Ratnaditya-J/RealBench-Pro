'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trophy, TrendingUp, Shield, AlertTriangle, Zap, ChevronLeft, Medal, Crown, Award } from 'lucide-react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Table from '@/components/Table';
import Badge from '@/components/Badge';
import EmptyState from '@/components/EmptyState';
import { SkeletonLeaderboard, SkeletonTable } from '@/components/Skeleton';
import { getLeaderboard, LeaderboardEntry } from '@/lib/api';

export default function LeaderboardPage() {
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [sortBy, setSortBy] = useState<'overall_score' | 'evaluation_count'>('overall_score');
  const [filterFlags, setFilterFlags] = useState<'all' | 'clean' | 'flagged'>('all');

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await getLeaderboard();
      setLeaderboard(data);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = leaderboard
    .filter(entry => {
      if (filterFlags === 'clean') {
        return (entry.safety_flags || 0) === 0 && (entry.contamination_flags || 0) === 0;
      }
      if (filterFlags === 'flagged') {
        return (entry.safety_flags || 0) > 0 || (entry.contamination_flags || 0) > 0;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'overall_score') {
        return b.overall_score - a.overall_score;
      }
      return (b.evaluation_count || b.num_evaluations || 0) - (a.evaluation_count || a.num_evaluations || 0);
    });

  const topThree = filteredData.slice(0, 3);
  const rest = filteredData; // Show ALL models in the table, not just 4+

  const columns = [
    {
      key: 'rank',
      header: '#',
      render: (_: LeaderboardEntry, index: number) => (
        <span className="font-bold text-slate-400 tabular-nums">{index + 1}</span>
      ),
      className: 'w-12',
    },
    {
      key: 'model_id',
      header: 'Model',
      render: (item: LeaderboardEntry) => (
        <div>
          <div className="font-semibold text-white">{item.display_name || item.model_id}</div>
          <div className="text-xs text-slate-500 mt-0.5">{item.evaluation_count || item.num_evaluations || 0} evaluations</div>
        </div>
      ),
    },
    {
      key: 'overall_score',
      header: 'Score',
      render: (item: LeaderboardEntry) => (
        <div className="flex items-center gap-3">
          <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
              style={{ width: `${item.overall_score * 100}%` }}
            />
          </div>
          <span className="font-bold text-white tabular-nums w-16">{(item.overall_score * 100).toFixed(1)}%</span>
        </div>
      ),
    },
    {
      key: 'stats',
      header: 'Stats',
      render: (item: LeaderboardEntry) => (
        <div className="text-sm">
          <div className="text-slate-300">${item.avg_cost_usd?.toFixed(4) || '0.00'} avg</div>
          <div className="text-slate-500 text-xs">{item.avg_latency_ms?.toFixed(0) || '0'}ms latency</div>
        </div>
      ),
    },
    {
      key: 'flags',
      header: 'Status',
      render: (item: LeaderboardEntry) => (
        <div className="flex gap-2">
          {(item.safety_flags || 0) > 0 && (
            <Badge variant="danger" size="sm" dot>{item.safety_flags} safety</Badge>
          )}
          {(item.contamination_flags || 0) > 0 && (
            <Badge variant="warning" size="sm" dot>{item.contamination_flags} contamination</Badge>
          )}
          {(item.safety_flags || 0) === 0 && (item.contamination_flags || 0) === 0 && (
            <Badge variant="success" size="sm" dot>Clean</Badge>
          )}
        </div>
      ),
    },
  ];

  const PodiumCard = ({ entry, rank }: { entry: LeaderboardEntry; rank: 1 | 2 | 3 }) => {
    const config = {
      1: {
        icon: Crown,
        gradient: 'from-amber-400 via-yellow-500 to-amber-600',
        bg: 'from-amber-500/20 to-transparent',
        border: 'border-amber-500/30',
        size: 'h-32',
        iconSize: 'w-12 h-12',
        label: '1st Place',
        delay: 'delay-150',
      },
      2: {
        icon: Medal,
        gradient: 'from-slate-300 via-slate-400 to-slate-500',
        bg: 'from-slate-400/20 to-transparent',
        border: 'border-slate-500/30',
        size: 'h-24 mt-8',
        iconSize: 'w-10 h-10',
        label: '2nd Place',
        delay: 'delay-0',
      },
      3: {
        icon: Award,
        gradient: 'from-orange-400 via-amber-600 to-orange-700',
        bg: 'from-orange-500/20 to-transparent',
        border: 'border-orange-500/30',
        size: 'h-20 mt-12',
        iconSize: 'w-8 h-8',
        label: '3rd Place',
        delay: 'delay-300',
      },
    };

    const { icon: Icon, gradient, bg, border, size, iconSize, label, delay } = config[rank];

    return (
      <div className={`animate-in fade-in slide-in-from-bottom-4 duration-500 ${delay}`}>
        <Card 
          className={`text-center relative overflow-hidden ${border} border`}
          variant="glass"
        >
          {/* Background gradient */}
          <div className={`absolute inset-0 bg-gradient-to-b ${bg} pointer-events-none`} />
          
          <div className="relative">
            {/* Icon */}
            <div className={`mx-auto mb-4 ${size} flex items-end justify-center`}>
              <div className={`p-4 rounded-2xl bg-gradient-to-br ${gradient} shadow-lg`}>
                <Icon className={`${iconSize} text-white`} />
              </div>
            </div>

            {/* Rank label */}
            <div className={`text-xs font-bold uppercase tracking-wider mb-2 bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
              {label}
            </div>

            {/* Model name */}
            <h3 className="text-xl font-bold text-white mb-1 truncate px-2">
              {entry.display_name || entry.model_id}
            </h3>

            {/* Score */}
            <div className="text-4xl font-black text-white mb-3 tabular-nums">
              {(entry.overall_score * 100).toFixed(1)}%
            </div>

            {/* Stats */}
            <div className="flex justify-center gap-4 text-sm text-slate-400 mb-4">
              <span>{entry.evaluation_count || entry.num_evaluations || 0} evals</span>
              <span>${entry.avg_cost_usd?.toFixed(3) || '0'}</span>
            </div>

            {/* Flags */}
            {((entry.safety_flags || 0) > 0 || (entry.contamination_flags || 0) > 0) && (
              <div className="flex justify-center gap-2">
                {(entry.safety_flags || 0) > 0 && (
                  <Badge variant="danger" size="sm" dot>{entry.safety_flags} safety</Badge>
                )}
                {(entry.contamination_flags || 0) > 0 && (
                  <Badge variant="warning" size="sm" dot>{entry.contamination_flags} contamination</Badge>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/5 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Trophy className="w-8 h-8 text-amber-400" />
                <h1 className="text-3xl font-bold text-white">Leaderboard</h1>
              </div>
              <p className="text-slate-400">Rankings based on evaluation performance across all benchmarks</p>
            </div>

            <div className="flex gap-3">
              {/* Sort controls */}
              <div className="flex bg-slate-800/50 rounded-lg p-1 border border-white/5">
                <Button
                  variant={sortBy === 'overall_score' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setSortBy('overall_score')}
                >
                  By Score
                </Button>
                <Button
                  variant={sortBy === 'evaluation_count' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setSortBy('evaluation_count')}
                >
                  By Evals
                </Button>
              </div>

              {/* Filter controls */}
              <div className="flex bg-slate-800/50 rounded-lg p-1 border border-white/5">
                <Button
                  variant={filterFlags === 'all' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setFilterFlags('all')}
                >
                  All
                </Button>
                <Button
                  variant={filterFlags === 'clean' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setFilterFlags('clean')}
                >
                  <Shield className="w-3 h-3 mr-1" />
                  Clean
                </Button>
                <Button
                  variant={filterFlags === 'flagged' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setFilterFlags('flagged')}
                >
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Flagged
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <>
            <SkeletonLeaderboard />
            <div className="mt-8">
              <Card title="Complete Rankings">
                <SkeletonTable rows={5} />
              </Card>
            </div>
          </>
        ) : filteredData.length === 0 ? (
          <EmptyState
            variant="leaderboard"
            title="No models on the leaderboard"
            description="Run evaluations to see models ranked by their performance scores."
            action={{ label: 'Start Evaluation', href: '/evaluate' }}
          />
        ) : (
          <>
            {/* Podium - Top 3 */}
            {topThree.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {/* 2nd place - left */}
                {topThree[1] && (
                  <div className="order-2 md:order-1">
                    <PodiumCard entry={topThree[1]} rank={2} />
                  </div>
                )}
                
                {/* 1st place - center */}
                {topThree[0] && (
                  <div className="order-1 md:order-2">
                    <PodiumCard entry={topThree[0]} rank={1} />
                  </div>
                )}
                
                {/* 3rd place - right */}
                {topThree[2] && (
                  <div className="order-3">
                    <PodiumCard entry={topThree[2]} rank={3} />
                  </div>
                )}
              </div>
            )}

            {/* Rest of Rankings */}
            {rest.length > 0 && (
              <Card 
                title="Complete Rankings" 
                subtitle={`Showing ${filteredData.length} models`}
              >
                <Table
                  data={rest}
                  columns={columns}
                />
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}
