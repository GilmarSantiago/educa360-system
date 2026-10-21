'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  X,
  Users,
  GraduationCap,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Search,
  PlusCircle,
  ArrowRight,
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  ClipboardList,
  ShieldCheck,
  CreditCard,
  FileText,
  Printer,
  ExternalLink,
  ChevronRight,
  Info,
  Copy,
  Check,
  KeyRound,
  RefreshCw,
} from 'lucide-react';
import {
  AcademicYear,
  SchoolGrade,
  SchoolSection,
  Guardian,
  Student,
  Enrollment,
  SchoolConfig,
  EnrollmentDiscountType,
  FeeConcept,
  FeeRule,
  StudentConditionType,
} from '@/types';
import { AlertType } from '@/components/ui/AlertToast';

interface IntegralEnrollmentWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  academicYears: AcademicYear[];
  grades: SchoolGrade[];
  sections: SchoolSection[];
  guardians: Guardian[];
  students: Student[];
  enrollments?: Enrollment[];
  onEnrollmentSuccess: () => void;
  onNotify: (alert: { type: AlertType; title: string; message?: string }) => void;
}

export default function IntegralEnrollmentWizardModal({
  isOpen,
  onClose,
  academicYears,
  grades,
  sections,
  guardians,
  students,
  enrollments = [],
  onEnrollmentSuccess,
  onNotify,
}: IntegralEnrollmentWizardModalProps) {
  // Pasos del Wizard: 1 = Apoderado, 2 = Alumno, 3 = Cuota de Ingreso, 4 = Matrícula & Pensiones, 5 = Confirmación / Éxito
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // =========================================================================
  // PASO 1: APODERADO / FAMILIA
  // =========================================================================
  const [guardianMode, setGuardianMode] = useState<'SELECT' | 'NEW'>('SELECT');
  const [guardianSearchQuery, setGuardianSearchQuery] = useState('');
  const [selectedGuardian, setSelectedGuardian] = useState<Guardian | null>(null);

  // Formulario de nuevo apoderado
  const [gDocType, setGDocType] = useState<'DNI' | 'CE' | 'PASAPORTE'>('DNI');
  const [gDocNum, setGDocNum] = useState('');
  const [gFirstName, setGFirstName] = useState('');
  const [gLastName, setGLastName] = useState('');
  const [gRelationship, setGRelationship] = useState<'PADRE' | 'MADRE' | 'TUTOR' | 'ABUELO' | 'OTRO'>('PADRE');
  const [gPhone, setGPhone] = useState('');
  const [gAltPhone, setGAltPhone] = useState('');
  const [gEmail, setGEmail] = useState('');
  const [gAddress, setGAddress] = useState('');
  const [gBillingTaxId, setGBillingTaxId] = useState('');
  const [gBillingName, setGBillingName] = useState('');

  // =========================================================================
  // PASO 2: ESTUDIANTE & CONDICIÓN ESCOLAR
  // =========================================================================
  const [studentMode, setStudentMode] = useState<'EXISTING_CHILD' | 'SEARCH_STUDENT' | 'NEW_STUDENT'>('NEW_STUDENT');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Condición Escolar: NUEVO, REGULAR (Antiguo), TRASLADO, REINGRESANTE
  const [studentCondition, setStudentCondition] = useState<StudentConditionType>('NUEVO');

  // Conceptos de pago dinámicos
  const [feeConcepts, setFeeConcepts] = useState<FeeConcept[]>([]);

  // Autodetección y validación de estudiante por DNI (Lookup Inteligente)
  const [lookingUpStudent, setLookingUpStudent] = useState(false);
  const [lookupResult, setLookupResult] = useState<{
    found: boolean;
    canEnroll: boolean;
    reason?: string;
    message?: string;
    detectedCondition?: StudentConditionType;
    student?: any;
    guardian?: any;
    suggestedGradeId?: string;
    suggestedLevel?: 'INICIAL' | 'PRIMARIA' | 'SECUNDARIA';
    previousYearName?: string;
    previousGradeName?: string;
    existingEnrollment?: any;
  } | null>(null);

  const runStudentLookup = async (dni: string) => {
    const cleanDni = dni.trim();
    if (cleanDni.length < 5) return;
    setLookingUpStudent(true);
    try {
      const yearParam = selectedYearId ? `&academic_year_id=${selectedYearId}` : '';
      const res = await fetch(`/api/admin/students/lookup?dni=${cleanDni}${yearParam}`);
      const data = await res.json();
      if (data.success) {
        setLookupResult(data);
        if (data.found && data.student) {
          setSelectedStudent(data.student);
          setSFirstName(data.student.first_name || '');
          setSLastName(data.student.last_name || '');
          if (data.student.gender) setSGender(data.student.gender);
          if (data.student.birth_date) setSBirthDate(data.student.birth_date);
          if (data.student.blood_type) setSBloodType(data.student.blood_type);
          if (data.student.allergies_medical) setSAllergies(data.student.allergies_medical);
          if (data.student.health_insurance) setSHealthInsurance(data.student.health_insurance);
          if (data.student.previous_school) setSPreviousSchool(data.student.previous_school);

          if (data.detectedCondition) {
            setStudentCondition(data.detectedCondition);
          }

          if (data.suggestedGradeId && (!selectedGradeId || selectedGradeId === '')) {
            setSelectedGradeId(data.suggestedGradeId);
            if (data.suggestedLevel) setSelectedLevel(data.suggestedLevel);
          }

          if (data.guardian && guardianMode === 'SELECT' && !selectedGuardian) {
            setSelectedGuardian(data.guardian);
            setGPhone(data.guardian.phone || '');
            setGAddress(data.guardian.address || '');
            setGEmail(data.guardian.email || '');
          }
        }
      }
    } catch (err) {
      console.error('Error al realizar lookup de estudiante:', err);
    } finally {
      setLookingUpStudent(false);
    }
  };

  // Formulario de nuevo estudiante
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

  // =========================================================================
  // PASO 3: REGLA DE CUOTA DE INGRESO (POLÍTICA DEL COLEGIO)
  // =========================================================================
  // Regla de cuota: 'NUEVOS_SOLO' (por defecto: pagan nuevos y traslados; antiguos S/0), 'TODOS', 'EXONERADO', 'PERSONALIZADO'
  const [entryFeeRule, setEntryFeeRule] = useState<'NUEVOS_SOLO' | 'TODOS' | 'EXONERADO' | 'PERSONALIZADO'>('NUEVOS_SOLO');
  const [entryFeeAmount, setEntryFeeAmount] = useState<string>('0');
  const [payEntryNow, setPayEntryNow] = useState(true);
  const [entryPayMethod, setEntryPayMethod] = useState('EFECTIVO');
  const [entryReceiptNumber, setEntryReceiptNumber] = useState('');
  const [schoolConfig, setSchoolConfig] = useState<SchoolConfig | null>(null);
  const [customOverrideEntryFee, setCustomOverrideEntryFee] = useState(false);

  // =========================================================================
  // PASO 4: AULA, MATRÍCULA OBLIGATORIA & CRONOGRAMA DE PENSIONES
  // =========================================================================
  // =========================================================================
  // PASO 4: AULA, MATRÍCULA CONFIGURABLE & CRONOGRAMA DE PENSIONES
  // =========================================================================
  const [selectedYearId, setSelectedYearId] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<'INICIAL' | 'PRIMARIA' | 'SECUNDARIA'>('PRIMARIA');
  const [selectedGradeId, setSelectedGradeId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');

  // Modalidad / Regla de Matrícula Configurable por el Admin:
  // 'OBLIGATORIO_AHORA' = Cobro al contado obligatorio con comprobante en caja
  // 'DIFERIDO' = Compromiso de pago diferido (genera cuota PENDIENTE en Finanzas sin exigir comprobante ahora)
  // 'EXONERADO' = Exonerado de Matrícula (S/ 0.00)
  const [enrollmentPaymentRule, setEnrollmentPaymentRule] = useState<'OBLIGATORIO_AHORA' | 'DIFERIDO' | 'EXONERADO'>('OBLIGATORIO_AHORA');
  const [enrollmentFee, setEnrollmentFee] = useState('350');
  const [enrollmentPayMethod, setEnrollmentPayMethod] = useState('EFECTIVO');
  const [enrollmentReceiptNumber, setEnrollmentReceiptNumber] = useState('');

  // Pensiones mensuales & Descuentos
  const [monthlyTuition, setMonthlyTuition] = useState('400');
  const [discountType, setDiscountType] = useState<EnrollmentDiscountType>('NINGUNO');
  const [discountPct, setDiscountPct] = useState('0');
  const [enrollmentNotes, setEnrollmentNotes] = useState('');

  // =========================================================================
  // ESTADOS DE ENVÍO Y RESULTADO
  // =========================================================================
  const [submitting, setSubmitting] = useState(false);
  const [completedEnrollment, setCompletedEnrollment] = useState<{
    enrollmentCode: string;
    enrollmentId: string;
    studentName: string;
    guardianName: string;
    guardianPhone: string;
    sectionName: string;
    gradeName: string;
    enrollmentFee: number;
    enrollmentPaymentRule?: 'OBLIGATORIO_AHORA' | 'DIFERIDO' | 'EXONERADO';
    payEnrollmentNow?: boolean;
    entryFee: number;
    monthlyTuition: number;
    guardianUsername?: string;
    guardianTempPassword?: string;
    isNewUser?: boolean;
  } | null>(null);

  const [copiedCreds, setCopiedCreds] = useState(false);

  // Formato Soles
  const formatSoles = (val: number) => {
    return `S/ ${Number(val || 0).toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Cargar configuración de reglas institucionales y conceptos de pago al abrir el modal
  useEffect(() => {
    if (isOpen) {
      fetch('/api/admin/institution')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.config) {
            setSchoolConfig(data.config);
          }
        })
        .catch((err) => console.error('Error al cargar reglas predefinidas del colegio:', err));

      fetch('/api/admin/fee-concepts')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.concepts) {
            setFeeConcepts(data.concepts);
          }
        })
        .catch((err) => console.error('Error al cargar conceptos de pago:', err));
    }
  }, [isOpen]);

  // Inicializar año escolar activo por defecto
  useEffect(() => {
    if (academicYears && academicYears.length > 0) {
      const activeYear = academicYears.find((y) => y.status === 'ACTIVE') || academicYears[0];
      setSelectedYearId(activeYear.id);
    }
  }, [academicYears]);

  const activeAcademicYear = useMemo(() => {
    return (
      academicYears.find((y) => y.id === selectedYearId) ||
      academicYears.find((y) => y.status === 'ACTIVE') ||
      academicYears[0]
    );
  }, [academicYears, selectedYearId]);

  // Filtrado de apoderados en tiempo real para el buscador
  const filteredGuardians = useMemo(() => {
    if (!guardianSearchQuery.trim()) return guardians.slice(0, 8);
    const q = guardianSearchQuery.toLowerCase().trim();
    return guardians.filter(
      (g) =>
        g.document_number.toLowerCase().includes(q) ||
        g.first_name.toLowerCase().includes(q) ||
        g.last_name.toLowerCase().includes(q) ||
        g.phone.includes(q)
    );
  }, [guardians, guardianSearchQuery]);

  // Estudiantes asociados al apoderado seleccionado (para renovar o matricular otro hijo)
  const existingChildrenOfGuardian = useMemo(() => {
    if (!selectedGuardian) return [];
    return students.filter((s) => s.guardian_id === selectedGuardian.id);
  }, [selectedGuardian, students]);

  // Filtrado de estudiantes en tiempo real para el buscador general
  const filteredStudents = useMemo(() => {
    if (!studentSearchQuery.trim()) return students.slice(0, 6);
    const q = studentSearchQuery.toLowerCase().trim();
    return students.filter(
      (s) =>
        s.document_number.toLowerCase().includes(q) ||
        s.first_name.toLowerCase().includes(q) ||
        s.last_name.toLowerCase().includes(q) ||
        (s.student_code && s.student_code.toLowerCase().includes(q))
    );
  }, [students, studentSearchQuery]);

  // VALIDACIÓN ESTRICTA: Solo debe existir 1 alumno por año académico
  const duplicateEnrollment = useMemo(() => {
    if (!enrollments || enrollments.length === 0 || !activeAcademicYear) return null;

    // 1. Si se eligió un alumno registrado
    if (selectedStudent?.id) {
      const found = enrollments.find(
        (e) =>
          e.academic_year_id === activeAcademicYear.id &&
          e.student_id === selectedStudent.id &&
          e.status !== 'CANCELLED'
      );
      if (found) return found;
    }

    // 2. Si se ingresó un documento (DNI)
    const targetDoc = (sDocNum || selectedStudent?.document_number || '').trim().toLowerCase();
    if (targetDoc) {
      const found = enrollments.find(
        (e) =>
          e.academic_year_id === activeAcademicYear.id &&
          e.status !== 'CANCELLED' &&
          (e.student?.document_number?.trim().toLowerCase() === targetDoc ||
            students.some(
              (st) =>
                st.id === e.student_id &&
                st.document_number?.trim().toLowerCase() === targetDoc
            ))
      );
      if (found) return found;
    }

    return null;
  }, [enrollments, activeAcademicYear, selectedStudent, sDocNum, students]);

  // Resumen de vacantes por nivel educativo (INICIAL, PRIMARIA, SECUNDARIA)
  const levelVacanciesSummary = useMemo(() => {
    const levels: Array<'INICIAL' | 'PRIMARIA' | 'SECUNDARIA'> = ['INICIAL', 'PRIMARIA', 'SECUNDARIA'];
    const summary: Record<
      'INICIAL' | 'PRIMARIA' | 'SECUNDARIA',
      { totalGrades: number; availableGrades: number; totalVacancies: number }
    > = {
      INICIAL: { totalGrades: 0, availableGrades: 0, totalVacancies: 0 },
      PRIMARIA: { totalGrades: 0, availableGrades: 0, totalVacancies: 0 },
      SECUNDARIA: { totalGrades: 0, availableGrades: 0, totalVacancies: 0 },
    };

    levels.forEach((lvl) => {
      const levelGrades = grades.filter((g) => g.level === lvl);
      summary[lvl].totalGrades = levelGrades.length;

      levelGrades.forEach((g) => {
        const secWithVac = sections.filter(
          (s) => s.grade_id === g.id && (Number(s.capacity) - Number(s.enrolled_count)) > 0
        );
        if (secWithVac.length > 0) {
          summary[lvl].availableGrades += 1;
        }
        const freeInGrade = secWithVac.reduce(
          (acc, s) => acc + (Number(s.capacity) - Number(s.enrolled_count)),
          0
        );
        summary[lvl].totalVacancies += freeInGrade;
      });
    });

    return summary;
  }, [grades, sections]);

  // Grados del nivel seleccionado que TIENEN vacantes disponibles (> 0)
  const gradesWithVacanciesInLevel = useMemo(() => {
    return grades
      .filter((g) => g.level === selectedLevel)
      .map((g) => {
        const availableSecs = sections.filter(
          (s) => s.grade_id === g.id && (Number(s.capacity) - Number(s.enrolled_count)) > 0
        );
        const totalVacancies = availableSecs.reduce(
          (sum, s) => sum + (Number(s.capacity) - Number(s.enrolled_count)),
          0
        );
        return {
          ...g,
          availableSections: availableSecs,
          totalVacancies,
        };
      })
      .filter((g) => g.availableSections.length > 0);
  }, [grades, sections, selectedLevel]);

  // Secciones del grado seleccionado que TIENEN vacantes disponibles (> 0)
  const sectionsWithVacancies = useMemo(() => {
    if (!selectedGradeId) return [];
    return sections.filter(
      (s) => s.grade_id === selectedGradeId && (Number(s.capacity) - Number(s.enrolled_count)) > 0
    );
  }, [sections, selectedGradeId]);

  // Sección seleccionada actualmente
  const activeSection = useMemo(() => {
    return sections.find((s) => s.id === selectedSectionId);
  }, [sections, selectedSectionId]);

  // Grado seleccionado actualmente
  const activeGrade = useMemo(() => {
    return grades.find((g) => g.id === selectedGradeId);
  }, [grades, selectedGradeId]);

  // Si cambia el nivel seleccionado, verificar si el grado actual pertenece al nivel o resetearlo
  useEffect(() => {
    if (selectedGradeId) {
      const currentGrade = grades.find((g) => g.id === selectedGradeId);
      if (currentGrade && currentGrade.level !== selectedLevel) {
        setSelectedGradeId('');
        setSelectedSectionId('');
      }
    }
  }, [selectedLevel, selectedGradeId, grades]);

  // Auto-seleccionar sección si solo hay una con vacantes disponibles
  useEffect(() => {
    if (selectedGradeId && sectionsWithVacancies.length === 1) {
      if (selectedSectionId !== sectionsWithVacancies[0].id) {
        setSelectedSectionId(sectionsWithVacancies[0].id);
      }
    } else if (selectedGradeId && !sectionsWithVacancies.some((s) => s.id === selectedSectionId)) {
      setSelectedSectionId('');
    }
  }, [selectedGradeId, sectionsWithVacancies, selectedSectionId]);

  // Aplicar automáticamente las reglas institucionales y conceptos de pago según la condición del alumno y grado
  useEffect(() => {
    if (activeGrade) {
      const defaultEntry = Number(activeGrade.default_entry_fee || 450);
      const defaultEnrollment = Number(activeGrade.default_enrollment_amount || 350);
      const defaultTuition = Number(activeGrade.default_tuition_amount || 400);

      // Buscar conceptos en el catálogo dinámico
      const admissionConcept = feeConcepts.find((c) => c.category === 'ADMISSION');
      const enrollmentConcept = feeConcepts.find((c) => c.category === 'ENROLLMENT');
      const tuitionConcept = feeConcepts.find((c) => c.category === 'TUITION');

      const effectiveTuition = Number(tuitionConcept?.default_amount) || defaultTuition;
      setMonthlyTuition(String(effectiveTuition));

      // Determinar regla de Cuota de Ingreso
      let admRule: FeeRule = 'EXONERADO';
      if (admissionConcept) {
        if (studentCondition === 'NUEVO') admRule = admissionConcept.rule_new;
        else if (studentCondition === 'REGULAR') admRule = admissionConcept.rule_regular;
        else if (studentCondition === 'TRASLADO') admRule = admissionConcept.rule_transfer;
        else if (studentCondition === 'REINGRESANTE') admRule = admissionConcept.rule_reentry;
      } else {
        if (studentCondition === 'REGULAR') {
          admRule = schoolConfig?.entry_fee_rule_regular === 'APLICA' ? 'OBLIGATORIO' : 'EXONERADO';
        } else {
          admRule = schoolConfig?.entry_fee_rule_new === 'EXONERADO' ? 'EXONERADO' : 'OBLIGATORIO';
        }
      }

      const effectiveEntryAmount = Number(admissionConcept?.default_amount) || defaultEntry;

      if (admRule === 'EXONERADO') {
        setEntryFeeRule('EXONERADO');
        setEntryFeeAmount('0');
        setPayEntryNow(false);
        setEntryReceiptNumber('');
      } else if (admRule === 'OBLIGATORIO') {
        setEntryFeeRule(studentCondition === 'REGULAR' ? 'TODOS' : 'NUEVOS_SOLO');
        setEntryFeeAmount(String(effectiveEntryAmount));
        setPayEntryNow(true);
      } else {
        // OPCIONAL
        setEntryFeeRule('PERSONALIZADO');
        setEntryFeeAmount(String(effectiveEntryAmount));
        setPayEntryNow(false);
      }

      // Determinar regla de Matrícula
      let enrRule: FeeRule = 'OBLIGATORIO';
      if (enrollmentConcept) {
        if (studentCondition === 'NUEVO') enrRule = enrollmentConcept.rule_new;
        else if (studentCondition === 'REGULAR') enrRule = enrollmentConcept.rule_regular;
        else if (studentCondition === 'TRASLADO') enrRule = enrollmentConcept.rule_transfer;
        else if (studentCondition === 'REINGRESANTE') enrRule = enrollmentConcept.rule_reentry;
      }

      const effectiveEnrollAmount = Number(enrollmentConcept?.default_amount) || defaultEnrollment;

      if (enrRule === 'EXONERADO') {
        setEnrollmentPaymentRule('EXONERADO');
        setEnrollmentFee('0');
      } else {
        const modalRule = (studentCondition === 'REGULAR' ? schoolConfig?.enrollment_rule_regular : schoolConfig?.enrollment_rule_new) || 'OBLIGATORIO_AHORA';
        setEnrollmentPaymentRule(modalRule);
        setEnrollmentFee(String(effectiveEnrollAmount));
      }
    }
  }, [activeGrade, studentCondition, schoolConfig, feeConcepts]);

  // Recalcular pensión neta con descuento
  const netMonthlyTuition = useMemo(() => {
    const base = Number(monthlyTuition) || 0;
    const pct = Number(discountPct) || 0;
    if (discountType === 'BECA_COMPLETA') return 0;
    if (pct > 0) {
      return Math.max(0, base - (base * pct) / 100);
    }
    return base;
  }, [monthlyTuition, discountType, discountPct]);

  // Generar meses del cronograma
  const tuitionScheduleMonths = useMemo(() => {
    const months = [
      { num: '03', name: 'Marzo', day: '05' },
      { num: '04', name: 'Abril', day: '05' },
      { num: '05', name: 'Mayo', day: '05' },
      { num: '06', name: 'Junio', day: '05' },
      { num: '07', name: 'Julio', day: '05' },
      { num: '08', name: 'Agosto', day: '05' },
      { num: '09', name: 'Setiembre', day: '05' },
      { num: '10', name: 'Octubre', day: '05' },
      { num: '11', name: 'Noviembre', day: '05' },
      { num: '12', name: 'Diciembre', day: '05' },
    ];
    return months;
  }, []);

  if (!isOpen) return null;

  // =========================================================================
  // NAVEGACIÓN Y VALIDACIONES ENTRE PASOS
  // =========================================================================

  const handleNextFromStep1 = () => {
    if (guardianMode === 'SELECT') {
      if (!selectedGuardian) {
        onNotify({
          type: 'warning',
          title: 'Selecciona un apoderado',
          message: 'Debes seleccionar al apoderado de la lista o marcar la opción para registrar uno nuevo.',
        });
        return;
      }
    } else {
      if (!gDocNum.trim() || !gFirstName.trim() || !gLastName.trim() || !gPhone.trim()) {
        onNotify({
          type: 'warning',
          title: 'Campos requeridos',
          message: 'DNI, nombres, apellidos y teléfono del apoderado son indispensables.',
        });
        return;
      }
    }

    // Configurar modo de alumno sugerido
    if (guardianMode === 'SELECT' && selectedGuardian) {
      const children = students.filter((s) => s.guardian_id === selectedGuardian.id);
      if (children.length > 0) {
        setStudentMode('EXISTING_CHILD');
      } else {
        setStudentMode('NEW_STUDENT');
      }
    } else {
      setStudentMode('NEW_STUDENT');
    }

    setStep(2);
  };

  const handleNextFromStep2 = () => {
    if (studentMode === 'EXISTING_CHILD' || studentMode === 'SEARCH_STUDENT') {
      if (!selectedStudent) {
        onNotify({
          type: 'warning',
          title: 'Selecciona al estudiante',
          message: 'Debes elegir al estudiante de la lista o ingresar sus datos como nuevo alumno.',
        });
        return;
      }
    } else {
      if (!sDocNum.trim() || !sFirstName.trim() || !sLastName.trim()) {
        onNotify({
          type: 'warning',
          title: 'Datos del estudiante incompletos',
          message: 'DNI, nombres y apellidos del alumno son obligatorios.',
        });
        return;
      }
    }

    // VALIDACIÓN ESTRICTA: Alumno Egresado o Matrícula no permitida desde Lookup
    if (lookupResult && !lookupResult.canEnroll) {
      onNotify({
        type: 'error',
        title: lookupResult.reason === 'GRADUATED' ? 'Estudiante Egresado' : 'Matrícula no permitida',
        message: lookupResult.message || 'No es posible proceder con la matrícula de este estudiante en este año lectivo.',
      });
      return;
    }

    // VALIDACIÓN ESTRICTA: Solo debe existir 1 alumno por año académico
    if (duplicateEnrollment) {
      onNotify({
        type: 'error',
        title: 'Matrícula duplicada no permitida',
        message: `El estudiante ya se encuentra matriculado en el Año Académico ${activeAcademicYear?.year_name || ''} (Código: ${duplicateEnrollment.enrollment_code || duplicateEnrollment.id}). Solo se permite una matrícula por alumno por período escolar.`,
      });
      return;
    }

    setStep(3);
  };

  const handleNextFromStep3 = () => {
    const feeNum = Number(entryFeeAmount) || 0;
    if (feeNum > 0 && payEntryNow && !entryReceiptNumber.trim()) {
      onNotify({
        type: 'warning',
        title: 'Comprobante de cuota de ingreso',
        message: 'Has seleccionado pago al contado de la cuota de ingreso. Ingresa el número de recibo o comprobante.',
      });
      return;
    }
    setStep(4);
  };

  const handleNextFromStep4 = () => {
    if (!selectedSectionId) {
      onNotify({
        type: 'warning',
        title: 'Selecciona el aula',
        message: 'Debes asignar un grado y aula/sección con vacante disponible para el estudiante.',
      });
      return;
    }

    const fee = enrollmentPaymentRule === 'EXONERADO' ? 0 : Number(enrollmentFee) || 0;
    if (enrollmentPaymentRule === 'OBLIGATORIO_AHORA' && fee > 0 && !enrollmentReceiptNumber.trim()) {
      onNotify({
        type: 'warning',
        title: 'Pago obligatorio de matrícula',
        message: 'Has seleccionado pago al contado obligatorio de la matrícula. Debes indicar el N° de recibo o comprobante de caja.',
      });
      return;
    }

    setStep(5);
  };

  // =========================================================================
  // ENVÍO FINAL DE LA MATRÍCULA INTEGRAL
  // =========================================================================
  const handleConfirmIntegralEnrollment = async () => {
    setSubmitting(true);
    try {
      const isExonerated = enrollmentPaymentRule === 'EXONERADO';
      const effectiveEnrollmentFee = isExonerated ? 0 : Number(enrollmentFee) || 0;
      const isPayEnrollmentNow = enrollmentPaymentRule === 'OBLIGATORIO_AHORA';

      const payload = {
        action: 'INTEGRAL_ENROLLMENT',
        guardian:
          guardianMode === 'SELECT' && selectedGuardian
            ? {
                id: selectedGuardian.id,
                phone: gPhone || selectedGuardian.phone,
                email: gEmail || selectedGuardian.email,
                address: gAddress || selectedGuardian.address,
              }
            : {
                isNew: true,
                document_type: gDocType,
                document_number: gDocNum.trim(),
                first_name: gFirstName.trim(),
                last_name: gLastName.trim(),
                relationship: gRelationship,
                phone: gPhone.trim(),
                alt_phone: gAltPhone.trim() || null,
                email: gEmail.trim() || null,
                address: gAddress.trim() || null,
                billing_tax_id: gBillingTaxId.trim() || null,
                billing_name: gBillingName.trim() || null,
              },
        student:
          (studentMode === 'EXISTING_CHILD' || studentMode === 'SEARCH_STUDENT') && selectedStudent
            ? {
                id: selectedStudent.id,
                student_condition: studentCondition,
              }
            : {
                isNew: true,
                student_condition: studentCondition,
                document_type: sDocType,
                document_number: sDocNum.trim(),
                first_name: sFirstName.trim(),
                last_name: sLastName.trim(),
                gender: sGender,
                birth_date: sBirthDate || null,
                blood_type: sBloodType,
                allergies_medical: sAllergies.trim() || null,
                emergency_contact_phone: sEmergencyPhone.trim() || gPhone.trim() || null,
                health_insurance: sHealthInsurance,
                previous_school: sPreviousSchool.trim() || null,
              },
        enrollment: {
          academic_year_id: selectedYearId,
          section_id: selectedSectionId,
          enrollment_type: studentCondition,
          enrollment_date: new Date().toISOString().split('T')[0],
          enrollment_fee: effectiveEnrollmentFee,
          pay_enrollment_now: isPayEnrollmentNow,
          enrollment_payment_method: enrollmentPayMethod,
          enrollment_receipt_number:
            enrollmentReceiptNumber.trim() ||
            (enrollmentPaymentRule === 'DIFERIDO'
              ? `DIF-MAT-${Date.now().toString().slice(-4)}`
              : `REC-MAT-${Date.now().toString().slice(-4)}`),
          entry_fee_rule: entryFeeRule,
          entry_fee: Number(entryFeeAmount) || 0,
          pay_entry_now: payEntryNow,
          entry_payment_method: entryPayMethod,
          entry_receipt_number: entryReceiptNumber.trim() || undefined,
          monthly_tuition_fee: netMonthlyTuition,
          discount_type: discountType,
          discount_percentage: Number(discountPct) || 0,
          notes: enrollmentNotes.trim() || undefined,
          allow_overcapacity: false,
        },
      };

      const res = await fetch('/api/admin/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Error al emitir la matrícula');
      }

      // Preparar resumen para la pantalla de éxito
      const studentNameDisplay =
        (studentMode === 'EXISTING_CHILD' || studentMode === 'SEARCH_STUDENT') && selectedStudent
          ? `${selectedStudent.first_name} ${selectedStudent.last_name}`
          : `${sFirstName} ${sLastName}`;

      const guardianNameDisplay =
        guardianMode === 'SELECT' && selectedGuardian
          ? `${selectedGuardian.first_name} ${selectedGuardian.last_name}`
          : `${gFirstName} ${gLastName}`;

      const guardianPhoneDisplay =
        guardianMode === 'SELECT' && selectedGuardian ? selectedGuardian.phone : gPhone;

      const guardianUser = data.guardianUser;

      setCompletedEnrollment({
        enrollmentCode: data.enrollmentCode,
        enrollmentId: data.enrollmentId,
        studentName: studentNameDisplay,
        guardianName: guardianNameDisplay,
        guardianPhone: guardianPhoneDisplay,
        sectionName: activeSection?.full_name || 'Aula asignada',
        gradeName: activeGrade?.grade_name || 'Grado',
        enrollmentFee: effectiveEnrollmentFee,
        enrollmentPaymentRule,
        payEnrollmentNow: isPayEnrollmentNow,
        entryFee: Number(entryFeeAmount) || 0,
        monthlyTuition: netMonthlyTuition,
        guardianUsername: guardianUser?.username,
        guardianTempPassword: guardianUser?.tempPassword,
        isNewUser: guardianUser?.isNewUser,
      });

      onEnrollmentSuccess();
      onNotify({
        type: 'success',
        title: '¡Matrícula Emitida con Éxito!',
        message: `Se confirmó la matrícula ${data.enrollmentCode} y se generaron sus 10 pensiones en Finanzas.`,
      });
    } catch (err: any) {
      console.error(err);
      onNotify({
        type: 'error',
        title: 'No se pudo completar la matrícula',
        message: err.message || 'Ocurrió un error inesperado en el servidor.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* ========================================================================= */}
        {/* CABECERA CON STEPPER MULTIPASO                                           */}
        {/* ========================================================================= */}
        <div className="px-6 py-5 bg-[#223a5e] text-white flex flex-col gap-4 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#2fbf71]/20 border border-[#2fbf71]/40 flex items-center justify-center text-[#2fbf71] shadow-inner">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                  <span>Flujo Integral de Admisión & Matrícula</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#2fbf71] text-white uppercase tracking-wider">
                    Oficial
                  </span>
                </h3>
                <p className="text-xs text-slate-300">
                  Verificación de Apoderado ➔ Condición de Alumno ➔ Regla de Cuota de Ingreso ➔ Matrícula y Pensiones
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Visual con 5 pasos */}
          <div className="grid grid-cols-5 gap-2 pt-1 border-t border-white/10 text-center">
            {[
              { num: 1, label: '1. Apoderado' },
              { num: 2, label: '2. Estudiante' },
              { num: 3, label: '3. Cuota Ingreso' },
              { num: 4, label: '4. Matrícula & Caja' },
              { num: 5, label: '5. Confirmación' },
            ].map((s) => {
              const isActive = step === s.num;
              const isPassed = step > s.num;
              return (
                <div
                  key={s.num}
                  className={`py-1.5 px-1 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    isActive
                      ? 'bg-[#2fbf71] text-white shadow-sm'
                      : isPassed
                      ? 'bg-white/15 text-emerald-300'
                      : 'bg-white/5 text-slate-400 opacity-60'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black border border-current">
                    {isPassed ? '✓' : s.num}
                  </span>
                  <span className="hidden sm:inline text-[11px] truncate">{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CUERPO DEL PASO ACTIVO                                                    */}
        {/* ========================================================================= */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* ===================================================================== */}
          {/* PASO 1: VERIFICAR O REGISTRAR AL APODERADO                            */}
          {/* ===================================================================== */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-900 leading-relaxed">
                  <strong className="block font-bold mb-0.5">Paso 1: Verificación de la Familia / Apoderado</strong>
                  Primero comprobamos si el apoderado ya existe en la base de datos institucional. Una familia puede tener varios hijos ya inscritos (lo que facilita renovaciones o matrículas simultáneas de hermanos sin duplicar datos).
                </div>
              </div>

              {/* Selector de modo: Existente vs Nuevo */}
              <div className="flex rounded-2xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setGuardianMode('SELECT')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-2 ${
                    guardianMode === 'SELECT'
                      ? 'bg-white text-[#223a5e] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Buscar Apoderado Existente (Familia en Colegio)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGuardianMode('NEW');
                    setSelectedGuardian(null);
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-2 ${
                    guardianMode === 'NEW'
                      ? 'bg-white text-[#223a5e] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <PlusCircle className="w-3.5 h-3.5 text-[#2fbf71]" />
                  <span>Registrar Nueva Familia / Apoderado</span>
                </button>
              </div>

              {guardianMode === 'SELECT' && (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={guardianSearchQuery}
                      onChange={(e) => setGuardianSearchQuery(e.target.value)}
                      placeholder="Escribe el DNI, Apellidos, Nombres o Teléfono del apoderado..."
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                    />
                  </div>

                  {/* Resultados / Tarjetas de Selección */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                    {filteredGuardians.map((g) => {
                      const isSelected = selectedGuardian?.id === g.id;
                      const childrenCount = g.students?.length || g.students_count || 0;
                      return (
                        <div
                          key={g.id}
                          onClick={() => {
                            setSelectedGuardian(g);
                            setGPhone(g.phone);
                            setGAddress(g.address || '');
                            setGEmail(g.email || '');
                          }}
                          className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'bg-emerald-50/70 border-[#2fbf71] shadow-xs ring-2 ring-[#2fbf71]/20'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="text-xs font-bold text-[#223a5e] leading-snug">
                                  {g.last_name}, {g.first_name}
                                </h4>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {g.document_type}: {g.document_number} &bull; {g.relationship}
                                </span>
                              </div>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-purple-50 text-purple-700 border border-purple-200">
                                {childrenCount} Hijo(s)
                              </span>
                            </div>

                            <div className="mt-2 pt-2 border-t border-slate-100 space-y-1 text-[11px] text-slate-600 font-mono">
                              <p className="flex items-center gap-1.5">
                                <Phone className="w-3 h-3 text-[#2fbf71]" />
                                <span>{g.phone}</span>
                              </p>
                              {g.address && (
                                <p className="flex items-center gap-1.5 text-slate-500 truncate">
                                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="truncate">{g.address}</span>
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Lista de hijos existentes si tiene */}
                          {g.students && g.students.length > 0 && (
                            <div className="mt-2.5 pt-2 border-t border-slate-100">
                              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                Estudiantes ya registrados:
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {g.students.map((st) => (
                                  <span
                                    key={st.id}
                                    className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-semibold text-[10px]"
                                  >
                                    👦 {st.first_name} {st.last_name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {filteredGuardians.length === 0 && (
                      <div className="col-span-full p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 text-xs">
                        No se encontró ningún apoderado con esos datos. Puedes presionar arriba en <strong>&quot;Registrar Nueva Familia&quot;</strong>.
                      </div>
                    )}
                  </div>

                  {selectedGuardian && (
                    <div className="p-4 rounded-2xl bg-[#e6f9ef] border border-[#2fbf71]/50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-[#26995b]" />
                        <div>
                          <p className="text-xs font-bold text-[#223a5e]">
                            Apoderado Seleccionado: {selectedGuardian.first_name} {selectedGuardian.last_name}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            DNI: {selectedGuardian.document_number} &bull; Teléfono: {selectedGuardian.phone}
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-xl bg-white text-[#26995b] font-bold text-xs border border-emerald-200">
                        Listo para continuar
                      </span>
                    </div>
                  )}
                </div>
              )}

              {guardianMode === 'NEW' && (
                <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
                  <h4 className="text-xs font-bold text-[#223a5e] uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#2fbf71]" />
                    <span>Ficha de Nuevo Apoderado Responsable</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Tipo Doc *</label>
                      <select
                        value={gDocType}
                        onChange={(e) => setGDocType(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                      >
                        <option value="DNI">DNI (Perú)</option>
                        <option value="CE">Carnet de Extranjería</option>
                        <option value="PASAPORTE">Pasaporte</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">N° Documento *</label>
                      <input
                        type="text"
                        required
                        value={gDocNum}
                        onChange={(e) => setGDocNum(e.target.value)}
                        placeholder="Ej: 45892147"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 font-mono focus:outline-none focus:border-[#2fbf71]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Parentesco *</label>
                      <select
                        value={gRelationship}
                        onChange={(e) => setGRelationship(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                      >
                        <option value="PADRE">Padre</option>
                        <option value="MADRE">Madre</option>
                        <option value="TUTOR">Tutor Legal</option>
                        <option value="ABUELO">Abuelo / Abuela</option>
                        <option value="OTRO">Otro Apoderado</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Nombres *</label>
                      <input
                        type="text"
                        required
                        value={gFirstName}
                        onChange={(e) => setGFirstName(e.target.value)}
                        placeholder="Nombres completos"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Apellidos *</label>
                      <input
                        type="text"
                        required
                        value={gLastName}
                        onChange={(e) => setGLastName(e.target.value)}
                        placeholder="Apellidos completos"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono / WhatsApp *</label>
                      <input
                        type="tel"
                        required
                        value={gPhone}
                        onChange={(e) => setGPhone(e.target.value)}
                        placeholder="987654321"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 font-mono focus:outline-none focus:border-[#2fbf71]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Dirección Domiciliaria</label>
                      <input
                        type="text"
                        value={gAddress}
                        onChange={(e) => setGAddress(e.target.value)}
                        placeholder="Av. Las Camelias 450, Urb..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Correo Electrónico</label>
                      <input
                        type="email"
                        value={gEmail}
                        onChange={(e) => setGEmail(e.target.value)}
                        placeholder="familia@correo.com"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===================================================================== */}
          {/* PASO 2: ESTUDIANTE & CONDICIÓN ESCOLAR                                */}
          {/* ===================================================================== */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200/80 flex items-start gap-3">
                <GraduationCap className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                <div className="text-xs text-purple-900 leading-relaxed">
                  <strong className="block font-bold mb-0.5">Paso 2: Condición del Estudiante</strong>
                  Teniendo identificado al apoderado, determinamos si el alumno es <strong>Nuevo</strong>, <strong>Antiguo (Regular)</strong> o viene de <strong>Traslado / Reingreso</strong> tras un tiempo. Esta condición define las reglas financieras y de admisión institucional.
                </div>
              </div>

              {/* Selector de Condición Escolar */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Condición del Alumno para este Año Lectivo *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div
                    onClick={() => setStudentCondition('NUEVO')}
                    className={`p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                      studentCondition === 'NUEVO'
                        ? 'bg-emerald-50 border-[#2fbf71] shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded-full text-[9.5px] font-black bg-emerald-100 text-emerald-800 uppercase mb-1.5">
                        Ingreso Nuevo
                      </span>
                      <h4 className="text-xs font-black text-[#223a5e]">Alumno Nuevo</h4>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Ingresa por primera vez a la institución educativa. Aplica cuota de ingreso según política.
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => setStudentCondition('REGULAR')}
                    className={`p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                      studentCondition === 'REGULAR'
                        ? 'bg-blue-50 border-blue-500 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded-full text-[9.5px] font-black bg-blue-100 text-blue-800 uppercase mb-1.5">
                        Continuidad
                      </span>
                      <h4 className="text-xs font-black text-[#223a5e]">Alumno Regular (Antiguo)</h4>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Estudió el año anterior y continúa sus estudios escolares. Exonerado de cuota de ingreso.
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => setStudentCondition('TRASLADO')}
                    className={`p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                      studentCondition === 'TRASLADO'
                        ? 'bg-purple-50 border-purple-500 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded-full text-[9.5px] font-black bg-purple-100 text-purple-800 uppercase mb-1.5">
                        Traslado Externo
                      </span>
                      <h4 className="text-xs font-black text-[#223a5e]">Alumno Traslado</h4>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Proviene de otro colegio y se incorpora a un grado regular intermedio con vacante.
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => setStudentCondition('REINGRESANTE')}
                    className={`p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                      studentCondition === 'REINGRESANTE'
                        ? 'bg-amber-50 border-amber-500 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded-full text-[9.5px] font-black bg-amber-100 text-amber-800 uppercase mb-1.5">
                        Reincorporación
                      </span>
                      <h4 className="text-xs font-black text-[#223a5e]">Alumno Reingresante</h4>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Estudiante que estuvo retirado o inactivo en años previos y retoma sus estudios en el colegio.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Si el apoderado ya tiene hijos, ofrecer selección directa */}
              {existingChildrenOfGuardian.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <span className="text-xs font-bold text-[#223a5e] uppercase tracking-wider block">
                    Hijos ya registrados de esta familia:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {existingChildrenOfGuardian.map((c) => {
                      const isSel = selectedStudent?.id === c.id;
                      const isAlreadyEnrolled = enrollments.some(
                        (e) =>
                          e.academic_year_id === activeAcademicYear?.id &&
                          e.student_id === c.id &&
                          e.status !== 'CANCELLED'
                      );

                      return (
                        <div
                          key={c.id}
                          onClick={() => {
                            setSelectedStudent(c);
                            setStudentMode('EXISTING_CHILD');
                          }}
                          className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                            isSel
                              ? isAlreadyEnrolled
                                ? 'bg-red-50 border-red-400 ring-1 ring-red-400'
                                : 'bg-emerald-50 border-[#2fbf71] ring-1 ring-[#2fbf71]'
                              : isAlreadyEnrolled
                              ? 'bg-red-50/40 border-red-200 hover:border-red-300'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div>
                            <p className="text-xs font-bold text-[#223a5e]">
                              {c.first_name} {c.last_name}
                            </p>
                            <span className="text-[10px] text-slate-400 font-mono">DNI: {c.document_number}</span>
                          </div>
                          <div className="text-right">
                            {isAlreadyEnrolled ? (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-100 text-red-700">
                                ⚠️ Ya matriculado {activeAcademicYear?.year_name ? `(${activeAcademicYear.year_name})` : ''}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-[#2fbf71]">
                                {isSel ? 'Seleccionado ✓' : 'Seleccionar'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStudent(null);
                        setStudentMode('NEW_STUDENT');
                      }}
                      className="text-xs font-bold text-[#26995b] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Inscribir a otro hijo (Hermano nuevo)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Formulario de Estudiante si es nuevo registro */}
              {(studentMode === 'NEW_STUDENT' || existingChildrenOfGuardian.length === 0) && (
                <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
                  <h4 className="text-xs font-bold text-[#223a5e] uppercase tracking-wider flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-[#2fbf71]" />
                    <span>Datos del Estudiante</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Tipo Documento *</label>
                      <select
                        value={sDocType}
                        onChange={(e) => setSDocType(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                      >
                        <option value="DNI">DNI (Menor de edad)</option>
                        <option value="CE">Carnet de Extranjería</option>
                        <option value="PASAPORTE">Pasaporte</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700">N° Documento (DNI) *</label>
                        <button
                          type="button"
                          onClick={() => runStudentLookup(sDocNum)}
                          disabled={lookingUpStudent || !sDocNum.trim()}
                          className="text-[10px] text-[#2fbf71] hover:underline font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40"
                          title="Consultar historial del estudiante por DNI"
                        >
                          <Search className="w-2.5 h-2.5" />
                          <span>Autodetectar</span>
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={sDocNum}
                          onChange={(e) => setSDocNum(e.target.value)}
                          onBlur={() => {
                            if (sDocNum.trim().length >= 6) {
                              runStudentLookup(sDocNum);
                            }
                          }}
                          placeholder="Ej: 78945612"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 font-mono focus:outline-none focus:border-[#2fbf71]"
                        />
                        {lookingUpStudent && (
                          <RefreshCw className="w-3.5 h-3.5 text-[#2fbf71] animate-spin absolute right-2.5 top-2.5" />
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Género *</label>
                      <select
                        value={sGender}
                        onChange={(e) => setSGender(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                      >
                        <option value="M">👦 Masculino</option>
                        <option value="F">👧 Femenino</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Nombres del Alumno *</label>
                      <input
                        type="text"
                        required
                        value={sFirstName}
                        onChange={(e) => setSFirstName(e.target.value)}
                        placeholder="Nombres completos"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Apellidos del Alumno *</label>
                      <input
                        type="text"
                        required
                        value={sLastName}
                        onChange={(e) => setSLastName(e.target.value)}
                        placeholder="Apellidos completos"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Fecha de Nacimiento</label>
                      <input
                        type="date"
                        value={sBirthDate}
                        onChange={(e) => setSBirthDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                      />
                    </div>

                    {studentCondition === 'TRASLADO' && (
                      <div className="sm:col-span-3">
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Colegio de Procedencia (Traslado)
                        </label>
                        <input
                          type="text"
                          value={sPreviousSchool}
                          onChange={(e) => setSPreviousSchool(e.target.value)}
                          placeholder="Nombre de la institución educativa anterior..."
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Alerta de Lookup Inteligente: Egresado */}
              {lookupResult && !lookupResult.canEnroll && lookupResult.reason === 'GRADUATED' && (
                <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 flex items-start gap-3.5 text-xs text-amber-950 shadow-sm animate-in fade-in">
                  <GraduationCap className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center justify-between">
                      <strong className="font-black text-amber-950 text-sm">
                        ⛔ Alumno Egresado de Secundaria
                      </strong>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 uppercase">
                        Estudios Culminados
                      </span>
                    </div>
                    <p className="text-amber-800 leading-relaxed">
                      {lookupResult.message || 'El estudiante culminó 5to de Secundaria en el colegio y se encuentra en estado EGRESADO. No es posible matricularlo en grados regulares de educación básica.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Alerta de Lookup Inteligente: Historial Detectado Exitosamente */}
              {lookupResult && lookupResult.found && lookupResult.canEnroll && (
                <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-300 flex items-start gap-3.5 text-xs text-emerald-950 shadow-xs animate-in fade-in">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between">
                      <strong className="font-bold text-emerald-950 text-sm">
                        ✓ Historial Escolar Identificado
                      </strong>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-900 uppercase">
                        Condición: {lookupResult.detectedCondition}
                      </span>
                    </div>
                    <p className="text-emerald-800 leading-relaxed">
                      {lookupResult.message}
                    </p>
                    {lookupResult.suggestedGradeId && (
                      <div className="text-[11px] text-emerald-900 font-semibold pt-1 border-t border-emerald-200/60 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Grado sugerido para este período: <strong>{grades.find(g => g.id === lookupResult.suggestedGradeId)?.grade_name || ''}</strong></span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Alerta bloqueante si se detecta matrícula duplicada para este año escolar */}
              {duplicateEnrollment && (
                <div className="p-4 rounded-2xl bg-red-50 border-2 border-red-300 flex items-start gap-3.5 text-xs text-red-900 shadow-sm animate-in fade-in">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center justify-between">
                      <strong className="font-bold text-red-950 text-sm">
                        ⛔ Alumno Ya Matriculado en este Período Lectivo
                      </strong>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-200 text-red-900">
                        {duplicateEnrollment.enrollment_code || duplicateEnrollment.id}
                      </span>
                    </div>
                    <p className="text-red-800 leading-relaxed">
                      El estudiante <strong>{selectedStudent ? `${selectedStudent.first_name} ${selectedStudent.last_name}` : sDocNum}</strong> ya cuenta con una matrícula registrada para el período escolar{' '}
                      <strong>{activeAcademicYear?.year_name || 'actual'}</strong>. Por normativa institucional del sistema, <strong>solo debe existir un alumno por año académico</strong>.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 bg-red-100/60 rounded-xl text-[11px] text-red-900 mt-2 font-medium">
                      <div>
                        <span className="text-red-700 block text-[10px]">Grado / Salón:</span>
                        <strong>{duplicateEnrollment.grade_name || ''} - {duplicateEnrollment.section_name || ''}</strong>
                      </div>
                      <div>
                        <span className="text-red-700 block text-[10px]">Condición:</span>
                        <strong className="uppercase">{duplicateEnrollment.enrollment_type || 'REGULAR'}</strong>
                      </div>
                      <div>
                        <span className="text-red-700 block text-[10px]">Estado:</span>
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                          {duplicateEnrollment.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===================================================================== */}
          {/* PASO 3: CUOTA DE INGRESO (REGLA PREDEFINIDA DEL COLEGIO)              */}
          {/* ===================================================================== */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 leading-relaxed">
                  <strong className="block font-bold mb-0.5">Paso 3: Cuota de Ingreso (Regla Institucional Predefinida)</strong>
                  Esta regla se encuentra predefinida por la dirección del colegio. Al matricularse, se aplica y muestra automáticamente según el estado del alumno (<strong>{studentCondition}</strong>).
                </div>
              </div>

              {/* Regla Institucional: Cuota Exonerada */}
              {(entryFeeRule === 'EXONERADO' || (studentCondition === 'REGULAR' && !customOverrideEntryFee)) && (
                <div className="p-6 rounded-2xl bg-white border-2 border-emerald-300 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-[#223a5e]">
                          {studentCondition === 'REGULAR' ? 'Alumno Regular (Continuidad)' : studentCondition === 'REINGRESANTE' ? 'Alumno Reingresante' : `Alumno ${studentCondition}`} &bull; Cuota Exonerada
                        </h4>
                        <span className="text-[11px] text-slate-500">
                          Regla institucional de conceptos de pago aplicada automáticamente
                        </span>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 uppercase tracking-wider self-start sm:self-center">
                      100% Exonerado (S/ 0.00)
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-950 space-y-2">
                    <p className="leading-relaxed">
                      ✓ <strong>Política Institucional:</strong> Según las políticas del colegio, los alumnos en condición <strong>{studentCondition}</strong> <strong>no pagan cuota de ingreso</strong>. Esta regla se aplica automáticamente con tarifa <strong>S/ 0.00</strong>, sin generar deuda ni requerir comprobante de pago.
                    </p>
                    <div className="pt-2 flex items-center justify-between font-bold border-t border-emerald-200/60 text-emerald-900">
                      <span>Monto a cobrar por Cuota de Ingreso:</span>
                      <span className="text-base font-black font-mono text-[#26995b]">S/ 0.00</span>
                    </div>
                  </div>

                  {/* Ajuste excepcional opcional */}
                  <div className="pt-1">
                    {!customOverrideEntryFee ? (
                      <button
                        type="button"
                        onClick={() => setCustomOverrideEntryFee(true)}
                        className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>⚙️ ¿Deseas aplicar una excepción o cobro especial a este alumno?</span>
                      </button>
                    ) : (
                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700">Ajuste Excepcional Autorizado:</span>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomOverrideEntryFee(false);
                              setEntryFeeAmount('0');
                              setPayEntryNow(false);
                            }}
                            className="text-[10px] font-bold text-slate-500 hover:text-slate-800"
                          >
                            Reestablecer predefinido (S/ 0)
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Monto Excepcional (S/)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={entryFeeAmount}
                              onChange={(e) => setEntryFeeAmount(e.target.value)}
                              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold font-mono text-[#26995b]"
                            />
                          </div>
                          {Number(entryFeeAmount) > 0 && (
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">N° Comprobante / Recibo</label>
                              <input
                                type="text"
                                value={entryReceiptNumber}
                                onChange={(e) => setEntryReceiptNumber(e.target.value)}
                                placeholder="Ej: REC-ING-001"
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Regla Institucional: Cuota Aplicable (Obligatoria u Opcional) */}
              {(entryFeeRule !== 'EXONERADO' && (studentCondition !== 'REGULAR' || customOverrideEntryFee)) && (
                <div className="p-6 rounded-2xl bg-white border-2 border-[#2fbf71] shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-black">
                        <DollarSign className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-[#223a5e]">
                          {studentCondition === 'NUEVO' ? 'Alumno Nuevo (Ingreso)' : studentCondition === 'TRASLADO' ? 'Alumno por Traslado' : 'Alumno Reingresante'} &bull; Cuota Institucional
                        </h4>
                        <span className="text-[11px] text-slate-500">
                          Regla de conceptos de pago institucional aplicada automáticamente
                        </span>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 uppercase tracking-wider self-start sm:self-center">
                      Cuota {entryFeeRule === 'PERSONALIZADO' ? 'Opcional' : 'Obligatoria'} ({studentCondition})
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    ℹ️ Por política institucional predefinida del colegio, todo alumno ingresante debe formalizar su vacante mediante el abono de la cuota de ingreso correspondiente.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Monto de Cuota de Ingreso (S/) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">S/</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={entryFeeAmount}
                          onChange={(e) => setEntryFeeAmount(e.target.value)}
                          className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black font-mono text-[#26995b] focus:outline-none focus:border-[#2fbf71]"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Tarifa oficial del grado asignado por dirección escolar.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Modalidad de Cobro de la Cuota
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="radio"
                            name="payEntryType"
                            checked={payEntryNow}
                            onChange={() => setPayEntryNow(true)}
                            className="w-4 h-4 text-[#2fbf71] focus:ring-0"
                          />
                          <span className="text-xs font-bold text-slate-800">
                            Pagar ahora en Caja al contado (+S/ {entryFeeAmount} ingresa a Caja)
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="radio"
                            name="payEntryType"
                            checked={!payEntryNow}
                            onChange={() => setPayEntryNow(false)}
                            className="w-4 h-4 text-[#2fbf71] focus:ring-0"
                          />
                          <span className="text-xs font-bold text-slate-800">
                            Programar pago posterior / diferido (queda pendiente de cobro)
                          </span>
                        </label>
                      </div>

                      {payEntryNow && (
                        <div className="grid grid-cols-2 gap-2 pt-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-1">Medio de Pago *</label>
                            <select
                              value={entryPayMethod}
                              onChange={(e) => setEntryPayMethod(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                            >
                              <option value="EFECTIVO">Efectivo (Ventanilla)</option>
                              <option value="YAPE_PLIN">Yape / Plin</option>
                              <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                              <option value="TARJETA">Tarjeta Débito/Crédito</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-1">N° Recibo / Operación *</label>
                            <input
                              type="text"
                              value={entryReceiptNumber}
                              onChange={(e) => setEntryReceiptNumber(e.target.value)}
                              placeholder="Ej: REC-ING-041"
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===================================================================== */}
          {/* PASO 4: AULA CON VACANTES, REGLA DE MATRÍCULA & CRONOGRAMA           */}
          {/* ===================================================================== */}
          {step === 4 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-start gap-3">
                <CreditCard className="w-5 h-5 text-[#26995b] shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-950 leading-relaxed">
                  <strong className="block font-bold mb-0.5">Paso 4: Aula con Vacantes, Regla de Matrícula y Cronograma de Pensiones</strong>
                  Verifica y asigna el aula según las vacantes disponibles separadas por niveles educativos. Configura la modalidad de matrícula (al contado, diferido o exonerado) según las políticas del colegio y la condición del alumno (<strong>{studentCondition}</strong>).
                </div>
              </div>

              {/* 4.1 Selección de Nivel Educativo, Grado y Aula (SOLO CON VACANTES) */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#223a5e] uppercase tracking-wider block">
                    1. Grado y Aula de Destino (Solo Aulas con Vacantes)
                  </span>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    Selecciona el nivel para explorar sus aulas disponibles
                  </span>
                </div>

                {/* Selector de Niveles Educativos (INICIAL, PRIMARIA, SECUNDARIA) */}
                <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
                  {(['INICIAL', 'PRIMARIA', 'SECUNDARIA'] as const).map((lvl) => {
                    const isSelected = selectedLevel === lvl;
                    const info = levelVacanciesSummary[lvl];
                    const icon = lvl === 'INICIAL' ? '🧸' : lvl === 'PRIMARIA' ? '🎒' : '🎓';
                    const label = lvl === 'INICIAL' ? 'Nivel Inicial' : lvl === 'PRIMARIA' ? 'Nivel Primaria' : 'Nivel Secundaria';

                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setSelectedLevel(lvl)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-bold text-xs transition cursor-pointer ${
                          isSelected
                            ? 'bg-white text-[#223a5e] shadow-sm border border-slate-200/80 ring-1 ring-black/5'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                        }`}
                      >
                        <span className="text-sm">{icon}</span>
                        <span>{label}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            info.totalVacancies > 0
                              ? isSelected
                                ? 'bg-emerald-100 text-[#26995b]'
                                : 'bg-slate-200 text-slate-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {info.totalVacancies > 0 ? `${info.totalVacancies} vac. libres` : 'Lleno'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Grado y Sección en el Nivel Elegido */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Grado Escolar en {selectedLevel === 'INICIAL' ? 'Inicial' : selectedLevel === 'PRIMARIA' ? 'Primaria' : 'Secundaria'} (Solo con Vacantes) *
                    </label>
                    {gradesWithVacanciesInLevel.length === 0 ? (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs">
                        ⚠️ No hay grados con vacantes disponibles en el nivel {selectedLevel}. Todas sus aulas se encuentran al 100% de aforo.
                      </div>
                    ) : (
                      <select
                        value={selectedGradeId}
                        onChange={(e) => {
                          setSelectedGradeId(e.target.value);
                          setSelectedSectionId('');
                        }}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                      >
                        <option value="">-- Seleccionar Grado ({gradesWithVacanciesInLevel.length} disponibles) --</option>
                        {gradesWithVacanciesInLevel.map((grd) => (
                          <option key={grd.id} value={grd.id}>
                            {grd.grade_name} ({grd.totalVacancies} {grd.totalVacancies === 1 ? 'vacante libre' : 'vacantes libres'})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Sección / Salón Disponible *
                    </label>
                    <select
                      value={selectedSectionId}
                      onChange={(e) => setSelectedSectionId(e.target.value)}
                      disabled={!selectedGradeId || sectionsWithVacancies.length === 0}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71] disabled:opacity-50"
                    >
                      <option value="">
                        {!selectedGradeId
                          ? '-- Primero elige un grado --'
                          : sectionsWithVacancies.length === 0
                          ? '-- Sin secciones disponibles --'
                          : `-- Seleccionar Sección (${sectionsWithVacancies.length} disponibles) --`}
                      </option>
                      {sectionsWithVacancies.map((sec) => {
                        const freeVacancies = Number(sec.capacity) - Number(sec.enrolled_count);
                        return (
                          <option key={sec.id} value={sec.id}>
                            Sección &quot;{sec.section_letter}&quot; ({sec.full_name}) &bull; {freeVacancies} {freeVacancies === 1 ? 'vacante libre' : 'vacantes libres'} &bull; Turno {sec.shift}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {activeSection && (
                  <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-indigo-950 text-sm">{activeSection.full_name}</span>
                        <span className="px-2 py-0.5 rounded-full bg-white text-indigo-800 font-bold text-[10px] border border-indigo-200">
                          Turno {activeSection.shift}
                        </span>
                      </div>
                      <p className="text-[11px] text-indigo-700">
                        👨‍🏫 Docente Tutor: <strong>{activeSection.tutor_name || 'Por asignar'}</strong>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 sm:text-right">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white font-black text-xs shadow-xs">
                        <Sparkles className="w-3.5 h-3.5" />
                        {Number(activeSection.capacity) - Number(activeSection.enrolled_count)} Vacantes Libres
                      </span>
                      <span className="text-[10px] text-indigo-800 bg-white/80 px-2 py-1 rounded-lg border border-indigo-200 font-semibold">
                        Aforo: {activeSection.enrolled_count} / {activeSection.capacity}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 4.2 Regla Predefinida de Matrícula según Estado del Alumno */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-xs font-bold text-[#223a5e] uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-[#26995b]" />
                      <span>2. Regla de Matrícula (Predefinida Institucionalmente)</span>
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Condición del Estudiante: <strong className="text-[#223a5e] uppercase">{studentCondition}</strong>
                      {studentCondition === 'REGULAR'
                        ? ' (Alumno regular/antiguo: Se aplica modalidad de continuidad)'
                        : ' (Alumno ingresante: Cobro al contado obligatorio predefinido)'}
                    </p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black self-start uppercase ${
                    enrollmentPaymentRule === 'OBLIGATORIO_AHORA'
                      ? 'bg-emerald-100 text-[#26995b]'
                      : enrollmentPaymentRule === 'DIFERIDO'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    {enrollmentPaymentRule === 'OBLIGATORIO_AHORA'
                      ? 'Cobro al Contado'
                      : enrollmentPaymentRule === 'DIFERIDO'
                      ? 'Pago Diferido'
                      : 'Exonerado'}
                  </span>
                </div>

                {/* Si el alumno es REGULAR (Antiguo): Selector entre Contado o Diferido */}
                {studentCondition === 'REGULAR' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div
                        onClick={() => {
                          setEnrollmentPaymentRule('OBLIGATORIO_AHORA');
                          if (enrollmentFee === '0') {
                            setEnrollmentFee(String(activeGrade?.default_enrollment_amount || 350));
                          }
                        }}
                        className={`p-3.5 rounded-xl border-2 transition cursor-pointer ${
                          enrollmentPaymentRule === 'OBLIGATORIO_AHORA'
                            ? 'bg-emerald-50 border-[#2fbf71]'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-[#223a5e]">Cobro al Contado en Caja</span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 uppercase">
                            Inmediato
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          El apoderado abona la matrícula en este momento en ventanilla y se registra el comprobante.
                        </p>
                      </div>

                      <div
                        onClick={() => {
                          setEnrollmentPaymentRule('DIFERIDO');
                          if (enrollmentFee === '0') {
                            setEnrollmentFee(String(activeGrade?.default_enrollment_amount || 350));
                          }
                        }}
                        className={`p-3.5 rounded-xl border-2 transition cursor-pointer ${
                          enrollmentPaymentRule === 'DIFERIDO'
                            ? 'bg-amber-50 border-amber-400'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-[#223a5e]">Compromiso Diferido (Crédito)</span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-800 uppercase">
                            Diferido
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Reserva la vacante hoy y genera la cuota PENDIENTE en Finanzas sin exigir recibo hoy.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Si el alumno es NUEVO o TRASLADO: Regla predefinida al contado obligatorio */
                  <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-950 flex items-start justify-between gap-3">
                    <p className="leading-relaxed">
                      ✓ <strong>Regla Institucional Predefinida:</strong> Para alumnos ingresantes ({studentCondition}), la matrícula se formaliza obligatoriamente mediante <strong>cobro al contado en ventanilla</strong>.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setEnrollmentPaymentRule(enrollmentPaymentRule === 'OBLIGATORIO_AHORA' ? 'DIFERIDO' : 'OBLIGATORIO_AHORA');
                      }}
                      className="text-[10px] text-slate-500 underline whitespace-nowrap hover:text-slate-800"
                    >
                      {enrollmentPaymentRule === 'OBLIGATORIO_AHORA' ? '¿Excepción: Diferido?' : 'Volver a Contado'}
                    </button>
                  </div>
                )}

                {/* Formulario según la modalidad de matrícula resultante */}
                {enrollmentPaymentRule === 'OBLIGATORIO_AHORA' && (
                  <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-200 space-y-3">
                    <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block">
                      Datos del Cobro en Caja Oficial:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Monto de Matrícula (S/) *</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">S/</span>
                          <input
                            type="number"
                            step="0.01"
                            required
                            value={enrollmentFee}
                            onChange={(e) => setEnrollmentFee(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black font-mono text-[#26995b] focus:outline-none focus:border-[#2fbf71]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Medio de Pago *</label>
                        <select
                          value={enrollmentPayMethod}
                          onChange={(e) => setEnrollmentPayMethod(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                        >
                          <option value="EFECTIVO">Efectivo (Ventanilla)</option>
                          <option value="YAPE_PLIN">Yape / Plin</option>
                          <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                          <option value="TARJETA">Tarjeta Débito/Crédito</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">N° Comprobante / Recibo *</label>
                        <input
                          type="text"
                          required
                          placeholder="Ej: REC-MAT-001"
                          value={enrollmentReceiptNumber}
                          onChange={(e) => setEnrollmentReceiptNumber(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold font-mono text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {enrollmentPaymentRule === 'DIFERIDO' && (
                  <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                        Compromiso de Matrícula Diferida:
                      </span>
                      <span className="text-[11px] text-amber-700 font-semibold">
                        ✓ No requiere comprobante ahora
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Monto de Matrícula a Deber (S/)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">S/</span>
                          <input
                            type="number"
                            step="0.01"
                            value={enrollmentFee}
                            onChange={(e) => setEnrollmentFee(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black font-mono text-amber-800 focus:outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Referencia o Convenio (Opcional)</label>
                        <input
                          type="text"
                          placeholder="Ej: Convenio pactado con Dirección"
                          value={enrollmentReceiptNumber}
                          onChange={(e) => setEnrollmentReceiptNumber(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-amber-800 font-medium">
                      ℹ️ El alumno quedará matriculado y su vacante reservada. Se generará una cuota de matrícula por S/ {enrollmentFee || 0} en estado <strong>PENDIENTE</strong> en Finanzas.
                    </p>
                  </div>
                )}

                {enrollmentPaymentRule === 'EXONERADO' && (
                  <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200 text-xs text-purple-900 space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      <span>Matrícula 100% Exonerada (S/ 0.00)</span>
                    </p>
                    <p className="text-[11px] text-purple-700">
                      El estudiante no registra costo de matrícula. Se asentará la matrícula oficial con costo S/ 0.00 y no generará saldo deudor.
                    </p>
                  </div>
                )}
              </div>

              {/* 4.3 Pensión Mensual Pactada & Cronograma */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
                <span className="text-xs font-bold text-[#223a5e] uppercase tracking-wider block">
                  3. Pensión Mensual Pactada & Descuentos
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Pensión Regular (S/)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={monthlyTuition}
                      onChange={(e) => setMonthlyTuition(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Descuento / Beca</label>
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                    >
                      <option value="NINGUNO">Ninguno (Tarifa completa)</option>
                      <option value="HERMANO">Descuento por Hermanos</option>
                      <option value="CONVENIO">Convenio Institucional</option>
                      <option value="BECA_PARCIAL">Beca Parcial</option>
                      <option value="BECA_COMPLETA">Beca Completa (100%)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">% Descuento</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={discountPct}
                      onChange={(e) => setDiscountPct(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-800"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-semibold">Pensión Neta Mensual a Cobrar:</span>
                  <span className="text-sm font-black text-[#26995b] font-mono">{formatSoles(netMonthlyTuition)}</span>
                </div>

                {/* Vista previa del Cronograma de 10 Cuotas */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                    Cronograma de las 10 Cuotas de Pensión a Generar en Finanzas:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {tuitionScheduleMonths.map((m) => (
                      <div key={m.num} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                        <span className="text-[11px] font-black text-[#223a5e] block">{m.name}</span>
                        <span className="text-[9.5px] text-slate-400 font-mono block">Vence: {m.day}/{m.num}</span>
                        <span className="text-xs font-bold text-[#26995b] font-mono block mt-1">
                          {formatSoles(netMonthlyTuition)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* PASO 5: RESUMEN Y CONFIRMACIÓN / ÉXITO                                */}
          {/* ===================================================================== */}
          {step === 5 && !completedEnrollment && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <ClipboardList className="w-5 h-5 text-[#223a5e] shrink-0 mt-0.5" />
                <div className="text-xs text-slate-700 leading-relaxed">
                  <strong className="block text-[#223a5e] font-bold mb-0.5">Paso 5: Resumen Ejecutivo de Matrícula</strong>
                  Revisa los datos consolidados antes de confirmar. Al presionar <strong>&quot;Emitir Matrícula Oficial&quot;</strong>, se registrará el contrato, se ingresará el pago a Caja Propia y se creará el cronograma de 10 pensiones en Finanzas.
                </div>
              </div>

              {/* Ficha Resumen */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Familia & Alumno */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
                  <span className="text-xs font-bold text-[#223a5e] uppercase tracking-wider block">
                    Datos del Estudiante y Familia
                  </span>
                  <div className="space-y-1.5 text-xs text-slate-700">
                    <p className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="text-slate-400">Estudiante:</span>
                      <strong className="text-[#223a5e]">
                        {(studentMode === 'EXISTING_CHILD' || studentMode === 'SEARCH_STUDENT') && selectedStudent
                          ? `${selectedStudent.first_name} ${selectedStudent.last_name}`
                          : `${sFirstName} ${sLastName}`}
                      </strong>
                    </p>
                    <p className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="text-slate-400">Condición Escolar:</span>
                      <span className="font-bold text-[#26995b] uppercase">{studentCondition}</span>
                    </p>
                    <p className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="text-slate-400">Apoderado:</span>
                      <strong>
                        {guardianMode === 'SELECT' && selectedGuardian
                          ? `${selectedGuardian.first_name} ${selectedGuardian.last_name}`
                          : `${gFirstName} ${gLastName}`}
                      </strong>
                    </p>
                    <p className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="text-slate-400">Teléfono / WhatsApp:</span>
                      <span className="font-mono">{guardianMode === 'SELECT' && selectedGuardian ? selectedGuardian.phone : gPhone}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-400">Aula Asignada:</span>
                      <strong className="text-purple-700">{activeSection?.full_name}</strong>
                    </p>
                  </div>
                </div>

                {/* Desglose Económico */}
                <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-3">
                  <span className="text-xs font-bold text-[#26995b] uppercase tracking-wider block">
                    Resumen Financiero y de Pagos
                  </span>
                  <div className="space-y-1.5 text-xs text-slate-700">
                    <p className="flex justify-between border-b border-emerald-100 pb-1">
                      <span className="text-slate-500">Matrícula:</span>
                      <strong className="font-mono text-[#26995b]">
                        {enrollmentPaymentRule === 'EXONERADO'
                          ? 'Exonerado (S/ 0.00)'
                          : `${formatSoles(Number(enrollmentFee) || 0)} ${
                              enrollmentPaymentRule === 'DIFERIDO' ? '(Compromiso diferido)' : '(Al contado)'
                            }`}
                      </strong>
                    </p>
                    {enrollmentPaymentRule === 'OBLIGATORIO_AHORA' && Number(enrollmentFee) > 0 && (
                      <p className="flex justify-between border-b border-emerald-100 pb-1 text-[11px]">
                        <span className="text-slate-400">Pago Matrícula:</span>
                        <span>{enrollmentPayMethod} &bull; {enrollmentReceiptNumber}</span>
                      </p>
                    )}
                    {enrollmentPaymentRule === 'DIFERIDO' && (
                      <p className="flex justify-between border-b border-emerald-100 pb-1 text-[11px]">
                        <span className="text-slate-400">Modalidad Matrícula:</span>
                        <span className="font-semibold text-amber-800">Compromiso diferido (Cuota pendiente)</span>
                      </p>
                    )}
                    <p className="flex justify-between border-b border-emerald-100 pb-1">
                      <span className="text-slate-500">Cuota de Ingreso:</span>
                      <strong className="font-mono">
                        {Number(entryFeeAmount) > 0 ? formatSoles(Number(entryFeeAmount)) : 'Exonerado (S/ 0)'}
                      </strong>
                    </p>
                    {Number(entryFeeAmount) > 0 && (
                      <p className="flex justify-between border-b border-emerald-100 pb-1 text-[11px]">
                        <span className="text-slate-400">Estado Cuota Ingreso:</span>
                        <span className="font-semibold text-emerald-800">
                          {payEntryNow ? `Pagado al contado (${entryPayMethod})` : 'Pactado diferido'}
                        </span>
                      </p>
                    )}
                    <p className="flex justify-between border-b border-emerald-100 pb-1">
                      <span className="text-slate-500">Pensión Mensual Pactada:</span>
                      <strong className="font-mono text-purple-700">{formatSoles(netMonthlyTuition)} / mes</strong>
                    </p>
                    <p className="flex justify-between text-[11px] pt-1">
                      <span className="text-slate-400">Cuotas a Generar:</span>
                      <strong className="text-slate-800">10 Mensualidades (Marzo a Diciembre)</strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* PANTALLA DE ÉXITO FINAL TRAS EMITIR                                  */}
          {/* ===================================================================== */}
          {completedEnrollment && (
            <div className="py-8 text-center space-y-6 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#26995b] flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-emerald-100 text-[#26995b] tracking-wider">
                  Matrícula Completada con Éxito
                </span>
                <h3 className="text-2xl font-black text-[#223a5e] mt-2">
                  {completedEnrollment.enrollmentCode}
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  El alumno <strong>{completedEnrollment.studentName}</strong> quedó formalmente matriculado en <strong>{completedEnrollment.sectionName}</strong>.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 max-w-md mx-auto text-xs text-left space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Apoderado Responsable:</span>
                  <strong className="text-slate-700">{completedEnrollment.guardianName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Estado de Matrícula:</span>
                  <strong className="font-mono text-xs">
                    {completedEnrollment.enrollmentPaymentRule === 'EXONERADO' ? (
                      <span className="text-purple-700">Exonerado (S/ 0.00)</span>
                    ) : completedEnrollment.enrollmentPaymentRule === 'DIFERIDO' ? (
                      <span className="text-amber-700">Compromiso Diferido ({formatSoles(completedEnrollment.enrollmentFee)} pendiente)</span>
                    ) : (
                      <span className="text-[#26995b]">Pagado en Caja ({formatSoles(completedEnrollment.enrollmentFee)})</span>
                    )}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Pensión Mensual:</span>
                  <strong className="text-purple-700 font-mono">{formatSoles(completedEnrollment.monthlyTuition)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Pensiones Autogeneradas:</span>
                  <strong className="text-slate-800">10 Cuotas en Finanzas</strong>
                </div>
              </div>

              {/* Tarjeta de Credenciales de Acceso para el Apoderado */}
              {completedEnrollment.guardianUsername && (
                <div className="p-4 rounded-2xl bg-indigo-50/90 border border-indigo-200/90 max-w-md mx-auto text-left space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4 text-indigo-600" />
                      <span>{completedEnrollment.isNewUser ? 'Acceso al Portal Creado para el Apoderado' : 'Cuenta de Acceso Existente'}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-indigo-100 text-indigo-800">
                      Rol: Apoderado
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-white border border-indigo-100">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Usuario (DNI):</span>
                      <strong className="font-mono text-indigo-900 text-sm">{completedEnrollment.guardianUsername}</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-indigo-100">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Contraseña Inicial:</span>
                      <strong className="font-mono text-indigo-900 text-sm">
                        {completedEnrollment.guardianTempPassword || '•••••••• (Ya configurada)'}
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[10.5px] text-indigo-800/80 leading-snug">
                      El apoderado ya puede ingresar a <strong>Educa360</strong> con su DNI para ver recibos, asistencias y notas.
                    </p>
                    {completedEnrollment.guardianTempPassword && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `Acceso a Educa360:\nUsuario: ${completedEnrollment.guardianUsername}\nContraseña: ${completedEnrollment.guardianTempPassword}`
                          );
                          setCopiedCreds(true);
                          setTimeout(() => setCopiedCreds(false), 2500);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-900 text-[10.5px] font-bold transition flex items-center gap-1 cursor-pointer shrink-0 ml-2"
                      >
                        {copiedCreds ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedCreds ? 'Copiado' : 'Copiar'}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <a
                  href={`https://wa.me/51${completedEnrollment.guardianPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                    `Estimado/a ${completedEnrollment.guardianName}, le confirmamos la matrícula oficial de ${completedEnrollment.studentName} en ${completedEnrollment.sectionName} con código ${completedEnrollment.enrollmentCode}.\n\n📱 Sus credenciales para acceder a la plataforma Educa360 son:\n• Usuario: ${completedEnrollment.guardianUsername || completedEnrollment.guardianPhone}\n• Contraseña: ${completedEnrollment.guardianTempPassword || '(Su contraseña ya configurada)'}\n\n¡Bienvenidos al nuevo año lectivo!`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Phone className="w-4 h-4" />
                  <span>Enviar Constancia & Credenciales por WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setCompletedEnrollment(null);
                    setStep(1);
                    onClose();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#223a5e] hover:bg-[#1a2d4b] text-white text-xs font-bold transition cursor-pointer"
                >
                  Finalizar y Volver a Matrículas
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* PIE DEL MODAL CON BOTONES DE NAVEGACIÓN                                    */}
        {/* ========================================================================= */}
        {!completedEnrollment && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((prev) => (prev - 1) as any)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Paso Anterior</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancelar
              </button>
            )}

            <div className="flex items-center gap-2">
              {step === 1 && (
                <button
                  type="button"
                  onClick={handleNextFromStep1}
                  className="px-5 py-2.5 rounded-xl bg-[#223a5e] hover:bg-[#1c2f4c] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <span>Siguiente: Condición de Alumno</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              {step === 2 && (
                <button
                  type="button"
                  disabled={!!duplicateEnrollment}
                  onClick={handleNextFromStep2}
                  className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm ${
                    duplicateEnrollment
                      ? 'bg-slate-300 cursor-not-allowed opacity-60'
                      : 'bg-[#223a5e] hover:bg-[#1c2f4c] cursor-pointer'
                  }`}
                >
                  <span>{duplicateEnrollment ? 'Bloqueado: Alumno ya Matriculado' : 'Siguiente: Cuota de Ingreso'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              {step === 3 && (
                <button
                  type="button"
                  onClick={handleNextFromStep3}
                  className="px-5 py-2.5 rounded-xl bg-[#223a5e] hover:bg-[#1c2f4c] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <span>Siguiente: Matrícula & Pensiones</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              {step === 4 && (
                <button
                  type="button"
                  onClick={handleNextFromStep4}
                  className="px-5 py-2.5 rounded-xl bg-[#223a5e] hover:bg-[#1c2f4c] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <span>Siguiente: Revisar Resumen</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              {step === 5 && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleConfirmIntegralEnrollment}
                  className="px-6 py-2.5 rounded-xl bg-[#2fbf71] hover:bg-[#26995b] text-white text-xs font-black transition flex items-center gap-2 cursor-pointer shadow-md shadow-[#2fbf71]/20 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{submitting ? 'Emitiendo Matrícula Oficial...' : 'Confirmar y Emitir Matrícula'}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
