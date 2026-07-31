import React, { useState } from 'react';
import { askMentor, refreshWorkspace } from '../api';
import ClickableSectionHeading from './ClickableSectionHeading';

function ExpandableListItem({ children, textToQuery, idea, research, plan, workspaceId, experienceLevel }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mentorResponse, setMentorResponse] = useState(null);
  const [error, setError] = useState(null);

  const toggleExpand = async () => {
    const willExpand = !isExpanded;
    setIsExpanded(willExpand);

    if (willExpand && !mentorResponse && !isLoading) {
      setIsLoading(true);
      setError(null);
      try {
        const res = await askMentor({
          idea: idea,
          research: research,
          plan: plan,
          workspace_id: workspaceId,
          experience_level: experienceLevel,
          question: `Explain in more detail why this is a factor for this specific idea, in plain language a beginner could understand: "${textToQuery}"`
        });
        setMentorResponse(res);
      } catch (err) {
        setError(err.message || "Failed to load explanation.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <li className="list-none">
      <div 
        className="flex items-start gap-3 cursor-pointer hover:text-[var(--color-accent)] transition-colors"
        onClick={toggleExpand}
      >
        <svg 
          className={`w-5 h-5 shrink-0 mt-1 transition-transform ${isExpanded ? 'rotate-90 text-[var(--color-accent)]' : 'text-slate-400'}`} 
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
        </svg>
        <div className="flex-1">
          {children}
        </div>
      </div>
      
      {isExpanded && (
        <div className="mt-4 ml-8 mb-4 p-5 bg-[var(--color-accent-bg)] border border-[var(--color-border)] rounded-xl text-base leading-relaxed theme-text-body shadow-inner">
          {isLoading ? (
            <div className="flex items-center gap-2 text-slate-500 font-medium">
              <svg className="animate-spin w-4 h-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Thinking...
            </div>
          ) : error ? (
            <div className="text-red-500">{error}</div>
          ) : mentorResponse ? (
            <div className="space-y-3">
              <p>{mentorResponse.answer}</p>
              {mentorResponse.learning_resources && mentorResponse.learning_resources.length > 0 && (
                <div className="pt-3 mt-3 border-t border-[var(--color-border)]">
                  <h6 className="font-semibold theme-text-title mb-2 text-lg">Learn More:</h6>
                  <ul className="list-disc pl-5 space-y-2">
                    {mentorResponse.learning_resources.map((link, i) => (
                      <li key={i}>
                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-[var(--color-accent)] hover:underline">
                          {link.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </li>
  );
}

export default function ResearchCard({ status, research, critique, idea, plan, workspaceId, onRefreshSuccess, openPanel, experienceLevel }) {
  const isLoading = status === "loading";
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const getRelativeTime = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffHours / 24)} day${Math.floor(diffHours / 24) > 1 ? 's' : ''} ago`;
  };

  const handleRefresh = async () => {
    if (isRefreshing || !workspaceId) return;
    setIsRefreshing(true);
    try {
      const res = await refreshWorkspace(workspaceId);
      if (onRefreshSuccess) {
        onRefreshSuccess(res.research, res.new_sources || [], res.new_source_count || 0);
      }
    } catch (err) {
      alert("Failed to refresh: " + err.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading && !research) {
    return (
      <div className="theme-card min-h-[400px] flex items-center justify-center">
        <div className="theme-text-muted text-lg">Analyzing Startup Idea...</div>
      </div>
    );
  }

  if (!research || Object.keys(research).length === 0) {
    return (
      <div className="p-6 text-center text-slate-500 font-medium bg-[var(--bg-surface)] rounded-xl border border-[var(--color-border)]">
        No research data was generated for this workspace.
      </div>
    );
  }

  return (
    <div className="theme-card h-fit">
      <div className="flex justify-between items-center mb-6 border-b border-[var(--color-border)] pb-4">
        <h3 className="text-xl font-bold theme-text-title flex items-center gap-2">
          <svg className="w-6 h-6 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
          Technical Analysis
        </h3>
        {research.fetched_at && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium theme-text-muted">
              Last updated: {getRelativeTime(research.fetched_at)}
            </span>
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg text-slate-400 hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-bg)] transition-colors disabled:opacity-50"
              title="Refresh Research"
            >
              <svg className={`w-5 h-5 ${isRefreshing ? 'animate-spin text-[var(--color-accent)]' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
            </button>
          </div>
        )}
      </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <ClickableSectionHeading 
          title="Problem Overview" 
          subtitle="Summary of the core problem being solved"
          preview={research.problem_validation || "N/A"}
          onClick={() => openPanel("Problem Overview", (
            <p className="text-lg theme-text-body leading-relaxed">
              {research.problem_validation || "N/A"}
            </p>
          ))} 
        />
      </div>

      <div>
        <ClickableSectionHeading 
          title="Existing Solutions" 
          subtitle="Competitors and alternative approaches"
          preview={research.existing_solutions && research.existing_solutions.length > 0 ? `${research.existing_solutions.length} solutions found` : "No direct competitors found"}
          onClick={() => openPanel("Existing Solutions", (
            <>
            {research.existing_solutions && research.existing_solutions.length > 0 ? (
              <ul className="space-y-5">
                {research.existing_solutions.map((sol, idx) => (
                  <ExpandableListItem 
                    key={idx} 
                    textToQuery={`${sol.name}: ${sol.description}`}
                    idea={idea} research={research} plan={plan} workspaceId={workspaceId} experienceLevel={experienceLevel}
                  >
                    <div className="text-lg theme-text-body">
                      <span className="font-bold theme-text-title text-xl">{sol.name}</span>: {sol.description}
                      {sol.gap && <div className="text-base theme-text-muted mt-1">{sol.gap}</div>}
                    </div>
                  </ExpandableListItem>
                ))}
              </ul>
            ) : (
              <p className="text-lg theme-text-body">No direct named competitors found.</p>
            )}
            </>
          ))} 
        />
      </div>

      <div>
        <ClickableSectionHeading 
          title="Market Opportunity" 
          subtitle="Target audience and market potential"
          preview={research.market_research_summary || "N/A"}
          onClick={() => openPanel("Market Opportunity", (
            <p className="text-lg theme-text-body leading-relaxed">
              {research.market_research_summary || "N/A"}
            </p>
          ))} 
        />
      </div>

      <div>
        <ClickableSectionHeading 
          title="Research Gaps" 
          subtitle="Identified missing areas in current solutions"
          preview={research.research_gaps && research.research_gaps.length > 0 ? `${research.research_gaps.length} gaps identified` : "No significant gaps identified"}
          onClick={() => openPanel("Research Gaps", (
            <>
            {research.research_gaps && research.research_gaps.length > 0 ? (
              <ul className="space-y-5">
                {research.research_gaps.map((gapObj, idx) => (
                  <ExpandableListItem 
                    key={idx} 
                    textToQuery={gapObj.gap}
                    idea={idea} research={research} plan={plan} workspaceId={workspaceId} experienceLevel={experienceLevel}
                  >
                    <div className="text-lg theme-text-body">{gapObj.gap}</div>
                  </ExpandableListItem>
                ))}
              </ul>
            ) : (
              <p className="text-lg theme-text-body">No significant research gaps identified.</p>
            )}
            </>
          ))} 
        />
      </div>

      <div>
        <ClickableSectionHeading 
          title="Innovation Opportunities" 
          subtitle="Potential unique angles to explore"
          preview={research.innovation_opportunities && research.innovation_opportunities.length > 0 ? `${research.innovation_opportunities.length} opportunities identified` : "No innovation opportunities identified"}
          onClick={() => openPanel("Innovation Opportunities", (
            <>
            {research.innovation_opportunities && research.innovation_opportunities.length > 0 ? (
              <ul className="list-disc pl-6 text-lg theme-text-body space-y-4 marker:text-[var(--color-accent)]">
                {research.innovation_opportunities.map((opp, idx) => (
                  <li key={idx}>
                    <span>{opp.approach}</span>
                    <div className="text-base theme-text-muted mt-1">Addresses: {opp.addresses}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-lg theme-text-body">No innovation opportunities identified.</p>
            )}
            </>
          ))} 
        />
      </div>

        {research.unverified_claims && research.unverified_claims.length > 0 && (
          <div className="bg-[var(--color-accent-bg)] border border-[var(--color-border-hover)] p-4 rounded-xl">
            <ClickableSectionHeading 
              title="Unverified Claims" 
              subtitle="Statements requiring further evidence"
              preview={`${research.unverified_claims.length} claims requiring evidence`}
              icon={<svg className="w-5 h-5 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>}
              onClick={() => openPanel("Unverified Claims", (
                <ul className="space-y-5">
                  {research.unverified_claims.map((claim, idx) => (
                    <ExpandableListItem 
                      key={idx} 
                      textToQuery={claim}
                      idea={idea} research={research} plan={plan} workspaceId={workspaceId} experienceLevel={experienceLevel}
                    >
                      <div className="text-base text-[var(--color-accent)]">{claim}</div>
                    </ExpandableListItem>
                  ))}
                </ul>
              ))} 
            />
          </div>
        )}

        <div className="md:col-span-2">
          <ClickableSectionHeading 
            title="Critique Breakdown" 
            subtitle="Detailed pass/fail analysis criteria"
            onClick={() => openPanel("Critique Breakdown", (
              <div className="space-y-4">
                {critique?.criteria && (
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                     {Object.entries(critique.criteria).map(([criterion, data]) => (
                       <div key={criterion} className={`p-3 rounded-xl border ${data.pass ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                         <div className="flex items-center gap-2 mb-1">
                           {data.pass ? (
                             <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                           ) : (
                             <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
                           )}
                           <span className="font-semibold capitalize text-slate-800 dark:text-slate-200">{criterion}</span>
                         </div>
                         <p className="text-sm theme-text-body">{data.note}</p>
                       </div>
                     ))}
                   </div>
                )}
                
                {critique?.flagged_issues && critique.flagged_issues.length > 0 && (
                  <div>
                    <h5 className="font-semibold theme-text-title mb-1">Flagged Issues</h5>
                    <ul className="list-disc pl-5 text-sm theme-text-body space-y-1 marker:text-red-500">
                      {critique.flagged_issues.map((issue, idx) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {critique?.suggested_fixes && critique.suggested_fixes.length > 0 && (
                  <div>
                    <h5 className="font-semibold theme-text-title mb-1">Suggested Fixes</h5>
                    <ul className="list-disc pl-5 text-sm theme-text-body space-y-1 marker:text-emerald-500">
                      {critique.suggested_fixes.map((fix, idx) => (
                        <li key={idx}>{fix}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))} 
          />
        </div>
      </div>
    </div>
  );
}
