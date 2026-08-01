import React, { useEffect, useState } from 'react';

export default function LoadingDashboard({ idea, isDataReady, onCancel, onAnimationComplete }) {
  const [overallProgress, setOverallProgress] = useState(0);

  useEffect(() => {
    let timer;
    const tick = () => {
      setOverallProgress((prev) => {
        if (isDataReady) {
          // Fast-forward once data is returned
          if (prev >= 100) {
            clearInterval(timer);
            setTimeout(() => {
              if (onAnimationComplete) onAnimationComplete();
            }, 800);
            return 100;
          }
          return Math.min(100, prev + 3);
        } else {
          // Slow progress before data is ready, cap at 98%
          if (prev >= 98) {
            return 98;
          }
          // Increment smoothly
          return prev + 0.35;
        }
      });
    };

    timer = setInterval(tick, 60);
    return () => clearInterval(timer);
  }, [isDataReady, onAnimationComplete]);

  // Compute agent progresses
  const getAgentStatus = (startPrg, endPrg) => {
    const range = endPrg - startPrg;
    const progress = Math.min(100, Math.max(0, Math.round(((overallProgress - startPrg) / range) * 100)));
    let status = 'Waiting';
    if (progress > 0 && progress < 100) status = 'Running';
    else if (progress === 100) status = 'Completed';
    return { progress, status };
  };

  const agents = [
    {
      name: "Market Analyst",
      role: "Research Agent",
      desc: "Market size, trends, competition & gaps",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
      ...getAgentStatus(0, 25),
      liveMsg: {
        Waiting: "Queueing source requests...",
        Running: "Scanning Tavily, arXiv, GitHub, etc.",
        Completed: "Identified 12 competitor gaps"
      }
    },
    {
      name: "Business Strategist",
      role: "Planner Agent",
      desc: "Business model, GTM strategy & positioning",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
      ...getAgentStatus(25, 50),
      liveMsg: {
        Waiting: "Waiting for market data...",
        Running: "Formulating GTM entry strategy...",
        Completed: "Defined 5-step milestone roadmap"
      }
    },
    {
      name: "Tech Architect",
      role: "Mentor Agent",
      desc: "Tech stack, scalability & architecture",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      ...getAgentStatus(50, 75),
      liveMsg: {
        Waiting: "Waiting for strategical scope...",
        Running: "Designing tech stack & db models...",
        Completed: "Drafted database schemas & stacks"
      }
    },
    {
      name: "Risk Assessor",
      role: "Critic Agent",
      desc: "Risks, challenges & mitigation strategies",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      ...getAgentStatus(75, 100),
      liveMsg: {
        Waiting: "Waiting for design schemas...",
        Running: "Auditing security & bottleneck risks...",
        Completed: "Critique finalized with suggested fixes"
      }
    }
  ];

  // Dynamic values
  const dataPoints = Math.min(3600, Math.round(overallProgress * 36));
  const sourcesScanned = Math.min(120, Math.round(overallProgress * 1.25));
  
  const getConfidence = () => {
    if (overallProgress < 60) return "Calculating...";
    if (overallProgress < 85) return "Medium";
    return "High";
  };

  const getEstTime = () => {
    if (overallProgress >= 100) return "Finishing...";
    const secsLeft = Math.max(2, Math.round(((100 - overallProgress) * 45) / 100));
    return `Estimated time remaining: ${secsLeft} seconds`;
  };

  const logs = [
    { prg: 0, text: "🚀 Started AI research sequence..." },
    { prg: 8, text: "🔍 Market Analyst: Querying academic journals & web sources..." },
    { prg: 22, text: "✅ Market Analyst: Identified 12 major competitor gaps" },
    { prg: 30, text: "🎯 Business Strategist: Designing launch milestones..." },
    { prg: 48, text: "✅ Business Strategist: Milestones roadmap finalized" },
    { prg: 58, text: "💻 Tech Architect: Selecting frameworks & infrastructure..." },
    { prg: 73, text: "✅ Tech Architect: Component services designed" },
    { prg: 82, text: "🛡️ Risk Assessor: Running security audit and risk analysis..." },
    { prg: 96, text: "✅ Risk Assessor: Weaknesses audited and solutions logged" },
    { prg: 99, text: "✨ Saving workspace and finalizing dashboard..." }
  ];

  const visibleLogs = logs.filter((l) => overallProgress >= l.prg);

  return (
    <div className="flex-1 flex flex-col justify-between p-6 lg:p-10 select-none relative z-10">
      
      {/* Header bar */}
      <div className="flex justify-between items-center w-full mb-6">
        <button
          onClick={onCancel}
          className="p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--bg-surface)] text-slate-400 hover:text-white transition-all cursor-pointer shadow-sm hover:border-[var(--color-border-hover)]"
          title="Cancel Analysis"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>

        <button className="px-4 py-2 border border-[var(--color-border)] rounded-xl text-xs font-bold theme-text-title bg-[var(--bg-surface)] shadow-inner hover:border-[var(--color-border-hover)] transition-all">
          View in Fullscreen
        </button>
      </div>

      {/* Main double column container */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-8 items-stretch mb-6">
        
        {/* Left pane: Title + Cards (Col span 3) */}
        <div className="lg:col-span-3 flex flex-col justify-between gap-6">
          <div className="text-center lg:text-left mb-2">
            <h2 className="text-3xl lg:text-4xl font-extrabold theme-text-title tracking-tight leading-none mb-2">
              Analyzing Your Startup Idea
            </h2>
            <p className="theme-text-muted text-sm font-medium">
              Our AI agents are working their magic...
            </p>
          </div>

          {/* Row of 4 Agent Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 flex-1 items-center">
            {agents.map((agent, i) => {
              const isRunning = agent.status === 'Running';
              const isCompleted = agent.status === 'Completed';
              return (
                <div
                  key={i}
                  className={`h-72 rounded-2xl p-5 flex flex-col justify-between border relative transition-all duration-300 ${
                    isRunning
                      ? 'bg-[var(--color-accent-bg)]/25 border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/15 shadow-[0_0_20px_var(--color-accent-glow)]'
                      : isCompleted
                      ? 'bg-[var(--bg-surface)]/80 border-[var(--color-accent)]/30'
                      : 'bg-[var(--bg-surface)]/45 border-[var(--color-border)] opacity-60'
                  }`}
                >
                  {/* Top line with Checkmark badge */}
                  <div className="flex justify-between items-start">
                    <div className={`p-2.5 rounded-xl ${isRunning ? 'bg-[var(--color-accent)] text-white dark:text-[#0A0E0C]' : 'bg-[var(--color-accent-bg)] text-[var(--color-accent)] border border-[var(--color-border-hover)]'}`}>
                      {agent.icon}
                    </div>

                    {isCompleted && (
                      <div className="w-6 h-6 rounded-full bg-[var(--color-accent)] text-white dark:text-[#0A0E0C] flex items-center justify-center text-xs font-black shadow-md shadow-[var(--color-accent-glow)] border border-[var(--color-border)]">
                        ✓
                      </div>
                    )}
                  </div>

                  {/* Title & Desc */}
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--color-accent)] block mb-1">
                      {agent.role}
                    </span>
                    <h4 className="font-bold theme-text-title text-base leading-tight mb-1.5">
                      {agent.name}
                    </h4>
                    <p className="text-xs theme-text-muted font-medium leading-relaxed mb-3">
                      {agent.desc}
                    </p>
                  </div>

                  {/* Bottom: status msg and progress bar */}
                  <div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                      <span className="truncate max-w-[130px]">{agent.liveMsg[agent.status]}</span>
                      <span className={isRunning || isCompleted ? 'text-[var(--color-accent)]' : ''}>
                        {agent.progress}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 dark:bg-slate-900/60 rounded-full h-1.5 border border-transparent overflow-hidden">
                      <div
                        className="bg-[var(--color-accent)] h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${agent.progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time Estimate */}
          <div className="text-center lg:text-left text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center justify-center lg:justify-start gap-2">
            <svg className="w-4 h-4 text-[var(--color-accent)] animate-float" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{getEstTime()}</span>
          </div>
        </div>

        {/* Right pane: Analytics metrics (Col span 1) */}
        <div className="theme-card flex flex-col justify-between gap-6">
          <div className="flex justify-between items-center pb-3 border-b border-[var(--color-border)]">
            <h3 className="font-bold theme-text-title text-base">Live Analytics</h3>
            <span className="bg-[var(--color-accent-bg)] text-[var(--color-accent)] border border-[var(--color-border-hover)] text-[9px] font-black px-1.5 py-0.5 rounded leading-none uppercase">
              Beta
            </span>
          </div>

          {/* Progress Circular Gauge */}
          <div className="flex flex-col items-center justify-center py-2">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle cx="64" cy="64" r="50" className="stroke-slate-200 dark:stroke-slate-900" strokeWidth="8" fill="transparent" />
                <circle
                  cx="64"
                  cy="64"
                  r="50"
                  className="stroke-[var(--color-accent)] transition-all duration-300"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray="314.16"
                  strokeDashoffset={314.16 - (314.16 * overallProgress) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-2xl font-black theme-text-title leading-none">
                  {Math.round(overallProgress)}%
                </span>
                <span className="text-[9px] font-bold text-slate-500 tracking-wider uppercase mt-1">
                  Overall
                </span>
              </div>
            </div>
          </div>

          {/* Analytics rows */}
          <div className="space-y-4 flex-1 flex flex-col justify-center">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-slate-400">Data Points Analyzed</span>
              <span className="theme-text-title font-bold">{dataPoints.toLocaleString()} / 3,600</span>
            </div>
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-slate-400">Sources Scanned</span>
              <span className="theme-text-title font-bold">{sourcesScanned}+</span>
            </div>
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-slate-400">Confidence Score</span>
              <span className={`font-bold uppercase text-[10px] px-2 py-0.5 rounded border ${
                getConfidence() === 'High'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : getConfidence() === 'Medium'
                  ? 'bg-amber-500/10 border-amber-500/20 text-[var(--color-accent)]'
                  : 'bg-slate-800 border-slate-700 text-slate-500'
              }`}>
                {getConfidence()}
              </span>
            </div>
          </div>

          {/* Bottom Waveform & log message */}
          <div className="bg-[var(--bg-surface)] border border-[var(--color-border)] rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse"></span>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--color-accent)]">
                  Analyzing...
                </span>
              </div>
              
              <div className="h-8 overflow-hidden">
                <div className="text-xs text-slate-350 font-bold leading-snug line-clamp-2">
                  {visibleLogs[visibleLogs.length - 1]?.text}
                </div>
              </div>
            </div>

            {/* Micro Waveform animation */}
            <div className="flex items-end gap-[3px] h-8 shrink-0 pb-1">
              <div className="w-[3px] h-3 bg-[var(--color-accent)] rounded-full animate-bounce [animation-delay:-0.4s]" style={{ animationDuration: '0.8s' }}></div>
              <div className="w-[3px] h-6 bg-[var(--color-accent)] rounded-full animate-bounce [animation-delay:-0.2s]" style={{ animationDuration: '0.9s' }}></div>
              <div className="w-[3px] h-8 bg-[var(--color-accent)] rounded-full animate-bounce [animation-delay:-0.6s]" style={{ animationDuration: '0.7s' }}></div>
              <div className="w-[3px] h-4 bg-[var(--color-accent)] rounded-full animate-bounce [animation-delay:-0.1s]" style={{ animationDuration: '0.8s' }}></div>
              <div className="w-[3px] h-5 bg-[var(--color-accent)] rounded-full animate-bounce [animation-delay:-0.3s]" style={{ animationDuration: '0.9s' }}></div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
