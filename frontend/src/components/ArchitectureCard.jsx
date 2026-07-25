import React from 'react';
import MermaidChart from './MermaidChart';

export default function ArchitectureCard({ status, plan }) {
  const isLoading = status === "loading";
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm min-h-[400px] flex items-center justify-center">
        <div className="text-slate-500 text-lg">Designing Architecture...</div>
      </div>
    );
  }

  if (!plan) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm h-fit">
      <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
        <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
        </svg>
        <h3 className="text-xl font-bold text-slate-800">Project Architecture</h3>
      </div>

      <div className="space-y-6">
        <div>
          <h4 className="font-bold text-lg text-slate-800 mb-2">Technical Feasibility</h4>
          <p className="text-base text-slate-700 leading-relaxed mb-4">
            {plan.architecture || "N/A"}
          </p>
          
          {plan.architecture_mermaid && (
            <div className="mb-4">
              <MermaidChart chart={plan.architecture_mermaid} />
            </div>
          )}
        </div>

        <div>
          <h4 className="font-bold text-lg text-slate-800 mb-3">Recommended Tech Stack</h4>
          {plan.tech_stack && plan.tech_stack.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {plan.tech_stack.map((tech, idx) => (
                <span key={idx} className="px-3 py-1.5 bg-slate-100 text-slate-800 rounded-lg text-base font-medium border border-slate-200">
                  {tech}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-base text-slate-700">No tech stack provided.</p>
          )}
        </div>
      </div>
    </div>
  );
}
