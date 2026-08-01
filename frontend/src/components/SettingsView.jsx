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
    { id: 'about', label: 'About System', icon: 'ℹ️' },
  ];

  return (
    <div className="flex-1 p-6 lg:p-10 min-w-0 bg-[var(--bg-primary)] min-h-screen transition-colors font-sans">
      {/* Title */}
      <header className="flex items-center gap-3 border-b border-[var(--border-subtle)] pb-5 mb-8">
        <div className="w-11 h-11 bg-[var(--color-accent-bg)] text-[var(--color-accent)] border border-[var(--border-subtle)] rounded-xl flex items-center justify-center shadow-xs">
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
      <div className="flex flex-col lg:flex-row gap-8 max-w-5xl items-start">
        {/* Category Navigation (Left Pane) */}
        <nav className="w-full lg:w-60 shrink-0 flex flex-row lg:flex-col gap-1.5 border-b lg:border-b-0 lg:border-r border-[var(--border-subtle)] pb-4 lg:pb-0 pr-0 lg:pr-6 overflow-x-auto lg:overflow-x-visible">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap lg:whitespace-normal shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[var(--color-accent)] text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span className="text-base">{cat.icon}</span>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                {/* Light Mode Box */}
                <button
                  onClick={() => onThemeChange('light')}
                  className={`p-5 border rounded-xl flex flex-col items-center gap-3 transition-all cursor-pointer ${
                    theme === 'light'
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-bg)] text-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/20 shadow-xs'
                      : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] bg-[var(--bg-secondary)]'
                  }`}
                >
                  <svg className="w-8 h-8 text-[var(--color-accent)]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10 5 5 0 000-10z" />
                  </svg>
                  <div className="text-center">
                    <span className="font-bold text-xs block theme-text-title">Light Theme</span>
                    <span className="text-[10px] theme-text-muted">Sleek high-contrast white</span>
                  </div>
                </button>

                {/* Dark Mode Box */}
                <button
                  onClick={() => onThemeChange('dark')}
                  className={`p-5 border rounded-xl flex flex-col items-center gap-3 transition-all cursor-pointer ${
                    theme === 'dark'
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-bg)] text-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/20 shadow-xs'
                      : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] bg-[var(--bg-secondary)]'
                  }`}
                >
                  <svg className="w-8 h-8 text-[var(--color-accent)]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  <div className="text-center">
                    <span className="font-bold text-xs block theme-text-title">Dark Theme</span>
                    <span className="text-[10px] theme-text-muted">Deep space darkmode styling</span>
                  </div>
                </button>
              </div>

              <hr className="border-[var(--border-subtle)] my-6" />

              <div>
                <h3 className="text-lg font-bold theme-text-title mb-1">AI Model Settings</h3>
                <p className="theme-text-muted text-xs">Select the primary conversational model for follow-up chats.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                {/* Gemini Option */}
                <button
                  onClick={() => onPrimaryModelChange('gemini')}
                  className={`p-5 border rounded-xl flex flex-col items-center gap-3 transition-all cursor-pointer ${
                    primaryModel === 'gemini'
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-bg)] text-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/20 shadow-xs'
                      : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] bg-[var(--bg-secondary)]'
                  }`}
                >
                  <span className="text-2xl">✨</span>
                  <div className="text-center">
                    <span className="font-bold text-xs block theme-text-title">Gemini 1.5 Flash</span>
                    <span className="text-[10px] theme-text-muted">Fast, highly creative responses</span>
                  </div>
                </button>

                {/* Grok Option */}
                <button
                  onClick={() => onPrimaryModelChange('grok')}
                  className={`p-5 border rounded-xl flex flex-col items-center gap-3 transition-all cursor-pointer ${
                    primaryModel === 'grok'
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-bg)] text-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/20 shadow-xs'
                      : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] bg-[var(--bg-secondary)]'
                  }`}
                >
                  <span className="text-2xl">⚡</span>
                  <div className="text-center">
                    <span className="font-bold text-xs block theme-text-title">xAI Grok</span>
                    <span className="text-[10px] theme-text-muted">Direct, analytical insights</span>
                  </div>
                </button>
              </div>

              <hr className="border-[var(--border-subtle)] my-6" />

              <div>
                <h3 className="text-lg font-bold theme-text-title mb-1">Founder Experience Level</h3>
                <p className="theme-text-muted text-xs">Calibrate the complexity of AI mentor explanations.</p>
              </div>

              <div className="flex bg-[var(--bg-secondary)] rounded-xl p-1 max-w-xl border border-[var(--border-subtle)]">
                {['beginner', 'intermediate', 'advanced'].map((level) => {
                  const isActive = experienceLevel === level;
                  return (
                    <button
                      key={level}
                      onClick={() => onExperienceLevelChange(level)}
                      className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all capitalize cursor-pointer ${
                        isActive 
                          ? 'bg-[var(--color-accent)] text-white shadow-xs' 
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
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
                <div className="p-3.5 bg-[var(--color-accent-bg)] border border-[var(--border-strong)] text-[var(--color-accent)] rounded-xl text-xs font-semibold">
                  {accountMsg}
                </div>
              )}

              {accountError && (
                <div className="theme-warning-card text-xs font-semibold">
                  {accountError}
                </div>
              )}

              {/* Profile Details */}
              <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Email Address</label>
                  <input
                    type="email"
                    disabled
                    aria-label="Email Address"
                    value={userEmail}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] cursor-not-allowed font-medium text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Display Name</label>
                  <input
                    type="text"
                    aria-label="Display Name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="theme-input w-full px-3.5 py-2.5 text-xs font-semibold"
                    placeholder="e.g. John Doe"
                  />
                </div>
                <button
                  type="submit"
                  className="theme-btn-solid text-xs py-2.5 px-5 font-bold"
                >
                  Save Profile
                </button>
              </form>

              <hr className="border-[var(--border-subtle)]" />

              {/* Change Password */}
              <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
                <div>
                  <h4 className="text-sm font-bold theme-text-title mb-0.5">Change Password</h4>
                  <p className="theme-text-muted text-xs font-medium">Provide a secure password configuration.</p>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">New Password</label>
                  <input
                    type="password"
                    aria-label="New Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="theme-input w-full px-3.5 py-2.5 text-xs font-medium"
                    placeholder="Enter new password"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Confirm Password</label>
                  <input
                    type="password"
                    aria-label="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="theme-input w-full px-3.5 py-2.5 text-xs font-medium"
                    placeholder="Confirm new password"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!password || !confirmPassword}
                  className="theme-btn-solid text-xs py-2.5 px-5 font-bold disabled:opacity-50"
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
                <label className="flex items-start gap-3.5 p-4 border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-secondary)] hover:border-[var(--border-strong)] transition-all cursor-pointer">
                  <input
                    type="checkbox"
                    aria-label="Email Completed Reports"
                    checked={emailAlerts}
                    onChange={(e) => setEmailAlerts(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-[var(--color-accent)] border-[var(--border-subtle)] bg-[var(--bg-primary)] focus:ring-[var(--color-accent)] cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-xs block theme-text-title">Email Completed Reports</span>
                    <span className="text-xs theme-text-muted font-medium">Receive a structured summary directly in your inbox when the 4-agent validation finishes.</span>
                  </div>
                </label>

                {/* Telegram Milestone Toggle */}
                <label className="flex items-start gap-3.5 p-4 border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-secondary)] hover:border-[var(--border-strong)] transition-all cursor-pointer">
                  <input
                    type="checkbox"
                    aria-label="Telegram Progress Reminders"
                    checked={telegramAlerts}
                    onChange={(e) => setTelegramAlerts(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-[var(--color-accent)] border-[var(--border-subtle)] bg-[var(--bg-primary)] focus:ring-[var(--color-accent)] cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-xs block theme-text-title">Telegram Progress Reminders</span>
                    <span className="text-xs theme-text-muted font-medium">Connect and send periodic task check-ins through the insights alerts bot.</span>
                  </div>
                </label>

                {/* Marketing Toggle */}
                <label className="flex items-start gap-3.5 p-4 border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-secondary)] hover:border-[var(--border-strong)] transition-all cursor-pointer">
                  <input
                    type="checkbox"
                    aria-label="Product Newsletter"
                    checked={marketingAlerts}
                    onChange={(e) => setMarketingAlerts(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-[var(--color-accent)] border-[var(--border-subtle)] bg-[var(--bg-primary)] focus:ring-[var(--color-accent)] cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-xs block theme-text-title">Product Newsletter</span>
                    <span className="text-xs theme-text-muted font-medium">Get updates on new agent profiles and design frameworks.</span>
                  </div>
                </label>
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

              <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden max-w-xl text-xs shadow-xs">
                <div className="flex justify-between items-center p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                  <span className="theme-text-muted font-medium">Application Version</span>
                  <span className="font-bold theme-text-title">v2.0.0-production</span>
                </div>
                <div className="flex justify-between items-center p-4 border-b border-[var(--border-subtle)]">
                  <span className="theme-text-muted font-medium">Supabase Backend DB</span>
                  <span className="font-bold text-emerald-500 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Connected
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                  <span className="theme-text-muted font-medium">Pipeline Latency Status</span>
                  <span className="font-bold text-[var(--color-accent)]">Optimal (~12.5s execution)</span>
                </div>
                <div className="flex justify-between items-center p-4">
                  <span className="theme-text-muted font-medium">OAuth Workspace Name</span>
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

