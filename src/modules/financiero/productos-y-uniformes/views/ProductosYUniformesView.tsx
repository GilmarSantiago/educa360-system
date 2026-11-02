'use client';

import FinancesManager from '@/modules/financiero/FinancesManager';
import { AlertType } from '@/shared/ui/AlertToast';

interface ProductosYUniformesViewProps {
  onNotify: (alert: { type: AlertType; title: string; message?: string }) => void;
  onSubmoduleChange?: (sub: 'cashflow' | 'tuitions' | 'products' | 'obligations' | 'shifts') => void;
}

export default function ProductosYUniformesView({ onNotify, onSubmoduleChange }: ProductosYUniformesViewProps) {
  return (
    <FinancesManager
      initialSubmodule="products"
      onNotify={onNotify}
      onSubmoduleChange={onSubmoduleChange}
    />
  );
}
