'use client';

import React from 'react';
import { Loader2, LucideIcon } from 'lucide-react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'danger'
  | 'warning'
  | 'outline'
  | 'ghost';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs border border-indigo-600/90',
  secondary:
    'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs',
  success:
    'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs border border-emerald-600/90',
  danger:
    'bg-rose-600 hover:bg-rose-700 text-white shadow-xs border border-rose-600/90',
  warning:
    'bg-amber-500 hover:bg-amber-600 text-white shadow-xs border border-amber-500/90',
  outline:
    'bg-transparent hover:bg-indigo-50 text-indigo-600 border border-indigo-200',
  ghost:
    'bg-transparent hover:bg-slate-100 text-slate-600 border border-transparent',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: 'px-2.5 py-1.5 text-xs rounded-lg gap-1.5',
  sm: 'px-3.5 py-2 text-xs sm:text-sm rounded-xl gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-5 py-3 text-sm sm:text-base rounded-xl gap-2.5',
};

/**
 * Botón estandarizado del Sistema de Diseño Educa360.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  iconRight: IconRight,
  fullWidth = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={`inline-flex items-center justify-center font-semibold transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
        VARIANT_CLASSES[variant]
      } ${SIZE_CLASSES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        Icon && <Icon className="w-4 h-4 shrink-0" />
      )}
      {children && <span>{children}</span>}
      {!loading && IconRight && <IconRight className="w-4 h-4 shrink-0" />}
    </button>
  );
}
export default Button;
