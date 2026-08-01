import React from 'react';

export default function ClickableSectionHeading({ title, subtitle, preview, icon, onClick }) {
  return (
    <div 
      className="group flex items-center justify-between p-4 mb-3 border border-[var(--color-border)] rounded-xl bg-[var(--bg-surface)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-accent-bg)]/20 transition-all cursor-pointer shadow-sm"
      onClick={onClick}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-[var(--color-accent-bg)] text-[var(--color-accent)] border border-[var(--color-border-hover)] flex items-center justify-center shrink-0 shadow-sm">
            {icon}
          </div>
        )}
        <div className="flex flex-col min-w-0">
          <h4 className="font-bold text-base theme-text-title truncate">{title}</h4>
          {subtitle && (
            <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">{subtitle}</p>
          )}
          {preview && (
            <p className="text-xs theme-text-body mt-2 line-clamp-2 leading-relaxed">{preview}</p>
          )}
        </div>
      </div>
      <div className="text-slate-400 group-hover:text-[var(--color-accent)] transition-transform duration-300 group-hover:translate-x-0.5 shrink-0 ml-4">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}
