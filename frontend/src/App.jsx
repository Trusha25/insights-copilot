import React, { useState } from 'react';
import { analyzeIdea } from './api';
import ResearchCard from './components/ResearchCard';
import PlanCard from './components/PlanCard';
import { Sparkles, Loader2, Search, Lightbulb, AlertCircle, ArrowUpRight } from './components/Icons';

export default function App() {
  const [idea, setIdea] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!idea.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await analyzeIdea(idea.trim());
      setResult(data);
    } catch (err) {
      setError(err.message || 'An error occurred while connecting to the research agent backend.');
    } finally {
      setLoading(false);
    }
  };

  const sampleIdeas = [
    "AI-powered code review agent for pull requests",
    "Smart micro-saas for automated video repurposing",
    "Real-time market sentiment tracker for crypto traders"
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Background ambient lighting */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-indigo-600/10 via-purple-600/5 to-transparent blur-3xl pointer-events-none"></div>

      {/* Main Container */}
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        {/* Header */}
        <header className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-4 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5" />
            <span>FastAPI + Groq Llama-3.3 Powered Assistant</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Insights <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Copilot</span>
          </h1>

          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Validate project concepts in seconds. Uncover existing solutions, market research, and competitive intelligence.
          </p>
        </header>

        {/* Input Form */}
        <div className="mb-10">
          <form onSubmit={handleSubmit} className="relative max-w-3xl mx-auto">
            <div className="glass-input rounded-2xl p-2 shadow-2xl transition-all focus-within:border-indigo-500/50 focus-within:ring-2 focus-within:ring-indigo-500/20">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1 flex items-center px-3 gap-3">
                  <Search className="w-5 h-5 text-slate-500 shrink-0" />
                  <input
                    type="text"
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                    placeholder="Describe your startup idea or technical product concept..."
                    className="w-full bg-transparent border-none focus:outline-none text-white text-sm sm:text-base placeholder-slate-500 py-3"
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !idea.trim()}
                  className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 shrink-0"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <span>Analyze Idea</span>
                      <ArrowUpRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Sample Suggestions */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4 max-w-3xl mx-auto">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> Try an example:
            </span>
            {sampleIdeas.map((sample, idx) => (
              <button
                key={idx}
                onClick={() => setIdea(sample)}
                className="text-xs bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 px-2.5 py-1 rounded-lg transition-colors"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="max-w-3xl mx-auto mb-8 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Backend Connection Issue</p>
              <p className="text-xs text-rose-300/80 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Loading Skeleton state */}
        {loading && (
          <div className="max-w-3xl mx-auto glass-card rounded-2xl p-8 border border-slate-800 animate-pulse space-y-4">
            <div className="h-6 bg-slate-800 rounded w-1/3"></div>
            <div className="h-4 bg-slate-800/60 rounded w-full"></div>
            <div className="h-4 bg-slate-800/60 rounded w-5/6"></div>
            <div className="h-4 bg-slate-800/60 rounded w-4/6"></div>
            <div className="pt-4 border-t border-slate-800 flex gap-2">
              <div className="h-8 bg-slate-800 rounded w-24"></div>
              <div className="h-8 bg-slate-800 rounded w-28"></div>
            </div>
          </div>
        )}

        {/* Results Showcase */}
        {result && (
          <div className="space-y-8 max-w-4xl mx-auto">
            <ResearchCard research={result.research} sources={result.sources} />
            <PlanCard idea={idea} />
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <p>Insights Copilot &bull; Built with FastAPI, Groq API, and React + Tailwind</p>
      </footer>
    </div>
  );
}
