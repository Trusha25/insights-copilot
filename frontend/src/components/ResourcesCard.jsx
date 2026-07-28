import React from 'react';

export default function ResourcesCard({ status, research }) {
  const isLoading = status === "loading";

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm min-h-[400px] flex items-center justify-center">
        <div className="text-slate-500 text-lg">Gathering Resources...</div>
      </div>
    );
  }

  if (!research) return null;

  // Extract web/academic sources and github repos from either legacy arrays or new schema
  const webSources = research.sources
    ? research.sources.filter((s) => s.source_type !== 'github')
    : [
        ...(research.existing_solutions || [])
          .filter(s => s.source_type !== 'github' && s.source_url)
          .map(s => ({ title: s.claim, url: s.source_url, source_type: s.source_type })),
        ...(research.research_gaps || [])
          .filter(s => s.source_url)
          .map(s => ({ title: s.claim, url: s.source_url, source_type: s.source_type }))
      ];

  const githubRepos = research.github_repos
    ? research.github_repos
    : (research.existing_solutions || [])
        .filter(s => s.source_type === 'github' && s.source_url)
        .map(s => ({ name: s.claim, url: s.source_url, why_relevant: s.claim }));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm h-fit">
      <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
        <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
        </svg>
        <h3 className="text-xl font-bold text-slate-800">Key Resources</h3>
      </div>

      <div className="space-y-6">
        {/* Market & Academic Sources */}
        <div>
          <h4 className="font-bold text-lg text-slate-800 mb-3">Market &amp; Academic Sources</h4>
          {webSources.length > 0 ? (
            <div className="space-y-3">
              {webSources.map((src, idx) => (
                <a
                  key={idx}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      {src.title && (
                        <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-700 mb-0.5 line-clamp-2">
                          {src.title}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 break-all line-clamp-1">{src.url}</p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-slate-400 text-sm text-center">
              No web/academic sources returned.
            </div>
          )}
        </div>

        {/* GitHub Repositories */}
        <div>
          <h4 className="font-bold text-lg text-slate-800 mb-3">GitHub Repositories</h4>
          {githubRepos.length > 0 ? (
            <div className="space-y-3">
              {githubRepos.map((repo, idx) => (
                <a
                  key={`repo-${idx}`}
                  href={repo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 rounded-xl border border-slate-200 hover:border-slate-800 hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-slate-700 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                    </svg>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 group-hover:text-slate-900 break-all line-clamp-1">
                        {repo.name || repo.url.replace('https://github.com/', '')}
                      </p>
                      {repo.why_relevant && repo.why_relevant !== repo.name && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{repo.why_relevant}</p>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-slate-400 text-sm text-center">
              No repositories found for this idea.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
