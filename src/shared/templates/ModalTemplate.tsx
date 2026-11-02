'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, LucideIcon } from 'lucide-react';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
export type ModalVariant = 'indigo' | 'emerald' | 'amber' | 'rose' | 'violet' | 'slate';

export interface ModalTemplateProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: LucideIcon;
  size?: ModalSize;
  variant?: ModalVariant;
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerRight?: React.ReactNode;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  hideCloseButton?: boolean;
  bodyClassName?: string;
  zIndex?: number;
}

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-5xl',
  full: 'max-w-7xl',
};

const VARIANT_STYLES: Record<
  ModalVariant,
  {
    headerBg: string;
    iconBox: string;
    titleText: string;
    subtitleText: string;
    closeBtn: string;
  }
> = {
  indigo: {
    headerBg: 'bg-gradient-to-r from-indigo-950 via-indigo-900 to-slate-900 text-white border-b border-indigo-800/40',
    iconBox: 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30',
    titleText: 'text-white',
    subtitleText: 'text-indigo-200/80',
    closeBtn: 'text-indigo-200 hover:text-white hover:bg-white/10',
  },
  emerald: {
    headerBg: 'bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white border-b border-emerald-800/40',
    iconBox: 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30',
    titleText: 'text-white',
    subtitleText: 'text-emerald-200/80',
    closeBtn: 'text-emerald-200 hover:text-white hover:bg-white/10',
  },
  amber: {
    headerBg: 'bg-gradient-to-r from-amber-950 via-amber-900 to-slate-900 text-white border-b border-amber-800/40',
    iconBox: 'bg-amber-500/20 text-amber-300 border border-amber-400/30',
    titleText: 'text-white',
    subtitleText: 'text-amber-200/80',
    closeBtn: 'text-amber-200 hover:text-white hover:bg-white/10',
  },
  rose: {
    headerBg: 'bg-gradient-to-r from-rose-950 via-rose-900 to-slate-900 text-white border-b border-rose-800/40',
    iconBox: 'bg-rose-500/20 text-rose-300 border border-rose-400/30',
    titleText: 'text-white',
    subtitleText: 'text-rose-200/80',
    closeBtn: 'text-rose-200 hover:text-white hover:bg-white/10',
  },
  violet: {
    headerBg: 'bg-gradient-to-r from-violet-950 via-violet-900 to-slate-900 text-white border-b border-violet-800/40',
    iconBox: 'bg-violet-500/20 text-violet-300 border border-violet-400/30',
    titleText: 'text-white',
    subtitleText: 'text-violet-200/80',
    closeBtn: 'text-violet-200 hover:text-white hover:bg-white/10',
  },
  slate: {
    headerBg: 'bg-white text-slate-900 border-b border-slate-200',
    iconBox: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
    titleText: 'text-slate-900',
    subtitleText: 'text-slate-500',
    closeBtn: 'text-slate-400 hover:text-slate-700 hover:bg-slate-100',
  },
};

/**
 * Plantilla Maestra de Modales para todo el sistema Educa360.
 * - Se renderiza en `document.body` mediante React Portal para evitar recortes de contenedores padres.
 * - Controla automáticamente el ancho (`size`), alto máximo con scroll interno, pie fijo al fondo y cierre con tecla ESC.
 */
export function ModalTemplate({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  size = 'md',
  variant = 'indigo',
  children,
  footer,
  headerRight,
  closeOnBackdrop = true,
  closeOnEscape = true,
  hideCloseButton = false,
  bodyClassName = 'p-6',
  zIndex = 9999,
}: ModalTemplateProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen || !mounted || typeof document === 'undefined') {
    return null;
  }

  const styles = VARIANT_STYLES[variant];
  const sizeClass = SIZE_CLASSES[size];

  const modalNode = (
    <div
      style={{ zIndex }}
      className="fixed inset-0 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        className={`relative w-full ${sizeClass} max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden animate-in zoom-in-95 duration-150`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera fija de la plantilla */}
        <div className={`px-6 py-4 flex items-center justify-between gap-4 shrink-0 ${styles.headerBg}`}>
          <div className="flex items-center gap-3.5 min-w-0">
            {Icon && (
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${styles.iconBox}`}>
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className={`text-base sm:text-lg font-bold tracking-tight truncate ${styles.titleText}`}>
                {title}
              </h3>
              {subtitle && (
                <p className={`text-xs sm:text-sm truncate mt-0.5 ${styles.subtitleText}`}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {headerRight}
            {!hideCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${styles.closeBtn}`}
                title="Cerrar (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Cuerpo central con scroll independiente */}
        <div className={`flex-1 overflow-y-auto ${bodyClassName}`}>
          {children}
        </div>

        {/* Pie de modal fijo al fondo */}
        {footer && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-end gap-3 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
}
export default ModalTemplate;

