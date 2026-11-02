'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface ModuleViewTemplateProps {
  title: string;
  subtitle?: string;
  badgeText?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  statsGrid?: React.ReactNode;
  tabsBar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Plantilla Maestra para las Vistas Principales de cada Módulo.
 * Garantiza que todos los módulos compartan la misma estructura visual:
 * 1. Cabecera institucional con ícono, título, subtítulo y botonera de acciones a la derecha.
 * 2. Barra opcional de sub-pestañas del módulo.
 * 3. Fila opcional de tarjetas KPI (`StatCard`).
 * 4. Cuerpo principal del módulo.
 */
export function ModuleViewTemplate({
  title,
  subtitle,
  badgeText,
  icon: Icon,
  actions,
  statsGrid,
  tabsBar,
  children,
  className = '',
}: ModuleViewTemplateProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Cabecera estandarizada del módulo */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          {Icon && (
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 shadow-2xs">
              <Icon className="w-6 h-6" />
            </div>
          )}
          <div>
            {badgeText && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/60 mb-1">
                {badgeText}
              </span>
            )}
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {actions}
          </div>
        )}
      </div>

      {/* Barra opcional de navegación interna / pestañas */}
      {tabsBar && <div>{tabsBar}</div>}

      {/* Grilla opcional de KPIs / Tarjetas de resumen */}
      {statsGrid && <div>{statsGrid}</div>}

      {/* Contenido principal del módulo */}
      <div className="space-y-6">{children}</div>
    </div>
  );
}
export default ModuleViewTemplate;

