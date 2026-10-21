'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Layers,
  Users,
  GraduationCap,
  ClipboardList,
  Search,
  PlusCircle,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Calendar,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  X,
  Edit2,
  Trash2,
  DollarSign,
  HeartPulse,
  Building,
  UserCheck,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ExternalLink,
  Percent,
  Sliders,
  Sparkles,
  Award,
} from 'lucide-react';
import {
  AcademicYear,
  SchoolGrade,
  SchoolSection,
  TeacherUser,
  Guardian,
  Student,
  Enrollment,
  EnrollmentDiscountType,
} from '@/types';
import { AlertType } from '@/components/ui/AlertToast';
import Pagination from '@/components/ui/Pagination';
import IntegralEnrollmentWizardModal from '@/components/admin/IntegralEnrollmentWizardModal';

export type AdminSubmodule = 'structure' | 'guardians' | 'students' | 'enrollments';

// Configuración de los 3 niveles de la educación básica escolar
const LEVEL_DEFINITIONS = [
  {
    key: 'INICIAL' as const,
    name: 'Nivel Inicial',
    shortDescription: 'Cuna, 3, 4 y 5 años • Formación temprana y psicomotricidad',
    badgeTheme: 'bg-amber-100 text-amber-900 border-amber-300',
    iconBg: 'bg-amber-500 text-white shadow-sm shadow-amber-500/20',
    icon: Sparkles,
  },
  {
    key: 'PRIMARIA' as const,
    name: 'Nivel Primaria',
    shortDescription: '1° a 6° Grado • Educación fundamental y desarrollo de competencias',
    badgeTheme: 'bg-blue-100 text-blue-900 border-blue-300',
    iconBg: 'bg-blue-600 text-white shadow-sm shadow-blue-600/20',
    icon: GraduationCap,
  },
  {
    key: 'SECUNDARIA' as const,
    name: 'Nivel Secundaria',
    shortDescription: '1° a 5° Año • Preparación integral y pre-universitaria',
    badgeTheme: 'bg-purple-100 text-purple-900 border-purple-300',
    iconBg: 'bg-purple-600 text-white shadow-sm shadow-purple-600/20',
    icon: Award,
  },
];

interface AdministrationManagerProps {
  initialSubmodule?: AdminSubmodule;
  onNotify: (alert: { type: AlertType; title: string; message?: string }) => void;
  onSubmoduleChange?: (submodule: AdminSubmodule) => void;
}

