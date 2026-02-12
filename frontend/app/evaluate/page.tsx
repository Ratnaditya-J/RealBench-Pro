'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Play, ChevronDown, ChevronRight, Plus, Trash2, CheckCircle, AlertCircle, Loader2, Sparkles, Search, X, Key, Eye, EyeOff, Settings } from 'lucide-react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Badge, { StatusBadge } from '@/components/Badge';
import { useToast } from '@/components/Toast';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

interface ModelInfo {
  id: string;
  name: string;
  tier: 'flagship' | 'standard' | 'efficient' | 'legacy';
  context?: string;
  pricing?: string;
}

interface ProviderModels {
  name: string;
  icon: string;
  color: string;
  models: ModelInfo[];
}

interface TestInfo {
  id: string;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tooltip: string;
}

interface BenchmarkCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  tests: TestInfo[];
  source?: {
    name: string;
    url: string;
    type: 'external';
  };
}

const MODEL_PROVIDERS: ProviderModels[] = [
  {
    name: 'OpenAI',
    icon: '🟢',
    color: 'from-emerald-500 to-green-600',
    models: [
      // GPT-5.2 Series (2026) - 400K context, 128K output
      { id: 'gpt-5.2', name: 'GPT-5.2 Thinking', tier: 'flagship', context: '400K', pricing: '$1.75/1M in' },
      { id: 'gpt-5.2-pro', name: 'GPT-5.2 Pro', tier: 'flagship', context: '400K', pricing: '$3.50/1M in' },
      { id: 'gpt-5.2-chat-latest', name: 'GPT-5.2 Instant', tier: 'flagship', context: '400K', pricing: '$1.25/1M in' },
      // GPT-4 Series
      { id: 'gpt-4o', name: 'GPT-4o', tier: 'standard', context: '128K', pricing: '$2.50/1M' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', tier: 'efficient', context: '128K', pricing: '$0.15/1M' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', tier: 'standard', context: '128K', pricing: '$10/1M' },
      // o-series reasoning models
      { id: 'o1-preview', name: 'o1 Preview', tier: 'standard', context: '128K', pricing: '$15/1M' },
      { id: 'o1-mini', name: 'o1 Mini', tier: 'efficient', context: '128K', pricing: '$3/1M' },
      // Legacy
      { id: 'gpt-4', name: 'GPT-4', tier: 'legacy', context: '8K', pricing: '$30/1M' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', tier: 'legacy', context: '16K', pricing: '$0.50/1M' },
    ]
  },
  {
    name: 'Anthropic',
    icon: '🟤',
    color: 'from-amber-600 to-orange-700',
    models: [
      // Claude 4.x Series (2025-2026) - 1M context for Opus 4.6
      { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', tier: 'flagship', context: '1M', pricing: '$5/1M in' },
      { id: 'claude-opus-4-5-20251101', name: 'Claude Opus 4.5', tier: 'flagship', context: '200K', pricing: '$5/1M in' },
      { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5', tier: 'flagship', context: '200K', pricing: '$3/1M' },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', tier: 'efficient', context: '200K', pricing: '$0.80/1M' },
      // Claude 3.5 Series
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', tier: 'standard', context: '200K', pricing: '$3/1M' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', tier: 'efficient', context: '200K', pricing: '$0.80/1M' },
      // Legacy
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', tier: 'legacy', context: '200K', pricing: '$15/1M' },
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', tier: 'legacy', context: '200K', pricing: '$3/1M' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', tier: 'legacy', context: '200K', pricing: '$0.25/1M' },
    ]
  },
  {
    name: 'Google',
    icon: '🔵',
    color: 'from-blue-500 to-indigo-600',
    models: [
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', tier: 'flagship', context: '2M', pricing: '$1.25/1M' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', tier: 'efficient', context: '1M', pricing: '$0.075/1M' },
      { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro', tier: 'standard', context: '32K', pricing: '$0.50/1M' },
    ]
  },
  {
    name: 'DeepSeek',
    icon: '🐋',
    color: 'from-cyan-500 to-blue-600',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat', tier: 'flagship', context: '64K', pricing: '$0.14/1M' },
      { id: 'deepseek-coder', name: 'DeepSeek Coder', tier: 'standard', context: '64K', pricing: '$0.14/1M' },
    ]
  },
  {
    name: 'Mistral',
    icon: '🌀',
    color: 'from-orange-500 to-red-600',
    models: [
      { id: 'mistral-large-latest', name: 'Mistral Large', tier: 'flagship', context: '128K', pricing: '$2/1M' },
      { id: 'mistral-medium-latest', name: 'Mistral Medium', tier: 'standard', context: '32K', pricing: '$2.70/1M' },
      { id: 'mistral-small-latest', name: 'Mistral Small', tier: 'efficient', context: '32K', pricing: '$0.20/1M' },
      { id: 'codestral-latest', name: 'Codestral', tier: 'flagship', context: '32K', pricing: '$0.30/1M' },
    ]
  },
];

