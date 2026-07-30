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
      className={`bg-[var(--bg-surface)] border-r border-[var(--color-border)] h-screen flex flex-col sticky top-0 shrink-0 font-sans z-30 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-[78px]' : 'w-[260px]'
      }`}
    >
      <div className="flex-1 py-8 flex flex-col items-stretch overflow-y-auto overflow-x-hidden min-h-0">
        
        {/* Brand Header */}
        <div className={`flex items-center justify-between mb-8 select-none ${isCollapsed ? 'px-4' : 'px-5'}`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="absolute inset-0 bg-[var(--color-accent)]/20 rounded-xl blur-md animate-pulse"></div>
              <svg className="w-8 h-8 text-[var(--color-accent)] relative drop-shadow-[0_0_8px_var(--color-accent-glow)]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l8.66 5v10L12 22l-8.66-5V7L12 2z" />
              </svg>
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold text-white text-[16px] tracking-tight leading-tight truncate">iNSIGHTS OS</span>
                <span className="text-[8.5px] font-bold text-slate-500 tracking-wider uppercase mt-0.5 leading-none truncate">Innovation Platform</span>
              </div>
            )}
          </div>
          
          {!isCollapsed && (
            <button
              onClick={handleToggleCollapse}
              className="p-1.5 rounded-lg border border-[var(--color-border)] text-slate-500 hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-bg)]/20 hover:border-[var(--color-border-hover)] transition-all cursor-pointer hidden md:block shrink-0"
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
              className="w-full flex items-center justify-center p-2.5 rounded-xl border border-[var(--color-border)] text-slate-400 hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-bg)]/20 hover:border-[var(--color-border-hover)] transition-all cursor-pointer"
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
              className="flex items-center justify-center w-10.5 h-10.5 theme-btn-primary rounded-xl cursor-pointer mx-auto shrink-0 shadow-md shadow-[var(--color-accent-glow)]"
              title="New Analysis"
            >
              <svg className="w-5 h-5 text-[#030407]" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          ) : (
            <button
              onClick={onNewAnalysis}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 theme-btn-primary rounded-xl text-sm cursor-pointer shrink-0"
            >
              <svg className="w-4 h-4 text-[#030407]" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span className="font-extrabold text-[#030407]">New Analysis</span>
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
                  className={`flex items-center justify-center w-10.5 h-10.5 rounded-xl transition-all duration-200 border mx-auto cursor-pointer ${
                    isActive
                      ? 'bg-[var(--color-accent-bg)] border-[var(--color-accent)] text-[var(--color-accent)] shadow-[0_0_12px_var(--color-accent-glow)]'
                      : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-900/40 hover:text-slate-200'
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
                className={`w-full flex items-center justify-start gap-3.5 px-4 py-2.5 rounded-xl transition-all duration-200 font-semibold text-sm border cursor-pointer ${
                  isActive
                    ? 'bg-[var(--color-accent-bg)] border-[var(--color-border-hover)] text-[var(--color-accent)] shadow-[0_0_12px_var(--color-accent-glow)]'
                    : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-900/40 hover:text-slate-200'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* User Profile Card and Logout */}
      <div className={`border-t border-[var(--color-border)] shrink-0 ${isCollapsed ? 'p-3' : 'p-4'}`}>
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-3.5 py-1">
            <div
              className="w-10 h-10 rounded-full bg-gradient-to-tr from-[var(--color-accent-hover)] to-[var(--color-accent)] text-[#030407] flex items-center justify-center font-extrabold text-xs border border-[var(--color-border)] shadow-sm shrink-0"
              title={displayName || email}
            >
              {getInitials()}
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-slate-900/40 border border-transparent hover:border-slate-800/40 transition-colors group">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[var(--color-accent-hover)] to-[var(--color-accent)] text-[#030407] flex items-center justify-center font-extrabold text-xs shrink-0 border border-[var(--color-border)] shadow-sm">
                {getInitials()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-200 truncate group-hover:text-white transition-colors" title={displayName || email}>
                  {displayName || email.split('@')[0]}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-slate-500 font-bold leading-none">Pro Plan</span>
                  <span className="bg-[var(--color-accent-bg)] text-[var(--color-accent)] border border-[var(--color-border-hover)] text-[8.5px] font-black px-1 py-0.5 rounded leading-none">PRO</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
