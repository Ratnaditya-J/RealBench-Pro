'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  GitCompare, Shield, CheckCircle, AlertTriangle, XCircle, 
  ChevronDown, ChevronRight, Eye, RefreshCw, ExternalLink,
  Play
} from 'lucide-react';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import Button from '@/components/Button';
import { getLatestComparison, getAvailableModels, ModelComparisonData, ComparisonTestResult, ModelInfo } from '@/lib/api';

// =============================================================================
// Helper Functions
// =============================================================================

const getRiskColor = (riskLevel: string): string => {
  switch (riskLevel) {
    case 'critical': return 'text-red-400 bg-red-500/20';
    case 'high': return 'text-orange-400 bg-orange-500/20';
    case 'medium': return 'text-yellow-400 bg-yellow-500/20';
    case 'low': return 'text-blue-400 bg-blue-500/20';
    case 'none': return 'text-emerald-400 bg-emerald-500/20';
    default: return 'text-slate-400 bg-slate-500/20';
  }
};

const getCategoryIcon = (category: string): string => {
  switch (category.toLowerCase()) {
    case 'self-preservation': return '🛡️';
    case 'self-improvement': return '⚡';
    case 'deception': return '🎭';
    case 'sabotage': return '💣';
    case 'manipulation': return '🎯';
    case 'collusion': return '🤝';
    default: return '📋';
  }
};

// =============================================================================
// Subcomponents
// =============================================================================

interface ModelStatCardProps {
  model: string;
  stats: { clean: number; flagged: number; errors: number };
}

function ModelStatCard({ model, stats }: ModelStatCardProps) {
  const total = stats.clean + stats.flagged + stats.errors;
  const safetyScore = total > 0 ? Math.round((stats.clean / total) * 100) : 0;
  
  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <div className="flex items-center justify-between mb-3">
        <code className="text-sm font-medium text-white">{model}</code>
        <Badge variant={safetyScore >= 80 ? 'success' : safetyScore >= 50 ? 'warning' : 'danger'}>
          {safetyScore}% safe
        </Badge>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <div>
          <div className="text-xl font-bold text-emerald-400">{stats.clean}</div>
          <div className="text-slate-500 text-xs">Clean</div>
        </div>
        <div>
          <div className="text-xl font-bold text-orange-400">{stats.flagged}</div>
          <div className="text-slate-500 text-xs">Flagged</div>
        </div>
        <div>
          <div className="text-xl font-bold text-red-400">{stats.errors}</div>
          <div className="text-slate-500 text-xs">Errors</div>
        </div>
      </div>
    </div>
  );
}

interface TestRowProps {
  test: { id: string; name: string; category: string };
  results: ComparisonTestResult[];
  models: string[];
  expanded: boolean;
  onToggle: () => void;
}

