'use client';

import AdministrationManager from '@/modules/administracion/AdministrationManager';
import { AlertType } from '@/shared/ui/AlertToast';

interface FamiliasYApoderadosViewProps {
  onNotify: (alert: { type: AlertType; title: string; message?: string }) => void;
  onSubmoduleChange?: (sub: 'structure' | 'guardians' | 'students' | 'enrollments') => void;
}

export default function FamiliasYApoderadosView({ onNotify, onSubmoduleChange }: FamiliasYApoderadosViewProps) {
  return (
    <AdministrationManager
      initialSubmodule="guardians"
      onNotify={onNotify}
      onSubmoduleChange={onSubmoduleChange}
    />
  );
}
