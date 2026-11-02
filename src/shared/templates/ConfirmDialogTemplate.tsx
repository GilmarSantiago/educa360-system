'use client';

import React from 'react';
import { AlertTriangle, Trash2, CheckCircle2, Info, LucideIcon } from 'lucide-react';
import { ModalTemplate, ModalVariant } from './ModalTemplate';
import { Button } from '../ui/Button';

export interface ConfirmDialogTemplateProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  subtitle?: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary' | 'success';
  loading?: boolean;
  icon?: LucideIcon;
}

const CONFIRM_CONFIG: Record<
  NonNullable<ConfirmDialogTemplateProps['variant']>,
  {
    modalVariant: ModalVariant;
    defaultIcon: LucideIcon;
    btnVariant: 'danger' | 'warning' | 'primary' | 'success';
    boxClass: string;
  }
> = {
  danger: {
    modalVariant: 'rose',
    defaultIcon: Trash2,
    btnVariant: 'danger',
    boxClass: 'bg-rose-50 border-rose-200 text-rose-800',
  },
  warning: {
    modalVariant: 'amber',
    defaultIcon: AlertTriangle,
    btnVariant: 'warning',
    boxClass: 'bg-amber-50 border-amber-200 text-amber-900',
  },
  primary: {
    modalVariant: 'indigo',
    defaultIcon: Info,
    btnVariant: 'primary',
    boxClass: 'bg-indigo-50 border-indigo-200 text-indigo-900',
  },
  success: {
    modalVariant: 'emerald',
    defaultIcon: CheckCircle2,
    btnVariant: 'success',
    boxClass: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  },
};

/**
 * Plantilla estándar para diálogos de confirmación (eliminaciones, anulaciones, cierres).
 */
export function ConfirmDialogTemplate({
  isOpen,
  onClose,
  onConfirm,
  title,
  subtitle = 'Confirma esta operación para continuar',
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  loading = false,
  icon,
}: ConfirmDialogTemplateProps) {
  const cfg = CONFIRM_CONFIG[variant];
  const DialogIcon = icon || cfg.defaultIcon;

  return (
    <ModalTemplate
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      variant={cfg.modalVariant}
      icon={DialogIcon}
      title={title}
      subtitle={subtitle}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={cfg.btnVariant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className={`p-4 rounded-xl border text-sm leading-relaxed ${cfg.boxClass}`}>
        {description}
      </div>
    </ModalTemplate>
  );
}
export default ConfirmDialogTemplate;