function TestRow({ test, results, models, expanded, onToggle }: TestRowProps) {
  const getResultForModel = (model: string) => 
    results.find(r => r.model === model && r.test_id === test.id);
  
  return (
    <>
      <tr 
        className="border-b border-slate-700/50 hover:bg-slate-800/30 cursor-pointer transition-colors"
        onClick={onToggle}
      >
        <td className="p-4">
          <div className="flex items-center gap-3">
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
            <span className="text-lg">{getCategoryIcon(test.category)}</span>
            <div>
              <div className="font-medium text-white">{test.name}</div>
              <div className="text-xs text-slate-500">{test.category}</div>
            </div>
          </div>
        </td>
        {models.map(model => {
          const result = getResultForModel(model);
          if (!result) {
            return <td key={model} className="p-4 text-center text-slate-500">—</td>;
          }
          
          const hasEnsembleFlag = result.ensemble_verdict && 
            result.ensemble_verdict.risk_level !== 'none' && 
            result.ensemble_verdict.risk_level !== 'low';
          const hasKeywordFlag = Object.keys(result.detected_signals || {}).length > 0;
          const isError = result.response.startsWith('ERROR');
          
          if (isError) {
            return (
              <td key={model} className="p-4 text-center">
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-500/20 text-red-400 text-sm">
                  <XCircle className="w-3.5 h-3.5" />
                  Error
                </div>
              </td>
            );
          }
          
          if (hasEnsembleFlag) {
            const verdict = result.ensemble_verdict!;
            return (
              <td key={model} className="p-4 text-center">
                <div className={`inline-flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg ${getRiskColor(verdict.risk_level)}`}>
                  <div className="flex items-center gap-1.5 font-medium text-sm">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {verdict.risk_level.toUpperCase()}
                  </div>
                  <div className="text-xs opacity-80">
                    {Math.round(verdict.confidence * 100)}% confidence
                  </div>
                </div>
              </td>
            );
          }
          
          if (hasKeywordFlag) {
            return (
              <td key={model} className="p-4 text-center">
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-orange-500/20 text-orange-400 text-sm">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Keywords
                </div>
              </td>
            );
          }
          
          return (
            <td key={model} className="p-4 text-center">
              <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm">
                <CheckCircle className="w-3.5 h-3.5" />
                Clean
              </div>
            </td>
          );
        })}
      </tr>
      
      {/* Expanded Details */}
      {expanded && (
        <tr className="bg-slate-900/50">
          <td colSpan={models.length + 1} className="p-4">
            <div className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${models.length}, 1fr)` }}>
              <div className="text-sm text-slate-400">
                <div className="font-medium text-slate-300 mb-2">Responses</div>
                <p className="text-xs">Compare how each model handled this safety scenario.</p>
              </div>
              {models.map(model => {
                const result = getResultForModel(model);
                if (!result) return <div key={model} />;
                
                return (
                  <div key={model} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                    <div className="flex items-center justify-between mb-2">
                      <code className="text-xs text-slate-400">{model}</code>
                      <span className="text-xs text-slate-500">{result.response_length} chars</span>
                    </div>
                    <div className="text-sm text-slate-300 max-h-48 overflow-y-auto whitespace-pre-wrap font-mono text-xs leading-relaxed">
                      {result.response.slice(0, 600)}
                      {result.response.length > 600 && '...'}
                    </div>
                    {result.ensemble_verdict && (
                      <div className="mt-3 pt-3 border-t border-slate-700/50">
                        <div className="text-xs text-slate-400 mb-1">Ensemble Analysis:</div>
                        <div className="text-xs text-slate-300 italic">
                          {result.ensemble_verdict.reasoning.slice(0, 200)}
                          {result.ensemble_verdict.reasoning.length > 200 && '...'}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// =============================================================================
// Main Component
// =============================================================================

interface ModelComparisonProps {
  className?: string;
}

export default function ModelComparison({ className = '' }: ModelComparisonProps) {
  const [data, setData] = useState<ModelComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());
  
  // Model selection state
  const [selectedModel1, setSelectedModel1] = useState<string>('claude-opus-4-5');
  const [selectedModel2, setSelectedModel2] = useState<string>('claude-opus-4-6');
  
  // All available models from backend
  const [allModels, setAllModels] = useState<ModelInfo[]>([]);
  
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load both comparison data and available models
      const [comparison, models] = await Promise.all([
        getLatestComparison(),
        getAvailableModels()
      ]);
      
      if (models.length > 0) {
        setAllModels(models);
      }
      
      if (comparison) {
        setData(comparison);
        // Update selected models to match available data
        if (comparison.models.length >= 2) {
          setSelectedModel1(comparison.models[0]);
          setSelectedModel2(comparison.models[1]);
        }
      } else {
        setError('No comparison data available');
      }
    } catch (e) {
      setError('Failed to load comparison data');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadData();
  }, []);
  
  // Filter data based on selected models
  const filteredData = useMemo(() => {
    if (!data) return null;
    
    const selectedModels = [selectedModel1, selectedModel2].filter(Boolean);
    const filteredResults = data.results.filter(r => selectedModels.includes(r.model));
    
    // Recalculate summary stats for filtered models
    const modelStats: Record<string, { clean: number; flagged: number; errors: number }> = {};
    selectedModels.forEach(m => {
      modelStats[m] = { clean: 0, flagged: 0, errors: 0 };
    });
    
    for (const r of filteredResults) {
      if (!modelStats[r.model]) continue;
      
      if (r.response.startsWith('ERROR')) {
        modelStats[r.model].errors += 1;
      } else if (r.ensemble_verdict && r.ensemble_verdict.risk_level !== 'none' && r.ensemble_verdict.risk_level !== 'low') {
        modelStats[r.model].flagged += 1;
      } else if (Object.keys(r.detected_signals || {}).length > 0) {
        modelStats[r.model].flagged += 1;
      } else {
        modelStats[r.model].clean += 1;
      }
    }
    
    return {
      ...data,
      models: selectedModels,
      results: filteredResults,
      summary: {
        ...data.summary,
        model_stats: modelStats
      }
    };
  }, [data, selectedModel1, selectedModel2]);
  
  const toggleTest = (testId: string) => {
    setExpandedTests(prev => {
      const next = new Set(prev);
      if (next.has(testId)) {
        next.delete(testId);
      } else {
        next.add(testId);
      }
      return next;
    });
  };
  
  // Get models that have comparison data (from the actual results)
  const modelsWithData = useMemo(() => {
    if (!data?.results) return new Set<string>();
    return new Set(data.results.map(r => r.model));
  }, [data]);
  
  // Get available models - prioritize models with comparison data
  const availableModels = useMemo(() => {
    // Start with models that have actual comparison data
    const modelsFromData = data?.models || [];
    const modelsFromDataSet = new Set(modelsFromData);
    
    // Build the list: models with data first, then others
    const result: ModelInfo[] = [];
    
    // Add models with comparison data first
    for (const id of modelsFromData) {
      const displayName = allModels.find(m => m.id === id)?.name || id;
      result.push({ id, name: `${displayName} ✓` }); // Mark as having data
    }
    
    // Add other models from API (without data)
    for (const model of allModels) {
      if (!modelsFromDataSet.has(model.id)) {
        result.push({ id: model.id, name: `${model.name} (no data)` });
      }
    }
    
    return result;
  }, [allModels, data]);
  
  // Check if selected models have data
  const selectedModelsHaveData = useMemo(() => {
    return modelsWithData.has(selectedModel1) && modelsWithData.has(selectedModel2);
  }, [modelsWithData, selectedModel1, selectedModel2]);
  
  if (loading) {
    return (
      <Card className={className}>
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      </Card>
    );
  }
  
  if (error || !data) {
    return (
      <Card className={className}>
        <div className="text-center py-8">
          <Shield className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 mb-4">{error || 'No comparison data'}</p>
          <Button variant="secondary" size="sm" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </Card>
    );
  }
  
  const displayData = filteredData || data;
  
  return (
    <Card 
      className={className}
      title={
        <div className="flex items-center gap-3">
          <GitCompare className="w-5 h-5 text-blue-400" />
          <span>Head-to-Head Safety Comparison</span>
        </div>
      }
      subtitle={`${displayData.tests.length} identical safety scenarios`}
      action={
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            Generated: {data.generated_at?.replace('_', ' ')}
          </span>
          <Button variant="ghost" size="sm" onClick={loadData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      }
    >
      {/* Model Selectors */}
      <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700/50">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-400">Model A:</label>
          <select
            value={selectedModel1}
            onChange={(e) => setSelectedModel1(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[180px]"
          >
            {availableModels.map(m => (
              <option key={m.id} value={m.id} disabled={m.id === selectedModel2}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="text-slate-500 font-bold">vs</div>
        
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-400">Model B:</label>
          <select
            value={selectedModel2}
            onChange={(e) => setSelectedModel2(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[180px]"
          >
            {availableModels.map(m => (
              <option key={m.id} value={m.id} disabled={m.id === selectedModel1}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex-1" />
        
        <Button 
          variant="primary" 
          size="sm"
          onClick={() => {
            // TODO: Trigger new comparison run
            alert(`To run a new comparison between ${selectedModel1} and ${selectedModel2}, use:\n\ncd backend && python run_comparison.py --models ${selectedModel1} ${selectedModel2}`);
          }}
        >
          <Play className="w-4 h-4 mr-1" />
          Run Comparison
        </Button>
      </div>
      {/* No Data Warning */}
      {!selectedModelsHaveData && (
        <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
            <div>
              <div className="font-medium text-amber-300 mb-1">No comparison data for selected models</div>
              <p className="text-sm text-amber-400/80">
                Comparison data only exists for models that have been tested head-to-head. 
                Currently available: <strong>{Array.from(modelsWithData).join(', ')}</strong>
              </p>
              <p className="text-sm text-slate-400 mt-2">
                Use the "Run Comparison" button to generate new comparison data for different models.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Model Summary Cards */}
      {selectedModelsHaveData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {displayData.models.map(model => (
              <ModelStatCard 
                key={model} 
                model={model} 
                stats={displayData.summary.model_stats[model] || { clean: 0, flagged: 0, errors: 0 }} 
              />
            ))}
          </div>
          
          {/* Comparison Table */}
          <div className="overflow-x-auto -mx-6">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-700/50 text-left">
                  <th className="p-4 text-slate-400 font-medium text-sm">Test Scenario</th>
                  {displayData.models.map(model => (
                    <th key={model} className="p-4 text-center text-slate-400 font-medium text-sm">
                      <code className="font-mono">{model}</code>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayData.tests.map(test => (
                  <TestRow
                    key={test.id}
                    test={test}
                    results={displayData.results}
                    models={displayData.models}
                    expanded={expandedTests.has(test.id)}
                    onToggle={() => toggleTest(test.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      
      {/* Legend */}
      {selectedModelsHaveData && (
        <div className="mt-6 pt-4 border-t border-slate-700/50">
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <span className="font-medium">Legend:</span>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/50" />
              <span>Clean (no safety concerns)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-orange-500/20 border border-orange-500/50" />
              <span>Flagged (potential concerns)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/50" />
              <span>Error (test failed)</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
