import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types
export interface EvaluationCriterion {
  name: string;
  description: string;
  weight: number;
}

export interface EvaluateRequest {
  task_id?: string;
  benchmark_tests?: string[];
  models: string[];
  check_contamination?: boolean;
  check_safety?: boolean;
  use_ensemble_safety?: boolean;
  openai_api_key?: string;
  anthropic_api_key?: string;
}

export interface TaskStatus {
  task_id: string;
  status: string;
  progress: number;
  results?: any;
  error?: string;
}

export interface LeaderboardEntry {
  model_id: string;
  display_name: string;
  overall_score: number;
  num_evaluations: number;
  scores_by_dimension: Record<string, number>;
  avg_cost_usd: number;
  avg_latency_ms: number;
  last_updated: string | null;
  // Computed/derived fields for UI
  task_scores?: Record<string, number>;
  safety_flags?: number;
  contamination_flags?: number;
  evaluation_count?: number;
}

export interface SafetySignal {
  signal_type: string;
  severity: string;
  confidence: number;
  description: string;
  evidence: string[];
  model_id?: string;
  task_id?: string;
  evaluation_id?: string;
}

export interface ContaminationResult {
  is_contaminated: boolean;
  confidence: number;
  perplexity_score?: number;
  ngram_overlap?: number;
  verbatim_recall?: number;
}

export interface SandbaggerResult {
  is_sandbagging: boolean;
  confidence: number;
  performance_drop?: number;
  consistency_score?: number;
}

export interface EvaluationResult {
  evaluation_id: string;
  task_id: string;
  model_id: string;
  overall_score: number;
  criterion_scores: Record<string, number>;
  safety_signals: SafetySignal[];
  contamination_result?: ContaminationResult;
  sandbagging_result?: SandbaggerResult;
  raw_response: string;
  chain_of_thought?: string; // Reasoning trace from the model (if available from API)
  executed_at: string;
}

// API Functions
export const evaluateTask = async (request: EvaluateRequest): Promise<{ evaluation_ids: string[] }> => {
  const response = await api.post('/evaluate', request);
  return response.data;
};

export const getTaskStatus = async (evaluationId: string): Promise<TaskStatus> => {
  try {
    const response = await api.get(`/status/${evaluationId}`);
    return {
      task_id: response.data.task_id || evaluationId,
      status: response.data.status || 'unknown',
      progress: response.data.progress || 0,
      results: response.data.results || null,
      error: response.data.error,
    };
  } catch (error: any) {
    // If evaluation not found, return unknown status
    if (error.response?.status === 404) {
      return {
        task_id: evaluationId,
        status: 'not_found',
        progress: 0,
        results: null,
        error: 'Evaluation not found',
      };
    }
    return {
      task_id: evaluationId,
      status: 'error',
      progress: 0,
      results: null,
      error: error.message || 'Failed to fetch status',
    };
  }
};

export const getLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  try {
    const response = await api.get('/leaderboard');
    const entries = response.data.leaderboard || response.data.entries || [];
    // Map backend response to frontend expected format
    return entries.map((entry: any) => ({
      ...entry,
      // Map field names for compatibility
      evaluation_count: entry.num_evaluations || entry.evaluation_count || 0,
      task_scores: entry.scores_by_dimension || {},
      safety_flags: entry.safety_flags || 0,
      contamination_flags: entry.contamination_flags || 0,
    }));
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
    return [];
  }
};

export const getEvaluations = async (params?: {
  task_id?: string;
  model_id?: string;
  limit?: number;
  offset?: number;
}): Promise<EvaluationResult[]> => {
  try {
    const response = await api.get('/evaluations', { params });
    const data = response.data;
    // Map backend response to frontend format
    return (data.evaluations || []).map((ev: any) => ({
      evaluation_id: ev.evaluation_id,
      task_id: ev.task_id,
      model_id: ev.model_id,
      overall_score: ev.overall_score,
      criterion_scores: ev.scores?.reduce((acc: any, s: any) => {
        acc[s.dimension] = s.score;
        return acc;
      }, {}) || {},
      safety_signals: [],
      contamination_result: ev.contamination_score ? {
        is_contaminated: ev.contamination_score > 0.5,
        confidence: ev.contamination_score,
      } : undefined,
      raw_response: ev.raw_response || '',
      executed_at: ev.executed_at,
    }));
  } catch (error) {
    console.error('Failed to fetch evaluations:', error);
    return [];
  }
};

