'use client';

import FinancesManager from '@/modules/financiero/FinancesManager';
import { AlertType } from '@/shared/ui/AlertToast';

interface PensionesYMorasViewProps {
  onNotify: (alert: { type: AlertType; title: string; message?: string }) => void;
  onSubmoduleChange?: (sub: 'cashflow' | 'tuitions' | 'products' | 'obligations' | 'shifts') => void;
}

export default function PensionesYMorasView({ onNotify, onSubmoduleChange }: PensionesYMorasViewProps) {
  return (
    <FinancesManager
      initialSubmodule="tuitions"
      onNotify={onNotify}
      onSubmoduleChange={onSubmoduleChange}
    />
  );
}
