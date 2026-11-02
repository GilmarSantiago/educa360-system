'use client';

import FinancesManager from '@/modules/financiero/FinancesManager';
import { AlertType } from '@/shared/ui/AlertToast';

interface ServiciosYPrestamosViewProps {
  onNotify: (alert: { type: AlertType; title: string; message?: string }) => void;
  onSubmoduleChange?: (sub: 'cashflow' | 'tuitions' | 'products' | 'obligations' | 'shifts') => void;
}

export default function ServiciosYPrestamosView({ onNotify, onSubmoduleChange }: ServiciosYPrestamosViewProps) {
  return (
    <FinancesManager
      initialSubmodule="obligations"
      onNotify={onNotify}
      onSubmoduleChange={onSubmoduleChange}
    />
  );
}
