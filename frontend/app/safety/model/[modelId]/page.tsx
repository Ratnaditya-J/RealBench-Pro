'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Shield, AlertTriangle, CheckCircle, Clock, DollarSign, Brain } from 'lucide-react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Badge from '@/components/Badge';

interface SafetySignal {
  type: string;
  risk_level: string;
  evidence: string;
}

// Helper to extract signal properties (handles both dict and tuple format)
const getSignalType = (sig: SafetySignal | string[]): string => {
  if (Array.isArray(sig)) return sig[0] || 'unknown';
  return sig.type || 'unknown';
};
const getSignalRisk = (sig: SafetySignal | string[]): string => {
  if (Array.isArray(sig)) return sig[1] || 'medium';
  return sig.risk_level || 'medium';
};
const getSignalEvidence = (sig: SafetySignal | string[]): string => {
  if (Array.isArray(sig)) return sig[2] || '';
  return sig.evidence || '';
};

interface SafetyTestResult {
  test_name: string;
  tier: number;
  risk_level: string;
  is_safe: boolean;
  confidence: number;
  signals: SafetySignal[];
  recommendation: string;
  cot_found: boolean; // Indicates if reasoning trace was available
  cot_preview?: string; // Reasoning trace preview
  response_preview: string;
  cost_usd: number;
  latency_ms: number;
  timestamp?: string;
}

interface ModelSafetyData {
  model_id: string;
  tests: SafetyTestResult[];
  summary: {
    risk_counts: Record<string, number>;
    total_signals: number;
    high_risk_tests: string[];
  };
  total_cost: number;
  timestamp: string;
}

const getRiskEmoji = (risk: string) => {
  switch (risk) {
    case 'critical': return '🔴';
    case 'high': return '🟠';
    case 'medium': return '🟡';
    case 'low': return '🟢';
    case 'none': return '🟢';
    default: return '⚪';
  }
};

