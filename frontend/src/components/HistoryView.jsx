import React, { useEffect, useState } from 'react';
import { fetchHistory, fetchHistoryItem, toggleSaveWorkspace } from '../api';

export default function HistoryView({ onSelectItem, onlySaved = false }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchHistory(onlySaved);
        setHistory(data);
      } catch (e) {
        console.error('Failed to load history', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [onlySaved]);

  const handleClick = async (item) => {
    setLoadingId(item.id);
    try {
      const full = await fetchHistoryItem(item.id);
      onSelectItem(item.idea, full);
    } catch (e) {
      console.error('Failed to load history item', e);
    } finally {
      setLoadingId(null);
    }
  };

  const handleToggleSave = async (item, e) => {
    e.stopPropagation();
    const wsId = item.workspace_id || item.id;
    if (!wsId) return;
    try {
      const { is_saved } = await toggleSaveWorkspace(wsId);
      setHistory(prev => {
        if (onlySaved && !is_saved) {
          return prev.filter(x => x.id !== item.id);
        }
        return prev.map(x => x.id === item.id ? { ...x, is_saved } : x);
      });
    } catch (err) {
      console.error('Failed to toggle save state', err);
    }
  };

  const formatDate = (ts) => {
    const d = new Date(ts);
    return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  };

  return (
    <div className="flex-1 p-6 lg:p-10 min-w-0">
      <header className="flex items-center gap-3 border-b border-slate-200 pb-4 mb-8">
        <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shadow-sm">
          <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
            {onlySaved ? "Saved Favorites" : "Research History"}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {onlySaved ? "Your bookmarked and saved workspace designs" : "Click any item to reload its full analysis"}
          </p>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-400 text-lg">Loading history...</div>
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
          <svg className="w-16 h-16 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.48 3.499c.158-.343.344-.66.52-.947.176.287.362.604.52.947l2.193 4.444a1 1 0 00.758.552l4.904.713c.38.055.53.518.257.788l-3.548 3.46a1 1 0 00-.287.885l.838 4.886c.065.378-.33.666-.67.487l-4.387-2.31a1 1 0 00-.93 0l-4.387 2.31c-.34.179-.735-.109-.67-.487l.838-4.886a1 1 0 00-.287-.885l-3.548-3.46c-.273-.27-.123-.733.257-.788l4.904-.713a1 1 0 00.758-.552l2.193-4.444z" />
          </svg>
          <p className="text-xl font-medium">
            {onlySaved ? "No saved workspaces yet" : "No history yet"}
          </p>
          <p className="text-base">
            {onlySaved ? "Click the star icon on any workspace or history row to save your favorites!" : "Analyze your first startup idea to see it here!"}
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-w-3xl">
          {history.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => handleClick(item)}
              disabled={loadingId === item.id}
              className="w-full text-left bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-md rounded-2xl p-5 transition-all group flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-base shrink-0">
                  {history.length - idx}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 text-base truncate group-hover:text-indigo-700 transition-colors">
                    {item.idea}
                  </p>
                  <p className="text-sm text-slate-400 mt-0.5">{formatDate(item.timestamp)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={(e) => handleToggleSave(item, e)}
                  className="p-2 text-slate-400 hover:text-amber-500 rounded-xl hover:bg-slate-100/50 transition-colors"
                  title={item.is_saved ? "Remove from Saved" : "Save Workspace"}
                >
                  <svg className={`w-5 h-5 ${item.is_saved ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499c.158-.343.344-.66.52-.947.176.287.362.604.52.947l2.193 4.444a1 1 0 00.758.552l4.904.713c.38.055.53.518.257.788l-3.548 3.46a1 1 0 00-.287.885l.838 4.886c.065.378-.33.666-.67.487l-4.387-2.31a1 1 0 00-.93 0l-4.387 2.31c-.34.179-.735-.109-.67-.487l.838-4.886a1 1 0 00-.287-.885l-3.548-3.46c-.273-.27-.123-.733.257-.788l4.904-.713a1 1 0 00.758-.552l2.193-4.444z" />
                  </svg>
                </button>
                {loadingId === item.id ? (
                  <svg className="w-5 h-5 text-indigo-500 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
