import React, { useEffect, useState } from 'react';
import { fetchHistory, fetchHistoryItem, toggleSaveWorkspace } from '../api';

export default function HistoryView({ onSelectItem, loadedChats = {}, onToggleSaveCache }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState(null);
  const [activeTab, setActiveTab] = useState('history'); // 'history' or 'saved'

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const onlySaved = activeTab === 'saved';
        const data = await fetchHistory(onlySaved);
        setHistory(data);
      } catch (e) {
        console.error('Failed to load history', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [activeTab]);

  const handleClick = async (item) => {
    if (loadingId !== null) return;
    const wsId = item.workspace_id;
    if (wsId && loadedChats[wsId]) {
      // Return cached chat data instantly with no network request
      onSelectItem(item.idea, loadedChats[wsId]);
      return;
    }

    setLoadingId(item.id);
    try {
      const full = await fetchHistoryItem(item.id);
      onSelectItem(item.idea, full, wsId);
    } catch (e) {
      console.error('Failed to load history item', e);
    } finally {
      setLoadingId(null);
    }
  };

  const handleToggleSave = async (item, e) => {
    e.stopPropagation();
    const wsId = item.workspace_id;
    if (!wsId) return;
    try {
      const { is_saved } = await toggleSaveWorkspace(wsId);
      const isSavedTab = activeTab === 'saved';
      setHistory(prev => {
        if (isSavedTab && !is_saved) {
          return prev.filter(x => x.id !== item.id);
        }
        return prev.map(x => x.id === item.id ? { ...x, is_saved } : x);
      });
      if (onToggleSaveCache) {
        onToggleSaveCache(wsId, is_saved);
      }
    } catch (err) {
      console.error('Failed to toggle save state', err);
    }
  };

  const formatDate = (ts) => {
    const d = new Date(ts);
    return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  };

  return (
    <div className="flex-1 p-6 lg:p-10 min-w-0 bg-slate-50 dark:bg-[#0b0f19] min-h-screen transition-colors">
      <header className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4 mb-8">
        <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center shadow-sm">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
            Workspace History
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Browse through your saved projects and search history
          </p>
        </div>
      </header>

      {/* Dynamic Segmented Tab Controller */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-px mb-8 max-w-3xl">
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-4 text-sm font-semibold transition-all relative ${
            activeTab === 'history'
              ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          All History
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          className={`pb-3 px-4 text-sm font-semibold transition-all relative ${
            activeTab === 'saved'
              ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          Saved Favorites
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-slate-500 dark:text-slate-400 text-lg">Loading history...</span>
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400 dark:text-slate-500 gap-3 max-w-3xl text-center">
          <svg className="w-16 h-16 opacity-30 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.48 3.499c.158-.343.344-.66.52-.947.176.287.362.604.52.947l2.193 4.444a1 1 0 00.758.552l4.904.713c.38.055.53.518.257.788l-3.548 3.46a1 1 0 00-.287.885l.838 4.886c.065.378-.33.666-.67.487l-4.387-2.31a1 1 0 00-.93 0l-4.387 2.31c-.34.179-.735-.109-.67-.487l.838-4.886a1 1 0 00-.287-.885l-3.548-3.46c-.273-.27-.123-.733.257-.788l4.904-.713a1 1 0 00.758-.552l2.193-4.444z" />
          </svg>
          <p className="text-xl font-medium text-slate-700 dark:text-slate-300">
            {activeTab === 'saved' ? "No saved workspaces yet" : "No history yet"}
          </p>
          <p className="text-sm max-w-md">
            {activeTab === 'saved'
              ? "Click the star icon on any workspace card or history item to save your favorites!"
              : "Analyze your first startup idea on the Home page to get started!"}
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-w-3xl">
          {history.map((item, idx) => (
            <div
              key={item.id}
              onClick={() => handleClick(item)}
              className="w-full text-left bg-white dark:bg-[#111827]/70 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:shadow-md rounded-2xl p-5 transition-all group flex items-center justify-between gap-4 cursor-pointer"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-base shrink-0">
                  {history.length - idx}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 dark:text-white text-base truncate group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">
                    {item.idea}
                  </p>
                  <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">{formatDate(item.timestamp)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={(e) => handleToggleSave(item, e)}
                  className="p-2 text-slate-400 hover:text-amber-500 rounded-xl hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors"
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
