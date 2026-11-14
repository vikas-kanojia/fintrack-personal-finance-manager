import React, { useState } from 'react';
import { Check, Download, LogOut, Moon, Sun, Trash2 } from 'lucide-react';
import { useFinance } from '../store/financeStore';
import { exportTransactionsCSV } from '../utils/calculations';
import { roundCurrency } from '../utils/formatters';
import { ConfirmModal } from './ConfirmModal';

export const SettingsView: React.FC = () => {
  const {
    vault,
    updateProfile,
    updateSettings,
    updateOverallBudget,
    changePassword,
    exportAllDataJSON,
    deleteAllUserData,
    logout,
  } = useFinance();

  const [name, setName] = useState(vault.profile.name);
  const [email, setEmail] = useState(vault.profile.email);
  const [profileSaved, setProfileSaved] = useState(false);

  const [defaultBudget, setDefaultBudget] = useState(
    vault.settings.defaultMonthlyBudget > 0 ? String(vault.settings.defaultMonthlyBudget) : ''
  );
  const [savingsTarget, setSavingsTarget] = useState(
    vault.settings.monthlySavingsTarget > 0 ? String(vault.settings.monthlySavingsTarget) : ''
  );
  const [defaultsSaved, setDefaultsSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwFeedback, setPwFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    updateProfile({ name: name.trim(), email: email.trim() });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const handleSaveDefaults = (e: React.FormEvent) => {
    e.preventDefault();
    const budgetNum = Math.max(0, roundCurrency(Number(defaultBudget) || 0));
    const targetNum = Math.max(0, roundCurrency(Number(savingsTarget) || 0));
    updateSettings({
      defaultMonthlyBudget: budgetNum,
      monthlySavingsTarget: targetNum,
    });
    if (budgetNum > 0) {
      updateOverallBudget(budgetNum);
    }
    setDefaultsSaved(true);
    setTimeout(() => setDefaultsSaved(false), 2000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await changePassword({ currentPassword, newPassword });
    if (res.ok) {
      setCurrentPassword('');
      setNewPassword('');
      setPwFeedback({ ok: true, msg: 'Password updated successfully.' });
    } else {
      setPwFeedback({ ok: false, msg: res.error });
    }
  };

  const cardClass =
    'rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800/90 dark:bg-[#111A2E]';

  return (
    <div className="space-y-6">
      {/* Profile & Preferences */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className={cardClass}>
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Personal Profile
          </h2>
          <form onSubmit={handleSaveProfile} className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 dark:border-slate-800 dark:bg-[#0B1221]">
                <div className="text-slate-400">Currency</div>
                <div className="mt-0.5 font-semibold text-slate-800 dark:text-slate-200">
                  INR (₹) · Indian Formatting
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 dark:border-slate-800 dark:bg-[#0B1221]">
                <div className="text-slate-400">Date Format</div>
                <div className="font-mono-num mt-0.5 font-semibold text-slate-800 dark:text-slate-200">
                  DD/MM/YYYY
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
            >
              {profileSaved ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Profile Saved
                </>
              ) : (
                'Save Profile'
              )}
            </button>
          </form>
        </div>

        {/* Theme & Budget Defaults */}
        <div className={cardClass}>
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Appearance & Monthly Defaults
          </h2>

          <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-[#0B1221]">
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Interface Theme
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Default dark theme with light mode option
              </div>
            </div>
            <div className="inline-flex rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => updateSettings({ theme: 'dark' })}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
                  vault.settings.theme === 'dark'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <Moon className="h-3.5 w-3.5" />
                Dark
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ theme: 'light' })}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
                  vault.settings.theme === 'light'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <Sun className="h-3.5 w-3.5" />
                Light
              </button>
            </div>
          </div>

          <form onSubmit={handleSaveDefaults} className="mt-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Default Monthly Budget (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={defaultBudget}
                  onChange={(e) => setDefaultBudget(e.target.value)}
                  placeholder="25000"
                  className="font-mono-num w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Monthly Savings Target (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={savingsTarget}
                  onChange={(e) => setSavingsTarget(e.target.value)}
                  placeholder="15000"
                  className="font-mono-num w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
                />
              </div>
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
            >
              {defaultsSaved ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Defaults Updated
                </>
              ) : (
                'Save Budget Defaults'
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Notification Preferences & Security */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className={cardClass}>
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Notification Preferences
          </h2>
          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800/80">
            {[
              {
                key: 'notifyBudgetThresholds' as const,
                title: 'Budget Threshold Alerts',
                desc: 'Notify at 50%, 75%, 90%, and 100% budget usage without duplicates',
              },
              {
                key: 'notifyRecurringUpcoming' as const,
                title: 'Upcoming Recurring Bills',
                desc: 'Remind within 5 days before a scheduled payment due date',
              },
              {
                key: 'notifySavingsBelowTarget' as const,
                title: 'Savings Below Target',
                desc: 'Alert when monthly net savings fall below your target',
              },
              {
                key: 'notifyGoalCompleted' as const,
                title: 'Goal Completion',
                desc: 'Notify when a savings goal reaches 100%',
              },
            ].map((item) => (
              <label
                key={item.key}
                className="flex cursor-pointer items-center justify-between gap-4 py-3"
              >
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {item.title}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</div>
                </div>
                <input
                  type="checkbox"
                  checked={vault.settings[item.key]}
                  onChange={(e) => updateSettings({ [item.key]: e.target.checked })}
                  className="h-4 w-4 rounded accent-blue-600"
                />
              </label>
            ))}
          </div>
        </div>

        {/* Account Security & Password */}
        <div className={cardClass}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              Account Security
            </h2>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <LogOut className="h-3.5 w-3.5" />
              Log Out
            </button>
          </div>

          <form onSubmit={handleChangePassword} className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                New Password (6+ chars)
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
              />
            </div>
            {pwFeedback && (
              <p
                className={`text-xs font-medium ${
                  pwFeedback.ok ? 'text-emerald-500' : 'text-rose-500'
                }`}
              >
                {pwFeedback.msg}
              </p>
            )}
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
            >
              Change Password
            </button>
          </form>
        </div>
      </div>

      {/* Data Export & Danger Zone */}
      <div className={cardClass}>
        <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
          Data Management
        </h2>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={exportAllDataJSON}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Download className="h-4 w-4" />
              Export Full Backup (JSON)
            </button>
            <button
              type="button"
              disabled={vault.transactions.length === 0}
              onClick={() => exportTransactionsCSV(vault.transactions)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Download className="h-4 w-4" />
              Export Transactions (CSV)
            </button>
          </div>

          <button
            type="button"
            onClick={() => setDeleteConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-500/20 dark:text-rose-400"
          >
            <Trash2 className="h-4 w-4" />
            Delete Account & All Data
          </button>
        </div>
      </div>

      <ConfirmModal
        open={deleteConfirmOpen}
        title="Delete Account and All Financial Data"
        message="This will permanently erase your account and all saved transactions, budgets, goals, recurring payments, and alerts. This action cannot be undone."
        confirmLabel="Erase Everything"
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={() => {
          deleteAllUserData();
          setDeleteConfirmOpen(false);
        }}
      />
    </div>
  );
};