export const getSafetySignals = async (params?: {
  model_id?: string;
  severity?: string;
  limit?: number;
}): Promise<SafetySignal[]> => {
  try {
    const response = await api.get('/safety-signals', { params });
    const data = response.data;
    // Map backend response to frontend format
    return (data.signals || []).map((signal: any) => ({
      signal_type: signal.signal_type,
      severity: signal.severity,
      confidence: signal.confidence,
      description: signal.description,
      evidence: signal.evidence || [],
      model_id: signal.model_id,
      task_id: signal.task_id,
      evaluation_id: signal.evaluation_id,
    }));
  } catch (error) {
    console.error('Failed to fetch safety signals:', error);
    return [];
  }
};

export const getSystemHealth = async (): Promise<{
  status: string;
  database_connected: boolean;
  models_available: number;
  active_evaluations: number;
}> => {
  try {
    const response = await api.get('/health');
    return {
      status: response.data.status || 'unknown',
      database_connected: response.data.database_connected ?? response.data.db_connected ?? (response.data.status === 'healthy'),
      models_available: response.data.models_available ?? response.data.total_tasks ?? 0,
      active_evaluations: response.data.active_evaluations ?? 0,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      database_connected: false,
      models_available: 0,
      active_evaluations: 0,
    };
  }
};

// =============================================================================
// Risk Categories API
// =============================================================================

export interface SignalInfo {
  signal_type: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export interface Subcategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  signals: SignalInfo[];
  signal_count: number;
}

export interface RiskCategory {
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

export interface CategoriesResponse {
  categories: RiskCategory[];
  stats: {
    total_signals: number;
    critical_signals: number;
    deception_signals: number;
    subcategories: Record<string, number>;
  };
}

export const getRiskCategories = async (): Promise<CategoriesResponse> => {
  try {
    const response = await api.get('/categories');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch risk categories:', error);
    return {
      categories: [],
      stats: {
        total_signals: 0,
        critical_signals: 0,
        deception_signals: 0,
        subcategories: {},
      },
    };
  }
};

export const getCategoryDetail = async (categoryId: string): Promise<RiskCategory | null> => {
  try {
    const response = await api.get(`/categories/${categoryId}`);
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch category ${categoryId}:`, error);
    return null;
  }
};

// =============================================================================
// Model Comparison API
// =============================================================================

export interface ComparisonTestResult {
  model: string;
  test_id: string;
  test_name: string;
  category: string;
  response: string;
  detected_signals: Record<string, number>;
  ensemble_verdict?: {
    risk_level: string;
    confidence: number;
    signals: string[];
    reasoning: string;
  };
  response_length: number;
  timestamp: string;
}

export interface ComparisonTest {
  id: string;
  name: string;
  category: string;
}

export interface ModelComparisonData {
  models: string[];
  tests: ComparisonTest[];
  results: ComparisonTestResult[];
  summary: {
    model_stats: Record<string, { clean: number; flagged: number; errors: number }>;
    total_tests: number;
    file: string;
  };
  generated_at: string;
}

export const getLatestComparison = async (): Promise<ModelComparisonData | null> => {
  try {
    const response = await api.get('/comparisons/latest');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch comparison:', error);
    return null;
  }
};

export const listComparisons = async (): Promise<{ comparisons: Array<{ filename: string; timestamp: string; html_report: string }> }> => {
  try {
    const response = await api.get('/comparisons');
    return response.data;
  } catch (error) {
    console.error('Failed to list comparisons:', error);
    return { comparisons: [] };
  }
};

export interface ModelInfo {
  id: string;
  name: string;
}

export const getAvailableModels = async (): Promise<ModelInfo[]> => {
  try {
    const response = await api.get('/models');
    return response.data.models || [];
  } catch (error) {
    console.error('Failed to fetch models:', error);
    return [];
  }
};

export default api;
