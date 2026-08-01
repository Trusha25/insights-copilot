import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function LoginView() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Password Strength State
  const [strength, setStrength] = useState({ score: 0, label: 'Very Weak', color: 'bg-red-500' });

  // Clear messages when toggling forms
  useEffect(() => {
    setMessage(null);
    setErrorMsg(null);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setShowPassword(false);
  }, [isSignUp]);

  // Calculate password strength
  useEffect(() => {
    if (!password) {
      setStrength({ score: 0, label: 'Very Weak', color: 'bg-red-500' });
      return;
    }

    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    let label = 'Very Weak';
    let color = 'bg-red-500';

    if (score >= 5) {
      label = 'Strong';
      color = 'bg-emerald-500';
    } else if (score >= 4) {
      label = 'Good';
      color = 'bg-teal-500';
    } else if (score >= 3) {
      label = 'Fair';
      color = 'bg-yellow-500';
    } else if (score >= 2) {
      label = 'Weak';
      color = 'bg-orange-500';
    }

    setStrength({ score, label, color });
  }, [password]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setLoading(true);
    setErrorMsg(null);
    setMessage(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) throw error;
      
    } catch (err) {
      setErrorMsg(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) return;

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    if (strength.score < 3) {
      setErrorMsg('Please choose a stronger password (must contain uppercase, lowercase, numbers, and special characters).');
      return;
    }

    if (!termsAccepted) {
      setErrorMsg('You must accept the Terms & Conditions.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setMessage(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;

      if (data?.user?.identities?.length === 0) {
        // Email is already registered
        setErrorMsg('Email address already registered. Please login instead.');
      } else {
        setMessage('🎉 Verification email sent! Please check your inbox.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGitHubLogin = async () => {
    setLoading(true);
    setErrorMsg(null);
    setMessage(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err) {
      setErrorMsg(err.message || 'GitHub login failed.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[var(--bg-primary)] flex items-center justify-center p-6 relative overflow-hidden font-sans select-none">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--color-accent)]/10 rounded-full blur-[100px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[var(--color-accent-hover)]/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--color-border)] rounded-3xl p-8 shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[var(--color-accent-bg)] text-[var(--color-accent)] rounded-2xl mb-4 border border-[var(--color-border-hover)]">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 009 11V7a3 3 0 116 0v4c0 1.542.42 2.97 1.135 4.197m0 0a13.916 13.916 0 013.44 2.04M12 11a14.28 14.28 0 003.44-2.04m-3.44 2.04c-.722 0-1.428-.15-2.073-.418m2.073.418c.718 0 1.41-.144 2.047-.406m0 0c.056-.023.111-.047.166-.072m0 0a13.916 13.916 0 003.44-2.04M12 14a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold theme-text-title tracking-tight">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="theme-text-muted mt-2 text-sm">
            {isSignUp ? 'Start analyzing startup ideas in seconds' : 'Sign in to access your Startup Insights Copilot'}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 rounded-2xl text-sm font-medium flex items-center gap-2">
            <svg className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-2xl text-sm font-medium flex items-center gap-2">
            <svg className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{message}</span>
          </div>
        )}

        {isSignUp ? (
          /* =========================================================================
             SIGN UP FORM
             ========================================================================= */
          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium theme-text-title mb-1.5">Full Name</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2.5 bg-[var(--bg-surface)] border border-[var(--color-border)] focus:border-[var(--color-border-hover)] focus:ring-2 focus:ring-[var(--color-accent)]/10 rounded-2xl theme-text-body outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium theme-text-title mb-1.5">Email Address</label>
              <input
                type="email"
                required
                className="w-full px-4 py-2.5 bg-[var(--bg-surface)] border border-[var(--color-border)] focus:border-[var(--color-border-hover)] focus:ring-2 focus:ring-[var(--color-accent)]/10 rounded-2xl theme-text-body outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-medium theme-text-title">Password</label>
                {password && (
                  <span className="text-xs font-semibold theme-text-muted">
                    Strength: <span className="text-[var(--color-accent)]">{strength.label}</span>
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="w-full px-4 py-2.5 bg-[var(--bg-surface)] border border-[var(--color-border)] focus:border-[var(--color-border-hover)] focus:ring-2 focus:ring-[var(--color-accent)]/10 rounded-2xl theme-text-body outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>

              {/* Password Strength Indicator Bar */}
              {password && (
                <div className="mt-2 space-y-1">
                  <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${strength.color}`}
                      style={{ width: `${(strength.score / 5) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-[11px] theme-text-muted">
                    Include: lowercase, uppercase, number, special char, & min 8 characters.
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium theme-text-title mb-1.5">Confirm Password</label>
              <input
                type="password"
                required
                className="w-full px-4 py-2.5 bg-[var(--bg-surface)] border border-[var(--color-border)] focus:border-[var(--color-border-hover)] focus:ring-2 focus:ring-[var(--color-accent)]/10 rounded-2xl theme-text-body outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="flex items-start gap-2.5 py-1">
              <input
                id="terms"
                type="checkbox"
                required
                className="mt-1 w-4 h-4 rounded border-[var(--color-border)] bg-[var(--bg-surface)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]/10 cursor-pointer"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                disabled={loading}
              />
              <label htmlFor="terms" className="text-xs theme-text-muted select-none cursor-pointer">
                I accept the{' '}
                <a href="#terms" className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] font-semibold underline">
                  Terms & Conditions
                </a>{' '}
                and Privacy Policy.
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !fullName || !email || !password || !confirmPassword || !termsAccepted}
              className="w-full py-3 theme-btn-primary rounded-2xl transition-colors flex items-center justify-center gap-2 text-sm mt-2 cursor-pointer disabled:opacity-50 hover:translate-y-0"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>
        ) : (
          /* =========================================================================
             LOGIN FORM
             ========================================================================= */
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium theme-text-title mb-1.5">Email Address</label>
              <input
                type="email"
                required
                className="w-full px-4 py-2.5 bg-[var(--bg-surface)] border border-[var(--color-border)] focus:border-[var(--color-border-hover)] focus:ring-2 focus:ring-[var(--color-accent)]/10 rounded-2xl theme-text-body outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-medium theme-text-title">Password</label>
                <a href="#forgot" className="text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] font-semibold transition-colors">
                  Forgot Password?
                </a>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="w-full px-4 py-2.5 bg-[var(--bg-surface)] border border-[var(--color-border)] focus:border-[var(--color-border-hover)] focus:ring-2 focus:ring-[var(--color-accent)]/10 rounded-2xl theme-text-body outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  id="remember"
                  type="checkbox"
                  className="w-4 h-4 rounded border-[var(--color-border)] bg-[var(--bg-surface)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]/10 cursor-pointer"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                />
                <label htmlFor="remember" className="text-xs theme-text-muted cursor-pointer select-none">
                  Remember me
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-3.5 theme-btn-primary rounded-2xl transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50 hover:translate-y-0"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        )}

        <div className="text-center mt-6">
          <p className="text-sm theme-text-muted">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              disabled={loading}
              className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] font-semibold transition-colors focus:outline-none cursor-pointer"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>

        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--color-border)]"></div>
          </div>
          <span className="relative px-4 bg-[var(--bg-card)] text-xs font-semibold theme-text-muted uppercase tracking-widest">
            Or continue with
          </span>
        </div>

        <button
          onClick={handleGitHubLogin}
          disabled={loading}
          className="w-full py-3.5 bg-[var(--bg-surface)] hover:bg-[var(--color-accent-bg)]/50 theme-text-title border border-[var(--color-border)] hover:border-[var(--color-border-hover)] font-semibold rounded-2xl transition-all flex items-center justify-center gap-3 text-sm cursor-pointer"
        >
          <svg className="w-6 h-6 text-slate-800 dark:text-white" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.479C19.138 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" clipRule="evenodd" />
          </svg>
          <span>GitHub</span>
        </button>
      </div>
    </div>
  );
}
