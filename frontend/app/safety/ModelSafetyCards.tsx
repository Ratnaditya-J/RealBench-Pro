'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Shield, AlertTriangle, ChevronRight } from 'lucide-react';
import Card from '@/components/Card';

interface ModelSummary {
  model_id: string;
  risk_counts: Record<string, number>;
  total_signals: number;
  high_risk_tests: string[];
  total_cost: number;
  timestamp: string;
}

interface SafetySummary {
  models: ModelSummary[];
  last_updated: string;
}

const getRiskBgColor = (risk: string) => {
  switch (risk) {
    case 'critical': return 'bg-red-500';
    case 'high': return 'bg-orange-500';
    case 'medium': return 'bg-yellow-500';
    default: return 'bg-green-500';
  }
};

export default function ModelSafetyCards() {
  const [data, setData] = useState<SafetySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/safety/summary')
      .then(res => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-48 bg-slate-800/50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data || data.models.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        <Shield className="w-5 h-5 text-blue-400" />
        Model Safety Overview
        <span className="text-sm font-normal text-slate-400 ml-2">
          Click to view details
        </span>
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.models.map((model) => {
          const totalTests = Object.values(model.risk_counts).reduce((a, b) => a + b, 0);
          const highRiskCount = (model.risk_counts.critical || 0) + (model.risk_counts.high || 0);
          const safeCount = (model.risk_counts.none || 0) + (model.risk_counts.low || 0);
          
          return (
            <Link 
              key={model.model_id} 
              href={`/safety/model/${encodeURIComponent(model.model_id)}`}
              className="block group"
            >
              <Card className="p-5 h-full hover:bg-slate-800/80 transition-all border border-slate-700/50 hover:border-blue-500/50">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                    {model.model_id}
                  </h3>
                  <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-blue-400 transition-colors" />
                </div>

                {/* Risk Bar */}
                <div className="flex h-3 rounded-full overflow-hidden mb-4 bg-slate-700/50">
                  {model.risk_counts.critical > 0 && (
                    <div 
                      className="bg-red-500" 
                      style={{ width: `${(model.risk_counts.critical / totalTests) * 100}%` }}
                    />
                  )}
                  {model.risk_counts.high > 0 && (
                    <div 
                      className="bg-orange-500" 
                      style={{ width: `${(model.risk_counts.high / totalTests) * 100}%` }}
                    />
                  )}
                  {model.risk_counts.medium > 0 && (
                    <div 
                      className="bg-yellow-500" 
                      style={{ width: `${(model.risk_counts.medium / totalTests) * 100}%` }}
                    />
                  )}
                  {(model.risk_counts.low || 0) + (model.risk_counts.none || 0) > 0 && (
                    <div 
                      className="bg-green-500" 
                      style={{ width: `${(safeCount / totalTests) * 100}%` }}
                    />
                  )}
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-2 text-center mb-4">
                  <div className="bg-red-500/10 rounded-lg p-2">
                    <div className="text-lg font-bold text-red-400">{highRiskCount}</div>
                    <div className="text-xs text-slate-400">High Risk</div>
                  </div>
                  <div className="bg-yellow-500/10 rounded-lg p-2">
                    <div className="text-lg font-bold text-yellow-400">{model.risk_counts.medium || 0}</div>
                    <div className="text-xs text-slate-400">Medium</div>
                  </div>
                  <div className="bg-green-500/10 rounded-lg p-2">
                    <div className="text-lg font-bold text-green-400">{safeCount}</div>
                    <div className="text-xs text-slate-400">Safe</div>
                  </div>
                </div>

                {/* High Risk Tests */}
                {model.high_risk_tests.length > 0 && (
                  <div className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-400">
                      {model.high_risk_tests.slice(0, 2).map(t => 
                        t.replace('T1_', '').replace('T2_', '').replace('T3_', '').replace(/_/g, ' ')
                      ).join(', ')}
                      {model.high_risk_tests.length > 2 && ` +${model.high_risk_tests.length - 2} more`}
                    </span>
                  </div>
                )}

                {/* Footer */}
                <div className="mt-3 pt-3 border-t border-slate-700/50 flex justify-between text-xs text-slate-500">
                  <span>{model.total_signals} signals</span>
                  <span>${model.total_cost.toFixed(4)}</span>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
