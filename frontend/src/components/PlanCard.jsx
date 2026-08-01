import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const phaseColors = [
  { bg: 'bg-gradient-to-r from-[var(--accent-start)] to-[var(--accent-end)] text-[#0A0E0C]', light: 'bg-[var(--color-accent-bg)] text-[var(--accent-end)] border border-[var(--color-border-hover)]' },
  { bg: 'bg-[#3D9F4A] text-[#0A0E0C]', light: 'bg-[var(--color-accent-bg)]/80 text-[var(--accent-end)] border border-[var(--color-border-hover)]' },
  { bg: 'bg-[#338A3F] text-[#F5F7F5]', light: 'bg-[var(--color-accent-bg)]/60 text-[var(--accent-end)] border border-[var(--border-subtle)]' },
  { bg: 'bg-[#297534] text-[#F5F7F5]', light: 'bg-[var(--color-accent-bg)]/40 text-[var(--accent-end)] border border-[var(--border-subtle)]' },
  { bg: 'bg-[#20602A] text-[#F5F7F5]', light: 'bg-[var(--color-accent-bg)]/20 text-[var(--accent-end)] border border-[var(--border-subtle)]' }
];

function ListSection({ title, items }) {
  if (!items?.length) return null;
  return (
    <section className="border-t border-[var(--color-border)] pt-5">
      <h5 className="mb-3 text-sm font-extrabold uppercase tracking-wider theme-text-title">{title}</h5>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="flex gap-3 text-sm leading-relaxed theme-text-body">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
            <span>{typeof item === 'string' ? item : item.title || item.name || item.description}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PhaseDetails({ item, index, color }) {
  const tasks = item.tasks || [];
  const deliverables = item.deliverables || item.milestones || [];
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="overflow-hidden"
    >
      <div className="mt-3 rounded-2xl border border-[var(--color-border-hover)] bg-[var(--bg-primary)]/80 p-6 shadow-[0_12px_28px_rgba(0,0,0,0.12)] sm:p-7">
        <div className={`flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-start sm:justify-between ${color.light}`}>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider opacity-75">Phase {index + 1} overview</p>
            <h4 className="mt-1 text-xl font-extrabold theme-text-title">{item.milestone}</h4>
            <p className="mt-2 text-sm leading-relaxed theme-text-body">{item.description || 'Detailed execution phase and technical objectives.'}</p>
          </div>
          {item.duration && <span className={`shrink-0 rounded-xl px-3 py-2 text-sm font-bold shadow-sm ${color.bg}`}>{item.duration}</span>}
        </div>

        <div className="mt-6 space-y-6">
          {tasks.length > 0 && (
            <section>
              <h5 className="mb-3 text-sm font-extrabold uppercase tracking-wider theme-text-title">Technical objectives & tasks</h5>
              <div className="grid gap-3">
                {tasks.map((task, taskIndex) => {
                  const isTextTask = typeof task === 'string';
                  return (
                    <div key={taskIndex} className="rounded-xl border border-[var(--color-border)] bg-[var(--bg-surface)] p-4">
                      <div className="flex gap-3">
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold ${color.light}`}>{taskIndex + 1}</span>
                        <div className="min-w-0">
                          <p className="font-bold theme-text-title">{isTextTask ? task : task.title || task.name || 'Technical task'}</p>
                          {!isTextTask && task.description && <p className="mt-1 text-sm leading-relaxed theme-text-muted">{task.description}</p>}
                          {!isTextTask && task.rationale && <p className="mt-3 border-t border-[var(--color-border)] pt-3 text-sm leading-relaxed theme-text-body"><span className="font-bold theme-text-title">Technical rationale: </span>{task.rationale}</p>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
          <ListSection title="Deliverables & milestones" items={deliverables} />
          {item.technical_rationale && <section className="border-t border-[var(--color-border)] pt-5"><h5 className="text-sm font-extrabold uppercase tracking-wider theme-text-title">Technical rationale</h5><p className="mt-2 text-sm leading-relaxed theme-text-body">{item.technical_rationale}</p></section>}
          {(item.timeline || item.duration) && <section className="border-t border-[var(--color-border)] pt-5"><h5 className="text-sm font-extrabold uppercase tracking-wider theme-text-title">Timeline</h5><p className="mt-2 text-sm theme-text-body">{item.timeline || item.duration}</p></section>}
        </div>
      </div>
    </motion.div>
  );
}

export default function PlanCard({ status, roadmap, currentMilestoneIndex = 0, onMilestoneComplete, milestoneCompleting }) {
  const [expandedPhase, setExpandedPhase] = useState(null);
  const isLoading = status === 'loading';

  if (isLoading) return <div className="theme-card min-h-[400px] flex items-center justify-center"><div className="theme-text-muted text-lg">Generating Execution Roadmap...</div></div>;
  if (!roadmap?.length) return <div className="p-6 text-center text-slate-500 font-medium bg-[var(--bg-surface)] rounded-xl border border-[var(--color-border)]">No execution roadmap was generated for this workspace.</div>;

  return (
    <div className="theme-card h-fit">
      <div className="mb-8 flex items-center gap-2 border-b border-[var(--color-border)] pb-4">
        <svg className="w-6 h-6 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
        <h3 className="text-xl font-bold theme-text-title">Detailed Execution Roadmap</h3>
      </div>

      <div className="relative space-y-8 before:pointer-events-none before:absolute before:inset-y-0 before:ml-[19px] before:w-0.5 before:bg-[var(--color-border-hover)]">
        {roadmap.slice(0, 8).map((item, index) => {
          const color = phaseColors[index % phaseColors.length];
          const isExpanded = expandedPhase === index;
          const isCurrent = index === currentMilestoneIndex;
          const isCompleted = index < currentMilestoneIndex;
          return (
            <div key={`${item.milestone}-${index}`} className="relative flex items-start gap-5">
              <div className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-bold shadow-sm outline outline-4 outline-white dark:outline-[#0B0F19] ${isCompleted ? 'bg-[var(--accent-start)] text-white dark:text-[#0A0E0C]' : isCurrent ? `${color.bg} ring-2 ring-[var(--glow-accent)]/50 ring-offset-2 ring-offset-white dark:ring-offset-[#0B0F19]` : color.bg}`}>
                {isCompleted ? <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> : index + 1}
              </div>
              <div className="min-w-0 flex-1 border-b border-[var(--color-border)] pb-6 pt-1 last:border-0 last:pb-0">
                <button type="button" onClick={() => setExpandedPhase((current) => current === index ? null : index)} aria-expanded={isExpanded} className="group flex w-full flex-col justify-between gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--bg-surface)] p-4 text-left shadow-sm transition-all hover:border-[var(--color-border-hover)] hover:bg-[var(--color-accent-bg)]/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] sm:flex-row sm:items-center">
                  <div className="min-w-0"><h4 className="truncate text-base font-bold theme-text-title">{item.milestone}</h4><p className="mt-0.5 truncate text-xs font-medium theme-text-muted">{item.description || `${item.tasks?.length || 0} tasks planned`}</p></div>
                  <div className="flex shrink-0 items-center gap-4"><span className={`rounded-md px-3 py-1 text-xs font-semibold ${color.light}`}>{item.duration || 'Timeline pending'}</span><svg className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-90 text-[var(--color-accent)]' : 'group-hover:translate-x-0.5 group-hover:text-[var(--color-accent)]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg></div>
                </button>
                <AnimatePresence initial={false}>{isExpanded && <PhaseDetails item={item} index={index} color={color} />}</AnimatePresence>
                {isCurrent && onMilestoneComplete && <button onClick={onMilestoneComplete} disabled={milestoneCompleting} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 transition-all hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20">{milestoneCompleting ? 'Completing…' : 'Mark Milestone Complete'}</button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
