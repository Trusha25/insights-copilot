import React, { useState, useEffect } from 'react';
import { analyzeIdea, toggleSaveWorkspace, fetchSettings, saveSettings, fetchHistoryItem, fetchWorkspaces, fetchTelegramLink, fetchFounderProfile, getNotifications, getActivity } from './api';
import Sidebar from './components/Sidebar';
import ResearchCard from './components/ResearchCard';
import PlanCard from './components/PlanCard';
import ArchitectureCard from './components/ArchitectureCard';
import ResourcesCard from './components/ResourcesCard';
import HistoryView from './components/HistoryView';
import LoginView from './components/LoginView';
import SettingsView from './components/SettingsView';
import FollowUpChat from './components/FollowUpChat';
import LoadingDashboard from './components/LoadingDashboard';
import WorkspaceDashboard from './components/WorkspaceDashboard';
import { supabase } from './supabaseClient';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center text-red-500 max-w-2xl mx-auto mt-20 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-2xl">
          <h2 className="text-xl font-bold mb-4">Something broke while rendering: {this.state.error.message}</h2>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold cursor-pointer"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
  const [experienceLevel, setExperienceLevel] = useState('intermediate');
  const [founderProfile, setFounderProfile] = useState(null);

  const handleThemeChange = async (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      await saveSettings(newTheme, primaryModel, experienceLevel);
    } catch (e) {
      console.error("Failed to save settings preference:", e);
    }
  };

  const handlePrimaryModelChange = async (newModel) => {
    setPrimaryModel(newModel);
    try {
      await saveSettings(theme, newModel, experienceLevel);
    } catch (e) {
      console.error("Failed to save model settings preference:", e);
    }
  };

  const handleExperienceLevelChange = async (newLevel) => {
    setExperienceLevel(newLevel);
    try {
      await saveSettings(theme, primaryModel, newLevel);
    } catch (e) {
      console.error("Failed to save experience level preference:", e);
    }
  };
  const [newSourceUrls, setNewSourceUrls] = useState([]);
  const [toastMessage, setToastMessage] = useState("");
  const [loadedChats, setLoadedChats] = useState({});

  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState([]);
  const [workspacesLoading, setWorkspacesLoading] = useState(true);
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [isDataReady, setIsDataReady] = useState(false);
  const [pendingResult, setPendingResult] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [activity, setActivity] = useState([]);
  const [isFounderProfileExpanded, setIsFounderProfileExpanded] = useState(false);

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
        if (data.experience_level) {
          setExperienceLevel(data.experience_level);
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
      const [wsData, profileData, notifsData, activityData] = await Promise.allSettled([
        fetchWorkspaces(),
        fetchFounderProfile(),
        getNotifications(),
        getActivity()
      ]);
      console.log("[Dashboard] wsData:", wsData);
      console.log("[Dashboard] profileData:", profileData);
      console.log("[Dashboard] notifsData:", notifsData);
      console.log("[Dashboard] activityData:", activityData);
      if (wsData.status === 'fulfilled') setWorkspaces(wsData.value || []);
      else console.error("[Dashboard] fetchWorkspaces FAILED:", wsData.reason);
      if (profileData.status === 'fulfilled') setFounderProfile(profileData.value);
      if (notifsData.status === 'fulfilled') setNotifications(notifsData.value || []);
      if (activityData.status === 'fulfilled') setActivity(activityData.value || []);
    } catch (e) {
      console.error("Failed to load workspaces or dashboard data:", e);
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
    setPendingResult(null);
    setIsDataReady(false);
    setErrorMessage("");
    setCurrentView("home");
    try {
      const data = await analyzeIdea(idea);
      setPendingResult(data);
      setIsDataReady(true);
    } catch (error) {
      setErrorMessage(error.message || "An unexpected error occurred.");
      setStatus("error");
    }
  };

  const handleAnimationComplete = () => {
    if (pendingResult) {
      setResult(pendingResult);
      setStatus("done");
      if (pendingResult.workspace_id) {
        setLoadedChats(prev => ({ ...prev, [pendingResult.workspace_id]: pendingResult }));
      }
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
          experienceLevel={experienceLevel}
          onExperienceLevelChange={handleExperienceLevelChange}
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
          <ErrorBoundary>
          {currentView === 'home' && result && (
            <WorkspaceDashboard
              result={result}
              idea={idea}
              status={status}
              newSourceUrls={newSourceUrls}
              onRefreshResearch={handleRefreshResearch}
              onToggleSaveActive={handleToggleSaveActive}
              onEditIdea={() => {
                setResult(null);
                setStatus("idle");
                setCurrentView("home");
              }}
              primaryModel={primaryModel}
              experienceLevel={experienceLevel}
              onCancel={() => {
                setResult(null);
                setStatus("idle");
                setCurrentView("home");
              }}
              setToastMessage={setToastMessage}
            />
          )}

          {currentView === 'home' && !result && status === 'loading' ? (
            <LoadingDashboard
              idea={idea}
              isDataReady={isDataReady}
              onCancel={() => {
                setStatus("idle");
                setIsDataReady(false);
                setPendingResult(null);
              }}
              onAnimationComplete={handleAnimationComplete}
            />
          ) : currentView === 'home' && !result ? (
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
          ) : null}

          {currentView === 'dashboard' && (
            /* Dedicated Builder Dashboard View */
            <div className="space-y-8 w-full">
              {/* Stats Strip */}
              {!workspacesLoading && workspaces.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-[#111827]/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active plans</p>
                    <p className="text-3xl font-extrabold text-slate-800 dark:text-white mt-1">{workspaces.length}</p>
                  </div>
                  <div className="bg-white dark:bg-[#111827]/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Avg score</p>
                    <p className="text-3xl font-extrabold text-slate-800 dark:text-white mt-1">{founderProfile ? founderProfile.avg_score : '-'}</p>
                  </div>
                  <div className="bg-white dark:bg-[#111827]/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Favorites</p>
                    <p className="text-3xl font-extrabold text-slate-800 dark:text-white mt-1">{workspaces.filter(w => w.is_saved).length}</p>
                  </div>
                  <div className="bg-white dark:bg-amber-950/30 border border-slate-200 dark:border-amber-900/40 rounded-2xl p-5 shadow-sm">
                    <p className="text-sm font-semibold text-amber-600 dark:text-amber-500 uppercase tracking-wider">Needs attention</p>
                    <p className="text-3xl font-extrabold text-amber-600 dark:text-amber-500 mt-1">
                      {workspaces.filter(w => !w.telegram_linked && w.total_milestones > 0).length} <span className="text-base font-normal">idea</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Founder Profile */}
              {founderProfile && !founderProfile.insufficient_data ? (
                isFounderProfileExpanded ? (
                  <div className="bg-white dark:bg-[#111827]/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center gap-8 justify-between relative">
                    <button 
                      onClick={() => setIsFounderProfileExpanded(false)}
                      className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-lg"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    
                    <div className="flex flex-col items-center justify-center shrink-0">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 text-center">Avg Score</h3>
                      <div className="relative w-32 h-32 flex items-center justify-center">
                        <svg className="w-32 h-32 transform -rotate-90">
                          <circle cx="64" cy="64" r="50" className="stroke-slate-200 dark:stroke-slate-900" strokeWidth="8" fill="transparent" />
                          <circle
                            cx="64"
                            cy="64"
                            r="50"
                            className="stroke-indigo-500 transition-all duration-1000"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray="314.16"
                            strokeDashoffset={314.16 - (314.16 * founderProfile.avg_score) / 100}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center">
                          <span className="text-3xl font-black text-slate-800 dark:text-white leading-none">
                            {founderProfile.avg_score}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest">
                            / 100
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">🧬</span>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Your Founder Profile</h3>
                      </div>
                      
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">{founderProfile.insight}</p>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
                        <div>
                          <span className="text-slate-500 block mb-1 font-semibold uppercase tracking-wider">Weakest Area</span>
                          <span className="inline-block px-2.5 py-1 font-bold bg-red-500/10 text-red-500 border border-red-500/20 rounded-full capitalize">{founderProfile.most_common_weak_criterion}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block mb-1 font-semibold uppercase tracking-wider">Top Stack</span>
                          <div className="flex flex-wrap gap-1">
                            {(founderProfile.most_common_tech_stack || []).slice(0, 3).map((tech, i) => (
                              <span key={i} className="px-2 py-0.5 font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded-full">{tech.split(' - ')[0]}</span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 pt-3 border-t border-slate-200 dark:border-slate-800">
                        → {founderProfile.suggested_focus}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-[#111827]/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-lg shrink-0">
                        {founderProfile.avg_score}
                      </div>
                      <div>
                        <h3 className="text-slate-800 dark:text-white font-bold text-sm">Your founder profile</h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs mt-1">
                          <span className="text-red-500 dark:text-red-400">Weakest: <span className="font-medium lowercase">{founderProfile.most_common_weak_criterion}</span></span>
                          <span className="text-blue-600 dark:text-blue-400">Top stack: <span className="font-medium lowercase">{(founderProfile.most_common_tech_stack || []).slice(0, 2).map(t => t.split(' - ')[0]).join(', ')}</span></span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsFounderProfileExpanded(true)}
                      className="px-4 py-2 text-sm text-slate-700 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 shrink-0 font-semibold"
                    >
                      Read insight <span>→</span>
                    </button>
                  </div>
                )
              ) : founderProfile?.insufficient_data ? (
                <div className="bg-white dark:bg-[#111827]/70 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-5 text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">🧬 Analyze 2+ ideas to unlock your founder profile.</p>
                </div>
              ) : null}

              {/* Continue Where You Left Off */}
              <section>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Continue where you left off</h2>

                {workspacesLoading ? (
                  <div className="flex items-center gap-2 text-slate-500">
                    <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading workspace tracker...</span>
                  </div>
                ) : workspaces.length === 0 ? (
                  <div className="bg-white dark:bg-[#111827]/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-slate-500">
                    <p className="text-lg font-semibold">No active workspace designs yet.</p>
                    <p className="text-sm mt-1">Visit Home to pitch your first startup idea and kick off the pipeline analysis.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {workspaces.map(ws => {
                      const progressPercentage = ws.total_milestones > 0 
                        ? (ws.current_milestone_index / ws.total_milestones) * 100 
                        : 0;

                      return (
                        <div 
                          key={ws.id}
                          className="bg-white dark:bg-[#111827]/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:border-indigo-400 transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex justify-between items-start mb-4">
                              <h3 
                                onClick={() => handleWorkspaceSelect(ws.id, ws.idea)}
                                className="font-extrabold text-slate-800 dark:text-white text-lg line-clamp-1 hover:text-indigo-600 transition-colors cursor-pointer"
                              >
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
                                className="p-1 rounded-lg text-slate-400 hover:text-amber-500 transition-colors shrink-0"
                              >
                                <svg className={`w-5 h-5 ${ws.is_saved ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499c.158-.343.344-.66.52-.947.176.287.362.604.52.947l2.193 4.444a1 1 0 00.758.552l4.904.713c.38.055.53.518.257.788l-3.548 3.46a1 1 0 00-.287.885l.838 4.886c.065.378-.33.666-.67.487l-4.387-2.31a1 1 0 00-.93 0l-4.387 2.31c-.34.179-.735-.109-.67-.487l.838-4.886a1 1 0 00-.287-.885l-3.548-3.46c-.273-.27-.123-.733.257-.788l4.904-.713a1 1 0 00.758-.552l2.193-4.444z" />
                                </svg>
                              </button>
                            </div>
                            
                            {ws.total_milestones > 0 ? (
                              <div className="mb-5">
                                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mb-2">
                                  <div 
                                    className="bg-indigo-600 dark:bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
                                    style={{ width: `${progressPercentage}%` }}
                                  ></div>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{ws.milestone_progress}</p>
                                
                                <div className="mt-4">
                                  <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider mb-1">Next step</p>
                                  <p className="text-sm font-bold text-slate-700 dark:text-white line-clamp-1">{ws.next_step_title}</p>
                                </div>
                              </div>
                            ) : (
                              <p className="text-slate-400 text-xs mb-5">No timeline milestones parsed.</p>
                            )}
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex gap-3">
                            {!ws.telegram_linked && ws.total_milestones > 0 && (
                              <button 
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    const data = await fetchTelegramLink(ws.id);
                                    if (data?.deep_link) window.open(data.deep_link, '_blank');
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-semibold"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.18-.08-.05-.19-.02-.27 0-.11.03-1.84 1.18-5.2 3.45-.49.33-.94.5-1.34.49-.45-.01-1.31-.25-1.95-.46-.79-.26-1.42-.39-1.36-.83.03-.22.35-.45.96-.68 3.75-1.63 6.25-2.71 7.5-3.23 3.56-1.47 4.3-1.73 4.79-1.74.11 0 .35.03.49.14.12.09.15.22.16.31.02.05.02.16.01.27z"/></svg>
                                Connect Telegram
                              </button>
                            )}
                            <button 
                              onClick={() => handleWorkspaceSelect(ws.id, ws.idea)}
                              className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-semibold"
                            >
                              Open plan
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Recent Mentor Dialogues */}
              {!workspacesLoading && workspaces.some(w => w.latest_mentor) && (
                <section>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Recent Mentor Exchanges</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {workspaces.filter(w => w.latest_mentor).slice(0, 2).map(ws => (
                      <div
                        key={ws.id}
                        onClick={() => handleWorkspaceSelect(ws.id, ws.idea)}
                        className="bg-white dark:bg-[#111827]/70 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 rounded-2xl p-5 shadow-sm transition-all cursor-pointer flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-full">
                            For: {ws.idea}
                          </span>
                          <div className="space-y-2 mt-2">
                            <div className="flex gap-2">
                              <span className="font-extrabold text-sm text-slate-400">Q:</span>
                              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 italic line-clamp-2">
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

              {/* Bottom Row: Quick Actions + Needs Attention + Recent Activity */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Quick Actions */}
                <div className="bg-white dark:bg-[#111827]/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    Quick Actions
                  </h3>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => setCurrentView('home')} className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-sm font-semibold text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2 cursor-pointer">
                      <span>✨</span> New Analysis
                    </button>
                    <button onClick={() => setCurrentView('history')} className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-sm font-semibold text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2 cursor-pointer">
                      <span>📚</span> View History
                    </button>
                    <button onClick={() => setCurrentView('settings')} className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-sm font-semibold text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2 cursor-pointer">
                      <span>⚙️</span> Settings
                    </button>
                  </div>
                </div>

                {/* Needs Attention */}
                <div className="bg-white dark:bg-[#111827]/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    Needs Attention
                  </h3>
                  {notifications.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {notifications.map((notif, i) => (
                        <div key={i} className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl">
                          <p className="text-xs font-bold text-amber-800 dark:text-amber-500 line-clamp-1">{notif.idea}</p>
                          <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">{notif.message}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">All caught up! 🎉</p>
                  )}
                </div>

                {/* Recent Activity */}
                <div className="bg-white dark:bg-[#111827]/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Recent Activity
                  </h3>
                  {activity.length > 0 ? (
                    <div className="flex flex-col gap-4">
                      {activity.map((act, i) => (
                        <div key={i} className="flex gap-3 items-start">
                          <div className="mt-0.5 shrink-0">
                            {act.type === 'analyzed' && <span className="text-blue-500">✨</span>}
                            {act.type === 'saved' && <span className="text-amber-500">⭐</span>}
                            {act.type === 'telegram_linked' && <span className="text-indigo-500">📱</span>}
                          </div>
                          <div>
                            <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">{act.message}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{new Date(act.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No recent activity.</p>
                  )}
                </div>
              </div>
            </div>
          )}
          </ErrorBoundary>
        </main>
      )}
    </div>
  );
}
