import React from 'react';

/**
 * Parse claim text containing [N] citations and render them as clickable superscript links.
 * e.g. "Duolingo uses spaced repetition [3]" → text + clickable ³ linking to sources[2].url
 */
function renderCitedText(text, sources) {
  if (!text || !sources || !sources.length) return text;

  // Split on bracketed numbers like [1], [2], [12]
  const parts = text.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[(\d+)\]$/);
    if (match) {
      const idx = parseInt(match[1], 10);
      const source = sources.find(s => s.index === idx);
      if (source && source.url) {
        return (
          <a
            key={i}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-blue-700 bg-blue-100 rounded-full hover:bg-blue-200 transition-colors align-super ml-0.5 mr-0.5 no-underline"
            title={`[${idx}] ${source.title || source.url}`}
          >
            {idx}
          </a>
        );
      }
      // No matching source — render as plain text
      return <span key={i} className="text-xs text-slate-400">{part}</span>;
    }
    return <span key={i}>{part}</span>;
  });
}

export default function ResearchCard({ status, research, critique }) {
  const isLoading = status === "loading";

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm min-h-[400px] flex items-center justify-center">
        <div className="text-slate-500 text-lg flex items-center gap-3">
          <svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Running Parallel API Fetch &amp; Citation Analysis...
        </div>
      </div>
    );
  }

  if (!research) return null;

  const sourcesStatus = research.sources_status || {};
  const existingSolutions = research.existing_solutions || [];
  const researchGaps = research.research_gaps || [];
  const recommendedApproach = research.recommended_approach || {};
  const unverifiedFlags = research.unverified_flags || [];
  const sources = research.sources || [];

  const getSourceBadge = (type) => {
    switch (type) {
      case 'github':
        return { label: 'GitHub', bg: 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200' };
      case 'arxiv':
        return { label: 'arXiv', bg: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' };
      case 'semantic_scholar':
        return { label: 'Semantic Scholar', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100' };
      case 'tavily':
      default:
        return { label: 'Web Source', bg: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' };
    }
  };

  const renderStatusPill = (sourceKey, displayName) => {
    const st = sourcesStatus[sourceKey];
    if (st === 'ok') {
      return (
        <span key={sourceKey} className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          {displayName}: ok
        </span>
      );
    }
    if (st === 'empty') {
      return (
        <span key={sourceKey} className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
          {displayName}: empty
        </span>
      );
    }
    return (
      <span key={sourceKey} className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
        {displayName}: failed
      </span>
    );
  };

  const isLegacyFormat = !existingSolutions.length && !researchGaps.length && research.problem_validation;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm h-fit space-y-6">
      {/* Header */}
      <div className="border-b border-slate-100 pb-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
            </svg>
            Technical Analysis
          </h3>
        </div>

        {/* API Sources Status Bar */}
        <div className="flex flex-wrap gap-1.5">
          {renderStatusPill('tavily', 'Tavily')}
          {renderStatusPill('github', 'GitHub')}
          {renderStatusPill('arxiv', 'arXiv')}
          {renderStatusPill('semantic_scholar', 'SemScholar')}
        </div>
      </div>

      {isLegacyFormat ? (
        /* Legacy format fallback for older history items */
        <div className="space-y-6">
          <div>
            <h4 className="font-bold text-lg text-slate-800 mb-2">Problem Overview</h4>
            <p className="text-base text-slate-700 leading-relaxed">{research.problem_validation}</p>
          </div>
          <div>
            <h4 className="font-bold text-lg text-slate-800 mb-2">Market Opportunity</h4>
            <p className="text-base text-slate-700 leading-relaxed">{research.market_research_summary}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Existing Solutions */}
          {existingSolutions.length > 0 && (
            <div>
              <h4 className="font-bold text-base text-slate-900 mb-3 flex items-center justify-between">
                <span>Existing Solutions &amp; Products</span>
                <span className="text-xs text-slate-400 font-normal">Indexed citations [N]</span>
              </h4>
              <ul className="space-y-2.5">
                {existingSolutions.map((item, idx) => {
                  const badge = getSourceBadge(item.source_type);
                  return (
                    <li key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-sm text-slate-800 leading-relaxed">
                      <div className="flex items-start justify-between gap-2">
                        <span>{renderCitedText(item.claim, sources)}</span>
                        {item.source_url && (
                          <a
                            href={item.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md border ${badge.bg} transition-colors`}
                            title={item.source_url}
                          >
                            <span>{badge.label}</span>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Research Gaps */}
          {researchGaps.length > 0 && (
            <div>
              <h4 className="font-bold text-base text-slate-900 mb-3 flex items-center justify-between">
                <span>Research &amp; Technical Gaps</span>
                <span className="text-xs text-slate-400 font-normal">Academic sources</span>
              </h4>
              <ul className="space-y-2.5">
                {researchGaps.map((item, idx) => {
                  const badge = getSourceBadge(item.source_type);
                  return (
                    <li key={idx} className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 text-sm text-slate-800 leading-relaxed">
                      <div className="flex items-start justify-between gap-2">
                        <span>{renderCitedText(item.claim, sources)}</span>
                        {item.source_url && (
                          <a
                            href={item.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md border ${badge.bg} transition-colors`}
                            title={item.source_url}
                          >
                            <span>{badge.label}</span>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Recommended Approach */}
          {recommendedApproach.summary && (
            <div className="p-4 rounded-xl bg-blue-50/40 border border-blue-100 space-y-3">
              <h4 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Recommended Approach
              </h4>
              <p className="text-sm text-slate-700 leading-relaxed">
                {renderCitedText(recommendedApproach.summary, sources)}
              </p>

              {recommendedApproach.justification && recommendedApproach.justification.length > 0 && (
                <div className="pt-2 border-t border-blue-100/80 space-y-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">Traceable Justification</h5>
                  {recommendedApproach.justification.map((just, idx) => (
                    <div key={idx} className="text-xs text-slate-700 bg-white/80 p-2.5 rounded-lg border border-slate-200/60">
                      <p className="font-medium text-slate-800 mb-1">{renderCitedText(just.claim, sources)}</p>
                      {just.references_gap && (
                        <p className="text-[11px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded inline-block">
                          Addresses gap: &quot;{just.references_gap}&quot;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Unverified Flags */}
          {unverifiedFlags.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-amber-900 flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Unverified Flags &amp; Assumptions
                </h4>
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-200 text-amber-800">
                  Unverified
                </span>
              </div>
              <p className="text-xs text-amber-800">
                Claims or assumptions identified without explicit retrieved URL sources are isolated here:
              </p>
              <ul className="list-disc pl-5 text-xs text-amber-900 space-y-1">
                {unverifiedFlags.map((flag, idx) => (
                  <li key={idx}>{flag}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Numbered Sources Reference */}
          {sources.length > 0 && (
            <div className="border-t border-slate-100 pt-4">
              <h4 className="font-bold text-sm text-slate-700 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Sources Reference
              </h4>
              <ol className="space-y-1 text-xs text-slate-600">
                {sources.map((src) => {
                  const badge = getSourceBadge(src.source);
                  return (
                    <li key={src.index} className="flex items-start gap-2 py-1">
                      <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-blue-700 bg-blue-50 rounded-full border border-blue-200 shrink-0 mt-0.5">
                        {src.index}
                      </span>
                      <div className="min-w-0">
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-700 hover:text-blue-900 hover:underline font-medium truncate block"
                          title={src.url}
                        >
                          {src.title || src.url}
                        </a>
                        <span className={`inline-flex items-center px-1.5 py-0 text-[10px] font-medium rounded border ${badge.bg} mt-0.5`}>
                          {badge.label}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </div>
      )}

      {/* Risks & Critique */}
      {critique?.flagged_issues && critique.flagged_issues.length > 0 && (
        <div className="border-t border-slate-100 pt-4">
          <h4 className="font-bold text-sm text-slate-800 mb-2">Critic Agent Flags</h4>
          <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1 marker:text-red-500">
            {critique.flagged_issues.map((issue, idx) => (
              <li key={idx}>{issue}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
