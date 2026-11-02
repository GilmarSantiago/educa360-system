'use client';

import React from 'react';
import { Search, Inbox, Loader2, LucideIcon } from 'lucide-react';

export interface DataTableTemplateProps {
  title?: string;
  subtitle?: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  filters?: React.ReactNode;
  headerActions?: React.ReactNode;
  loading?: boolean;
  loadingText?: string;
  isEmpty?: boolean;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Plantilla Maestra para Tablas de Datos en Educa360.
 * Unifica barra de búsqueda, filtros, estados de carga, estados vacíos y pie de paginación.
 */
export function DataTableTemplate({
  title,
  subtitle,
  searchPlaceholder = 'Buscar registros...',
  searchValue,
  onSearchChange,
  filters,
  headerActions,
  loading = false,
  loadingText = 'Cargando información...',
  isEmpty = false,
  emptyIcon: EmptyIcon = Inbox,
  emptyTitle = 'No se encontraron registros',
  emptyDescription = 'Intenta ajustar los filtros de búsqueda o registra un nuevo elemento.',
  emptyAction,
  footer,
  children,
}: DataTableTemplateProps) {
  const showToolbar = title || onSearchChange || filters || headerActions;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {showToolbar && (
        <div className="p-4 sm:p-5 border-b border-slate-200/80 bg-slate-50/50 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {(title || subtitle) && (
            <div>
              {title && <h3 className="text-base font-bold text-slate-900">{title}</h3>}
              {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
          )}

          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 flex-1 lg:justify-end">
            {onSearchChange && (
              <div className="relative min-w-[240px] flex-1 sm:max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchValue ?? ''}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            )}
            {filters}
            {headerActions}
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-16 px-4 flex flex-col items-center justify-center text-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-600">{loadingText}</p>
        </div>
      ) : isEmpty ? (
        <div className="py-16 px-4 flex flex-col items-center justify-center text-center max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
            <EmptyIcon className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-slate-800">{emptyTitle}</h4>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">{emptyDescription}</p>
          {emptyAction && <div className="mt-4">{emptyAction}</div>}
        </div>
      ) : (
        <div className="overflow-x-auto">{children}</div>
      )}

      {footer && (
        <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-200/80">
          {footer}
        </div>
      )}
    </div>
  );
}
export default DataTableTemplate;
