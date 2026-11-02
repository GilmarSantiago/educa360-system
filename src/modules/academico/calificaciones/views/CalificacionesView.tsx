'use client';

import { ClipboardList } from 'lucide-react';
import { ModuleViewTemplate, SectionCard } from '@/shared';

export default function CalificacionesView() {
  return (
    <ModuleViewTemplate
      badgeText="Pilar Académico • Evaluación Escolar"
      title="Registro y Supervisión de Calificaciones"
      subtitle="Consulta y auditoría de notas por bimestre/trimestre, promedios y actas oficiales."
      icon={ClipboardList}
    >
      <SectionCard
        title="Consolidado de Calificaciones por Aula"
        subtitle="Selecciona un grado y sección para revisar el avance de carga docente."
      >
        <p className="text-xs text-slate-500">
          Módulo de Calificaciones listo dentro de <code>src/modules/academico/calificaciones/</code>.
        </p>
      </SectionCard>
    </ModuleViewTemplate>
  );
}

