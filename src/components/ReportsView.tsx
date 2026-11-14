import React, { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { useFinance } from '../store/financeStore';
import {
  computeBudgetProgress,
  computeCategoryBreakdown,
  downloadFinancialReportPDF,
  exportTransactionsCSV,
} from '../utils/calculations';
import {
  formatINR,
  getCurrentMonthKey,
  getFullMonthLabel,
  getMonthKey,
  getMonthLabel,
  roundCurrency,
} from '../utils/formatters';

export const ReportsView: React.FC = () => {
  const { vault, selectedMonth } = useFinance();

  const [reportScope, setReportScope] = useState<'monthly' | 'yearly'>('monthly');
  const [reportMonth, setReportMonth] = useState(selectedMonth);
  const [compareMonth, setCompareMonth] = useState(() => getCurrentMonthKey());
  const [reportYear, setReportYear] = useState(() => selectedMonth.slice(0, 4));

  const availableYears = useMemo(() => {
    const years = new Set<string>([selectedMonth.slice(0, 4), getCurrentMonthKey().slice(0, 4)]);
    for (const tx of vault.transactions) {
      years.add(tx.date.slice(0, 4));
    }
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [vault.transactions, selectedMonth]);

  const scopedTransactions = useMemo(
    () =>
      vault.transactions.filter((tx) =>
        reportScope === 'monthly'
          ? getMonthKey(tx.date) === reportMonth
          : tx.date.startsWith(`${reportYear}-`)
      ),
    [vault.transactions, reportScope, reportMonth, reportYear]
  );

  const summary = useMemo(() => {
    let income = 0;
    let expenses = 0;
    for (const tx of scopedTransactions) {
      if (tx.type === 'income') income += tx.amount;
      else expenses += tx.amount;
    }
    income = roundCurrency(income);
    expenses = roundCurrency(expenses);
    const netSavings = roundCurrency(income - expenses);
    const savingsRate = income > 0 ? Math.round((netSavings / income) * 1000) / 10 : 0;
    return { income, expenses, netSavings, savingsRate };
  }, [scopedTransactions]);

  const categories = useMemo(
    () => computeCategoryBreakdown(scopedTransactions, 'expense'),
    [scopedTransactions]
  );

  const budgetPerformance = useMemo(() => {
    if (reportScope !== 'monthly') return [];
    const bp = computeBudgetProgress(vault.transactions, vault.budgets, reportMonth);
    return bp.overall ? [bp.overall, ...bp.categories] : bp.categories;
  }, [reportScope, vault.transactions, vault.budgets, reportMonth]);

  // Month Comparison
  const compareSummary = useMemo(() => {
    const calcFor = (mk: string) => {
      let inc = 0;
      let exp = 0;
      for (const tx of vault.transactions) {
        if (getMonthKey(tx.date) !== mk) continue;
        if (tx.type === 'income') inc += tx.amount;
        else exp += tx.amount;
      }
      inc = roundCurrency(inc);
      exp = roundCurrency(exp);
      const sav = roundCurrency(inc - exp);
      const rate = inc > 0 ? Math.round((sav / inc) * 1000) / 10 : 0;
      return { inc, exp, sav, rate };
    };
    return {
      primary: calcFor(reportMonth),
      secondary: calcFor(compareMonth),
    };
  }, [vault.transactions, reportMonth, compareMonth]);

  const periodTitle =
    reportScope === 'monthly' ? getFullMonthLabel(reportMonth) : `Annual ${reportYear}`;

  const handleDownloadPDF = () => {
    downloadFinancialReportPDF({
      periodTitle,
      totalIncome: summary.income,
      totalExpenses: summary.expenses,
      netSavings: summary.netSavings,
      savingsRate: summary.savingsRate,
      categories,
      budgetItems: budgetPerformance,
      transactions: scopedTransactions,
    });
  };

  const cardClass =
    'rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800/90 dark:bg-[#111A2E]';

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className={`${cardClass} flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setReportScope('monthly')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
                reportScope === 'monthly'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-[#111A2E] dark:text-white'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Monthly Report
            </button>
            <button
              type="button"
              onClick={() => setReportScope('yearly')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
                reportScope === 'yearly'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-[#111A2E] dark:text-white'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Yearly Report
            </button>
          </div>

          {reportScope === 'monthly' ? (
            <input
              type="month"
              value={reportMonth}
              onChange={(e) => e.target.value && setReportMonth(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-900 outline-none dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
            />
          ) : (
            <select
              value={reportYear}
              onChange={(e) => setReportYear(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-900 outline-none dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={scopedTransactions.length === 0}
            onClick={() =>
              exportTransactionsCSV(
                scopedTransactions,
                `fintrack-${periodTitle.toLowerCase().replace(/\s+/g, '-')}.csv`
              )
            }
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export CSV
          </button>

          <button
            type="button"
            onClick={handleDownloadPDF}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500 whitespace-nowrap"
          >
            <Download className="h-4 w-4" />
            Download PDF Summary
          </button>
        </div>
      </div>

      {/* Summary Figures */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={cardClass}>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Income ({periodTitle})
          </div>
          <div className="font-mono-num mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatINR(summary.income)}
          </div>
        </div>
        <div className={cardClass}>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Expenses ({periodTitle})
          </div>
          <div className="font-mono-num mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
            {formatINR(summary.expenses)}
          </div>
        </div>
        <div className={cardClass}>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Net Savings
          </div>
          <div
            className={`font-mono-num mt-2 text-2xl font-bold ${
              summary.netSavings < 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {formatINR(summary.netSavings)}
          </div>
        </div>
        <div className={cardClass}>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Savings Percentage
          </div>
          <div className="font-mono-num mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {summary.savingsRate.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Category & Budget Performance */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className={cardClass}>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-500" />
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              Category Spending Report
            </h2>
          </div>

          {categories.length > 0 ? (
            <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800/80">
              {categories.map((cat) => (
                <div key={cat.category} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {cat.category}
                    </span>
                    <span className="ml-2 text-xs text-slate-400">
                      {cat.count} tx
                    </span>
                  </div>
                  <div className="font-mono-num text-right">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {formatINR(cat.amount)}
                    </span>
                    <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                      {cat.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
              No expense records in {periodTitle}.
            </p>
          )}
        </div>

        {/* Month-over-Month Comparison */}
        <div className={cardClass}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              Compare Two Months
            </h2>
            <input
              type="month"
              value={compareMonth}
              onChange={(e) => e.target.value && setCompareMonth(e.target.value)}
              aria-label="Comparison month"
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-900 outline-none dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
            />
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="pb-2.5">Metric</th>
                  <th className="pb-2.5 text-right">{getMonthLabel(reportMonth)}</th>
                  <th className="pb-2.5 text-right">{getMonthLabel(compareMonth)}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                <tr>
                  <td className="py-3 text-slate-700 dark:text-slate-300">Income</td>
                  <td className="font-mono-num py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatINR(compareSummary.primary.inc)}
                  </td>
                  <td className="font-mono-num py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatINR(compareSummary.secondary.inc)}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 text-slate-700 dark:text-slate-300">Expenses</td>
                  <td className="font-mono-num py-3 text-right font-semibold text-rose-600 dark:text-rose-400">
                    {formatINR(compareSummary.primary.exp)}
                  </td>
                  <td className="font-mono-num py-3 text-right font-semibold text-rose-600 dark:text-rose-400">
                    {formatINR(compareSummary.secondary.exp)}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 text-slate-700 dark:text-slate-300">Net Savings</td>
                  <td className="font-mono-num py-3 text-right font-semibold text-slate-900 dark:text-white">
                    {formatINR(compareSummary.primary.sav)}
                  </td>
                  <td className="font-mono-num py-3 text-right font-semibold text-slate-900 dark:text-white">
                    {formatINR(compareSummary.secondary.sav)}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 text-slate-700 dark:text-slate-300">Savings Rate</td>
                  <td className="font-mono-num py-3 text-right font-semibold text-slate-900 dark:text-white">
                    {compareSummary.primary.rate.toFixed(1)}%
                  </td>
                  <td className="font-mono-num py-3 text-right font-semibold text-slate-900 dark:text-white">
                    {compareSummary.secondary.rate.toFixed(1)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Budget Performance Table (Monthly) */}
      {reportScope === 'monthly' && budgetPerformance.length > 0 && (
        <div className={cardClass}>
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Budget Performance ({periodTitle})
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="pb-2.5">Budget</th>
                  <th className="pb-2.5 text-right">Allocated</th>
                  <th className="pb-2.5 text-right">Spent</th>
                  <th className="pb-2.5 text-right">Remaining</th>
                  <th className="pb-2.5 text-right">Used</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {budgetPerformance.map((b) => (
                  <tr key={b.key}>
                    <td className="py-2.5 font-medium text-slate-800 dark:text-slate-200">
                      {b.label}
                    </td>
                    <td className="font-mono-num py-2.5 text-right text-slate-700 dark:text-slate-300">
                      {formatINR(b.allocated)}
                    </td>
                    <td className="font-mono-num py-2.5 text-right text-rose-600 dark:text-rose-400">
                      {formatINR(b.spent)}
                    </td>
                    <td
                      className={`font-mono-num py-2.5 text-right font-medium ${
                        b.remaining < 0
                          ? 'text-rose-500'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {formatINR(b.remaining)}
                    </td>
                    <td className="font-mono-num py-2.5 text-right text-slate-700 dark:text-slate-300">
                      {b.percentUsed.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
