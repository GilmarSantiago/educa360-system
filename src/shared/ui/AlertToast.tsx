'use client';

import React, { useEffect } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  X,
} from 'lucide-react';

export type AlertType = 'success' | 'error' | 'info' | 'warning';

export interface AlertNotification {
  id: string;
  type: AlertType;
  title: string;
  message?: string;
  duration?: number;
}

interface AlertToastProps {
  alerts: AlertNotification[];
  onDismiss: (id: string) => void;
}

export default function AlertToast({ alerts, onDismiss }: AlertToastProps) {
  if (alerts.length === 0) return null;

  return (
    <div
      className="fixed top-5 right-5 z-[99999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      style={{ zIndex: 999999 }}
    >
      {alerts.map((alert) => (
        <ToastItem key={alert.id} alert={alert} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({
  alert,
  onDismiss,
}: {
  alert: AlertNotification;
  onDismiss: (id: string) => void;
}) {
  const { id, type, title, message, duration = 4000 } = alert;

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(id);
    }, duration);
    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  const styles = {
    success: {
      bg: 'bg-white',
      border: 'border-emerald-200',
      badge: 'bg-[#e6f9ef] text-[#2fbf71]',
      icon: CheckCircle2,
      iconColor: 'text-[#2fbf71]',
      titleColor: 'text-slate-900',
      bar: 'bg-[#2fbf71]',
    },
    error: {
      bg: 'bg-white',
      border: 'border-rose-200',
      badge: 'bg-rose-50 text-rose-600',
      icon: AlertCircle,
      iconColor: 'text-rose-500',
      titleColor: 'text-slate-900',
      bar: 'bg-rose-500',
    },
    info: {
      bg: 'bg-white',
      border: 'border-blue-200',
      badge: 'bg-blue-50 text-blue-600',
      icon: Info,
      iconColor: 'text-blue-500',
      titleColor: 'text-slate-900',
      bar: 'bg-blue-500',
    },
    warning: {
      bg: 'bg-white',
      border: 'border-amber-200',
      badge: 'bg-amber-50 text-amber-600',
      icon: AlertTriangle,
      iconColor: 'text-amber-500',
      titleColor: 'text-slate-900',
      bar: 'bg-amber-500',
    },
  }[type];

  const Icon = styles.icon;

  return (
    <div className="pointer-events-auto w-full bg-white rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden animate-in slide-in-from-top-3 fade-in duration-200">
      <div className="p-3.5 flex items-start gap-3">
        <div className={`p-2 rounded-xl shrink-0 ${styles.badge}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0 pr-1">
          <h4 className={`text-xs font-bold ${styles.titleColor} leading-tight`}>{title}</h4>
          {message && <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{message}</p>}
        </div>
        <button
          onClick={() => onDismiss(id)}
          className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className={`h-1 w-full ${styles.bar} opacity-80`} />
    </div>
  );
}
