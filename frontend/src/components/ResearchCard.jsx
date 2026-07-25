import React from 'react';

export default function ResearchCard({ status, research, critique }) {
  const isLoading = status === "loading";
  
  if (isLoading) {
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
      </div>

      <div className="space-y-6">
        <div>
          <h4 className="font-bold text-lg text-slate-800 mb-2">Problem Overview</h4>
          <p className="text-base text-slate-700 leading-relaxed">
            {research.problem_validation || "N/A"}
          </p>
        </div>

        <div>
          <h4 className="font-bold text-lg text-slate-800 mb-2">Market Opportunity</h4>
          <p className="text-base text-slate-700 leading-relaxed mb-3">
            {research.market_research_summary || "N/A"}
          </p>
          {research.innovation_opportunities && research.innovation_opportunities.length > 0 && (
            <ul className="list-disc pl-6 text-base text-slate-700 space-y-2 mt-2 marker:text-blue-500">
              {research.innovation_opportunities.map((opp, idx) => (
                <li key={idx}>{opp}</li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h4 className="font-bold text-lg text-slate-800 mb-2">Risks & Critique</h4>
          {critique?.flagged_issues && critique.flagged_issues.length > 0 ? (
             <ul className="list-disc pl-6 text-base text-slate-700 space-y-2 marker:text-red-500">
               {critique.flagged_issues.map((issue, idx) => (
                 <li key={idx}>{issue}</li>
               ))}
             </ul>
          ) : (
            <p className="text-base text-slate-700">No major risks flagged.</p>
          )}
        </div>
      </div>
    </div>
  );
}
