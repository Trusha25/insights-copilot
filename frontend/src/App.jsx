import React, { useState, useEffect } from 'react';
import { analyzeIdea } from './api';
import Sidebar from './components/Sidebar';
import ResearchCard from './components/ResearchCard';
import PlanCard from './components/PlanCard';
import ArchitectureCard from './components/ArchitectureCard';
import ResourcesCard from './components/ResourcesCard';
import HistoryView from './components/HistoryView';

export default function App() {
  const [idea, setIdea] = useState("");
  const [status, setStatus] = useState("idle"); // idle, loading, done, error
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [elapsedTime, setElapsedTime] = useState("~0.0s");
  const [currentView, setCurrentView] = useState("dashboard");
  const [newSourceUrls, setNewSourceUrls] = useState([]);
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    let interval;
    if (status === "loading") {
      const start = Date.now();
      interval = setInterval(() => {
        setElapsedTime(`~${((Date.now() - start) / 1000).toFixed(1)}s`);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [status]);

  const handleAnalyze = async () => {
    if (!idea.trim()) return;
    setStatus("loading");
    setResult(null);
    setErrorMessage("");
    setCurrentView("dashboard");
    try {
      const data = await analyzeIdea(idea);
      setResult(data);
      setStatus("done");
    } catch (error) {
      setErrorMessage(error.message || "An unexpected error occurred.");
      setStatus("error");
    }
  };

  const handleRefreshResearch = (newResearch, newSources, newCount) => {
    setResult((prev) => ({ ...prev, research: newResearch }));
    setNewSourceUrls(newSources.map(s => s.url).filter(Boolean));
    if (newCount > 0) {
      setToastMessage(`${newCount} new source${newCount > 1 ? 's' : ''} found!`);
      setTimeout(() => setToastMessage(""), 4000);
    }
  };

  // Called when user clicks a history item — restore that analysis to dashboard
  const handleHistorySelect = (savedIdea, savedResult) => {
    setIdea(savedIdea);
    setResult(savedResult);
    setStatus("done");
    setElapsedTime("(restored)");
    setCurrentView("dashboard");
  };

  const handleNavigate = (view) => {
    setCurrentView(view);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar currentView={currentView} onNavigate={handleNavigate} />

      {currentView === 'history' ? (
        <HistoryView onSelectItem={handleHistorySelect} />
      ) : (
        <main className="flex-1 p-6 lg:p-10 min-w-0">
          <header className="flex justify-between items-center border-b border-slate-200 pb-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2a2 2 0 012 2v2a2 2 0 01-2 2 2 2 0 01-2-2V4a2 2 0 012-2zm0 18a2 2 0 01-2-2v-2a2 2 0 012-2 2 2 0 012 2v2a2 2 0 01-2 2zm6-10a2 2 0 012-2h2a2 2 0 012 2 2 2 0 01-2 2h-2a2 2 0 01-2-2zM4 10a2 2 0 012-2h2a2 2 0 012 2 2 2 0 01-2 2H6a2 2 0 01-2-2z"/>
                </svg>
              </div>
              <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Insights Copilot</h1>
            </div>

            <div className="flex items-center gap-3 text-sm font-medium">
              <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">
                {status === 'loading' ? elapsedTime : status === 'done' ? elapsedTime : '~0.0s'}
              </span>
              <span className={`flex items-center gap-2 px-3 py-1 rounded-full ${status === 'done' ? 'text-emerald-700' : 'text-slate-500'}`}>
                {status === 'done' ? 'Analysis completed' : status === 'loading' ? 'Analyzing...' : 'Ready'}
                {status === 'done' && (
                  <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </span>
            </div>
          </header>

          <section className="mb-10 max-w-4xl">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Analyze Your Startup Idea</h2>
            <p className="text-slate-600 mb-6 text-lg">Get AI-powered technical analysis and a 5-step execution roadmap in seconds.</p>

            <div className="flex gap-4">
              <input
                type="text"
                className="flex-1 px-4 py-3 text-lg rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-slate-700"
                placeholder="e.g. AI based personal finance app for young professionals"
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
              />
              <button
                onClick={handleAnalyze}
                disabled={status === "loading" || !idea.trim()}
                className="px-8 py-3 text-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-xl shadow-sm transition-colors"
              >
                {status === "loading" ? "Analyzing..." : "Analyze"}
              </button>
            </div>
          </section>

          {status === "error" && (
            <div className="p-4 bg-red-50 text-red-700 rounded-xl mb-6">
              {errorMessage}
            </div>
          )}

          {toastMessage && (
            <div className="fixed bottom-6 right-6 bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-lg font-medium animate-bounce">
              {toastMessage}
            </div>
          )}

          {(status === "loading" || status === "done") && (
            <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-6 items-start">
              <ResearchCard status={status} research={result?.research} critique={result?.critique} idea={idea} plan={result?.plan} workspaceId={result?.workspace_id} onRefreshSuccess={handleRefreshResearch} />
              <ArchitectureCard status={status} plan={result?.plan} />
              <PlanCard status={status} roadmap={result?.plan?.roadmap} />
              <ResourcesCard status={status} research={result?.research} newSourceUrls={newSourceUrls} />
            </div>
          )}
        </main>
      )}
    </div>
  );
}
