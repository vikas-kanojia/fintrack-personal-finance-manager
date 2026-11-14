import React, { useEffect, useMemo, useState } from 'react';
import { Check, Percent, PiggyBank, Target, TrendingUp } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useFinance } from '../store/financeStore';
import { computeDashboardMetrics, computeMonthlySeries } from '../utils/calculations';
import { formatINR, getFullMonthLabel, getMonthLabel, roundCurrency } from '../utils/formatters';

export const SavingsView: React.FC = () => {
  const { vault, selectedMonth, updateSettings } = useFinance();
  const isDark = vault.settings.theme === 'dark';

  const [targetInput, setTargetInput] = useState(
    vault.settings.monthlySavingsTarget > 0 ? String(vault.settings.monthlySavingsTarget) : ''
  );
  const [savedFeedback, setSavedFeedback] = useState(false);

  useEffect(() => {
    setTargetInput(
      vault.settings.monthlySavingsTarget > 0 ? String(vault.settings.monthlySavingsTarget) : ''
    );
  }, [vault.settings.monthlySavingsTarget]);

  const metrics = useMemo(
    () => computeDashboardMetrics(vault.transactions, vault.budgets, selectedMonth),
    [vault.transactions, vault.budgets, selectedMonth]
  );

  const selectedYear = selectedMonth.slice(0, 4);
  const ytdSavings = useMemo(() => {
    let income = 0;
    let expenses = 0;
    for (const tx of vault.transactions) {
      if (tx.date.startsWith(`${selectedYear}-`) && tx.date.slice(0, 7) <= selectedMonth) {
        if (tx.type === 'income') income += tx.amount;
        else expenses += tx.amount;
      }
    }
    return roundCurrency(income - expenses);
  }, [vault.transactions, selectedYear, selectedMonth]);

  const savingsSeries = useMemo(
    () => computeMonthlySeries(vault.transactions, selectedMonth, 12),
    [vault.transactions, selectedMonth]
  );

  const monthlyTarget = vault.settings.monthlySavingsTarget;
  const targetCompletionPct =
    monthlyTarget > 0
      ? Math.max(0, Math.min(100, Math.round((metrics.monthlySavings / monthlyTarget) * 1000) / 10))
      : 0;

  const handleSaveTarget = (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = Math.max(0, roundCurrency(Number(targetInput) || 0));
    updateSettings({ monthlySavingsTarget: numeric });
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  const cardClass =
    'rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800/90 dark:bg-[#111A2E]';

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {getMonthLabel(selectedMonth)} Savings
            </span>
            <PiggyBank className="h-4 w-4 text-emerald-500" />
          </div>
          <div
            className={`font-mono-num mt-2 text-2xl font-bold ${
              metrics.monthlySavings < 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {formatINR(metrics.monthlySavings)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Income ({formatINR(metrics.currentIncome)}) − Expenses ({formatINR(metrics.currentExpenses)})
          </div>
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Savings Rate
            </span>
            <Percent className="h-4 w-4 text-blue-500" />
          </div>
          <div className="font-mono-num mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {metrics.savingsRate.toFixed(1)}%
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {metrics.currentIncome > 0
              ? 'Of total monthly income saved'
              : 'Zero income recorded this month'}
          </div>
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Previous Month Savings
            </span>
            <TrendingUp className="h-4 w-4 text-indigo-500" />
          </div>
          <div
            className={`font-mono-num mt-2 text-2xl font-bold ${
              metrics.prevMonthlySavings < 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-slate-900 dark:text-white'
            }`}
          >
            {formatINR(metrics.prevMonthlySavings)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Rate: {metrics.prevSavingsRate.toFixed(1)}%
          </div>
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Year-to-Date ({selectedYear})
            </span>
            <Target className="h-4 w-4 text-emerald-500" />
          </div>
          <div
            className={`font-mono-num mt-2 text-2xl font-bold ${
              ytdSavings < 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {formatINR(ytdSavings)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Net savings through {getMonthLabel(selectedMonth)}
          </div>
        </div>
      </div>

      {/* Monthly Savings Target */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className={`${cardClass} lg:col-span-5`}>
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Monthly Savings Target
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Set how much you aim to save in {getFullMonthLabel(selectedMonth)}.
          </p>

          <form onSubmit={handleSaveTarget} className="mt-4 flex gap-2.5">
            <input
              type="number"
              min="0"
              step="100"
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              placeholder="e.g. 15000"
              className="font-mono-num w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500 whitespace-nowrap shrink-0"
            >
              {savedFeedback ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Saved
                </>
              ) : (
                'Save Goal'
              )}
            </button>
          </form>

          {monthlyTarget > 0 ? (
            <div className="mt-6">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Target Completion
                </span>
                <span className="font-mono-num font-semibold text-emerald-600 dark:text-emerald-400">
                  {targetCompletionPct.toFixed(1)}%
                </span>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    metrics.monthlySavings >= monthlyTarget
                      ? 'bg-emerald-500'
                      : metrics.monthlySavings > 0
                      ? 'bg-blue-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${targetCompletionPct}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="font-mono-num">Saved: {formatINR(metrics.monthlySavings)}</span>
                <span className="font-mono-num">Target: {formatINR(monthlyTarget)}</span>
              </div>
            </div>
          ) : (
            <p className="mt-5 text-xs text-slate-500 dark:text-slate-400">
              Enter a monthly savings target above to track target completion and receive alerts when savings fall behind.
            </p>
          )}
        </div>

        {/* 12-Month Savings Growth Chart */}
        <div className={`${cardClass} lg:col-span-7`}>
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            12-Month Savings Growth
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Net monthly savings computed from recorded income and expenses
          </p>

          <div className="mt-5 h-64 w-full">
            {savingsSeries.some((s) => s.income > 0 || s.expenses > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={savingsSeries} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="savingsGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.32} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? 'rgba(148,163,184,0.12)' : 'rgba(15,23,42,0.08)'}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => formatINR(v, { compact: true })}
                  />
                  <ReferenceLine
                    y={0}
                    stroke={isDark ? 'rgba(148,163,184,0.2)' : 'rgba(15,23,42,0.15)'}
                  />
                  <Tooltip
                    formatter={(value: any) => formatINR(Number(value))}
                    contentStyle={{
                      backgroundColor: isDark ? '#0B1221' : '#FFFFFF',
                      borderColor: isDark ? '#334155' : '#E2E8F0',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="savings"
                    name="Monthly Savings"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    fill="url(#savingsGrowthGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-500 dark:text-slate-400">
                Add income and expense entries to visualize your 12-month savings trajectory.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
