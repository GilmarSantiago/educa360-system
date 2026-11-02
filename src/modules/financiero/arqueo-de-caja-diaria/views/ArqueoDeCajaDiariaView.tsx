'use client';

import FinancesManager from '@/modules/financiero/FinancesManager';
import { AlertType } from '@/shared/ui/AlertToast';

interface ArqueoDeCajaDiariaViewProps {
  onNotify: (alert: { type: AlertType; title: string; message?: string }) => void;
  onSubmoduleChange?: (sub: 'cashflow' | 'tuitions' | 'products' | 'obligations' | 'shifts') => void;
}

export default function ArqueoDeCajaDiariaView({ onNotify, onSubmoduleChange }: ArqueoDeCajaDiariaViewProps) {
  return (
    <FinancesManager
      initialSubmodule="shifts"
      onNotify={onNotify}
      onSubmoduleChange={onSubmoduleChange}
    />
  );
}
