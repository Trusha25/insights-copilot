import React, { useRef, useEffect } from 'react';

export default function DetailPanel({ title, children, onClose }) {
  const scrollRef = useRef(null);

  // Reset scroll to top whenever the panel content (or title) changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [title, children]);

  if (!title) return null;

  return (
    <div className="fixed inset-0 z-50 flex lg:static lg:block lg:w-1/2 shrink-0">
      {/* Mobile overlay backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 lg:hidden"
        onClick={onClose}
      ></div>

      {/* Panel container */}
      <div className="relative flex flex-col w-full h-full bg-[var(--bg-surface)] shadow-[-4px_0_20px_rgba(0,0,0,0.3)] lg:h-[calc(100vh-80px)] lg:sticky lg:top-20">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)] shrink-0">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <svg className="w-5 h-5 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {title}
          </h2>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content body */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 text-lg">
          {children}
        </div>
      </div>
    </div>
  );
}
