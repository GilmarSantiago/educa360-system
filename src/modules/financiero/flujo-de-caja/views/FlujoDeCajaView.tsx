'use client';

import FinancesManager from '@/modules/financiero/FinancesManager';
import { AlertType } from '@/shared/ui/AlertToast';

interface FlujoDeCajaViewProps {
  onNotify: (alert: { type: AlertType; title: string; message?: string }) => void;
  onSubmoduleChange?: (sub: 'cashflow' | 'tuitions' | 'products' | 'obligations' | 'shifts') => void;
}

export default function FlujoDeCajaView({ onNotify, onSubmoduleChange }: FlujoDeCajaViewProps) {
  return (
    <FinancesManager
      initialSubmodule="cashflow"
      onNotify={onNotify}
      onSubmoduleChange={onSubmoduleChange}
    />
  );
}
