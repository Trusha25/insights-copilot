import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Sidebar({ currentView, onNavigate }) {
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
      id: 'home',
      label: 'Home',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
        </svg>
      ),
    },
    {
      id: 'dashboard',
      label: 'Builder Dashboard',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 14a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1v-5zM14 14a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
        </svg>
      ),
    },
    {
      id: 'history',
      label: 'Workspace History',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="w-[240px] bg-[#111827] min-h-screen flex flex-col sticky top-0 shrink-0 border-r border-slate-800">
      <div className="flex-1 py-8 px-4 space-y-2 flex flex-col items-start">
        <div className="px-4 mb-6">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Navigation</span>
        </div>
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-start gap-3 px-4 py-3 rounded-xl transition-colors font-semibold ${
                isActive
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/10'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="py-6 px-4 border-t border-slate-800 space-y-3">
        {email && (
          <div className="px-4 py-2 bg-slate-900/50 border border-slate-800 rounded-xl">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Signed in as</p>
            <p className="text-sm text-slate-200 font-bold truncate mt-0.5" title={displayName || email}>
              {displayName || email.split('@')[0]}
            </p>
            {displayName && <p className="text-xs text-slate-400 truncate mt-0.5" title={email}>{email}</p>}
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-start gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors font-semibold"
        >
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
