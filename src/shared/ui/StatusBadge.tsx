'use client';

import React from 'react';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'neutral';

export interface StatusBadgeProps {
  status?: string;
  label?: React.ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
}

const TONE_CLASSES: Record<BadgeTone, { badge: string; dot: string }> = {
  success: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  warning: {
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  danger: {
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
  },
  info: {
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dot: 'bg-indigo-500',
  },
  purple: {
    badge: 'bg-violet-50 text-violet-700 border-violet-200',
    dot: 'bg-violet-500',
  },
  neutral: {
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
  },
};

const AUTO_STATUS_MAP: Record<string, { label: string; tone: BadgeTone }> = {
  PAID: { label: 'Pagado', tone: 'success' },
  PENDING: { label: 'Pendiente', tone: 'warning' },
  OVERDUE: { label: 'Vencido', tone: 'danger' },
  ACTIVE: { label: 'Activo', tone: 'success' },
  SUSPENDED: { label: 'Suspendido', tone: 'danger' },
  CONFIRMED: { label: 'Confirmada', tone: 'success' },
  CANCELLED: { label: 'Cancelada', tone: 'danger' },
  ENROLLED: { label: 'Matriculado', tone: 'success' },
  PROSPECT: { label: 'Prospecto', tone: 'info' },
  WITHDRAWN: { label: 'Retirado', tone: 'neutral' },
  OPEN: { label: 'Caja Abierta', tone: 'success' },
  CLOSED: { label: 'Caja Cerrada', tone: 'neutral' },
};

/**
 * Etiqueta de estado estandarizada para tablas, tarjetas y modales.
 */
export function StatusBadge({
  status,
  label,
  tone,
  dot = true,
  className = '',
}: StatusBadgeProps) {
  const normalized = (status || '').toUpperCase().trim();
  const mapped = AUTO_STATUS_MAP[normalized];

  const finalTone: BadgeTone = tone || mapped?.tone || 'neutral';
  const finalLabel = label ?? mapped?.label ?? status ?? 'Estado';
  const styles = TONE_CLASSES[finalTone];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${styles.badge} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />}
      {finalLabel}
    </span>
  );
}
export default StatusBadge;

