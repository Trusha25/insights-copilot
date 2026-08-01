import React from 'react';
import ClickableSectionHeading from './ClickableSectionHeading';

export default function PlanCard({ status, roadmap, plan, openPanel, currentMilestoneIndex = 0, onMilestoneComplete, milestoneCompleting }) {
  const isLoading = status === "loading";
  
  if (isLoading) {
    return (
      <div className="theme-card min-h-[400px] flex items-center justify-center">
        <div className="theme-text-muted text-lg">Generating Execution Roadmap...</div>
      </div>
    );
  }

  if (!roadmap || roadmap.length === 0) {
    return (
      <div className="p-6 text-center text-slate-500 font-medium bg-[var(--bg-surface)] rounded-xl border border-[var(--color-border)]">
        No execution roadmap was generated for this workspace.
      </div>
    );
  }

  return (
    <div className="theme-card h-fit">
      <div className="flex items-center gap-2 mb-8 border-b border-[var(--color-border)] pb-4">
        <svg className="w-6 h-6 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
        </svg>
        <h3 className="text-xl font-bold theme-text-title">Detailed Execution Roadmap</h3>
      </div>

      <div className="space-y-8 relative before:pointer-events-none before:absolute before:inset-0 before:ml-[19px] before:-translate-x-px before:h-full before:w-0.5 before:bg-[var(--color-border-hover)]">
        {roadmap.slice(0, 8).map((item, index) => {
          // Green theme color sequence matching visual mockup tones
          const colors = [
            { bg: "bg-gradient-to-r from-[var(--accent-start)] to-[var(--accent-end)] text-[#0A0E0C]", light: "bg-[var(--color-accent-bg)] text-[var(--accent-end)] border border-[var(--color-border-hover)]" },
            { bg: "bg-[#3D9F4A] text-[#0A0E0C]", light: "bg-[var(--color-accent-bg)]/80 text-[var(--accent-end)] border border-[var(--color-border-hover)]" },
            { bg: "bg-[#338A3F] text-[#F5F7F5]", light: "bg-[var(--color-accent-bg)]/60 text-[var(--accent-end)] border border-[var(--border-subtle)]" },
            { bg: "bg-[#297534] text-[#F5F7F5]", light: "bg-[var(--color-accent-bg)]/40 text-[var(--accent-end)] border border-[var(--border-subtle)]" },
            { bg: "bg-[#20602A] text-[#F5F7F5]", light: "bg-[var(--color-accent-bg)]/20 text-[var(--accent-end)] border border-[var(--border-subtle)]" },
          ];
          const color = colors[index % colors.length];
          const isCurrent = index === currentMilestoneIndex;
          const isCompleted = index < currentMilestoneIndex;

          return (
            <div key={index} className="relative flex items-start gap-5">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-base z-10 shrink-0 shadow-sm outline outline-4 outline-[#0A0E0C] dark:outline-[#0A0E0C] outline-white ${isCompleted ? 'bg-[var(--accent-start)] text-[#0A0E0C]' : isCurrent ? color.bg + ' ring-2 ring-[var(--glow-accent)]/50 ring-offset-2 ring-offset-[#0A0E0C]' : color.bg}`}>
                {isCompleted ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                ) : index + 1}
              </div>
              <div className="flex-1 pb-6 border-b border-[var(--color-border)] last:border-0 last:pb-0 pt-1">
                <div 
                  className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 mb-3 border border-[var(--color-border)] rounded-xl bg-[var(--bg-surface)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-accent-bg)]/20 transition-all cursor-pointer shadow-sm gap-4"
                  onClick={() => openPanel(item.milestone, (
                    <div className="flex flex-col h-full space-y-8 pb-10">
                      
                      {/* Premium Header */}
                      <div className={`p-6 rounded-2xl ${color.light} border bg-opacity-20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm`}>
                        <div>
                          <h2 className="text-2xl font-extrabold theme-text-title tracking-tight mb-2">Phase {index + 1}: {item.milestone}</h2>
                          <p className="text-sm theme-text-body font-medium opacity-90">
                            {item.description || "Detailed execution phase and technical objectives."}
                          </p>
                        </div>
                        <div className="shrink-0">
                          <span className={`px-4 py-2 rounded-xl text-sm font-bold shadow-sm ${color.bg}`}>
                            {item.duration}
                          </span>
                        </div>
                      </div>

                      {/* Tasks Infographic Layout */}
                      <div className="space-y-6 flex-1">
                        <h3 className="text-lg font-bold theme-text-title flex items-center gap-2 border-b border-[var(--color-border)] pb-2 mb-6">
                          <svg className="w-5 h-5 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          Technical Objectives
                        </h3>
                        
                        {item.tasks && item.tasks.length > 0 ? (
                          <div className="grid gap-4">
                            {item.tasks.map((task, idx) => {
                              if (typeof task === 'string') {
                                return (
                                  <div key={idx} className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--bg-surface)]">
                                    <p className="theme-text-body text-base">{task}</p>
                                  </div>
                                );
                              }
                              return (
                                <div key={idx} className="relative group p-5 rounded-xl border border-[var(--color-border)] bg-[var(--bg-surface)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-accent-bg)]/10 transition-all shadow-sm">
                                  <div className="flex items-start gap-4">
                                    <div className={`mt-1 shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border ${color.light}`}>
                                      <span className="font-bold text-xs">{idx + 1}</span>
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-3">
                                      <h4 className="font-bold text-lg theme-text-title leading-tight">{task.title}</h4>
                                      
                                      {task.description && (
                                        <p className="text-base text-slate-400 font-medium leading-relaxed">
                                          {task.description}
                                        </p>
                                      )}
                                      
                                      {task.rationale && (
                                        <div className="mt-4 p-4 rounded-lg bg-[var(--bg-app)] border border-[var(--color-border)]">
                                          <div className="flex items-center gap-1.5 mb-2">
                                            <svg className={`w-4 h-4 ${color.bg.split(' ')[0].replace('bg-', 'text-')}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Technical Rationale</span>
                                          </div>
                                          <p className="text-sm text-slate-400 font-medium">
                                            {task.rationale}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-6 text-center rounded-xl border border-dashed border-[var(--color-border-hover)]">
                            <p className="theme-text-body font-medium">{item.description || "No specific tasks provided for this milestone."}</p>
                          </div>
                        )}
                      </div>

                    </div>
                  ))}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="flex flex-col min-w-0">
                      <h4 className="font-bold text-base theme-text-title truncate">{item.milestone}</h4>
                      <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                        {item.description || `${item.tasks ? item.tasks.length : 0} tasks planned`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className={`px-3 py-1 rounded-md text-xs font-semibold ${color.light}`}>
                      {item.duration}
                    </span>
                    <div className="text-slate-400 group-hover:text-[var(--color-accent)] transition-transform duration-300 group-hover:translate-x-0.5">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
                {isCurrent && onMilestoneComplete && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onMilestoneComplete(); }}
                    disabled={milestoneCompleting}
                    className="mt-2 w-full px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50"
                  >
                    {milestoneCompleting ? (
                      <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Completing...</>
                    ) : (
                      <><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> Mark Milestone Complete</>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
