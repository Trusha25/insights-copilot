import React from 'react';
import { BookOpen, ExternalLink, Sparkles, CheckCircle2 } from './Icons';

export default function ResearchCard({ research, sources }) {
  if (!research) return null;

  // Format simple markdown headers and bolding for display
  const formatResearchText = (text) => {
    if (!text) return '';
    return text.split('\n\n').map((paragraph, index) => {
      if (paragraph.startsWith('### ')) {
        return (
          <h3 key={index} className="text-xl font-bold text-indigo-300 mt-5 mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-400"></span>
            {paragraph.replace('### ', '')}
          </h3>
        );
      }
      if (paragraph.startsWith('## ')) {
        return (
          <h2 key={index} className="text-2xl font-bold text-white mt-6 mb-3 border-b border-slate-800 pb-2">
            {paragraph.replace('## ', '')}
          </h2>
        );
      }
      if (paragraph.startsWith('1. ') || paragraph.startsWith('2. ') || paragraph.startsWith('3. ') || paragraph.startsWith('- ')) {
        const items = paragraph.split('\n');
        return (
          <ul key={index} className="space-y-2 my-3 pl-1">
            {items.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-slate-300 text-sm leading-relaxed">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-1" />
                <span>{item.replace(/^(\d+\.|\-)\s*/, '')}</span>
              </li>
            ))}
          </ul>
        );
      }
      return (
        <p key={index} className="text-slate-300 text-sm md:text-base leading-relaxed my-3">
          {paragraph}
        </p>
      );
    });
  };

  return (
    <div className="glass-card rounded-2xl p-6 md:p-8 shadow-2xl border border-indigo-500/20 relative overflow-hidden transition-all duration-300 hover:border-indigo-500/40">
      {/* Background Accent Glow */}
      <div className="absolute -top-24 -right-24 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Card Header */}
      <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white tracking-tight">Research Analysis</h2>
            <p className="text-xs text-slate-400">Powered by Groq & llama-3.3-70b-versatile</p>
          </div>
        </div>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
          AI Verified
        </span>
      </div>

      {/* Research Content */}
      <div className="prose prose-invert max-w-none mb-8 text-slate-200">
        {formatResearchText(research)}
      </div>

      {/* Sources Section */}
      {sources && sources.length > 0 && (
        <div className="pt-6 border-t border-slate-800/80">
          <div className="flex items-center gap-2 mb-4 text-slate-300 text-sm font-semibold">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <span>Referenced Sources & Market Solutions ({sources.length})</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {sources.map((source, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/30 transition-all text-xs text-slate-300 group"
              >
                <span className="truncate pr-2 font-medium">{source}</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 shrink-0 transition-colors" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
