import React from 'react';

export default function PlanCard({ status, roadmap }) {
  const isLoading = status === "loading";
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm min-h-[400px] flex items-center justify-center">
        <div className="text-slate-500 text-lg">Generating Execution Roadmap...</div>
      </div>
    );
  }

  if (!roadmap || roadmap.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm h-fit">
      <div className="flex items-center gap-2 mb-8 border-b border-slate-100 pb-4">
        <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
        <h3 className="text-xl font-bold text-slate-800">5-Step Execution Roadmap</h3>
      </div>

      <div className="space-y-8 relative before:absolute before:inset-0 before:ml-[19px] before:-translate-x-px before:h-full before:w-0.5 before:bg-slate-200">
        {roadmap.slice(0, 5).map((item, index) => {
          // Colors sequence based on the screenshot mockup
          const colors = [
            { bg: "bg-indigo-600", light: "bg-indigo-50 text-indigo-700" },
            { bg: "bg-blue-600", light: "bg-blue-50 text-blue-700" },
            { bg: "bg-emerald-600", light: "bg-emerald-50 text-emerald-700" },
            { bg: "bg-violet-600", light: "bg-violet-50 text-violet-700" },
            { bg: "bg-orange-500", light: "bg-orange-50 text-orange-700" },
          ];
          const color = colors[index % colors.length];

          return (
            <div key={index} className="relative flex items-start gap-5">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base z-10 shrink-0 ${color.bg} shadow-sm outline outline-4 outline-white`}>
                {index + 1}
              </div>
              <div className="flex-1 pb-6 border-b border-slate-100 last:border-0 last:pb-0 pt-1">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-bold text-slate-800 text-lg">{item.milestone}</h4>
                  <span className={`px-3 py-1 rounded-md text-sm font-semibold ${color.light}`}>
                    {item.duration}
                  </span>
                </div>
                {item.tasks && item.tasks.length > 0 ? (
                  <ul className="list-disc pl-5 text-base text-slate-700 space-y-3">
                    {item.tasks.map((task, idx) => {
                      if (typeof task === 'string') {
                        return <li key={idx}>{task}</li>;
                      }
                      return (
                        <li key={idx} className="space-y-1 list-none -ml-4">
                          <div className="flex items-start gap-2">
                            <span className="text-indigo-600 font-bold mt-1 shrink-0">•</span>
                            <div>
                              <span className="font-bold text-slate-800">{task.title}</span>
                              {task.description && <span className="text-slate-600"> — {task.description}</span>}
                              {task.rationale && (
                                <div className="text-sm text-indigo-600 bg-indigo-50/40 px-2.5 py-1 rounded-xl border border-indigo-100/40 w-fit mt-1.5 font-medium">
                                  <span className="font-semibold text-indigo-700">Rationale: </span>
                                  {task.rationale}
                                </div>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <ul className="list-disc pl-5 text-base text-slate-700 space-y-2">
                    <li>{item.description || "No tasks provided."}</li>
                  </ul>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
