import React, { useState, useEffect } from 'react';
import { analyzeIdea, toggleSaveWorkspace, fetchSettings, saveSettings, fetchHistoryItem, fetchWorkspaces, fetchTelegramLink } from './api';
import Sidebar from './components/Sidebar';
import ResearchCard from './components/ResearchCard';
import PlanCard from './components/PlanCard';
import ArchitectureCard from './components/ArchitectureCard';
import ResourcesCard from './components/ResourcesCard';
import HistoryView from './components/HistoryView';
import LoginView from './components/LoginView';
import SettingsView from './components/SettingsView';
import FollowUpChat from './components/FollowUpChat';
import { supabase } from './supabaseClient';

export default function App() {
  const [idea, setIdea] = useState("");
  const [status, setStatus] = useState("idle"); // idle, loading, done, error
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [elapsedTime, setElapsedTime] = useState("~0.0s");
  const [currentView, setCurrentView] = useState("home");
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme') || 'dark';
    if (saved === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    return saved;
  });
  const [primaryModel, setPrimaryModel] = useState('gemini');

  const handleThemeChange = async (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      await saveSettings(newTheme, primaryModel);
    } catch (e) {
      console.error("Failed to save settings preference:", e);
    }
  };

  const handlePrimaryModelChange = async (newModel) => {
    setPrimaryModel(newModel);
    try {
      await saveSettings(theme, newModel);
    } catch (e) {
      console.error("Failed to save model settings preference:", e);
    }
  };
  const [newSourceUrls, setNewSourceUrls] = useState([]);
  const [toastMessage, setToastMessage] = useState("");
  const [loadedChats, setLoadedChats] = useState({});

  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState([]);
  const [workspacesLoading, setWorkspacesLoading] = useState(false);
  const [elapsedSecs, setElapsedSecs] = useState(0);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await fetchSettings();
        if (data.theme && (data.theme === 'dark' || data.theme === 'light')) {
          setTheme(data.theme);
          localStorage.setItem('theme', data.theme);
          if (data.theme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
        if (data.primary_model) {
          setPrimaryModel(data.primary_model);
        }
      } catch (err) {
        console.warn("Could not fetch user settings, defaulting to local storage or dark mode", err);
        const saved = localStorage.getItem('theme') || 'dark';
        if (saved === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
      if (session) loadSettings();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
      if (session) loadSettings();
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
    setCurrentView("home");
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
    setCurrentView("home");
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
      setCurrentView("home");
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
      setCurrentView("home");
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
    if (view === 'home' && !result) {
      if (status !== 'loading') {
        setStatus("idle");
      }
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar 
        currentView={currentView} 
        onNavigate={handleNavigate} 
        onNewAnalysis={() => {
          setResult(null);
          setStatus("idle");
          setIdea("");
          setCurrentView("home");
        }} 
      />

      {currentView === 'history' ? (
        <HistoryView 
          onSelectItem={handleHistorySelect} 
          loadedChats={loadedChats} 
          onToggleSaveCache={handleToggleSaveCache} 
        />
      ) : currentView === 'settings' ? (
        <SettingsView 
          theme={theme} 
          onThemeChange={handleThemeChange} 
          primaryModel={primaryModel}
          onPrimaryModelChange={handlePrimaryModelChange}
        />
      ) : (
        <main className={`flex-1 min-w-0 font-sans transition-colors relative flex flex-col ${
          currentView === 'home' && !result 
            ? 'bg-[var(--bg-primary)] starfield-bg p-6 lg:p-8 min-h-screen justify-between overflow-hidden relative z-10' 
            : 'bg-slate-50 dark:bg-[var(--bg-primary)] p-6 lg:p-10 min-h-screen text-slate-800 dark:text-slate-200'
        }`}>
          {/* Dashboard Header - Hidden on Landing page */}
          {!(currentView === 'home' && !result) && (
            <header className="flex justify-between items-center border-b border-slate-200 dark:border-[var(--color-border)] pb-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[var(--color-accent-bg)] dark:bg-[var(--color-accent-bg)] text-[var(--color-accent)] rounded-xl flex items-center justify-center shadow-sm border border-[var(--color-border)]">
                  <svg className="w-6 h-6 animate-float" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
                    {currentView === 'dashboard' ? "Builder Dashboard" : (result ? "Workspace Detail" : "Insights Copilot")}
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                    {currentView === 'dashboard' ? "Juggling and executing your startup concepts" : (result ? `Analyzing: ${idea}` : "Pitch your startup idea and get instant agentic analysis")}
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
                    onClick={() => {
                      setResult(null);
                      setStatus("idle");
                      setCurrentView("home");
                    }}
                    className="px-3 py-1.5 border border-slate-200 dark:border-[var(--color-border)] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    New Pitch
                  </button>
                )}
                <span className="bg-indigo-50 dark:bg-[var(--color-accent-bg)] text-indigo-700 dark:text-[var(--color-accent)] px-3 py-1 rounded-full border border-transparent dark:border-[var(--color-border)]">
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
          )}

          {/* Real-time agent pipeline progress banner - Hidden on Landing page */}
          {status === 'loading' && !(currentView === 'home' && !result) && (
            <div className="bg-white dark:bg-[var(--bg-card)] border border-slate-200 dark:border-[var(--color-border)] rounded-3xl p-6 mb-8 max-w-4xl shadow-sm backdrop-blur-md">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 border-4 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin"></div>
                  <span className="font-bold text-slate-800 dark:text-white text-lg">Pipeline analysis running...</span>
                </div>
                <span className="bg-indigo-50 dark:bg-[var(--color-accent-bg)] text-indigo-700 dark:text-[var(--color-accent)] px-3 py-1 rounded-full text-sm font-semibold border border-transparent dark:border-[var(--color-border)]">
                  {elapsedTime}
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 font-medium mb-3">{getProgressText()}</p>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden border border-transparent dark:border-slate-700">
                <div 
                  className="bg-gradient-to-r from-amber-400 via-[var(--color-accent)] to-amber-600 h-3 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, (elapsedSecs / 20) * 100)}%` }}
                ></div>
              </div>
            </div>
          )}

          {status === "error" && !(currentView === 'home' && !result) && (
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
          {currentView === 'home' && result && (
            /* Workspace Detail View (4 Cards + Follow Up Chat) */
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-6 items-start">
                <ResearchCard status={status} research={result?.research} critique={result?.critique} idea={idea} plan={result?.plan} workspaceId={result?.workspace_id} onRefreshSuccess={handleRefreshResearch} />
                <ArchitectureCard status={status} plan={result?.plan} />
                <PlanCard status={status} roadmap={result?.plan?.roadmap} />
                <ResourcesCard status={status} research={result?.research} newSourceUrls={newSourceUrls} />
              </div>
              
              <FollowUpChat 
                workspaceId={result?.workspace_id} 
                initialHistory={result?.chat_history || []} 
                idea={idea}
                primaryModel={primaryModel}
              />
            </div>
          )}

          {currentView === 'home' && !result && (
            <>
              {/* Immersive Landing Page Header */}
              <div className="flex justify-between items-center w-full relative z-20 mb-8 select-none">
                <div className="text-[11px] font-bold text-slate-500 tracking-widest uppercase">
                  01 <span className="text-slate-600">/</span> LANDING <span className="text-slate-600">/</span> NEW ANALYSIS
                </div>
                <div className="flex items-center gap-3">
                  {/* Credits Pill */}
                  <div className="flex items-center gap-2 px-3.5 py-1.5 bg-[var(--bg-surface)] border border-[var(--color-border)] rounded-xl text-slate-200 text-xs font-semibold shadow-inner backdrop-blur-md">
                    <svg className="w-3.5 h-3.5 text-[var(--color-accent)] drop-shadow-[0_0_4px_var(--color-accent-glow)] animate-float" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L2 12l10 10 10-10L12 2z"/>
                    </svg>
                    <span className="font-extrabold tracking-tight">12,450</span>
                  </div>
                  {/* Notification Bell */}
                  <button className="relative p-2 bg-[var(--bg-surface)] border border-[var(--color-border)] rounded-xl text-slate-400 hover:text-slate-200 transition-colors shadow-sm backdrop-blur-md cursor-pointer">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[var(--color-accent)] rounded-full animate-pulse"></span>
                  </button>
                </div>
              </div>

              {/* Center Hero and Pitch Input */}
              <div className="w-full max-w-3xl mx-auto flex-1 flex flex-col justify-center items-center text-center py-6 relative z-20">
                
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--color-accent-bg)] border border-[var(--color-border-hover)] text-[var(--color-accent)] text-[11px] font-bold uppercase tracking-wider mb-6 animate-float shadow-[0_0_15px_var(--color-accent-glow)] select-none">
                  <svg className="w-3.5 h-3.5 text-[var(--color-accent)]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21m0 0l-.813-5.096L9 21zm0 0h3.812m-3.812 0H5.188M9 10a4 4 0 118 0c0 1.947-.696 3.733-1.854 5.12L12 21h-3l2.854-5.88A7.994 7.994 0 019 10z" />
                  </svg>
                  <span>AI-Powered Innovation OS</span>
                </div>

                {/* Headline */}
                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-5 leading-[1.15] max-w-2xl select-none">
                  Turn Ideas into <span className="text-[var(--color-accent)] text-glow-gold">Investable</span> Startups.
                </h1>

                {/* Subtitle */}
                <p className="text-slate-400 text-sm md:text-base max-w-xl mb-8 leading-relaxed font-medium select-none">
                  Our multi-agent AI system analyzes your idea across 4 critical dimensions to give you a brutal, data-driven verdict.
                </p>

                {status === "loading" ? (
                  <div className="w-full max-w-2xl p-8 glass-panel rounded-3xl border border-[var(--color-border-hover)] shadow-xl relative z-20 text-center">
                    <div className="flex flex-col items-center gap-6">
                      <div className="relative">
                        {/* Pulsing ring indicator */}
                        <div className="absolute inset-0 rounded-full border-4 border-[var(--color-accent)]/20 animate-ping"></div>
                        <div className="w-16 h-16 border-4 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin"></div>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white mb-2">Analyzing Your Startup Idea</h3>
                        <p className="text-[var(--color-accent)] text-xs font-semibold uppercase tracking-wider bg-[var(--color-accent-bg)] px-3 py-1 rounded-full border border-[var(--color-border)] inline-block mb-4">
                          Pipeline Active ({elapsedTime})
                        </p>
                        <p className="text-slate-300 text-sm leading-relaxed min-h-[48px] px-4">
                          {getProgressText()}
                        </p>
                      </div>
                      {/* Progress Bar */}
                      <div className="w-full">
                        <div className="w-full bg-slate-900/60 rounded-full h-2 border border-slate-800/80 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-amber-400 via-[var(--color-accent)] to-amber-600 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${Math.min(100, (elapsedSecs / 20) * 100)}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-[11px] font-bold text-slate-500 mt-2 tracking-wide">
                          <span>INITIALIZING</span>
                          <span>{Math.round(Math.min(100, (elapsedSecs / 20) * 100))}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {status === "error" && (
                      <div className="w-full max-w-2xl p-4 bg-red-950/20 text-red-400 border border-red-900/50 rounded-xl mb-4 text-sm font-medium">
                        {errorMessage}
                      </div>
                    )}
                    {/* Textarea container */}
                    <div className="relative w-full max-w-2xl mb-5 group">
                      {/* Glow effect border on hover/focus */}
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-[var(--color-accent)]/20 via-[var(--color-accent-hover)]/10 to-transparent rounded-2xl blur opacity-15 group-hover:opacity-25 transition duration-300"></div>
                      <div className="relative">
                        <textarea
                          maxLength={2000}
                          className="w-full h-36 px-5 py-4 pb-10 glass-input rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 text-base resize-none transition-all duration-200 leading-relaxed"
                          placeholder="Describe your startup idea in detail..."
                          value={idea}
                          onChange={(e) => setIdea(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleAnalyze();
                            }
                          }}
                        />
                        {/* Character Counter */}
                        <div className="absolute bottom-3 right-4 text-xs font-semibold text-slate-500 tracking-wider">
                          {idea.length} <span className="text-slate-600">/</span> 2000
                        </div>
                      </div>
                    </div>

                    {/* Run AI Analysis CTA Button */}
                    <button
                      onClick={handleAnalyze}
                      disabled={!idea.trim()}
                      className="w-full max-w-2xl py-4 theme-btn-primary rounded-2xl text-base flex items-center justify-center gap-2 cursor-pointer shrink-0"
                    >
                      <svg className="w-5 h-5 text-[#030407]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21m0 0l-.813-5.096L9 21zm0 0h3.812m-3.812 0H5.188M9 10a4 4 0 118 0c0 1.947-.696 3.733-1.854 5.12L12 21h-3l2.854-5.88A7.994 7.994 0 019 10z" />
                      </svg>
                      <span>Run AI Analysis</span>
                    </button>
                  </>
                )}

                {/* Bottom features / specs row */}
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8 text-xs font-bold text-slate-500 select-none uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-[var(--color-accent)]/80" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                    <span>4 AI Agents</span>
                  </div>
                  <span className="text-slate-700 font-normal text-sm select-none">•</span>
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-[var(--color-accent)]/80" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                    </svg>
                    <span>10+ Data Sources</span>
                  </div>
                  <span className="text-slate-700 font-normal text-sm select-none">•</span>
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-[var(--color-accent)]/80" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <span>Investor-Grade Insights</span>
                  </div>
                </div>

              </div>

              {/* Premium Planet Horizon Glow Background */}
              <div className="absolute bottom-0 left-0 right-0 h-64 overflow-hidden pointer-events-none z-10 select-none">
                {/* Outer atmosphere ambient glow */}
                <div className="absolute bottom-[-150px] left-1/2 -translate-x-1/2 w-[140%] h-[350px] planet-glow-purple rounded-full blur-3xl opacity-70 animate-pulse-slow" />
                <div className="absolute bottom-[-100px] left-1/2 -translate-x-1/2 w-[110%] h-[250px] planet-glow-blue rounded-full blur-3xl opacity-60" />
                
                {/* Core rising sunrise at center */}
                <div className="absolute bottom-[-40px] left-1/2 -translate-x-1/2 w-[500px] h-[150px] bg-gradient-to-t from-[var(--color-accent)]/20 via-[var(--color-accent)]/5 to-transparent rounded-full blur-2xl opacity-65" />
                <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-[220px] h-[60px] bg-white/10 rounded-full blur-xl opacity-30" />

                {/* The crisp planet surface edge line */}
                <div className="absolute bottom-[-340px] left-1/2 -translate-x-1/2 w-[160%] h-[400px] rounded-full border-t border-[var(--color-border)] bg-[#020408]/95 shadow-[0_-15px_60px_rgba(223,197,143,0.06)]" />
              </div>
            </>
          )}

          {currentView === 'dashboard' && (
            /* Dedicated Builder Dashboard View */
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
                    <p className="text-sm mt-1">Visit Home to pitch your first startup idea and kick off the pipeline analysis.</p>
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

                          {/* Telegram Connect button */}
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
