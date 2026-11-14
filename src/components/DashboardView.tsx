import React, { useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
  Minus,
  Percent,
  PiggyBank,
  Plus,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TransactionType } from '../types/finance';
import { useFinance } from '../store/financeStore';
import {
  computeBudgetProgress,
  computeCategoryBreakdown,
  computeDashboardMetrics,
  computeMonthlyRecurringTotal,
  computeMonthlySeries,
} from '../utils/calculations';
import {
  daysBetweenISO,
  formatDateDDMMYYYY,
  formatINR,
  getFullMonthLabel,
  getMonthKey,
  getMonthLabel,
  getTodayISO,
  shiftMonthKey,
} from '../utils/formatters';

interface DashboardViewProps {
  onOpenTransactionModal: (type: TransactionType) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onOpenTransactionModal }) => {
  const {
    vault,
    selectedMonth,
    setSelectedMonth,
    setActiveTab,
    markNotificationRead,
  } = useFinance();

  const isDark = vault.settings.theme === 'dark';

  const metrics = useMemo(
    () => computeDashboardMetrics(vault.transactions, vault.budgets, selectedMonth),
    [vault.transactions, vault.budgets, selectedMonth]
  );

  const monthlySeries = useMemo(
    () => computeMonthlySeries(vault.transactions, selectedMonth, 6),
    [vault.transactions, selectedMonth]
  );

  const selectedMonthTransactions = useMemo(
    () => vault.transactions.filter((t) => getMonthKey(t.date) === selectedMonth),
    [vault.transactions, selectedMonth]
  );

  const expenseBreakdown = useMemo(
    () => computeCategoryBreakdown(selectedMonthTransactions, 'expense'),
    [selectedMonthTransactions]
  );

  const budgetProgress = useMemo(
    () => computeBudgetProgress(vault.transactions, vault.budgets, selectedMonth),
    [vault.transactions, vault.budgets, selectedMonth]
  );

  const recentTransactions = useMemo(
    () => vault.transactions.slice(0, 6),
    [vault.transactions]
  );

  const upcomingRecurring = useMemo(
    () =>
      vault.recurring
        .filter((r) => r.active)
        .sort((a, b) => a.nextPaymentDate.localeCompare(b.nextPaymentDate))
        .slice(0, 4),
    [vault.recurring]
  );

  const monthlyRecurringEstimate = useMemo(
    () => computeMonthlyRecurringTotal(vault.recurring),
    [vault.recurring]
  );

  const activeAlerts = useMemo(
    () => vault.notifications.filter((n) => !n.read).slice(0, 4),
    [vault.notifications]
  );

  const hasAnyMonthlyChartData = monthlySeries.some((p) => p.income > 0 || p.expenses > 0);
  const gridStroke = isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(15, 23, 42, 0.08)';
  const axisTickColor = isDark ? '#94A3B8' : '#64748B';
  const prevMonthLabel = getMonthLabel(shiftMonthKey(selectedMonth, -1));
  const todayISO = getTodayISO();

  const renderTrendDelta = (
    direction: 'up' | 'down' | 'flat',
    label: string,
    invertSentiment = false
  ) => {
    const isPositiveSentiment = invertSentiment ? direction === 'down' : direction === 'up';
    const isNegativeSentiment = invertSentiment ? direction === 'up' : direction === 'down';

    const colorClass =
      direction === 'flat'
        ? 'text-slate-500 dark:text-slate-400'
        : isPositiveSentiment
        ? 'text-emerald-600 dark:text-emerald-400'
        : isNegativeSentiment
        ? 'text-rose-600 dark:text-rose-400'
        : 'text-slate-500';

    const Icon =
      direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus;

    return (
      <span className={`font-mono-num inline-flex items-center gap-1 text-xs font-semibold ${colorClass}`}>
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span>{label}</span>
      </span>
    );
  };

  const cardSurface =
    'rounded-2xl border border-slate-200 bg-white p-5 transition-colors duration-150 dark:border-slate-800/90 dark:bg-[#111A2E]';

  const summaryCards = [
    {
      id: 'balance',
      title: 'Total Balance',
      value: formatINR(metrics.totalBalance),
      valueColor:
        metrics.totalBalance < 0
          ? 'text-rose-600 dark:text-rose-400'
          : 'text-slate-900 dark:text-white',
      comparison: `vs ${formatINR(metrics.prevMonthEndBalance)} (${prevMonthLabel})`,
      delta: renderTrendDelta(metrics.balanceChange.direction, metrics.balanceChange.label),
      icon: Wallet,
      iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },
    {
      id: 'income',
      title: 'Total Income',
      value: formatINR(metrics.currentIncome),
      valueColor: 'text-emerald-600 dark:text-emerald-400',
      comparison: `vs ${formatINR(metrics.prevIncome)} in ${prevMonthLabel}`,
      delta: renderTrendDelta(metrics.incomeChange.direction, metrics.incomeChange.label),
      icon: ArrowDownLeft,
      iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
    {
      id: 'expenses',
      title: 'Total Expenses',
      value: formatINR(metrics.currentExpenses),
      valueColor: 'text-rose-600 dark:text-rose-400',
      comparison: `vs ${formatINR(metrics.prevExpenses)} in ${prevMonthLabel}`,
      delta: renderTrendDelta(metrics.expensesChange.direction, metrics.expensesChange.label, true),
      icon: ArrowUpRight,
      iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    },
    {
      id: 'savings',
      title: 'Monthly Savings',
      value: formatINR(metrics.monthlySavings),
      valueColor:
        metrics.monthlySavings < 0
          ? 'text-rose-600 dark:text-rose-400'
          : 'text-emerald-600 dark:text-emerald-400',
      comparison: `vs ${formatINR(metrics.prevMonthlySavings)} in ${prevMonthLabel}`,
      delta: renderTrendDelta(metrics.savingsChange.direction, metrics.savingsChange.label),
      icon: PiggyBank,
      iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
    {
      id: 'savings-rate',
      title: 'Savings Rate',
      value: `${metrics.savingsRate.toFixed(1)}%`,
      valueColor:
        metrics.savingsRate < 0
          ? 'text-rose-600 dark:text-rose-400'
          : 'text-slate-900 dark:text-white',
      comparison: `vs ${metrics.prevSavingsRate.toFixed(1)}% in ${prevMonthLabel}`,
      delta: renderTrendDelta(
        metrics.savingsRateDiffPts > 0
          ? 'up'
          : metrics.savingsRateDiffPts < 0
          ? 'down'
          : 'flat',
        `${metrics.savingsRateDiffPts > 0 ? '+' : ''}${metrics.savingsRateDiffPts.toFixed(1)}%`
      ),
      icon: Percent,
      iconBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    },
    {
      id: 'remaining-budget',
      title: 'Remaining Monthly Budget',
      value:
        metrics.overallBudget > 0 ? formatINR(metrics.remainingBudget) : 'Not Set',
      valueColor:
        metrics.overallBudget === 0
          ? 'text-slate-500 dark:text-slate-400'
          : metrics.remainingBudget < 0
          ? 'text-rose-600 dark:text-rose-400'
          : 'text-slate-900 dark:text-white',
      comparison:
        metrics.overallBudget > 0
          ? `of ${formatINR(metrics.overallBudget)} · vs ${formatINR(metrics.prevRemainingBudget)} (${prevMonthLabel})`
          : 'Set a monthly budget to track usage',
      delta:
        metrics.overallBudget > 0
          ? renderTrendDelta(
              metrics.remainingBudgetChange.direction,
              metrics.remainingBudgetChange.label
            )
          : (
              <button
                type="button"
                onClick={() => setActiveTab('budgets')}
                className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
              >
                Set Budget
              </button>
            ),
      icon: ShieldCheck,
      iconBg:
        metrics.overallBudget > 0 && metrics.remainingBudget < 0
          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
          : 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    },
  ];

  const renderChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs shadow-lg dark:border-slate-700 dark:bg-[#0B1221]">
        <div className="mb-1.5 font-semibold text-slate-900 dark:text-slate-100">{label}</div>
        <div className="space-y-1">
          {payload.map((entry: any) => (
            <div key={entry.dataKey} className="flex items-center justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400">{entry.name}</span>
              <span className="font-mono-num font-semibold" style={{ color: entry.color }}>
                {formatINR(Number(entry.value))}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Sub-header & Mobile Month Switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Showing financial summary for{' '}
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {getFullMonthLabel(selectedMonth)}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 sm:hidden">
          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-0.5 dark:border-slate-800 dark:bg-[#111A2E]">
            <button
              type="button"
              onClick={() => setSelectedMonth(shiftMonthKey(selectedMonth, -1))}
              aria-label="Previous month"
              className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[84px] px-2 text-center text-xs font-semibold text-slate-800 dark:text-slate-200">
              {getMonthLabel(selectedMonth)}
            </span>
            <button
              type="button"
              onClick={() => setSelectedMonth(shiftMonthKey(selectedMonth, 1))}
              aria-label="Next month"
              className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => onOpenTransactionModal('income')}
            className="inline-flex items-center gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            Income
          </button>
        </div>
      </div>

      {/* Empty Account Onboarding Strip (only when no transactions exist) */}
      {vault.transactions.length === 0 && (
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-blue-500/25 bg-blue-500/5 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              Your FinTrack ledger is ready
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Record your first income, log an expense, or set a monthly budget to see live calculations and trends.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onOpenTransactionModal('income')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              Add First Income
            </button>
            <button
              type="button"
              onClick={() => onOpenTransactionModal('expense')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-[#111A2E] dark:text-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              Log Expense
            </button>
          </div>
        </div>
      )}

      {/* 6 Financial Summary Cards */}
      <section aria-label="Financial summary cards">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                className={`${cardSurface} hover:border-slate-300 dark:hover:border-slate-700`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    {card.title}
                  </span>
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${card.iconBg}`}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                </div>

                <div className={`font-mono-num mt-3 text-2xl font-bold tracking-tight sm:text-[28px] ${card.valueColor}`}>
                  {card.value}
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800/80">
                  <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {card.comparison}
                  </span>
                  <div className="shrink-0">{card.delta}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Active Budget & Financial Alerts Banner */}
      {activeAlerts.length > 0 && (
        <section aria-label="Active budget and financial alerts" className={cardSurface}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Bell className="h-4.5 w-4.5 text-amber-500" />
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                Budget Warnings & Alerts
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('notifications')}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400 whitespace-nowrap"
            >
              View all notifications
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800/80">
            {activeAlerts.map((alert) => {
              const Icon =
                alert.severity === 'critical'
                  ? AlertCircle
                  : alert.severity === 'high' || alert.severity === 'warning'
                  ? AlertTriangle
                  : alert.severity === 'success'
                  ? CheckCircle2
                  : Info;
              const iconColor =
                alert.severity === 'critical'
                  ? 'text-rose-500'
                  : alert.severity === 'high'
                  ? 'text-orange-500'
                  : alert.severity === 'warning'
                  ? 'text-amber-500'
                  : alert.severity === 'success'
                  ? 'text-emerald-500'
                  : 'text-blue-500';
              return (
                <div
                  key={alert.id}
                  className="flex flex-col justify-between gap-2 py-3 sm:flex-row sm:items-center"
                >
                  <div className="flex items-start gap-2.5">
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`} />
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {alert.title}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {alert.message}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => markNotificationRead(alert.id)}
                    className="self-start sm:self-center whitespace-nowrap shrink-0 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Mark read
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Charts Row: Income vs Expenses + Monthly Savings Trend */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className={cardSurface}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                Income vs Expenses
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                6-month cash flow comparison ending {getMonthLabel(selectedMonth)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400 whitespace-nowrap"
            >
              Deep Analytics
            </button>
          </div>

          <div className="mt-5 h-64 w-full">
            {hasAnyMonthlyChartData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlySeries} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: axisTickColor, fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: axisTickColor, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => formatINR(v, { compact: true })}
                  />
                  <Tooltip content={renderChartTooltip} />
                  <Bar dataKey="income" name="Income" fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="expenses" name="Expenses" fill="#EF4444" radius={[6, 6, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  No cash flow data for the last 6 months
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Add income or expenses to generate the monthly comparison chart.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className={cardSurface}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                Monthly Savings Trend
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Net savings trajectory across the last 6 months
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('savings')}
              className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400 whitespace-nowrap"
            >
              Savings Tracker
            </button>
          </div>

          <div className="mt-5 h-64 w-full">
            {hasAnyMonthlyChartData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlySeries} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="savingsAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.32} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: axisTickColor, fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: axisTickColor, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => formatINR(v, { compact: true })}
                  />
                  <ReferenceLine y={0} stroke={gridStroke} />
                  <Tooltip content={renderChartTooltip} />
                  <Area
                    type="monotone"
                    dataKey="savings"
                    name="Net Savings"
                    stroke="#3B82F6"
                    strokeWidth={2.5}
                    fill="url(#savingsAreaGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  No savings history yet
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Monthly net savings are calculated automatically from saved transactions.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Breakdown & Recent Transactions */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Expense Category Breakdown */}
        <div className={`${cardSurface} xl:col-span-5`}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                Expense Breakdown
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {getMonthLabel(selectedMonth)} spending by category
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('expenses')}
              className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400 whitespace-nowrap"
            >
              Manage Expenses
            </button>
          </div>

          {expenseBreakdown.length > 0 ? (
            <div className="mt-4 grid grid-cols-1 items-center gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseBreakdown}
                      dataKey="amount"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={78}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {expenseBreakdown.map((entry) => (
                        <Cell key={entry.category} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => formatINR(Number(value))}
                      contentStyle={{
                        backgroundColor: isDark ? '#0B1221' : '#FFFFFF',
                        borderColor: isDark ? '#334155' : '#E2E8F0',
                        borderRadius: '12px',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {expenseBreakdown.slice(0, 6).map((cat) => (
                  <div key={cat.category} className="flex items-center justify-between gap-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-xs"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                        {cat.category}
                      </span>
                    </div>
                    <div className="font-mono-num shrink-0 text-right text-xs">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {formatINR(cat.amount)}
                      </span>
                      <span className="ml-1.5 text-slate-400">{cat.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-52 flex-col items-center justify-center text-center">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                No expenses in {getMonthLabel(selectedMonth)}
              </p>
              <button
                type="button"
                onClick={() => onOpenTransactionModal('expense')}
                className="mt-3 rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Add Expense
              </button>
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className={`${cardSurface} xl:col-span-7`}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                Recent Transactions
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Latest saved income and expense entries
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('transactions')}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400 whitespace-nowrap"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {recentTransactions.length > 0 ? (
            <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800/80">
              {recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        tx.type === 'income'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {tx.type === 'income' ? (
                        <ArrowDownLeft className="h-4 w-4" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {tx.name}
                      </div>
                      <div className="flex items-center gap-1.5 truncate text-xs text-slate-500 dark:text-slate-400">
                        <span>{tx.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>{tx.paymentMethod}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatDateDDMMYYYY(tx.date)}</span>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`font-mono-num shrink-0 text-sm font-semibold ${
                      tx.type === 'income'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '-'}
                    {formatINR(tx.amount)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-52 flex-col items-center justify-center text-center">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                No transactions recorded yet
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Your recent entries will appear here as soon as you add them.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Bottom Row: Budget Usage, Upcoming Recurring, Financial Goals */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Budget Usage Progress Bars */}
        <div className={cardSurface}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              Budget Usage
            </h2>
            <button
              type="button"
              onClick={() => setActiveTab('budgets')}
              className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400 whitespace-nowrap"
            >
              Configure
            </button>
          </div>

          {budgetProgress.overall || budgetProgress.categories.length > 0 ? (
            <div className="mt-4 space-y-4">
              {[...(budgetProgress.overall ? [budgetProgress.overall] : []), ...budgetProgress.categories]
                .slice(0, 4)
                .map((b) => {
                  const barColor =
                    b.status === 'exceeded'
                      ? 'bg-rose-500'
                      : b.status === 'high'
                      ? 'bg-orange-500'
                      : b.status === 'warning'
                      ? 'bg-amber-500'
                      : b.status === 'info'
                      ? 'bg-blue-500'
                      : 'bg-emerald-500';
                  return (
                    <div key={b.key}>
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                          {b.label}
                        </span>
                        <span className="font-mono-num shrink-0 text-slate-500 dark:text-slate-400">
                          {formatINR(b.spent)} / {formatINR(b.allocated)}
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                          style={{ width: `${Math.min(100, Math.max(0, b.percentUsed))}%` }}
                        />
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="font-mono-num">{b.percentUsed.toFixed(1)}% used</span>
                        <span
                          className={`font-mono-num ${
                            b.remaining < 0 ? 'text-rose-500 font-medium' : ''
                          }`}
                        >
                          {b.remaining >= 0
                            ? `${formatINR(b.remaining)} left`
                            : `Over by ${formatINR(Math.abs(b.remaining))}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="flex h-44 flex-col items-center justify-center text-center">
              <ShieldCheck className="h-7 w-7 text-slate-400" />
              <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                No monthly budgets set
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('budgets')}
                className="mt-2.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Create Budgets
              </button>
            </div>
          )}
        </div>

        {/* Upcoming Recurring Payments */}
        <div className={cardSurface}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                Upcoming Recurring
              </h2>
              {upcomingRecurring.length > 0 && (
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Est. {formatINR(monthlyRecurringEstimate)}/mo
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('recurring')}
              className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400 whitespace-nowrap"
            >
              Manage
            </button>
          </div>

          {upcomingRecurring.length > 0 ? (
            <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800/80">
              {upcomingRecurring.map((rec) => {
                const days = daysBetweenISO(todayISO, rec.nextPaymentDate);
                return (
                  <div key={rec.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {rec.name}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <span className="capitalize">{rec.frequency}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {days === 0
                            ? 'Due today'
                            : days < 0
                            ? `${Math.abs(days)}d overdue`
                            : `In ${days}d (${formatDateDDMMYYYY(rec.nextPaymentDate)})`}
                        </span>
                      </div>
                    </div>
                    <div className="font-mono-num shrink-0 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {formatINR(rec.amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-44 flex-col items-center justify-center text-center">
              <CalendarClock className="h-7 w-7 text-slate-400" />
              <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                No recurring bills tracked
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('recurring')}
                className="mt-2.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Add Recurring Bill
              </button>
            </div>
          )}
        </div>

        {/* Financial Goals Progress */}
        <div className={cardSurface}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              Financial Goals
            </h2>
            <button
              type="button"
              onClick={() => setActiveTab('goals')}
              className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400 whitespace-nowrap"
            >
              View Goals
            </button>
          </div>

          {vault.goals.length > 0 ? (
            <div className="mt-4 space-y-4">
              {vault.goals.slice(0, 3).map((goal) => {
                const pct =
                  goal.targetAmount > 0
                    ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 1000) / 10)
                    : 0;
                const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
                return (
                  <div key={goal.id}>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                        {goal.name}
                      </span>
                      <span className="font-mono-num shrink-0 font-semibold text-emerald-600 dark:text-emerald-400">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-mono-num">
                        {formatINR(goal.currentAmount)} / {formatINR(goal.targetAmount)}
                      </span>
                      <span className="font-mono-num">
                        {remaining === 0 ? 'Completed' : `${formatINR(remaining)} left`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-44 flex-col items-center justify-center text-center">
              <Target className="h-7 w-7 text-slate-400" />
              <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                No savings goals yet
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('goals')}
                className="mt-2.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Add Financial Goal
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
