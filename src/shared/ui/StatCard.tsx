'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

export type StatCardVariant = 'indigo' | 'emerald' | 'amber' | 'rose' | 'violet' | 'slate';

export interface StatCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: LucideIcon;
  variant?: StatCardVariant;
  badge?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

const VARIANT_CLASSES: Record<
  StatCardVariant,
  {
    cardBorder: string;
    iconWrap: string;
    valueText: string;
  }
> = {
  indigo: {
    cardBorder: 'border-slate-200/80 hover:border-indigo-200',
    iconWrap: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
    valueText: 'text-slate-900',
  },
  emerald: {
    cardBorder: 'border-slate-200/80 hover:border-emerald-200',
    iconWrap: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
    valueText: 'text-emerald-700',
  },
  amber: {
    cardBorder: 'border-slate-200/80 hover:border-amber-200',
    iconWrap: 'bg-amber-50 text-amber-600 border border-amber-100',
    valueText: 'text-amber-700',
  },
  rose: {
    cardBorder: 'border-slate-200/80 hover:border-rose-200',
    iconWrap: 'bg-rose-50 text-rose-600 border border-rose-100',
    valueText: 'text-rose-700',
  },
  violet: {
    cardBorder: 'border-slate-200/80 hover:border-violet-200',
    iconWrap: 'bg-violet-50 text-violet-600 border border-violet-100',
    valueText: 'text-violet-700',
  },
  slate: {
    cardBorder: 'border-slate-200/80 hover:border-slate-300',
    iconWrap: 'bg-slate-100 text-slate-600 border border-slate-200',
    valueText: 'text-slate-900',
  },
};

/**
 * Plantilla de Card para Métricas y KPIs en todos los módulos.
 */
export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'indigo',
  badge,
  onClick,
  className = '',
}: StatCardProps) {
  const styles = VARIANT_CLASSES[variant];

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border p-5 shadow-xs transition-all ${
        styles.cardBorder
      } ${onClick ? 'cursor-pointer hover:shadow-md' : ''} ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 truncate">
            {title}
          </p>
          <div className={`text-2xl font-extrabold tracking-tight mt-1.5 ${styles.valueText}`}>
            {value}
          </div>
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${styles.iconWrap}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {(subtitle || badge) && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 text-xs text-slate-500">
          {subtitle && <span className="truncate">{subtitle}</span>}
          {badge && <span className="shrink-0">{badge}</span>}
        </div>
      )}
    </div>
  );
}
export default StatCard;

