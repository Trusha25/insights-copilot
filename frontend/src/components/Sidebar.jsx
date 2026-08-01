import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Sidebar({ currentView, onNavigate, onNewAnalysis }) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) return saved === 'true';
    return window.innerWidth < 1024;
  });

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setEmail(user.email);
        try {
          const { data } = await supabase
            .from('user_profiles')
            .select('display_name')
            .eq('id', user.id)
            .single();
          if (data && data.display_name) {
            setDisplayName(data.display_name);
          }
        } catch (e) {
          console.warn('Failed to load user profile', e);
        }
      }
    });
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  };

  const navItems = [
    {
      id: 'home',
      label: 'Home',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      ),
    },
    {
      id: 'history',
      label: 'History',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'dashboard',
      label: 'Builder Dashboard',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
        </svg>
      ),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  const getInitials = () => {
    const name = displayName || email || 'US';
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div
      className={`bg-[var(--bg-surface)]/90 backdrop-blur-2xl border-r border-[#63D7E8]/20 h-screen flex flex-col sticky top-0 shrink-0 font-sans z-30 transition-all duration-300 ease-in-out shadow-[0_0_30px_rgba(0,0,0,0.6)] ${
        isCollapsed ? 'w-[78px]' : 'w-[260px]'
      }`}
    >
      <div className="flex-1 py-8 flex flex-col items-stretch overflow-y-auto overflow-x-hidden min-h-0">
        
        {/* Brand Header */}
        <div className={`flex items-center justify-between mb-8 select-none ${isCollapsed ? 'px-4' : 'px-5'}`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="absolute inset-0 bg-[#63D7E8]/20 rounded-xl blur-md animate-pulse"></div>
              <svg className="w-8 h-8 text-[#63D7E8] relative drop-shadow-[0_0_8px_var(--color-accent-glow)]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l8.66 5v10L12 22l-8.66-5V7L12 2z" />
              </svg>
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold text-white text-[16px] tracking-tight leading-tight truncate">iNSIGHTS OS</span>
                <span className="text-[8.5px] font-bold text-slate-400 tracking-wider uppercase mt-0.5 leading-none truncate">Innovation Platform</span>
              </div>
            )}
          </div>
          
          {!isCollapsed && (
            <button
              onClick={handleToggleCollapse}
              aria-label="Collapse Sidebar"
              className="theme-icon-btn hidden md:block shrink-0"
              title="Collapse Sidebar"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
              </svg>
            </button>
          )}
        </div>

        {/* Collapsed Expand Toggle Button */}
        {isCollapsed && (
          <div className="px-4 mb-6 hidden md:block">
            <button
              onClick={handleToggleCollapse}
              aria-label="Expand Sidebar"
              className="w-full flex items-center justify-center p-2.5 rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-secondary)] transition-all cursor-pointer"
              title="Expand Sidebar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        )}

        {/* New Analysis CTA Button */}
        <div className={isCollapsed ? 'px-4 mb-8' : 'px-5 mb-8'}>
          {isCollapsed ? (
            <button
              onClick={onNewAnalysis}
              aria-label="New Analysis"
              className="flex items-center justify-center w-10 h-10 theme-btn-primary rounded-lg cursor-pointer mx-auto shrink-0 shadow-md shadow-[var(--color-accent-glow)]"
              title="New Analysis"
            >
              <svg className="w-5 h-5 text-[#0B0F19]" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          ) : (
            <button
              onClick={onNewAnalysis}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 theme-btn-primary rounded-lg text-sm cursor-pointer shrink-0"
            >
              <svg className="w-4 h-4 text-[#0B0F19]" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span className="font-extrabold text-[#0B0F19]">New Analysis</span>
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <div className={`space-y-1.5 ${isCollapsed ? 'px-4' : 'px-5'}`}>
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            if (isCollapsed) {
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  aria-label={item.label}
                  className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 border mx-auto cursor-pointer ${
                    isActive
                      ? 'bg-[var(--color-accent-bg)] border-[var(--accent-start)] text-[var(--accent-end)] shadow-[0_0_12px_var(--color-accent-glow)]'
                      : 'bg-transparent border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-white'
                  }`}
                  title={item.label}
                >
                  {item.icon}
                </button>
              );
            }
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-start gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 font-semibold text-sm cursor-pointer relative ${
                  isActive
                    ? 'bg-[rgba(99,215,232,0.09)] text-[#63D7E8]'
                    : 'text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.04)] hover:text-white'
                }`}
              >
                {/* Active left accent bar */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-[#8FEA8A] to-[#63D7E8] shadow-[0_0_8px_rgba(99,215,232,0.7)]" />
                )}
                <span className={`${isActive ? 'text-[#63D7E8]' : 'text-[var(--text-secondary)]'} transition-colors`}>{item.icon}</span>
                <span className="truncate">{item.label}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#8FEA8A] shadow-[0_0_6px_rgba(143,234,138,0.8)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* User Profile Card, Usage Progress Bar & Logout */}
      <div className={`border-t border-[var(--border-subtle)] shrink-0 ${isCollapsed ? 'p-3' : 'p-4'}`}>
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-3.5 py-1">
            <div
              className="w-10 h-10 rounded-full bg-gradient-to-tr from-[var(--accent-start)] via-[var(--accent-mid)] to-[var(--accent-end)] text-[#0B0F19] flex items-center justify-center font-extrabold text-xs border border-[var(--border-subtle)] shadow-sm shrink-0"
              title={displayName || email}
            >
              {getInitials()}
            </div>
            <button
              onClick={handleLogout}
              aria-label="Sign Out"
              title="Sign Out"
              className="theme-icon-btn shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Profile Row */}
            <div className="flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-[rgba(255,255,255,0.025)] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(99,215,232,0.18)] transition-all group">
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Avatar with gradient ring */}
                <div className="relative shrink-0">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#8FEA8A] via-[#63D7E8] to-[#4C8CFF] opacity-60 blur-[2px]" />
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#8FEA8A] via-[#63D7E8] to-[#4C8CFF] text-[#0B0F19] flex items-center justify-center font-extrabold text-xs relative z-10 shadow-sm">
                    {getInitials()}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-200 truncate group-hover:text-white transition-colors" title={displayName || email}>
                    {displayName || email.split('@')[0]}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[9px] text-[var(--text-secondary)] font-semibold leading-none">Pro Plan</span>
                    <span className="inline-block bg-gradient-to-r from-[#8FEA8A] to-[#63D7E8] text-[#0B0F19] text-[8px] font-black px-1.5 py-0.5 rounded-md leading-none">PRO</span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                aria-label="Sign Out"
                title="Sign Out"
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-[rgba(255,255,255,0.08)] transition-all shrink-0 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>

            {/* Analyses Usage Progress Bar */}
            <div className="p-2.5 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[9.5px] font-700 text-slate-500 uppercase tracking-wider">Analyses Used</span>
                <span className="text-[10px] text-white font-bold">12 / 50</span>
              </div>
              <div className="w-full bg-[rgba(255,255,255,0.05)] rounded-full h-1.5 overflow-hidden relative">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#8FEA8A] via-[#63D7E8] to-[#4C8CFF] relative"
                  style={{ width: '24%' }}
                >
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2.5 h-2.5 rounded-full bg-[#63D7E8] shadow-[0_0_6px_rgba(99,215,232,0.8)] border border-[#0B0F19]" />
                </div>
              </div>
              <p className="text-[9px] text-slate-600 font-medium truncate">Pro Plan • Renews May 24, 2025</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
