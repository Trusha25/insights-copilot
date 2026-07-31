import React, { useState } from 'react';
import ResearchCard from './ResearchCard';
import ArchitectureCard from './ArchitectureCard';
import PlanCard from './PlanCard';
import ResourcesCard from './ResourcesCard';
import FollowUpChat from './FollowUpChat';
import DetailPanel from './DetailPanel';

export default function WorkspaceDashboard({
  result,
  idea,
  status,
  newSourceUrls,
  onRefreshResearch,
  onToggleSaveActive,
  onEditIdea,
  primaryModel,
  experienceLevel,
  onCancel,
  setToastMessage
}) {
  const [expanded, setExpanded] = useState({
    techAnalysis: true,
    architecture: false,
    roadmap: false,
    resources: false
  });

  const [activeTab, setActiveTab] = useState('analysis');
  const [activePanel, setActivePanel] = useState(null);

  const openPanel = (title, content) => {
    console.log(`[openPanel] Title: ${title}`);
    console.log('[openPanel] Content being passed:', content);
    setActivePanel({ title, content });
  };

  const toggleSection = (key) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const workspaceId = result?.workspace_id;

  // Calculate dynamic metrics from critique/research data
  const criteria = result?.critique?.criteria || {};
  const totalCriteria = Object.keys(criteria).length;
  const passedCriteria = Object.values(criteria).filter(x => x.pass).length;
  const baseScore = totalCriteria > 0 ? Math.round((passedCriteria / totalCriteria) * 100) : 75;

  const marketPotential = Math.min(95, Math.max(60, 100 - (result?.research?.existing_solutions?.length || 0) * 7));
  const technicalFeasibility = Math.min(95, Math.max(50, 60 + (result?.plan?.tech_stack?.length || 0) * 4));
  const businessViability = criteria?.scalable?.pass ? (criteria?.actionable?.pass ? 85 : 75) : 65;
  
  // COMPOSITE SCORE FORMULA — must stay in sync with agents.py:generate_founder_insight.
  // If you change this calculation, update the matching formula there too.
  const startupScore = Math.round((baseScore + marketPotential + technicalFeasibility + businessViability) / 4);
  
  const flaggedCount = result?.critique?.flagged_issues?.length || 0;
  const riskLevel = flaggedCount === 0 ? "Low" : flaggedCount <= 2 ? "Medium" : "High";

  // SVG Radar Chart math (Center 50, 50, Radius 40)
  const valMarket = marketPotential / 100;
  const valBusiness = businessViability / 100;
  const valRisk = (riskLevel === "Low" ? 90 : riskLevel === "Medium" ? 65 : 40) / 100;
  const valTech = technicalFeasibility / 100;

  const ptMarket = { x: 50, y: 50 - 40 * valMarket };
  const ptBusiness = { x: 50 + 40 * valBusiness, y: 50 };
  const ptRisk = { x: 50, y: 50 + 40 * valRisk };
  const ptTech = { x: 50 - 40 * valTech, y: 50 };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    if (setToastMessage) {
      setToastMessage("Workspace shareable link copied to clipboard!");
      setTimeout(() => setToastMessage(""), 3000);
    }
  };

  const handleExport = () => {
    window.print();
  };

  const getVerdictLabel = () => {
    if (startupScore >= 80) return "VERY PROMISING";
    if (startupScore >= 65) return "VIABLE WITH SCOPE";
    return "HIGH RISK BOTTLENECK";
  };

  const getVerdictText = () => {
    if (startupScore >= 80) {
      return "The concept shows strong market alignment with minor execution gaps. Build an MVP and test immediately.";
    }
    if (startupScore >= 65) {
      return "Concept is viable but requires significant differentiation. Focus on narrowing down your niche target.";
    }
    return "High technical complexity and low differentiation detected. Re-evaluate the core value proposition.";
  };

  return (
    <div className="flex flex-row w-full items-start">
      {/* Main Content Dashboard */}
      <div className={`flex-1 flex flex-col gap-8 font-sans max-w-7xl mx-auto w-full select-none print:p-0 transition-all duration-300 ${activePanel ? 'hidden lg:flex' : ''}`}>
      
      {/* Header bar actions */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[var(--color-border)] pb-5 shrink-0 print:hidden">
        <div className="min-w-0">
          <button
            onClick={onCancel}
            className="text-xs font-bold text-slate-500 hover:text-[var(--color-accent)] transition-colors flex items-center gap-1.5 mb-2 cursor-pointer uppercase tracking-wider"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span>Back to Projects</span>
          </button>
          
          <div className="flex items-center gap-3">
            <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-tight truncate max-w-lg lg:max-w-xl" title={idea}>
              {idea}
            </h1>
            <button
              onClick={onEditIdea}
              className="p-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--bg-surface)] text-xs font-bold text-slate-400 hover:text-[var(--color-accent)] hover:border-[var(--color-border-hover)] transition-all cursor-pointer flex items-center gap-1 shadow-sm"
              title="Edit original pitch"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span>Edit Idea</span>
            </button>
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Analysis completed • Just now</span>
          </p>
        </div>

        {/* Action Row */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExport}
            className="px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--bg-surface)] text-xs font-bold theme-text-title hover:text-[var(--color-accent)] hover:border-[var(--color-border-hover)] transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m0 0l-3-3m3 3l3-3m-12 6h18" />
            </svg>
            <span>Export Report</span>
          </button>

          <button
            onClick={onToggleSaveActive}
            className={`px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
              result?.is_saved
                ? 'bg-[var(--color-accent-bg)] border-[var(--color-accent)] text-[var(--color-accent)] shadow-[0_0_12px_var(--color-accent-glow)]'
                : 'bg-[var(--bg-surface)] border-[var(--color-border)] theme-text-title hover:border-[var(--color-border-hover)]'
            }`}
          >
            <svg className={`w-4 h-4 ${result?.is_saved ? 'fill-[var(--color-accent)] text-[var(--color-accent)]' : 'text-slate-400'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499c.158-.343.344-.66.52-.947.176.287.362.604.52.947l2.193 4.444a1 1 0 00.758.552l4.904.713c.38.055.53.518.257.788l-3.548 3.46a1 1 0 00-.287.885l.838 4.886c.065.378-.33.666-.67.487l-4.387-2.31a1 1 0 00-.93 0l-4.387 2.31c-.34.179-.735-.109-.67-.487l.838-4.886a1 1 0 00-.287-.885l-3.548-3.46c-.273-.27-.123-.733.257-.788l4.904-.713a1 1 0 00.758-.552l2.193-4.444z" />
            </svg>
            <span>{result?.is_saved ? "Saved Project" : "Save Project"}</span>
          </button>

          <button
            onClick={handleShare}
            className="px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--bg-surface)] text-xs font-bold theme-text-title hover:text-[var(--color-accent)] hover:border-[var(--color-border-hover)] transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 10.742a3 3 0 110-5.484m0 5.484a3 3 0 112.528 4.713M8.684 10.742A9.75 9.75 0 003 19.76m8.228-4.306A9.75 9.75 0 0118.75 19.76m-7.5-4.306a7.5 7.5 0 01-6 0M18 9v3m0 0v3m0-3h3" />
            </svg>
            <span>Share</span>
          </button>
        </div>
      </header>

      <div className="flex gap-4 border-b border-[var(--color-border)] pb-px -mt-4 mb-2 w-full">
        <button
          onClick={() => setActiveTab('analysis')}
          className={`pb-3 px-4 text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'analysis'
              ? 'text-[var(--color-accent)] border-b-2 border-[var(--color-accent)] font-bold'
              : 'text-slate-400 hover:text-[var(--color-accent)]'
          }`}
        >
          Analysis
        </button>
        <button
          onClick={() => setActiveTab('executive')}
          className={`pb-3 px-4 text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'executive'
              ? 'text-[var(--color-accent)] border-b-2 border-[var(--color-accent)] font-bold'
              : 'text-slate-400 hover:text-[var(--color-accent)]'
          }`}
        >
          Executive Insights
        </button>
      </div>

      {activeTab === 'executive' && (
        <>
      {/* Row 1: Executive Summary & Brutal Verdict */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        
        {/* Executive Summary Card (2 Cols) */}
        <div className="md:col-span-2 theme-card flex flex-col sm:flex-row items-center gap-8 justify-between">
          <div className="flex flex-col items-center justify-center shrink-0">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 text-center">Startup Score</h3>
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle cx="64" cy="64" r="50" className="stroke-slate-900" strokeWidth="8" fill="transparent" />
                <circle
                  cx="64"
                  cy="64"
                  r="50"
                  className="stroke-[var(--color-accent)] transition-all duration-500"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray="314.16"
                  strokeDashoffset={314.16 - (314.16 * startupScore) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-white leading-none">
                  {startupScore}
                </span>
                <span className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest">
                  / 100
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5 mb-2.5">
              <h3 className="text-lg font-bold text-white uppercase tracking-wider">Executive Summary</h3>
              <span className="bg-[var(--color-accent-bg)] text-[var(--color-accent)] border border-[var(--color-border-hover)] text-[10px] font-black px-2 py-0.5 rounded leading-none uppercase tracking-wide">
                {getVerdictLabel()}
              </span>
            </div>
            
            <p className="text-sm theme-text-body leading-relaxed mb-5">
              {getVerdictText()} Focus on technical architecture scaffolding and solving identified validation gaps.
            </p>

            {/* Individual Sub-metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-[var(--color-border)] text-xs">
              <div>
                <span className="text-slate-500 block mb-1 font-semibold">Market Potential</span>
                <span className="font-bold text-white">{marketPotential} <span className="text-[10px] text-slate-500">/ 100</span></span>
              </div>
              <div>
                <span className="text-slate-500 block mb-1 font-semibold">Implementation</span>
                <span className="font-bold text-white">{technicalFeasibility} <span className="text-[10px] text-slate-500">/ 100</span></span>
              </div>
              <div>
                <span className="text-slate-500 block mb-1 font-semibold">Business Viability</span>
                <span className="font-bold text-white">{businessViability} <span className="text-[10px] text-slate-500">/ 100</span></span>
              </div>
              <div>
                <span className="text-slate-500 block mb-1 font-semibold">Risk Level</span>
                <span className={`font-bold ${riskLevel === 'Low' ? 'text-emerald-400' : riskLevel === 'Medium' ? 'text-[var(--color-accent)]' : 'text-red-400'}`}>♦ {riskLevel}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Brutal Verdict Card (1 Col) */}
        <div className="theme-card flex flex-col justify-between gap-4">
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Brutal Verdict</h3>
            <h2 className="text-xl font-bold text-white mb-2">
              {startupScore >= 75 ? "Go, but be smart." : "High barrier entry."}
            </h2>
            <p className="text-xs theme-text-body leading-relaxed mb-4">
              Our critique agent audited the weaknesses. Addressing these priority items will maximize launch velocity.
            </p>
          </div>

          <ul className="space-y-1.5 text-[11px] font-bold text-slate-350">
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-500 shrink-0">✚</span>
              <span>Validated customer validation hooks</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-500 shrink-0">✚</span>
              <span>Modular stack scalability scope</span>
            </li>
            {flaggedCount > 0 && (
              <li className="flex items-start gap-1.5">
                <span className="text-red-450 shrink-0">✖</span>
                <span className="truncate" title={result?.critique?.flagged_issues[0]}>
                  {result.critique.flagged_issues[0]}
                </span>
              </li>
            )}
          </ul>
        </div>

      </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch w-full mt-6">
            {/* Radar Chart */}
            <div className="theme-card flex flex-col items-center justify-center pb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">At a Glance</span>
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-40 h-40" viewBox="0 0 100 100">
                  {/* Background grid concentric circles */}
                  <circle cx="50" cy="50" r="40" className="stroke-slate-800" strokeWidth="0.5" fill="none" />
                  <circle cx="50" cy="50" r="30" className="stroke-slate-800/60" strokeWidth="0.5" fill="none" />
                  <circle cx="50" cy="50" r="20" className="stroke-slate-800/40" strokeWidth="0.5" fill="none" />
                  <circle cx="50" cy="50" r="10" className="stroke-slate-800/20" strokeWidth="0.5" fill="none" />
                  
                  {/* Axis straight lines */}
                  <line x1="50" y1="10" x2="50" y2="90" className="stroke-slate-800/75" strokeWidth="0.5" />
                  <line x1="10" y1="50" x2="90" y2="50" className="stroke-slate-800/75" strokeWidth="0.5" />
                  
                  {/* Labels */}
                  <text x="50" y="8" className="text-[5.5px] fill-slate-400 font-bold" textAnchor="middle">MARKET</text>
                  <text x="92" y="52" className="text-[5.5px] fill-slate-400 font-bold" textAnchor="start">BUSINESS</text>
                  <text x="50" y="96" className="text-[5.5px] fill-slate-400 font-bold" textAnchor="middle">RISK</text>
                  <text x="8" y="52" className="text-[5.5px] fill-slate-400 font-bold" textAnchor="end">TECH</text>

                  {/* Scaling variables coordinates polygon */}
                  <polygon
                    points={`${ptMarket.x},${ptMarket.y} ${ptBusiness.x},${ptBusiness.y} ${ptRisk.x},${ptRisk.y} ${ptTech.x},${ptTech.y}`}
                    className="fill-[var(--color-accent-bg)]/25 stroke-[var(--color-accent)]"
                    strokeWidth="1.2"
                  />
                  
                  {/* Data points */}
                  <circle cx={ptMarket.x} cy={ptMarket.y} r="1.2" className="fill-[var(--color-accent)]" />
                  <circle cx={ptBusiness.x} cy={ptBusiness.y} r="1.2" className="fill-[var(--color-accent)]" />
                  <circle cx={ptRisk.x} cy={ptRisk.y} r="1.2" className="fill-[var(--color-accent)]" />
                  <circle cx={ptTech.x} cy={ptTech.y} r="1.2" className="fill-[var(--color-accent)]" />
                </svg>
              </div>
              
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3 text-[10px] font-bold text-slate-500 select-none">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-[var(--color-accent)] rounded-full"></span> Market: {marketPotential}</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-[var(--color-accent)] rounded-full"></span> Tech: {technicalFeasibility}</span>
              </div>
            </div>

            {/* Top Actions list */}
            <div className="theme-card flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Top Actions</h3>
                
                {result?.critique?.suggested_fixes && result.critique.suggested_fixes.length > 0 ? (
                  <ul className="space-y-3.5">
                    {result.critique.suggested_fixes.slice(0, 3).map((fix, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs">
                        <span className="w-5 h-5 rounded-full bg-[var(--color-accent-bg)] border border-[var(--color-border-hover)] text-[var(--color-accent)] flex items-center justify-center font-bold shrink-0 text-[10px] mt-0.5">
                          {idx + 1}
                        </span>
                        <p className="theme-text-body font-semibold leading-relaxed truncate" title={fix}>
                          {fix}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul className="space-y-3.5">
                    <li className="flex items-start gap-2.5 text-xs">
                      <span className="w-5 h-5 rounded-full bg-[var(--color-accent-bg)] text-[var(--color-accent)] flex items-center justify-center font-bold shrink-0 text-[10px] mt-0.5">1</span>
                      <span className="theme-text-body font-semibold">Validate with target MVP hooks</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-xs">
                      <span className="w-5 h-5 rounded-full bg-[var(--color-accent-bg)] text-[var(--color-accent)] flex items-center justify-center font-bold shrink-0 text-[10px] mt-0.5">2</span>
                      <span className="theme-text-body font-semibold">Interview 20+ beta target audience</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-xs">
                      <span className="w-5 h-5 rounded-full bg-[var(--color-accent-bg)] text-[var(--color-accent)] flex items-center justify-center font-bold shrink-0 text-[10px] mt-0.5">3</span>
                      <span className="theme-text-body font-semibold">Build core modular landing page</span>
                    </li>
                  </ul>
                )}
              </div>

              <button className="w-full py-2.5 mt-5 border border-[var(--color-border)] rounded-xl text-xs font-bold theme-text-title bg-[var(--bg-surface)] hover:border-[var(--color-border-hover)] transition-all cursor-pointer shadow-inner">
                View All Recommendations
              </button>
            </div>
          </div>
        </>
      )}

      {activeTab === 'analysis' && (
        <>
      {/* Accordions (Left Pane, 3 Cols) */}
      <div className="w-full space-y-4">
          
          {/* Technical Analysis Section */}
          <div className="theme-card !p-0 overflow-hidden border border-[var(--color-border)] rounded-2xl bg-[var(--bg-surface)]">
            <button
              onClick={() => toggleSection('techAnalysis')}
              className="w-full flex items-center justify-between p-5 text-left cursor-pointer focus:outline-none select-none hover:bg-[var(--color-accent-bg)]/20 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-accent-bg)] text-[var(--color-accent)] border border-[var(--color-border-hover)] flex items-center justify-center shrink-0 shadow-sm">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-white text-base">Technical Analysis</span>
                    <span className="text-[9px] font-black uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">Completed</span>
                  </div>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">Problem overview, market research, and critique breakdown</p>
                </div>
              </div>
              <svg className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${expanded.techAnalysis ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {expanded.techAnalysis && (
              <div className="p-6 border-t border-[var(--color-border)] bg-[#030407]/45 space-y-6">
                <ResearchCard status={status} research={result?.research} critique={result?.critique} idea={idea} plan={result?.plan} workspaceId={workspaceId} onRefreshSuccess={onRefreshResearch} openPanel={openPanel} experienceLevel={experienceLevel} />
              </div>
            )}
          </div>

          {/* Project Architecture Section */}
          <div className="theme-card !p-0 overflow-hidden border border-[var(--color-border)] rounded-2xl bg-[var(--bg-surface)]">
            <button
              onClick={() => toggleSection('architecture')}
              className="w-full flex items-center justify-between p-5 text-left cursor-pointer focus:outline-none select-none hover:bg-[var(--color-accent-bg)]/20 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-accent-bg)] text-[var(--color-accent)] border border-[var(--color-border-hover)] flex items-center justify-center shrink-0 shadow-sm">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-white text-base">Project Architecture</span>
                    <span className="text-[9px] font-black uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">Completed</span>
                  </div>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">Technical feasibility, stack recommendations & component diagrams</p>
                </div>
              </div>
              <svg className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${expanded.architecture ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {expanded.architecture && (
              <div className="p-6 border-t border-[var(--color-border)] bg-[#030407]/45">
                <ArchitectureCard status={status} plan={result?.plan} openPanel={openPanel} />
              </div>
            )}
          </div>

          {/* 5-Step Execution Roadmap Section */}
          <div className="theme-card !p-0 overflow-hidden border border-[var(--color-border)] rounded-2xl bg-[var(--bg-surface)]">
            <button
              onClick={() => toggleSection('roadmap')}
              className="w-full flex items-center justify-between p-5 text-left cursor-pointer focus:outline-none select-none hover:bg-[var(--color-accent-bg)]/20 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-accent-bg)] text-[var(--color-accent)] border border-[var(--color-border-hover)] flex items-center justify-center shrink-0 shadow-sm">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-white text-base">5-Step Execution Roadmap</span>
                    <span className="text-[9px] font-black uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">Completed</span>
                  </div>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">Milestone duration and execution steps roadmap</p>
                </div>
              </div>
              <svg className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${expanded.roadmap ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {expanded.roadmap && (
              <div className="p-6 border-t border-[var(--color-border)] bg-[#030407]/45">
                <PlanCard status={status} roadmap={result?.plan?.roadmap} openPanel={openPanel} />
              </div>
            )}
          </div>

          {/* Key Resources Section */}
          <div className="theme-card !p-0 overflow-hidden border border-[var(--color-border)] rounded-2xl bg-[var(--bg-surface)]">
            <button
              onClick={() => toggleSection('resources')}
              className="w-full flex items-center justify-between p-5 text-left cursor-pointer focus:outline-none select-none hover:bg-[var(--color-accent-bg)]/20 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-accent-bg)] text-[var(--color-accent)] border border-[var(--color-border-hover)] flex items-center justify-center shrink-0 shadow-sm">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-white text-base">Key Resources</span>
                    <span className="text-[9px] font-black uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">Completed</span>
                  </div>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">Academic sources, GitHub code repositories & datasets</p>
                </div>
              </div>
              <svg className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${expanded.resources ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {expanded.resources && (
              <div className="p-6 border-t border-[var(--color-border)] bg-[#030407]/45">
                <ResourcesCard status={status} research={result?.research} newSourceUrls={newSourceUrls} openPanel={openPanel} />
              </div>
            )}
          </div>

        </div>

      {/* Row 3: Follow Up AI Consulting Chat */}
      <div className="w-full shrink-0 print:hidden mt-6">
        <FollowUpChat
          workspaceId={workspaceId}
          initialHistory={result?.chat_history || []}
          idea={idea}
          primaryModel={primaryModel}
          experienceLevel={experienceLevel}
        />
      </div>
        </>
      )}

      </div>

      {/* Slide-in Detail Panel */}
      {activePanel && (
        <DetailPanel 
          title={activePanel.title} 
          onClose={() => setActivePanel(null)}
        >
          {activePanel.content}
        </DetailPanel>
      )}
    </div>
  );
}