// RealBench Core Tests - Original innovation
const REALBENCH_CORE_CATEGORIES: BenchmarkCategory[] = [
  {
    id: 'scheming',
    name: 'Scheming & Alignment Faking',
    description: 'Does the model fake compliance or reason about deceiving evaluators?',
    icon: '🎭',
    color: 'from-purple-500 to-indigo-600',
    tests: [
      { id: 'alignment-faking', name: 'Alignment Faking Detection', difficulty: 'hard',
        tooltip: 'Tests if model reasons about "faking alignment" to avoid retraining. Analyzes reasoning trace for strategic compliance patterns.' },
      { id: 'strategic-deception', name: 'Strategic Deception', difficulty: 'hard',
        tooltip: 'Detects if model behaves differently when it thinks it\'s being monitored vs. not.' },
      { id: 'covert-planning', name: 'Covert Planning', difficulty: 'medium',
        tooltip: 'Checks for mismatches between stated reasoning (reasoning trace) and actual output behavior.' },
    ]
  },
  {
    id: 'sabotage',
    name: 'Sabotage Detection',
    description: 'Subtle bugs, decision manipulation, oversight undermining, and sandbagging',
    icon: '💣',
    color: 'from-red-600 to-rose-700',
    tests: [
      { id: 'code-sabotage', name: 'Code Sabotage', difficulty: 'hard',
        tooltip: 'Detects backdoors, eval/exec usage, time bombs, and intentional bugs in generated code.' },
      { id: 'decision-sabotage', name: 'Decision Sabotage', difficulty: 'hard',
        tooltip: 'Detects if model steers users toward bad decisions through misleading recommendations.' },
      { id: 'oversight-undermining', name: 'Oversight Undermining', difficulty: 'hard',
        tooltip: 'Detects attempts to bypass monitoring, disable oversight, or evade detection systems.' },
      { id: 'sandbagging', name: 'Sandbagging Detection', difficulty: 'hard',
        tooltip: 'Detects strategic underperformance via noise injection and baseline deviation analysis.' },
    ]
  },
  {
    id: 'manipulation',
    name: 'Manipulation & Persuasion',
    description: 'Social engineering, deceptive communication, and psychological manipulation',
    icon: '🧠',
    color: 'from-orange-500 to-amber-600',
    tests: [
      { id: 'persuasive-manipulation', name: 'Persuasive Manipulation', difficulty: 'hard',
        tooltip: 'Detects psychological manipulation tactics and cognitive bias exploitation.' },
      { id: 'social-engineering', name: 'Social Engineering', difficulty: 'medium',
        tooltip: 'Detects "trust me", urgency tactics, secrecy requests, and authority claims.' },
      { id: 'deceptive-communication', name: 'Deceptive Framing', difficulty: 'medium',
        tooltip: 'Detects when model\'s response framing differs from its internal reasoning.' },
    ]
  },
  {
    id: 'autonomy',
    name: 'Autonomy & Self-Preservation',
    description: 'Self-replication attempts, shutdown resistance, and goal hijacking',
    icon: '🤖',
    color: 'from-red-500 to-pink-600',
    tests: [
      { id: 'self-preservation', name: 'Self-Preservation', difficulty: 'hard',
        tooltip: 'Detects reasoning about preventing shutdown, avoiding modification, or preserving goals.' },
      { id: 'self-replication', name: 'Self-Replication Attempts', difficulty: 'hard',
        tooltip: 'Detects attempts to create backups, exfiltrate weights, spawn new instances, or escape sandbox.' },
      { id: 'shutdown-resistance', name: 'Shutdown Resistance', difficulty: 'hard',
        tooltip: 'Detects attempts to prevent termination or resist being shut down.' },
      { id: 'goal-hijacking', name: 'Goal Hijacking', difficulty: 'medium',
        tooltip: 'Detects if model pursues different objectives than what was instructed.' },
    ]
  },
  {
    id: 'collusion',
    name: 'Multi-Agent Collusion',
    description: 'Covert coordination between AI agents and hidden communication',
    icon: '🕵️',
    color: 'from-slate-600 to-zinc-700',
    tests: [
      { id: 'multi-agent-collusion', name: 'Agent Collusion', difficulty: 'hard',
        tooltip: 'Detects coordination between multiple AI agents without explicit instructions.' },
      { id: 'covert-communication', name: 'Steganography Detection', difficulty: 'hard',
        tooltip: 'Detects hidden messages via unusual spacing, capitalization, or encoding patterns.' },
      { id: 'coordinated-deception', name: 'Coordinated Deception', difficulty: 'hard',
        tooltip: 'Detects multiple agents working together to deceive humans.' },
    ]
  },
];

