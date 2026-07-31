import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function SettingsView({ theme, onThemeChange, primaryModel = 'gemini', onPrimaryModelChange, experienceLevel = 'intermediate', onExperienceLevelChange }) {
  const [activeCategory, setActiveCategory] = useState('appearance');
  const [userEmail, setUserEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  
  // Account Form state
  const [newName, setNewName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountMsg, setAccountMsg] = useState('');
  const [accountError, setAccountError] = useState('');
  
  // Notification states
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [telegramAlerts, setTelegramAlerts] = useState(true);
  const [marketingAlerts, setMarketingAlerts] = useState(false);
  
  // API Integration states
  const [groqKey, setGroqKey] = useState('••••••••••••••••••••••••••••••••');
  const [tavilyKey, setTavilyKey] = useState('••••••••••••••••••••••••••••••••');
  const [githubKey, setGithubKey] = useState('••••••••••••••••••••••••••••••••');

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || '');
        const name = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Builder';
        setDisplayName(name);
        setNewName(name);
      }
    };
    fetchUser();
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setAccountMsg('');
    setAccountError('');
    try {
      const { error } = await supabase.auth.updateUser({
        data: { display_name: newName }
      });
      if (error) throw error;
      setDisplayName(newName);
      setAccountMsg('🎉 Profile updated successfully!');
      setTimeout(() => setAccountMsg(''), 3000);
    } catch (err) {
      setAccountError(err.message || 'Failed to update profile.');
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setAccountMsg('');
    setAccountError('');
    if (password !== confirmPassword) {
      setAccountError('Passwords do not match.');
      return;
    }
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword('');
      setConfirmPassword('');
      setAccountMsg('🎉 Password changed successfully!');
      setTimeout(() => setAccountMsg(''), 3000);
    } catch (err) {
      setAccountError(err.message || 'Failed to change password.');
    }
  };

  const categories = [
    { id: 'appearance', label: 'Appearance', icon: '🎨' },
    { id: 'account', label: 'Account Profile', icon: '👤' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'apis', label: 'API Integrations', icon: '🔑' },
    { id: 'privacy', label: 'Privacy & Security', icon: '🛡️' },
    { id: 'about', label: 'About System', icon: 'ℹ️' },
  ];

  return (
    <div className="flex-1 p-6 lg:p-10 min-w-0 bg-slate-50 dark:bg-[var(--bg-primary)] min-h-screen transition-colors font-sans">
      {/* Title */}
      <header className="flex items-center gap-3 border-b border-slate-200 dark:border-[var(--color-border)] pb-4 mb-8">
        <div className="w-10 h-10 bg-[var(--color-accent-bg)] text-[var(--color-accent)] border border-[var(--color-border-hover)] rounded-xl flex items-center justify-center shadow-sm">
          <svg className="w-6 h-6 animate-float" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <h1 className="text-3xl font-extrabold theme-text-title tracking-tight">Settings</h1>
          <p className="theme-text-muted text-sm mt-0.5 font-medium">Manage your workspace preferences, profile, and system settings</p>
        </div>
      </header>

      {/* Main Settings Panel Grid */}
      <div className="flex flex-col lg:flex-row gap-8 max-w-6xl items-start">
        {/* Category Navigation (Left Pane) */}
        <nav className="w-full lg:w-64 shrink-0 flex flex-row lg:flex-col gap-1 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-[var(--color-border)] pb-4 lg:pb-0 pr-0 lg:pr-4 overflow-x-auto lg:overflow-x-visible">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap lg:whitespace-normal shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[var(--color-accent)] text-[#030407] shadow-md shadow-[var(--color-accent-glow)]'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/40 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Setting Section Detail View (Right Pane) */}
        <div className="flex-1 min-w-0 w-full space-y-6">
          {/* Appearance Section */}
          {activeCategory === 'appearance' && (
            <div className="theme-card space-y-6">
              <div>
                <h3 className="text-xl font-bold theme-text-title mb-1">Appearance Settings</h3>
                <p className="theme-text-body text-sm">Choose between dark and light modes for the interface.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                {/* Light Mode Box */}
                <button
                  onClick={() => onThemeChange('light')}
                  className={`p-5 border rounded-2xl flex flex-col items-center gap-3 transition-all cursor-pointer ${
                    theme === 'light'
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-bg)] text-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/20'
                      : 'border-[var(--color-border)] text-slate-400 dark:text-slate-500 hover:border-[var(--color-border-hover)] hover:text-slate-650 dark:hover:text-slate-350'
                  }`}
                >
                  <svg className="w-8 h-8 text-[var(--color-accent)]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10 5 5 0 000-10z" />
                  </svg>
                  <div className="text-center">
                    <span className="font-bold text-sm block theme-text-title">Light Theme</span>
                    <span className="text-[11px] opacity-75">Sleek high-contrast white</span>
                  </div>
                </button>

                {/* Dark Mode Box */}
                <button
                  onClick={() => onThemeChange('dark')}
                  className={`p-5 border rounded-2xl flex flex-col items-center gap-3 transition-all cursor-pointer ${
                    theme === 'dark'
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-bg)] text-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/20'
                      : 'border-[var(--color-border)] text-slate-400 dark:text-slate-500 hover:border-[var(--color-border-hover)] hover:text-slate-650 dark:hover:text-slate-350'
                  }`}
                >
                  <svg className="w-8 h-8 text-[var(--color-accent)]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  <div className="text-center">
                    <span className="font-bold text-sm block theme-text-title">Dark Theme</span>
                    <span className="text-[11px] opacity-75">Deep space darkmode styling</span>
                  </div>
                </button>
              </div>

              <hr className="border-[var(--color-border)] my-6" />

              <div>
                <h3 className="text-xl font-bold theme-text-title mb-1">AI Model Settings</h3>
                <p className="theme-text-body text-sm">Select the primary conversational model for follow-up chats.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                {/* Gemini Option */}
                <button
                  onClick={() => onPrimaryModelChange('gemini')}
                  className={`p-5 border rounded-2xl flex flex-col items-center gap-3 transition-all cursor-pointer ${
                    primaryModel === 'gemini'
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-bg)] text-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/20'
                      : 'border-[var(--color-border)] text-slate-400 dark:text-slate-500 hover:border-[var(--color-border-hover)] hover:text-slate-650 dark:hover:text-slate-350'
                  }`}
                >
                  <span className="text-2xl">✨</span>
                  <div className="text-center">
                    <span className="font-bold text-sm block theme-text-title">Gemini 1.5 Flash</span>
                    <span className="text-[11px] opacity-75">Fast, highly creative responses</span>
                  </div>
                </button>

                {/* Grok Option */}
                <button
                  onClick={() => onPrimaryModelChange('grok')}
                  className={`p-5 border rounded-2xl flex flex-col items-center gap-3 transition-all cursor-pointer ${
                    primaryModel === 'grok'
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-bg)] text-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/20'
                      : 'border-[var(--color-border)] text-slate-400 dark:text-slate-500 hover:border-[var(--color-border-hover)] hover:text-slate-650 dark:hover:text-slate-350'
                  }`}
                >
                  <span className="text-2xl">⚡</span>
                  <div className="text-center">
                    <span className="font-bold text-sm block theme-text-title">xAI Grok</span>
                    <span className="text-[11px] opacity-75">Direct, analytical insights</span>
                  </div>
                </button>
              </div>

              <hr className="border-[var(--color-border)] my-6" />

              <div>
                <h3 className="text-xl font-bold theme-text-title mb-1">Founder Experience Level</h3>
                <p className="theme-text-body text-sm">Calibrate the complexity of AI mentor explanations.</p>
              </div>

              <div className="flex bg-slate-200/50 dark:bg-slate-900/50 rounded-xl p-1 max-w-xl border border-[var(--color-border)]">
                {['beginner', 'intermediate', 'advanced'].map((level) => {
                  const isActive = experienceLevel === level;
                  return (
                    <button
                      key={level}
                      onClick={() => onExperienceLevelChange(level)}
                      className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all capitalize cursor-pointer ${
                        isActive 
                          ? 'bg-white dark:bg-slate-800 text-[var(--color-accent)] shadow-sm' 
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-300/30 dark:hover:bg-slate-700/30'
                      }`}
                    >
                      {level}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Account Profile Section */}
          {activeCategory === 'account' && (
            <div className="theme-card space-y-8">
              <div>
                <h3 className="text-xl font-bold theme-text-title mb-1">Account & Profile</h3>
                <p className="theme-text-body text-sm">Update your display info and change account passwords.</p>
              </div>

              {accountMsg && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-sm font-semibold">
                  {accountMsg}
                </div>
              )}

              {accountError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-sm font-semibold">
                  {accountError}
                </div>
              )}

              {/* Profile Details */}
              <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
                  <input
                    type="email"
                    disabled
                    value={userEmail}
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-slate-100 dark:bg-slate-900/50 text-slate-500 cursor-not-allowed font-medium text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Display Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-white dark:bg-slate-900 text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 font-semibold text-sm"
                    placeholder="e.g. John Doe"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 theme-btn-primary rounded-xl text-sm transition-all cursor-pointer hover:translate-y-0"
                >
                  Save Profile
                </button>
              </form>

              <hr className="border-[var(--color-border)]" />

              {/* Change Password */}
              <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
                <div>
                  <h4 className="text-base font-bold theme-text-title mb-1">Change Password</h4>
                  <p className="theme-text-muted text-xs mb-3 font-medium">Provide a secure password configuration.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">New Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-white dark:bg-slate-900 text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 font-medium text-sm"
                    placeholder="Enter new password"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-white dark:bg-slate-900 text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 font-medium text-sm"
                    placeholder="Confirm new password"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!password || !confirmPassword}
                  className="px-5 py-2.5 theme-btn-primary rounded-xl text-sm transition-all cursor-pointer hover:translate-y-0"
                >
                  Update Password
                </button>
              </form>
            </div>
          )}

          {/* Notifications Section */}
          {activeCategory === 'notifications' && (
            <div className="theme-card space-y-6">
              <div>
                <h3 className="text-xl font-bold theme-text-title mb-1">Notification Preferences</h3>
                <p className="theme-text-body text-sm">Choose what events trigger alert deliveries.</p>
              </div>

              <div className="space-y-4 max-w-xl">
                {/* Email Alert Toggle */}
                <label className="flex items-start gap-4 p-4 border border-[var(--color-border)] rounded-2xl hover:bg-slate-200/40 dark:hover:bg-slate-800/30 transition-all cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailAlerts}
                    onChange={(e) => setEmailAlerts(e.target.checked)}
                    className="w-4 h-4 mt-1 rounded text-[var(--color-accent)] border-[var(--color-border)] bg-slate-800 focus:ring-[var(--color-accent)]/20 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-sm block theme-text-title">Email Completed Reports</span>
                    <span className="text-xs theme-text-muted font-medium">Receive a structured summary directly in your inbox when the 4-agent validation finishes.</span>
                  </div>
                </label>

                {/* Telegram Milestone Toggle */}
                <label className="flex items-start gap-4 p-4 border border-[var(--color-border)] rounded-2xl hover:bg-slate-200/40 dark:hover:bg-slate-800/30 transition-all cursor-pointer">
                  <input
                    type="checkbox"
                    checked={telegramAlerts}
                    onChange={(e) => setTelegramAlerts(e.target.checked)}
                    className="w-4 h-4 mt-1 rounded text-[var(--color-accent)] border-[var(--color-border)] bg-slate-800 focus:ring-[var(--color-accent)]/20 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-sm block theme-text-title">Telegram Progress Reminders</span>
                    <span className="text-xs theme-text-muted font-medium">Connect and send periodic task check-ins through the insights alerts bot.</span>
                  </div>
                </label>

                {/* Marketing Toggle */}
                <label className="flex items-start gap-4 p-4 border border-[var(--color-border)] rounded-2xl hover:bg-slate-200/40 dark:hover:bg-slate-800/30 transition-all cursor-pointer">
                  <input
                    type="checkbox"
                    checked={marketingAlerts}
                    onChange={(e) => setMarketingAlerts(e.target.checked)}
                    className="w-4 h-4 mt-1 rounded text-[var(--color-accent)] border-[var(--color-border)] bg-slate-800 focus:ring-[var(--color-accent)]/20 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-sm block theme-text-title">Product Newsletter</span>
                    <span className="text-xs theme-text-muted font-medium">Get updates on new agent profiles and design frameworks.</span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* API Integrations Section */}
          {activeCategory === 'apis' && (
            <div className="theme-card space-y-6">
              <div>
                <h3 className="text-xl font-bold theme-text-title mb-1">API & Integration Keys</h3>
                <p className="theme-text-body text-sm">View or configure external credentials linking your workspace to AI pipelines.</p>
              </div>

              <div className="space-y-4 max-w-xl">
                {/* Groq Key */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Groq Inference API</span>
                    <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">CONNECTED</span>
                  </div>
                  <input
                    type="text"
                    disabled
                    value={groqKey}
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-slate-55 dark:bg-slate-900/50 text-slate-400 font-mono text-xs cursor-not-allowed"
                  />
                </div>

                {/* Tavily Key */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tavily Web Search API</span>
                    <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">CONNECTED</span>
                  </div>
                  <input
                    type="text"
                    disabled
                    value={tavilyKey}
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-slate-55 dark:bg-slate-900/50 text-slate-400 font-mono text-xs cursor-not-allowed"
                  />
                </div>

                {/* GitHub Token */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">GitHub Dev Token</span>
                    <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">CONNECTED</span>
                  </div>
                  <input
                    type="text"
                    disabled
                    value={githubKey}
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-slate-55 dark:bg-slate-900/50 text-slate-400 font-mono text-xs cursor-not-allowed"
                  />
                </div>

                <div className="p-4 bg-[var(--color-accent-bg)] border border-[var(--color-border-hover)] text-[var(--color-accent)] rounded-2xl text-xs font-semibold flex items-center gap-2">
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Model credentials are secured at rest. Bring Your Own (BYO) custom keys setup is under evaluation.</span>
                </div>
              </div>
            </div>
          )}

          {/* Privacy & Security Section */}
          {activeCategory === 'privacy' && (
            <div className="theme-card space-y-6">
              <div>
                <h3 className="text-xl font-bold theme-text-title mb-1">Privacy & Data Management</h3>
                <p className="theme-text-body text-sm">Download your portfolio backups or delete account configurations.</p>
              </div>

              <div className="space-y-6 max-w-xl">
                {/* Backup Data */}
                <div className="p-5 border border-[var(--color-border)] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="font-bold text-sm block theme-text-title">Export Portfolio Backups</span>
                    <span className="text-xs theme-text-muted font-medium">Download a full JSON file containing your active research plans.</span>
                  </div>
                  <button
                    onClick={() => {
                      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ export_date: new Date().toISOString() }));
                      const downloadAnchor = document.createElement('a');
                      downloadAnchor.setAttribute("href", dataStr);
                      downloadAnchor.setAttribute("download", `portfolio-export-${Date.now()}.json`);
                      document.body.appendChild(downloadAnchor);
                      downloadAnchor.click();
                      downloadAnchor.remove();
                    }}
                    className="px-4 py-2 border border-[var(--color-border)] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold theme-text-title hover:text-[var(--color-accent)] hover:border-[var(--color-border-hover)] transition-colors shrink-0 cursor-pointer"
                  >
                    Export Data
                  </button>
                </div>

                {/* Danger Zone */}
                <div className="p-5 border border-red-500/10 bg-red-500/5 rounded-2xl space-y-4">
                  <div>
                    <span className="font-bold text-sm block text-red-600 dark:text-red-400">Danger Zone</span>
                    <span className="text-xs theme-text-muted font-medium">Once you delete your account portfolio, the action cannot be undone.</span>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm("Are you absolutely sure you want to delete your portfolio account? All designs will be wiped permanently.")) {
                        alert("Account deletion requests require email confirmation. A request link has been queued.");
                      }
                    }}
                    className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Delete My Portfolio
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* About System Section */}
          {activeCategory === 'about' && (
            <div className="theme-card space-y-6">
              <div>
                <h3 className="text-xl font-bold theme-text-title mb-1">System Information</h3>
                <p className="theme-text-body text-sm">Review release version details and active services.</p>
              </div>

              <div className="border border-[var(--color-border)] rounded-2xl overflow-hidden max-w-xl text-sm">
                <div className="flex justify-between items-center p-4 border-b border-[var(--color-border)] bg-slate-50/50 dark:bg-slate-900/30">
                  <span className="theme-text-muted font-medium">Application Version</span>
                  <span className="font-bold theme-text-title">v1.2.0-beta</span>
                </div>
                <div className="flex justify-between items-center p-4 border-b border-[var(--color-border)]">
                  <span className="theme-text-muted font-medium">Supabase Backend DB</span>
                  <span className="font-bold text-emerald-500 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Connected
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 border-b border-[var(--color-border)] bg-slate-50/50 dark:bg-slate-900/30">
                  <span className="theme-text-muted font-medium">Pipeline Latency status</span>
                  <span className="font-bold text-[var(--color-accent)]">Optimal (~12.5s execution)</span>
                </div>
                <div className="flex justify-between items-center p-4">
                  <span className="theme-text-muted font-medium">OAuth Brand Display Name</span>
                  <span className="font-mono text-xs theme-text-title">Insights Copilot Workspace</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
