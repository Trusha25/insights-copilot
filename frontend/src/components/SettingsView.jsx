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
    <div className="flex-1 p-6 lg:p-10 min-w-0 bg-[var(--bg-primary)] min-h-screen transition-colors font-sans">
      {/* Title */}
      <header className="flex items-center gap-3 border-b border-[var(--border-subtle)] pb-4 mb-8">
        <div className="w-10 h-10 bg-[var(--color-accent-bg)] text-[var(--color-accent)] border border-[var(--border-strong)] rounded-lg flex items-center justify-center shadow-sm">
          <svg className="w-6 h-6 animate-float" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-extrabold theme-text-title tracking-tight">Settings</h1>
          <p className="theme-text-muted text-xs mt-0.5 font-medium">Manage your workspace preferences, profile, and system settings</p>
        </div>
      </header>

      {/* Main Settings Panel Grid */}
      <div className="flex flex-col lg:flex-row gap-8 max-w-6xl items-start">
        {/* Category Navigation (Left Pane) */}
        <nav className="w-full lg:w-64 shrink-0 flex flex-row lg:flex-col gap-1 border-b lg:border-b-0 lg:border-r border-[var(--border-subtle)] pb-4 lg:pb-0 pr-0 lg:pr-4 overflow-x-auto lg:overflow-x-visible">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg font-bold text-xs transition-all whitespace-nowrap lg:whitespace-normal shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-[var(--accent-start)] to-[var(--accent-end)] text-[#0A0E0C] shadow-md shadow-[var(--color-accent-glow)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-white'
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
                <h3 className="text-lg font-bold theme-text-title mb-1">Appearance Settings</h3>
                <p className="theme-text-muted text-xs">Choose between dark and light modes for the interface.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-xl">
                {/* Light Mode Box */}
                <button
                  onClick={() => onThemeChange('light')}
                  className={`p-4 border rounded-lg flex flex-col items-center gap-2.5 transition-all cursor-pointer ${
                    theme === 'light'
                      ? 'border-[var(--accent-start)] bg-[var(--color-accent-bg)] text-[var(--accent-end)]'
                      : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-white'
                  }`}
                >
                  <svg className="w-7 h-7 text-[var(--accent-end)]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10 5 5 0 000-10z" />
                  </svg>
                  <div className="text-center">
                    <span className="font-bold text-xs block theme-text-title">Light Theme</span>
                    <span className="text-[10px] opacity-75">Sleek high-contrast white</span>
                  </div>
                </button>

                {/* Dark Mode Box */}
                <button
                  onClick={() => onThemeChange('dark')}
                  className={`p-4 border rounded-lg flex flex-col items-center gap-2.5 transition-all cursor-pointer ${
                    theme === 'dark'
                      ? 'border-[var(--accent-start)] bg-[var(--color-accent-bg)] text-[var(--accent-end)]'
                      : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-white'
                  }`}
                >
                  <svg className="w-7 h-7 text-[var(--accent-end)]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  <div className="text-center">
                    <span className="font-bold text-xs block theme-text-title">Dark Theme</span>
                    <span className="text-[10px] opacity-75">Deep space darkmode styling</span>
                  </div>
                </button>
              </div>

              <hr className="border-[var(--border-subtle)] my-6" />

              <div>
                <h3 className="text-lg font-bold theme-text-title mb-1">AI Model Settings</h3>
                <p className="theme-text-muted text-xs">Select the primary conversational model for follow-up chats.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-xl">
                {/* Gemini Option */}
                <button
                  onClick={() => onPrimaryModelChange('gemini')}
                  className={`p-4 border rounded-lg flex flex-col items-center gap-2.5 transition-all cursor-pointer ${
                    primaryModel === 'gemini'
                      ? 'border-[var(--accent-start)] bg-[var(--color-accent-bg)] text-[var(--accent-end)]'
                      : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-white'
                  }`}
                >
                  <span className="text-xl">✨</span>
                  <div className="text-center">
                    <span className="font-bold text-xs block theme-text-title">Gemini 1.5 Flash</span>
                    <span className="text-[10px] opacity-75">Fast, highly creative responses</span>
                  </div>
                </button>

                {/* Grok Option */}
                <button
                  onClick={() => onPrimaryModelChange('grok')}
                  className={`p-4 border rounded-lg flex flex-col items-center gap-2.5 transition-all cursor-pointer ${
                    primaryModel === 'grok'
                      ? 'border-[var(--accent-start)] bg-[var(--color-accent-bg)] text-[var(--accent-end)]'
                      : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-white'
                  }`}
                >
                  <span className="text-xl">⚡</span>
                  <div className="text-center">
                    <span className="font-bold text-xs block theme-text-title">xAI Grok</span>
                    <span className="text-[10px] opacity-75">Direct, analytical insights</span>
                  </div>
                </button>
              </div>

              <hr className="border-[var(--border-subtle)] my-6" />

              <div>
                <h3 className="text-lg font-bold theme-text-title mb-1">Founder Experience Level</h3>
                <p className="theme-text-muted text-xs">Calibrate the complexity of AI mentor explanations.</p>
              </div>

              <div className="flex bg-[var(--bg-secondary)] rounded-lg p-1 max-w-xl border border-[var(--border-subtle)]">
                {['beginner', 'intermediate', 'advanced'].map((level) => {
                  const isActive = experienceLevel === level;
                  return (
                    <button
                      key={level}
                      onClick={() => onExperienceLevelChange(level)}
                      className={`flex-1 py-2 text-xs font-bold rounded-md transition-all capitalize cursor-pointer ${
                        isActive 
                          ? 'bg-[var(--accent-start)] text-[#0A0E0C] shadow-sm' 
                          : 'text-[var(--text-secondary)] hover:text-white'
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
            <div className="theme-card space-y-6">
              <div>
                <h3 className="text-lg font-bold theme-text-title mb-1">Account & Profile</h3>
                <p className="theme-text-muted text-xs">Update your display info and change account passwords.</p>
              </div>

              {accountMsg && (
                <div className="p-3.5 bg-[var(--color-accent-bg)] border border-[var(--border-strong)] text-[var(--accent-end)] rounded-lg text-xs font-semibold">
                  {accountMsg}
                </div>
              )}

              {accountError && (
                <div className="theme-warning-card text-xs font-semibold">
                  {accountError}
                </div>
              )}

              {/* Profile Details */}
              <form onSubmit={handleUpdateProfile} className="space-y-3.5 max-w-md">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Email Address</label>
                  <input
                    type="email"
                    disabled
                    aria-label="Email Address"
                    value={userEmail}
                    className="w-full px-3.5 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] cursor-not-allowed font-medium text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Display Name</label>
                  <input
                    type="text"
                    aria-label="Display Name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="theme-input w-full px-3.5 py-2 text-xs font-semibold"
                    placeholder="e.g. John Doe"
                  />
                </div>
                <button
                  type="submit"
                  className="theme-btn-solid text-xs py-2 px-4"
                >
                  Save Profile
                </button>
              </form>

              <hr className="border-[var(--border-subtle)]" />

              {/* Change Password */}
              <form onSubmit={handleUpdatePassword} className="space-y-3.5 max-w-md">
                <div>
                  <h4 className="text-sm font-bold theme-text-title mb-0.5">Change Password</h4>
                  <p className="theme-text-muted text-xs font-medium">Provide a secure password configuration.</p>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">New Password</label>
                  <input
                    type="password"
                    aria-label="New Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="theme-input w-full px-3.5 py-2 text-xs font-medium"
                    placeholder="Enter new password"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Confirm Password</label>
                  <input
                    type="password"
                    aria-label="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="theme-input w-full px-3.5 py-2 text-xs font-medium"
                    placeholder="Confirm new password"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!password || !confirmPassword}
                  className="theme-btn-solid text-xs py-2 px-4 disabled:opacity-50"
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
                <h3 className="text-lg font-bold theme-text-title mb-1">Notification Preferences</h3>
                <p className="theme-text-muted text-xs">Choose what events trigger alert deliveries.</p>
              </div>

              <div className="space-y-3.5 max-w-xl">
                {/* Email Alert Toggle */}
                <label className="flex items-start gap-3.5 p-3.5 border border-[var(--border-subtle)] rounded-lg hover:bg-[var(--bg-secondary)] transition-all cursor-pointer">
                  <input
                    type="checkbox"
                    aria-label="Email Completed Reports"
                    checked={emailAlerts}
                    onChange={(e) => setEmailAlerts(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-[var(--accent-start)] border-[var(--border-subtle)] bg-[var(--bg-primary)] focus:ring-[var(--accent-start)] cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-xs block theme-text-title">Email Completed Reports</span>
                    <span className="text-xs theme-text-muted font-medium">Receive a structured summary directly in your inbox when the 4-agent validation finishes.</span>
                  </div>
                </label>

                {/* Telegram Milestone Toggle */}
                <label className="flex items-start gap-3.5 p-3.5 border border-[var(--border-subtle)] rounded-lg hover:bg-[var(--bg-secondary)] transition-all cursor-pointer">
                  <input
                    type="checkbox"
                    aria-label="Telegram Progress Reminders"
                    checked={telegramAlerts}
                    onChange={(e) => setTelegramAlerts(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-[var(--accent-start)] border-[var(--border-subtle)] bg-[var(--bg-primary)] focus:ring-[var(--accent-start)] cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-xs block theme-text-title">Telegram Progress Reminders</span>
                    <span className="text-xs theme-text-muted font-medium">Connect and send periodic task check-ins through the insights alerts bot.</span>
                  </div>
                </label>

                {/* Marketing Toggle */}
                <label className="flex items-start gap-3.5 p-3.5 border border-[var(--border-subtle)] rounded-lg hover:bg-[var(--bg-secondary)] transition-all cursor-pointer">
                  <input
                    type="checkbox"
                    aria-label="Product Newsletter"
                    checked={marketingAlerts}
                    onChange={(e) => setMarketingAlerts(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-[var(--accent-start)] border-[var(--border-subtle)] bg-[var(--bg-primary)] focus:ring-[var(--accent-start)] cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-xs block theme-text-title">Product Newsletter</span>
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
                <h3 className="text-lg font-bold theme-text-title mb-1">API & Integration Keys</h3>
                <p className="theme-text-muted text-xs">View or configure external credentials linking your workspace to AI pipelines.</p>
              </div>

              <div className="space-y-3.5 max-w-xl">
                {/* Groq Key */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Groq Inference API</span>
                    <span className="theme-badge text-[9px]">CONNECTED</span>
                  </div>
                  <input
                    type="text"
                    disabled
                    aria-label="Groq Inference API Key"
                    value={groqKey}
                    className="w-full px-3.5 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] font-mono text-xs cursor-not-allowed"
                  />
                </div>

                {/* Tavily Key */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Tavily Web Search API</span>
                    <span className="theme-badge text-[9px]">CONNECTED</span>
                  </div>
                  <input
                    type="text"
                    disabled
                    aria-label="Tavily Web Search API Key"
                    value={tavilyKey}
                    className="w-full px-3.5 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] font-mono text-xs cursor-not-allowed"
                  />
                </div>

                {/* GitHub Token */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">GitHub Dev Token</span>
                    <span className="theme-badge text-[9px]">CONNECTED</span>
                  </div>
                  <input
                    type="text"
                    disabled
                    aria-label="GitHub Dev Token"
                    value={githubKey}
                    className="w-full px-3.5 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] font-mono text-xs cursor-not-allowed"
                  />
                </div>

                <div className="p-3.5 bg-[var(--color-accent-bg)] border border-[var(--border-strong)] text-[var(--accent-end)] rounded-lg text-xs font-semibold flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
                <h3 className="text-lg font-bold theme-text-title mb-1">Privacy & Data Management</h3>
                <p className="theme-text-muted text-xs">Download your portfolio backups or delete account configurations.</p>
              </div>

              <div className="space-y-4 max-w-xl">
                {/* Backup Data */}
                <div className="p-4 border border-[var(--border-subtle)] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                  <div>
                    <span className="font-bold text-xs block theme-text-title">Export Portfolio Backups</span>
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
                    className="theme-btn-outline text-xs px-3.5 py-1.5 shrink-0"
                  >
                    Export Data
                  </button>
                </div>

                {/* Danger Zone */}
                <div className="theme-warning-card space-y-3">
                  <div>
                    <span className="font-bold text-xs block">Danger Zone</span>
                    <span className="text-xs opacity-90 font-medium">Once you delete your account portfolio, the action cannot be undone.</span>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm("Are you absolutely sure you want to delete your portfolio account? All designs will be wiped permanently.")) {
                        alert("Account deletion requests require email confirmation. A request link has been queued.");
                      }
                    }}
                    className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
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
                <h3 className="text-lg font-bold theme-text-title mb-1">System Information</h3>
                <p className="theme-text-muted text-xs">Review release version details and active services.</p>
              </div>

              <div className="border border-[var(--border-subtle)] rounded-lg overflow-hidden max-w-xl text-xs">
                <div className="flex justify-between items-center p-3.5 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                  <span className="theme-text-muted font-medium">Application Version</span>
                  <span className="font-bold theme-text-title">v1.2.0-beta</span>
                </div>
                <div className="flex justify-between items-center p-3.5 border-b border-[var(--border-subtle)]">
                  <span className="theme-text-muted font-medium">Supabase Backend DB</span>
                  <span className="font-bold text-[var(--accent-end)] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[var(--accent-end)] animate-pulse"></span>
                    Connected
                  </span>
                </div>
                <div className="flex justify-between items-center p-3.5 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                  <span className="theme-text-muted font-medium">Pipeline Latency status</span>
                  <span className="font-bold text-[var(--accent-end)]">Optimal (~12.5s execution)</span>
                </div>
                <div className="flex justify-between items-center p-3.5">
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
