'use client';

import AdministrationManager from '@/modules/administracion/AdministrationManager';
import { AlertType } from '@/shared/ui/AlertToast';

interface AdmisionYMatriculasViewProps {
  onNotify: (alert: { type: AlertType; title: string; message?: string }) => void;
  onSubmoduleChange?: (sub: 'structure' | 'guardians' | 'students' | 'enrollments') => void;
}

export default function AdmisionYMatriculasView({ onNotify, onSubmoduleChange }: AdmisionYMatriculasViewProps) {
  return (
    <AdministrationManager
      initialSubmodule="enrollments"
      onNotify={onNotify}
      onSubmoduleChange={onSubmoduleChange}
    />
  );
}
