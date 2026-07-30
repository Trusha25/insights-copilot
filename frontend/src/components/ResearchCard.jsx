import React, { useState } from 'react';
import { askMentor, refreshWorkspace } from '../api';

function ExpandableListItem({ children, textToQuery, idea, research, plan, workspaceId }) {
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
        className="flex items-start gap-2 cursor-pointer hover:text-blue-700 transition-colors"
        onClick={toggleExpand}
      >
        <svg 
          className={`w-4 h-4 shrink-0 mt-1 transition-transform ${isExpanded ? 'rotate-90 text-blue-600' : 'text-slate-400'}`} 
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
        </svg>
        <div className="flex-1">
          {children}
        </div>
      </div>
      
      {isExpanded && (
        <div className="mt-3 ml-6 mb-2 p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm leading-relaxed text-slate-700 shadow-inner">
          {isLoading ? (
            <div className="flex items-center gap-2 text-slate-500 font-medium">
              <svg className="animate-spin w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24">
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
                <div className="pt-2 mt-2 border-t border-slate-200">
                  <h6 className="font-semibold text-slate-800 mb-1">Learn More:</h6>
                  <ul className="list-disc pl-5 space-y-1">
                    {mentorResponse.learning_resources.map((link, i) => (
                      <li key={i}>
                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
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

export default function ResearchCard({ status, research, critique, idea, plan, workspaceId, onRefreshSuccess }) {
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
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm min-h-[400px] flex items-center justify-center">
        <div className="text-slate-500 text-lg">Analyzing Startup Idea...</div>
      </div>
    );
  }

  if (!research) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm h-fit">
      <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
          Technical Analysis
        </h3>
        {research.fetched_at && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-500">
              Last updated: {getRelativeTime(research.fetched_at)}
            </span>
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
              title="Refresh Research"
            >
              <svg className={`w-5 h-5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div>
          <h4 className="font-bold text-lg text-slate-800 mb-2">Problem Overview</h4>
          <p className="text-base text-slate-700 leading-relaxed">
            {research.problem_validation || "N/A"}
          </p>
        </div>

        <div>
          <h4 className="font-bold text-lg text-slate-800 mb-2">Existing Solutions</h4>
          {research.existing_solutions && research.existing_solutions.length > 0 ? (
            <ul className="space-y-3">
              {research.existing_solutions.map((sol, idx) => (
                <ExpandableListItem 
                  key={idx} 
                  textToQuery={`${sol.name}: ${sol.description}`}
                  idea={idea} research={research} plan={plan} workspaceId={workspaceId}
                >
                  <div className="text-base text-slate-700">
                    <span className="font-bold">{sol.name}</span>: {sol.description}
                    {sol.gap && <div className="text-sm text-slate-500 mt-0.5">{sol.gap}</div>}
                  </div>
                </ExpandableListItem>
              ))}
            </ul>
          ) : (
            <p className="text-base text-slate-700">No direct named competitors found.</p>
          )}
        </div>

        <div>
          <h4 className="font-bold text-lg text-slate-800 mb-2">Market Opportunity</h4>
          <p className="text-base text-slate-700 leading-relaxed">
            {research.market_research_summary || "N/A"}
          </p>
        </div>

        <div>
          <h4 className="font-bold text-lg text-slate-800 mb-2">Research Gaps</h4>
          {research.research_gaps && research.research_gaps.length > 0 ? (
            <ul className="space-y-3">
              {research.research_gaps.map((gapObj, idx) => (
                <ExpandableListItem 
                  key={idx} 
                  textToQuery={gapObj.gap}
                  idea={idea} research={research} plan={plan} workspaceId={workspaceId}
                >
                  <div className="text-base text-slate-700">{gapObj.gap}</div>
                </ExpandableListItem>
              ))}
            </ul>
          ) : (
            <p className="text-base text-slate-700">No significant research gaps identified.</p>
          )}
        </div>

        <div>
          <h4 className="font-bold text-lg text-slate-800 mb-2">Innovation Opportunities</h4>
          {research.innovation_opportunities && research.innovation_opportunities.length > 0 ? (
            <ul className="list-disc pl-6 text-base text-slate-700 space-y-2 marker:text-blue-500">
              {research.innovation_opportunities.map((opp, idx) => (
                <li key={idx}>
                  <span>{opp.approach}</span>
                  <div className="text-sm text-slate-500 mt-0.5">Addresses: {opp.addresses}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-base text-slate-700">No innovation opportunities identified.</p>
          )}
        </div>

        {research.unverified_claims && research.unverified_claims.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
            <h4 className="font-bold text-lg text-amber-800 mb-2 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              Unverified Claims
            </h4>
            <ul className="space-y-3">
              {research.unverified_claims.map((claim, idx) => (
                <ExpandableListItem 
                  key={idx} 
                  textToQuery={claim}
                  idea={idea} research={research} plan={plan} workspaceId={workspaceId}
                >
                  <div className="text-sm text-amber-800">{claim}</div>
                </ExpandableListItem>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h4 className="font-bold text-lg text-slate-800 mb-3">Critique Breakdown</h4>
          <div className="space-y-4">
            {critique?.criteria && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(critique.criteria).map(([criterion, data]) => (
                  <div key={criterion} className={`p-3 rounded-xl border ${data.pass ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {data.pass ? (
                        <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                      ) : (
                        <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
                      )}
                      <span className="font-semibold capitalize text-slate-800">{criterion}</span>
                    </div>
                    <p className="text-sm text-slate-600">{data.note}</p>
                  </div>
                ))}
              </div>
            )}
            
            {critique?.flagged_issues && critique.flagged_issues.length > 0 && (
              <div>
                <h5 className="font-semibold text-slate-800 mb-1">Flagged Issues</h5>
                <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1 marker:text-red-500">
                  {critique.flagged_issues.map((issue, idx) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {critique?.suggested_fixes && critique.suggested_fixes.length > 0 && (
              <div>
                <h5 className="font-semibold text-slate-800 mb-1">Suggested Fixes</h5>
                <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1 marker:text-emerald-500">
                  {critique.suggested_fixes.map((fix, idx) => (
                    <li key={idx}>{fix}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
