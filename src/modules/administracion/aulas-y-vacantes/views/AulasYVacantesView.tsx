'use client';

import AdministrationManager from '@/modules/administracion/AdministrationManager';
import { AlertType } from '@/shared/ui/AlertToast';

interface AulasYVacantesViewProps {
  onNotify: (alert: { type: AlertType; title: string; message?: string }) => void;
  onSubmoduleChange?: (sub: 'structure' | 'guardians' | 'students' | 'enrollments') => void;
}

export default function AulasYVacantesView({ onNotify, onSubmoduleChange }: AulasYVacantesViewProps) {
  return (
    <AdministrationManager
      initialSubmodule="structure"
      onNotify={onNotify}
      onSubmoduleChange={onSubmoduleChange}
    />
  );
}
