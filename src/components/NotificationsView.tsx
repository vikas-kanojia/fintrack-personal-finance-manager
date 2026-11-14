import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCheck,
  CheckCircle2,
  Info,
  Trash2,
} from 'lucide-react';
import { useFinance } from '../store/financeStore';

export const NotificationsView: React.FC = () => {
  const {
    vault,
    unreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    clearReadNotifications,
  } = useFinance();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const items = useMemo(
    () =>
      filter === 'unread'
        ? vault.notifications.filter((n) => !n.read)
        : vault.notifications,
    [vault.notifications, filter]
  );

  const iconFor = (severity: string) => {
    if (severity === 'critical') return <AlertCircle className="h-4.5 w-4.5 text-rose-500" />;
    if (severity === 'high') return <AlertTriangle className="h-4.5 w-4.5 text-orange-500" />;
    if (severity === 'warning') return <AlertTriangle className="h-4.5 w-4.5 text-amber-500" />;
    if (severity === 'success') return <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />;
    return <Info className="h-4.5 w-4.5 text-blue-500" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center dark:border-slate-800/90 dark:bg-[#111A2E]">
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-[#111A2E] dark:text-white'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              All ({vault.notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
                filter === 'unread'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-[#111A2E] dark:text-white'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Unread ({unreadNotificationCount})
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {unreadNotificationCount > 0 && (
            <button
              type="button"
              onClick={markAllNotificationsRead}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              <CheckCheck className="h-4 w-4" />
              Mark All Read
            </button>
          )}
          {vault.notifications.some((n) => n.read) && (
            <button
              type="button"
              onClick={clearReadNotifications}
              className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              Clear Read
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800/90 dark:bg-[#111A2E]">
        {items.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {items.map((n) => (
              <div
                key={n.id}
                className={`flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center ${
                  n.read ? 'opacity-65' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">{iconFor(n.severity)}</div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {n.title}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(n.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      {n.message}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {!n.read && (
                    <button
                      type="button"
                      onClick={() => markNotificationRead(n.id)}
                      className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Mark read
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteNotification(n.id)}
                    aria-label="Delete notification"
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <Bell className="h-9 w-9 text-slate-400" />
            <h3 className="mt-3 font-display text-sm font-semibold text-slate-900 dark:text-white">
              {filter === 'unread' ? 'No unread alerts' : 'No notifications yet'}
            </h3>
            <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
              Real alerts appear automatically when budgets cross 50%, 75%, 90%, or 100%, savings fall behind target, recurring payments approach, or goals complete.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
