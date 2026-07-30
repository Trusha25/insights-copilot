import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Sidebar({ currentView, onNavigate, onNewAnalysis }) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const navItems = [
    {
      id: 'history',
      label: 'History',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'dashboard',
      label: 'Personalized Dashboard',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
        </svg>
      ),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  const getInitials = () => {
    const name = displayName || email || 'US';
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="w-[260px] bg-[var(--bg-surface)] border-r border-[var(--color-border)] min-h-screen flex flex-col sticky top-0 shrink-0 font-sans z-20 transition-colors">
      <div className="flex-1 py-8 px-5 space-y-2 flex flex-col items-stretch">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 mb-8 select-none">
          <div className="relative">
            <div className="absolute inset-0 bg-[var(--color-accent)]/20 rounded-xl blur-md animate-pulse"></div>
            <svg className="w-8 h-8 text-[var(--color-accent)] relative drop-shadow-[0_0_8px_var(--color-accent-glow)]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l8.66 5v10L12 22l-8.66-5V7L12 2z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-white text-[17px] tracking-tight leading-tight">iNSIGHTS OS</span>
            <span className="text-[9px] font-bold text-slate-500 tracking-wider uppercase mt-0.5 leading-none">Innovation Operating System</span>
          </div>
        </div>

        {/* New Analysis CTA Button */}
        <button
          onClick={onNewAnalysis}
          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 theme-btn-primary rounded-xl text-[14px] mb-8 cursor-pointer shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span>New Analysis</span>
        </button>

        {/* Navigation Items */}
        <div className="space-y-1.5">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-start gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-[14px] border ${
                  isActive
                    ? 'bg-[var(--color-accent-bg)] border-[var(--color-border-hover)] text-[var(--color-accent)] shadow-[0_0_15px_var(--color-accent-glow)]'
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
      <div className="p-4 border-t border-[var(--color-border)] flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-slate-900/40 border border-transparent hover:border-slate-800/40 transition-colors group">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[var(--color-accent-hover)] to-[var(--color-accent)] text-[#030407] flex items-center justify-center font-extrabold text-sm shrink-0 border border-[var(--color-border)] shadow-sm">
              {getInitials()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-200 truncate group-hover:text-white transition-colors" title={displayName || email}>
                {displayName || email.split('@')[0]}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px] text-slate-500 font-medium leading-none">Pro Plan</span>
                <span className="bg-[var(--color-accent-bg)] text-[var(--color-accent)] border border-[var(--color-border-hover)] text-[9px] font-black px-1.5 py-0.5 rounded leading-none">PRO</span>
              </div>
            </div>
          </div>
          
          {/* Sign Out Button nested inside profile card */}
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
