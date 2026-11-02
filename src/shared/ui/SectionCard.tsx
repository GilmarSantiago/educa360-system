'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface SectionCardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: LucideIcon;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  noPadding?: boolean;
  className?: string;
  bodyClassName?: string;
}

/**
 * Plantilla de Contenedor / Card de Sección para bloques de contenido en Educa360.
 */
export function SectionCard({
  title,
  subtitle,
  icon: Icon,
  headerRight,
  children,
  noPadding = false,
  className = '',
  bodyClassName = '',
}: SectionCardProps) {
  const hasHeader = title || subtitle || Icon || headerRight;

  return (
    <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden ${className}`}>
      {hasHeader && (
        <div className="px-6 py-4 border-b border-slate-200/80 bg-slate-50/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0">
              {title && (
                <h3 className="text-base font-bold text-slate-900 truncate">{title}</h3>
              )}
              {subtitle && (
                <p className="text-xs text-slate-500 truncate mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
          {headerRight && <div className="shrink-0 flex items-center gap-2">{headerRight}</div>}
        </div>
      )}

      <div className={`${noPadding ? '' : 'p-6'} ${bodyClassName}`}>{children}</div>
    </div>
  );
}
export default SectionCard;

