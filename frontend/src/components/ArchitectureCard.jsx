import React from 'react';
import MermaidChart from './MermaidChart';

export default function ArchitectureCard({ status, plan }) {
  const isLoading = status === "loading";
  
  if (isLoading) {
    return (
      <div className="theme-card min-h-[400px] flex items-center justify-center">
        <div className="theme-text-muted text-lg">Designing Architecture...</div>
      </div>
    );
  }

  if (!plan) return null;

  return (
    <div className="theme-card h-fit">
      <div className="flex items-center gap-2 mb-6 border-b border-[var(--color-border)] pb-4">
        <svg className="w-6 h-6 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
        </svg>
        <h3 className="text-xl font-bold theme-text-title">Project Architecture</h3>
      </div>

      <div className="space-y-6">
        <div>
          <h4 className="font-bold text-lg theme-text-title mb-2">Technical Feasibility</h4>
          <p className="text-base theme-text-body leading-relaxed mb-4">
            {plan.architecture || "N/A"}
          </p>
          
          {plan.architecture_mermaid && (
            <div className="mb-4">
              <MermaidChart chart={plan.architecture_mermaid} />
            </div>
          )}
        </div>

        <div>
          <h4 className="font-bold text-lg theme-text-title mb-3">Recommended Tech Stack</h4>
          {plan.tech_stack && plan.tech_stack.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {plan.tech_stack.map((tech, idx) => (
                <span key={idx} className="theme-badge py-1.5 px-3 rounded-lg text-sm font-medium">
                  {tech}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-base theme-text-body">No tech stack provided.</p>
          )}
        </div>

        {plan.architecture_components && plan.architecture_components.length > 0 && (
          <div className="pt-6 border-t border-[var(--color-border)]">
            <h4 className="font-bold text-lg theme-text-title mb-4">Core Components & Services</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plan.architecture_components.map((comp, idx) => (
                <div key={idx} className="p-4 bg-[var(--color-accent-bg)] border border-[var(--color-border)] rounded-2xl flex flex-col gap-2">
                  <div className="flex justify-between items-start gap-3">
                    <span className="font-bold theme-text-title text-base">{comp.component}</span>
                    <span className="px-2 py-0.5 bg-[var(--color-accent-bg)] text-[var(--color-accent)] border border-[var(--color-border-hover)] text-xs font-bold rounded-lg shrink-0">
                      {comp.technology}
                    </span>
                  </div>
                  {comp.rationale && (
                    <p className="text-sm theme-text-body leading-relaxed mt-1">
                      <span className="font-semibold theme-text-muted">Why:</span> {comp.rationale}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
