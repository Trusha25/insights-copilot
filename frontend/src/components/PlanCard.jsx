import React from 'react';
import { Target, Layers, Cpu, ArrowRight } from './Icons';

export default function PlanCard({ idea }) {
  if (!idea) return null;

  const planSteps = [
    {
      step: '01',
      title: 'Problem & Audience Validation',
      desc: 'Conduct interviews with target users to validate pain points and demand.',
      icon: Target,
    },
    {
      step: '02',
      title: 'MVP Scope & Architecture',
      desc: 'Define core user flows and establish modular API endpoints.',
      icon: Layers,
    },
    {
      step: '03',
      title: 'AI Agent Integration',
      desc: 'Deploy fast inference agents with fallback logic and structured JSON outputs.',
      icon: Cpu,
    },
  ];

  return (
    <div className="glass-card rounded-2xl p-6 md:p-8 shadow-2xl border border-slate-800 relative overflow-hidden">
      {/* Card Header */}
      <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white tracking-tight">Execution Roadmap</h2>
            <p className="text-xs text-slate-400">Actionable steps for initial prototype</p>
          </div>
        </div>
      </div>

      {/* Plan Steps */}
      <div className="space-y-4">
        {planSteps.map((item, index) => {
          const Icon = item.icon;
          return (
            <div
              key={index}
              className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700 transition-all flex items-start gap-4"
            >
              <div className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20 shrink-0">
                {item.step}
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                  <span>{item.title}</span>
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600 self-center shrink-0" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