export default function AdministrationManager({
  initialSubmodule = 'structure',
  onNotify,
  onSubmoduleChange,
}: AdministrationManagerProps) {
  const [currentSubmodule, setCurrentSubmodule] = useState<AdminSubmodule>(initialSubmodule);

  const handleSelectSubmodule = (sub: AdminSubmodule) => {
    setCurrentSubmodule(sub);
    onSubmoduleChange?.(sub);
  };

  useEffect(() => {
    if (initialSubmodule) setCurrentSubmodule(initialSubmodule);
  }, [initialSubmodule]);

  // =========================================================================
  // ESTADOS: SUBMÓDULO 1 - ESTRUCTURA ESCOLAR & AULAS
  // =========================================================================
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [grades, setGrades] = useState<SchoolGrade[]>([]);
  const [structureStats, setStructureStats] = useState({
    totalGrades: 0,
    totalSections: 0,
    totalCapacity: 0,
    totalEnrolled: 0,
    availableVacancies: 0,
    occupancyRate: 0,
  });
  const [loadingStructure, setLoadingStructure] = useState(false);
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<'ALL' | 'INICIAL' | 'PRIMARIA' | 'SECUNDARIA'>('ALL');

  // Estado del Acordeón por Nivel Educativo (reducidos por defecto)
  const [expandedLevels, setExpandedLevels] = useState<Record<string, boolean>>({});

  // Estado del Acordeón por Grado Escolar (reducidos por defecto)
  const [expandedGrades, setExpandedGrades] = useState<Record<string, boolean>>({});

  // Modal de Confirmación Estilizado de Eliminación (patrón oficial Educa360)
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    isOpen: boolean;
    type: 'grade' | 'section';
    title: string;
    subtitle: string;
    itemName: string;
    itemDetails: { label: string; value: string }[];
    warningMessage: string;
    targetId: string;
  }>({
    isOpen: false,
    type: 'grade',
    title: '',
    subtitle: '',
    itemName: '',
    itemDetails: [],
    warningMessage: '',
    targetId: '',
  });
  const [executingDelete, setExecutingDelete] = useState(false);

  // Modal: Crear / Editar Grado Escolar
  const [gradeModalOpen, setGradeModalOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<SchoolGrade | null>(null);
  const [gradeFormLevel, setGradeFormLevel] = useState<'INICIAL' | 'PRIMARIA' | 'SECUNDARIA'>('PRIMARIA');
  const [gradeFormName, setGradeFormName] = useState('');
  const [gradeFormOrder, setGradeFormOrder] = useState('1');
  const [gradeFormEnrollment, setGradeFormEnrollment] = useState('');
  const [gradeFormTuition, setGradeFormTuition] = useState('');
  const [gradeFormEntry, setGradeFormEntry] = useState('');
  const [savingGrade, setSavingGrade] = useState(false);

  // Modal: Crear / Editar Aula / Sección
  const [teachers, setTeachers] = useState<TeacherUser[]>([]);
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<SchoolSection | null>(null);
  const [secGradeId, setSecGradeId] = useState('');
  const [secLetter, setSecLetter] = useState('A');
  const [secShift, setSecShift] = useState<'MAÑANA' | 'TARDE'>('MAÑANA');
  const [secCapacity, setSecCapacity] = useState('30');
  const [secTutorUserId, setSecTutorUserId] = useState('');
  const [secClassroom, setSecClassroom] = useState('');
  const [savingSection, setSavingSection] = useState(false);

  // =========================================================================
  // ESTADOS: SUBMÓDULO 2 - FAMILIAS & APODERADOS
  // =========================================================================
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [guardianSearch, setGuardianSearch] = useState('');
  const [loadingGuardians, setLoadingGuardians] = useState(false);

  const [guardianModalOpen, setGuardianModalOpen] = useState(false);
  const [editingGuardian, setEditingGuardian] = useState<Guardian | null>(null);
  const [gDocType, setGDocType] = useState<'DNI' | 'CE' | 'PASAPORTE'>('DNI');
  const [gDocNum, setGDocNum] = useState('');
  const [gFirstName, setGFirstName] = useState('');
  const [gLastName, setGLastName] = useState('');
  const [gRelationship, setGRelationship] = useState<'PADRE' | 'MADRE' | 'TUTOR' | 'ABUELO' | 'OTRO'>('PADRE');
  const [gPhone, setGPhone] = useState('');
  const [gAltPhone, setGAltPhone] = useState('');
  const [gEmail, setGEmail] = useState('');
  const [gAddress, setGAddress] = useState('');
  const [gOccupation, setGOccupation] = useState('');
  const [gBillingTaxId, setGBillingTaxId] = useState('');
  const [gBillingName, setGBillingName] = useState('');
  const [savingGuardian, setSavingGuardian] = useState(false);

  // =========================================================================
  // ESTADOS: SUBMÓDULO 3 - PADRÓN DE ALUMNOS
  // =========================================================================
  const [students, setStudents] = useState<Student[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentStatusFilter, setStudentStatusFilter] = useState<'ALL' | 'PROSPECT' | 'ENROLLED' | 'WITHDRAWN'>('ALL');
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [sDocType, setSDocType] = useState<'DNI' | 'CE' | 'PASAPORTE'>('DNI');
  const [sDocNum, setSDocNum] = useState('');
  const [sFirstName, setSFirstName] = useState('');
  const [sLastName, setSLastName] = useState('');
  const [sGender, setSGender] = useState<'M' | 'F'>('M');
  const [sBirthDate, setSBirthDate] = useState('');
  const [sBloodType, setSBloodType] = useState('O+');
  const [sAllergies, setSAllergies] = useState('');
  const [sEmergencyPhone, setSEmergencyPhone] = useState('');
  const [sHealthInsurance, setSHealthInsurance] = useState('SIS');
  const [sPreviousSchool, setSPreviousSchool] = useState('');
  const [sGuardianId, setSGuardianId] = useState('');
  const [savingStudent, setSavingStudent] = useState(false);

  // =========================================================================
  // ESTADOS: SUBMÓDULO 4 - MATRÍCULAS ESCOLARES
  // =========================================================================
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [enrollmentSearch, setEnrollmentSearch] = useState('');
  const [enrollmentSectionFilter, setEnrollmentSectionFilter] = useState('ALL');
  const [enrollmentStats, setEnrollmentStats] = useState({
    totalEnrolled: 0,
    regularCount: 0,
    newCount: 0,
    discountedCount: 0,
    monthlyExpectedRevenue: 0,
  });
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);

  // Modal Asistente de Matrícula
  const [integralWizardOpen, setIntegralWizardOpen] = useState(false);
  const [newEnrollModalOpen, setNewEnrollModalOpen] = useState(false);
  const [enrStudentId, setEnrStudentId] = useState('');
  const [enrGuardianId, setEnrGuardianId] = useState('');
  const [enrSectionId, setEnrSectionId] = useState('');
  const [enrType, setEnrType] = useState<'REGULAR' | 'NUEVO' | 'TRASLADO'>('REGULAR');
  const [enrDate, setEnrDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [enrFee, setEnrFee] = useState('350');
  const [enrPayNow, setEnrPayNow] = useState(true);
  const [enrPayMethod, setEnrPayMethod] = useState('EFECTIVO');
  const [enrPayReceipt, setEnrPayReceipt] = useState('');
  const [enrEntryFee, setEnrEntryFee] = useState('0');
  const [enrMonthlyTuition, setEnrMonthlyTuition] = useState('400');
  const [enrDiscountType, setEnrDiscountType] = useState<EnrollmentDiscountType>('NINGUNO');
  const [enrDiscountPct, setEnrDiscountPct] = useState('0');
  const [enrNotes, setEnrNotes] = useState('');
  const [savingEnrollment, setSavingEnrollment] = useState(false);

  // Modal de Detalle de Matrícula / Ficha Imprimible
  const [selectedEnrollmentForDetail, setSelectedEnrollmentForDetail] = useState<Enrollment | null>(null);

  // Estados de Paginación para cada submódulo
  const [guardianPage, setGuardianPage] = useState(1);
  const [guardianPageSize, setGuardianPageSize] = useState(9);

  const [studentPage, setStudentPage] = useState(1);
  const [studentPageSize, setStudentPageSize] = useState(10);

  const [enrollmentPage, setEnrollmentPage] = useState(1);
  const [enrollmentPageSize, setEnrollmentPageSize] = useState(10);

  // Reiniciar a la página 1 cuando los filtros cambien
  useEffect(() => {
    setGuardianPage(1);
  }, [guardianSearch]);

  useEffect(() => {
    setStudentPage(1);
  }, [studentSearch, studentStatusFilter]);

  useEffect(() => {
    setEnrollmentPage(1);
  }, [enrollmentSearch, enrollmentSectionFilter]);

  // Colecciones paginadas
  const paginatedGuardians = useMemo(() => {
    const start = (guardianPage - 1) * guardianPageSize;
    return guardians.slice(start, start + guardianPageSize);
  }, [guardians, guardianPage, guardianPageSize]);

  const paginatedStudents = useMemo(() => {
    const start = (studentPage - 1) * studentPageSize;
    return students.slice(start, start + studentPageSize);
  }, [students, studentPage, studentPageSize]);

  const paginatedEnrollments = useMemo(() => {
    const start = (enrollmentPage - 1) * enrollmentPageSize;
    return enrollments.slice(start, start + enrollmentPageSize);
  }, [enrollments, enrollmentPage, enrollmentPageSize]);

  // Formato Soles
  const formatSoles = (val: number) => {
    return `S/ ${Number(val || 0).toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // =========================================================================
  // CARGA DE DATOS
  // =========================================================================
  const fetchStructure = useCallback(async () => {
    setLoadingStructure(true);
    try {
      const res = await fetch('/api/admin/academic-structure');
      const data = await res.json();
      if (data.success) {
        setAcademicYears(data.academicYears || []);
        const loadedGrades: SchoolGrade[] = data.grades || [];
        setGrades(loadedGrades);
        if (data.teachers) setTeachers(data.teachers || []);
        if (data.stats) setStructureStats(data.stats);
        // Por diseño del sistema, tanto niveles como grados inician reducidos (colapsados por defecto)
      }
    } catch {
      onNotify({ type: 'error', title: 'Error', message: 'No se pudo cargar la estructura escolar.' });
    } finally {
      setLoadingStructure(false);
    }
  }, [onNotify]);

  const fetchGuardians = useCallback(async () => {
    setLoadingGuardians(true);
    try {
      const params = new URLSearchParams();
      if (guardianSearch.trim()) params.append('search', guardianSearch.trim());
      const res = await fetch(`/api/admin/guardians?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setGuardians(data.guardians || []);
      }
    } catch {
      onNotify({ type: 'error', title: 'Error', message: 'No se pudo cargar el directorio de apoderados.' });
    } finally {
      setLoadingGuardians(false);
    }
  }, [guardianSearch, onNotify]);

  const fetchStudents = useCallback(async () => {
    setLoadingStudents(true);
    try {
      const params = new URLSearchParams();
      if (studentSearch.trim()) params.append('search', studentSearch.trim());
      if (studentStatusFilter !== 'ALL') params.append('status', studentStatusFilter);
      const res = await fetch(`/api/admin/students?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setStudents(data.students || []);
      }
    } catch {
      onNotify({ type: 'error', title: 'Error', message: 'No se pudo cargar el padrón de alumnos.' });
    } finally {
      setLoadingStudents(false);
    }
  }, [studentSearch, studentStatusFilter, onNotify]);

  const fetchEnrollments = useCallback(async () => {
    setLoadingEnrollments(true);
    try {
      const params = new URLSearchParams();
      if (enrollmentSearch.trim()) params.append('search', enrollmentSearch.trim());
      if (enrollmentSectionFilter !== 'ALL') params.append('sectionId', enrollmentSectionFilter);
      const res = await fetch(`/api/admin/enrollments?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setEnrollments(data.enrollments || []);
        if (data.stats) setEnrollmentStats(data.stats);
      }
    } catch {
      onNotify({ type: 'error', title: 'Error', message: 'No se pudieron cargar las matrículas.' });
    } finally {
      setLoadingEnrollments(false);
    }
  }, [enrollmentSearch, enrollmentSectionFilter, onNotify]);

  // Cargar según el submódulo activo
  useEffect(() => {
    if (currentSubmodule === 'structure') fetchStructure();
    if (currentSubmodule === 'guardians') fetchGuardians();
    if (currentSubmodule === 'students') {
      fetchStudents();
      fetchGuardians();
    }
    if (currentSubmodule === 'enrollments') {
      fetchEnrollments();
      fetchStructure();
      fetchStudents();
      fetchGuardians();
    }
  }, [currentSubmodule, fetchStructure, fetchGuardians, fetchStudents, fetchEnrollments]);

  // =========================================================================
  // HANDLERS: SUBMÓDULO 1 - ESTRUCTURA ESCOLAR (ACORDEÓN, GRADOS Y SECCIONES)
  // =========================================================================
  const toggleLevel = (lvlKey: string) => {
    setExpandedLevels((prev) => ({
      ...prev,
      [lvlKey]: !prev[lvlKey],
    }));
  };

  const toggleGrade = (gradeId: string) => {
    setExpandedGrades((prev) => ({
      ...prev,
      [gradeId]: !prev[gradeId],
    }));
  };

  const expandAll = () => {
    const nextLevels: Record<string, boolean> = {
      INICIAL: true,
      PRIMARIA: true,
      SECUNDARIA: true,
    };
    const nextGrades: Record<string, boolean> = {};
    grades.forEach((g) => {
      nextGrades[g.id] = true;
    });
    setExpandedLevels(nextLevels);
    setExpandedGrades(nextGrades);
  };

  const collapseAll = () => {
    setExpandedLevels({});
    setExpandedGrades({});
  };

  // Abrir modal para crear nuevo grado
  const handleOpenCreateGrade = (defaultLevel?: 'INICIAL' | 'PRIMARIA' | 'SECUNDARIA') => {
    setEditingGrade(null);
    setGradeFormLevel(defaultLevel || (selectedLevelFilter !== 'ALL' ? selectedLevelFilter : 'PRIMARIA'));
    setGradeFormName('');
    setGradeFormOrder(String((grades.length || 0) + 1));
    setGradeFormEnrollment('350');
    setGradeFormTuition('450');
    setGradeFormEntry('0');
    setGradeModalOpen(true);
  };

  // Abrir modal para editar grado existente
  const handleOpenEditGrade = (grade: SchoolGrade) => {
    setEditingGrade(grade);
    setGradeFormLevel(grade.level);
    setGradeFormName(grade.grade_name);
    setGradeFormOrder(String(grade.grade_order || 1));
    setGradeFormEnrollment(String(grade.default_enrollment_amount || 0));
    setGradeFormTuition(String(grade.default_tuition_amount || 0));
    setGradeFormEntry(String(grade.default_entry_fee || 0));
    setGradeModalOpen(true);
  };

  // Guardar (crear o editar) grado
  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradeFormName.trim()) {
      onNotify({ type: 'warning', title: 'Campo Requerido', message: 'Ingresa el nombre del grado escolar.' });
      return;
    }

    setSavingGrade(true);
    try {
      const res = await fetch('/api/admin/academic-structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_GRADE',
          id: editingGrade?.id || undefined,
          level: gradeFormLevel,
          grade_name: gradeFormName.trim(),
          grade_order: parseInt(gradeFormOrder, 10) || 1,
          default_enrollment_amount: parseFloat(gradeFormEnrollment) || 0,
          default_tuition_amount: parseFloat(gradeFormTuition) || 0,
          default_entry_fee: parseFloat(gradeFormEntry) || 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onNotify({ type: 'success', title: editingGrade ? '¡Grado Actualizado!' : '¡Grado Creado!', message: data.message });
        setGradeModalOpen(false);
        fetchStructure();
      } else {
        onNotify({ type: 'error', title: 'Error', message: data.message });
      }
    } catch {
      onNotify({ type: 'error', title: 'Error', message: 'No se pudo guardar la información del grado escolar.' });
    } finally {
      setSavingGrade(false);
    }
  };

  // Abrir modal estilizado para confirmar eliminación de grado
  const handleDeleteGrade = (grade: SchoolGrade) => {
    const totalEnrolled = (grade.sections || []).reduce((sum, s) => sum + Number(s.enrolled_count || 0), 0);
    if (totalEnrolled > 0) {
      onNotify({
        type: 'warning',
        title: 'Acción Bloqueada',
        message: `El grado ${grade.grade_name} tiene ${totalEnrolled} alumno(s) matriculado(s). No se puede eliminar mientras tenga alumnos.`,
      });
      return;
    }

    setConfirmDeleteModal({
      isOpen: true,
      type: 'grade',
      title: '¿Eliminar Grado Escolar?',
      subtitle: `Nivel ${grade.level} • Orden #${grade.grade_order}`,
      itemName: grade.grade_name,
      itemDetails: [
        { label: 'Nivel Educativo', value: grade.level },
        { label: 'Aulas Vinculadas', value: `${grade.sections?.length || 0} aula(s)` },
        { label: 'Pensión Mensual', value: formatSoles(grade.default_tuition_amount) },
        { label: 'Matrícula Base', value: formatSoles(grade.default_enrollment_amount) },
      ],
      warningMessage: `Se eliminará permanentemente el grado "${grade.grade_name}" y sus aulas vacías asociadas. Esta acción es irreversible.`,
      targetId: grade.id,
    });
  };

  // Abrir modal para crear nueva sección en un grado
  const handleOpenCreateSection = (gradeId?: string) => {
    const targetGrade = grades.find((g) => g.id === gradeId) || grades[0];
    const targetGradeId = targetGrade?.id || '';
    setEditingSection(null);
    setSecGradeId(targetGradeId);

    // Calcular siguiente letra de sección
    const existingLetters = (targetGrade?.sections || []).map((s) => s.section_letter.toUpperCase());
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nextLetter = alphabet.split('').find((l) => !existingLetters.includes(l)) || 'B';

    setSecLetter(nextLetter);
    setSecShift('MAÑANA');
    setSecCapacity('30');
    setSecTutorUserId('');
    setSecClassroom('');
    setSectionModalOpen(true);
  };

  // Abrir modal para editar sección existente
  const handleOpenEditSection = (sec: SchoolSection) => {
    setEditingSection(sec);
    setSecGradeId(sec.grade_id);
    setSecLetter(sec.section_letter);
    setSecShift(sec.shift || 'MAÑANA');
    setSecCapacity(String(sec.capacity || 30));
    setSecTutorUserId(sec.tutor_user_id || '');
    setSecClassroom(sec.classroom_location || '');
    setSectionModalOpen(true);
  };

  // Guardar (crear o editar) sección
  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeYear = academicYears.find((y) => y.status === 'ACTIVE') || academicYears[0];
    if (!secGradeId) {
      onNotify({ type: 'warning', title: 'Campo Requerido', message: 'Debes seleccionar el grado escolar.' });
      return;
    }

    setSavingSection(true);
    try {
      const res = await fetch('/api/admin/academic-structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_SECTION',
          id: editingSection?.id || undefined,
          academic_year_id: activeYear?.id,
          grade_id: secGradeId,
          section_letter: secLetter.trim().toUpperCase() || 'A',
          shift: secShift,
          capacity: parseInt(secCapacity, 10) || 30,
          tutor_user_id: secTutorUserId || null,
          classroom_location: secClassroom.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onNotify({ type: 'success', title: editingSection ? '¡Aula Actualizada!' : '¡Aula Creada!', message: data.message });
        setSectionModalOpen(false);
        fetchStructure();
      } else {
        onNotify({ type: 'error', title: 'Error', message: data.message });
      }
    } catch {
      onNotify({ type: 'error', title: 'Error', message: 'No se pudo guardar la sección.' });
    } finally {
      setSavingSection(false);
    }
  };

  // Abrir modal estilizado para confirmar eliminación de sección
  const handleDeleteSection = (sec: SchoolSection) => {
    if (Number(sec.enrolled_count || 0) > 0) {
      onNotify({
        type: 'warning',
        title: 'Acción Bloqueada',
        message: `El aula ${sec.full_name} tiene ${sec.enrolled_count} alumno(s) matriculado(s). No se puede eliminar mientras tenga alumnos.`,
      });
      return;
    }

    setConfirmDeleteModal({
      isOpen: true,
      type: 'section',
      title: '¿Eliminar Aula / Sección?',
      subtitle: `Turno ${sec.shift} • Capacidad ${sec.capacity} alumnos`,
      itemName: sec.full_name,
      itemDetails: [
        { label: 'Identificador', value: `Sección ${sec.section_letter}` },
        { label: 'Turno', value: sec.shift || 'MAÑANA' },
        { label: 'Capacidad Aprobada', value: `${sec.capacity} vacantes` },
        { label: 'Tutor Responsable', value: sec.tutor_name ? `${sec.tutor_name}${sec.tutor_username ? ` (@${sec.tutor_username})` : ''}` : 'Sin tutor asignado' },
        { label: 'Ubicación Física', value: sec.classroom_location || 'Sin salón asignado' },
      ],
      warningMessage: `Se eliminará el aula "${sec.full_name}" de la estructura escolar del periodo activo. Esta acción no se puede deshacer.`,
      targetId: sec.id,
    });
  };

  // Ejecutar eliminación confirmada mediante modal oficial del sistema
  const executeDelete = async () => {
    if (!confirmDeleteModal.isOpen || !confirmDeleteModal.targetId) return;
    setExecutingDelete(true);
    try {
      const isGrade = confirmDeleteModal.type === 'grade';
      const res = await fetch('/api/admin/academic-structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isGrade ? 'DELETE_GRADE' : 'DELETE_SECTION',
          ...(isGrade
            ? { grade_id: confirmDeleteModal.targetId }
            : { section_id: confirmDeleteModal.targetId }),
        }),
      });
      const data = await res.json();
      if (data.success) {
        onNotify({
          type: 'success',
          title: isGrade ? '¡Grado Eliminado!' : '¡Aula Eliminada!',
          message: data.message,
        });
        setConfirmDeleteModal((prev) => ({ ...prev, isOpen: false }));
        fetchStructure();
      } else {
        onNotify({ type: 'error', title: 'Error al Eliminar', message: data.message });
      }
    } catch {
      onNotify({
        type: 'error',
        title: 'Error de Red',
        message: 'No se pudo conectar con el servidor para eliminar el registro.',
      });
    } finally {
      setExecutingDelete(false);
    }
  };

  // =========================================================================
  // HANDLERS: SUBMÓDULO 2 - FAMILIAS & APODERADOS
  // =========================================================================
  const handleSaveGuardian = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGuardian(true);
    try {
      const res = await fetch('/api/admin/guardians', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingGuardian ? editingGuardian.id : undefined,
          document_type: gDocType,
          document_number: gDocNum.trim(),
          first_name: gFirstName.trim(),
          last_name: gLastName.trim(),
          relationship: gRelationship,
          phone: gPhone.trim(),
          alt_phone: gAltPhone.trim() || null,
          email: gEmail.trim() || null,
          address: gAddress.trim() || null,
          occupation: gOccupation.trim() || null,
          billing_tax_id: gBillingTaxId.trim() || null,
          billing_name: gBillingName.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onNotify({ type: 'success', title: 'Apoderado Guardado', message: data.message });
        setGuardianModalOpen(false);
        setEditingGuardian(null);
        fetchGuardians();
      } else {
        onNotify({ type: 'error', title: 'Error', message: data.message });
      }
    } catch {
      onNotify({ type: 'error', title: 'Error', message: 'No se pudo guardar el apoderado.' });
    } finally {
      setSavingGuardian(false);
    }
  };

  // =========================================================================
  // HANDLERS: SUBMÓDULO 3 - ESTUDIANTES
  // =========================================================================
  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingStudent(true);
    try {
      const res = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingStudent ? editingStudent.id : undefined,
          guardian_id: sGuardianId || null,
          document_type: sDocType,
          document_number: sDocNum.trim(),
          first_name: sFirstName.trim(),
          last_name: sLastName.trim(),
          gender: sGender,
          birth_date: sBirthDate || null,
          blood_type: sBloodType || null,
          allergies_medical: sAllergies.trim() || null,
          emergency_contact_phone: sEmergencyPhone.trim() || null,
          health_insurance: sHealthInsurance || null,
          previous_school: sPreviousSchool.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onNotify({ type: 'success', title: 'Estudiante Guardado', message: data.message });
        setStudentModalOpen(false);
        setEditingStudent(null);
        fetchStudents();
      } else {
        onNotify({ type: 'error', title: 'Error', message: data.message });
      }
    } catch {
      onNotify({ type: 'error', title: 'Error', message: 'No se pudo guardar la ficha del estudiante.' });
    } finally {
      setSavingStudent(false);
    }
  };

  // =========================================================================
  // HANDLERS: SUBMÓDULO 4 - MATRÍCULA ESCOLAR
  // =========================================================================
  // Al seleccionar sección en matrícula, cargar tarifas base automáticamente
  const handleSelectSectionForEnrollment = (secId: string) => {
    setEnrSectionId(secId);
    let foundGrade: SchoolGrade | undefined;
    for (const g of grades) {
      if (g.sections?.some((s) => s.id === secId)) {
        foundGrade = g;
        break;
      }
    }
    if (foundGrade) {
      setEnrFee(String(foundGrade.default_enrollment_amount || 350));
      setEnrMonthlyTuition(String(foundGrade.default_tuition_amount || 400));
      setEnrEntryFee(String(foundGrade.default_entry_fee || 0));
    }
  };

  // Al seleccionar estudiante, auto-seleccionar su apoderado titular
  const handleSelectStudentForEnrollment = (stuId: string) => {
    setEnrStudentId(stuId);
    const stu = students.find((s) => s.id === stuId);
    if (stu?.guardian_id) {
      setEnrGuardianId(stu.guardian_id);
    }
  };

  const handleCreateEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeYear = academicYears.find((y) => y.status === 'ACTIVE') || academicYears[0];
    if (!activeYear) {
      onNotify({ type: 'error', title: 'Error', message: 'No hay un año escolar activo disponible.' });
      return;
    }

    setSavingEnrollment(true);
    try {
      const res = await fetch('/api/admin/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_ENROLLMENT',
          academic_year_id: activeYear.id,
          student_id: enrStudentId,
          guardian_id: enrGuardianId,
          section_id: enrSectionId,
          enrollment_type: enrType,
          enrollment_date: enrDate,
          enrollment_fee: parseFloat(enrFee) || 0,
          pay_enrollment_now: enrPayNow,
          enrollment_payment_method: enrPayMethod,
          enrollment_receipt_number: enrPayReceipt.trim() || undefined,
          entry_fee: parseFloat(enrEntryFee) || 0,
          monthly_tuition_fee: parseFloat(enrMonthlyTuition) || 0,
          discount_type: enrDiscountType,
          discount_percentage: parseFloat(enrDiscountPct) || 0,
          notes: enrNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onNotify({ type: 'success', title: '¡Matrícula Exitosa!', message: data.message });
        setNewEnrollModalOpen(false);
        setEnrStudentId('');
        setEnrSectionId('');
        setEnrPayReceipt('');
        setEnrNotes('');
        fetchEnrollments();
        fetchStructure();
        fetchStudents();
      } else {
        onNotify({ type: 'error', title: 'Error al Matricular', message: data.message });
      }
    } catch {
      onNotify({ type: 'error', title: 'Error', message: 'No se pudo procesar la matrícula escolar.' });
    } finally {
      setSavingEnrollment(false);
    }
  };

  // Filtrar grados según nivel
  const filteredGrades = useMemo(() => {
    if (selectedLevelFilter === 'ALL') return grades;
    return grades.filter((g) => g.level === selectedLevelFilter);
  }, [grades, selectedLevelFilter]);

  // Niveles educativos visibles según el filtro seleccionado
  const visibleLevels = useMemo(() => {
    if (selectedLevelFilter === 'ALL') return LEVEL_DEFINITIONS;
    return LEVEL_DEFINITIONS.filter((lvl) => lvl.key === selectedLevelFilter);
  }, [selectedLevelFilter]);

  // Lista plana de secciones disponibles para selectores
  const allSectionsFlat = useMemo(() => {
    const list: SchoolSection[] = [];
    grades.forEach((g) => {
      if (g.sections) list.push(...g.sections);
    });
    return list;
  }, [grades]);

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* CABECERA OFICIAL: PILAR ADMINISTRATIVO                                    */}
      {/* ========================================================================= */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#223a5e] via-[#1c2f4c] to-[#16253d] text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm border border-slate-700/50">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-300 text-xs font-bold mb-2">
            <ShieldCheck className="w-4 h-4 text-[#2fbf71]" />
            <span>Pilar Administrativo Central</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span>Gestión Escolar & Admisión</span>
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Estructura de aulas, directorio de familias, padrón escolar y contratos de matrícula con vinculación financiera directa.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (currentSubmodule === 'structure') fetchStructure();
              if (currentSubmodule === 'guardians') fetchGuardians();
              if (currentSubmodule === 'students') fetchStudents();
              if (currentSubmodule === 'enrollments') fetchEnrollments();
            }}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition cursor-pointer"
            title="Refrescar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loadingStructure || loadingGuardians || loadingStudents || loadingEnrollments ? 'animate-spin text-[#2fbf71]' : ''}`} />
          </button>

          {currentSubmodule === 'enrollments' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIntegralWizardOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-[#2fbf71] hover:bg-[#26995b] text-white text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#2fbf71]/20"
              >
                <Sparkles className="w-4 h-4" />
                <span>+ Flujo Integral de Matrícula</span>
              </button>
              <button
                onClick={() => setNewEnrollModalOpen(true)}
                className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                title="Registro directo rápido"
              >
                <PlusCircle className="w-3.5 h-3.5 text-[#2fbf71]" />
                <span className="hidden sm:inline">Registro Rápido</span>
              </button>
            </div>
          )}

          {currentSubmodule === 'guardians' && (
            <button
              onClick={() => {
                setEditingGuardian(null);
                setGDocNum('');
                setGFirstName('');
                setGLastName('');
                setGPhone('');
                setGAltPhone('');
                setGEmail('');
                setGAddress('');
                setGOccupation('');
                setGBillingTaxId('');
                setGBillingName('');
                setGuardianModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-[#2fbf71] hover:bg-[#26995b] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#2fbf71]/20"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Nuevo Apoderado</span>
            </button>
          )}

          {currentSubmodule === 'students' && (
            <button
              onClick={() => {
                setEditingStudent(null);
                setSDocNum('');
                setSFirstName('');
                setSLastName('');
                setSBirthDate('');
                setSAllergies('');
                setSEmergencyPhone('');
                setSPreviousSchool('');
                setSGuardianId('');
                setStudentModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-[#2fbf71] hover:bg-[#26995b] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#2fbf71]/20"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Nuevo Estudiante</span>
            </button>
          )}

          {currentSubmodule === 'structure' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenCreateGrade()}
                className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-white/20"
              >
                <PlusCircle className="w-4 h-4 text-emerald-300" />
                <span>+ Nuevo Grado</span>
              </button>
              <button
                onClick={() => handleOpenCreateSection()}
                className="px-4 py-2.5 rounded-xl bg-[#2fbf71] hover:bg-[#26995b] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#2fbf71]/20"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Nueva Sección</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* NAVEGACIÓN ENTRE LOS 4 SUBMÓDULOS ADMINISTRATIVOS                         */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => handleSelectSubmodule('structure')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-center gap-3 ${
            currentSubmodule === 'structure'
              ? 'bg-[#223a5e] text-white border-[#223a5e] shadow-md shadow-[#223a5e]/20'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className={`p-2.5 rounded-xl shrink-0 ${currentSubmodule === 'structure' ? 'bg-white/10 text-cyan-400' : 'bg-cyan-50 text-cyan-600'}`}>
            <Layers className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold truncate">1. Estructura & Aulas</p>
            <p className={`text-[10px] truncate ${currentSubmodule === 'structure' ? 'text-slate-300' : 'text-slate-400'}`}>
              Grados, vacantes y tarifas
            </p>
          </div>
        </button>

        <button
          onClick={() => handleSelectSubmodule('guardians')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-center gap-3 ${
            currentSubmodule === 'guardians'
              ? 'bg-[#223a5e] text-white border-[#223a5e] shadow-md shadow-[#223a5e]/20'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className={`p-2.5 rounded-xl shrink-0 ${currentSubmodule === 'guardians' ? 'bg-white/10 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold truncate">2. Apoderados & Familias</p>
            <p className={`text-[10px] truncate ${currentSubmodule === 'guardians' ? 'text-slate-300' : 'text-slate-400'}`}>
              WhatsApp y facturación
            </p>
          </div>
        </button>

        <button
          onClick={() => handleSelectSubmodule('students')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-center gap-3 ${
            currentSubmodule === 'students'
              ? 'bg-[#223a5e] text-white border-[#223a5e] shadow-md shadow-[#223a5e]/20'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className={`p-2.5 rounded-xl shrink-0 ${currentSubmodule === 'students' ? 'bg-white/10 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold truncate">3. Padrón de Alumnos</p>
            <p className={`text-[10px] truncate ${currentSubmodule === 'students' ? 'text-slate-300' : 'text-slate-400'}`}>
              Fichas médicas y MINEDU
            </p>
          </div>
        </button>

        <button
          onClick={() => handleSelectSubmodule('enrollments')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-center gap-3 ${
            currentSubmodule === 'enrollments'
              ? 'bg-[#223a5e] text-white border-[#223a5e] shadow-md shadow-[#223a5e]/20'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className={`p-2.5 rounded-xl shrink-0 ${currentSubmodule === 'enrollments' ? 'bg-white/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
            <ClipboardList className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold truncate">4. Admisión & Matrícula</p>
            <p className={`text-[10px] truncate ${currentSubmodule === 'enrollments' ? 'text-slate-300' : 'text-slate-400'}`}>
              Contratos y pensiones
            </p>
          </div>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUBMÓDULO 1: ESTRUCTURA ESCOLAR & AULAS                                   */}
      {/* ========================================================================= */}
      {currentSubmodule === 'structure' && (
        <div className="space-y-6">
          {/* Métricas de Capacidad */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase">Aulas Habilitadas</span>
              <p className="text-2xl font-black text-[#223a5e] mt-1 font-mono">{structureStats.totalSections}</p>
              <p className="text-xs text-slate-500 mt-0.5">{structureStats.totalGrades} Grados académicos</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase">Capacidad Total</span>
              <p className="text-2xl font-black text-[#223a5e] mt-1 font-mono">{structureStats.totalCapacity} Vacantes</p>
              <p className="text-xs text-slate-500 mt-0.5">Aforo escolar aprobado</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase">Alumnos Matriculados</span>
              <p className="text-2xl font-black text-[#26995b] mt-1 font-mono">{structureStats.totalEnrolled}</p>
              <p className="text-xs text-slate-500 mt-0.5">{structureStats.occupancyRate}% Ocupación institucional</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase">Vacantes Disponibles</span>
              <p className="text-2xl font-black text-cyan-600 mt-1 font-mono">{structureStats.availableVacancies}</p>
              <p className="text-xs text-slate-500 mt-0.5">Disponibles para matrícula</p>
            </div>
          </div>

          {/* Barra de Filtros y Acciones del Acordeón */}
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setSelectedLevelFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedLevelFilter === 'ALL' ? 'bg-white text-[#223a5e] shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Todos los Niveles ({grades.length})
              </button>
              <button
                onClick={() => setSelectedLevelFilter('INICIAL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedLevelFilter === 'INICIAL' ? 'bg-[#223a5e] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Inicial ({grades.filter((g) => g.level === 'INICIAL').length})
              </button>
              <button
                onClick={() => setSelectedLevelFilter('PRIMARIA')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedLevelFilter === 'PRIMARIA' ? 'bg-[#223a5e] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Primaria ({grades.filter((g) => g.level === 'PRIMARIA').length})
              </button>
              <button
                onClick={() => setSelectedLevelFilter('SECUNDARIA')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedLevelFilter === 'SECUNDARIA' ? 'bg-[#223a5e] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Secundaria ({grades.filter((g) => g.level === 'SECUNDARIA').length})
              </button>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  const anyOpen =
                    Object.values(expandedLevels).some(Boolean) ||
                    Object.values(expandedGrades).some(Boolean);
                  if (anyOpen) collapseAll();
                  else expandAll();
                }}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                title="Expandir o colapsar todos los niveles y grados"
              >
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {Object.values(expandedLevels).some(Boolean) ||
                  Object.values(expandedGrades).some(Boolean)
                    ? 'Colapsar Todo'
                    : 'Expandir Todo'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenCreateGrade()}
                className="px-3.5 py-1.5 rounded-xl bg-white border border-[#2fbf71] text-[#26995b] hover:bg-[#e6f9ef] text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Grado</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenCreateSection()}
                className="px-3.5 py-1.5 rounded-xl bg-[#2fbf71] hover:bg-[#26995b] text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm shadow-[#2fbf71]/20"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Sección</span>
              </button>
            </div>
          </div>

          {/* ACORDEÓN PRINCIPAL POR NIVEL EDUCATIVO (REDUCIDO POR DEFECTO) */}
          {loadingStructure ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#2fbf71]" />
              <p className="text-xs font-semibold">Cargando estructura y capacidad escolar...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {visibleLevels.map((lvl) => {
              const lvlGrades = grades.filter((g) => g.level === lvl.key);
              const lvlSectionsCount = lvlGrades.reduce((sum, g) => sum + (g.sections?.length || 0), 0);
              const lvlCapacity = lvlGrades.reduce(
                (sum, g) => sum + (g.sections || []).reduce((sSum, s) => sSum + s.capacity, 0),
                0
              );
              const lvlEnrolled = lvlGrades.reduce(
                (sum, g) => sum + (g.sections || []).reduce((sSum, s) => sSum + s.enrolled_count, 0),
                0
              );
              const lvlVacancies = Math.max(0, lvlCapacity - lvlEnrolled);
              const lvlOccupancyPct = lvlCapacity > 0 ? Math.round((lvlEnrolled / lvlCapacity) * 100) : 0;
              const isLevelExpanded = Boolean(expandedLevels[lvl.key]);
              const IconComp = lvl.icon;

              return (
                <div
                  key={lvl.key}
                  className="rounded-3xl bg-white border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all overflow-hidden"
                >
                  {/* Encabezado del Nivel Educativo */}
                  <div
                    onClick={() => toggleLevel(lvl.key)}
                    className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer select-none hover:bg-slate-50/70 transition"
                  >
                    {/* Izquierda: Chevron + Icono + Nombre del Nivel + Badges */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`p-2 rounded-xl transition-transform duration-200 shrink-0 ${
                          isLevelExpanded ? 'rotate-180 bg-[#223a5e] text-white' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </div>

                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${lvl.iconBg}`}>
                        <IconComp className="w-5 h-5" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-[#223a5e] leading-tight">
                            {lvl.name}
                          </h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${lvl.badgeTheme}`}>
                            {lvl.key}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold">
                            {lvlGrades.length} {lvlGrades.length === 1 ? 'Grado' : 'Grados'}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[11px] font-medium">
                            {lvlSectionsCount} {lvlSectionsCount === 1 ? 'Aula' : 'Aulas'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 truncate">
                          {lvl.shortDescription}
                        </p>
                      </div>
                    </div>

                    {/* Derecha: Aforo Global del Nivel + Acción Rápida */}
                    <div
                      className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="text-right">
                        <div className="flex items-center gap-2 justify-end text-xs font-mono">
                          <span className="font-bold text-slate-700">
                            {lvlEnrolled} / {lvlCapacity} Alumnos
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              lvlVacancies === 0
                                ? 'bg-rose-100 text-rose-700'
                                : lvlOccupancyPct >= 80
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {lvlVacancies === 0 ? 'Sin vacantes' : `${lvlVacancies} libres`}
                          </span>
                        </div>
                        <div className="w-32 sm:w-36 h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden ml-auto">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              lvlOccupancyPct >= 100
                                ? 'bg-rose-500'
                                : lvlOccupancyPct >= 80
                                ? 'bg-amber-500'
                                : 'bg-[#2fbf71]'
                            }`}
                            style={{ width: `${Math.min(100, lvlOccupancyPct)}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenCreateGrade(lvl.key)}
                          className="px-3 py-1.5 rounded-xl bg-white border border-[#2fbf71] hover:bg-[#e6f9ef] text-[#26995b] text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                          title={`Agregar nuevo grado a ${lvl.name}`}
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">+ Grado</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Cuerpo Desplegable del Nivel: Lista de Grados en Acordeón */}
                  {isLevelExpanded && (
                    <div className="p-4 sm:p-5 pt-3 border-t border-slate-100 bg-slate-50/50 space-y-3">
                      {lvlGrades.length > 0 ? (
                        lvlGrades.map((grade) => {
                          const isGradeExpanded = Boolean(expandedGrades[grade.id]);
                          const sections = grade.sections || [];
                          const totalSecEnrolled = sections.reduce((sum, s) => sum + s.enrolled_count, 0);
                          const totalSecCap = sections.reduce((sum, s) => sum + s.capacity, 0);
                          const freeVac = Math.max(0, totalSecCap - totalSecEnrolled);
                          const occupancyPct = totalSecCap > 0 ? Math.round((totalSecEnrolled / totalSecCap) * 100) : 0;

                          return (
                            <div
                              key={grade.id}
                              className="rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-slate-300 transition overflow-hidden"
                            >
                              {/* Encabezado del Acordeón del Grado */}
                              <div
                                onClick={() => toggleGrade(grade.id)}
                                className="p-4 sm:p-4.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer select-none hover:bg-slate-50/70 transition"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div
                                    className={`p-1.5 rounded-lg transition-transform duration-200 shrink-0 ${
                                      isGradeExpanded ? 'rotate-180 bg-[#223a5e] text-white' : 'bg-slate-100 text-slate-500'
                                    }`}
                                  >
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  </div>

                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h4 className="text-sm font-bold text-[#223a5e] leading-none">
                                        {grade.grade_name}
                                      </h4>
                                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-bold">
                                        {sections.length} {sections.length === 1 ? 'Aula' : 'Aulas'}
                                      </span>
                                    </div>

                                    {/* Tarifario Base del Grado */}
                                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1 font-medium">
                                      <span>
                                        Matrícula:{' '}
                                        <strong className="text-slate-800 font-mono">{formatSoles(grade.default_enrollment_amount)}</strong>
                                      </span>
                                      <span className="text-slate-300">&bull;</span>
                                      <span>
                                        Pensión:{' '}
                                        <strong className="text-[#26995b] font-mono">{formatSoles(grade.default_tuition_amount)}</strong>
                                      </span>
                                      {Number(grade.default_entry_fee || 0) > 0 && (
                                        <>
                                          <span className="text-slate-300">&bull;</span>
                                          <span>
                                            Ingreso: <strong className="text-slate-800 font-mono">{formatSoles(grade.default_entry_fee)}</strong>
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div
                                  className="flex items-center gap-3.5 w-full md:w-auto justify-between md:justify-end shrink-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {/* Gauge de Ocupación del Grado */}
                                  <div className="text-right">
                                    <div className="flex items-center gap-2 justify-end text-xs font-mono">
                                      <span className="font-bold text-slate-700">
                                        {totalSecEnrolled} / {totalSecCap}
                                      </span>
                                      <span
                                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                          freeVac === 0
                                            ? 'bg-rose-100 text-rose-700'
                                            : occupancyPct >= 80
                                            ? 'bg-amber-100 text-amber-800'
                                            : 'bg-emerald-100 text-emerald-800'
                                        }`}
                                      >
                                        {freeVac === 0 ? 'Sin vacantes' : `${freeVac} libres`}
                                      </span>
                                    </div>
                                    <div className="w-28 sm:w-32 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden ml-auto">
                                      <div
                                        className={`h-full rounded-full transition-all duration-300 ${
                                          occupancyPct >= 100
                                            ? 'bg-rose-500'
                                            : occupancyPct >= 80
                                            ? 'bg-amber-500'
                                            : 'bg-[#2fbf71]'
                                        }`}
                                        style={{ width: `${Math.min(100, occupancyPct)}%` }}
                                      />
                                    </div>
                                  </div>

                                  {/* Botones de Acción sobre el Grado */}
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenCreateSection(grade.id)}
                                      className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#26995b] text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-emerald-200"
                                      title="Agregar nueva sección a este grado"
                                    >
                                      <PlusCircle className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">Nueva Aula</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditGrade(grade)}
                                      className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                                      title="Editar grado escolar"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDeleteGrade(grade)}
                                      disabled={totalSecEnrolled > 0}
                                      className={`p-1.5 rounded-xl transition cursor-pointer ${
                                        totalSecEnrolled > 0
                                          ? 'opacity-30 cursor-not-allowed bg-slate-100 text-slate-400'
                                          : 'bg-rose-50 hover:bg-rose-100 text-rose-600'
                                      }`}
                                      title={
                                        totalSecEnrolled > 0
                                          ? `No se puede eliminar: tiene ${totalSecEnrolled} alumnos matriculados`
                                          : 'Eliminar grado escolar'
                                      }
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Cuerpo Desplegable del Grado: Aulas / Secciones */}
                              {isGradeExpanded && (
                                <div className="px-5 pb-5 pt-3 border-t border-slate-100 bg-slate-50/50 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                      Aulas Habilitadas & Asignación de Vacantes
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenCreateSection(grade.id)}
                                      className="text-xs font-bold text-[#26995b] hover:underline cursor-pointer flex items-center gap-1"
                                    >
                                      <PlusCircle className="w-3.5 h-3.5" />
                                      <span>Agregar otra aula a {grade.grade_name}</span>
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {sections.length > 0 ? (
                                      sections.map((sec) => (
                                        <div
                                          key={sec.id}
                                          className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-[#2fbf71]/50 transition flex flex-col justify-between space-y-3"
                                        >
                                          <div className="flex items-start justify-between gap-2">
                                            <div>
                                              <div className="flex items-center gap-2">
                                                <span className="px-2.5 py-0.5 rounded-lg bg-purple-100 text-purple-900 font-black text-xs">
                                                  Sección {sec.section_letter}
                                                </span>
                                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold text-[10px]">
                                                  Turno {sec.shift}
                                                </span>
                                              </div>
                                              <h5 className="text-xs font-bold text-[#223a5e] mt-1.5 leading-snug">
                                                {sec.full_name}
                                              </h5>
                                            </div>

                                            <div className="flex items-center gap-1 shrink-0">
                                              <button
                                                type="button"
                                                onClick={() => handleOpenEditSection(sec)}
                                                className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                                                title="Editar sección"
                                              >
                                                <Edit2 className="w-3.5 h-3.5" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleDeleteSection(sec)}
                                                disabled={sec.enrolled_count > 0}
                                                className={`p-1 rounded-lg transition cursor-pointer ${
                                                  sec.enrolled_count > 0
                                                    ? 'opacity-30 cursor-not-allowed bg-slate-100 text-slate-400'
                                                    : 'bg-rose-50 hover:bg-rose-100 text-rose-600'
                                                }`}
                                                title={
                                                  sec.enrolled_count > 0
                                                    ? `Tiene ${sec.enrolled_count} alumno(s) inscritos`
                                                    : 'Eliminar sección'
                                                }
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          </div>

                                          <div className="space-y-2 text-[11px] text-slate-600 border-t border-slate-100 pt-2">
                                            <div>
                                              <div className="flex items-center justify-between text-slate-400 mb-1">
                                                <span className="font-medium text-[10px] uppercase">Profesor Tutor:</span>
                                                {sec.tutor_user_id ? (
                                                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                                    <UserCheck className="w-2.5 h-2.5 text-[#2fbf71]" />
                                                    <span>Docente Activo</span>
                                                  </span>
                                                ) : (
                                                  <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded">
                                                    Sin asignar
                                                  </span>
                                                )}
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-lg bg-[#223a5e]/10 text-[#223a5e] flex items-center justify-center font-bold text-[10px] shrink-0 overflow-hidden">
                                                  {sec.tutor_avatar ? (
                                                    <img
                                                      src={sec.tutor_avatar}
                                                      alt={sec.tutor_name || 'Tutor'}
                                                      className="w-full h-full object-cover"
                                                    />
                                                  ) : (
                                                    <span>{(sec.tutor_name || 'P').charAt(0)}</span>
                                                  )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                  <p className="font-bold text-slate-800 truncate text-[11px] leading-tight">
                                                    {sec.tutor_name || 'Sin profesor tutor'}
                                                  </p>
                                                  {sec.tutor_username && (
                                                    <p className="text-[10px] text-slate-400 font-mono truncate">
                                                      @{sec.tutor_username}
                                                    </p>
                                                  )}
                                                </div>
                                              </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                                              <span className="text-slate-400">Salón / Aula:</span>
                                              <span className="font-semibold text-slate-800 truncate max-w-[140px]">
                                                {sec.classroom_location || 'Sin salón asignado'}
                                              </span>
                                            </div>
                                          </div>

                                          <div className="pt-2 border-t border-slate-100">
                                            <div className="flex justify-between text-xs font-mono font-bold mb-1">
                                              <span className="text-slate-500">Aforo</span>
                                              <span className="text-slate-800">
                                                {sec.enrolled_count} / {sec.capacity} alumnos
                                              </span>
                                            </div>
                                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                              <div
                                                className={`h-full rounded-full transition-all duration-300 ${
                                                  sec.enrolled_count >= sec.capacity ? 'bg-rose-500' : 'bg-[#2fbf71]'
                                                }`}
                                                style={{
                                                  width: `${Math.min(100, (sec.enrolled_count / sec.capacity) * 100)}%`,
                                                }}
                                              />
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] mt-1.5">
                                              <span className="text-slate-400 font-medium">
                                                {Math.round((sec.enrolled_count / sec.capacity) * 100)}% ocupado
                                              </span>
                                              <span
                                                className={`font-bold ${
                                                  sec.available_vacancies === 0
                                                    ? 'text-rose-600'
                                                    : 'text-emerald-700'
                                                }`}
                                              >
                                                {sec.available_vacancies === 0
                                                  ? 'Completo'
                                                  : `${sec.available_vacancies} vacantes libres`}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="col-span-full p-6 text-center bg-white rounded-2xl border border-dashed border-slate-300 text-xs text-slate-500 space-y-2">
                                        <p className="font-medium text-slate-600">
                                          Este grado aún no cuenta con aulas o secciones habilitadas.
                                        </p>
                                        <button
                                          type="button"
                                          onClick={() => handleOpenCreateSection(grade.id)}
                                          className="px-4 py-2 rounded-xl bg-[#2fbf71] hover:bg-[#26995b] text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
                                        >
                                          <PlusCircle className="w-4 h-4" />
                                          <span>Crear Sección A para {grade.grade_name}</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs space-y-3">
                          <p>No se encontraron grados escolares en {lvl.name}.</p>
                          <button
                            type="button"
                            onClick={() => handleOpenCreateGrade(lvl.key)}
                            className="px-4 py-2 rounded-xl bg-[#2fbf71] text-white font-bold text-xs hover:bg-[#26995b] cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
                          >
                            <PlusCircle className="w-4 h-4" />
                            <span>+ Crear Primer Grado en {lvl.name}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBMÓDULO 2: APODERADOS & FAMILIAS                                        */}
      {/* ========================================================================= */}
      {currentSubmodule === 'guardians' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={guardianSearch}
                onChange={(e) => setGuardianSearch(e.target.value)}
                placeholder="Buscar apoderado por DNI, Nombres o Teléfono..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#2fbf71]"
              />
            </div>
            <div className="text-xs font-bold text-slate-500">
              Total Registrados: <strong className="text-[#223a5e]">{guardians.length} Apoderados</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedGuardians.map((g) => (
              <div key={g.id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-[#2fbf71]/50 transition flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="text-sm font-bold text-[#223a5e] leading-snug">
                        {g.last_name}, {g.first_name}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {g.document_type}: {g.document_number} &bull; {g.relationship}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {g.students_count || 0} Hijo(s)
                    </span>
                  </div>

                  <div className="space-y-1.5 py-2.5 border-y border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-[#2fbf71] shrink-0" />
                      <span className="font-mono font-bold text-slate-800">{g.phone}</span>
                      <a
                        href={`https://wa.me/51${g.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-bold text-emerald-600 hover:underline flex items-center gap-0.5 ml-auto"
                      >
                        <span>WhatsApp</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                    {g.email && (
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-[11px] truncate">{g.email}</span>
                      </div>
                    )}
                    {g.address && (
                      <div className="flex items-center gap-2 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-[11px] truncate">{g.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Lista de Hijos Asociados */}
                  <div className="mt-2.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Estudiantes a Cargo:
                    </span>
                    {g.students && g.students.length > 0 ? (
                      <div className="space-y-1">
                        {g.students.map((stu) => (
                          <div key={stu.id} className="p-1.5 rounded-lg bg-slate-50 border border-slate-100 text-[11px] font-semibold text-slate-700 flex justify-between items-center">
                            <span>{stu.first_name} {stu.last_name}</span>
                            <span className="text-[9px] font-mono text-slate-400">DNI: {stu.document_number}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 italic">Sin hijos inscritos aún.</p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 mt-3 flex justify-end">
                  <button
                    onClick={() => {
                      setEditingGuardian(g);
                      setGDocType(g.document_type);
                      setGDocNum(g.document_number);
                      setGFirstName(g.first_name);
                      setGLastName(g.last_name);
                      setGRelationship(g.relationship);
                      setGPhone(g.phone);
                      setGAltPhone(g.alt_phone || '');
                      setGEmail(g.email || '');
                      setGAddress(g.address || '');
                      setGOccupation(g.occupation || '');
                      setGBillingTaxId(g.billing_tax_id || '');
                      setGBillingName(g.billing_name || '');
                      setGuardianModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Editar Ficha</span>
                  </button>
                </div>
              </div>
            ))}
            {loadingGuardians && (
              <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#2fbf71]" />
                <p className="text-xs font-semibold">Cargando directorio de apoderados...</p>
              </div>
            )}
            {guardians.length === 0 && !loadingGuardians && (
              <div className="col-span-full p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
                No se encontraron apoderados registrados con esos criterios.
              </div>
            )}
          </div>

          {guardians.length > 0 && (
            <Pagination
              currentPage={guardianPage}
              totalItems={guardians.length}
              itemsPerPage={guardianPageSize}
              onPageChange={setGuardianPage}
              onItemsPerPageChange={(size: number) => {
                setGuardianPageSize(size);
                setGuardianPage(1);
              }}
              itemsPerPageOptions={[6, 9, 18, 36]}
              labelSingular="apoderado"
              labelPlural="apoderados"
            />
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBMÓDULO 3: PADRÓN DE ALUMNOS                                            */}
      {/* ========================================================================= */}
      {currentSubmodule === 'students' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Buscar estudiante por DNI, Nombre o Código..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#2fbf71]"
                />
              </div>

              <select
                value={studentStatusFilter}
                onChange={(e) => setStudentStatusFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="ALL">Todos los Estados</option>
                <option value="ENROLLED">Matriculados</option>
                <option value="PROSPECT">Prospectos (Sin Matrícula)</option>
                <option value="WITHDRAWN">Retirados</option>
              </select>
            </div>

            <div className="text-xs font-bold text-slate-500">
              Total Alumnos: <strong className="text-[#223a5e]">{students.length}</strong>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Estudiante</th>
                  <th className="py-3 px-4">Código / DNI</th>
                  <th className="py-3 px-4">Apoderado Responsable</th>
                  <th className="py-3 px-4">Aula Actual</th>
                  <th className="py-3 px-4">Ficha Médica</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {paginatedStudents.map((stu) => (
                  <tr key={stu.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#223a5e]">
                        {stu.last_name}, {stu.first_name}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {stu.gender === 'M' ? '👦 Masculino' : '👧 Femenino'} &bull; Nac: {stu.birth_date || '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs">
                      <strong className="text-slate-800">{stu.document_number}</strong>
                      <span className="block text-[10px] text-slate-400">{stu.student_code || 'S/C'}</span>
                    </td>
                    <td className="py-3 px-4">
                      {stu.guardian ? (
                        <div>
                          <strong className="block text-[#223a5e] font-semibold">
                            {stu.guardian.first_name} {stu.guardian.last_name}
                          </strong>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {stu.guardian.relationship} &bull; {stu.guardian.phone}
                          </span>
                        </div>
                      ) : (
                        <span className="text-rose-500 font-medium text-[11px]">Sin apoderado asignado</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {stu.current_enrollment ? (
                        <span className="px-2.5 py-1 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 font-bold text-[10px]">
                          {stu.current_enrollment.section_name}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">No matriculado</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-[10.5px] space-y-0.5">
                        <span className="inline-block px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 font-bold text-[9px] mr-1">
                          {stu.blood_type || 'O+'}
                        </span>
                        <span className="text-slate-500 truncate max-w-[120px] inline-block">
                          {stu.allergies_medical ? `Alergia: ${stu.allergies_medical}` : 'Sin alergias'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase ${
                        stu.status === 'ENROLLED' ? 'bg-[#e6f9ef] text-[#26995b]' :
                        stu.status === 'PROSPECT' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {stu.status === 'ENROLLED' ? 'Matriculado' : stu.status === 'PROSPECT' ? 'Prospecto' : 'Retirado'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setEditingStudent(stu);
                          setSDocType(stu.document_type);
                          setSDocNum(stu.document_number);
                          setSFirstName(stu.first_name);
                          setSLastName(stu.last_name);
                          setSGender(stu.gender);
                          setSBirthDate(stu.birth_date || '');
                          setSBloodType(stu.blood_type || 'O+');
                          setSAllergies(stu.allergies_medical || '');
                          setSEmergencyPhone(stu.emergency_contact_phone || '');
                          setSHealthInsurance(stu.health_insurance || 'SIS');
                          setSPreviousSchool(stu.previous_school || '');
                          setSGuardianId(stu.guardian_id || '');
                          setStudentModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                        title="Editar alumno"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {loadingStudents && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-7 h-7 animate-spin mx-auto text-[#2fbf71] mb-2" />
                      <p className="text-xs font-semibold">Cargando nómina de estudiantes...</p>
                    </td>
                  </tr>
                )}
                {students.length === 0 && !loadingStudents && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                      No se encontraron estudiantes con los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {students.length > 0 && (
            <Pagination
              currentPage={studentPage}
              totalItems={students.length}
              itemsPerPage={studentPageSize}
              onPageChange={setStudentPage}
              onItemsPerPageChange={(size: number) => {
                setStudentPageSize(size);
                setStudentPage(1);
              }}
              itemsPerPageOptions={[5, 10, 20, 50]}
              labelSingular="estudiante"
              labelPlural="estudiantes"
            />
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBMÓDULO 4: ADMISIÓN & MATRÍCULAS (EL CONTRATO FINANCIERO)               */}
      {/* ========================================================================= */}
      {currentSubmodule === 'enrollments' && (
        <div className="space-y-6">
          {/* Métricas de Matrícula */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase">Total Matriculados</span>
              <p className="text-2xl font-black text-[#26995b] mt-1 font-mono">{enrollmentStats.totalEnrolled}</p>
              <p className="text-xs text-slate-500 mt-0.5">Alumnos con matrícula activa</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase">Regulares vs Nuevos</span>
              <p className="text-2xl font-black text-[#223a5e] mt-1 font-mono">
                {enrollmentStats.regularCount} <span className="text-sm font-normal text-slate-400">/</span> {enrollmentStats.newCount}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{enrollmentStats.regularCount} Regulares &bull; {enrollmentStats.newCount} Nuevos</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase">Becas & Descuentos</span>
              <p className="text-2xl font-black text-amber-600 mt-1 font-mono">{enrollmentStats.discountedCount}</p>
              <p className="text-xs text-slate-500 mt-0.5">Hermanos o convenios especiales</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase">Pensión Mensual Proyectada</span>
              <p className="text-2xl font-black text-purple-700 mt-1 font-mono">{formatSoles(enrollmentStats.monthlyExpectedRevenue)}</p>
              <p className="text-xs text-slate-500 mt-0.5">Recaudación base por mes</p>
            </div>
          </div>

          {/* Filtros de Matrículas */}
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={enrollmentSearch}
                  onChange={(e) => setEnrollmentSearch(e.target.value)}
                  placeholder="Buscar matrícula por Alumno, DNI o Código MAT..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#2fbf71]"
                />
              </div>

              <select
                value={enrollmentSectionFilter}
                onChange={(e) => setEnrollmentSectionFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="ALL">Todas las Aulas / Secciones</option>
                {allSectionsFlat.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.full_name} ({sec.enrolled_count}/{sec.capacity})
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs font-bold text-slate-500">
              Registros: <strong className="text-[#223a5e]">{enrollments.length} Matrículas</strong>
            </div>
          </div>

          {/* Tabla de Matrículas */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Código / Fecha</th>
                  <th className="py-3 px-4">Estudiante</th>
                  <th className="py-3 px-4">Aula / Salón</th>
                  <th className="py-3 px-4">Apoderado</th>
                  <th className="py-3 px-4">Condición Económica</th>
                  <th className="py-3 px-4">Pensión Pactada</th>
                  <th className="py-3 px-4 text-right">Ficha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {paginatedEnrollments.map((enr) => (
                  <tr key={enr.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-[#223a5e] block">{enr.enrollment_code}</span>
                      <span className="text-[10px] text-slate-400">{enr.enrollment_date}</span>
                    </td>
                    <td className="py-3 px-4">
                      <strong className="block text-[#223a5e]">
                        {enr.student?.first_name} {enr.student?.last_name}
                      </strong>
                      <span className="text-[10px] text-slate-400 font-mono">DNI: {enr.student?.document_number}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 font-bold text-[10.5px]">
                        {enr.section?.full_name}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">
                        {enr.guardian?.first_name} {enr.guardian?.last_name}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {enr.guardian?.relationship} &bull; {enr.guardian?.phone}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          enr.discount_type === 'NINGUNO' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {enr.discount_type === 'NINGUNO' ? 'Tarifa Regular' : enr.discount_type}
                        </span>
                        {enr.discount_percentage > 0 && (
                          <span className="block text-[10px] font-bold text-amber-700">
                            Desc: -{enr.discount_percentage}%
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-xs text-[#26995b]">
                      {formatSoles(enr.monthly_tuition_fee)}
                      <span className="block text-[9.5px] font-normal text-slate-400">
                        Matrícula: {formatSoles(enr.enrollment_fee)} {enr.enrollment_fee_paid ? '(Pagada)' : '(Pendiente)'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedEnrollmentForDetail(enr)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#223a5e] text-xs font-bold transition cursor-pointer"
                      >
                        Ver Ficha
                      </button>
                    </td>
                  </tr>
                ))}
                {loadingEnrollments && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-7 h-7 animate-spin mx-auto text-[#2fbf71] mb-2" />
                      <p className="text-xs font-semibold">Cargando registro de matrículas...</p>
                    </td>
                  </tr>
                )}
                {enrollments.length === 0 && !loadingEnrollments && (
                  <tr className="p-8 text-center bg-white text-slate-400 text-xs">
                    <td colSpan={7} className="py-8 text-center">
                      <p className="mb-2">No hay matrículas registradas para este periodo.</p>
                      <button
                        onClick={() => setIntegralWizardOpen(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2fbf71] text-white font-bold hover:bg-[#26995b] cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Iniciar Flujo Integral de Matrícula</span>
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {enrollments.length > 0 && (
            <Pagination
              currentPage={enrollmentPage}
              totalItems={enrollments.length}
              itemsPerPage={enrollmentPageSize}
              onPageChange={setEnrollmentPage}
              onItemsPerPageChange={(size: number) => {
                setEnrollmentPageSize(size);
                setEnrollmentPage(1);
              }}
              itemsPerPageOptions={[5, 10, 20, 50]}
              labelSingular="matrícula"
              labelPlural="matrículas"
            />
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ASISTENTE DE MATRÍCULA ESCOLAR                                     */}
      {/* ========================================================================= */}
      {newEnrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 bg-[#223a5e] text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-[#2fbf71]" />
                  <span>Asistente de Admisión & Matrícula Escolar</span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Inscribe al estudiante y autogenera su contrato y 10 mensualidades en Finanzas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNewEnrollModalOpen(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEnrollment} className="p-6 overflow-y-auto space-y-4">
              {/* Paso 1: Alumno y Apoderado */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-[#223a5e] uppercase tracking-wider block">
                  1. Selección del Estudiante y Apoderado
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Estudiante *
                    </label>
                    <select
                      required
                      value={enrStudentId}
                      onChange={(e) => handleSelectStudentForEnrollment(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                    >
                      <option value="">-- Seleccionar Estudiante --</option>
                      {students.map((stu) => (
                        <option key={stu.id} value={stu.id}>
                          {stu.last_name}, {stu.first_name} (DNI: {stu.document_number})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Apoderado Responsable *
                    </label>
                    <select
                      required
                      value={enrGuardianId}
                      onChange={(e) => setEnrGuardianId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                    >
                      <option value="">-- Seleccionar Apoderado --</option>
                      {guardians.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.last_name}, {g.first_name} ({g.relationship} &bull; {g.phone})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Paso 2: Aula / Sección y Tipo */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-[#223a5e] uppercase tracking-wider block">
                  2. Asignación de Aula y Vacante
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Aula y Sección Destino *
                    </label>
                    <select
                      required
                      value={enrSectionId}
                      onChange={(e) => handleSelectSectionForEnrollment(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                    >
                      <option value="">-- Seleccionar Sección --</option>
                      {allSectionsFlat.map((sec) => {
                        const isFull = sec.enrolled_count >= sec.capacity;
                        return (
                          <option key={sec.id} value={sec.id} disabled={isFull}>
                            {sec.full_name} ({sec.enrolled_count}/{sec.capacity} {isFull ? '- LLENA' : 'vacantes'})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tipo de Matrícula *
                    </label>
                    <select
                      value={enrType}
                      onChange={(e) => setEnrType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                    >
                      <option value="REGULAR">Alumno Regular (Continuante)</option>
                      <option value="NUEVO">Alumno Nuevo (Ingresante)</option>
                      <option value="TRASLADO">Traslado Externo</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Paso 3: Condiciones Económicas y Autogeneración */}
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#26995b] uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4" />
                    <span>3. Condiciones Económicas (Se autogenerarán 10 pensiones)</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Costo Matrícula (S/)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={enrFee}
                      onChange={(e) => setEnrFee(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold font-mono text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Pensión Mensual Pactada (S/) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={enrMonthlyTuition}
                      onChange={(e) => setEnrMonthlyTuition(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold font-mono text-[#26995b] focus:outline-none focus:border-[#2fbf71]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Cuota de Ingreso (S/)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={enrEntryFee}
                      onChange={(e) => setEnrEntryFee(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold font-mono text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                    />
                  </div>
                </div>

                {/* Descuentos / Becas */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Beca o Descuento Especial
                    </label>
                    <select
                      value={enrDiscountType}
                      onChange={(e) => setEnrDiscountType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                    >
                      <option value="NINGUNO">Ninguno (Tarifa completa)</option>
                      <option value="HERMANO">Descuento por Hermanos</option>
                      <option value="CONVENIO">Convenio Institucional</option>
                      <option value="BECA_PARCIAL">Beca Parcial</option>
                      <option value="BECA_COMPLETA">Beca Completa (100%)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Porcentaje de Beca (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={enrDiscountPct}
                      onChange={(e) => setEnrDiscountPct(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold font-mono text-slate-800 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Cobro Inmediato de Matrícula */}
                <div className="pt-2 border-t border-emerald-200/60">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={enrPayNow}
                      onChange={(e) => setEnrPayNow(e.target.checked)}
                      className="w-4 h-4 text-[#2fbf71] rounded focus:ring-0 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-[#223a5e]">
                      Cobrar matrícula de inmediato en ventanilla (+S/ {enrFee} a Caja Propia)
                    </span>
                  </label>

                  {enrPayNow && (
                    <div className="grid grid-cols-2 gap-3 mt-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Medio de Pago
                        </label>
                        <select
                          value={enrPayMethod}
                          onChange={(e) => setEnrPayMethod(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                        >
                          <option value="EFECTIVO">Efectivo (Ventanilla)</option>
                          <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                          <option value="YAPE_PLIN">Yape / Plin</option>
                          <option value="TARJETA">Tarjeta Débito/Crédito</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          N° Recibo / Voucher (Opcional)
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: REC-0091"
                          value={enrPayReceipt}
                          onChange={(e) => setEnrPayReceipt(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewEnrollModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEnrollment}
                  className="px-5 py-2 rounded-xl bg-[#2fbf71] hover:bg-[#26995b] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {savingEnrollment ? (
                    <span className="inline-flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Procesando Matrícula...
                    </span>
                  ) : (
                    'Confirmar Matrícula Escolar'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREAR / EDITAR GRADO ESCOLAR & TARIFARIO                           */}
      {/* ========================================================================= */}
      {gradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 bg-[#223a5e] text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#2fbf71]" />
                  <span>{editingGrade ? 'Editar Grado & Tarifario' : 'Crear Nuevo Grado Escolar'}</span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  {editingGrade ? `Modificando ${editingGrade.grade_name}` : 'Configura el nivel, nombre y costos base del grado'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGradeModalOpen(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGrade} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1">
                    Nivel Educativo *
                  </label>
                  <select
                    value={gradeFormLevel}
                    onChange={(e) => setGradeFormLevel(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="INICIAL">Inicial</option>
                    <option value="PRIMARIA">Primaria</option>
                    <option value="SECUNDARIA">Secundaria</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1">
                    Orden Visual *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={gradeFormOrder}
                    onChange={(e) => setGradeFormOrder(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold font-mono text-slate-800 text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#223a5e] mb-1">
                  Nombre del Grado *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 1° Primaria, Kinder 4 años, etc."
                  value={gradeFormName}
                  onChange={(e) => setGradeFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>

              {/* Tarifario Base Oficial del Grado */}
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/70 space-y-3">
                <span className="text-[11px] font-bold text-[#26995b] uppercase tracking-wider block border-b border-emerald-200/50 pb-1">
                  Tarifario Base Oficial para Matrículas
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Costo Matrícula Base (S/) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={gradeFormEnrollment}
                      onChange={(e) => setGradeFormEnrollment(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold font-mono text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Pensión Mensual Base (S/) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={gradeFormTuition}
                      onChange={(e) => setGradeFormTuition(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold font-mono text-[#26995b]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cuota de Ingreso Alumnos Nuevos (S/)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={gradeFormEntry}
                    onChange={(e) => setGradeFormEntry(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold font-mono text-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setGradeModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingGrade}
                  className="px-5 py-2 rounded-xl bg-[#2fbf71] hover:bg-[#26995b] text-white text-xs font-bold cursor-pointer disabled:opacity-50 shadow-md shadow-[#2fbf71]/20"
                >
                  {savingGrade ? 'Guardando...' : editingGrade ? 'Guardar Cambios' : 'Crear Grado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREAR / EDITAR SECCIÓN / AULA                                      */}
      {/* ========================================================================= */}
      {sectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-5 bg-[#223a5e] text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Building className="w-4 h-4 text-[#2fbf71]" />
                  <span>{editingSection ? `Editar Aula: ${editingSection.full_name}` : 'Crear Nueva Aula / Sección'}</span>
                </h3>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  {editingSection ? 'Modifica el aforo, turno o tutor asignado' : 'Habilita una nueva aula para matrículas'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSectionModalOpen(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSection} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#223a5e] mb-1">
                  Grado Académico *
                </label>
                <select
                  required
                  disabled={Boolean(editingSection)}
                  value={secGradeId}
                  onChange={(e) => setSecGradeId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 disabled:opacity-75"
                >
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.grade_name} ({g.level})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1">
                    Letra Sección *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    value={secLetter}
                    onChange={(e) => setSecLetter(e.target.value.toUpperCase())}
                    placeholder="B"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold uppercase text-slate-800 text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1">
                    Capacidad (Aforo Vacantes) *
                  </label>
                  <input
                    type="number"
                    required
                    min={5}
                    max={60}
                    value={secCapacity}
                    onChange={(e) => setSecCapacity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold font-mono text-slate-800 text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1">
                    Turno *
                  </label>
                  <select
                    value={secShift}
                    onChange={(e) => setSecShift(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    <option value="MAÑANA">Mañana</option>
                    <option value="TARDE">Tarde</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1">
                    Ubicación Física
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Aula 102 - Pabellón A"
                    value={secClassroom}
                    onChange={(e) => setSecClassroom(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div>
                {(() => {
                  const docentesOnly = teachers.filter((t) => t.role === 'MAESTRO');
                  const selectedTeacher = docentesOnly.find((t) => t.id === secTutorUserId);

                  return (
                    <>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-[#223a5e] flex items-center gap-1.5">
                          <UserCheck className="w-4 h-4 text-[#2fbf71]" />
                          <span>Profesor Tutor Asignado (Solo Docentes)</span>
                        </label>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {docentesOnly.length} {docentesOnly.length === 1 ? 'docente disponible' : 'docentes disponibles'}
                        </span>
                      </div>

                      <select
                        value={secTutorUserId}
                        onChange={(e) => setSecTutorUserId(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2fbf71] focus:bg-white transition cursor-pointer"
                      >
                        <option value="">-- Sin Profesor Tutor (Por Designar) --</option>
                        {docentesOnly.map((teacher) => (
                          <option key={teacher.id} value={teacher.id}>
                            {teacher.name} (@{teacher.username})
                          </option>
                        ))}
                      </select>

                      {/* Tarjeta Informativa del Docente Vinculado */}
                      {selectedTeacher ? (
                        <div className="mt-2.5 p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/90 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#2fbf71]/15 text-[#2fbf71] font-black text-sm flex items-center justify-center border border-[#2fbf71]/30 shrink-0 overflow-hidden">
                            {selectedTeacher.avatar ? (
                              <img
                                src={selectedTeacher.avatar}
                                alt={selectedTeacher.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>{selectedTeacher.name.charAt(0)}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {selectedTeacher.name}
                              </p>
                              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase tracking-wider">
                                Docente
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-mono truncate">
                              @{selectedTeacher.username} {selectedTeacher.email ? `• ${selectedTeacher.email}` : ''}
                            </p>
                            <span className="text-[10px] text-[#26995b] font-bold flex items-center gap-1 mt-0.5">
                              <CheckCircle2 className="w-3 h-3 text-[#2fbf71]" />
                              <span>Profesor oficial con cuenta en el sistema</span>
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 mt-1.5 italic">
                          Selecciona a un docente registrado con su cuenta de usuario para que sea el tutor oficial del aula.
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSectionModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingSection}
                  className="px-5 py-2 rounded-xl bg-[#2fbf71] hover:bg-[#26995b] text-white text-xs font-bold cursor-pointer disabled:opacity-50 shadow-md shadow-[#2fbf71]/20"
                >
                  {savingSection ? 'Guardando...' : editingSection ? 'Guardar Cambios' : 'Crear Aula'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: APODERADO / FAMILIA                                                */}
      {/* ========================================================================= */}
      {guardianModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 bg-[#223a5e] text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold">
                  {editingGuardian ? 'Editar Ficha del Apoderado' : 'Registrar Nuevo Apoderado'}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">Información familiar y contacto para avisos de cobro</p>
              </div>
              <button
                type="button"
                onClick={() => setGuardianModalOpen(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGuardian} className="p-6 overflow-y-auto space-y-3.5">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Doc *</label>
                  <select
                    value={gDocType}
                    onChange={(e) => setGDocType(e.target.value as any)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    <option value="DNI">DNI</option>
                    <option value="CE">C.E.</option>
                    <option value="PASAPORTE">Pasap.</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">N° Documento *</label>
                  <input
                    type="text"
                    required
                    value={gDocNum}
                    onChange={(e) => setGDocNum(e.target.value)}
                    placeholder="12345678"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold font-mono text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nombres *</label>
                  <input
                    type="text"
                    required
                    value={gFirstName}
                    onChange={(e) => setGFirstName(e.target.value)}
                    placeholder="Juan Carlos"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Apellidos *</label>
                  <input
                    type="text"
                    required
                    value={gLastName}
                    onChange={(e) => setGLastName(e.target.value)}
                    placeholder="Pérez Quispe"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Parentesco *</label>
                  <select
                    value={gRelationship}
                    onChange={(e) => setGRelationship(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    <option value="PADRE">Padre</option>
                    <option value="MADRE">Madre</option>
                    <option value="TUTOR">Tutor Legal</option>
                    <option value="ABUELO">Abuelo/a</option>
                    <option value="OTRO">Otro Familiar</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Celular / WhatsApp *</label>
                  <input
                    type="text"
                    required
                    value={gPhone}
                    onChange={(e) => setGPhone(e.target.value)}
                    placeholder="987654321"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold font-mono text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={gEmail}
                    onChange={(e) => setGEmail(e.target.value)}
                    placeholder="apoderado@email.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono Alternativo</label>
                  <input
                    type="text"
                    value={gAltPhone}
                    onChange={(e) => setGAltPhone(e.target.value)}
                    placeholder="01 2345678"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Dirección de Domicilio</label>
                <input
                  type="text"
                  value={gAddress}
                  onChange={(e) => setGAddress(e.target.value)}
                  placeholder="Av. Los Jazmines 432, Lima"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">RUC/DNI para Facturación</label>
                  <input
                    type="text"
                    value={gBillingTaxId}
                    onChange={(e) => setGBillingTaxId(e.target.value)}
                    placeholder="RUC o DNI"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Razón Social Factura</label>
                  <input
                    type="text"
                    value={gBillingName}
                    onChange={(e) => setGBillingName(e.target.value)}
                    placeholder="Nombre o Empresa"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setGuardianModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingGuardian}
                  className="px-5 py-2 rounded-xl bg-[#2fbf71] hover:bg-[#26995b] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {savingGuardian ? 'Guardando...' : 'Guardar Apoderado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ESTUDIANTE / ALUMNO                                                */}
      {/* ========================================================================= */}
      {studentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 bg-[#223a5e] text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold">
                  {editingStudent ? 'Editar Ficha del Estudiante' : 'Registrar Nuevo Estudiante'}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">Datos escolares, código MINEDU y ficha de salud</p>
              </div>
              <button
                type="button"
                onClick={() => setStudentModalOpen(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="p-6 overflow-y-auto space-y-3.5">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Doc *</label>
                  <select
                    value={sDocType}
                    onChange={(e) => setSDocType(e.target.value as any)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    <option value="DNI">DNI</option>
                    <option value="CE">C.E.</option>
                    <option value="PASAPORTE">Pasap.</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">N° Documento *</label>
                  <input
                    type="text"
                    required
                    value={sDocNum}
                    onChange={(e) => setSDocNum(e.target.value)}
                    placeholder="74839201"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold font-mono text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nombres *</label>
                  <input
                    type="text"
                    required
                    value={sFirstName}
                    onChange={(e) => setSFirstName(e.target.value)}
                    placeholder="Mateo Andrés"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Apellidos *</label>
                  <input
                    type="text"
                    required
                    value={sLastName}
                    onChange={(e) => setSLastName(e.target.value)}
                    placeholder="Pérez Rojas"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sexo *</label>
                  <select
                    value={sGender}
                    onChange={(e) => setSGender(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Fecha de Nacimiento</label>
                  <input
                    type="date"
                    value={sBirthDate}
                    onChange={(e) => setSBirthDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Vincular con Apoderado Titular
                </label>
                <select
                  value={sGuardianId}
                  onChange={(e) => setSGuardianId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                >
                  <option value="">-- Sin apoderado seleccionado --</option>
                  {guardians.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.last_name}, {g.first_name} ({g.relationship} &bull; DNI: {g.document_number})
                    </option>
                  ))}
                </select>
              </div>

              {/* Ficha Médica y de Salud */}
              <div className="p-3.5 rounded-2xl bg-rose-50/50 border border-rose-200/60 space-y-2">
                <span className="text-[11px] font-bold text-rose-800 uppercase flex items-center gap-1.5">
                  <HeartPulse className="w-3.5 h-3.5 text-rose-600" />
                  <span>Ficha Médica de Emergencia</span>
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Grupo Sanguíneo</label>
                    <select
                      value={sBloodType}
                      onChange={(e) => setSBloodType(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold font-mono"
                    >
                      <option value="O+">O Positivo (O+)</option>
                      <option value="O-">O Negativo (O-)</option>
                      <option value="A+">A Positivo (A+)</option>
                      <option value="A-">A Negativo (A-)</option>
                      <option value="B+">B Positivo (B+)</option>
                      <option value="AB+">AB Positivo (AB+)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Seguro de Salud</label>
                    <select
                      value={sHealthInsurance}
                      onChange={(e) => setSHealthInsurance(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                    >
                      <option value="SIS">SIS (Seguro Integral)</option>
                      <option value="EsSalud">EsSalud</option>
                      <option value="Privado">Seguro Privado (Rímac/Pacífico)</option>
                      <option value="Ninguno">Ninguno</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Alergias / Condiciones Médicas</label>
                  <input
                    type="text"
                    value={sAllergies}
                    onChange={(e) => setSAllergies(e.target.value)}
                    placeholder="Ej: Alérgico a penicilina, asma leve"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Teléfono de Emergencia Adicional</label>
                  <input
                    type="text"
                    value={sEmergencyPhone}
                    onChange={(e) => setSEmergencyPhone(e.target.value)}
                    placeholder="Ej: 998877665 (Tía / Vecino)"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Colegio de Procedencia</label>
                <input
                  type="text"
                  value={sPreviousSchool}
                  onChange={(e) => setSPreviousSchool(e.target.value)}
                  placeholder="Ej: I.E. San Martín de Porres"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStudentModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingStudent}
                  className="px-5 py-2 rounded-xl bg-[#2fbf71] hover:bg-[#26995b] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {savingStudent ? 'Guardando...' : 'Guardar Estudiante'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VER DETALLE / CONSTANCIA DE MATRÍCULA                              */}
      {/* ========================================================================= */}
      {selectedEnrollmentForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-5 bg-[#223a5e] text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-1.5">
                  <ClipboardList className="w-4 h-4 text-[#2fbf71]" />
                  <span>Constancia de Matrícula Oficial</span>
                </h3>
                <p className="text-[11px] text-slate-300 font-mono mt-0.5">{selectedEnrollmentForDetail.enrollment_code}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEnrollmentForDetail(null)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-700">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Año Lectivo:</span>
                  <strong className="text-[#223a5e]">{selectedEnrollmentForDetail.academic_year?.year_name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Estudiante:</span>
                  <strong className="text-[#223a5e]">
                    {selectedEnrollmentForDetail.student?.first_name} {selectedEnrollmentForDetail.student?.last_name}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">DNI Estudiante:</span>
                  <span className="font-mono">{selectedEnrollmentForDetail.student?.document_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Aula / Sección:</span>
                  <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold">
                    {selectedEnrollmentForDetail.section?.full_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Apoderado Titular:</span>
                  <strong>
                    {selectedEnrollmentForDetail.guardian?.first_name} {selectedEnrollmentForDetail.guardian?.last_name}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Contacto WhatsApp:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedEnrollmentForDetail.guardian?.phone}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-2">
                <span className="text-[11px] font-bold text-[#26995b] uppercase block border-b border-emerald-200/60 pb-1.5">
                  Condición Financiera & Cronograma
                </span>
                <div className="flex justify-between">
                  <span className="text-slate-500">Costo Matrícula:</span>
                  <span className="font-mono font-bold">{formatSoles(selectedEnrollmentForDetail.enrollment_fee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Estado Pago Matrícula:</span>
                  <span className={`px-2 py-0.2 rounded-full font-bold text-[10px] ${selectedEnrollmentForDetail.enrollment_fee_paid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {selectedEnrollmentForDetail.enrollment_fee_paid ? '✓ Pagada' : 'Pendiente'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Pensión Mensual Pactada:</span>
                  <strong className="font-mono text-sm text-[#26995b]">{formatSoles(selectedEnrollmentForDetail.monthly_tuition_fee)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cronograma de Cuotas:</span>
                  <span className="text-[11px] text-slate-600 font-medium">10 mensualidades (Mar a Dic)</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedEnrollmentForDetail(null)}
                  className="px-5 py-2 rounded-xl bg-[#223a5e] text-white text-xs font-bold cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* MODAL: CONFIRMACIÓN DE ELIMINACIÓN OFICIAL EDUCA360                       */}
      {/* ========================================================================= */}
      {confirmDeleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            {/* Cabecera distintiva en rojo rose oficial del sistema */}
            <div className="px-6 py-5 flex items-center justify-between text-white bg-gradient-to-r from-rose-700 to-rose-600">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center font-bold">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold leading-tight">
                    {confirmDeleteModal.title}
                  </h3>
                  <p className="text-xs text-white/80 font-mono">
                    {confirmDeleteModal.subtitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setConfirmDeleteModal((prev) => ({ ...prev, isOpen: false }))
                }
                className="text-white/80 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido / Tarjeta del Elemento y Advertencia */}
            <div className="p-6 space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {confirmDeleteModal.type === 'grade'
                      ? 'Grado Escolar'
                      : 'Aula / Sección'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                    Sin alumnos matriculados
                  </span>
                </div>
                <div className="text-base font-black text-slate-900 leading-snug">
                  {confirmDeleteModal.itemName}
                </div>
                {confirmDeleteModal.itemDetails.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-2 border-t border-slate-200/60">
                    {confirmDeleteModal.itemDetails.map((det, idx) => (
                      <div key={idx} className="min-w-0">
                        <span className="text-[10px] text-slate-400 block">{det.label}</span>
                        <strong className="text-slate-800 truncate block">{det.value}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Caja de Consecuencia / Advertencia */}
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-rose-900">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Consecuencia de esta acción:</span>
                </p>
                <p className="text-[11px] leading-relaxed text-rose-700">
                  {confirmDeleteModal.warningMessage}
                </p>
              </div>
            </div>

            {/* Pie de Acciones */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() =>
                  setConfirmDeleteModal((prev) => ({ ...prev, isOpen: false }))
                }
                disabled={executingDelete}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeDelete}
                disabled={executingDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-600/30 disabled:opacity-50"
              >
                {executingDelete ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{executingDelete ? 'Eliminando...' : 'Sí, Eliminar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal: Flujo Integral de Matrícula Escolar */}
      <IntegralEnrollmentWizardModal
        isOpen={integralWizardOpen}
        onClose={() => setIntegralWizardOpen(false)}
        academicYears={academicYears}
        grades={grades}
        sections={allSectionsFlat}
        guardians={guardians}
        students={students}
        enrollments={enrollments}
        onEnrollmentSuccess={() => {
          fetchEnrollments();
          fetchStudents();
          fetchGuardians();
          fetchStructure();
        }}
        onNotify={onNotify}
      />
    </div>
  );
}
