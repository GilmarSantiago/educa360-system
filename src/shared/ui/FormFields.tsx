'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface BaseFieldProps {
  label?: string;
  required?: boolean;
  helperText?: string;
  error?: string;
  icon?: LucideIcon;
  containerClassName?: string;
}

export interface FormInputProps
  extends BaseFieldProps,
    React.InputHTMLAttributes<HTMLInputElement> {}

export function FormInput({
  label,
  required,
  helperText,
  error,
  icon: Icon,
  containerClassName = '',
  className = '',
  ...rest
}: FormInputProps) {
  return (
    <div className={`space-y-1.5 ${containerClassName}`}>
      {label && (
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        )}
        <input
          required={required}
          className={`w-full ${
            Icon ? 'pl-10 pr-3.5' : 'px-3.5'
          } py-2.5 text-sm bg-white border ${
            error
              ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500'
              : 'border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500'
          } rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all disabled:bg-slate-50 disabled:text-slate-400 ${className}`}
          {...rest}
        />
      </div>
      {error ? (
        <p className="text-xs font-medium text-rose-600">{error}</p>
      ) : (
        helperText && <p className="text-xs text-slate-400">{helperText}</p>
      )}
    </div>
  );
}

export interface FormSelectProps
  extends BaseFieldProps,
    React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode;
}

export function FormSelect({
  label,
  required,
  helperText,
  error,
  icon: Icon,
  containerClassName = '',
  className = '',
  children,
  ...rest
}: FormSelectProps) {
  return (
    <div className={`space-y-1.5 ${containerClassName}`}>
      {label && (
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        )}
        <select
          required={required}
          className={`w-full ${
            Icon ? 'pl-10 pr-8' : 'px-3.5'
          } py-2.5 text-sm bg-white border ${
            error
              ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500'
              : 'border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500'
          } rounded-xl text-slate-800 focus:outline-none focus:ring-2 transition-all disabled:bg-slate-50 disabled:text-slate-400 ${className}`}
          {...rest}
        >
          {children}
        </select>
      </div>
      {error ? (
        <p className="text-xs font-medium text-rose-600">{error}</p>
      ) : (
        helperText && <p className="text-xs text-slate-400">{helperText}</p>
      )}
    </div>
  );
}

export interface FormTextareaProps
  extends BaseFieldProps,
    React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function FormTextarea({
  label,
  required,
  helperText,
  error,
  containerClassName = '',
  className = '',
  rows = 3,
  ...rest
}: FormTextareaProps) {
  return (
    <div className={`space-y-1.5 ${containerClassName}`}>
      {label && (
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <textarea
        rows={rows}
        required={required}
        className={`w-full px-3.5 py-2.5 text-sm bg-white border ${
          error
            ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500'
            : 'border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500'
        } rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all disabled:bg-slate-50 disabled:text-slate-400 ${className}`}
        {...rest}
      />
      {error ? (
        <p className="text-xs font-medium text-rose-600">{error}</p>
      ) : (
        helperText && <p className="text-xs text-slate-400">{helperText}</p>
      )}
    </div>
  );
}

