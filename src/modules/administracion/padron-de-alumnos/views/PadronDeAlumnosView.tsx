'use client';

import AdministrationManager from '@/modules/administracion/AdministrationManager';
import { AlertType } from '@/shared/ui/AlertToast';

interface PadronDeAlumnosViewProps {
  onNotify: (alert: { type: AlertType; title: string; message?: string }) => void;
  onSubmoduleChange?: (sub: 'structure' | 'guardians' | 'students' | 'enrollments') => void;
}

export default function PadronDeAlumnosView({ onNotify, onSubmoduleChange }: PadronDeAlumnosViewProps) {
  return (
    <AdministrationManager
      initialSubmodule="students"
      onNotify={onNotify}
      onSubmoduleChange={onSubmoduleChange}
    />
  );
}
