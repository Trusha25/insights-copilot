import React, { useEffect, useState } from 'react';
import { fetchSettings, saveSettings } from '../api';

export default function SettingsView() {
  const [theme, setTheme] = useState('dark');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchSettings();
        setTheme(data.theme || 'dark');
      } catch (e) {
        console.error('Failed to load settings', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleThemeChange = async (newTheme) => {
    setTheme(newTheme);
    setSaving(true);
    setMessage('');
    setErrorMsg('');
    try {
      await saveSettings(newTheme);
      
      // Update HTML root class for Tailwind
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      setMessage('🎉 Theme preference saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (e) {
      setErrorMsg('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 p-6 lg:p-10 min-w-0 font-sans">
      <header className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4 mb-8">
        <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center shadow-sm">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">Settings</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Customize your Insights Copilot workspace settings</p>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-400 text-lg">Loading settings...</div>
        </div>
      ) : (
        <div className="max-w-2xl space-y-6">
          {message && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-sm font-medium">
              {message}
            </div>
          )}

          {errorMsg && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-sm font-medium">
              {errorMsg}
            </div>
          )}

          {/* Theme Settings */}
          <div className="bg-white dark:bg-[#111827]/70 dark:backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Appearance</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">Choose how Insights Copilot looks on your screen.</p>
            
            <div className="flex gap-4">
              <button
                onClick={() => handleThemeChange('light')}
                disabled={saving}
                className={`flex-1 p-4 border rounded-2xl transition-all flex flex-col items-center gap-2 ${
                  theme === 'light'
                    ? 'border-indigo-500 bg-indigo-50/10 text-indigo-600 dark:text-indigo-400'
                    : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300'
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10 5 5 0 000-10z" />
                </svg>
                <span className="font-semibold text-sm">Light Mode</span>
              </button>

              <button
                onClick={() => handleThemeChange('dark')}
                disabled={saving}
                className={`flex-1 p-4 border rounded-2xl transition-all flex flex-col items-center gap-2 ${
                  theme === 'dark'
                    ? 'border-indigo-500 bg-indigo-50/10 text-indigo-600 dark:text-indigo-400'
                    : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300'
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                <span className="font-semibold text-sm">Dark Mode</span>
              </button>
            </div>
          </div>

          {/* API Keys Security Placeholder */}
          <div className="bg-white dark:bg-[#111827]/70 dark:backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">API Integrations</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">Manage custom API credentials for research models.</p>

            <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl text-xs font-semibold flex items-center gap-2">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Bring Your Own (BYO) API Keys coming in a future security release.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
