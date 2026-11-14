import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Moon,
  ShieldCheck,
  Sun,
  UserPlus,
  Wallet,
} from 'lucide-react';
import { useFinance } from '../store/financeStore';

type AuthMode = 'login' | 'register' | 'recover';

function modeFromPath(pathname: string, hasAccounts: boolean): AuthMode {
  if (pathname === '/register' || pathname === '/signup') return 'register';
  if (pathname === '/recover' || pathname === '/forgot-password') return 'recover';
  if (pathname === '/login') return 'login';
  return hasAccounts ? 'login' : 'register';
}

export const AuthScreen: React.FC = () => {
  const {
    loginAccount,
    registerAccount,
    completeRegistration,
    recoverPassword,
    hasRegisteredAccounts,
    vault,
    toggleTheme,
  } = useFinance();

  const [mode, setMode] = useState<AuthMode>(() =>
    modeFromPath(window.location.pathname, hasRegisteredAccounts)
  );
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [pendingRegistration, setPendingRegistration] = useState<{
    userId: string;
    recoveryCode: string;
  } | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [savedConfirmed, setSavedConfirmed] = useState(false);

  const isDark = vault.settings.theme === 'dark';

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError(null);
    setInfoMsg(null);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    const targetPath =
      next === 'register' ? '/register' : next === 'recover' ? '/recover' : '/login';
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  };

  useEffect(() => {
    const initialPath =
      mode === 'register' ? '/register' : mode === 'recover' ? '/recover' : '/login';
    if (
      window.location.pathname !== '/login' &&
      window.location.pathname !== '/register' &&
      window.location.pathname !== '/recover'
    ) {
      window.history.replaceState(null, '', initialPath);
    }
    const onPopState = () => {
      setMode(modeFromPath(window.location.pathname, hasRegisteredAccounts));
      setError(null);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [hasRegisteredAccounts, mode]);

  const passwordStrength = useMemo(() => {
    if (!password) return { label: '', pct: 0, color: 'bg-slate-300' };
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 10) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;
    if (score <= 1) return { label: 'Weak', pct: 25, color: 'bg-rose-500' };
    if (score === 2) return { label: 'Fair', pct: 50, color: 'bg-amber-500' };
    if (score === 3) return { label: 'Good', pct: 75, color: 'bg-blue-500' };
    return { label: 'Strong', pct: 100, color: 'bg-emerald-500' };
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);

    if (mode === 'login') {
      setSubmitting(true);
      const res = await loginAccount({ email, password });
      setSubmitting(false);
      if (res.ok === false) setError(res.error);
      return;
    }

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      setSubmitting(true);
      const res = await registerAccount({ name, email, password });
      setSubmitting(false);
      if (res.ok === false) {
        setError(res.error);
      } else {
        setPendingRegistration({ userId: res.userId, recoveryCode: res.recoveryCode });
        setSavedConfirmed(false);
        setCodeCopied(false);
      }
      return;
    }

    if (password !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    setSubmitting(true);
    const res = await recoverPassword({
      email,
      recoveryCode,
      newPassword: password,
    });
    setSubmitting(false);
    if (res.ok === false) {
      setError(res.error);
    } else {
      switchMode('login');
      setInfoMsg('Password reset complete. Sign in with your new password.');
    }
  };

  const handleCopyCode = async () => {
    if (!pendingRegistration) return;
    try {
      await navigator.clipboard.writeText(pendingRegistration.recoveryCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      // Clipboard fallback ignored cleanly
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 dark:bg-[#080D1A] dark:text-slate-100">
      {/* Minimal Auth Top Header */}
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-5 backdrop-blur-md sm:px-8 dark:border-slate-800/90 dark:bg-[#0D1425]/80">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-blue-600 text-white">
            <Wallet className="h-4 w-4" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            FinTrack
          </span>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
      </header>

      {/* Main Centered Auth Grid */}
      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="grid w-full grid-cols-1 items-center gap-8 lg:grid-cols-12">
          {/* Left Context Panel */}
          <div className="hidden space-y-6 pr-4 lg:col-span-6 lg:block">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
              <span>Protected Personal Finance Workspace</span>
            </div>

            <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-slate-900 dark:text-white text-balance">
              Private money management built for daily clarity.
            </h1>

            <p className="max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Your income, expenses, budgets, savings goals, and financial reports are isolated to your authenticated account and stay locked whenever you sign out.
            </p>

            <div className="space-y-3 border-t border-slate-200 pt-5 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <span>INR (₹) Indian numbering & DD/MM/YYYY date precision</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <span>Threshold budget alerts at 50%, 75%, 90%, and 100%</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <span>Per-user isolated storage with password recovery code</span>
              </div>
            </div>
          </div>

          {/* Right Auth Card */}
          <div className="lg:col-span-6">
            <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-7 dark:border-slate-800 dark:bg-[#111A2E]">
              {pendingRegistration ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                      Account Created
                    </h2>
                  </div>

                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    Save your one-time recovery code below. You will need this code to reset your password if you ever lose access.
                  </p>

                  <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-[#0B1221]">
                    <span className="font-mono-num text-base font-bold tracking-wider text-slate-900 dark:text-white">
                      {pendingRegistration.recoveryCode}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      {codeCopied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>

                  <label className="flex cursor-pointer items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={savedConfirmed}
                      onChange={(e) => setSavedConfirmed(e.target.checked)}
                      className="h-4 w-4 rounded accent-blue-600"
                    />
                    <span>I have saved my recovery code in a secure place</span>
                  </label>

                  <button
                    type="button"
                    disabled={!savedConfirmed}
                    onClick={() => completeRegistration(pendingRegistration.userId)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span>Enter Protected Dashboard</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  {/* Mode Header */}
                  <div className="mb-5">
                    <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                      {mode === 'login'
                        ? 'Sign in to FinTrack'
                        : mode === 'register'
                        ? 'Create your FinTrack account'
                        : 'Reset your password'}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {mode === 'login'
                        ? 'Authenticate to unlock your private financial dashboard.'
                        : mode === 'register'
                        ? 'Set up a private account to track income, expenses, and budgets.'
                        : 'Verify your account email and recovery code to set a new password.'}
                    </p>
                  </div>

                  {/* Mode Switcher Tabs (Sign In / Sign Up) */}
                  {mode !== 'recover' && (
                    <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
                      <button
                        type="button"
                        onClick={() => switchMode('login')}
                        className={`rounded-lg py-2 text-xs font-semibold transition-colors ${
                          mode === 'login'
                            ? 'bg-white text-slate-900 shadow-xs dark:bg-[#111A2E] dark:text-white'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        Sign In
                      </button>
                      <button
                        type="button"
                        onClick={() => switchMode('register')}
                        className={`rounded-lg py-2 text-xs font-semibold transition-colors ${
                          mode === 'register'
                            ? 'bg-white text-slate-900 shadow-xs dark:bg-[#111A2E] dark:text-white'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        Sign Up
                      </button>
                    </div>
                  )}

                  {error && (
                    <div
                      role="alert"
                      className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs font-medium text-rose-600 dark:text-rose-400"
                    >
                      {error}
                    </div>
                  )}

                  {infoMsg && (
                    <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      {infoMsg}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                    {mode === 'register' && (
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                          Full Name
                        </label>
                        <input
                          type="text"
                          required
                          autoComplete="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Enter your full name"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
                        />
                      </div>
                    )}

                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
                      />
                    </div>

                    {mode === 'recover' && (
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                          Recovery Code
                        </label>
                        <input
                          type="text"
                          required
                          value={recoveryCode}
                          onChange={(e) => setRecoveryCode(e.target.value)}
                          placeholder="FT-XXXX-XXXX"
                          className="font-mono-num w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm uppercase text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
                        />
                      </div>
                    )}

                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                          {mode === 'recover' ? 'New Password (min 6 chars)' : 'Password'}
                        </label>
                        {mode === 'login' && (
                          <button
                            type="button"
                            onClick={() => switchMode('recover')}
                            className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                          >
                            Forgot password?
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          autoComplete={
                            mode === 'login' ? 'current-password' : 'new-password'
                          }
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-3.5 pr-10 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((s) => !s)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>

                      {mode !== 'login' && password.length > 0 && (
                        <div className="mt-2">
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                            <div
                              className={`h-full transition-all duration-200 ${passwordStrength.color}`}
                              style={{ width: `${passwordStrength.pct}%` }}
                            />
                          </div>
                          <div className="mt-1 text-right text-[11px] text-slate-500 dark:text-slate-400">
                            Strength: {passwordStrength.label}
                          </div>
                        </div>
                      )}
                    </div>

                    {mode !== 'login' && (
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                          Confirm Password
                        </label>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter password"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-60"
                    >
                      {mode === 'login' && <Lock className="h-4 w-4" />}
                      {mode === 'register' && <UserPlus className="h-4 w-4" />}
                      {mode === 'recover' && <KeyRound className="h-4 w-4" />}
                      <span>
                        {mode === 'login'
                          ? 'Sign In to Dashboard'
                          : mode === 'register'
                          ? 'Create Account'
                          : 'Reset Password'}
                      </span>
                    </button>
                  </form>

                  {mode === 'recover' && (
                    <div className="mt-5 border-t border-slate-100 pt-4 text-center dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => switchMode('login')}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Back to Sign In
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
