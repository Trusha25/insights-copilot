import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const features = [
  'Complete Project Architecture',
  'Detailed 5-Step Execution Roadmap',
  'AI System Design',
  'Database Schema',
  'API Blueprint',
  'Deployment Guide',
  'Priority AI Responses',
  'Unlimited Projects',
  'Future Premium Features'
];

export default function PremiumUpgradeModal({ isOpen, onClose, onUnlock, isUnlocking = false }) {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll('button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-md sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => { if (!isUnlocking && event.target === event.currentTarget) onClose(); }}
          role="presentation"
        >
          <motion.section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="premium-upgrade-title"
            className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-[24px] border border-cyan-300/30 bg-[color:var(--bg-surface)] p-6 shadow-[0_25px_90px_rgba(0,0,0,0.45)] sm:rounded-[24px] sm:p-8"
            initial={{ opacity: 0, scale: 0.94, y: 28 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ type: 'spring', stiffness: 330, damping: 28 }}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300 to-violet-400" />
            <button ref={closeButtonRef} onClick={onClose} disabled={isUnlocking} className="absolute right-4 top-4 rounded-lg p-2 theme-text-muted transition-colors hover:bg-[var(--color-accent-bg)] hover:theme-text-title focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:opacity-40" aria-label="Close upgrade modal">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" /></svg>
            </button>

            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/40 bg-gradient-to-br from-cyan-400/25 to-violet-400/25 text-cyan-500 shadow-[0_0_28px_rgba(34,211,238,0.22)]">
              <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" /><path strokeLinecap="round" d="M8 10V7a4 4 0 018 0v3" /></svg>
            </div>
            <div className="text-center">
              <h2 id="premium-upgrade-title" className="text-2xl font-extrabold tracking-tight theme-text-title sm:text-3xl">Unlock Premium Features</h2>
              <p className="mt-2 text-sm leading-relaxed theme-text-muted">Upgrade to Pro and build with the complete operating system for your next idea.</p>
            </div>

            <ul className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2" aria-label="Pro features">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--bg-primary)]/60 px-3 py-2.5 text-sm theme-text-body">
                  <span className="font-bold text-emerald-500" aria-hidden="true">✓</span>{feature}
                </li>
              ))}
            </ul>

            <div className="my-6 rounded-2xl border border-cyan-300/25 bg-gradient-to-r from-cyan-400/10 via-transparent to-violet-400/10 p-4 text-center">
              <p className="text-3xl font-extrabold theme-text-title">₹499</p>
              <p className="mt-1 text-sm font-semibold theme-text-muted">One-Time Purchase · No Subscription</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button onClick={onUnlock} disabled={isUnlocking} className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 px-5 py-3 text-sm font-extrabold text-slate-950 shadow-[0_10px_25px_rgba(34,211,238,0.25)] transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-wait disabled:opacity-75 sm:w-auto">
                {isUnlocking ? <span className="inline-flex items-center gap-2"><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950" />Unlocking…</span> : 'Unlock Pro'}
              </button>
              <button onClick={onClose} disabled={isUnlocking} className="w-full rounded-xl border border-[var(--color-border)] px-5 py-3 text-sm font-bold theme-text-body transition-colors hover:bg-[var(--color-accent-bg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:opacity-40 sm:w-auto">Maybe Later</button>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