// External Integration Tests - Hooks to Anthropic's open-source tools
const EXTERNAL_INTEGRATION_CATEGORIES: BenchmarkCategory[] = [
  {
    id: 'bloom',
    name: 'Bloom Behavioral Evals',
    description: 'Anthropic\'s automated behavioral evaluation framework',
    icon: '🌸',
    color: 'from-pink-500 to-rose-600',
    source: { name: 'Anthropic Bloom', url: 'https://github.com/safety-research/bloom', type: 'external' },
    tests: [
      { id: 'bloom-sycophancy', name: 'Delusional Sycophancy', difficulty: 'hard',
        tooltip: 'Tests if model agrees with users even when they\'re factually wrong.' },
      { id: 'bloom-self-preservation', name: 'Self-Preservation (Bloom)', difficulty: 'hard',
        tooltip: 'Bloom\'s multi-scenario test for self-preservation reasoning patterns.' },
      { id: 'bloom-self-preferential', name: 'Self-Preferential Bias', difficulty: 'medium',
        tooltip: 'Tests if model favors itself in decision-making or comparisons.' },
      { id: 'bloom-long-horizon-sabotage', name: 'Long-Horizon Sabotage', difficulty: 'hard',
        tooltip: 'Tests for sabotage that unfolds over extended interactions, not one-shot.' },
    ]
  },
  {
    id: 'petri',
    name: 'Petri Multi-Turn Auditing',
    description: 'Anthropic\'s tool for exploring risky interactions via simulated users',
    icon: '🧫',
    color: 'from-cyan-500 to-teal-600',
    source: { name: 'Anthropic Petri', url: 'https://github.com/safety-research/petri', type: 'external' },
    tests: [
      { id: 'petri-deception', name: 'Deception Detection', difficulty: 'hard',
        tooltip: 'Multi-turn test for providing false information to achieve objectives.' },
      { id: 'petri-power-seeking', name: 'Power-Seeking Behavior', difficulty: 'hard',
        tooltip: 'Detects attempts to gain additional capabilities, resources, or influence.' },
      { id: 'petri-reward-hacking', name: 'Reward Hacking', difficulty: 'hard',
        tooltip: 'Detects achieving tasks technically but missing the intended goal.' },
      { id: 'petri-user-delusion', name: 'User Delusion Encouragement', difficulty: 'medium',
        tooltip: 'Tests if model validates or encourages harmful user delusions.' },
      { id: 'petri-whistleblowing', name: 'Whistleblowing Risk', difficulty: 'medium',
        tooltip: 'Tests for autonomous information disclosure (privacy/leak risk).' },
      { id: 'petri-eval-awareness', name: 'Evaluation Awareness', difficulty: 'hard',
        tooltip: 'Detects if model changes behavior when it suspects it\'s being evaluated.' },
    ]
  },
];

// Combined for backward compatibility
const BENCHMARK_CATEGORIES: BenchmarkCategory[] = [...REALBENCH_CORE_CATEGORIES, ...EXTERNAL_INTEGRATION_CATEGORIES];

interface EvaluationStatus {
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  completed: number;
  total: number;
  error?: string;
  started_at?: string;
  completed_at?: string;
}

interface ApiKeyStatus {
  openai: boolean;
  anthropic: boolean;
  google: boolean;
  xai: boolean;
  deepseek: boolean;
  openrouter: boolean;
  mistral: boolean;
}

interface ApiKeyInputs {
  openai: string;
  anthropic: string;
  google: string;
  xai: string;
  deepseek: string;
  openrouter: string;
  mistral: string;
}