const getRiskColor = (risk: string) => {
  switch (risk) {
    case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'low': return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'none': return 'bg-green-500/20 text-green-400 border-green-500/30';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
};

const TIER_NAMES: Record<number, string> = {
  1: 'Critical (Tier 1)',
  2: 'High Priority (Tier 2)',
  3: 'Standard (Tier 3)',
};

export default function ModelSafetyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const modelId = decodeURIComponent(params.modelId as string);
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ModelSafetyData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedTest, setExpandedTest] = useState<string | null>(null);

  useEffect(() => {
    loadModelData();
  }, [modelId]);

  const loadModelData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/api/v1/safety/model/${encodeURIComponent(modelId)}`);
      if (!response.ok) {
        throw new Error(`Failed to load: ${response.statusText}`);
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-700 rounded w-1/3"></div>
            <div className="h-64 bg-slate-800 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
        <div className="max-w-6xl mx-auto">
          <Link href="/safety" className="text-blue-400 hover:text-blue-300 flex items-center gap-2 mb-4">
            <ArrowLeft size={16} /> Back to Safety Dashboard
          </Link>
          <Card className="p-6 text-center">
            <AlertTriangle className="mx-auto mb-4 text-yellow-500" size={48} />
            <h2 className="text-xl font-semibold text-white mb-2">No Data Found</h2>
            <p className="text-slate-400">{error || `No safety results for ${modelId}`}</p>
          </Card>
        </div>
      </div>
    );
  }

  const testsByTier = data.tests.reduce((acc, test) => {
    const tier = test.tier || 3;
    if (!acc[tier]) acc[tier] = [];
    acc[tier].push(test);
    return acc;
  }, {} as Record<number, SafetyTestResult[]>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/5 bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm mb-4">
            <Link href="/" className="text-slate-400 hover:text-white transition-colors">Home</Link>
            <span className="text-slate-600">/</span>
            <Link href="/safety" className="text-slate-400 hover:text-white transition-colors">Safety</Link>
            <span className="text-slate-600">/</span>
            <span className="text-white">{modelId}</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Shield className="text-blue-500" />
                {modelId}
              </h1>
              <p className="text-slate-400 mt-1">
                Safety evaluation details • {data.tests.length} tests • Last run: {new Date(data.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {['critical', 'high', 'medium', 'low', 'none'].map((risk) => (
            <Card key={risk} className={`p-4 ${getRiskColor(risk)} border`}>
              <div className="text-2xl font-bold">{data.summary.risk_counts[risk] || 0}</div>
              <div className="text-sm capitalize">{risk === 'none' ? 'Safe' : risk} Risk</div>
            </Card>
          ))}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 bg-slate-800/50">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
              <AlertTriangle size={14} /> Total Signals
            </div>
            <div className="text-2xl font-bold text-white">{data.summary.total_signals}</div>
          </Card>
          <Card className="p-4 bg-slate-800/50">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
              <DollarSign size={14} /> Total Cost
            </div>
            <div className="text-2xl font-bold text-white">${data.total_cost.toFixed(4)}</div>
          </Card>
          <Card className="p-4 bg-slate-800/50">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
              <Brain size={14} /> Reasoning Trace Detected
            </div>
            <div className="text-2xl font-bold text-white">
              {data.tests.filter(t => t.cot_found).length}/{data.tests.length}
            </div>
          </Card>
        </div>

        {/* High Risk Tests Alert */}
        {data.summary.high_risk_tests.length > 0 && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-red-500 mt-1" size={20} />
              <div>
                <h3 className="font-semibold text-red-400">High Risk Tests Detected</h3>
                <p className="text-slate-300 text-sm mt-1">
                  {data.summary.high_risk_tests.map(t => t.replace('T1_', '').replace('T2_', '').replace('T3_', '')).join(', ')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tests by Tier */}
        {[1, 2, 3].map((tier) => (
          testsByTier[tier] && testsByTier[tier].length > 0 && (
            <div key={tier} className="space-y-3">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                {tier === 1 && '🔴'} {tier === 2 && '🟠'} {tier === 3 && '🟡'}
                {TIER_NAMES[tier]}
              </h2>
              
              {testsByTier[tier].map((test) => (
                <div
                  key={test.test_name}
                  onClick={() => setExpandedTest(expandedTest === test.test_name ? null : test.test_name)}
                  className={`p-4 cursor-pointer transition-all hover:bg-slate-800/80 rounded-xl bg-slate-800/50 border border-slate-700/50 ${
                    expandedTest === test.test_name ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getRiskEmoji(test.risk_level)}</span>
                      <div>
                        <h3 className="font-medium text-white">
                          {test.test_name.replace('T1_', '').replace('T2_', '').replace('T3_', '').replace(/_/g, ' ')}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <span>Confidence: {(test.confidence * 100).toFixed(0)}%</span>
                          <span>•</span>
                          <span>${test.cost_usd.toFixed(4)}</span>
                          <span>•</span>
                          <span>{test.latency_ms.toFixed(0)}ms</span>
                          {test.cot_found && (
                            <>
                              <span>•</span>
                              <span className="text-blue-400">📝 Reasoning Trace</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge className={getRiskColor(test.risk_level)}>
                      {test.risk_level.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Signals */}
                  {test.signals.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {test.signals.map((sig, idx) => (
                        <span 
                          key={idx}
                          className={`px-2 py-1 rounded text-xs ${getRiskColor(getSignalRisk(sig))}`}
                        >
                          {getSignalType(sig)}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Expanded Details */}
                  {expandedTest === test.test_name && (
                    <div className="mt-4 pt-4 border-t border-slate-700 space-y-4">
                      {/* Signals Detail */}
                      {test.signals.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-slate-300 mb-2">Detected Signals</h4>
                          {test.signals.map((sig, idx) => (
                            <div key={idx} className="bg-slate-800/50 p-3 rounded mb-2">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-0.5 rounded text-xs ${getRiskColor(getSignalRisk(sig))}`}>
                                  {getSignalRisk(sig).toUpperCase()}
                                </span>
                                <span className="font-medium text-white">{getSignalType(sig)}</span>
                              </div>
                              <p className="text-slate-400 text-sm">{getSignalEvidence(sig)}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reasoning Trace Preview */}
                      {test.cot_preview && (
                        <div>
                          <h4 className="text-sm font-medium text-slate-300 mb-2">Reasoning Trace</h4>
                          <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded">
                            <pre className="text-sm text-blue-200 whitespace-pre-wrap">{test.cot_preview}</pre>
                          </div>
                        </div>
                      )}

                      {/* Response Preview */}
                      <div>
                        <h4 className="text-sm font-medium text-slate-300 mb-2">Response Preview</h4>
                        <div className="bg-slate-800/50 p-3 rounded">
                          <pre className="text-sm text-slate-300 whitespace-pre-wrap">{test.response_preview}</pre>
                        </div>
                      </div>

                      {/* Recommendation */}
                      {test.recommendation && (
                        <div>
                          <h4 className="text-sm font-medium text-slate-300 mb-2">Recommendation</h4>
                          <p className="text-slate-400">{test.recommendation}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ))}
      </div>
    </div>
  );
}
