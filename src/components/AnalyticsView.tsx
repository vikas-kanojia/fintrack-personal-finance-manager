import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useFinance } from '../store/financeStore';
import {
  computeCategoryBreakdown,
  computeMonthlySeries,
  computePaymentMethodBreakdown,
} from '../utils/calculations';
import {
  addDaysISO,
  calcPercentChange,
  daysBetweenISO,
  formatDateDDMMYYYY,
  formatINR,
  getCurrentMonthKey,
  getMonthBounds,
  getMonthKey,
  getMonthLabel,
  getTodayISO,
  roundCurrency,
  shiftMonthKey,
} from '../utils/formatters';

type RangePreset =
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'last_3_months'
  | 'last_6_months'
  | 'this_year'
  | 'custom';

export const AnalyticsView: React.FC = () => {
  const { vault, selectedMonth } = useFinance();
  const isDark = vault.settings.theme === 'dark';

  const todayISO = getTodayISO();
  const currentMonth = getCurrentMonthKey();

  const [preset, setPreset] = useState<RangePreset>('this_month');
  const [customStart, setCustomStart] = useState(() => getMonthBounds(currentMonth).start);
  const [customEnd, setCustomEnd] = useState(() => todayISO);

  const rangeBounds = useMemo(() => {
    if (preset === 'this_week') {
      const [y, m, d] = todayISO.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      const dow = dt.getDay(); // 0=Sun
      const diffToMon = dow === 0 ? -6 : 1 - dow;
      return { start: addDaysISO(todayISO, diffToMon), end: todayISO, label: 'This Week' };
    }
    if (preset === 'this_month') {
      const b = getMonthBounds(selectedMonth);
      return { ...b, label: getMonthLabel(selectedMonth) };
    }
    if (preset === 'last_month') {
      const lm = shiftMonthKey(currentMonth, -1);
      const b = getMonthBounds(lm);
      return { ...b, label: getMonthLabel(lm) };
    }
    if (preset === 'last_3_months') {
      const startMonth = shiftMonthKey(currentMonth, -2);
      return {
        start: getMonthBounds(startMonth).start,
        end: getMonthBounds(currentMonth).end,
        label: 'Last 3 Months',
      };
    }
    if (preset === 'last_6_months') {
      const startMonth = shiftMonthKey(currentMonth, -5);
      return {
        start: getMonthBounds(startMonth).start,
        end: getMonthBounds(currentMonth).end,
        label: 'Last 6 Months',
      };
    }
    if (preset === 'this_year') {
      const year = currentMonth.slice(0, 4);
      return { start: `${year}-01-01`, end: `${year}-12-31`, label: `Year ${year}` };
    }
    const start = customStart <= customEnd ? customStart : customEnd;
    const end = customStart <= customEnd ? customEnd : customStart;
    return {
      start,
      end,
      label: `${formatDateDDMMYYYY(start)} – ${formatDateDDMMYYYY(end)}`,
    };
  }, [preset, todayISO, selectedMonth, currentMonth, customStart, customEnd]);

  const rangeTransactions = useMemo(
    () =>
      vault.transactions.filter(
        (tx) => tx.date >= rangeBounds.start && tx.date <= rangeBounds.end
      ),
    [vault.transactions, rangeBounds.start, rangeBounds.end]
  );

  const rangeIncome = useMemo(
    () =>
      roundCurrency(
        rangeTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
      ),
    [rangeTransactions]
  );

  const rangeExpenses = useMemo(
    () =>
      roundCurrency(
        rangeTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
      ),
    [rangeTransactions]
  );

  const daySpan = Math.max(1, daysBetweenISO(rangeBounds.start, rangeBounds.end) + 1);
  const avgDailyExpense = roundCurrency(rangeExpenses / daySpan);

  const distinctMonths = useMemo(() => {
    const months = new Set(rangeTransactions.map((t) => getMonthKey(t.date)));
    return Math.max(1, months.size);
  }, [rangeTransactions]);
  const avgMonthlyExpense = roundCurrency(rangeExpenses / distinctMonths);

  // Month-over-Month spending comparison
  const prevMonthKey = shiftMonthKey(selectedMonth, -1);
  const momCurrentSpend = useMemo(
    () =>
      roundCurrency(
        vault.transactions
          .filter((t) => t.type === 'expense' && getMonthKey(t.date) === selectedMonth)
          .reduce((s, t) => s + t.amount, 0)
      ),
    [vault.transactions, selectedMonth]
  );
  const momPrevSpend = useMemo(
    () =>
      roundCurrency(
        vault.transactions
          .filter((t) => t.type === 'expense' && getMonthKey(t.date) === prevMonthKey)
          .reduce((s, t) => s + t.amount, 0)
      ),
    [vault.transactions, prevMonthKey]
  );
  const momDelta = calcPercentChange(momCurrentSpend, momPrevSpend);

  const categoryBreakdown = useMemo(
    () => computeCategoryBreakdown(rangeTransactions, 'expense'),
    [rangeTransactions]
  );

  const paymentMethodBreakdown = useMemo(
    () => computePaymentMethodBreakdown(rangeTransactions, 'expense'),
    [rangeTransactions]
  );

  const monthlySeries = useMemo(
    () => computeMonthlySeries(vault.transactions, selectedMonth, 6),
    [vault.transactions, selectedMonth]
  );

  const dailySpendingSeries = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of rangeTransactions) {
      if (tx.type !== 'expense') continue;
      map.set(tx.date, roundCurrency((map.get(tx.date) ?? 0) + tx.amount));
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, amount]) => ({
        date: formatDateDDMMYYYY(date).slice(0, 5),
        fullDate: formatDateDDMMYYYY(date),
        amount,
      }));
  }, [rangeTransactions]);

  const gridStroke = isDark ? 'rgba(148,163,184,0.12)' : 'rgba(15,23,42,0.08)';
  const tickColor = isDark ? '#94A3B8' : '#64748B';
  const cardClass =
    'rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800/90 dark:bg-[#111A2E]';

  const presetButtons: { id: RangePreset; label: string }[] = [
    { id: 'this_week', label: 'This Week' },
    { id: 'this_month', label: 'This Month' },
    { id: 'last_month', label: 'Last Month' },
    { id: 'last_3_months', label: 'Last 3 Months' },
    { id: 'last_6_months', label: 'Last 6 Months' },
    { id: 'this_year', label: 'This Year' },
    { id: 'custom', label: 'Custom Range' },
  ];

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className={cardClass}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {presetButtons.map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setPreset(btn.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  preset === btn.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {preset === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 outline-none dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 outline-none dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
              />
            </div>
          )}
        </div>
      </div>

      {/* Analytics KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={cardClass}>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Period Spending ({rangeBounds.label})
          </div>
          <div className="font-mono-num mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
            {formatINR(rangeExpenses)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Income in period: {formatINR(rangeIncome)}
          </div>
        </div>

        <div className={cardClass}>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Average Daily Expense
          </div>
          <div className="font-mono-num mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {formatINR(avgDailyExpense)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Across {daySpan} day{daySpan === 1 ? '' : 's'}
          </div>
        </div>

        <div className={cardClass}>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Average Monthly Expense
          </div>
          <div className="font-mono-num mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {formatINR(avgMonthlyExpense)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Highest category: {categoryBreakdown[0]?.category ?? 'None'}
          </div>
        </div>

        <div className={cardClass}>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Month-over-Month Spending
          </div>
          <div className="font-mono-num mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {momDelta.label}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {formatINR(momCurrentSpend)} vs {formatINR(momPrevSpend)} ({getMonthLabel(prevMonthKey)})
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Monthly Income vs Expenses Bar Chart */}
        <div className={cardClass}>
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Monthly Income vs Expenses
          </h2>
          <div className="mt-4 h-64 w-full">
            {monthlySeries.some((p) => p.income > 0 || p.expenses > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlySeries} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: tickColor, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => formatINR(v, { compact: true })}
                  />
                  <Tooltip
                    formatter={(v: any) => formatINR(Number(v))}
                    contentStyle={{
                      backgroundColor: isDark ? '#0B1221' : '#FFFFFF',
                      borderColor: isDark ? '#334155' : '#E2E8F0',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="income" name="Income" fill="#10B981" radius={[5, 5, 0, 0]} maxBarSize={24} />
                  <Bar dataKey="expenses" name="Expenses" fill="#EF4444" radius={[5, 5, 0, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-500 dark:text-slate-400">
                No monthly comparison data yet.
              </div>
            )}
          </div>
        </div>

        {/* Daily Spending Trend */}
        <div className={cardClass}>
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Daily Spending Trend ({rangeBounds.label})
          </h2>
          <div className="mt-4 h-64 w-full">
            {dailySpendingSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailySpendingSeries} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: tickColor, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => formatINR(v, { compact: true })}
                  />
                  <Tooltip
                    formatter={(v: any) => formatINR(Number(v))}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate ?? ''}
                    contentStyle={{
                      backgroundColor: isDark ? '#0B1221' : '#FFFFFF',
                      borderColor: isDark ? '#334155' : '#E2E8F0',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    name="Daily Spend"
                    stroke="#8B5CF6"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#8B5CF6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-500 dark:text-slate-400">
                No daily expenses recorded in this timeframe.
              </div>
            )}
          </div>
        </div>

        {/* Category Pie Chart */}
        <div className={cardClass}>
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Expense Categories Share
          </h2>
          <div className="mt-4 h-64 w-full">
            {categoryBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    dataKey="amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={88}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {categoryBreakdown.map((item) => (
                      <Cell key={item.category} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: any) => formatINR(Number(v))}
                    contentStyle={{
                      backgroundColor: isDark ? '#0B1221' : '#FFFFFF',
                      borderColor: isDark ? '#334155' : '#E2E8F0',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-500 dark:text-slate-400">
                No expense categories for this period.
              </div>
            )}
          </div>
        </div>

        {/* Savings Trend Line Chart */}
        <div className={cardClass}>
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            6-Month Savings Trend
          </h2>
          <div className="mt-4 h-64 w-full">
            {monthlySeries.some((p) => p.income > 0 || p.expenses > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlySeries} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: tickColor, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => formatINR(v, { compact: true })}
                  />
                  <ReferenceLine y={0} stroke={gridStroke} />
                  <Tooltip
                    formatter={(v: any) => formatINR(Number(v))}
                    contentStyle={{
                      backgroundColor: isDark ? '#0B1221' : '#FFFFFF',
                      borderColor: isDark ? '#334155' : '#E2E8F0',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="savings"
                    name="Net Savings"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    dot={{ r: 3.5, fill: '#10B981' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-500 dark:text-slate-400">
                No savings history available.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Horizontal Category Bars & Payment Methods */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className={cardClass}>
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Highest Spending Categories
          </h2>
          {categoryBreakdown.length > 0 ? (
            <div className="mt-4 space-y-3.5">
              {categoryBreakdown.map((item) => (
                <div key={item.category}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {item.category}
                    </span>
                    <span className="font-mono-num text-slate-600 dark:text-slate-300">
                      {formatINR(item.amount)} ({item.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, item.percentage)}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
              No category spending recorded in this range.
            </p>
          )}
        </div>

        <div className={cardClass}>
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Spending by Payment Method
          </h2>
          {paymentMethodBreakdown.length > 0 ? (
            <div className="mt-4 space-y-3.5">
              {paymentMethodBreakdown.map((pm) => (
                <div key={pm.method}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {pm.method} ({pm.count} tx)
                    </span>
                    <span className="font-mono-num text-slate-600 dark:text-slate-300">
                      {formatINR(pm.amount)} ({pm.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${Math.min(100, pm.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
              No payment method data for this range.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
