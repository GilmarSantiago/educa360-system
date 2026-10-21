'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Building2,
  Calendar,
  Sliders,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Save,
  PlusCircle,
  RefreshCw,
  Layers,
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  FileText,
  Check,
  ChevronRight,
  Lock,
  Sparkles,
  ExternalLink,
  Trash2,
  UserCheck,
  GraduationCap,
  DollarSign,
  Edit2,
  Info,
  Tag,
  CreditCard,
  X,
} from 'lucide-react';
import { SchoolInstitutionProfile, SchoolConfig, AcademicYear, FeeConcept, FeeRule, FeeCategory } from '@/types';
import { AlertType } from '@/components/ui/AlertToast';
import Pagination from '@/components/ui/Pagination';

interface InstitutionManagerProps {
  onNotify: (alert: { type: AlertType; title: string; message?: string }) => void;
  currentUser?: {
    name?: string;
    username?: string;
    role?: string;
  };
}

export default function InstitutionManager({ onNotify, currentUser }: InstitutionManagerProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'years' | 'rules' | 'concepts'>('profile');
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingRules, setSavingRules] = useState(false);

  // Conceptos de Pago Dinámicos
  const [feeConcepts, setFeeConcepts] = useState<FeeConcept[]>([]);
  const [loadingFeeConcepts, setLoadingFeeConcepts] = useState(false);
  const [conceptModalOpen, setConceptModalOpen] = useState(false);
  const [editingConcept, setEditingConcept] = useState<FeeConcept | null>(null);
  const [savingConcept, setSavingConcept] = useState(false);

  // Formulario Concepto
  const [cName, setCName] = useState('');
  const [cCode, setCCode] = useState('');
  const [cCategory, setCCategory] = useState<FeeCategory>('TUITION');
  const [cAmount, setCAmount] = useState('0.00');
  const [cDescription, setCDescription] = useState('');
  const [cRuleNew, setCRuleNew] = useState<FeeRule>('OBLIGATORIO');
  const [cRuleRegular, setCRuleRegular] = useState<FeeRule>('OBLIGATORIO');
  const [cRuleTransfer, setCRuleTransfer] = useState<FeeRule>('OBLIGATORIO');
  const [cRuleReentry, setCRuleReentry] = useState<FeeRule>('OPCIONAL');
  const [cActive, setCActive] = useState(true);

  // Paginación Conceptos
  const [conceptPage, setConceptPage] = useState(1);
  const [conceptPageSize, setConceptPageSize] = useState(10);

  // Datos Institucionales
  const [institution, setInstitution] = useState<SchoolInstitutionProfile | null>(null);
  const [name, setName] = useState('');
  const [ruc, setRuc] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [logo, setLogo] = useState<string | null>(null);

  // Reglas Escolares
  const [config, setConfig] = useState<SchoolConfig | null>(null);
  const [gradingSystem, setGradingSystem] = useState<'vigesimal' | 'literal'>('vigesimal');
  const [passingGrade, setPassingGrade] = useState<number>(11);
  const [periodType, setPeriodType] = useState<'bimestre' | 'trimestre' | 'semestre'>('bimestre');
  const [monthlyDueDay, setMonthlyDueDay] = useState<number>(5);
  const [lateFeePercentage, setLateFeePercentage] = useState<number>(0.5);
  const [graceDays, setGraceDays] = useState<number>(3);
  const [allowMultipleCash, setAllowMultipleCash] = useState<boolean>(true);
  const [requireTokenDiff, setRequireTokenDiff] = useState<boolean>(true);

  // Reglas Institucionales de Matrícula y Admisión
  const [enrollmentRuleNew, setEnrollmentRuleNew] = useState<'OBLIGATORIO_AHORA' | 'DIFERIDO'>('OBLIGATORIO_AHORA');
  const [enrollmentRuleRegular, setEnrollmentRuleRegular] = useState<'OBLIGATORIO_AHORA' | 'DIFERIDO'>('OBLIGATORIO_AHORA');
  const [entryFeeRuleNew, setEntryFeeRuleNew] = useState<'APLICA' | 'EXONERADO'>('APLICA');
  const [entryFeeRuleRegular, setEntryFeeRuleRegular] = useState<'APLICA' | 'EXONERADO'>('EXONERADO');

  // Años Escolares
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [yearModalOpen, setYearModalOpen] = useState(false);
  const [savingYear, setSavingYear] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);

  // Formulario Año Escolar
  const [yearName, setYearName] = useState('');
  const [yearCode, setYearCode] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [yearStatus, setYearStatus] = useState<'ACTIVE' | 'PLANNING' | 'CLOSED'>('PLANNING');
  const [isEnrollmentOpen, setIsEnrollmentOpen] = useState(true);
  const [cloneStructure, setCloneStructure] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar información del backend
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/institution');
      const data = await res.json();

      if (data.success) {
        if (data.institution) {
          setInstitution(data.institution);
          setName(data.institution.name || '');
          setRuc(data.institution.ruc || '');
          setEmail(data.institution.email || '');
          setPhone(data.institution.phone || '');
          setAddress(data.institution.address || '');
          setLogo(data.institution.logo || null);
        }

        if (data.config) {
          setConfig(data.config);
          setGradingSystem(data.config.grading_system || 'vigesimal');
          setPassingGrade(Number(data.config.passing_grade || 11));
          setPeriodType(data.config.period_type || 'bimestre');
          setMonthlyDueDay(Number(data.config.monthly_due_day || 5));
          setLateFeePercentage(Number(data.config.late_fee_daily_percentage || 0.5));
          setGraceDays(Number(data.config.grace_days || 3));
          setAllowMultipleCash(data.config.allow_multiple_cash_sessions ?? true);
          setRequireTokenDiff(data.config.require_token_for_differences ?? true);
          setEnrollmentRuleNew(data.config.enrollment_rule_new || 'OBLIGATORIO_AHORA');
          setEnrollmentRuleRegular(data.config.enrollment_rule_regular || 'OBLIGATORIO_AHORA');
          setEntryFeeRuleNew(data.config.entry_fee_rule_new || 'APLICA');
          setEntryFeeRuleRegular(data.config.entry_fee_rule_regular || 'EXONERADO');
        }

        if (data.academicYears) {
          setAcademicYears(data.academicYears);
        }
      } else {
        onNotify({ type: 'error', title: 'Error', message: data.message || 'No se pudo cargar la configuración.' });
      }
    } catch {
      onNotify({ type: 'error', title: 'Error', message: 'Error de red al consultar configuración institucional.' });
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  const fetchFeeConcepts = useCallback(async () => {
    setLoadingFeeConcepts(true);
    try {
      const res = await fetch('/api/admin/fee-concepts');
      const data = await res.json();
      if (data.success && data.concepts) {
        setFeeConcepts(data.concepts);
      }
    } catch (err) {
      console.error('Error al cargar conceptos de pago:', err);
    } finally {
      setLoadingFeeConcepts(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchFeeConcepts();
  }, [fetchData, fetchFeeConcepts]);

  const paginatedConcepts = feeConcepts.slice((conceptPage - 1) * conceptPageSize, conceptPage * conceptPageSize);

  const handleOpenConceptModal = (concept?: FeeConcept) => {
    if (concept) {
      setEditingConcept(concept);
      setCName(concept.name);
      setCCode(concept.code);
      setCCategory(concept.category);
      setCAmount(String(concept.default_amount || 0));
      setCDescription(concept.description || '');
      setCRuleNew(concept.rule_new);
      setCRuleRegular(concept.rule_regular);
      setCRuleTransfer(concept.rule_transfer);
      setCRuleReentry(concept.rule_reentry);
      setCActive(concept.is_active);
    } else {
      setEditingConcept(null);
      setCName('');
      setCCode('');
      setCCategory('OTHER');
      setCAmount('0.00');
      setCDescription('');
      setCRuleNew('OBLIGATORIO');
      setCRuleRegular('OPCIONAL');
      setCRuleTransfer('OBLIGATORIO');
      setCRuleReentry('OPCIONAL');
      setCActive(true);
    }
    setConceptModalOpen(true);
  };

  const handleSaveConcept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName.trim()) {
      onNotify({ type: 'warning', title: 'Campo requerido', message: 'El nombre del concepto es obligatorio.' });
      return;
    }

    setSavingConcept(true);
    try {
      const url = editingConcept ? `/api/admin/fee-concepts/${editingConcept.id}` : '/api/admin/fee-concepts';
      const method = editingConcept ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cName.trim(),
          code: cCode.trim() || undefined,
          category: cCategory,
          default_amount: Number(cAmount) || 0,
          description: cDescription.trim() || undefined,
          rule_new: cRuleNew,
          rule_regular: cRuleRegular,
          rule_transfer: cRuleTransfer,
          rule_reentry: cRuleReentry,
          is_active: cActive,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Error al guardar concepto de pago');
      }

      onNotify({
        type: 'success',
        title: editingConcept ? 'Concepto Actualizado' : 'Concepto Creado',
        message: data.message || `El concepto "${cName}" fue guardado exitosamente.`,
      });

      setConceptModalOpen(false);
      fetchFeeConcepts();
    } catch (err: any) {
      onNotify({ type: 'error', title: 'Error', message: err.message || 'Error al procesar concepto' });
    } finally {
      setSavingConcept(false);
    }
  };

  const handleDeleteConcept = async (concept: FeeConcept) => {
    const isDefault = concept.is_system_default;
    const confirmMsg = isDefault
      ? `"${concept.name}" es un concepto estándar del sistema. ¿Deseas desactivarlo para que no aparezca en nuevas matrículas?`
      : `¿Estás seguro de eliminar el concepto "${concept.name}"? Esta acción no se puede deshacer.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/admin/fee-concepts/${concept.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Error al eliminar concepto');
      }
      onNotify({
        type: 'success',
        title: isDefault ? 'Concepto Desactivado' : 'Concepto Eliminado',
        message: data.message || 'Operación completada.',
      });
      fetchFeeConcepts();
    } catch (err: any) {
      onNotify({ type: 'error', title: 'Error', message: err.message || 'Error al eliminar' });
    }
  };

  const renderRuleBadge = (rule: FeeRule) => {
    if (rule === 'OBLIGATORIO') {
      return (
        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#e6f9ef] text-[#26995b] border border-[#2fbf71]/30">
          Obligatorio
        </span>
      );
    }
    if (rule === 'OPCIONAL') {
      return (
        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
          Opcional
        </span>
      );
    }
    return (
      <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-500">
        Exonerado
      </span>
    );
  };

  // Manejar subida de archivo de logo local
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'].includes(file.type)) {
      onNotify({ type: 'error', title: 'Formato no válido', message: 'Por favor sube una imagen PNG, JPG, SVG o WebP.' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      onNotify({ type: 'error', title: 'Archivo muy grande', message: 'El logo no debe superar los 2MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setLogo(reader.result as string);
      onNotify({ type: 'info', title: 'Logo cargado', message: 'Recuerda hacer clic en "Guardar Datos" para aplicar los cambios.' });
    };
    reader.readAsDataURL(file);
  };

  // Guardar Perfil Institucional
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      onNotify({ type: 'warning', title: 'Nombre requerido', message: 'Ingresa el nombre del colegio.' });
      return;
    }

    setSavingProfile(true);
    try {
      const res = await fetch('/api/admin/institution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_PROFILE',
          name: name.trim(),
          ruc: ruc.trim(),
          email: email.trim(),
          phone: phone.trim(),
          address: address.trim(),
          logo,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onNotify({ type: 'success', title: '¡Actualizado!', message: 'Los datos del colegio se guardaron con éxito.' });
        fetchData();
      } else {
        onNotify({ type: 'error', title: 'Error al guardar', message: data.message });
      }
    } catch {
      onNotify({ type: 'error', title: 'Error', message: 'Error de red al guardar datos institucionales.' });
    } finally {
      setSavingProfile(false);
    }
  };

  // Guardar Reglas del Colegio
  const handleSaveRules = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRules(true);
    try {
      const res = await fetch('/api/admin/institution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_RULES',
          grading_system: gradingSystem,
          passing_grade: passingGrade,
          period_type: periodType,
          monthly_due_day: monthlyDueDay,
          late_fee_daily_percentage: lateFeePercentage,
          grace_days: graceDays,
          allow_multiple_cash_sessions: allowMultipleCash,
          require_token_for_differences: requireTokenDiff,
          enrollment_rule_new: enrollmentRuleNew,
          enrollment_rule_regular: enrollmentRuleRegular,
          entry_fee_rule_new: entryFeeRuleNew,
          entry_fee_rule_regular: entryFeeRuleRegular,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onNotify({ type: 'success', title: '¡Reglas guardadas!', message: 'Los parámetros del colegio han sido actualizados.' });
        fetchData();
      } else {
        onNotify({ type: 'error', title: 'Error al guardar', message: data.message });
      }
    } catch {
      onNotify({ type: 'error', title: 'Error', message: 'Error de red al guardar reglas.' });
    } finally {
      setSavingRules(false);
    }
  };

  // Aperturar o Editar Año Escolar
  const handleOpenYearModal = (year?: AcademicYear) => {
    if (year) {
      setEditingYear(year);
      setYearName(year.year_name);
      setYearCode(year.year_code);
      setStartDate(year.start_date);
      setEndDate(year.end_date);
      setYearStatus(year.status);
      setIsEnrollmentOpen(year.is_enrollment_open);
      setCloneStructure(false);
    } else {
      const currentYear = new Date().getFullYear();
      const nextCode = String(currentYear + 1);
      setEditingYear(null);
      setYearName(`Año Escolar ${nextCode}`);
      setYearCode(nextCode);
      setStartDate(`${nextCode}-03-01`);
      setEndDate(`${nextCode}-12-20`);
      setYearStatus('PLANNING');
      setIsEnrollmentOpen(true);
      setCloneStructure(true);
    }
    setYearModalOpen(true);
  };

  // Guardar Año Escolar
  const handleSaveYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!yearName.trim() || !yearCode.trim() || !startDate || !endDate) {
      onNotify({ type: 'warning', title: 'Campos incompletos', message: 'Completa todas las fechas y nombres del año lectivo.' });
      return;
    }

    setSavingYear(true);
    try {
      const res = await fetch('/api/admin/institution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_YEAR',
          id: editingYear?.id,
          year_name: yearName.trim(),
          year_code: yearCode.trim(),
          start_date: startDate,
          end_date: endDate,
          status: yearStatus,
          is_enrollment_open: isEnrollmentOpen,
          clone_structure: !editingYear && cloneStructure,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onNotify({ type: 'success', title: 'Año Escolar Guardado', message: data.message });
        setYearModalOpen(false);
        fetchData();
      } else {
        onNotify({ type: 'error', title: 'Error al guardar año', message: data.message });
      }
    } catch {
      onNotify({ type: 'error', title: 'Error', message: 'Error de red al guardar año escolar.' });
    } finally {
      setSavingYear(false);
    }
  };

  // Establecer Año Activo
  const handleSetActiveYear = async (yearId: string, yName: string) => {
    if (!confirm(`¿Estás seguro de establecer "${yName}" como el año escolar ACTIVO? El sistema operará con las matrículas y aulas de este ciclo.`)) {
      return;
    }

    try {
      const res = await fetch('/api/admin/institution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SET_ACTIVE_YEAR',
          year_id: yearId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onNotify({ type: 'success', title: 'Año Activo Cambiado', message: `"${yName}" es ahora el año escolar en curso.` });
        fetchData();
      } else {
        onNotify({ type: 'error', title: 'Error', message: data.message });
      }
    } catch {
      onNotify({ type: 'error', title: 'Error', message: 'Error de red al cambiar año activo.' });
    }
  };

  const activeYear = academicYears.find((y) => y.status === 'ACTIVE');

  if (loading) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs">
        <RefreshCw className="w-8 h-8 text-[#2fbf71] animate-spin mx-auto mb-3" />
        <p className="text-sm font-bold text-slate-700">Cargando configuración institucional...</p>
        <p className="text-xs text-slate-400 mt-1">Obteniendo perfil del colegio, reglas y años escolares.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Encabezado Principal de Identidad */}
      <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-[#223a5e] to-[#1a2d4b] text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center p-2 shrink-0 overflow-hidden shadow-inner">
            {logo ? (
              <img src={logo} alt={name} className="w-full h-full object-contain" />
            ) : (
              <Building2 className="w-8 h-8 text-[#2fbf71]" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full bg-[#2fbf71] text-white">
                Colegio Activo
              </span>
              <span className="text-xs font-mono text-emerald-300">
                @{institution?.code}
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">
              {name || 'Mi Institución Educativa'}
            </h2>
            <p className="text-xs text-slate-300 flex items-center gap-3 mt-1">
              {institution?.ruc && <span>RUC: {institution.ruc}</span>}
              {activeYear && (
                <span className="inline-flex items-center gap-1.5 font-bold text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-[#2fbf71] animate-pulse" />
                  {activeYear.year_name} (Activo)
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
          <button
            onClick={fetchData}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 text-white"
            title="Recargar configuración"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Navegación por Pestañas */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition cursor-pointer shrink-0 ${
            activeTab === 'profile'
              ? 'border-[#2fbf71] text-[#223a5e]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4 text-[#2fbf71]" />
          <span>Datos de la Institución</span>
        </button>

        <button
          onClick={() => setActiveTab('years')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition cursor-pointer shrink-0 ${
            activeTab === 'years'
              ? 'border-[#2fbf71] text-[#223a5e]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4 text-[#2fbf71]" />
          <span>Gestión de Años Escolares</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px]">
            {academicYears.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition cursor-pointer shrink-0 ${
            activeTab === 'rules'
              ? 'border-[#2fbf71] text-[#223a5e]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4 text-[#2fbf71]" />
          <span>Reglas del Colegio</span>
        </button>

        <button
          onClick={() => setActiveTab('concepts')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition cursor-pointer shrink-0 ${
            activeTab === 'concepts'
              ? 'border-[#2fbf71] text-[#223a5e]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4 text-[#2fbf71]" />
          <span>Conceptos de Pago</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px]">
            {feeConcepts.length}
          </span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* PESTAÑA 1: DATOS INSTITUCIONALES (PERFIL DEL COLEGIO)    */}
      {/* ======================================================== */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Columna Izquierda: Logo y Branding */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-[#223a5e] flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#2fbf71]" />
                <span>Logo Institucional</span>
              </h3>
              <p className="text-xs text-slate-500">
                Este logo se exhibirá en la cabecera, fichas de matrícula, boletas de pago y certificados emitidos por el colegio.
              </p>

              {/* Vista previa del logo */}
              <div className="p-6 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-center">
                {logo ? (
                  <div className="space-y-3">
                    <div className="w-28 h-28 mx-auto rounded-2xl bg-white p-2 shadow-sm border border-slate-200 flex items-center justify-center overflow-hidden">
                      <img src={logo} alt="Logo" className="w-full h-full object-contain" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setLogo(null)}
                      className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 mx-auto cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Quitar logo
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 py-4">
                    <div className="w-16 h-16 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center mx-auto">
                      <Building2 className="w-8 h-8" />
                    </div>
                    <p className="text-xs font-semibold text-slate-600">Aún no se ha subido ningún logo</p>
                    <p className="text-[11px] text-slate-400">Recomendado: PNG o SVG transparente</p>
                  </div>
                )}
              </div>

              {/* Botón de carga local */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#223a5e] text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2 border border-slate-200"
              >
                <Upload className="w-4 h-4 text-[#2fbf71]" />
                <span>{logo ? 'Cambiar Imagen' : 'Subir Imagen de Logo'}</span>
              </button>

              <div className="pt-3 border-t border-slate-100">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  O ingresar URL directa de la imagen:
                </label>
                <input
                  type="url"
                  placeholder="https://ejemplo.com/logo.png"
                  value={logo?.startsWith('http') ? logo : ''}
                  onChange={(e) => setLogo(e.target.value.trim() || null)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800"
                />
              </div>
            </div>

            {/* Columna Derecha: Formulario de Datos */}
            <div className="lg:col-span-2 p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-5">
              <div>
                <h3 className="text-base font-black text-[#223a5e] flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#2fbf71]" />
                  <span>Información General de la Institución</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Edita la razón social, RUC y contactos oficiales registrados en tu suscripción de Educa360.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#223a5e] mb-1">
                    Nombre de la Institución / Razón Social <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Colegio Particular Avanza College"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2fbf71] focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1">
                    RUC / Identificación Fiscal
                  </label>
                  <input
                    type="text"
                    value={ruc}
                    onChange={(e) => setRuc(e.target.value)}
                    placeholder="Ej. 20123456789"
                    maxLength={11}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2fbf71] focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 flex items-center justify-between">
                    <span>Código de Colegio (Subdominio)</span>
                    <span className="text-[10px] text-slate-400 font-normal">No editable</span>
                  </label>
                  <div className="px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-600 flex items-center justify-between">
                    <span>@{institution?.code}</span>
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1">
                    Teléfono / WhatsApp Oficial
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+51 950 123 456"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2fbf71] focus:bg-white transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1">
                    Correo Electrónico de Secretaría
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="secretaria@colegio.edu.pe"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2fbf71] focus:bg-white transition"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#223a5e] mb-1">
                    Dirección Física del Campus / Sede Principal
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Av. Los Educadores 123, Distrito, Ciudad"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2fbf71] focus:bg-white transition"
                    />
                  </div>
                </div>
              </div>

              {/* Ficha del Director */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#223a5e] text-white flex items-center justify-center font-bold text-sm">
                    <UserCheck className="w-5 h-5 text-[#2fbf71]" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Director General</span>
                    <p className="text-xs font-black text-slate-800">
                      {institution?.admin_name || currentUser?.name || 'Administrador Principal'}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      @{institution?.admin_username || currentUser?.username}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Plan de Software</span>
                  <p className="text-xs font-black text-[#2fbf71]">Educa360 {institution?.plan || 'PRO'}</p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-6 py-2.5 rounded-xl bg-[#2fbf71] hover:bg-[#26995b] text-white font-bold text-xs shadow-md shadow-[#2fbf71]/20 transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {savingProfile ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Guardar Datos Institucionales</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </form>
      )}

      {/* ======================================================== */}
      {/* PESTAÑA 2: GESTIÓN DE AÑOS ESCOLARES                     */}
      {/* ======================================================== */}
      {activeTab === 'years' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
            <div>
              <h3 className="text-base font-black text-[#223a5e] flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#2fbf71]" />
                <span>Ciclos Lectivos y Años Escolares</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cada año escolar agrupa sus propias aulas, vacantes, cronogramas de pensiones y matrículas.
              </p>
            </div>

            <button
              onClick={() => handleOpenYearModal()}
              className="px-4 py-2.5 rounded-xl bg-[#2fbf71] hover:bg-[#26995b] text-white font-bold text-xs shadow-md shadow-[#2fbf71]/20 transition cursor-pointer flex items-center gap-2 shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Aperturar Nuevo Año Escolar</span>
            </button>
          </div>

          {/* Tarjeta del Año Activo */}
          {activeYear && (
            <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50/40 border border-emerald-200 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-[#2fbf71] text-white flex items-center justify-center font-black text-lg shadow-sm shadow-[#2fbf71]/30">
                    {activeYear.year_code}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-900">{activeYear.year_name}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider">
                        En Curso (Activo)
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Periodo Oficial: <span className="font-bold">{activeYear.start_date}</span> al <span className="font-bold">{activeYear.end_date}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${
                    activeYear.is_enrollment_open
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {activeYear.is_enrollment_open ? 'Matrículas Abiertas' : 'Matrículas Cerradas'}
                  </span>
                  <button
                    onClick={() => handleOpenYearModal(activeYear)}
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Editar Fechas
                  </button>
                </div>
              </div>

              {/* Estadísticas del Año Activo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t border-emerald-200/60">
                <div className="p-3.5 rounded-2xl bg-white/80 border border-emerald-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Aulas Habilitadas</span>
                  <p className="text-xl font-black text-[#223a5e] mt-0.5">{activeYear.total_sections || 0} aulas</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/80 border border-emerald-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Capacidad Total</span>
                  <p className="text-xl font-black text-[#223a5e] mt-0.5">{activeYear.total_capacity || 0} vacantes</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/80 border border-emerald-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Alumnos Matriculados</span>
                  <p className="text-xl font-black text-[#2fbf71] mt-0.5">{activeYear.total_enrolled || 0} alumnos</p>
                </div>
              </div>
            </div>
          )}

          {/* Listado de Todos los Años Registrados */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
              Historial de Años Lectivos del Colegio ({academicYears.length})
            </h4>

            <div className="divide-y divide-slate-100">
              {academicYears.map((year) => {
                const isActive = year.status === 'ACTIVE';
                return (
                  <div key={year.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                        isActive ? 'bg-[#2fbf71]/15 text-[#2fbf71]' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {year.year_code}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900">{year.year_name}</p>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            isActive
                              ? 'bg-emerald-100 text-emerald-800'
                              : year.status === 'PLANNING'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {isActive ? 'Activo' : year.status === 'PLANNING' ? 'Planificación' : 'Cerrado'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {year.start_date} al {year.end_date} &bull; {year.total_sections || 0} aulas &bull; {year.total_enrolled || 0} matriculados
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isActive && (
                        <button
                          onClick={() => handleSetActiveYear(year.id, year.year_name)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs font-bold border border-slate-200 hover:border-emerald-300 transition cursor-pointer"
                        >
                          Habilitar como Activo
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenYearModal(year)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-600 transition cursor-pointer"
                      >
                        Editar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PESTAÑA 3: REGLAS DEL COLEGIO                            */}
      {/* ======================================================== */}
      {activeTab === 'rules' && (
        <form onSubmit={handleSaveRules} className="space-y-6">
          <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-6">
            <div>
              <h3 className="text-base font-black text-[#223a5e] flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#2fbf71]" />
                <span>Configuración de Reglas y Parámetros del Colegio</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Define el sistema de evaluación académica, vencimiento de cuotas de pensión y reglas operativas de caja.
              </p>
            </div>

            {/* Grupo 1: Académico */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>1. Reglas Académicas y Calificaciones</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <label className="block text-xs font-bold text-[#223a5e] mb-1">
                    Sistema de Calificación
                  </label>
                  <select
                    value={gradingSystem}
                    onChange={(e) => setGradingSystem(e.target.value as 'vigesimal' | 'literal')}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    <option value="vigesimal">Vigesimal (Escala 0 a 20)</option>
                    <option value="literal">Literal MINEDU (AD, A, B, C)</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">Escala estándar para registro de notas por docentes.</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <label className="block text-xs font-bold text-[#223a5e] mb-1">
                    Nota Mínima Aprobatoria
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    step={1}
                    value={passingGrade}
                    onChange={(e) => setPassingGrade(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Generalmente 11 para vigesimal o 'A' para literal.</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <label className="block text-xs font-bold text-[#223a5e] mb-1">
                    Periodos del Ciclo Escolar
                  </label>
                  <select
                    value={periodType}
                    onChange={(e) => setPeriodType(e.target.value as 'bimestre' | 'trimestre' | 'semestre')}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    <option value="bimestre">Bimestres (4 Periodos al año)</option>
                    <option value="trimestre">Trimestres (3 Periodos al año)</option>
                    <option value="semestre">Semestres (2 Periodos al año)</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">Divide las libretas de calificaciones y reportes.</p>
                </div>
              </div>
            </div>

            {/* Grupo 2: Finanzas y Cobranzas */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-[#2fbf71]" />
                <span>2. Reglas Financieras y Cobro de Pensiones</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <label className="block text-xs font-bold text-[#223a5e] mb-1">
                    Día de Vencimiento de Pensión
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Día</span>
                    <input
                      type="number"
                      min={1}
                      max={28}
                      value={monthlyDueDay}
                      onChange={(e) => setMonthlyDueDay(Number(e.target.value))}
                      className="w-20 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 text-center"
                    />
                    <span className="text-xs text-slate-500">de cada mes</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5">Fecha límite mensual para pago oportuno.</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <label className="block text-xs font-bold text-[#223a5e] mb-1">
                    Mora / Recargo Diario (%)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={10}
                      step={0.1}
                      value={lateFeePercentage}
                      onChange={(e) => setLateFeePercentage(Number(e.target.value))}
                      className="w-24 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                    />
                    <span className="text-xs font-bold text-slate-600">% por día</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5">Recargo aplicado automáticamente si vence.</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <label className="block text-xs font-bold text-[#223a5e] mb-1">
                    Días de Gracia / Tolerancia
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={15}
                      value={graceDays}
                      onChange={(e) => setGraceDays(Number(e.target.value))}
                      className="w-20 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 text-center"
                    />
                    <span className="text-xs text-slate-500">días adicionales</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5">Margen antes de computar recargos por mora.</p>
                </div>
              </div>
            </div>

            {/* Grupo 3: Seguridad de Caja */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>3. Seguridad de Caja & Tesorería</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3 cursor-pointer hover:bg-slate-100/70 transition">
                  <input
                    type="checkbox"
                    checked={allowMultipleCash}
                    onChange={(e) => setAllowMultipleCash(e.target.checked)}
                    className="w-4 h-4 rounded text-[#2fbf71] focus:ring-[#2fbf71] mt-0.5 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#223a5e] block">
                      Permitir Múltiples Sesiones de Caja Abiertas
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Habilita que varias ventanillas o colaboradores tengan su arqueo individual simultáneo.
                    </span>
                  </div>
                </label>

                <label className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3 cursor-pointer hover:bg-slate-100/70 transition">
                  <input
                    type="checkbox"
                    checked={requireTokenDiff}
                    onChange={(e) => setRequireTokenDiff(e.target.checked)}
                    className="w-4 h-4 rounded text-[#2fbf71] focus:ring-[#2fbf71] mt-0.5 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#223a5e] block">
                      Requerir Token para Descuadres de Caja
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Exige autorización del Director en caso de diferencias o faltantes en el cierre de turno.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Grupo 4: Catálogo Dinámico de Conceptos de Pago */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50/70 via-indigo-50/50 to-slate-50 border border-purple-200/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-purple-600 text-white shadow-xs">
                      <CreditCard className="w-4 h-4" />
                    </span>
                    <h4 className="text-xs font-black text-[#223a5e] uppercase tracking-wide">
                      Catálogo Dinámico de Conceptos de Pago & Admisión
                    </h4>
                    <span className="text-[10px] bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-full font-bold">
                      {feeConcepts.length} Conceptos configurados
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 max-w-2xl">
                    Las reglas de cobro (Cuota de Ingreso, Matrícula, Pensiones, Talleres) se administran en el nuevo <strong>Catálogo de Conceptos de Pago</strong>. Allí puedes personalizar montos y definir si cada concepto es <em>Obligatorio</em>, <em>Opcional</em> o <em>Exonerado</em> según el tipo de alumno (Nuevo, Regular, Traslado o Reingresante).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('concepts')}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Configurar Conceptos</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                disabled={savingRules}
                className="px-6 py-2.5 rounded-xl bg-[#2fbf71] hover:bg-[#26995b] text-white font-bold text-xs shadow-md shadow-[#2fbf71]/20 transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {savingRules ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Guardando Reglas...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Guardar Reglas del Colegio</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ======================================================== */}
      {/* PESTAÑA 4: CATÁLOGO DINÁMICO DE CONCEPTOS DE PAGO        */}
      {/* ======================================================== */}
      {activeTab === 'concepts' && (
        <div className="space-y-6">
          {/* Header con acciones */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-50 text-[#2fbf71]">
                  <CreditCard className="w-5 h-5" />
                </span>
                <h3 className="text-base font-black text-[#223a5e]">
                  Catálogo de Conceptos de Pago & Admisión
                </h3>
              </div>
              <p className="text-xs text-slate-500 max-w-2xl">
                Define los conceptos cobrables de la institución (Cuota de Ingreso, Matrícula, Pensiones, Talleres, etc.) y si son <strong>Obligatorios</strong>, <strong>Opcionales</strong> o <strong>Exonerados</strong> según la condición del alumno al momento de matricular.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fetchFeeConcepts()}
                className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                title="Refrescar conceptos"
              >
                <RefreshCw className={`w-4 h-4 ${loadingFeeConcepts ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => handleOpenConceptModal()}
                className="px-4 py-2.5 rounded-xl bg-[#2fbf71] hover:bg-[#26995b] text-white font-bold text-xs shadow-md shadow-[#2fbf71]/20 transition cursor-pointer flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Nuevo Concepto</span>
              </button>
            </div>
          </div>

          {/* Tarjetas de Condición del Alumno */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span className="text-xs font-black text-blue-900">Alumno Nuevo</span>
              </div>
              <p className="text-[11px] text-blue-700 leading-snug">
                Postulante que ingresa por primera vez al colegio. Aplica cuota de admisión / ingreso según política.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-xs font-black text-emerald-900">Alumno Regular (Antiguo)</span>
              </div>
              <p className="text-[11px] text-emerald-700 leading-snug">
                Finalizó el ciclo anterior en la institución. Por ley y fidelidad, queda 100% <strong>Exonerado</strong> de cuota de ingreso.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100 space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                <span className="text-xs font-black text-purple-900">Alumno Traslado</span>
              </div>
              <p className="text-[11px] text-purple-700 leading-snug">
                Proviene de otro colegio y se incorpora a un grado intermedio con resolución o constancia de vacante.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100 space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span className="text-xs font-black text-amber-900">Alumno Reingresante</span>
              </div>
              <p className="text-[11px] text-amber-700 leading-snug">
                Estudiante con historial en el colegio que estuvo retirado o inactivo y retoma su proceso educativo.
              </p>
            </div>
          </div>

          {/* Tabla de Conceptos */}
          <div className="rounded-3xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">Concepto</th>
                    <th className="px-4 py-3.5">Monto Sugerido</th>
                    <th className="px-4 py-3.5 text-center">Nuevo</th>
                    <th className="px-4 py-3.5 text-center">Regular (Antiguo)</th>
                    <th className="px-4 py-3.5 text-center">Traslado</th>
                    <th className="px-4 py-3.5 text-center">Reingresante</th>
                    <th className="px-4 py-3.5 text-center">Estado</th>
                    <th className="px-5 py-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingFeeConcepts ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#2fbf71]" />
                        <span>Cargando conceptos de pago...</span>
                      </td>
                    </tr>
                  ) : feeConcepts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <CreditCard className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-bold text-slate-600">No hay conceptos registrados</p>
                        <p className="text-xs mt-1">Haz clic en &ldquo;Nuevo Concepto&rdquo; para agregar el primero.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedConcepts.map((concept) => (
                      <tr key={concept.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-5 py-3.5">
                          <div className="flex items-start gap-2.5">
                            <span className="p-1.5 rounded-lg bg-slate-100 text-slate-700 shrink-0 mt-0.5">
                              <Tag className="w-3.5 h-3.5" />
                            </span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-[#223a5e]">{concept.name}</span>
                                {(concept.is_system_default || concept.is_default) && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-slate-100 text-slate-500 border border-slate-200">
                                    Estándar
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                                <span>Código: {concept.code || 'S/C'}</span>
                                <span>•</span>
                                <span className="font-semibold text-slate-600">
                                  {concept.category === 'ADMISSION' && 'Cuota de Ingreso / Admisión'}
                                  {concept.category === 'ENROLLMENT' && 'Matrícula Anual'}
                                  {concept.category === 'TUITION' && 'Pensión Mensual'}
                                  {concept.category === 'SERVICE' && 'Servicio / Taller'}
                                  {concept.category === 'OTHER' && 'Otros Cobros'}
                                </span>
                              </div>
                              {concept.description && (
                                <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{concept.description}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="font-mono font-bold text-slate-800">
                            S/ {Number(concept.default_amount || 0).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          {renderRuleBadge(concept.rule_new)}
                        </td>
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          {renderRuleBadge(concept.rule_regular)}
                        </td>
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          {renderRuleBadge(concept.rule_transfer)}
                        </td>
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          {renderRuleBadge(concept.rule_reentry)}
                        </td>
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          {concept.is_active ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Activo
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                              Inactivo
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenConceptModal(concept)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                              title="Editar concepto"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteConcept(concept)}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                              title={(concept.is_system_default || concept.is_default) ? 'Desactivar concepto estándar' : 'Eliminar concepto'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {feeConcepts.length > 0 && (
              <div className="p-4 border-t border-slate-100">
                <Pagination
                  currentPage={conceptPage}
                  totalItems={feeConcepts.length}
                  itemsPerPage={conceptPageSize}
                  onPageChange={setConceptPage}
                  onItemsPerPageChange={setConceptPageSize}
                  labelSingular="concepto"
                  labelPlural="conceptos"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: APERTURAR / EDITAR AÑO ESCOLAR                    */}
      {/* ======================================================== */}
      {yearModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-gradient-to-r from-[#223a5e] to-[#1c2f4c] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-5 h-5 text-[#2fbf71]" />
                <h3 className="text-sm font-black">
                  {editingYear ? 'Editar Año Escolar' : 'Aperturar Nuevo Año Escolar'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setYearModalOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveYear} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#223a5e] mb-1">
                    Nombre Oficial del Año Lectivo <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={yearName}
                    onChange={(e) => setYearName(e.target.value)}
                    placeholder="Ej. Año Escolar 2027"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1">
                    Código del Año <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={yearCode}
                    onChange={(e) => setYearCode(e.target.value)}
                    placeholder="2027"
                    maxLength={4}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1">
                    Estado del Ciclo
                  </label>
                  <select
                    value={yearStatus}
                    onChange={(e) => setYearStatus(e.target.value as 'ACTIVE' | 'PLANNING' | 'CLOSED')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    <option value="PLANNING">En Planificación (Pre-matrícula)</option>
                    <option value="ACTIVE">Activo (Ciclo en Curso)</option>
                    <option value="CLOSED">Cerrado (Histórico)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1">
                    Fecha de Inicio <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1">
                    Fecha de Culminación <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isEnrollmentOpen}
                    onChange={(e) => setIsEnrollmentOpen(e.target.checked)}
                    className="w-4 h-4 rounded text-[#2fbf71] focus:ring-[#2fbf71]"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Aperturar Proceso de Admisión y Matrícula para este año
                  </span>
                </label>

                {!editingYear && (
                  <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                    <input
                      type="checkbox"
                      checked={cloneStructure}
                      onChange={(e) => setCloneStructure(e.target.checked)}
                      className="w-4 h-4 rounded text-[#2fbf71] focus:ring-[#2fbf71]"
                    />
                    <div>
                      <span className="text-xs font-bold text-emerald-900 block">
                        Clonar estructura de aulas y aforos del año actual
                      </span>
                      <span className="text-[11px] text-emerald-700">
                        Copia automáticamente las secciones y grados con contador de matriculados en 0.
                      </span>
                    </div>
                  </label>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setYearModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingYear}
                  className="px-5 py-2 rounded-xl bg-[#2fbf71] hover:bg-[#26995b] text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingYear ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{editingYear ? 'Actualizar Año' : 'Crear Año Escolar'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ======================================================== */}
      {/* MODAL: CREAR / EDITAR CONCEPTO DE PAGO                   */}
      {/* ======================================================== */}
      {conceptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
                  <CreditCard className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-[#223a5e]">
                    {editingConcept ? 'Editar Concepto de Pago' : 'Nuevo Concepto de Pago'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Define el cobro y sus reglas según el tipo de alumno
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConceptModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveConcept} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Nombre del Concepto <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={cName}
                    onChange={(e) => setCName(e.target.value)}
                    placeholder="Ej. Cuota de Ingreso, Seguro Estudiantil, Taller..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-[#2fbf71]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Código Corto
                  </label>
                  <input
                    type="text"
                    value={cCode}
                    onChange={(e) => setCCode(e.target.value.toUpperCase())}
                    placeholder="Ej. CI-2026"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 uppercase focus:bg-white focus:border-[#2fbf71]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Categoría
                  </label>
                  <select
                    value={cCategory}
                    onChange={(e) => setCCategory(e.target.value as FeeCategory)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-[#2fbf71]"
                  >
                    <option value="ADMISSION">Cuota de Ingreso / Admisión</option>
                    <option value="ENROLLMENT">Matrícula Anual</option>
                    <option value="TUITION">Pensión Mensual</option>
                    <option value="SERVICE">Servicio / Taller / Extracurricular</option>
                    <option value="OTHER">Otro Concepto de Cobro</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Monto Base Sugerido (S/)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">S/</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={cAmount}
                      onChange={(e) => setCAmount(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-[#2fbf71]"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Descripción / Observaciones
                </label>
                <textarea
                  rows={2}
                  value={cDescription}
                  onChange={(e) => setCDescription(e.target.value)}
                  placeholder="Detalles sobre cuándo aplica este cobro, beneficios o exoneraciones..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#2fbf71]"
                />
              </div>

              {/* Matriz de Reglas por Condición */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-black text-[#223a5e] uppercase tracking-wide">
                    Reglas al Momento de Matricular
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Configura si este concepto es <strong>Obligatorio</strong> (se cobra y liquida de forma obligatoria), <strong>Opcional</strong> (se presenta como casilla voluntaria) o <strong>Exonerado</strong> (S/ 0.00).
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-blue-900">
                      • Alumno Nuevo (1er Ingreso)
                    </label>
                    <select
                      value={cRuleNew}
                      onChange={(e) => setCRuleNew(e.target.value as FeeRule)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                    >
                      <option value="OBLIGATORIO">🟢 Obligatorio</option>
                      <option value="OPCIONAL">🟡 Opcional</option>
                      <option value="EXONERADO">⚪ Exonerado (S/ 0.00)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-emerald-900">
                      • Alumno Regular (Antiguo)
                    </label>
                    <select
                      value={cRuleRegular}
                      onChange={(e) => setCRuleRegular(e.target.value as FeeRule)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                    >
                      <option value="OBLIGATORIO">🟢 Obligatorio</option>
                      <option value="OPCIONAL">🟡 Opcional</option>
                      <option value="EXONERADO">⚪ Exonerado (S/ 0.00)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-purple-900">
                      • Alumno Traslado
                    </label>
                    <select
                      value={cRuleTransfer}
                      onChange={(e) => setCRuleTransfer(e.target.value as FeeRule)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                    >
                      <option value="OBLIGATORIO">🟢 Obligatorio</option>
                      <option value="OPCIONAL">🟡 Opcional</option>
                      <option value="EXONERADO">⚪ Exonerado (S/ 0.00)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-amber-900">
                      • Alumno Reingresante
                    </label>
                    <select
                      value={cRuleReentry}
                      onChange={(e) => setCRuleReentry(e.target.value as FeeRule)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                    >
                      <option value="OBLIGATORIO">🟢 Obligatorio</option>
                      <option value="OPCIONAL">🟡 Opcional</option>
                      <option value="EXONERADO">⚪ Exonerado (S/ 0.00)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cActive}
                    onChange={(e) => setCActive(e.target.checked)}
                    className="w-4 h-4 rounded text-[#2fbf71] focus:ring-[#2fbf71]"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Concepto activo (disponible en la caja y matrículas)
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConceptModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingConcept}
                  className="px-5 py-2 rounded-xl bg-[#2fbf71] hover:bg-[#26995b] text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingConcept ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{editingConcept ? 'Actualizar Concepto' : 'Crear Concepto'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
