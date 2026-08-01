import React, { useState } from 'react';
import ResearchCard from './ResearchCard';
import ArchitectureCard from './ArchitectureCard';
import PlanCard from './PlanCard';
import ResourcesCard from './ResourcesCard';
import FollowUpChat from './FollowUpChat';
import DetailPanel from './DetailPanel';
import { updateWorkspaceTags } from '../api';

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
  setToastMessage,
  onMilestoneComplete,
  milestoneCompleting
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
    setActivePanel({ title, content });
  };

  const toggleSection = (key) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const [tags, setTags] = useState(result?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [isUpdatingTags, setIsUpdatingTags] = useState(false);

  const handleTagAdd = async (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      const newTag = tagInput.trim();
      if (!tags.includes(newTag)) {
        const newTags = [...tags, newTag];
        setTags(newTags);
        setTagInput('');
        try {
          setIsUpdatingTags(true);
          await updateWorkspaceTags(result.workspace_id, newTags);
        } catch (err) {
          console.error("Failed to add tag", err);
          setTags(tags);
          if (setToastMessage) {
            setToastMessage("Failed to save tag");
            setTimeout(() => setToastMessage(""), 3000);
          }
        } finally {
          setIsUpdatingTags(false);
        }
      }
    }
  };

  const handleTagRemove = async (tagToRemove) => {
    const newTags = tags.filter(t => t !== tagToRemove);
    setTags(newTags);
    try {
      setIsUpdatingTags(true);
      await updateWorkspaceTags(result.workspace_id, newTags);
    } catch (err) {
      console.error("Failed to remove tag", err);
      setTags(tags);
      if (setToastMessage) {
        setToastMessage("Failed to remove tag");
        setTimeout(() => setToastMessage(""), 3000);
      }
    } finally {
      setIsUpdatingTags(false);
    }
  };

  const workspaceId = result?.workspace_id;

  const criteria = result?.critique?.criteria || {};
  const totalCriteria = Object.keys(criteria).length;
  const passedCriteria = Object.values(criteria).filter(x => x.pass).length;
  const baseScore = totalCriteria > 0 ? Math.round((passedCriteria / totalCriteria) * 100) : 75;

  const marketPotential = Math.min(95, Math.max(60, 100 - (result?.research?.existing_solutions?.length || 0) * 7));
  const technicalFeasibility = Math.min(95, Math.max(50, 60 + (result?.plan?.tech_stack?.length || 0) * 4));
  const businessViability = criteria?.scalable?.pass ? (criteria?.actionable?.pass ? 85 : 75) : 65;

  const startupScore = Math.round((baseScore + marketPotential + technicalFeasibility + businessViability) / 4);

  const flaggedCount = result?.critique?.flagged_issues?.length || 0;
  const riskLevel = flaggedCount === 0 ? "Low" : flaggedCount <= 2 ? "Medium" : "High";

  const valMarket = marketPotential / 100;
  const valBusiness = businessViability / 100;
  const valRisk = (riskLevel === "Low" ? 90 : riskLevel === "Medium" ? 65 : 40) / 100;
  const valTech = technicalFeasibility / 100;

  const ptMarket = { x: 50, y: 50 - 40 * valMarket };
  const ptBusiness = { x: 50 + 40 * valBusiness, y: 50 };
  const ptRisk = { x: 50, y: 50 + 40 * valRisk };
  const ptTech = { x: 50 - 40 * valTech, y: 50 };

  const getVerdictLabel = () => {
    if (startupScore >= 80) return "VERY PROMISING";
    if (startupScore >= 65) return "VIABLE WITH SCOPE";
    return "HIGH RISK BOTTLENECK";
  };

  const getVerdictText = () => {
    if (startupScore >= 80) return "The concept shows strong market alignment with minor execution gaps. Build an MVP and test immediately.";
    if (startupScore >= 65) return "Concept is viable but requires significant differentiation. Focus on narrowing down your niche target.";
    return "High technical complexity and low differentiation detected. Re-evaluate the core value proposition.";
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    if (setToastMessage) {
      setToastMessage("Workspace shareable link copied to clipboard!");
      setTimeout(() => setToastMessage(""), 3000);
    }
  };

  const handleExport = () => {
    const research = result?.research || {};
    const plan = result?.plan || {};
    const critique = result?.critique || {};
    const roadmap = plan?.roadmap || [];
    const techStack = plan?.tech_stack || [];
    const components = plan?.architecture_components || [];
    const sources = research?.sources || [];
    const githubRepos = research?.github_repos || [];
    const apisDatasets = research?.apis_datasets || [];

    const reportHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${idea} — Full Analysis Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background: #fff; color: #1a1a2e; padding: 48px; line-height: 1.7; max-width: 900px; margin: 0 auto; }
    h1 { font-size: 28px; font-weight: 800; margin-bottom: 6px; color: #0f0f23; }
    h2 { font-size: 20px; font-weight: 700; margin: 36px 0 14px; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb; color: #1a1a2e; }
    h3 { font-size: 16px; font-weight: 700; margin: 20px 0 8px; color: #374151; }
    p, li { font-size: 14px; color: #4b5563; }
    .subtitle { font-size: 13px; color: #9ca3af; margin-bottom: 24px; }
    .score-row { display: flex; gap: 24px; margin: 16px 0 28px; flex-wrap: wrap; }
    .score-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px 20px; min-width: 160px; flex: 1; }
    .score-card .label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; font-weight: 600; }
    .score-card .value { font-size: 28px; font-weight: 800; color: #1a1a2e; margin-top: 4px; }
    .section-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 12px 0; }
    .section-card h4 { font-size: 15px; font-weight: 700; color: #1f2937; margin-bottom: 6px; }
    .section-card p { font-size: 13px; color: #6b7280; }
    .badge { display: inline-block; background: #eef2ff; color: #4338ca; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; margin: 3px 4px 3px 0; }
    .badge-green { background: #ecfdf5; color: #059669; }
    .badge-red { background: #fef2f2; color: #dc2626; }
    ul { padding-left: 20px; margin: 8px 0; }
    li { margin-bottom: 6px; }
    .roadmap-phase { border-left: 3px solid #6366f1; padding: 16px 0 16px 20px; margin: 12px 0; }
    .roadmap-phase .phase-title { font-size: 16px; font-weight: 700; color: #1f2937; }
    .roadmap-phase .phase-duration { font-size: 12px; color: #6366f1; font-weight: 600; margin-bottom: 10px; }
    .task-item { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; margin: 8px 0; }
    .task-item h5 { font-size: 14px; font-weight: 700; color: #1f2937; margin-bottom: 4px; }
    .task-item .desc { font-size: 13px; color: #4b5563; }
    .task-item .rationale { font-size: 12px; color: #6366f1; margin-top: 8px; padding: 8px 12px; background: #eef2ff; border-radius: 6px; }
    .tech-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 12px 0; }
    .tech-item { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
    .tech-item .name { font-weight: 700; color: #1f2937; font-size: 14px; }
    .tech-item .reason { font-size: 12px; color: #6b7280; margin-top: 2px; }
    .source-link { color: #4338ca; text-decoration: none; font-size: 13px; }
    .source-link:hover { text-decoration: underline; }
    .footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #9ca3af; }
    @media print { body { padding: 24px; } }
  </style>
</head>
<body>
  <h1>${idea}</h1>
  <p class="subtitle">Full Analysis Report • Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} • Insights OS</p>

  <div class="score-row">
    <div class="score-card"><div class="label">Startup Score</div><div class="value">${startupScore}%</div></div>
    <div class="score-card"><div class="label">Market Potential</div><div class="value">${marketPotential}%</div></div>
    <div class="score-card"><div class="label">Tech Feasibility</div><div class="value">${technicalFeasibility}%</div></div>
    <div class="score-card"><div class="label">Business Viability</div><div class="value">${businessViability}%</div></div>
    <div class="score-card"><div class="label">Risk Level</div><div class="value">${riskLevel}</div></div>
  </div>

  <h2>Verdict: ${getVerdictLabel()}</h2>
  <p>${getVerdictText()}</p>

  <h2>Problem Validation</h2>
  <p>${research.problem_validation || 'N/A'}</p>

  <h2>Market Research Summary</h2>
  <p>${research.market_research_summary || 'N/A'}</p>

  ${research.existing_solutions && research.existing_solutions.length > 0 ? `
  <h2>Existing Solutions</h2>
  ${research.existing_solutions.map(s => `
    <div class="section-card">
      <h4>${s.name || 'Unknown'}</h4>
      <p>${s.description || ''}</p>
      ${s.gap ? `<p style="margin-top:6px;color:#dc2626;font-size:12px;font-weight:600;">Gap: ${s.gap}</p>` : ''}
    </div>
  `).join('')}` : ''}

  ${research.research_gaps && research.research_gaps.length > 0 ? `
  <h2>Research Gaps</h2>
  <ul>${research.research_gaps.map(g => `<li>${typeof g === 'string' ? g : g.gap || ''} ${g.citation || ''}</li>`).join('')}</ul>
  ` : ''}

  ${research.innovation_opportunities && research.innovation_opportunities.length > 0 ? `
  <h2>Innovation Opportunities</h2>
  ${research.innovation_opportunities.map(o => `
    <div class="section-card">
      <p><strong>Approach:</strong> ${o.approach || ''}</p>
      <p style="font-size:12px;color:#6366f1;margin-top:4px;">Addresses: ${o.addresses || ''}</p>
    </div>
  `).join('')}` : ''}

  <h2>Technical Critique</h2>
  <p><strong>Overall Verdict:</strong> <span class="badge ${critique.overall_verdict === 'ready' ? 'badge-green' : 'badge-red'}">${critique.overall_verdict || 'N/A'}</span></p>
  ${Object.entries(critique.criteria || {}).map(([key, val]) => `
    <div class="section-card">
      <h4>${key.charAt(0).toUpperCase() + key.slice(1)} <span class="badge ${val?.pass ? 'badge-green' : 'badge-red'}">${val?.pass ? 'PASS' : 'FAIL'}</span></h4>
      <p>${val?.note || ''}</p>
    </div>
  `).join('')}
  ${critique.flagged_issues && critique.flagged_issues.length > 0 ? `<h3>Flagged Issues</h3><ul>${critique.flagged_issues.map(i => `<li>${i}</li>`).join('')}</ul>` : ''}
  ${critique.suggested_fixes && critique.suggested_fixes.length > 0 ? `<h3>Suggested Fixes</h3><ul>${critique.suggested_fixes.map(f => `<li>${f}</li>`).join('')}</ul>` : ''}

  <h2>Architecture Overview</h2>
  <p>${plan.architecture || 'N/A'}</p>

  ${techStack.length > 0 ? `
  <h2>Recommended Tech Stack</h2>
  <div class="tech-grid">
    ${techStack.map(tech => {
      const parts = tech.split(/[:-]/);
      const name = parts[0].trim();
      const reason = parts.slice(1).join('-').trim();
      return `<div class="tech-item"><div class="name">${name}</div>${reason ? `<div class="reason">${reason}</div>` : ''}</div>`;
    }).join('')}
  </div>` : ''}

  ${components.length > 0 ? `
  <h2>Core Components & Services</h2>
  ${components.map(c => `
    <div class="section-card">
      <h4>${c.component} <span class="badge">${c.technology}</span></h4>
      <p>${c.rationale || ''}</p>
    </div>
  `).join('')}` : ''}

  ${roadmap.length > 0 ? `
  <h2>Execution Roadmap</h2>
  ${roadmap.map((phase, i) => `
    <div class="roadmap-phase">
      <div class="phase-duration">Phase ${i + 1} • ${phase.duration || ''}</div>
      <div class="phase-title">${phase.milestone}</div>
      ${phase.tasks && phase.tasks.length > 0 ? phase.tasks.map(task => `
        <div class="task-item">
          <h5>${typeof task === 'string' ? task : task.title || ''}</h5>
          ${typeof task !== 'string' && task.description ? `<div class="desc">${task.description}</div>` : ''}
          ${typeof task !== 'string' && task.rationale ? `<div class="rationale">${task.rationale}</div>` : ''}
        </div>
      `).join('') : `<p>${phase.description || 'No tasks specified.'}</p>`}
    </div>
  `).join('')}` : ''}

  ${sources.length > 0 ? `
  <h2>Sources & References</h2>
  <ul>${sources.map((s, i) => `<li>[${i + 1}] <a class="source-link" href="${s.url}" target="_blank">${s.title || s.url}</a> <span class="badge">${s.source_type || 'web'}</span></li>`).join('')}</ul>
  ` : ''}

  ${githubRepos.length > 0 ? `
  <h3>GitHub Repositories</h3>
  <ul>${githubRepos.map(r => `<li><a class="source-link" href="${r.url}" target="_blank">${r.name}</a> — ${r.why_relevant || ''}</li>`).join('')}</ul>
  ` : ''}

  ${apisDatasets.length > 0 ? `
  <h3>APIs & Datasets</h3>
  <ul>${apisDatasets.map(a => `<li><a class="source-link" href="${a.url}" target="_blank">${a.name}</a> <span class="badge">${a.type || ''}</span></li>`).join('')}</ul>
  ` : ''}

  <div class="footer">Generated by Insights OS • ${new Date().toISOString()}</div>
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(reportHTML);
      printWindow.document.close();
      printWindow.onload = () => {
        setTimeout(() => printWindow.print(), 500);
      };
    }
  };

  // ─── Module Section Config ───────────────────────────────────────────────
  const modules = [
    {
      key: 'techAnalysis',
      title: 'Technical Analysis',
      subtitle: 'Problem overview, market research, and critique breakdown',
      tooltip: 'Deep dive into your idea\'s market validity, competitors, and technical critique.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      content: (
        <ResearchCard
          status={status}
          research={result?.research}
          critique={result?.critique}
          idea={idea}
          plan={result?.plan}
          workspaceId={workspaceId}
          onRefreshSuccess={onRefreshResearch}
          openPanel={openPanel}
          experienceLevel={experienceLevel}
        />
      )
    },
    {
      key: 'architecture',
      title: 'Project Architecture',
      subtitle: 'Technical feasibility, stack recommendations & component diagrams',
      tooltip: 'View recommended tech stack, system design, and architectural components.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      content: (
        <ArchitectureCard status={status} plan={result?.plan} openPanel={openPanel} />
      )
    },
    {
      key: 'roadmap',
      title: '5-Step Execution Roadmap',
      subtitle: 'Milestone durations and step-by-step execution plan',
      tooltip: 'Your personalized action plan broken into 5 phases with tasks and timelines.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
      content: (
        <PlanCard
          status={status}
          roadmap={result?.plan?.roadmap}
          plan={result?.plan}
          openPanel={openPanel}
          currentMilestoneIndex={result?.current_milestone_index || 0}
          onMilestoneComplete={onMilestoneComplete}
          milestoneCompleting={milestoneCompleting}
        />
      )
    },
    {
      key: 'resources',
      title: 'Key Resources',
      subtitle: 'Academic sources, GitHub repositories & datasets',
      tooltip: 'Curated references: research papers, open-source repos, and APIs relevant to your idea.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
      content: (
        <ResourcesCard
          status={status}
          research={result?.research}
          newSourceUrls={newSourceUrls}
          openPanel={openPanel}
        />
      )
    }
  ];

  // ─── JSX ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-row w-full items-start">

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col gap-6 font-sans w-full max-w-full mx-auto select-none print:p-0 transition-all duration-300 pb-12 ${activePanel ? 'hidden lg:flex overflow-hidden' : ''}`}>

        {/* ── Zone 1: Page Header Card ────────────────────────────────── */}
        <div className="bg-[var(--bg-surface)] border border-[var(--color-border)] rounded-2xl shadow-sm p-5 print:hidden">
          
          {/* Top row: back + actions */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onCancel}
              className="flex items-center gap-1.5 text-xs font-bold theme-text-muted hover:text-[var(--color-accent)] transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              <span>Back to Projects</span>
            </button>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {/* Export */}
              <button
                onClick={handleExport}
                className="px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--bg-secondary)] text-xs font-bold theme-text-muted hover:text-[var(--color-accent)] hover:border-[var(--color-border-hover)] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m0 0l-3-3m3 3l3-3m-12 6h18" />
                </svg>
                <span className="hidden sm:inline">Export</span>
              </button>

              {/* Share */}
              <button
                onClick={handleShare}
                className="px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--bg-secondary)] text-xs font-bold theme-text-muted hover:text-[var(--color-accent)] hover:border-[var(--color-border-hover)] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 10.742a3 3 0 110-5.484m0 5.484a3 3 0 112.528 4.713M8.684 10.742A9.75 9.75 0 003 19.76m8.228-4.306A9.75 9.75 0 0118.75 19.76m-7.5-4.306a7.5 7.5 0 01-6 0M18 9v3m0 0v3m0-3h3" />
                </svg>
                <span className="hidden sm:inline">Share</span>
              </button>

              {/* Save — primary accent button */}
              <button
                onClick={onToggleSaveActive}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  result?.is_saved
                    ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white shadow-sm'
                    : 'bg-[var(--bg-surface)] border-[var(--color-border)] theme-text-title hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill={result?.is_saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499c.158-.343.344-.66.52-.947.176.287.362.604.52.947l2.193 4.444a1 1 0 00.758.552l4.904.713c.38.055.53.518.257.788l-3.548 3.46a1 1 0 00-.287.885l.838 4.886c.065.378-.33.666-.67.487l-4.387-2.31a1 1 0 00-.93 0l-4.387 2.31c-.34.179-.735-.109-.67-.487l.838-4.886a1 1 0 00-.287-.885l-3.548-3.46c-.273-.27-.123-.733.257-.788l4.904-.713a1 1 0 00.758-.552l2.193-4.444z" />
                </svg>
                <span>{result?.is_saved ? 'Saved' : 'Save'}</span>
              </button>
            </div>
          </div>

          {/* Idea title row */}
          <div className="flex items-start gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1
                  className="text-xl lg:text-2xl font-extrabold theme-text-title tracking-tight leading-tight"
                  title={idea}
                >
                  <span className="line-clamp-2">{idea}</span>
                </h1>
                {/* Edit idea button */}
                <button
                  onClick={onEditIdea}
                  className="shrink-0 p-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-xs font-bold theme-text-muted hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] transition-all cursor-pointer flex items-center gap-1"
                  title="Edit original pitch"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <span className="hidden sm:inline">Edit</span>
                </button>
              </div>

              {/* Status chip */}
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Analysis completed · Just now
                </span>
              </div>
            </div>
          </div>

          {/* Tags row */}
          <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-[var(--border-subtle)]">
            {tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--color-accent-bg)] text-[var(--color-accent)] border border-[var(--border-subtle)] text-xs font-bold"
              >
                {tag}
                <button
                  onClick={() => handleTagRemove(tag)}
                  disabled={isUpdatingTags}
                  className="ml-0.5 hover:text-red-500 transition-colors focus:outline-none cursor-pointer leading-none"
                >
                  ×
                </button>
              </span>
            ))}
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagAdd}
              disabled={isUpdatingTags}
              placeholder="+ Add tag"
              className="px-2.5 py-1 rounded-full bg-transparent border border-dashed border-[var(--border-subtle)] text-xs font-medium focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30 w-24 theme-text-title placeholder-[var(--text-muted)] transition-all"
            />
          </div>
        </div>

        {/* ── Zone 2: Tab Bar ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] -mb-2 print:hidden">
          <div className="flex gap-0">
            {[
              {
                id: 'analysis',
                label: 'Analysis',
                tooltip: 'Technical deep-dive: market research, critique, architecture, roadmap & resources.'
              },
              {
                id: 'executive',
                label: 'Executive Insights',
                tooltip: 'High-level startup score, market potential, risk assessment & top action items.'
              }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                title={tab.tooltip}
                className={`pb-3 px-5 text-sm font-semibold transition-all cursor-pointer relative ${
                  activeTab === tab.id
                    ? 'text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]'
                    : 'theme-text-muted hover:text-[var(--color-accent)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Status badge right side */}
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold mb-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Completed
          </span>
        </div>

        {/* ── Zone 3a: Executive Insights Tab ────────────────────────── */}
        {activeTab === 'executive' && (
          <>
            {/* Executive Summary + Brutal Verdict */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">

              {/* Executive Summary Card (2 Cols) */}
              <div className="md:col-span-2 theme-card flex flex-col sm:flex-row items-center gap-8 justify-between">
                <div className="flex flex-col items-center justify-center shrink-0">
                  <h3 className="text-xs font-bold theme-text-muted uppercase tracking-widest mb-3 text-center">Startup Score</h3>
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <svg className="w-32 h-32 transform -rotate-90">
                      <circle cx="64" cy="64" r="50" className="stroke-[var(--border-subtle)]" strokeWidth="8" fill="transparent" />
                      <circle
                        cx="64" cy="64" r="50"
                        className="stroke-[var(--color-accent)] transition-all duration-500"
                        strokeWidth="8" fill="transparent"
                        strokeDasharray="314.16"
                        strokeDashoffset={314.16 - (314.16 * startupScore) / 100}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-3xl font-black theme-text-title leading-none">{startupScore}</span>
                      <span className="text-[10px] font-bold theme-text-muted mt-1 uppercase tracking-widest">/ 100</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5 mb-2.5">
                    <h3 className="text-lg font-bold theme-text-title uppercase tracking-wider">Executive Summary</h3>
                    <span className="bg-[var(--color-accent-bg)] text-[var(--color-accent)] border border-[var(--border-subtle)] text-[10px] font-black px-2 py-0.5 rounded leading-none uppercase tracking-wide">
                      {getVerdictLabel()}
                    </span>
                  </div>
                  <p className="text-sm theme-text-body leading-relaxed mb-5">
                    {getVerdictText()} Focus on technical architecture scaffolding and solving identified validation gaps.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-[var(--border-subtle)] text-xs">
                    <div>
                      <span className="theme-text-muted block mb-1 font-semibold">Market Potential</span>
                      <span className="font-bold theme-text-title">{marketPotential} <span className="text-[10px] theme-text-muted">/ 100</span></span>
                    </div>
                    <div>
                      <span className="theme-text-muted block mb-1 font-semibold">Implementation</span>
                      <span className="font-bold theme-text-title">{technicalFeasibility} <span className="text-[10px] theme-text-muted">/ 100</span></span>
                    </div>
                    <div>
                      <span className="theme-text-muted block mb-1 font-semibold">Business Viability</span>
                      <span className="font-bold theme-text-title">{businessViability} <span className="text-[10px] theme-text-muted">/ 100</span></span>
                    </div>
                    <div>
                      <span className="theme-text-muted block mb-1 font-semibold">Risk Level</span>
                      <span className={`font-bold ${riskLevel === 'Low' ? 'text-emerald-500' : riskLevel === 'Medium' ? 'text-[var(--color-accent)]' : 'text-red-500'}`}>♦ {riskLevel}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Brutal Verdict Card */}
              <div className="theme-card flex flex-col justify-between gap-4">
                <div>
                  <h3 className="text-xs font-bold theme-text-muted uppercase tracking-widest mb-2">Brutal Verdict</h3>
                  <h2 className="text-xl font-bold theme-text-title mb-2">
                    {startupScore >= 75 ? "Go, but be smart." : "High barrier entry."}
                  </h2>
                  <p className="text-xs theme-text-body leading-relaxed mb-4">
                    Our critique agent audited the weaknesses. Addressing these priority items will maximize launch velocity.
                  </p>
                </div>
                <ul className="space-y-1.5 text-[11px] font-bold theme-text-body">
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
                      <span className="text-red-500 shrink-0">✖</span>
                      <span className="truncate" title={result?.critique?.flagged_issues[0]}>
                        {result.critique.flagged_issues[0]}
                      </span>
                    </li>
                  )}
                </ul>
              </div>
            </div>

            {/* Radar Chart + Top Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch w-full">
              {/* Radar Chart */}
              <div className="theme-card flex flex-col items-center justify-center pb-4">
                <span className="text-xs font-bold theme-text-muted uppercase tracking-widest mb-3">At a Glance</span>
                <div className="relative w-40 h-40 flex items-center justify-center">
                  <svg className="w-40 h-40" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" className="stroke-slate-800" strokeWidth="0.5" fill="none" />
                    <circle cx="50" cy="50" r="30" className="stroke-slate-800/60" strokeWidth="0.5" fill="none" />
                    <circle cx="50" cy="50" r="20" className="stroke-slate-800/40" strokeWidth="0.5" fill="none" />
                    <circle cx="50" cy="50" r="10" className="stroke-slate-800/20" strokeWidth="0.5" fill="none" />
                    <line x1="50" y1="10" x2="50" y2="90" className="stroke-slate-800/75" strokeWidth="0.5" />
                    <line x1="10" y1="50" x2="90" y2="50" className="stroke-slate-800/75" strokeWidth="0.5" />
                    <text x="50" y="8" className="text-[5.5px] fill-slate-400 font-bold" textAnchor="middle">MARKET</text>
                    <text x="92" y="52" className="text-[5.5px] fill-slate-400 font-bold" textAnchor="start">BUSINESS</text>
                    <text x="50" y="96" className="text-[5.5px] fill-slate-400 font-bold" textAnchor="middle">RISK</text>
                    <text x="8" y="52" className="text-[5.5px] fill-slate-400 font-bold" textAnchor="end">TECH</text>
                    <polygon
                      points={`${ptMarket.x},${ptMarket.y} ${ptBusiness.x},${ptBusiness.y} ${ptRisk.x},${ptRisk.y} ${ptTech.x},${ptTech.y}`}
                      className="fill-[var(--color-accent-bg)]/25 stroke-[var(--color-accent)]"
                      strokeWidth="1.2"
                    />
                    <circle cx={ptMarket.x} cy={ptMarket.y} r="1.2" className="fill-[var(--color-accent)]" />
                    <circle cx={ptBusiness.x} cy={ptBusiness.y} r="1.2" className="fill-[var(--color-accent)]" />
                    <circle cx={ptRisk.x} cy={ptRisk.y} r="1.2" className="fill-[var(--color-accent)]" />
                    <circle cx={ptTech.x} cy={ptTech.y} r="1.2" className="fill-[var(--color-accent)]" />
                  </svg>
                </div>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3 text-[10px] font-bold text-slate-500 select-none">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-[var(--color-accent)] rounded-full"></span>Market: {marketPotential}</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-[var(--color-accent)] rounded-full"></span>Tech: {technicalFeasibility}</span>
                </div>
              </div>

              {/* Top Actions */}
              <div className="theme-card flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold theme-text-muted uppercase tracking-widest mb-3">Top Actions</h3>
                  {result?.critique?.suggested_fixes && result.critique.suggested_fixes.length > 0 ? (
                    <ul className="space-y-3.5">
                      {result.critique.suggested_fixes.slice(0, 3).map((fix, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs">
                          <span className="w-5 h-5 rounded-full bg-[var(--color-accent-bg)] border border-[var(--color-border-hover)] text-[var(--color-accent)] flex items-center justify-center font-bold shrink-0 text-[10px] mt-0.5">
                            {idx + 1}
                          </span>
                          <p className="theme-text-body font-semibold leading-relaxed truncate" title={fix}>{fix}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <ul className="space-y-3.5">
                      {['Validate with target MVP hooks', 'Interview 20+ beta target audience', 'Build core modular landing page'].map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs">
                          <span className="w-5 h-5 rounded-full bg-[var(--color-accent-bg)] text-[var(--color-accent)] flex items-center justify-center font-bold shrink-0 text-[10px] mt-0.5">{idx + 1}</span>
                          <span className="theme-text-body font-semibold">{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <button className="w-full py-2.5 mt-5 border border-[var(--color-border)] rounded-xl text-xs font-bold theme-text-title bg-[var(--bg-secondary)] hover:border-[var(--color-border-hover)] transition-all cursor-pointer">
                  View All Recommendations
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Zone 3b: Analysis Tab — Accordion Module Cards ──────────── */}
        {activeTab === 'analysis' && (
          <>
            {/* Mini guide */}
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-[var(--color-accent-bg)]/40 border border-[var(--border-subtle)] text-xs theme-text-body">
              <svg className="w-4 h-4 text-[var(--color-accent)] shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>
                <span className="font-bold theme-text-title">How to read this:</span>{' '}
                <span className="font-medium">1) Review Technical Analysis for market research &amp; critique → 2) Check Architecture &amp; Roadmap for your build plan → 3) Export or Share the report when ready.</span>
              </p>
            </div>

            {/* Module Cards */}
            <div className="space-y-3">
              {modules.map(mod => (
                <div
                  key={mod.key}
                  className="bg-[var(--bg-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-sm transition-all duration-200"
                >
                  {/* Module Header Button */}
                  <button
                    onClick={() => toggleSection(mod.key)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left cursor-pointer focus:outline-none hover:bg-[var(--color-accent-bg)]/15 transition-all"
                  >
                    <div className="flex items-center gap-3.5">
                      {/* Icon */}
                      <div className="w-9 h-9 rounded-xl bg-[var(--color-accent-bg)] text-[var(--color-accent)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                        {mod.icon}
                      </div>
                      {/* Text */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold theme-text-title text-sm">{mod.title}</span>
                          {/* Tooltip */}
                          <span
                            className="hidden sm:flex w-4 h-4 rounded-full border border-[var(--border-subtle)] items-center justify-center theme-text-muted text-[9px] font-bold cursor-help shrink-0"
                            title={mod.tooltip}
                          >
                            ℹ
                          </span>
                          {/* Completed pill */}
                          <span className="text-[9px] font-black uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-1.5 py-0.5 rounded-full leading-none">
                            Completed
                          </span>
                        </div>
                        <p className="text-xs theme-text-muted font-medium mt-0.5 truncate max-w-sm">{mod.subtitle}</p>
                      </div>
                    </div>

                    {/* Chevron */}
                    <svg
                      className={`w-4 h-4 theme-text-muted transition-transform duration-300 shrink-0 ${expanded[mod.key] ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Expanded Content */}
                  {expanded[mod.key] && (
                    <div className="px-5 pb-5 pt-1 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                      <div className="pt-4">
                        {mod.content}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Follow Up Chat */}
            <FollowUpChat
              workspaceId={workspaceId}
              initialHistory={result?.chat_history || []}
              idea={idea}
              primaryModel={primaryModel}
              experienceLevel={experienceLevel}
              activePanel={activePanel}
            />
          </>
        )}

      </div>

      {/* ── Slide-in Detail Panel ─────────────────────────────────────────── */}
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
