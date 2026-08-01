import React, { useState } from 'react';

export default function ClickableSectionHeading({ title, subtitle, preview, icon, children }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mb-3">
      {/* Header row — clickable trigger */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className={`w-full group flex items-center justify-between p-4 border rounded-xl bg-[var(--bg-surface)] transition-all cursor-pointer shadow-sm text-left ${
          isOpen
            ? 'border-[var(--color-accent)] bg-[var(--color-accent-bg)]/20 rounded-b-none'
            : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-accent-bg)]/10'
        }`}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          {icon && (
            <div className="w-8 h-8 rounded-lg bg-[var(--color-accent-bg)] text-[var(--color-accent)] border border-[var(--color-border-hover)] flex items-center justify-center shrink-0 shadow-sm">
              {icon}
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <h4 className={`font-bold text-sm theme-text-title truncate ${isOpen ? 'text-[var(--color-accent)]' : ''}`}>
              {title}
            </h4>
            {subtitle && (
              <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">{subtitle}</p>
            )}
            {!isOpen && preview && (
              <p className="text-xs theme-text-body mt-1.5 line-clamp-2 leading-relaxed">{preview}</p>
            )}
          </div>
        </div>

        {/* Chevron — rotates on open */}
        <svg
          className={`w-4 h-4 shrink-0 ml-3 transition-transform duration-300 ${
            isOpen ? 'rotate-90 text-[var(--color-accent)]' : 'text-slate-400 group-hover:text-[var(--color-accent)]'
          }`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Dropdown content — expands below */}
      {isOpen && children && (
        <div className="border border-t-0 border-[var(--color-accent)] rounded-b-xl bg-[var(--bg-secondary)] px-5 py-4 text-sm theme-text-body leading-relaxed">
          {children}
        </div>
      )}
    </div>
  );
}
