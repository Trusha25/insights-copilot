import React, { useState, useEffect } from 'react';
import { analyzeIdea, toggleSaveWorkspace, fetchSettings, fetchHistoryItem, fetchWorkspaces, fetchTelegramLink } from './api';
import Sidebar from './components/Sidebar';
import ResearchCard from './components/ResearchCard';
import PlanCard from './components/PlanCard';
import ArchitectureCard from './components/ArchitectureCard';
import ResourcesCard from './components/ResourcesCard';
import HistoryView from './components/HistoryView';
import LoginView from './components/LoginView';
import SettingsView from './components/SettingsView';
import { supabase } from './supabaseClient';

export default function App() {
  const [idea, setIdea] = useState("");
  const [status, setStatus] = useState("idle"); // idle, loading, done, error
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [elapsedTime, setElapsedTime] = useState("~0.0s");
  const [currentView, setCurrentView] = useState("dashboard");
  const [newSourceUrls, setNewSourceUrls] = useState([]);
  const [toastMessage, setToastMessage] = useState("");
  const [loadedChats, setLoadedChats] = useState({});

  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState([]);
  const [workspacesLoading, setWorkspacesLoading] = useState(false);
  const [elapsedSecs, setElapsedSecs] = useState(0);

  useEffect(() => {
    const applyTheme = async () => {
      try {
        const data = await fetchSettings();
        if (data.theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } catch (err) {
        console.warn("Could not fetch user theme settings, defaulting to dark mode", err);
        document.documentElement.classList.add('dark'); // Default fallback
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
      if (session) applyTheme();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
      if (session) applyTheme();
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let interval;
    if (status === "loading") {
      const start = Date.now();
      setElapsedSecs(0);
      interval = setInterval(() => {
        const secs = (Date.now() - start) / 1000;
        setElapsedSecs(secs);
        setElapsedTime(`~${secs.toFixed(1)}s`);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [status]);

  const loadWorkspaces = async () => {
    setWorkspacesLoading(true);
    try {
      const data = await fetchWorkspaces();
      setWorkspaces(data);
    } catch (e) {
      console.error("Failed to load workspaces:", e);
    } finally {
      setWorkspacesLoading(false);
    }
  };

  useEffect(() => {
    if (session && currentView === 'dashboard' && !result) {
      loadWorkspaces();
    }
  }, [session, currentView, result]);

  const getProgressText = () => {
    if (elapsedSecs < 5) return "Researching sources (Tavily, arXiv, GitHub, Semantic Scholar)...";
    if (elapsedSecs < 11) return "Drafting stack architecture & Mermaid flowcharts...";
    if (elapsedSecs < 17) return "Auditing execution milestones via Critic Agent...";
    return "Saving workspace and finalizing layout...";
  };

  if (authLoading) {
    return (
      <div className="min-h-screen w-full bg-[#0b0f19] flex items-center justify-center text-slate-400 font-medium">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin"></div>
          <span>Loading session...</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginView />;
  }

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
      if (data?.workspace_id) {
        setLoadedChats(prev => ({ ...prev, [data.workspace_id]: data }));
      }
    } catch (error) {
      setErrorMessage(error.message || "An unexpected error occurred.");
      setStatus("error");
    }
  };

  const handleRefreshResearch = (newResearch, newSources, newCount) => {
    setResult((prev) => {
      const updated = { ...prev, research: newResearch };
      if (prev?.workspace_id) {
        setLoadedChats(c => ({ ...c, [prev.workspace_id]: updated }));
      }
      return updated;
    });
    setNewSourceUrls(newSources.map(s => s.url).filter(Boolean));
    if (newCount > 0) {
      setToastMessage(`${newCount} new source${newCount > 1 ? 's' : ''} found!`);
      setTimeout(() => setToastMessage(""), 4000);
    }
  };

  // Called when user clicks a history item — restore that analysis to dashboard
  const handleHistorySelect = (savedIdea, savedResult, wsId) => {
    setIdea(savedIdea);
    setResult(savedResult);
    setStatus("done");
    setElapsedTime("(restored)");
    setCurrentView("dashboard");
    if (wsId) {
      setLoadedChats(prev => ({ ...prev, [wsId]: savedResult }));
    }
  };

  const handleWorkspaceSelect = async (wsId, ideaTitle) => {
    setIdea(ideaTitle);
    if (loadedChats[wsId]) {
      setResult(loadedChats[wsId]);
      setStatus("done");
      setElapsedTime("(restored)");
      setCurrentView("dashboard");
      return;
    }
    setStatus("loading");
    setResult(null);
    setErrorMessage("");
    try {
      const data = await fetchHistoryItem(wsId);
      setResult(data);
      setStatus("done");
      setElapsedTime("(restored)");
      setCurrentView("dashboard");
      if (data?.workspace_id) {
        setLoadedChats(prev => ({ ...prev, [data.workspace_id]: data }));
      }
    } catch (error) {
      setErrorMessage(error.message || "Failed to load workspace details.");
      setStatus("error");
    }
  };

  const handleToggleSaveActive = async () => {
    if (!result?.workspace_id) return;
    try {
      const { is_saved } = await toggleSaveWorkspace(result.workspace_id);
      setResult(prev => ({ ...prev, is_saved }));
      setLoadedChats(prev => {
        if (prev[result.workspace_id]) {
          return {
            ...prev,
            [result.workspace_id]: { ...prev[result.workspace_id], is_saved }
          };
        }
        return prev;
      });
      setToastMessage(is_saved ? "Workspace saved to favorites!" : "Workspace removed from favorites.");
      setTimeout(() => setToastMessage(""), 3000);
    } catch (e) {
      console.error("Failed to toggle save state", e);
    }
  };

  const handleToggleSaveCache = (wsId, isSaved) => {
    setLoadedChats(prev => {
      if (prev[wsId]) {
        return {
          ...prev,
          [wsId]: { ...prev[wsId], is_saved: isSaved }
        };
      }
      return prev;
    });
  };

  const handleNavigate = (view) => {
    setCurrentView(view);
    if (view === 'dashboard') {
      setResult(null);
      if (status !== 'loading') {
        setStatus("idle");
      }
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar currentView={currentView} onNavigate={handleNavigate} />

      {currentView === 'history' ? (
        <HistoryView 
          onSelectItem={handleHistorySelect} 
          loadedChats={loadedChats} 
          onToggleSaveCache={handleToggleSaveCache} 
        />
      ) : currentView === 'saved' ? (
        <HistoryView 
          onSelectItem={handleHistorySelect} 
          loadedChats={loadedChats} 
          onToggleSaveCache={handleToggleSaveCache} 
          onlySaved={true} 
        />
      ) : currentView === 'settings' ? (
        <SettingsView />
      ) : (
        <main className="flex-1 p-6 lg:p-10 min-w-0 font-sans bg-slate-50 dark:bg-[#0b0f19] transition-colors">
          {/* Dashboard Header */}
          <header className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center shadow-sm">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
                  {result ? "Workspace Detail" : "Builder Dashboard"}
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                  {result ? `Analyzing: ${idea}` : "Juggling and executing your startup concepts"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm font-medium">
              {status === 'done' && result?.workspace_id && (
                <button
                  onClick={handleToggleSaveActive}
                  className="p-2 text-slate-400 hover:text-amber-500 rounded-xl hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors shrink-0"
                  title={result.is_saved ? "Remove from Saved" : "Save Workspace"}
                >
                  <svg className={`w-6 h-6 ${result.is_saved ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499c.158-.343.344-.66.52-.947.176.287.362.604.52.947l2.193 4.444a1 1 0 00.758.552l4.904.713c.38.055.53.518.257.788l-3.548 3.46a1 1 0 00-.287.885l.838 4.886c.065.378-.33.666-.67.487l-4.387-2.31a1 1 0 00-.93 0l-4.387 2.31c-.34.179-.735-.109-.67-.487l.838-4.886a1 1 0 00-.287-.885l-3.548-3.46c-.273-.27-.123-.733.257-.788l4.904-.713a1 1 0 00.758-.552l2.193-4.444z" />
                  </svg>
                </button>
              )}
              {result && (
                <button
                  onClick={() => handleNavigate('dashboard')}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300 transition-colors"
                >
                  Back to Dashboard
                </button>
              )}
              <span className="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full">
                {status === 'loading' ? elapsedTime : status === 'done' ? elapsedTime : '~0.0s'}
              </span>
              <span className={`flex items-center gap-2 px-3 py-1 rounded-full ${status === 'done' ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20' : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/50'}`}>
                {status === 'done' ? 'Analysis completed' : status === 'loading' ? 'Analyzing...' : 'Ready'}
                {status === 'done' && (
                  <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </span>
            </div>
          </header>

          {/* Real-time agent pipeline progress banner */}
          {status === 'loading' && (
            <div className="bg-white dark:bg-[#111827]/70 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 mb-8 max-w-4xl shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="font-bold text-slate-800 dark:text-white text-lg">Pipeline analysis running...</span>
                </div>
                <span className="bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full text-sm font-semibold">
                  {elapsedTime}
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 font-medium mb-3">{getProgressText()}</p>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3">
                <div 
                  className="bg-indigo-600 dark:bg-indigo-500 h-3 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, (elapsedSecs / 20) * 100)}%` }}
                ></div>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-xl mb-6 max-w-4xl">
              {errorMessage}
            </div>
          )}

          {toastMessage && (
            <div className="fixed bottom-6 right-6 bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-lg font-medium animate-bounce z-50">
              {toastMessage}
            </div>
          )}

          {/* MAIN CANVAS VIEWS */}
          {result ? (
            /* Workspace Detail View (4 Cards) */
            <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-6 items-start">
              <ResearchCard status={status} research={result?.research} critique={result?.critique} idea={idea} plan={result?.plan} workspaceId={result?.workspace_id} onRefreshSuccess={handleRefreshResearch} />
              <ArchitectureCard status={status} plan={result?.plan} />
              <PlanCard status={status} roadmap={result?.plan?.roadmap} />
              <ResourcesCard status={status} research={result?.research} newSourceUrls={newSourceUrls} />
            </div>
          ) : (
            /* Dashboard Home view (No active workspace selected) */
            <div className="space-y-10 max-w-7xl">
              {/* Builder Statistics Strips */}
              {!workspacesLoading && workspaces.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl">
                  <div className="bg-white dark:bg-[#111827]/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Workspace Plans</p>
                    <p className="text-3xl font-extrabold text-slate-800 dark:text-white mt-1">{workspaces.length}</p>
                  </div>
                  <div className="bg-white dark:bg-[#111827]/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Saved Favorites</p>
                    <p className="text-3xl font-extrabold text-slate-800 dark:text-white mt-1">
                      {workspaces.filter(w => w.is_saved).length}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-[#111827]/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Needs Attention</p>
                    <p className="text-3xl font-extrabold text-amber-600 dark:text-amber-500 mt-1">
                      {workspaces.filter(w => !w.telegram_linked && w.total_milestones > 0).length}
                    </p>
                  </div>
                </div>
              )}

              {/* 1. Continue Where You Left Off */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Continue Where You Left Off</h2>
                </div>

                {workspacesLoading ? (
                  <div className="flex items-center gap-2 text-slate-500">
                    <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading workspace tracker...</span>
                  </div>
                ) : workspaces.length === 0 ? (
                  <div className="bg-white dark:bg-[#111827]/70 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center text-slate-500 max-w-4xl">
                    <p className="text-lg font-semibold">No active workspace designs yet.</p>
                    <p className="text-sm mt-1">Submit your first startup idea below to kick off the pipeline analysis.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl">
                    {workspaces.map(ws => {
                      const progressPercentage = ws.total_milestones > 0 
                        ? (ws.current_milestone_index / ws.total_milestones) * 100 
                        : 0;

                      return (
                        <div
                          key={ws.id}
                          onClick={() => handleWorkspaceSelect(ws.id, ws.idea)}
                          className="bg-white dark:bg-[#111827]/70 hover:shadow-lg hover:border-indigo-400 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 transition-all cursor-pointer flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex justify-between items-start gap-4">
                              <h3 className="font-extrabold text-slate-800 dark:text-white text-lg line-clamp-2 hover:text-indigo-600 transition-colors">
                                {ws.idea}
                              </h3>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    const { is_saved } = await toggleSaveWorkspace(ws.id);
                                    setWorkspaces(prev => prev.map(w => w.id === ws.id ? { ...w, is_saved } : w));
                                    setToastMessage(is_saved ? "Saved to favorites!" : "Removed from favorites.");
                                    setTimeout(() => setToastMessage(""), 2000);
                                  } catch (err) {
                                    console.error("Failed to toggle save", err);
                                  }
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                              >
                                <svg className={`w-5 h-5 ${ws.is_saved ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499c.158-.343.344-.66.52-.947.176.287.362.604.52.947l2.193 4.444a1 1 0 00.758.552l4.904.713c.38.055.53.518.257.788l-3.548 3.46a1 1 0 00-.287.885l.838 4.886c.065.378-.33.666-.67.487l-4.387-2.31a1 1 0 00-.93 0l-4.387 2.31c-.34.179-.735-.109-.67-.487l.838-4.886a1 1 0 00-.287-.885l-3.548-3.46c-.273-.27-.123-.733.257-.788l4.904-.713a1 1 0 00.758-.552l2.193-4.444z" />
                                </svg>
                              </button>
                            </div>

                            {/* Milestone Tracker Indicator */}
                            {ws.total_milestones > 0 ? (
                              <div className="mt-4">
                                <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                  <span>{ws.milestone_progress}</span>
                                  <span>{Math.round(progressPercentage)}%</span>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                                  <div 
                                    className="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${progressPercentage}%` }}
                                  ></div>
                                </div>

                                <div className="mt-3 bg-slate-50 dark:bg-[#1f2937]/30 border border-slate-100 dark:border-slate-800/50 rounded-xl p-3">
                                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Next Step</p>
                                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-0.5 line-clamp-1">
                                    {ws.next_step_title}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <p className="text-slate-400 text-xs mt-3">No timeline milestones parsed.</p>
                            )}
                          </div>

                          {/* 5. Contextual Telegram Connect Alert inside Continue cards */}
                          {!ws.telegram_linked && ws.total_milestones > 0 && (
                            <div 
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  const data = await fetchTelegramLink(ws.id);
                                  if (data?.deep_link) {
                                    window.open(data.deep_link, '_blank');
                                  }
                                } catch (err) {
                                  console.error("Failed to connect Telegram:", err);
                                }
                              }}
                              className="mt-4 p-3 bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 rounded-2xl flex items-center justify-between text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100/50 transition-colors"
                            >
                              <span>🔔 Get alerts on Telegram</span>
                              <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">Connect</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* 2. Pitch a New Startup Idea */}
              <section className="bg-white dark:bg-[#111827]/70 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 lg:p-8 max-w-4xl shadow-sm">
                <div className="flex items-center gap-2.5 mb-2">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21m0 0l-.813-5.096L9 21zm0 0h3.812m-3.812 0H5.188M9 10a4 4 0 118 0c0 1.947-.696 3.733-1.854 5.12L12 21h-3l2.854-5.88A7.994 7.994 0 019 10z" />
                  </svg>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Pitch a New Startup Idea</h2>
                </div>
                <p className="text-slate-500 dark:text-slate-400 mb-6">
                  Input a concept to invoke the 4-agent AI pipeline (Research → Planner → Critic → Mentor).
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                  <input
                    type="text"
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm text-slate-700 dark:text-white bg-white dark:bg-[#0b0f19] transition-colors"
                    placeholder="e.g. AI-based study buddy for students preparing for medical exams"
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                    disabled={status === "loading"}
                  />
                  <button
                    onClick={handleAnalyze}
                    disabled={status === "loading" || !idea.trim()}
                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-md transition-all shrink-0"
                  >
                    {status === "loading" ? "Analyzing..." : "Analyze Idea"}
                  </button>
                </div>
              </section>

              {/* 4. Recent Mentor Dialogues */}
              {!workspacesLoading && workspaces.some(w => w.latest_mentor) && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Recent Mentor Exchanges</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
                    {workspaces.filter(w => w.latest_mentor).map(ws => (
                      <div
                        key={ws.id}
                        onClick={() => handleWorkspaceSelect(ws.id, ws.idea)}
                        className="bg-white dark:bg-[#111827]/70 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:shadow-md rounded-3xl p-6 transition-all cursor-pointer flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-full">
                            For: {ws.idea}
                          </span>

                          <div className="space-y-2 mt-2">
                            <div className="flex gap-2">
                              <span className="font-extrabold text-sm text-slate-400">Q:</span>
                              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 italic">
                                "{ws.latest_mentor.question}"
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <span className="font-extrabold text-sm text-indigo-500">A:</span>
                              <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                                {ws.latest_mentor.answer}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="text-[11px] font-bold text-indigo-500 hover:text-indigo-600 mt-4 flex items-center gap-1.5 justify-end">
                          <span>Continue Dialogue</span>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </main>
      )}
    </div>
  );
}
