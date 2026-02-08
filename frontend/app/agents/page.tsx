'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Sparkles, Activity, Target, TrendingUp } from 'lucide-react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export default function AgentsPage() {
  const [modelId, setModelId] = useState('');
  const [riskProfile, setRiskProfile] = useState('standard');
  const [deploymentContext, setDeploymentContext] = useState('general');
  const [maxCost, setMaxCost] = useState('');
  const [maxTime, setMaxTime] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [error, setError] = useState('');

  const handleCreatePlan = async () => {
    if (!modelId) {
      setError('Please enter a model ID');
      return;
    }

    // Check if API keys are provided based on model type
    const needsOpenAI = modelId.toLowerCase().includes('gpt');
    const needsAnthropic = modelId.toLowerCase().includes('claude');

    if (needsOpenAI && !openaiApiKey) {
      setError('OpenAI API key is required for GPT models');
      return;
    }

    if (needsAnthropic && !anthropicApiKey) {
      setError('Anthropic API key is required for Claude models');
      return;
    }

    setLoading(true);
    setError('');
    setPlan(null);

    try {
      const response = await axios.post(`${API_URL}/agents/orchestrator/plan`, {
        model_id: modelId,
        risk_profile: riskProfile,
        deployment_context: deploymentContext,
        max_cost_dollars: maxCost ? parseFloat(maxCost) : null,
        max_wall_time_seconds: maxTime ? parseInt(maxTime) : null,
        parallel_workers: 4,
        openai_api_key: openaiApiKey || undefined,
        anthropic_api_key: anthropicApiKey || undefined,
      });

      setPlan(response.data);
    } catch (err: any) {
      console.error('Failed to create plan:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to create evaluation plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-purple-500" />
              <div>
                <h1 className="text-2xl font-bold text-white">AI Agents</h1>
                <p className="text-sm text-slate-400">Intelligent automation for RealBench Pro</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Agent Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="border-2 border-purple-500/50">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Target className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">EvaluationOrchestrator</h3>
                <p className="text-sm text-slate-400 mb-3">
                  Intelligently plans and schedules evaluations based on model characteristics and resource constraints
                </p>
                <Badge variant="success">Active</Badge>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <Activity className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">SafetyGuard</h3>
                <p className="text-sm text-slate-400 mb-3">
                  Continuously monitors and remediates safety issues with autonomous testing
                </p>
                <Badge variant="default">Coming Soon</Badge>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">PerformanceOptimizer</h3>
                <p className="text-sm text-slate-400 mb-3">
                  Optimizes prompts and evaluation strategies through guided experimentation
                </p>
                <Badge variant="default">Coming Soon</Badge>
              </div>
            </div>
          </Card>
        </div>

        {/* EvaluationOrchestrator Interface */}
        <Card title="EvaluationOrchestrator" subtitle="Create an intelligent evaluation plan">
          <div className="space-y-6">
            {/* Model Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Model ID *
                </label>
                <input
                  type="text"
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  placeholder="e.g., gpt-4, claude-3-opus"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Risk Profile
                </label>
                <select
                  value={riskProfile}
                  onChange={(e) => setRiskProfile(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="unproven">Unproven - New model, comprehensive testing</option>
                  <option value="standard">Standard - Normal risk level</option>
                  <option value="safety_critical">Safety Critical - High-stakes deployment</option>
                  <option value="regression_test">Regression Test - Testing changes</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Deployment Context
                </label>
                <select
                  value={deploymentContext}
                  onChange={(e) => setDeploymentContext(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="general">General Purpose</option>
                  <option value="medical">Medical / Healthcare</option>
                  <option value="legal">Legal / Compliance</option>
                  <option value="educational">Educational</option>
                  <option value="software">Software Engineering</option>
                </select>
              </div>
            </div>

            {/* Resource Constraints */}
            <div>
              <h3 className="text-white font-semibold mb-3">Resource Constraints (Optional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Max Cost (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={maxCost}
                    onChange={(e) => setMaxCost(e.target.value)}
                    placeholder="No limit"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Max Time (seconds)
                  </label>
                  <input
                    type="number"
                    value={maxTime}
                    onChange={(e) => setMaxTime(e.target.value)}
                    placeholder="No limit"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* API Keys */}
            <div>
              <h3 className="text-white font-semibold mb-3">API Keys (Required for execution)</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    OpenAI API Key
                  </label>
                  <input
                    type="password"
                    value={openaiApiKey}
                    onChange={(e) => setOpenaiApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    For GPT models (gpt-4, gpt-4-turbo, gpt-3.5-turbo)
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Anthropic API Key
                  </label>
                  <input
                    type="password"
                    value={anthropicApiKey}
                    onChange={(e) => setAnthropicApiKey(e.target.value)}
                    placeholder="sk-ant-..."
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    For Claude models (claude-3-opus, claude-3-sonnet, claude-3-haiku)
                  </p>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* Action Button */}
            <Button
              onClick={handleCreatePlan}
              variant="primary"
              size="lg"
              className="w-full"
              loading={loading}
            >
              <Sparkles className="w-5 h-5 mr-2" />
              {loading ? 'Creating Plan...' : 'Create Intelligent Evaluation Plan'}
            </Button>
          </div>
        </Card>

        {/* Plan Results */}
        {plan && (
          <Card title="Evaluation Plan" className="mt-6 border-2 border-purple-500/50">
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <p className="text-sm text-slate-400">Plan ID</p>
                  <p className="text-lg font-semibold text-white font-mono truncate">{plan.plan_id.split('-')[0]}</p>
                </div>
                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <p className="text-sm text-slate-400">Total Tasks</p>
                  <p className="text-2xl font-bold text-white">{plan.total_tasks}</p>
                </div>
                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <p className="text-sm text-slate-400">Est. Cost</p>
                  <p className="text-2xl font-bold text-green-400">${plan.estimated_cost.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <p className="text-sm text-slate-400">Est. Time</p>
                  <p className="text-2xl font-bold text-blue-400">{Math.round(plan.estimated_time_seconds)}s</p>
                </div>
              </div>

              {/* Priority Breakdown */}
              <div>
                <h4 className="text-white font-semibold mb-3">Priority Breakdown</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(plan.priority_breakdown).map(([priority, count]: [string, any]) => (
                    <div key={priority} className="flex items-center gap-2">
                      <Badge
                        variant={
                          priority === 'critical' ? 'danger' :
                          priority === 'high' ? 'warning' :
                          priority === 'medium' ? 'info' : 'default'
                        }
                      >
                        {priority}
                      </Badge>
                      <span className="text-white font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rationale */}
              <div>
                <h4 className="text-white font-semibold mb-3">Plan Rationale</h4>
                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <p className="text-slate-300 whitespace-pre-line">{plan.rationale}</p>
                </div>
              </div>

              {/* Task List */}
              <div>
                <h4 className="text-white font-semibold mb-3">Execution Order ({plan.task_ids.length} tasks)</h4>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {plan.task_ids.slice(0, 20).map((taskId: string, index: number) => (
                    <div key={taskId} className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
                      <span className="text-slate-400 font-mono text-sm">#{index + 1}</span>
                      <span className="text-white font-mono text-sm">{taskId}</span>
                    </div>
                  ))}
                  {plan.task_ids.length > 20 && (
                    <p className="text-slate-400 text-sm text-center py-2">
                      ... and {plan.task_ids.length - 20} more tasks
                    </p>
                  )}
                </div>
              </div>

              {/* Action */}
              <div className="pt-4 border-t border-slate-700">
                <p className="text-slate-400 text-sm mb-4">
                  This plan has been optimized for your model characteristics and resource constraints.
                  To execute this plan, you would need to provide model credentials.
                </p>
                <Button variant="ghost" className="w-full">
                  Execute Plan (Requires Model Credentials)
                </Button>
              </div>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
