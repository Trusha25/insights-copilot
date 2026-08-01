import React, { useEffect, useState } from 'react';
import { fetchHistory, fetchHistoryItem, toggleSaveWorkspace, deleteWorkspace, deleteHistoryItem } from '../api';

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

  const handleDelete = async (item, e) => {
    e.stopPropagation();
    const wsId = item.workspace_id;
    
    if (!window.confirm("Are you sure you want to delete this workspace? This cannot be undone.")) return;
    
    try {
      if (wsId) {
        await deleteWorkspace(wsId);
      } else {
        await deleteHistoryItem(item.id);
      }
      setHistory(prev => prev.filter(x => x.id !== item.id && (!wsId || x.workspace_id !== wsId)));
    } catch (err) {
      console.error('Failed to delete workspace', err);
      alert('Failed to delete workspace');
    }
  };

  const formatDate = (ts) => {
    const d = new Date(ts);
    return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  };

  return (
    <div className="flex-1 p-6 lg:p-10 min-w-0 bg-[var(--bg-primary)] min-h-screen transition-colors font-sans">
      <header className="flex items-center gap-3 border-b border-[var(--border-subtle)] pb-4 mb-8">
        <div className="w-10 h-10 bg-[var(--color-accent-bg)] text-[var(--color-accent)] border border-[var(--border-strong)] rounded-lg flex items-center justify-center shadow-sm">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-extrabold theme-text-title tracking-tight">
            Workspace History
          </h1>
          <p className="theme-text-muted text-xs mt-0.5 font-medium">
            Browse through your saved projects and search history
          </p>
        </div>
      </header>

      {/* Dynamic Segmented Tab Controller */}
      <div className="flex gap-2 border-b border-[var(--border-subtle)] pb-px mb-8 max-w-3xl">
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-4 text-xs font-semibold transition-all relative cursor-pointer ${
            activeTab === 'history'
              ? 'text-[var(--accent-end)] border-b-2 border-[var(--accent-start)] font-bold'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          All History
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          className={`pb-3 px-4 text-xs font-semibold transition-all relative cursor-pointer ${
            activeTab === 'saved'
              ? 'text-[var(--accent-end)] border-b-2 border-[var(--accent-start)] font-bold'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Saved Favorites
        </button>
      </div>

      {loading ? (
        <div className="space-y-3 max-w-3xl">
          {[1, 2, 3].map((i) => (
            <div key={i} className="theme-card h-20 theme-skeleton" />
          ))}
        </div>
      ) : history.length === 0 ? (
        <div className="theme-card flex flex-col items-center justify-center p-8 text-center max-w-3xl">
          <svg className="w-12 h-12 opacity-30 text-[var(--accent-end)] animate-float mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.48 3.499c.158-.343.344-.66.52-.947.176.287.362.604.52.947l2.193 4.444a1 1 0 00.758.552l4.904.713c.38.055.53.518.257.788l-3.548 3.46a1 1 0 00-.287.885l.838 4.886c.065.378-.33.666-.67.487l-4.387-2.31a1 1 0 00-.93 0l-4.387 2.31c-.34.179-.735-.109-.67-.487l.838-4.886a1 1 0 00-.287-.885l-3.548-3.46c-.273-.27-.123-.733.257-.788l4.904-.713a1 1 0 00.758-.552l2.193-4.444z" />
          </svg>
          <p className="text-lg font-bold theme-text-title">
            {activeTab === 'saved' ? "No saved workspaces yet" : "No history yet"}
          </p>
          <p className="text-xs theme-text-muted max-w-md mt-1 mb-4">
            {activeTab === 'saved'
              ? "Click the star icon on any workspace card to save your favorites!"
              : "Analyze your first startup idea on the Home page to get started!"}
          </p>
          {activeTab !== 'saved' && (
            <a href="/" onClick={(e) => { e.preventDefault(); window.location.href = '/'; }} className="theme-btn-primary text-xs">
              + Pitch New Idea
            </a>
          )}
        </div>
      ) : (
        <div className="space-y-3.5 max-w-3xl">
          {history.map((item, idx) => (
            <div
              key={item.id}
              onClick={() => handleClick(item)}
              className="theme-card p-[18px] group flex items-center justify-between gap-4 cursor-pointer"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-[var(--color-accent-bg)] text-[var(--accent-end)] border border-[var(--border-strong)] flex items-center justify-center font-bold text-sm shrink-0">
                  {history.length - idx}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold theme-text-title text-sm truncate group-hover:text-[var(--accent-end)] transition-colors">
                    {item.idea}
                  </p>
                  <p className="text-xs theme-text-muted mt-0.5">{formatDate(item.timestamp)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={(e) => handleToggleSave(item, e)}
                  aria-label={item.is_saved ? "Remove from Saved" : "Save Workspace"}
                  className="theme-icon-btn"
                  title={item.is_saved ? "Remove from Saved" : "Save Workspace"}
                >
                  <svg className={`w-4 h-4 ${item.is_saved ? 'text-[var(--accent-end)] fill-[var(--accent-end)]' : 'text-slate-400'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499c.158-.343.344-.66.52-.947.176.287.362.604.52.947l2.193 4.444a1 1 0 00.758.552l4.904.713c.38.055.53.518.257.788l-3.548 3.46a1 1 0 00-.287.885l.838 4.886c.065.378-.33.666-.67.487l-4.387-2.31a1 1 0 00-.93 0l-4.387 2.31c-.34.179-.735-.109-.67-.487l.838-4.886a1 1 0 00-.287-.885l-3.548-3.46c-.273-.27-.123-.733.257-.788l4.904-.713a1 1 0 00.758-.552l2.193-4.444z" />
                  </svg>
                </button>
                <button
                  onClick={(e) => handleDelete(item, e)}
                  aria-label="Delete Workspace"
                  className="theme-icon-btn hover:text-red-400"
                  title="Delete Workspace"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                {loadingId === item.id ? (
                  <svg className="w-4 h-4 text-[var(--accent-end)] animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-slate-400 group-hover:text-[var(--accent-end)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
