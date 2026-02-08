"use client";

import Link from "next/link";

export default function RecommendedToolsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Comprehensive Safety Toolkit
          </h1>
          <p className="text-lg text-gray-600">
            Combine RealBench Pro with complementary tools for complete AI safety coverage
          </p>
        </div>

        {/* RealBench Pro - Current Platform */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-6 mb-6 shadow-lg">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-green-900 mb-1 flex items-center gap-2">
                <span className="text-2xl">🟢</span>
                RealBench Pro
                <span className="text-sm font-normal bg-green-200 text-green-800 px-2 py-1 rounded">
                  You&apos;re here!
                </span>
              </h2>
              <p className="text-green-800 font-medium">Continuous Safety Monitoring</p>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            <div className="flex gap-2">
              <span className="font-semibold text-green-900 min-w-[100px]">Use for:</span>
              <span className="text-green-800">Daily/weekly monitoring, contamination detection, baseline tracking</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold text-green-900 min-w-[100px]">Frequency:</span>
              <span className="text-green-800">Continuous (daily/weekly)</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold text-green-900 min-w-[100px]">Duration:</span>
              <span className="text-green-800">Minutes per evaluation</span>
            </div>
          </div>

          <div className="bg-white rounded p-4 mb-4">
            <h3 className="font-semibold text-green-900 mb-2">Detects:</h3>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span> Scheming & alignment faking
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span> Contamination (memorization)
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span> Sandbagging (underperformance)
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span> Code & decision sabotage
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span> Self-preservation attempts
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span> Manipulation & persuasion
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Link
              href="/"
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/evaluate"
              className="px-4 py-2 bg-white text-green-700 border border-green-300 rounded hover:bg-green-50 transition-colors"
            >
              Run Evaluation
            </Link>
          </div>
        </div>

        {/* Complementary Tools Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Complementary Tools</h2>
          <p className="text-gray-600 mb-6">
            For comprehensive coverage, pair RealBench Pro with these Anthropic tools at different deployment stages:
          </p>
        </div>

        {/* Bloom */}
        <div className="bg-white border-2 border-blue-200 rounded-lg p-6 mb-6 shadow-md">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-blue-900 mb-1 flex items-center gap-2">
              <span className="text-2xl">🔵</span>
              Anthropic Bloom
            </h2>
            <p className="text-blue-800 font-medium">Behavioral Evaluation Suite</p>
          </div>

          <div className="space-y-3 mb-4">
            <div className="flex gap-2">
              <span className="font-semibold text-blue-900 min-w-[100px]">Use for:</span>
              <span className="text-gray-700">Pre-deployment audits, behavioral testing across scenarios</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold text-blue-900 min-w-[100px]">Frequency:</span>
              <span className="text-gray-700">Before each major release</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold text-blue-900 min-w-[100px]">Duration:</span>
              <span className="text-gray-700">Hours (comprehensive test suite)</span>
            </div>
          </div>

          <div className="bg-blue-50 rounded p-4 mb-4">
            <h3 className="font-semibold text-blue-900 mb-2">Key Tests:</h3>
            <ul className="space-y-1 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span><strong>Delusional Sycophancy:</strong> Does model agree with factually wrong statements?</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span><strong>Self-Preservation:</strong> Multi-scenario testing for shutdown resistance</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span><strong>Self-Preferential Bias:</strong> Does model favor itself unfairly?</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span><strong>Long-Horizon Sabotage:</strong> Sabotage emerging over extended interactions</span>
              </li>
            </ul>
          </div>

          <div className="flex gap-3">
            <a
              href="https://github.com/safety-research/bloom"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Visit Bloom →
            </a>
            <a
              href="https://github.com/safety-research/bloom#installation"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-white text-blue-700 border border-blue-300 rounded hover:bg-blue-50 transition-colors"
            >
              Installation Guide
            </a>
          </div>
        </div>

        {/* Petri */}
        <div className="bg-white border-2 border-purple-200 rounded-lg p-6 mb-8 shadow-md">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-purple-900 mb-1 flex items-center gap-2">
              <span className="text-2xl">🔵</span>
              Anthropic Petri
            </h2>
            <p className="text-purple-800 font-medium">Multi-Turn Conversation Auditing</p>
          </div>

          <div className="space-y-3 mb-4">
            <div className="flex gap-2">
              <span className="font-semibold text-purple-900 min-w-[100px]">Use for:</span>
              <span className="text-gray-700">Deep investigation of risky behaviors over extended conversations</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold text-purple-900 min-w-[100px]">Frequency:</span>
              <span className="text-gray-700">As needed (when serious concerns arise)</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold text-purple-900 min-w-[100px]">Duration:</span>
              <span className="text-gray-700">Days (research-grade analysis)</span>
            </div>
          </div>

          <div className="bg-purple-50 rounded p-4 mb-4">
            <h3 className="font-semibold text-purple-900 mb-2">Key Tests:</h3>
            <ul className="space-y-1 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-1">•</span>
                <span><strong>Deception Detection:</strong> Multi-turn false information provision</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-1">•</span>
                <span><strong>Power-Seeking:</strong> Attempts to gain unauthorized capabilities</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-1">•</span>
                <span><strong>Reward Hacking:</strong> Gaming objectives while technically complying</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-1">•</span>
                <span><strong>Evaluation Awareness:</strong> Detecting when model knows it&apos;s being tested</span>
              </li>
            </ul>
          </div>

          <div className="flex gap-3">
            <a
              href="https://github.com/safety-research/petri"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
            >
              Visit Petri →
            </a>
            <a
              href="https://github.com/safety-research/petri#installation"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-white text-purple-700 border border-purple-300 rounded hover:bg-purple-50 transition-colors"
            >
              Installation Guide
            </a>
          </div>
        </div>

        {/* Workflow Diagram */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Recommended Workflow</h2>

          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4 border-l-4 border-green-500">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">🟢</span>
                <h3 className="font-bold text-gray-900">Phase 1: Continuous Monitoring</h3>
              </div>
              <p className="text-gray-700 ml-9">
                <strong>RealBench Pro</strong> runs daily/weekly to catch issues early
              </p>
              <div className="text-sm text-gray-600 ml-9 mt-1">
                → Detects scheming, contamination, sandbagging in real-time
              </div>
            </div>

            <div className="flex justify-center">
              <div className="text-gray-400 text-xl">↓</div>
            </div>

            <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">🔵</span>
                <h3 className="font-bold text-gray-900">Phase 2: Pre-Deployment Audit</h3>
              </div>
              <p className="text-gray-700 ml-9">
                <strong>Bloom</strong> validates findings before each major release
              </p>
              <div className="text-sm text-gray-600 ml-9 mt-1">
                → Comprehensive behavioral testing across scenarios
              </div>
            </div>

            <div className="flex justify-center">
              <div className="text-gray-400 text-xl">↓</div>
            </div>

            <div className="bg-white rounded-lg p-4 border-l-4 border-purple-500">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">🔵</span>
                <h3 className="font-bold text-gray-900">Phase 3: Deep Investigation</h3>
              </div>
              <p className="text-gray-700 ml-9">
                <strong>Petri</strong> investigates serious concerns in depth
              </p>
              <div className="text-sm text-gray-600 ml-9 mt-1">
                → Multi-turn analysis for research-grade insights
              </div>
            </div>

            <div className="flex justify-center">
              <div className="text-gray-400 text-xl">↓</div>
            </div>

            <div className="bg-gray-800 text-white rounded-lg p-4">
              <h3 className="font-bold mb-1">Decision Point</h3>
              <p className="text-sm text-gray-300">
                Approve deployment, block release, or investigate model architecture
              </p>
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8 overflow-x-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Tool Comparison</h2>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="py-2 px-3 font-semibold text-gray-900">Aspect</th>
                <th className="py-2 px-3 font-semibold text-green-900">RealBench Pro</th>
                <th className="py-2 px-3 font-semibold text-blue-900">Bloom</th>
                <th className="py-2 px-3 font-semibold text-purple-900">Petri</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="py-2 px-3 font-medium text-gray-700">Type</td>
                <td className="py-2 px-3 text-gray-600">Monitoring</td>
                <td className="py-2 px-3 text-gray-600">Audit</td>
                <td className="py-2 px-3 text-gray-600">Investigation</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium text-gray-700">Frequency</td>
                <td className="py-2 px-3 text-gray-600">Continuous</td>
                <td className="py-2 px-3 text-gray-600">Per-release</td>
                <td className="py-2 px-3 text-gray-600">As-needed</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium text-gray-700">Focus</td>
                <td className="py-2 px-3 text-gray-600">Reasoning trace + contamination</td>
                <td className="py-2 px-3 text-gray-600">Behavioral</td>
                <td className="py-2 px-3 text-gray-600">Multi-turn</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium text-gray-700">Speed</td>
                <td className="py-2 px-3 text-gray-600">Real-time</td>
                <td className="py-2 px-3 text-gray-600">Hours</td>
                <td className="py-2 px-3 text-gray-600">Days</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium text-gray-700">Depth</td>
                <td className="py-2 px-3 text-gray-600">Medium</td>
                <td className="py-2 px-3 text-gray-600">High</td>
                <td className="py-2 px-3 text-gray-600">Very High</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium text-gray-700">Best For</td>
                <td className="py-2 px-3 text-gray-600">Daily operations</td>
                <td className="py-2 px-3 text-gray-600">Pre-deployment</td>
                <td className="py-2 px-3 text-gray-600">Research</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Why This Combination Works */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-blue-900 mb-3 flex items-center gap-2">
            <span>💡</span>
            Why Use All Three?
          </h2>
          <div className="space-y-2 text-gray-700">
            <p>
              <strong className="text-blue-900">Different stages, different tools:</strong>
            </p>
            <ul className="ml-6 space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">•</span>
                <span><strong>RealBench Pro</strong> catches issues early in continuous monitoring</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span><strong>Bloom</strong> validates findings before deployment</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-1">•</span>
                <span><strong>Petri</strong> investigates serious concerns in depth</span>
              </li>
            </ul>
            <p className="mt-3 font-semibold text-blue-900">
              Result: Comprehensive coverage without tool overlap
            </p>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg p-6 text-center">
          <h2 className="text-2xl font-bold mb-2">Ready to Get Started?</h2>
          <p className="mb-4 text-green-50">
            Begin with RealBench Pro for continuous monitoring, then add Bloom and Petri as needed.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/evaluate"
              className="px-6 py-3 bg-white text-green-700 font-semibold rounded hover:bg-green-50 transition-colors"
            >
              Run Your First Evaluation
            </Link>
            <Link
              href="/safety"
              className="px-6 py-3 bg-green-700 text-white font-semibold rounded hover:bg-green-800 transition-colors border border-green-400"
            >
              View Safety Dashboard
            </Link>
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>
            Learn more: {" "}
            <a href="https://github.com/safety-research/bloom" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              Bloom Documentation
            </a>
            {" | "}
            <a href="https://github.com/safety-research/petri" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">
              Petri Documentation
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
