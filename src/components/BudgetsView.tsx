import React, { useEffect, useMemo, useState } from 'react';
import { Check, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useFinance } from '../store/financeStore';
import { computeBudgetProgress } from '../utils/calculations';
import { formatINR, getFullMonthLabel, roundCurrency } from '../utils/formatters';

export const BudgetsView: React.FC = () => {
  const {
    vault,
    selectedMonth,
    allExpenseCategories,
    updateOverallBudget,
    setCategoryBudget,
    removeCategoryBudget,
    addCustomExpenseCategory,
  } = useFinance();

  const [overallInput, setOverallInput] = useState(
    vault.budgets.overallMonthlyBudget > 0 ? String(vault.budgets.overallMonthlyBudget) : ''
  );
  const [overallSaved, setOverallSaved] = useState(false);

  const [selectedCat, setSelectedCat] = useState(allExpenseCategories[0] || 'Food & Dining');
  const [catAmount, setCatAmount] = useState('');
  const [customCategoryName, setCustomCategoryName] = useState('');

  useEffect(() => {
    setOverallInput(
      vault.budgets.overallMonthlyBudget > 0 ? String(vault.budgets.overallMonthlyBudget) : ''
    );
  }, [vault.budgets.overallMonthlyBudget]);

  const progress = useMemo(
    () => computeBudgetProgress(vault.transactions, vault.budgets, selectedMonth),
    [vault.transactions, vault.budgets, selectedMonth]
  );

  const handleSaveOverall = (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = Math.max(0, roundCurrency(Number(overallInput) || 0));
    updateOverallBudget(numeric);
    setOverallSaved(true);
    setTimeout(() => setOverallSaved(false), 2000);
  };

  const handleSaveCategoryBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = roundCurrency(Number(catAmount) || 0);
    if (numeric <= 0) return;
    setCategoryBudget(selectedCat, numeric);
    setCatAmount('');
  };

  const handleAddCustomCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customCategoryName.trim();
    if (!trimmed) return;
    addCustomExpenseCategory(trimmed);
    setSelectedCat(trimmed);
    setCustomCategoryName('');
  };

  const statusMeta = (status: 'safe' | 'info' | 'warning' | 'high' | 'exceeded') => {
    if (status === 'exceeded') {
      return { bar: 'bg-rose-500', text: 'text-rose-500', label: 'Budget Exceeded (100%+)' };
    }
    if (status === 'high') {
      return { bar: 'bg-orange-500', text: 'text-orange-500', label: 'High Priority (90%+)' };
    }
    if (status === 'warning') {
      return { bar: 'bg-amber-500', text: 'text-amber-500', label: 'Warning (75%+)' };
    }
    if (status === 'info') {
      return { bar: 'bg-blue-500', text: 'text-blue-500', label: 'Notice (50%+)' };
    }
    return { bar: 'bg-emerald-500', text: 'text-emerald-500', label: 'On Track' };
  };

  const cardClass =
    'rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800/90 dark:bg-[#111A2E]';

  return (
    <div className="space-y-6">
      {/* Top Budget Configuration */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Overall Monthly Budget */}
        <div className={cardClass}>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4.5 w-4.5 text-blue-500" />
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              Overall Monthly Budget
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Total spending limit for {getFullMonthLabel(selectedMonth)}. Alerts trigger at 50%, 75%, 90%, and 100%.
          </p>

          <form onSubmit={handleSaveOverall} className="mt-4 flex gap-2.5">
            <input
              type="number"
              min="0"
              step="100"
              value={overallInput}
              onChange={(e) => setOverallInput(e.target.value)}
              placeholder="e.g. 25000"
              className="font-mono-num w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500 whitespace-nowrap shrink-0"
            >
              {overallSaved ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Saved
                </>
              ) : (
                'Update Limit'
              )}
            </button>
          </form>

          {progress.overall && (
            <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800/80">
              <div className="flex items-center justify-between text-xs">
                <span className={`font-semibold ${statusMeta(progress.overall.status).text}`}>
                  {statusMeta(progress.overall.status).label}
                </span>
                <span className="font-mono-num text-slate-600 dark:text-slate-300">
                  {progress.overall.percentUsed.toFixed(1)}% used
                </span>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    statusMeta(progress.overall.status).bar
                  }`}
                  style={{ width: `${Math.min(100, progress.overall.percentUsed)}%` }}
                />
              </div>
              <div className="mt-2.5 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-slate-400">Allocated</div>
                  <div className="font-mono-num font-semibold text-slate-900 dark:text-slate-100">
                    {formatINR(progress.overall.allocated)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Spent</div>
                  <div className="font-mono-num font-semibold text-rose-600 dark:text-rose-400">
                    {formatINR(progress.overall.spent)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Remaining</div>
                  <div
                    className={`font-mono-num font-semibold ${
                      progress.overall.remaining < 0
                        ? 'text-rose-500'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {formatINR(progress.overall.remaining)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Category Budget Setter + Custom Category */}
        <div className={cardClass}>
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Category Monthly Budgets
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Assign limits per spending category or create custom categories.
          </p>

          <form onSubmit={handleSaveCategoryBudget} className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-12">
            <select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 sm:col-span-5 dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
            >
              {allExpenseCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <input
              type="number"
              min="1"
              step="50"
              required
              value={catAmount}
              onChange={(e) => setCatAmount(e.target.value)}
              placeholder="Limit (₹)"
              className="font-mono-num rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 sm:col-span-4 dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
            />

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500 sm:col-span-3 whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              Set Limit
            </button>
          </form>

          <form
            onSubmit={handleAddCustomCategory}
            className="mt-4 flex gap-2 border-t border-slate-100 pt-4 dark:border-slate-800/80"
          >
            <input
              type="text"
              maxLength={40}
              value={customCategoryName}
              onChange={(e) => setCustomCategoryName(e.target.value)}
              placeholder="Add custom expense category..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
            />
            <button
              type="submit"
              className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              Add Category
            </button>
          </form>
        </div>
      </div>

      {/* Active Category Budgets Grid */}
      <div className={cardClass}>
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Category Budget Progress ({getFullMonthLabel(selectedMonth)})
          </h2>
          <span className="font-mono-num text-xs text-slate-500 dark:text-slate-400">
            {progress.categories.length} active category budget
            {progress.categories.length === 1 ? '' : 's'}
          </span>
        </div>

        {progress.categories.length > 0 ? (
          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
            {progress.categories.map((cat) => {
              const meta = statusMeta(cat.status);
              return (
                <div
                  key={cat.key}
                  className="border-t border-slate-100 pt-4 dark:border-slate-800/80"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {cat.label}
                      </div>
                      <div className={`mt-0.5 text-xs font-medium ${meta.text}`}>
                        {meta.label}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCategoryBudget(cat.key)}
                      aria-label={`Remove ${cat.label} budget`}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${meta.bar}`}
                      style={{ width: `${Math.min(100, cat.percentUsed)}%` }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono-num">
                      {formatINR(cat.spent)} / {formatINR(cat.allocated)} ({cat.percentUsed.toFixed(1)}%)
                    </span>
                    <span
                      className={`font-mono-num ${
                        cat.remaining < 0 ? 'font-semibold text-rose-500' : ''
                      }`}
                    >
                      {cat.remaining >= 0
                        ? `${formatINR(cat.remaining)} left`
                        : `Over ${formatINR(Math.abs(cat.remaining))}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
            No category budgets configured yet. Use the form above to set limits for Food & Dining, Groceries, Travel, or other categories.
          </div>
        )}
      </div>
    </div>
  );
};
