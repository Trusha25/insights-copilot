import React from 'react';
import ClickableSectionHeading from './ClickableSectionHeading';

export default function PlanCard({ status, roadmap, openPanel }) {
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
        <h3 className="text-xl font-bold theme-text-title">5-Step Execution Roadmap</h3>
      </div>

      <div className="space-y-8 relative before:absolute before:inset-0 before:ml-[19px] before:-translate-x-px before:h-full before:w-0.5 before:bg-[var(--color-border-hover)]">
        {roadmap.slice(0, 5).map((item, index) => {
          // Gold theme color sequence matching visual mockup tones
          const colors = [
            { bg: "bg-[var(--color-accent)] text-[#030407]", light: "bg-[var(--color-accent-bg)] text-[var(--color-accent)] border border-[var(--color-border-hover)]" },
            { bg: "bg-[#cfb57f] text-[#030407]", light: "bg-[var(--color-accent-bg)]/80 text-[#cfb57f] border border-[var(--color-border-hover)]" },
            { bg: "bg-[#bfa56f] text-[#030407]", light: "bg-[var(--color-accent-bg)]/60 text-[#bfa56f] border border-[var(--color-border)]" },
            { bg: "bg-[#af955f] text-[#030407]", light: "bg-[var(--color-accent-bg)]/40 text-[#af955f] border border-[var(--color-border)]" },
            { bg: "bg-[#9f854f] text-[#030407]", light: "bg-[var(--color-accent-bg)]/20 text-[#9f854f] border border-[var(--color-border)]" },
          ];
          const color = colors[index % colors.length];

          return (
            <div key={index} className="relative flex items-start gap-5">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-base z-10 shrink-0 ${color.bg} shadow-sm outline outline-4 outline-[#07090e] dark:outline-[#07090e] outline-white`}>
                {index + 1}
              </div>
              <div className="flex-1 pb-6 border-b border-[var(--color-border)] last:border-0 last:pb-0 pt-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex-1">
                    <ClickableSectionHeading 
                      title={item.milestone}
                      subtitle={item.description || `${item.tasks ? item.tasks.length : 0} tasks planned`}
                      onClick={() => openPanel(item.milestone, (
                        <div>
                          <div className="mb-4">
                            <span className={`px-3 py-1 rounded-md text-xs font-semibold ${color.light} w-fit`}>
                              {item.duration}
                            </span>
                          </div>
                          {item.tasks && item.tasks.length > 0 ? (
                            <ul className="list-disc pl-5 text-lg theme-text-body space-y-5">
                              {item.tasks.map((task, idx) => {
                                if (typeof task === 'string') {
                                  return <li key={idx}>{task}</li>;
                                }
                                return (
                                  <li key={idx} className="space-y-1 list-none -ml-4">
                                    <div className="flex items-start gap-2">
                                      <span className="text-[var(--color-accent)] font-bold mt-1 shrink-0">•</span>
                                      <div>
                                        <span className="font-bold theme-text-title text-xl">{task.title}</span>
                                        {task.description && <span className="theme-text-body text-lg"> — {task.description}</span>}
                                        {task.rationale && (
                                          <div className="text-base text-[var(--color-accent)] bg-[var(--color-accent-bg)] px-3 py-1.5 rounded-xl border border-[var(--color-border-hover)] w-fit mt-2 font-medium">
                                            <span className="font-semibold text-[var(--color-accent-text)]">Rationale: </span>
                                            {task.rationale}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          ) : (
                            <ul className="list-disc pl-5 text-lg theme-text-body space-y-4">
                              <li>{item.description || "No tasks provided."}</li>
                            </ul>
                          )}
                        </div>
                      ))}
                    />
                  </div>
                  <span className={`px-3 py-1 rounded-md text-xs font-semibold ${color.light} w-fit`}>
                    {item.duration}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
