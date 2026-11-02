'use client';

import { CalendarCheck } from 'lucide-react';
import { ModuleViewTemplate, SectionCard } from '@/shared';

export default function AsistenciaView() {
  return (
    <ModuleViewTemplate
      badgeText="Pilar Académico • Control Diario"
      title="Toma y Reporte de Asistencia"
      subtitle="Control diario de asistencia, tardanzas y justificaciones por sección."
      icon={CalendarCheck}
    >
      <SectionCard
        title="Control de Asistencia Escolar"
        subtitle="Visualización de asistencia diaria por aula."
      >
        <p className="text-xs text-slate-500">
          Módulo de Asistencia listo dentro de <code>src/modules/academico/asistencia/</code>.
        </p>
      </SectionCard>
    </ModuleViewTemplate>
  );
}
