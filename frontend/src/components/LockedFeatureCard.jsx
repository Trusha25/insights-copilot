import React from 'react';
import { motion } from 'framer-motion';
import ProBadge from './ProBadge';
import LockOverlay from './LockOverlay';

export default function LockedFeatureCard({ title, description, icon, onClick }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.995 }}
      className="group relative w-full overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--bg-surface)] p-5 text-left opacity-90 shadow-sm transition-[border-color,box-shadow,opacity] duration-300 hover:border-cyan-400/60 hover:opacity-100 hover:shadow-[0_12px_32px_rgba(34,211,238,0.13)] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70"
      aria-label={`Unlock ${title} with Pro`}
    >
      <LockOverlay />
      <div className="relative flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border-hover)] bg-[var(--color-accent-bg)] text-[var(--color-accent)] shadow-sm">
            {icon}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-extrabold theme-text-title text-base">{title}</span>
              <ProBadge />
            </div>
            <p className="mt-0.5 text-xs font-semibold theme-text-muted">{description}</p>
          </div>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-400/10 text-cyan-600 dark:text-cyan-300 transition-transform duration-300 group-hover:rotate-6">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="5" y="10" width="14" height="10" rx="2" />
            <path strokeLinecap="round" d="M8 10V7a4 4 0 018 0v3" />
          </svg>
        </div>
      </div>
    </motion.button>
  );
}
