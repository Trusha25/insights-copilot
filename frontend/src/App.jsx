import React, { useState, useEffect } from 'react';
import { analyzeIdea, toggleSaveWorkspace, fetchSettings, saveSettings, fetchHistoryItem, fetchWorkspaces, fetchTelegramLink, fetchFounderProfile, getNotifications, getActivity, completeMilestone } from './api';
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
import planetHorizonImg from './assets/ChatGPT Image Aug 1, 2026, 11_32_00 AM.png';

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
          <h2 className="text-xl font-bold mb-4">Something broke while rendering: {this.state.error?.message || String(this.state.error)}</h2>
          <pre className="text-left text-xs bg-red-900/10 p-4 rounded-lg overflow-auto mb-4 border border-red-900/20">{this.state.error?.stack}</pre>
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
  const [studentMode, setStudentMode] = useState(() => {
    const saved = localStorage.getItem('student-mode');
    return saved !== null ? saved === 'true' : true;
  });

  const toggleStudentMode = () => {
    setStudentMode(prev => {
      const next = !prev;
      localStorage.setItem('student-mode', String(next));
      return next;
    });
  };

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
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [milestoneCompleting, setMilestoneCompleting] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null);
  const [hoveredChartBar, setHoveredChartBar] = useState(null);
  const [chartTab, setChartTab] = useState('completion'); // 'completion' | 'donut'

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

  const handleMilestoneComplete = async (workspaceId) => {
    setMilestoneCompleting(true);
    try {
      await completeMilestone(workspaceId);
      await loadWorkspaces(); // Refresh workspaces to get new milestone progress
    } catch (e) {
      console.error("Failed to complete milestone:", e);
      setToastMessage(e.message || "Failed to complete milestone");
      setTimeout(() => setToastMessage(""), 3000);
    } finally {
      setMilestoneCompleting(false);
    }
  };

  useEffect(() => {
    if (session && (currentView === 'dashboard' || currentView === 'home') && !result) {
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
        <main className={`flex-1 min-w-0 font-sans transition-colors relative flex flex-col ${currentView === 'home' && !result
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
                onMilestoneComplete={() => handleMilestoneComplete(result.workspace_id)}
                milestoneCompleting={milestoneCompleting}
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
              <div className="relative w-full min-h-full flex flex-col justify-between">
                {/* Full Page Planet Horizon Background Overlay */}
                <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
                  <img
                    src={planetHorizonImg}
                    alt="Planet Horizon Background"
                    className="w-full h-full object-cover object-bottom opacity-65 mix-blend-screen"
                  />
                  {/* Ambient dark gradient overlays to keep text crisp & readable */}
                  <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-primary)]/85 via-[var(--bg-primary)]/30 to-[var(--bg-primary)]/95" />
                </div>

                {/* Immersive Landing Page Header */}
                <div className="flex justify-between items-center w-full relative z-20 mb-8 select-none">
                  <div className="text-[11px] font-bold text-slate-500 tracking-widest uppercase">
                    01 <span className="text-slate-600">/</span> LANDING <span className="text-slate-600">/</span> NEW ANALYSIS
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Credits Pill */}
                    <div className="flex items-center gap-2 px-3.5 py-1.5 bg-[var(--bg-surface)] border border-[var(--color-border)] rounded-xl text-slate-200 text-xs font-semibold shadow-inner backdrop-blur-md">
                      <svg className="w-3.5 h-3.5 text-[var(--color-accent)] drop-shadow-[0_0_4px_var(--color-accent-glow)] animate-float" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L2 12l10 10 10-10L12 2z" />
                      </svg>
                      <span className="font-extrabold tracking-tight">12,450</span>
                    </div>
                    {/* Notification Bell */}
                    <div className="relative z-50">
                      <button
                        onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                        className="relative p-2 bg-[var(--bg-surface)] border border-[var(--color-border)] rounded-xl text-slate-400 hover:text-slate-200 transition-colors shadow-sm backdrop-blur-md cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        {notifications.length > 0 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">{notifications.length}</span>
                        )}
                      </button>
                      {notifDropdownOpen && (
                        <div className="absolute right-0 top-full mt-2 w-80 bg-[var(--bg-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl">
                          <div className="p-3 border-b border-[var(--color-border)] flex items-center justify-between">
                            <h4 className="text-sm font-bold text-white">Notifications</h4>
                            <button onClick={() => setNotifDropdownOpen(false)} className="text-slate-500 hover:text-white transition-colors cursor-pointer">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                          <div className="max-h-80 overflow-y-auto">
                            {notifications.length > 0 ? notifications.slice(0, 5).map((notif, i) => (
                              <div key={i} className="p-4 border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-accent-bg)]/10 transition-colors cursor-pointer" onClick={() => { setNotifDropdownOpen(false); }}>
                                <div className="flex items-start gap-3">
                                  <span className="mt-0.5 shrink-0 text-lg">
                                    {notif.type === 'needs_telegram' && '📱'}
                                    {notif.type === 'stalled_milestone' && '⏳'}
                                    {notif.type === 'new_sources' && '🔍'}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-white truncate">{notif.idea}</p>
                                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{notif.message}</p>
                                  </div>
                                </div>
                              </div>
                            )) : (
                              <div className="p-6 text-center">
                                <p className="text-sm text-slate-500">All caught up! 🎉</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
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
                  <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4 leading-[1.15] max-w-3xl text-center mx-auto select-none">
                    Turn Ideas into <span className="text-[var(--accent-start)]">Production-</span><span className="text-[var(--accent-mid)]">Ready</span> Projects.
                  </h1>

                  {/* Subtitle */}
                  <p className="text-slate-600 dark:text-slate-300 text-sm md:text-base max-w-xl text-center mx-auto mb-8 leading-relaxed font-medium select-none">
                    Our multi-agent AI system analyzes, validates, and builds execution blueprints <span className="text-[var(--accent-mid)] font-semibold">to turn your raw concepts into real, buildable projects.</span>
                  </p>

                  {status === "loading" ? (
                    <div className="w-full max-w-3xl mx-auto p-8 theme-card rounded-2xl border border-[var(--border-strong)] shadow-2xl relative z-20 text-center">
                      <div className="flex flex-col items-center gap-6">
                        <div className="relative">
                          {/* Pulsing ring indicator */}
                          <div className="absolute inset-0 rounded-full border-4 border-[var(--accent-mid)]/20 animate-ping"></div>
                          <div className="w-16 h-16 border-4 border-[var(--accent-mid)] border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold theme-text-title mb-2">Analyzing Your Project Idea</h3>
                          <p className="text-[var(--accent-mid)] text-xs font-semibold uppercase tracking-wider bg-[var(--color-accent-bg)] px-3 py-1 rounded-full border border-[var(--border-subtle)] inline-block mb-4">
                            Pipeline Active ({elapsedTime})
                          </p>
                          <p className="theme-text-muted text-sm leading-relaxed min-h-[48px] px-4">
                            {getProgressText()}
                          </p>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full">
                          <div className="w-full bg-[var(--bg-secondary)] rounded-full h-2 border border-[var(--border-subtle)] overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-[var(--accent-start)] via-[var(--accent-mid)] to-[var(--accent-end)] h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, (elapsedSecs / 20) * 100)}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-[11px] font-bold text-[var(--text-secondary)] mt-2 tracking-wide">
                            <span>INITIALIZING PIPELINE</span>
                            <span>{Math.round(Math.min(100, (elapsedSecs / 20) * 100))}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {status === "error" && (
                        <div className="w-full max-w-3xl mx-auto p-4 bg-red-950/20 text-red-400 border border-red-900/50 rounded-xl mb-4 text-sm font-medium">
                          {errorMessage}
                        </div>
                      )}

                      {/* Integrated Premium Glass Prompt Card */}
                      <div className="w-full max-w-3xl mx-auto theme-card p-4 sm:p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] backdrop-blur-xl shadow-md transition-all duration-300 focus-within:border-[var(--accent-mid)] focus-within:shadow-[0_0_30px_var(--color-accent-glow)] group">

                        {/* Prompt Helper Chips Strip */}
                        <div className="flex flex-wrap items-center gap-2 mb-3 pb-3 border-b border-[var(--border-subtle)] text-xs">
                          <span className="text-[var(--text-secondary)] font-semibold text-[11px] uppercase tracking-wider mr-1">Quick Prompts:</span>
                          <button
                            type="button"
                            onClick={() => setIdea("An AI-powered EdTech study companion that generates adaptive quizzes and summarizes lecture recordings into actionable study cards.")}
                            className="px-2.5 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all cursor-pointer text-[11px] font-medium"
                          >
                            🎓 AI Study Companion
                          </button>
                          <button
                            type="button"
                            onClick={() => setIdea("A developer tool that automatically reviews pull requests for security flaws and suggests performance optimizations.")}
                            className="px-2.5 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all cursor-pointer text-[11px] font-medium"
                          >
                            🚀 AI Code Reviewer
                          </button>
                          <button
                            type="button"
                            onClick={() => setIdea("A real-time customer support copilot for e-commerce brands that automates refund requests and order tracking.")}
                            className="px-2.5 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all cursor-pointer text-[11px] font-medium"
                          >
                            ⚡ E-commerce Copilot
                          </button>
                        </div>

                        {/* Main Textarea */}
                        <textarea
                          maxLength={2000}
                          className="w-full h-32 bg-transparent text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none text-base resize-none leading-relaxed p-0 border-0"
                          placeholder="Describe your project concept, target audience, and key features in detail..."
                          value={idea}
                          onChange={(e) => setIdea(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleAnalyze();
                            }
                          }}
                        />

                        {/* Card Bottom Toolbar */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-[var(--border-subtle)] select-none">
                          {/* Left Status Indicator */}
                          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
                            <span className="w-2 h-2 rounded-full bg-[var(--accent-end)] animate-pulse"></span>
                            <span>4 AI Agents Active</span>
                            <span className="opacity-40">•</span>
                            <span>{idea.length} / 2000 chars</span>
                          </div>

                          {/* Submit Button */}
                          <button
                            onClick={handleAnalyze}
                            disabled={!idea.trim()}
                            className="theme-btn-solid text-xs py-2.5 px-5 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                          >
                            <svg className="w-4 h-4 text-white dark:text-[#0B0F19]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span className="text-white dark:text-[#0B0F19]">Run AI Analysis</span>
                            <span className="text-[10px] opacity-75 font-normal ml-1 hidden sm:inline">(Ctrl + ↵)</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Bottom 5 Stat Cards Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 w-full max-w-4xl mt-8 relative z-20 select-none">
                    <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] backdrop-blur-xl flex items-center gap-3 shadow-sm hover:border-[var(--border-strong)] transition-all">
                      <div className="w-9 h-9 rounded-xl bg-[var(--color-accent-bg)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent-start)] shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      </div>
                      <div className="text-left min-w-0">
                        <div className="text-sm font-extrabold theme-text-title leading-none">4</div>
                        <div className="text-[10px] font-bold text-[var(--accent-start)] uppercase tracking-wider mt-1 truncate">AI AGENTS</div>
                        <div className="text-[9px] theme-text-muted truncate">Active</div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] backdrop-blur-xl flex items-center gap-3 shadow-sm hover:border-[var(--border-strong)] transition-all">
                      <div className="w-9 h-9 rounded-xl bg-[var(--color-accent-bg)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent-mid)] shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s-8-1.79-8-4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                      </div>
                      <div className="text-left min-w-0">
                        <div className="text-sm font-extrabold theme-text-title leading-none">10+</div>
                        <div className="text-[10px] font-bold text-[var(--accent-mid)] uppercase tracking-wider mt-1 truncate">DATA SOURCES</div>
                        <div className="text-[9px] theme-text-muted truncate">Integrated</div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] backdrop-blur-xl flex items-center gap-3 shadow-sm hover:border-[var(--border-strong)] transition-all">
                      <div className="w-9 h-9 rounded-xl bg-[var(--color-accent-bg)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent-end)] shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                      </div>
                      <div className="text-left min-w-0">
                        <div className="text-sm font-extrabold theme-text-title leading-none">98%</div>
                        <div className="text-[10px] font-bold text-[var(--accent-end)] uppercase tracking-wider mt-1 truncate">ACCURACY</div>
                        <div className="text-[9px] theme-text-muted truncate">Prediction</div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] backdrop-blur-xl flex items-center gap-3 shadow-sm hover:border-[var(--border-strong)] transition-all">
                      <div className="w-9 h-9 rounded-xl bg-[var(--color-accent-bg)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent-start)] shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                      </div>
                      <div className="text-left min-w-0">
                        <div className="text-sm font-extrabold theme-text-title leading-none">500+</div>
                        <div className="text-[10px] font-bold text-[var(--accent-start)] uppercase tracking-wider mt-1 truncate">PROJECTS</div>
                        <div className="text-[9px] theme-text-muted truncate">Built</div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] backdrop-blur-xl flex items-center gap-3 shadow-sm hover:border-[var(--border-strong)] transition-all">
                      <div className="w-9 h-9 rounded-xl bg-[var(--color-accent-bg)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent-mid)] shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                      </div>
                      <div className="text-left min-w-0">
                        <div className="text-sm font-extrabold theme-text-title leading-none">10k+</div>
                        <div className="text-[10px] font-bold text-[var(--accent-mid)] uppercase tracking-wider mt-1 truncate">USERS</div>
                        <div className="text-[9px] theme-text-muted truncate">Active</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {currentView === 'dashboard' && (
              /* ═══════════════════════════════════════════════════════════
                 BUILDER DASHBOARD — Premium Production SaaS Redesign
                 All existing features preserved. Visual quality upgraded.
                 ═══════════════════════════════════════════════════════════ */
              <div className="space-y-5 w-full fade-slide-in">

                {/* ── DASHBOARD GREETING + CONTROLS ── */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-[rgba(255,255,255,0.06)]">
                  <div>
                    <h1 className="dashboard-greeting">
                      Builder Dashboard
                      <span className="ml-2 text-2xl">⚡</span>
                    </h1>
                    <p className="dashboard-subline">Manage and execute your startup concepts</p>
                  </div>

                  <div className="flex items-center gap-2.5 self-end sm:self-auto">
                    {/* System Live Status Chip */}
                    <div className="live-chip select-none">
                      <span className="live-dot" />
                      System Ready
                    </div>

                    {/* Student Mode Toggle */}
                    <button
                      onClick={toggleStudentMode}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold transition-all cursor-pointer select-none ${
                        studentMode
                          ? 'bg-[rgba(143,234,138,0.1)] border-[rgba(143,234,138,0.35)] text-[#8FEA8A] shadow-[0_0_12px_rgba(143,234,138,0.2)]'
                          : 'bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] text-slate-400 hover:text-white hover:border-[rgba(255,255,255,0.16)]'
                      }`}
                      title="Toggle Student Friendly Mode"
                    >
                      <span>🎓</span>
                      <span>Student Mode</span>
                      {/* Pill switch */}
                      <div className={`w-7 h-3.5 rounded-full relative transition-colors ${studentMode ? 'bg-[#8FEA8A]' : 'bg-slate-700'}`}>
                        <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white shadow-sm transition-all ${studentMode ? 'left-[calc(100%-12px)]' : 'left-0.5'}`} />
                      </div>
                    </button>

                    {/* Notification Bell */}
                    <div className="relative z-50">
                      <button
                        onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                        aria-label="Toggle notifications"
                        className="relative p-2 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl text-slate-400 hover:text-white hover:border-[rgba(255,255,255,0.16)] transition-all cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        {notifications.length > 0 && (
                          <span className="notif-badge absolute -top-1 -right-1">{notifications.length}</span>
                        )}
                      </button>
                      {notifDropdownOpen && (
                        <div className="absolute right-0 top-full mt-2 w-80 bg-[#111827] border border-[rgba(255,255,255,0.1)] rounded-2xl overflow-hidden z-[100] shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl">
                          <div className="p-3.5 border-b border-[rgba(255,255,255,0.07)] flex items-center justify-between">
                            <h4 className="text-sm font-bold text-white">Notifications</h4>
                            <button onClick={() => setNotifDropdownOpen(false)} aria-label="Close notifications" className="text-slate-500 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-[rgba(255,255,255,0.07)]">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                          <div className="max-h-72 overflow-y-auto">
                            {notifications.length > 0 ? notifications.slice(0, 5).map((notif, i) => (
                              <div key={i} className="p-3.5 border-b border-[rgba(255,255,255,0.05)] last:border-0 hover:bg-[rgba(99,215,232,0.05)] transition-colors cursor-pointer" onClick={() => { setNotifDropdownOpen(false); }}>
                                <div className="flex items-start gap-3">
                                  <span className="mt-0.5 shrink-0 text-base">
                                    {notif.type === 'needs_telegram' && '📱'}
                                    {notif.type === 'stalled_milestone' && '⏳'}
                                    {notif.type === 'new_sources' && '🔍'}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-white truncate">{notif.idea}</p>
                                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{notif.message}</p>
                                  </div>
                                </div>
                              </div>
                            )) : (
                              <div className="p-6 text-center">
                                <p className="text-sm text-slate-500">All caught up! 🎉</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── STUDENT MODE: ACHIEVEMENTS STRIP ── */}
                {studentMode && (
                  <div className="flex flex-wrap items-center gap-2 p-3.5 rounded-xl bg-[rgba(143,234,138,0.05)] border border-[rgba(143,234,138,0.18)] fade-slide-in">
                    <span className="section-label mr-1">Founder Achievements:</span>
                    {[
                      { icon: '🔥', label: '3-Day Building Streak' },
                      { icon: '🏆', label: 'Milestone Champion' },
                      { icon: '🛡️', label: 'Risk Balanced Portfolio' },
                    ].map((badge, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[rgba(143,234,138,0.08)] border border-[rgba(143,234,138,0.22)] text-[#8FEA8A] text-[11px] font-bold">
                        {badge.icon} {badge.label}
                      </span>
                    ))}
                  </div>
                )}

                {/* ── STUDENT MODE: AI MENTOR CARD ── */}
                {studentMode && (
                  <div className="premium-card p-4 border-l-[3px] border-l-[#63D7E8] flex items-start gap-4 fade-slide-in">
                    <div className="w-9 h-9 rounded-xl bg-[rgba(99,215,232,0.12)] border border-[rgba(99,215,232,0.25)] text-[#63D7E8] flex items-center justify-center text-lg shrink-0">
                      💡
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">AI Mentor Advice</h4>
                        <span className="inline-block bg-[rgba(99,215,232,0.1)] border border-[rgba(99,215,232,0.25)] text-[#63D7E8] text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">Student Tips</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {founderProfile && founderProfile.avg_score
                          ? `Your average score is ${founderProfile.avg_score}/100 across active concepts. Focus on validating market sizing and problem clarity in your next pitch.`
                          : "Analyze at least 2 startup ideas to receive personalized coaching tips on your weak spots!"}
                      </p>
                    </div>
                  </div>
                )}

                {/* ── KPI STAT CARDS STRIP ── */}
                {!workspacesLoading && workspaces.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                    {/* Active Plans */}
                    <div className="kpi-card fade-slide-in fade-slide-in-1">
                      <div className="kpi-accent-bar bg-gradient-to-b from-[#8FEA8A] to-[#63D7E8]" />
                      <div className="flex justify-between items-start pl-3">
                        <div>
                          <p className="kpi-label">Active Plans</p>
                          <p className="kpi-number">{workspaces.length}</p>
                          {studentMode && <p className="text-[10px] text-slate-500 mt-1.5">Running concepts</p>}
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-[rgba(143,234,138,0.1)] border border-[rgba(143,234,138,0.2)] flex items-center justify-center text-[#8FEA8A] shrink-0">
                          <svg className="w-4.5 h-4.5 w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </div>
                      </div>
                    </div>

                    {/* Avg Score */}
                    <div className="kpi-card fade-slide-in fade-slide-in-2">
                      <div className="kpi-accent-bar bg-gradient-to-b from-[#63D7E8] to-[#4C8CFF]" />
                      <div className="flex justify-between items-start pl-3">
                        <div>
                          <p className="kpi-label">Avg Score</p>
                          <p className="kpi-number">{founderProfile ? founderProfile.avg_score : '—'}</p>
                          {studentMode && <p className="text-[10px] text-[#63D7E8] mt-1.5 font-semibold">Above average</p>}
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-[rgba(99,215,232,0.1)] border border-[rgba(99,215,232,0.2)] flex items-center justify-center text-[#63D7E8] shrink-0">
                          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        </div>
                      </div>
                    </div>

                    {/* Favorites */}
                    <div className="kpi-card fade-slide-in fade-slide-in-3">
                      <div className="kpi-accent-bar bg-gradient-to-b from-[#4C8CFF] to-[#63D7E8]" />
                      <div className="flex justify-between items-start pl-3">
                        <div>
                          <p className="kpi-label">Favorites</p>
                          <p className="kpi-number">{workspaces.filter(w => w.is_saved).length}</p>
                          {studentMode && <p className="text-[10px] text-slate-500 mt-1.5">Starred ideas</p>}
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-[rgba(76,140,255,0.1)] border border-[rgba(76,140,255,0.2)] flex items-center justify-center text-[#4C8CFF] shrink-0">
                          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499c.158-.343.344-.66.52-.947.176.287.362.604.52.947l2.193 4.444a1 1 0 00.758.552l4.904.713c.38.055.53.518.257.788l-3.548 3.46a1 1 0 00-.287.885l.838 4.886c.065.378-.33.666-.67.487l-4.387-2.31a1 1 0 00-.93 0l-4.387 2.31c-.34.179-.735-.109-.67-.487l.838-4.886a1 1 0 00-.287-.885l-3.548-3.46c-.273-.27-.123-.733.257-.788l4.904-.713a1 1 0 00.758-.552l2.193-4.444z" /></svg>
                        </div>
                      </div>
                    </div>

                    {/* Needs Attention */}
                    <div className="kpi-card fade-slide-in fade-slide-in-4" style={{ borderColor: 'rgba(217,164,65,0.25)' }}>
                      <div className="kpi-accent-bar bg-gradient-to-b from-[#D9A441] to-[#F59E0B]" />
                      <div className="flex justify-between items-start pl-3">
                        <div>
                          <p className="kpi-label" style={{ color: 'rgba(217,164,65,0.8)' }}>Needs Attention</p>
                          <p className="kpi-number" style={{ color: '#D9A441' }}>
                            {workspaces.filter(w => !w.telegram_linked && w.total_milestones > 0).length}
                          </p>
                          {studentMode && <p className="text-[10px] text-[#D9A441]/70 mt-1.5 font-medium">Pending Telegram sync</p>}
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-[rgba(217,164,65,0.1)] border border-[rgba(217,164,65,0.2)] flex items-center justify-center text-[#D9A441] shrink-0">
                          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── PROJECT COMPLETION CHARTS ── */}
                {!workspacesLoading && workspaces.length > 0 && (() => {
                  // Compute per-workspace completion %
                  const chartData = workspaces.map(ws => ({
                    id: ws.id,
                    label: ws.idea.length > 28 ? ws.idea.slice(0, 28) + '…' : ws.idea,
                    fullLabel: ws.idea,
                    pct: ws.total_milestones > 0
                      ? Math.round((ws.current_milestone_index / ws.total_milestones) * 100)
                      : 0,
                    milestones: ws.milestone_progress || '—',
                    tag: ws.tags && ws.tags[0] ? ws.tags[0] : 'AI Startup',
                    saved: ws.is_saved,
                  }));

                  // Overall portfolio completion %
                  const totalMilestones = workspaces.reduce((s, w) => s + (w.total_milestones || 0), 0);
                  const doneMilestones  = workspaces.reduce((s, w) => s + (w.current_milestone_index || 0), 0);
                  const overallPct = totalMilestones > 0 ? Math.round((doneMilestones / totalMilestones) * 100) : 0;

                  // SVG donut params
                  const R = 56, CX = 72, CY = 72;
                  const circ = 2 * Math.PI * R;
                  const dashFilled = (overallPct / 100) * circ;

                  return (
                    <div className="premium-card p-5 fade-slide-in">
                      {/* Chart Header + Tab Toggle */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                        <div>
                          <h3 className="text-sm font-bold text-white">Project Completion</h3>
                          <p className="section-label mt-0.5">Based on real milestone data</p>
                        </div>
                        {/* Tab switcher */}
                        <div className="flex gap-1 p-1 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] self-start sm:self-auto">
                          {[
                            { id: 'completion', label: 'Bar Chart' },
                            { id: 'donut', label: 'Portfolio' },
                          ].map(tab => (
                            <button
                              key={tab.id}
                              onClick={() => setChartTab(tab.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                chartTab === tab.id
                                  ? 'bg-[rgba(99,215,232,0.15)] text-[#63D7E8] border border-[rgba(99,215,232,0.3)]'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* ── BAR CHART TAB ── */}
                      {chartTab === 'completion' && (
                        <div className="space-y-3">
                          {chartData.map((item, i) => {
                            const isHovered = hoveredChartBar === item.id;
                            // Gradient color based on completion %
                            const barColor = item.pct >= 75
                              ? 'from-[#8FEA8A] to-[#63D7E8]'
                              : item.pct >= 40
                                ? 'from-[#63D7E8] to-[#4C8CFF]'
                                : 'from-[#D9A441] to-[#F59E0B]';
                            const glowColor = item.pct >= 75
                              ? 'rgba(143,234,138,0.4)'
                              : item.pct >= 40
                                ? 'rgba(99,215,232,0.4)'
                                : 'rgba(217,164,65,0.4)';
                            return (
                              <div
                                key={item.id}
                                className="group cursor-pointer"
                                onMouseEnter={() => setHoveredChartBar(item.id)}
                                onMouseLeave={() => setHoveredChartBar(null)}
                                onClick={() => handleWorkspaceSelect(item.id, item.fullLabel)}
                              >
                                <div className="flex items-center justify-between mb-1.5">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                      item.pct >= 75 ? 'bg-[#8FEA8A]' : item.pct >= 40 ? 'bg-[#63D7E8]' : 'bg-[#D9A441]'
                                    }`} style={{ boxShadow: `0 0 5px ${glowColor}` }} />
                                    <span
                                      className={`text-xs font-semibold truncate transition-colors ${
                                        isHovered ? 'text-[#63D7E8]' : 'text-slate-300'
                                      }`}
                                      title={item.fullLabel}
                                    >
                                      {item.label}
                                    </span>
                                    {item.saved && (
                                      <span className="text-[#4C8CFF] text-[9px] shrink-0">★</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {/* Tooltip */}
                                    {isHovered && (
                                      <span className="text-[10px] text-slate-400 font-medium">{item.milestones}</span>
                                    )}
                                    <span
                                      className={`text-xs font-black tabular-nums transition-all ${
                                        item.pct >= 75 ? 'text-[#8FEA8A]'
                                        : item.pct >= 40 ? 'text-[#63D7E8]'
                                        : 'text-[#D9A441]'
                                      } ${isHovered ? 'scale-110' : ''}`}
                                    >
                                      {item.pct}%
                                    </span>
                                  </div>
                                </div>
                                {/* Bar track */}
                                <div
                                  className={`w-full h-2.5 rounded-full overflow-hidden transition-all duration-200 ${
                                    isHovered ? 'bg-[rgba(255,255,255,0.08)]' : 'bg-[rgba(255,255,255,0.05)]'
                                  }`}
                                >
                                  <div
                                    className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700 relative`}
                                    style={{
                                      width: `${item.pct}%`,
                                      boxShadow: isHovered ? `0 0 10px ${glowColor}` : 'none',
                                    }}
                                  >
                                    {/* Glowing leading dot */}
                                    {item.pct > 4 && (
                                      <span
                                        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-[#0B0F19] transition-all"
                                        style={{
                                          background: item.pct >= 75 ? '#8FEA8A' : item.pct >= 40 ? '#63D7E8' : '#D9A441',
                                          boxShadow: isHovered ? `0 0 10px ${glowColor}, 0 0 20px ${glowColor}` : `0 0 6px ${glowColor}`,
                                        }}
                                      />
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {/* Legend */}
                          <div className="flex items-center gap-4 pt-3 border-t border-[rgba(255,255,255,0.06)] mt-2">
                            {[
                              { color: '#8FEA8A', glow: 'rgba(143,234,138,0.5)', label: '≥ 75% Complete' },
                              { color: '#63D7E8', glow: 'rgba(99,215,232,0.5)', label: '40–74%' },
                              { color: '#D9A441', glow: 'rgba(217,164,65,0.5)', label: '< 40%' },
                            ].map(l => (
                              <div key={l.label} className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ background: l.color, boxShadow: `0 0 5px ${l.glow}` }} />
                                <span className="text-[10px] text-slate-500">{l.label}</span>
                              </div>
                            ))}
                            <span className="ml-auto text-[10px] text-slate-600">Click any row to open plan →</span>
                          </div>
                        </div>
                      )}

                      {/* ── DONUT CHART TAB ── */}
                      {chartTab === 'donut' && (
                        <div className="flex flex-col sm:flex-row items-center gap-8">
                          {/* Donut SVG */}
                          <div className="relative shrink-0 group cursor-default">
                            <svg width={CX * 2} height={CY * 2} className="transform -rotate-90">
                              <defs>
                                <linearGradient id="donutGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                  <stop offset="0%" stopColor="#8FEA8A" />
                                  <stop offset="50%" stopColor="#63D7E8" />
                                  <stop offset="100%" stopColor="#4C8CFF" />
                                </linearGradient>
                                <filter id="donutGlow">
                                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                                  <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                                </filter>
                              </defs>
                              {/* Background ring */}
                              <circle
                                cx={CX} cy={CY} r={R}
                                fill="none"
                                stroke="rgba(30,41,59,0.9)"
                                strokeWidth="12"
                              />
                              {/* Filled arc */}
                              <circle
                                cx={CX} cy={CY} r={R}
                                fill="none"
                                stroke="url(#donutGrad)"
                                strokeWidth="12"
                                strokeLinecap="round"
                                strokeDasharray={`${dashFilled} ${circ}`}
                                filter="url(#donutGlow)"
                                className="transition-all duration-1000"
                              />
                              {/* Inner mini rings for visual depth */}
                              <circle
                                cx={CX} cy={CY} r={R - 18}
                                fill="none"
                                stroke="rgba(99,215,232,0.06)"
                                strokeWidth="1"
                              />
                              <circle
                                cx={CX} cy={CY} r={R + 18}
                                fill="none"
                                stroke="rgba(99,215,232,0.04)"
                                strokeWidth="1"
                              />
                            </svg>
                            {/* Center label */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
                              <span className="text-3xl font-black text-white leading-none">{overallPct}%</span>
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Portfolio</span>
                            </div>
                          </div>

                          {/* Right: Per-project mini breakdown */}
                          <div className="flex-1 min-w-0 space-y-3 w-full">
                            <p className="section-label mb-3">Per-Project Breakdown</p>
                            {chartData.map(item => (
                              <div
                                key={item.id}
                                className="flex items-center gap-3 group cursor-pointer hover:bg-[rgba(255,255,255,0.03)] rounded-xl p-1.5 -mx-1.5 transition-colors"
                                onClick={() => handleWorkspaceSelect(item.id, item.fullLabel)}
                                onMouseEnter={() => setHoveredChartBar(item.id)}
                                onMouseLeave={() => setHoveredChartBar(null)}
                              >
                                {/* Mini donut */}
                                <svg width="32" height="32" className="shrink-0 -rotate-90">
                                  <circle cx="16" cy="16" r="12" fill="none" stroke="rgba(30,41,59,0.9)" strokeWidth="4" />
                                  <circle
                                    cx="16" cy="16" r="12" fill="none"
                                    stroke={item.pct >= 75 ? '#8FEA8A' : item.pct >= 40 ? '#63D7E8' : '#D9A441'}
                                    strokeWidth="4" strokeLinecap="round"
                                    strokeDasharray={`${(item.pct / 100) * 75.4} 75.4`}
                                    style={{ filter: `drop-shadow(0 0 3px ${item.pct >= 75 ? '#8FEA8A' : item.pct >= 40 ? '#63D7E8' : '#D9A441'})` }}
                                    className="transition-all duration-700"
                                  />
                                </svg>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs font-semibold truncate transition-colors ${
                                    hoveredChartBar === item.id ? 'text-[#63D7E8]' : 'text-slate-300'
                                  }`}>{item.label}</p>
                                  <p className="text-[10px] text-slate-500">{item.milestones}</p>
                                </div>
                                <span className={`text-sm font-black shrink-0 ${
                                  item.pct >= 75 ? 'text-[#8FEA8A]' : item.pct >= 40 ? 'text-[#63D7E8]' : 'text-[#D9A441]'
                                }`}>{item.pct}%</span>
                              </div>
                            ))}

                            <div className="pt-3 border-t border-[rgba(255,255,255,0.06)] flex items-center justify-between">
                              <span className="text-[10px] text-slate-500">
                                {doneMilestones} of {totalMilestones} total milestones complete
                              </span>
                              <span className={`text-xs font-bold ${
                                overallPct >= 75 ? 'text-[#8FEA8A]' : overallPct >= 40 ? 'text-[#63D7E8]' : 'text-[#D9A441]'
                              }`}>
                                {overallPct >= 75 ? '🚀 On Track' : overallPct >= 40 ? '⚡ In Progress' : '🎯 Early Stage'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* ── FOUNDER PROFILE ── */}
                {founderProfile && !founderProfile.insufficient_data ? (
                  isFounderProfileExpanded ? (
                    <div className="premium-card p-5 flex flex-col sm:flex-row items-center gap-6 justify-between relative">
                      <button
                        onClick={() => setIsFounderProfileExpanded(false)}
                        aria-label="Collapse Founder Profile"
                        className="absolute top-4 right-4 p-1.5 text-slate-500 hover:text-white transition-colors rounded-lg hover:bg-[rgba(255,255,255,0.07)] cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>

                      {/* Circular Score Gauge */}
                      <div className="flex flex-col items-center justify-center shrink-0">
                        <p className="section-label mb-3">Avg Score</p>
                        <div className="relative w-28 h-28 flex items-center justify-center score-ring-glow">
                          <svg className="w-28 h-28 transform -rotate-90">
                            <circle cx="56" cy="56" r="44" stroke="rgba(30,41,59,0.8)" strokeWidth="7" fill="transparent" />
                            <circle
                              cx="56" cy="56" r="44"
                              stroke="url(#scoreGradient)" strokeWidth="7"
                              fill="transparent"
                              strokeDasharray="276.46"
                              strokeDashoffset={276.46 - (276.46 * founderProfile.avg_score) / 100}
                              strokeLinecap="round"
                              className="transition-all duration-1000"
                            />
                            <defs>
                              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#8FEA8A" />
                                <stop offset="100%" stopColor="#63D7E8" />
                              </linearGradient>
                            </defs>
                          </svg>
                          <div className="absolute flex flex-col items-center justify-center">
                            <span className="text-2xl font-black text-white leading-none">{founderProfile.avg_score}</span>
                            <span className="text-[9px] font-bold text-slate-500 mt-0.5 uppercase tracking-widest">/ 100</span>
                          </div>
                        </div>
                      </div>

                      {/* Profile Details */}
                      <div className="flex-1 min-w-0 pr-8">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-base">🧬</span>
                          <h3 className="text-base font-bold text-white">Your Founder Profile</h3>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed mb-4">{founderProfile.insight}</p>
                        <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                          <div className="p-2.5 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
                            <span className="section-label block mb-1.5">Weakest Skill</span>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[rgba(217,164,65,0.1)] border border-[rgba(217,164,65,0.25)] text-[#D9A441] font-bold text-[11px] capitalize">
                              {founderProfile.most_common_weak_criterion}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
                            <span className="section-label block mb-1.5">Top Stack</span>
                            <div className="flex flex-wrap gap-1">
                              {(founderProfile.most_common_tech_stack || []).slice(0, 3).map((tech, i) => (
                                <span key={i} className="inline-block bg-[rgba(99,215,232,0.1)] border border-[rgba(99,215,232,0.22)] text-[#63D7E8] text-[10px] font-bold px-2 py-0.5 rounded-md">{tech.split(' - ')[0]}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="pt-3 border-t border-[rgba(255,255,255,0.06)]">
                          <p className="text-xs font-semibold" style={{ background: 'linear-gradient(90deg,#8FEA8A,#63D7E8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            → {founderProfile.suggested_focus}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="premium-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        {/* Score badge */}
                        <div className="w-11 h-11 rounded-full flex items-center justify-center font-black text-sm text-[#0B0F19] shrink-0" style={{ background: 'linear-gradient(135deg,#8FEA8A,#63D7E8,#4C8CFF)', boxShadow: '0 0 16px rgba(99,215,232,0.3)' }}>
                          {founderProfile.avg_score}
                        </div>
                        <div>
                          <h3 className="text-white font-bold text-sm">Your Founder Profile</h3>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs mt-1 text-slate-400">
                            <span>Weak: <span className="font-semibold text-[#D9A441] lowercase">{founderProfile.most_common_weak_criterion}</span></span>
                            <span className="opacity-30">•</span>
                            <span>Stack: <span className="font-semibold text-white lowercase">{(founderProfile.most_common_tech_stack || []).slice(0, 2).map(t => t.split(' - ')[0]).join(', ')}</span></span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsFounderProfileExpanded(true)}
                        className="theme-btn-outline text-xs px-3.5 py-2 shrink-0 flex items-center gap-1.5 hover:border-[rgba(99,215,232,0.4)] hover:text-[#63D7E8]"
                      >
                        Read insight <span className="text-[#63D7E8]">→</span>
                      </button>
                    </div>
                  )
                ) : founderProfile?.insufficient_data ? (
                  <div className="premium-card p-5 text-center border-dashed">
                    <div className="w-10 h-10 rounded-full bg-[rgba(99,215,232,0.08)] border border-[rgba(99,215,232,0.15)] flex items-center justify-center text-xl mx-auto mb-3">🧬</div>
                    <p className="text-sm font-semibold text-white mb-1">Founder Profile Locked</p>
                    <p className="text-xs text-slate-400">Pitch 2+ startup concepts to unlock your founder profile analysis.</p>
                  </div>
                ) : null}

                {/* ── PORTFOLIO RISK DISTRIBUTION ── */}
                {founderProfile && !founderProfile.insufficient_data && workspaces.length >= 1 && founderProfile.risk_distribution && (
                  <div className="premium-card p-5">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-sm font-bold text-white">Portfolio Risk Distribution</h3>
                        <p className="section-label mt-0.5">Across {workspaces.length} analyzed concepts</p>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#8FEA8A] shadow-[0_0_4px_#8FEA8A]" />
                        <span className="text-[10px] text-slate-400 font-semibold">Portfolio Health</span>
                      </div>
                    </div>

                    {/* Segmented bar */}
                    <div className="flex gap-0.5 h-3 w-full rounded-full overflow-hidden bg-[rgba(255,255,255,0.04)]">
                      <div
                        className="h-full bg-gradient-to-r from-[#8FEA8A] to-[#63D7E8] rounded-full transition-all duration-700"
                        style={{ width: `${((founderProfile.risk_distribution.low || 0) / workspaces.length) * 100}%` }}
                        title={`Low Risk: ${founderProfile.risk_distribution.low || 0}`}
                      />
                      <div
                        className="h-full bg-gradient-to-r from-[#D9A441] to-[#F59E0B] transition-all duration-700"
                        style={{ width: `${((founderProfile.risk_distribution.medium || 0) / workspaces.length) * 100}%` }}
                        title={`Medium Risk: ${founderProfile.risk_distribution.medium || 0}`}
                      />
                      <div
                        className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-700"
                        style={{ width: `${((founderProfile.risk_distribution.high || 0) / workspaces.length) * 100}%` }}
                        title={`High Risk: ${founderProfile.risk_distribution.high || 0}`}
                      />
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      {[
                        { label: 'Low Risk', count: founderProfile.risk_distribution.low || 0, color: '#8FEA8A' },
                        { label: 'Medium Risk', count: founderProfile.risk_distribution.medium || 0, color: '#D9A441' },
                        { label: 'High Risk', count: founderProfile.risk_distribution.high || 0, color: '#EF4444' },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color, boxShadow: `0 0 5px ${item.color}` }} />
                          <span className="text-[11px] text-slate-400">{item.label}: <strong className="text-white">{item.count}</strong></span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── "CONTINUE WHERE YOU LEFT OFF" PLANS ── */}
                <section>
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-3">
                    <div>
                      <h2 className="text-base font-bold text-white">Continue where you left off</h2>
                      {studentMode && <p className="text-xs text-slate-400 mt-0.5">Track your active startup plans, milestones, and next actions</p>}
                    </div>

                    {/* Tag filters */}
                    {(() => {
                      const allTags = Array.from(new Set(workspaces.flatMap(ws => ws.tags || []))).sort();
                      if (allTags.length === 0) return null;
                      return (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="section-label mr-1">Filter:</span>
                          {allTags.map(tag => (
                            <button
                              key={tag}
                              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                selectedTag === tag
                                  ? 'bg-[rgba(99,215,232,0.12)] text-[#63D7E8] border border-[rgba(99,215,232,0.35)]'
                                  : 'bg-[rgba(255,255,255,0.04)] text-slate-400 border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.18)] hover:text-white'
                              }`}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {workspacesLoading ? (
                    <div className="premium-card p-5 flex items-center gap-3 text-xs text-slate-400">
                      <div className="w-4 h-4 border-2 border-[#63D7E8] border-t-transparent rounded-full animate-spin" />
                      <span>Loading workspace tracker...</span>
                    </div>
                  ) : workspaces.length === 0 ? (
                    <div className="premium-card p-10 text-center flex flex-col items-center justify-center">
                      <div className="w-14 h-14 rounded-2xl bg-[rgba(99,215,232,0.07)] border border-[rgba(99,215,232,0.15)] flex items-center justify-center text-3xl mb-4">🚀</div>
                      <p className="text-base font-bold text-white mb-1">No active plans yet</p>
                      <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                        Pitch your first startup idea on the home screen to kick off agentic validation and milestone tracking.
                      </p>
                      <button onClick={() => setCurrentView('home')} className="mt-5 theme-btn-solid text-xs py-2.5 px-6 flex items-center gap-2">
                        <span>✨</span> Pitch New Idea
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {workspaces.filter(ws => !selectedTag || (ws.tags && ws.tags.includes(selectedTag))).map((ws, wsIdx) => {
                        const progressPercentage = ws.total_milestones > 0
                          ? (ws.current_milestone_index / ws.total_milestones) * 100
                          : 0;
                        return (
                          <div
                            key={ws.id}
                            className="premium-card p-5 flex flex-col justify-between space-y-4"
                            style={{ animationDelay: `${wsIdx * 0.05}s` }}
                          >
                            <div>
                              {/* Card Header */}
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex-1 min-w-0 pr-2">
                                  <h3
                                    onClick={() => handleWorkspaceSelect(ws.id, ws.idea)}
                                    className="font-bold text-white text-sm line-clamp-1 hover:text-[#63D7E8] transition-colors cursor-pointer leading-snug"
                                  >
                                    {ws.idea}
                                  </h3>
                                  <div className="flex items-center gap-2 mt-1.5">
                                    <span className="inline-block bg-[rgba(99,215,232,0.1)] border border-[rgba(99,215,232,0.2)] text-[#63D7E8] text-[9.5px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                                      {ws.tags && ws.tags[0] ? ws.tags[0] : 'AI Startup'}
                                    </span>
                                  </div>
                                </div>
                                {/* Save / Favorite button */}
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
                                  aria-label={ws.is_saved ? "Remove from favorites" : "Save to favorites"}
                                  className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.07)] transition-colors cursor-pointer shrink-0"
                                  title={ws.is_saved ? "Saved Favorite" : "Save to Favorites"}
                                >
                                  <svg className={`w-4 h-4 ${ws.is_saved ? 'text-[#4C8CFF] fill-[#4C8CFF]' : 'text-slate-500'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499c.158-.343.344-.66.52-.947.176.287.362.604.52.947l2.193 4.444a1 1 0 00.758.552l4.904.713c.38.055.53.518.257.788l-3.548 3.46a1 1 0 00-.287.885l.838 4.886c.065.378-.33.666-.67.487l-4.387-2.31a1 1 0 00-.93 0l-4.387 2.31c-.34.179-.735-.109-.67-.487l.838-4.886a1 1 0 00-.287-.885l-3.548-3.46c-.273-.27-.123-.733.257-.788l4.904-.713a1 1 0 00.758-.552l2.193-4.444z" />
                                  </svg>
                                </button>
                              </div>

                              {/* Milestone Progress */}
                              {ws.total_milestones > 0 ? (
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-400 font-medium">Milestone progress</span>
                                    <span className="text-white font-bold">{ws.milestone_progress}</span>
                                  </div>
                                  {/* Premium progress bar */}
                                  <div className="premium-progress-track">
                                    <div className="premium-progress-fill" style={{ width: `${progressPercentage}%` }} />
                                  </div>
                                  {/* Next step inset */}
                                  <div className="mt-2 p-3 rounded-xl bg-[rgba(255,255,255,0.03)] border-l-2 border-l-[rgba(99,215,232,0.5)] border border-[rgba(255,255,255,0.06)]">
                                    <p className="section-label mb-0.5">Next Step</p>
                                    <p className="text-xs font-bold text-white line-clamp-1">{ws.next_step_title}</p>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-slate-500 text-xs my-3 italic">No timeline milestones parsed yet.</p>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 pt-1">
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
                                  className="flex-1 theme-btn-outline text-xs py-2.5 flex items-center justify-center gap-1.5 hover:border-[rgba(99,215,232,0.35)] hover:text-[#63D7E8]"
                                >
                                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.18-.08-.05-.19-.02-.27 0-.11.03-1.84 1.18-5.2 3.45-.49.33-.94.5-1.34.49-.45-.01-1.31-.25-1.95-.46-.79-.26-1.42-.39-1.36-.83.03-.22.35-.45.96-.68 3.75-1.63 6.25-2.71 7.5-3.23 3.56-1.47 4.3-1.73 4.79-1.74.11 0 .35.03.49.14.12.09.15.22.16.31.02.05.02.16.01.27z" /></svg>
                                  Connect Telegram
                                </button>
                              )}
                              <button
                                onClick={() => handleWorkspaceSelect(ws.id, ws.idea)}
                                className="flex-1 theme-btn-solid text-xs py-2.5"
                              >
                                Open Plan →
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* ── BOTTOM ROW: QUICK ACTIONS / NEEDS ATTENTION / RECENT ACTIVITY ── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">

                  {/* Quick Actions */}
                  <div className="premium-card p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-[rgba(76,140,255,0.12)] border border-[rgba(76,140,255,0.25)] flex items-center justify-center text-[#4C8CFF]">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      </div>
                      <h3 className="text-sm font-bold text-white">Quick Actions</h3>
                    </div>
                    <div className="space-y-1">
                      <button
                        onClick={() => setCurrentView('home')}
                        className="command-row"
                        title="Pitch a new startup idea for agentic analysis"
                      >
                        <span className="cmd-icon bg-[rgba(143,234,138,0.08)] border border-[rgba(143,234,138,0.15)] text-[#8FEA8A]">✨</span>
                        <span>New Analysis</span>
                        <svg className="cmd-arrow w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                      </button>
                      <button
                        onClick={() => setCurrentView('history')}
                        className="command-row"
                        title="Review past analysis history & saved plans"
                      >
                        <span className="cmd-icon bg-[rgba(99,215,232,0.08)] border border-[rgba(99,215,232,0.15)] text-[#63D7E8]">📚</span>
                        <span>View History</span>
                        <svg className="cmd-arrow w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                      </button>
                      <button
                        onClick={() => setCurrentView('settings')}
                        className="command-row"
                        title="Configure AI models and profile preferences"
                      >
                        <span className="cmd-icon bg-[rgba(76,140,255,0.08)] border border-[rgba(76,140,255,0.15)] text-[#4C8CFF]">⚙️</span>
                        <span>Settings</span>
                        <svg className="cmd-arrow w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                      </button>
                    </div>
                  </div>

                  {/* Needs Attention */}
                  <div className="premium-card p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-[rgba(217,164,65,0.12)] border border-[rgba(217,164,65,0.25)] flex items-center justify-center text-[#D9A441]">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      </div>
                      <h3 className="text-sm font-bold text-white">Needs Attention</h3>
                      {notifications.length > 0 && (
                        <span className="ml-auto text-[10px] font-bold text-[#D9A441] bg-[rgba(217,164,65,0.12)] border border-[rgba(217,164,65,0.25)] px-2 py-0.5 rounded-full">{notifications.length}</span>
                      )}
                    </div>
                    {notifications.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {notifications.map((notif, i) => (
                          <div key={i} className="attention-item">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-white line-clamp-1">{notif.idea}</p>
                                <p className="text-[11px] text-[#D9A441]/80 mt-0.5 leading-relaxed">{notif.message}</p>
                              </div>
                              <button
                                className="fix-now-btn shrink-0"
                                onClick={async () => {
                                  const ws = workspaces.find(w => w.idea === notif.idea);
                                  if (ws) {
                                    const data = await fetchTelegramLink(ws.id);
                                    if (data?.deep_link) window.open(data.deep_link, '_blank');
                                  }
                                }}
                              >
                                Fix Now →
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-6 text-center">
                        <div className="text-2xl mb-2">🎉</div>
                        <p className="text-xs text-slate-500 font-medium">All caught up!</p>
                      </div>
                    )}
                  </div>

                  {/* Recent Activity Timeline */}
                  <div className="premium-card p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-[rgba(143,234,138,0.12)] border border-[rgba(143,234,138,0.25)] flex items-center justify-center text-[#8FEA8A]">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <h3 className="text-sm font-bold text-white">Recent Activity</h3>
                    </div>
                    {activity.length > 0 ? (
                      <div className="flex flex-col gap-3 relative pl-4 before:absolute before:left-[7px] before:top-1 before:bottom-1 before:w-px before:bg-[rgba(255,255,255,0.07)]">
                        {activity.slice(0, 5).map((act, i) => {
                          const dotClass = act.type === 'analyzed' ? 'timeline-dot-green' : act.type === 'saved' ? 'timeline-dot-blue' : act.type === 'telegram_linked' ? 'timeline-dot-cyan' : 'timeline-dot-amber';
                          return (
                            <div key={i} className="flex gap-3 items-start text-xs relative group hover:bg-[rgba(255,255,255,0.03)] rounded-xl p-1.5 -mx-1.5 transition-colors">
                              <span className={`${dotClass} relative z-10 mt-1 shrink-0`} />
                              <div className="min-w-0 flex-1">
                                <p className="text-white font-medium line-clamp-1 group-hover:text-[#63D7E8] transition-colors">{act.message}</p>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                  {new Date(act.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-6 text-center">
                        <div className="text-2xl mb-2">🗺️</div>
                        <p className="text-xs text-slate-500">No recent activity. Pitch your first concept to see your journey here!</p>
                      </div>
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