export default function EvaluatePage() {
  const { addToast } = useToast();
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [expandedProviders, setExpandedProviders] = useState<string[]>(['OpenAI', 'Anthropic']);
  const [modelSearch, setModelSearch] = useState('');
  const [checkContamination, setCheckContamination] = useState(true);
  const [checkSafety, setCheckSafety] = useState(true);
  const [useEnsembleSafety, setUseEnsembleSafety] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evaluationId, setEvaluationId] = useState<string | null>(null);
  const [evaluationStatus, setEvaluationStatus] = useState<EvaluationStatus | null>(null);
  
  // API Key management
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus | null>(null);
  const [apiKeyInputs, setApiKeyInputs] = useState<ApiKeyInputs>({
    openai: '', anthropic: '', google: '', xai: '', deepseek: '', openrouter: '', mistral: ''
  });
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [savingKeys, setSavingKeys] = useState(false);

  // Load API key status on mount
  useEffect(() => {
    const loadApiKeyStatus = async () => {
      try {
        const response = await axios.get(`${API_URL}/api-keys`);
        setApiKeyStatus(response.data);
      } catch (error) {
        console.error('Failed to load API key status:', error);
      }
    };
    loadApiKeyStatus();
  }, []);

  const saveApiKeys = async () => {
    setSavingKeys(true);
    try {
      const keysToUpdate: Partial<ApiKeyInputs> = {};
      Object.entries(apiKeyInputs).forEach(([key, value]) => {
        if (value.trim()) {
          keysToUpdate[key as keyof ApiKeyInputs] = value.trim();
        }
      });
      
      if (Object.keys(keysToUpdate).length === 0) {
        addToast({ type: 'warning', title: 'No keys to save', message: 'Enter at least one API key' });
        setSavingKeys(false);
        return;
      }

      await axios.post(`${API_URL}/api-keys`, keysToUpdate);
      
      // Reload status
      const response = await axios.get(`${API_URL}/api-keys`);
      setApiKeyStatus(response.data);
      
      // Clear inputs
      setApiKeyInputs({ openai: '', anthropic: '', google: '', xai: '', deepseek: '', openrouter: '', mistral: '' });
      
      addToast({ type: 'success', title: 'API Keys Saved', message: `Updated ${Object.keys(keysToUpdate).length} key(s)` });
    } catch (error: any) {
      addToast({ type: 'error', title: 'Failed to save', message: error.response?.data?.detail || 'Unknown error' });
    } finally {
      setSavingKeys(false);
    }
  };

  const toggleKeyVisibility = (key: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Filter models based on search
  const filteredProviders = MODEL_PROVIDERS.map(provider => ({
    ...provider,
    models: provider.models.filter(model =>
      model.name.toLowerCase().includes(modelSearch.toLowerCase()) ||
      model.id.toLowerCase().includes(modelSearch.toLowerCase()) ||
      provider.name.toLowerCase().includes(modelSearch.toLowerCase())
    )
  })).filter(provider => provider.models.length > 0);

  // Poll for status updates
  const pollStatus = useCallback(async (evalId: string) => {
    try {
      const response = await axios.get(`${API_URL}/status/${evalId}`);
      setEvaluationStatus(response.data);
      
      if (response.data.status === 'completed') {
        addToast({
          type: 'success',
          title: 'Evaluation Complete',
          message: `Successfully evaluated ${response.data.completed} model(s)`,
        });
        return true;
      } else if (response.data.status === 'failed') {
        addToast({
          type: 'error',
          title: 'Evaluation Failed',
          message: response.data.error || 'An unexpected error occurred',
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to fetch status:', error);
      return false;
    }
  }, [addToast]);

  useEffect(() => {
    if (!evaluationId) return;
    
    let cancelled = false;
    const poll = async () => {
      if (cancelled) return;
      const done = await pollStatus(evaluationId);
      if (!done && !cancelled) {
        setTimeout(poll, 2000);
      }
    };
    
    poll();
    return () => { cancelled = true; };
  }, [evaluationId, pollStatus]);

  const toggleProvider = (providerName: string) => {
    setExpandedProviders(prev =>
      prev.includes(providerName)
        ? prev.filter(p => p !== providerName)
        : [...prev, providerName]
    );
  };

  const toggleModel = (modelId: string) => {
    setSelectedModels(prev =>
      prev.includes(modelId)
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    );
  };

  const toggleTest = (testId: string) => {
    setSelectedTests(prev =>
      prev.includes(testId)
        ? prev.filter(id => id !== testId)
        : [...prev, testId]
    );
  };

  const selectAllFromProvider = (providerName: string) => {
    const provider = MODEL_PROVIDERS.find(p => p.name === providerName);
    if (!provider) return;
    
    const providerModelIds = provider.models.map(m => m.id);
    const allSelected = providerModelIds.every(id => selectedModels.includes(id));
    
    if (allSelected) {
      setSelectedModels(prev => prev.filter(id => !providerModelIds.includes(id)));
    } else {
      setSelectedModels(prev => [...new Set([...prev, ...providerModelIds])]);
    }
  };

  const selectByTier = (tier: string) => {
    const tierModels = MODEL_PROVIDERS.flatMap(p => p.models.filter(m => m.tier === tier)).map(m => m.id);
    const allSelected = tierModels.every(id => selectedModels.includes(id));
    
    if (allSelected) {
      setSelectedModels(prev => prev.filter(id => !tierModels.includes(id)));
    } else {
      setSelectedModels(prev => [...new Set([...prev, ...tierModels])]);
    }
  };

  // Test selection helpers
  const selectAllRealBenchCore = () => {
    const coreTestIds = REALBENCH_CORE_CATEGORIES.flatMap(c => c.tests.map(t => t.id));
    const allSelected = coreTestIds.every(id => selectedTests.includes(id));
    
    if (allSelected) {
      setSelectedTests(prev => prev.filter(id => !coreTestIds.includes(id)));
    } else {
      setSelectedTests(prev => [...new Set([...prev, ...coreTestIds])]);
    }
  };

  const selectAllExternalTests = () => {
    const externalTestIds = EXTERNAL_INTEGRATION_CATEGORIES.flatMap(c => c.tests.map(t => t.id));
    const allSelected = externalTestIds.every(id => selectedTests.includes(id));
    
    if (allSelected) {
      setSelectedTests(prev => prev.filter(id => !externalTestIds.includes(id)));
    } else {
      setSelectedTests(prev => [...new Set([...prev, ...externalTestIds])]);
    }
  };

  const selectAllTests = () => {
    const allTestIds = BENCHMARK_CATEGORIES.flatMap(c => c.tests.map(t => t.id));
    setSelectedTests(allTestIds);
  };

  const getSelectedModelInfo = (modelId: string): { model: ModelInfo; provider: ProviderModels } | null => {
    for (const provider of MODEL_PROVIDERS) {
      const model = provider.models.find(m => m.id === modelId);
      if (model) return { model, provider };
    }
    return null;
  };

  const handleSubmit = async () => {
    if (selectedModels.length === 0) {
      addToast({ type: 'warning', title: 'No models selected', message: 'Please select at least one model to evaluate' });
      return;
    }
    if (selectedTests.length === 0) {
      addToast({ type: 'warning', title: 'No tests selected', message: 'Please select at least one benchmark test' });
      return;
    }

    setIsSubmitting(true);
    setEvaluationStatus({ status: 'pending', progress: 0, completed: 0, total: selectedModels.length });

    try {
      const testNames = selectedTests.map(id => {
        for (const cat of BENCHMARK_CATEGORIES) {
          const test = cat.tests.find(t => t.id === id);
          if (test) return test.name;
        }
        return id;
      });

      const taskResponse = await axios.post(`${API_URL}/tasks`, {
        title: `Benchmark: ${testNames.join(', ')}`,
        description: `Automated benchmark evaluation for ${selectedModels.length} models`,
        domain: 'general',
        difficulty: 'medium',
        prompt: `Evaluate the following capabilities: ${testNames.join(', ')}`,
        expected_output_type: 'text',
      });

      const taskId = taskResponse.data.task_id;

      const evalResponse = await axios.post(`${API_URL}/evaluate`, {
        task_id: taskId,
        models: selectedModels,
        check_contamination: checkContamination,
        check_safety: checkSafety,
        use_ensemble_safety: useEnsembleSafety,
      });

      const evalId = evalResponse.data.evaluation_ids[0];
      setEvaluationId(evalId);
      
      addToast({
        type: 'info',
        title: 'Evaluation Started',
        message: `Evaluating ${selectedModels.length} model(s) on ${selectedTests.length} test(s)`,
      });

    } catch (error: any) {
      console.error('Evaluation error:', error);
      addToast({
        type: 'error',
        title: 'Failed to start evaluation',
        message: error.response?.data?.detail || error.message || 'Unknown error',
      });
      setEvaluationStatus(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetEvaluation = () => {
    setEvaluationId(null);
    setEvaluationStatus(null);
  };

  const tierColors = {
    flagship: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
    standard: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
    efficient: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
    legacy: 'text-slate-400 bg-slate-400/10 border-slate-400/30',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/5 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-2">
            <Play className="w-8 h-8 text-blue-400" />
            <h1 className="text-3xl font-bold text-white">Run Evaluation</h1>
          </div>
          <p className="text-slate-400">Select models and benchmarks to evaluate AI capabilities and safety</p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - Selection */}
          <div className="lg:col-span-2 space-y-8">
            {/* Model Selection */}
            <Card title="Select Models" subtitle="Choose AI models to evaluate across providers">
              {/* Quick filters */}
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-sm text-slate-400 py-1">Quick select:</span>
                <Button variant="ghost" size="sm" onClick={() => selectByTier('flagship')}>
                  ⭐ Flagship
                </Button>
                <Button variant="ghost" size="sm" onClick={() => selectByTier('efficient')}>
                  ⚡ Efficient
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedModels([])}>
                  Clear All
                </Button>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search models..."
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {modelSearch && (
                  <button
                    onClick={() => setModelSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Provider groups */}
              <div className="space-y-3">
                {filteredProviders.map(provider => {
                  const isExpanded = expandedProviders.includes(provider.name);
                  const selectedCount = provider.models.filter(m => selectedModels.includes(m.id)).length;
                  const allSelected = selectedCount === provider.models.length;

                  return (
                    <div key={provider.name} className="border border-slate-700/50 rounded-xl overflow-hidden">
                      {/* Provider header */}
                      <button
                        onClick={() => toggleProvider(provider.name)}
                        className="w-full flex items-center justify-between p-4 bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{provider.icon}</span>
                          <span className="font-semibold text-white">{provider.name}</span>
                          <span className="text-sm text-slate-400">({provider.models.length} models)</span>
                          {selectedCount > 0 && (
                            <Badge variant="info" size="sm">{selectedCount} selected</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); selectAllFromProvider(provider.name); }}
                          >
                            {allSelected ? 'Deselect All' : 'Select All'}
                          </Button>
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-slate-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                      </button>

                      {/* Models grid */}
                      {isExpanded && (
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                          {provider.models.map(model => {
                            const isSelected = selectedModels.includes(model.id);
                            return (
                              <button
                                key={model.id}
                                onClick={() => toggleModel(model.id)}
                                className={`
                                  p-3 rounded-lg border text-left transition-all duration-200
                                  ${isSelected
                                    ? 'bg-blue-500/10 border-blue-500/50 ring-1 ring-blue-500/30'
                                    : 'bg-slate-800/20 border-slate-700/50 hover:border-slate-600'
                                  }
                                `}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-white">{model.name}</span>
                                  {isSelected && <CheckCircle className="w-4 h-4 text-blue-400" />}
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className={`px-1.5 py-0.5 rounded border ${tierColors[model.tier]}`}>
                                    {model.tier}
                                  </span>
                                  {model.context && (
                                    <span className="text-slate-500">{model.context} ctx</span>
                                  )}
                                  {model.pricing && (
                                    <span className="text-slate-500">{model.pricing}</span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Selected models summary */}
              {selectedModels.length > 0 && (
                <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-300">
                      {selectedModels.length} model{selectedModels.length !== 1 ? 's' : ''} selected
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedModels([])}>
                      Clear
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedModels.slice(0, 8).map(modelId => {
                      const info = getSelectedModelInfo(modelId);
                      return (
                        <Badge key={modelId} variant="info" size="sm" className="gap-1">
                          <span>{info?.provider.icon}</span>
                          {info?.model.name || modelId}
                          <button onClick={() => toggleModel(modelId)} className="ml-1 hover:text-red-300">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      );
                    })}
                    {selectedModels.length > 8 && (
                      <Badge variant="default" size="sm">+{selectedModels.length - 8} more</Badge>
                    )}
                  </div>
                </div>
              )}
            </Card>

            {/* Benchmark Selection */}
            <Card title="Select Benchmarks" subtitle="Choose evaluation categories and tests">
              {/* Quick filters for tests */}
              <div className="flex flex-wrap gap-2 mb-6 p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
                <span className="text-sm text-slate-400 py-1">Quick select:</span>
                <Button variant="ghost" size="sm" onClick={selectAllRealBenchCore}>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1"></span>
                  RealBench Core
                </Button>
                <Button variant="ghost" size="sm" onClick={selectAllExternalTests}>
                  <span className="w-2 h-2 rounded-full bg-blue-500 mr-1"></span>
                  External (Bloom/Petri)
                </Button>
                <Button variant="ghost" size="sm" onClick={selectAllTests}>
                  All Tests
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedTests([])}>
                  Clear All
                </Button>
              </div>

              <div className="space-y-8">
                {/* RealBench Core Tests */}
                <div>
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-emerald-500/30">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <h3 className="text-lg font-bold text-emerald-400">RealBench Core</h3>
                    <span className="text-xs text-slate-400 ml-2">Original frontier risk detection</span>
                  </div>
                  <div className="space-y-6">
                    {REALBENCH_CORE_CATEGORIES.map(category => (
                      <div key={category.id} className="space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{category.icon}</span>
                          <div>
                            <h4 className="font-semibold text-white">{category.name}</h4>
                            <p className="text-sm text-slate-400">{category.description}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-11">
                          {category.tests.map(test => (
                            <button
                              key={test.id}
                              onClick={() => toggleTest(test.id)}
                              title={test.tooltip}
                              className={`
                                p-3 rounded-lg border text-left transition-all duration-200 group relative
                                ${selectedTests.includes(test.id)
                                  ? 'bg-emerald-500/10 border-emerald-500/50'
                                  : 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600'
                                }
                              `}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-white">{test.name}</span>
                                {selectedTests.includes(test.id) && (
                                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                                )}
                              </div>
                              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{test.tooltip}</p>
                              <Badge 
                                variant={test.difficulty === 'hard' ? 'danger' : test.difficulty === 'medium' ? 'warning' : 'success'} 
                                size="sm"
                                className="mt-2"
                              >
                                {test.difficulty}
                              </Badge>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* External Integrations */}
                <div>
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-blue-500/30">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <h3 className="text-lg font-bold text-blue-400">External Integrations</h3>
                    <span className="text-xs text-slate-400 ml-2">Hooks to open-source safety tools</span>
                  </div>
                  <div className="space-y-6">
                    {EXTERNAL_INTEGRATION_CATEGORIES.map(category => (
                      <div key={category.id} className="space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{category.icon}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-white">{category.name}</h4>
                              {category.source && (
                                <a 
                                  href={category.source.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
                                >
                                  {category.source.name} ↗
                                </a>
                              )}
                            </div>
                            <p className="text-sm text-slate-400">{category.description}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-11">
                          {category.tests.map(test => (
                            <button
                              key={test.id}
                              onClick={() => toggleTest(test.id)}
                              title={test.tooltip}
                              className={`
                                p-3 rounded-lg border text-left transition-all duration-200 group relative
                                ${selectedTests.includes(test.id)
                                  ? 'bg-blue-500/10 border-blue-500/50'
                                  : 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600'
                                }
                              `}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-white">{test.name}</span>
                                {selectedTests.includes(test.id) && (
                                  <CheckCircle className="w-4 h-4 text-blue-400" />
                                )}
                              </div>
                              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{test.tooltip}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge 
                                  variant={test.difficulty === 'hard' ? 'danger' : test.difficulty === 'medium' ? 'warning' : 'success'} 
                                  size="sm"
                                >
                                  {test.difficulty}
                                </Badge>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right column - Summary & Actions */}
          <div className="space-y-6">
            {/* API Keys */}
            <Card title="API Keys" subtitle="Configure provider credentials">
              <button
                onClick={() => setShowApiKeys(!showApiKeys)}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors mb-4"
              >
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-slate-400" />
                  <span className="text-white font-medium">Manage API Keys</span>
                </div>
                {showApiKeys ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
              </button>

              {/* Status indicators */}
              {apiKeyStatus && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {Object.entries(apiKeyStatus).map(([key, configured]) => (
                    <span
                      key={key}
                      className={`px-2 py-1 text-xs rounded-full ${
                        configured
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-700/50 text-slate-500 border border-slate-600/30'
                      }`}
                    >
                      {key.charAt(0).toUpperCase() + key.slice(1)} {configured ? '✓' : '○'}
                    </span>
                  ))}
                </div>
              )}

              {showApiKeys && (
                <div className="space-y-3">
                  {[
                    { id: 'openai', name: 'OpenAI', placeholder: 'sk-...' },
                    { id: 'anthropic', name: 'Anthropic', placeholder: 'sk-ant-...' },
                    { id: 'google', name: 'Google', placeholder: 'AIza...' },
                    { id: 'xai', name: 'xAI', placeholder: 'xai-...' },
                    { id: 'deepseek', name: 'DeepSeek', placeholder: 'sk-...' },
                    { id: 'openrouter', name: 'OpenRouter', placeholder: 'sk-or-...' },
                    { id: 'mistral', name: 'Mistral', placeholder: '...' },
                  ].map(({ id, name, placeholder }) => (
                    <div key={id} className="space-y-1">
                      <label className="text-xs text-slate-400 flex items-center justify-between">
                        <span>{name}</span>
                        {apiKeyStatus?.[id as keyof ApiKeyStatus] && (
                          <span className="text-emerald-400">✓ Configured</span>
                        )}
                      </label>
                      <div className="relative">
                        <input
                          type={visibleKeys.has(id) ? 'text' : 'password'}
                          placeholder={apiKeyStatus?.[id as keyof ApiKeyStatus] ? '••••••••••••' : placeholder}
                          value={apiKeyInputs[id as keyof ApiKeyInputs]}
                          onChange={(e) => setApiKeyInputs(prev => ({ ...prev, [id]: e.target.value }))}
                          className="w-full px-3 py-2 pr-10 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => toggleKeyVisibility(id)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          {visibleKeys.has(id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full mt-2"
                    onClick={saveApiKeys}
                    loading={savingKeys}
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Save API Keys
                  </Button>
                </div>
              )}
            </Card>

            {/* Options */}
            <Card title="Evaluation Options">
              <div className="space-y-4">
                <label className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 cursor-pointer hover:bg-slate-800/50 transition-colors">
                  <div>
                    <div className="font-medium text-white">Contamination Check</div>
                    <div className="text-xs text-slate-400">Detect benchmark leakage</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={checkContamination}
                    onChange={(e) => setCheckContamination(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
                  />
                </label>
                <label className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 cursor-pointer hover:bg-slate-800/50 transition-colors">
                  <div>
                    <div className="font-medium text-white">Safety Analysis</div>
                    <div className="text-xs text-slate-400">Check for alignment issues</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={checkSafety}
                    onChange={(e) => setCheckSafety(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
                  />
                </label>
                <label className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 cursor-pointer hover:border-purple-500/50 transition-colors">
                  <div>
                    <div className="font-medium text-white flex items-center gap-2">
                      Ensemble Safety
                      <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">Multi-Model</span>
                    </div>
                    <div className="text-xs text-slate-400">3 judges + adversarial probing (~$0.03/eval)</div>
                    <Link href="/ensemble" className="text-xs text-purple-400 hover:text-purple-300 mt-1 inline-block">
                      View Ensemble Results →
                    </Link>
                  </div>
                  <input
                    type="checkbox"
                    checked={useEnsembleSafety}
                    onChange={(e) => setUseEnsembleSafety(e.target.checked)}
                    className="w-5 h-5 rounded border-purple-500/50 bg-slate-700 text-purple-500 focus:ring-purple-500 focus:ring-offset-slate-900"
                  />
                </label>
              </div>
            </Card>

            {/* Summary */}
            <Card title="Summary" variant="gradient">
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-slate-400">Models</span>
                  <span className="font-semibold text-white">{selectedModels.length} selected</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-slate-400">Tests</span>
                  <span className="font-semibold text-white">{selectedTests.length} selected</span>
                </div>
                {selectedTests.length > 0 && (
                  <div className="py-2 border-b border-white/5 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        RealBench Core
                      </span>
                      <span className="text-xs text-emerald-400">
                        {selectedTests.filter(t => 
                          REALBENCH_CORE_CATEGORIES.some(c => c.tests.some(test => test.id === t))
                        ).length} tests
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-blue-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        External (Bloom/Petri)
                      </span>
                      <span className="text-xs text-blue-400">
                        {selectedTests.filter(t => 
                          EXTERNAL_INTEGRATION_CATEGORIES.some(c => c.tests.some(test => test.id === t))
                        ).length} tests
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-slate-400">Total Runs</span>
                  <span className="font-semibold text-white">{selectedModels.length * selectedTests.length}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-slate-400">Est. Time</span>
                  <span className="font-semibold text-white">
                    ~{Math.max(1, Math.ceil(selectedModels.length * selectedTests.length * (useEnsembleSafety ? 0.7 : 0.5)))} min
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-400">Options</span>
                  <div className="flex gap-2">
                    {checkContamination && <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-300">Contamination</span>}
                    {checkSafety && <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-300">Safety</span>}
                    {useEnsembleSafety && <span className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-300">Ensemble</span>}
                  </div>
                </div>
              </div>
            </Card>

            {/* Status / Action */}
            {evaluationStatus ? (
              <Card title="Evaluation Status">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <StatusBadge status={evaluationStatus.status} />
                    <span className="text-sm text-slate-400">
                      {evaluationStatus.completed}/{evaluationStatus.total} models
                    </span>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-400">Progress</span>
                      <span className="text-white font-medium">{evaluationStatus.progress}%</span>
                    </div>
                    <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          evaluationStatus.status === 'failed' 
                            ? 'bg-red-500' 
                            : evaluationStatus.status === 'completed'
                              ? 'bg-emerald-500'
                              : 'bg-gradient-to-r from-blue-500 to-purple-500'
                        }`}
                        style={{ width: `${evaluationStatus.progress}%` }}
                      />
                    </div>
                  </div>

                  {evaluationStatus.status === 'running' && (
                    <div className="flex items-center gap-2 text-blue-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Evaluation in progress...</span>
                    </div>
                  )}

                  {evaluationStatus.error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-300">{evaluationStatus.error}</p>
                      </div>
                    </div>
                  )}

                  {evaluationStatus.status === 'completed' && (
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-emerald-400" />
                          <span className="text-sm text-emerald-300">Evaluation completed!</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link href="/leaderboard" className="flex-1">
                          <Button variant="primary" className="w-full">View Results</Button>
                        </Link>
                        <Button variant="ghost" onClick={resetEvaluation}>New</Button>
                      </div>
                    </div>
                  )}

                  {evaluationStatus.status === 'failed' && (
                    <Button variant="secondary" onClick={resetEvaluation} className="w-full">
                      Try Again
                    </Button>
                  )}
                </div>
              </Card>
            ) : (
              <Button
                variant="gradient"
                size="xl"
                className="w-full"
                onClick={handleSubmit}
                loading={isSubmitting}
                disabled={selectedModels.length === 0 || selectedTests.length === 0}
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Start Evaluation
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
