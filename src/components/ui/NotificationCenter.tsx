import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, X, Info, CheckCircle2, AlertTriangle, AlertCircle, ArrowRight } from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '../../store/useStore';

const TYPE_CONFIG = {
  info:    { icon: Info,          color: 'text-accent-cyan',  bg: 'bg-accent-cyan/10 border-accent-cyan/20' },
  success: { icon: CheckCircle2,  color: 'text-green-400',    bg: 'bg-green-500/10 border-green-500/20' },
  warning: { icon: AlertTriangle, color: 'text-amber-400',    bg: 'bg-amber-500/10 border-amber-500/20' },
  error:   { icon: AlertCircle,   color: 'text-red-400',      bg: 'bg-red-500/10 border-red-500/20' },
};

export const NotificationCenter: React.FC = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { notifications, markNotificationRead, markAllNotificationsRead, setActiveSection } = useStore();

  const unreadCount = notifications.filter(n => !n.lu).length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-card border border-card-border hover:border-primary-500/30 text-slate-400 hover:text-white transition-all"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-primary-500 text-white text-[10px] font-bold leading-none px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-obsidian-800 border border-card-border rounded-2xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-card-border">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary-400" />
              <span className="font-semibold text-white text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400 text-xs font-medium">
                  {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllNotificationsRead}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Tout lire
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <Bell className="w-8 h-8 mb-3 opacity-30" />
                <p className="text-sm font-medium">Aucune notification</p>
              </div>
            ) : (
              notifications.map(notif => {
                const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.info;
                const Icon = cfg.icon;
                return (
                  <div
                    key={notif.id}
                    onClick={() => {
                      markNotificationRead(notif.id);
                      if (notif.section) {
                        setActiveSection(notif.section);
                        setOpen(false);
                      }
                    }}
                    className={clsx(
                      'flex items-start gap-3 px-4 py-3 border-b border-card-border/50 cursor-pointer hover:bg-white/[0.03] transition-all',
                      !notif.lu && 'bg-primary-500/5'
                    )}
                  >
                    <div className={clsx('flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center border', cfg.bg)}>
                      <Icon className={clsx('w-3.5 h-3.5', cfg.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={clsx('text-sm font-semibold leading-tight', notif.lu ? 'text-slate-300' : 'text-white')}>
                          {notif.titre}
                        </p>
                        {!notif.lu && (
                          <span className="flex-shrink-0 w-2 h-2 rounded-full bg-primary-500 mt-1" />
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{notif.message}</p>
                      <p className="text-xs text-slate-600 mt-1">
                        {new Date(notif.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {notif.section && (
                      <ArrowRight className="w-3.5 h-3.5 text-slate-600 flex-shrink-0 mt-1" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
