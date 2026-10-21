'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  Users,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Calendar,
  CreditCard,
  Printer,
  PlusCircle,
  RefreshCw,
  X,
  FileText,
  User,
  Phone,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Check,
  Building2,
  MessageCircle,
} from 'lucide-react';
import {
  StudentSearchFinancial,
  StudentAccountStatement,
  AccountStatementItem,
  OfficialReceiptData,
  PaymentMethodItem,
} from '@/types';
import { AlertType } from '@/components/ui/AlertToast';
import Pagination from '@/components/ui/Pagination';
import OfficialReceiptPrintModal from './OfficialReceiptPrintModal';

interface StudentAccountStatementViewProps {
  initialStudentId?: string | null;
  onNotify: (alert: { type: AlertType; title: string; message?: string }) => void;
  onPaymentSuccess?: () => void;
  availablePaymentMethods?: { code: string; name: string }[] | PaymentMethodItem[];
}

export default function StudentAccountStatementView({
  initialStudentId = null,
  onNotify,
  onPaymentSuccess,
  availablePaymentMethods = [],
}: StudentAccountStatementViewProps) {
  // Buscador y lista de alumnos
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState<StudentSearchFinancial[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(initialStudentId);

  // Estado de cuenta del alumno seleccionado
  const [statement, setStatement] = useState<StudentAccountStatement | null>(null);
  const [loadingStatement, setLoadingStatement] = useState(false);

  // Selección múltiple de cuotas para cobrar
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // Paginación de conceptos en el estado de cuenta
  const [itemsPage, setItemsPage] = useState(1);
  const [itemsPageSize, setItemsPageSize] = useState(15);

  // Modal de Cobro en Ventanilla
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payMethod, setPayMethod] = useState('EFECTIVO');
  const [payReceiptNumber, setPayReceiptNumber] = useState('');
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [payNotes, setPayNotes] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Modal de Recibo Oficial Imprimible
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [activeReceiptData, setActiveReceiptData] = useState<OfficialReceiptData | null>(null);

  // Helpers de Formato
  const formatSoles = (val: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 2,
    }).format(val || 0);
  };

  const formatDateDisplay = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // 1. Cargar lista de estudiantes según término de búsqueda
  const fetchStudents = useCallback(async (queryStr: string = '') => {
    setLoadingStudents(true);
    try {
      const res = await fetch(`/api/finances/account-statement?search=${encodeURIComponent(queryStr)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.students)) {
        setStudents(data.students);
      } else {
        setStudents([]);
      }
    } catch (err) {
      console.error('Error fetching students for financial statement:', err);
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  }, []);

  // Cargar lista inicial
  useEffect(() => {
    fetchStudents(searchTerm);
  }, [fetchStudents]);

  // Si cambia el prop initialStudentId, sincronizarlo
  useEffect(() => {
    if (initialStudentId) {
      setSelectedStudentId(initialStudentId);
    }
  }, [initialStudentId]);

  // 2. Cargar Estado de Cuenta del alumno seleccionado
  const fetchStatement = useCallback(async (studentId: string) => {
    setLoadingStatement(true);
    setSelectedItemIds([]);
    try {
      const res = await fetch(`/api/finances/account-statement?studentId=${encodeURIComponent(studentId)}`);
      const data = await res.json();
      if (data.success && data.accountStatement) {
        setStatement(data.accountStatement);
      } else {
        onNotify({ type: 'error', title: 'Error', message: data.message || 'No se pudo cargar el estado de cuenta' });
        setStatement(null);
      }
    } catch {
      onNotify({ type: 'error', title: 'Error', message: 'Error de red al consultar el estado de cuenta' });
      setStatement(null);
    } finally {
      setLoadingStatement(false);
    }
  }, [onNotify]);

  useEffect(() => {
    if (selectedStudentId) {
      fetchStatement(selectedStudentId);
    } else {
      setStatement(null);
      setSelectedItemIds([]);
    }
  }, [selectedStudentId, fetchStatement]);

  // Conceptos paginados
  const paginatedItems = useMemo(() => {
    if (!statement?.items) return [];
    const start = (itemsPage - 1) * itemsPageSize;
    return statement.items.slice(start, start + itemsPageSize);
  }, [statement?.items, itemsPage, itemsPageSize]);

  // Cuotas pendientes elegibles para cobro
  const payableItems = useMemo(() => {
    return statement?.items?.filter((it) => it.status !== 'PAID') || [];
  }, [statement?.items]);

  // Conceptos seleccionados actualmente
  const selectedItems = useMemo(() => {
    if (!statement?.items) return [];
    return statement.items.filter((it) => selectedItemIds.includes(it.id));
  }, [statement?.items, selectedItemIds]);

  // Total a cobrar de las cuotas seleccionadas
  const selectedTotalAmount = useMemo(() => {
    return selectedItems.reduce((acc, it) => acc + Number(it.amount || 0), 0);
  }, [selectedItems]);

  // Manejar selección/deselección de todas las cuotas pendientes
  const handleToggleSelectAll = () => {
    if (selectedItemIds.length === payableItems.length && payableItems.length > 0) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(payableItems.map((it) => it.id));
    }
  };

  const handleToggleSelectItem = (id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Abrir Modal de Cobranza en Ventanilla
  const handleOpenCollectModal = () => {
    if (selectedItemIds.length === 0) {
      onNotify({
        type: 'warning',
        title: 'Selección Requerida',
        message: 'Selecciona al menos una cuota o concepto para liquidar.',
      });
      return;
    }

    const randomFolio = Math.floor(10000 + Math.random() * 90000);
    setPayReceiptNumber(`REC-${new Date().getFullYear()}-${randomFolio}`);
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayMethod('EFECTIVO');
    setPayNotes('');
    setPayModalOpen(true);
  };

  // Ejecutar el Cobro en Ventanilla (POST a backend)
  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statement?.student?.id || selectedItemIds.length === 0) return;

    setIsProcessingPayment(true);
    try {
      const res = await fetch('/api/finances/account-statement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'COLLECT_PAYMENT',
          student_id: statement.student.id,
          tuition_ids: selectedItemIds,
          payment_method: payMethod,
          receipt_number: payReceiptNumber.trim() || null,
          payment_date: payDate,
          notes: payNotes.trim() || null,
        }),
      });

      const data = await res.json();
      if (data.success && data.receipt) {
        onNotify({
          type: 'success',
          title: 'Cobranza Exitosa',
          message: data.message || 'Pago registrado y comprobante emitido.',
        });

        setPayModalOpen(false);
        setSelectedItemIds([]);

        // Mostrar el Recibo Oficial Imprimible inmediatamente
        setActiveReceiptData(data.receipt);
        setReceiptModalOpen(true);

        // Refrescar el estado de cuenta y el panel financiero general
        if (selectedStudentId) {
          fetchStatement(selectedStudentId);
        }
        fetchStudents(searchTerm);
        if (onPaymentSuccess) {
          onPaymentSuccess();
        }
      } else {
        onNotify({
          type: 'error',
          title: 'Error en Cobranza',
          message: data.message || 'No se pudo procesar el pago.',
        });
      }
    } catch {
      onNotify({
        type: 'error',
        title: 'Error de Red',
        message: 'Ocurrió un error al comunicar con el servidor.',
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Reimprimir comprobante de una cuota ya pagada
  const handleReprintReceipt = (item: AccountStatementItem) => {
    if (!statement) return;
    const receiptData: OfficialReceiptData = {
      receipt_number: item.receipt_number || 'REC-HISTORICO',
      payment_date: item.paid_date || item.due_date,
      cashier_name: 'Caja Central Educa360',
      student: {
        id: statement.student.id,
        name: statement.student.full_name,
        grade_section: statement.enrollment
          ? `${statement.enrollment.grade_name || ''} - ${statement.enrollment.section_name || ''}`
          : 'Estudiante',
        document_number: statement.student.document_number,
      },
      guardian: {
        name: statement.guardian?.full_name || 'Apoderado',
        phone: statement.guardian?.phone,
        document_number: statement.guardian?.document_number,
      },
      institution: {
        name: statement.institution.name,
        ruc: statement.institution.ruc,
        phone: statement.institution.phone,
        email: statement.institution.email,
        address: statement.institution.address,
        logo: statement.institution.logo,
      },
      payment_method: item.payment_method || 'EFECTIVO',
      notes: `Reimpresión de Comprobante por ${item.concept_label}`,
      items: [
        {
          id: item.id,
          concept_type: item.concept_type,
          concept_label: item.concept_label,
          period_month: item.period_month,
          amount: item.amount,
        },
      ],
      total_amount: item.amount,
    };

    setActiveReceiptData(receiptData);
    setReceiptModalOpen(true);
  };

  // Enviar recordatorio por WhatsApp del estado de cuenta completo
  const handleSendFullAccountWhatsApp = () => {
    if (!statement || !statement.guardian?.phone) {
      onNotify({
        type: 'warning',
        title: 'Sin Teléfono Registrado',
        message: 'El apoderado no tiene un número celular registrado.',
      });
      return;
    }

    const cleanPhone = statement.guardian.phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('51') ? cleanPhone : `51${cleanPhone}`;
    const studentName = statement.student.full_name;
    const debtStr = formatSoles(statement.summary.total_pending);

    const pendingDetails = statement.items
      .filter((it) => it.status !== 'PAID')
      .map((it) => `• ${it.concept_label}: ${formatSoles(it.amount)} (Vence: ${formatDateDisplay(it.due_date)})`)
      .join('\n');

    const msg = encodeURIComponent(
      `Estimado(a) ${statement.guardian.full_name}, le saludamos de ${statement.institution.name}.\n\nLe compartimos el Estado de Cuenta actualizado de ${studentName}:\nSaldo pendiente actual: ${debtStr}\n\nDetalle de cuotas:\n${pendingDetails}\n\nPuede acercarse a caja o realizar el pago por los canales autorizados. ¡Muchas gracias!`
    );

    window.open(`https://wa.me/${phoneWithCountry}?text=${msg}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* ===================================================================== */}
      {/* CABECERA PRINCIPAL: CAJA & ESTADO DE CUENTA INTEGRAL                  */}
      {/* ===================================================================== */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-50 text-[#26995b]">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#223a5e]">
                Módulo de Cobranzas en Ventanilla & Estado de Cuenta
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Liquidación integral por estudiante (Matrículas, Ingreso, Pensiones y Servicios adicionales) con emisión de comprobante oficial.
              </p>
            </div>
          </div>
        </div>

        {/* Buscador Rápido de Alumnos */}
        <div className="w-full md:w-80 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por alumno, DNI o apoderado..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              fetchStudents(e.target.value);
            }}
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#2fbf71] focus:bg-white transition"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                fetchStudents('');
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* VISTA A: SI NO HAY ALUMNO SELECCIONADO -> PADRÓN DE COBRANZA GENERAL  */}
      {/* ===================================================================== */}
      {!selectedStudentId ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#223a5e]" />
              <span className="text-xs font-black uppercase text-slate-700 tracking-wider">
                Directorio Financiero de Estudiantes ({students.length})
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              Selecciona un estudiante para emitir recibo o ver su estado de cuenta
            </span>
          </div>

          {loadingStudents ? (
            <div className="p-16 text-center text-slate-400 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#2fbf71]" />
              <p className="text-xs font-semibold text-slate-500">Cargando directorio de estudiantes...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-700">No se encontraron estudiantes</p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                No hay coincidencias para el término ingresado. Intenta con otro apellido o DNI.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {students.map((st) => {
                const hasDebt = st.total_debt > 0;
                const hasOverdue = st.overdue_debt > 0;
                return (
                  <div
                    key={st.id}
                    onClick={() => setSelectedStudentId(st.id)}
                    className="p-4 hover:bg-slate-50 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#223a5e] to-[#2fbf71] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                        {st.first_name[0]}
                        {st.last_name[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-black text-[#223a5e] group-hover:text-[#26995b] transition-colors">
                            {st.full_name}
                          </p>
                          {st.document_number && (
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              DNI {st.document_number}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {st.grade_name} • {st.section_name} • Apoderado: {st.guardian_name} ({st.guardian_phone || 'Sin cel'})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <div className="text-right">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            !hasDebt
                              ? 'bg-emerald-50 text-[#26995b] border border-emerald-200'
                              : hasOverdue
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              !hasDebt ? 'bg-[#2fbf71]' : hasOverdue ? 'bg-rose-600 animate-pulse' : 'bg-amber-500'
                            }`}
                          />
                          <span>{!hasDebt ? 'Al Día' : hasOverdue ? 'Moroso' : 'Por Vencer'}</span>
                        </span>
                        <p className="font-mono font-bold text-xs text-[#223a5e] mt-0.5">
                          {hasDebt ? `Deuda: ${formatSoles(st.total_debt)}` : `Total pagado: ${formatSoles(st.total_paid)}`}
                        </p>
                      </div>

                      <div className="p-2 rounded-xl bg-slate-100 text-slate-400 group-hover:bg-[#223a5e] group-hover:text-white transition">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ===================================================================== */
        /* VISTA B: ESTADO DE CUENTA INTEGRAL DEL ALUMNO SELECCIONADO            */
        /* ===================================================================== */
        <div className="space-y-6">
          {/* Barra Superior de Navegación del Alumno */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedStudentId(null)}
              className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              <span>Volver al Directorio de Alumnos</span>
            </button>

            <div className="flex items-center gap-2">
              {statement?.guardian?.phone && (
                <button
                  type="button"
                  onClick={handleSendFullAccountWhatsApp}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#26995b] border border-emerald-300 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                  title="Enviar estado de cuenta por WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-[#2fbf71]" />
                  <span>Enviar Estado por WhatsApp</span>
                </button>
              )}
            </div>
          </div>

          {loadingStatement ? (
            <div className="p-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-200 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#2fbf71]" />
              <p className="text-xs font-semibold text-slate-500">Cargando estado de cuenta integral...</p>
            </div>
          ) : !statement ? (
            <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
              <AlertCircle className="w-8 h-8 mx-auto text-amber-500 mb-2" />
              <p className="text-xs font-bold text-slate-700">No se pudo cargar el estudiante</p>
            </div>
          ) : (
            <>
              {/* Tarjeta de Ficha de Alumno & Apoderado */}
              <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#223a5e] to-[#2fbf71] text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
                    {statement.student.first_name[0]}
                    {statement.student.last_name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-[#223a5e] leading-snug">
                        {statement.student.full_name}
                      </h2>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono text-[10px] font-bold">
                        DNI {statement.student.document_number}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                      <span>
                        <strong className="text-slate-700">Aula:</strong>{' '}
                        {statement.enrollment?.grade_name || 'Sin grado'} - {statement.enrollment?.section_name || 'Sin sección'}
                      </span>
                      <span>&bull;</span>
                      <span>
                        <strong className="text-slate-700">Turno:</strong>{' '}
                        {statement.enrollment?.shift || 'Mañana'}
                      </span>
                      <span>&bull;</span>
                      <span>
                        <strong className="text-slate-700">Condición:</strong>{' '}
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-[#26995b] font-bold text-[10px]">
                          {statement.enrollment?.enrollment_type || 'REGULAR'}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Info Apoderado */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs min-w-[240px]">
                  <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase text-[10px] mb-1">
                    <User className="w-3.5 h-3.5 text-[#2fbf71]" />
                    <span>Apoderado Financiero</span>
                  </div>
                  <p className="font-bold text-slate-800">
                    {statement.guardian?.full_name || 'No registrado'}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {statement.guardian?.relationship || 'Tutor'}{' '}
                    {statement.guardian?.phone && `• Cel: ${statement.guardian.phone}`}
                  </p>
                </div>
              </div>

              {/* 4 Métricas del Estado de Cuenta */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                    Total Facturado / Programado
                  </span>
                  <p className="text-xl font-black text-[#223a5e] mt-1 font-mono">
                    {formatSoles(statement.summary.total_billed)}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {statement.items.length} conceptos asignados
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-[#26995b] tracking-wider">
                      Total Cobrado
                    </span>
                    <ShieldCheck className="w-4 h-4 text-[#2fbf71]" />
                  </div>
                  <p className="text-xl font-black text-[#26995b] mt-1 font-mono">
                    {formatSoles(statement.summary.total_paid)}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {statement.items.filter((i) => i.status === 'PAID').length} conceptos cancelados
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 shadow-xs">
                  <span className="text-[10px] font-bold uppercase text-amber-700 tracking-wider">
                    Saldo Pendiente
                  </span>
                  <p className="text-xl font-black text-amber-800 mt-1 font-mono">
                    {formatSoles(statement.summary.total_pending)}
                  </p>
                  <p className="text-[10px] text-amber-600 mt-0.5">
                    {statement.summary.pending_count} cuota(s) por liquidar
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-rose-700 tracking-wider">
                      Deuda Vencida (Morosidad)
                    </span>
                    {statement.summary.has_overdue && (
                      <ShieldAlert className="w-4 h-4 text-rose-600 animate-pulse" />
                    )}
                  </div>
                  <p className="text-xl font-black text-rose-600 mt-1 font-mono">
                    {formatSoles(statement.summary.total_overdue)}
                  </p>
                  <p className="text-[10px] text-rose-500 mt-0.5">
                    {statement.summary.overdue_count} cuota(s) morosas
                  </p>
                </div>
              </div>

              {/* Tabla Detallada de Conceptos */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black uppercase text-[#223a5e] tracking-wider">
                      Detalle de Cuotas & Conceptos ({statement.items.length})
                    </span>
                    {payableItems.length > 0 && (
                      <button
                        type="button"
                        onClick={handleToggleSelectAll}
                        className="text-[11px] font-bold text-[#26995b] hover:underline cursor-pointer"
                      >
                        {selectedItemIds.length === payableItems.length
                          ? 'Deseleccionar todas'
                          : `Seleccionar todas las pendientes (${payableItems.length})`}
                      </button>
                    )}
                  </div>

                  <span className="text-[11px] text-slate-500">
                    Marca las casillas para liquidar cuotas en ventanilla
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/75 text-slate-400 font-bold uppercase text-[10px]">
                        <th className="py-2.5 px-3 w-10 text-center">
                          {payableItems.length > 0 && (
                            <input
                              type="checkbox"
                              checked={selectedItemIds.length === payableItems.length && payableItems.length > 0}
                              onChange={handleToggleSelectAll}
                              className="rounded border-slate-300 text-[#2fbf71] focus:ring-[#2fbf71] cursor-pointer"
                            />
                          )}
                        </th>
                        <th className="py-2.5 px-4">Concepto / Cuota</th>
                        <th className="py-2.5 px-4 w-24">Período</th>
                        <th className="py-2.5 px-4 w-28">Vencimiento</th>
                        <th className="py-2.5 px-4 text-right w-28">Monto</th>
                        <th className="py-2.5 px-4 w-28">Estado</th>
                        <th className="py-2.5 px-4 w-36">Comprobante</th>
                        <th className="py-2.5 px-3 text-center w-28">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedItems.map((it) => {
                        const isPaid = it.status === 'PAID';
                        const isOverdue = it.status === 'OVERDUE';
                        const isSelected = selectedItemIds.includes(it.id);

                        return (
                          <tr
                            key={it.id}
                            className={`transition ${
                              isSelected
                                ? 'bg-emerald-50/60'
                                : isPaid
                                ? 'bg-white hover:bg-slate-50/50'
                                : isOverdue
                                ? 'bg-rose-50/20 hover:bg-rose-50/40'
                                : 'hover:bg-slate-50/80'
                            }`}
                          >
                            <td className="py-3 px-3 text-center">
                              {!isPaid ? (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectItem(it.id)}
                                  className="rounded border-slate-300 text-[#2fbf71] focus:ring-[#2fbf71] cursor-pointer w-4 h-4"
                                />
                              ) : (
                                <Check className="w-4 h-4 text-[#2fbf71] mx-auto" />
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <p className="font-bold text-[#223a5e] leading-snug">{it.concept_label}</p>
                              <span className="text-[10px] uppercase font-semibold text-slate-400">
                                {it.concept_type}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                              {it.period_month}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className={`font-mono text-[11px] ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>
                                {formatDateDisplay(it.due_date)}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-black text-slate-800">
                              {formatSoles(it.amount)}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  isPaid
                                    ? 'bg-[#e6f9ef] text-[#26995b]'
                                    : isOverdue
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isPaid ? 'bg-[#2fbf71]' : isOverdue ? 'bg-rose-600' : 'bg-amber-400'
                                  }`}
                                />
                                <span>{isPaid ? 'Al Día' : isOverdue ? 'Vencido' : 'Pendiente'}</span>
                              </span>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              {isPaid ? (
                                <div>
                                  <span className="font-mono font-bold text-[11px] text-[#223a5e] block">
                                    {it.receipt_number || 'REC-S/N'}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {formatDateDisplay(it.paid_date)} &bull; {it.payment_method || 'Caja'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[11px] italic">Sin cancelar</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              {isPaid ? (
                                <button
                                  type="button"
                                  onClick={() => handleReprintReceipt(it)}
                                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] transition inline-flex items-center gap-1 cursor-pointer"
                                  title="Reimprimir Recibo Oficial"
                                >
                                  <Printer className="w-3 h-3 text-[#223a5e]" />
                                  <span>Recibo</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedItemIds([it.id]);
                                    handleOpenCollectModal();
                                  }}
                                  className="px-3 py-1 rounded-lg bg-[#2fbf71] hover:bg-[#26995b] text-white font-bold text-[10px] transition cursor-pointer shadow-xs"
                                >
                                  Cobrar
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {statement.items.length > itemsPageSize && (
                  <Pagination
                    currentPage={itemsPage}
                    totalItems={statement.items.length}
                    itemsPerPage={itemsPageSize}
                    onPageChange={setItemsPage}
                    onItemsPerPageChange={(size) => {
                      setItemsPageSize(size);
                      setItemsPage(1);
                    }}
                    itemsPerPageOptions={[10, 15, 25, 50]}
                    labelSingular="cuota"
                    labelPlural="cuotas"
                  />
                )}
              </div>

              {/* Barra Flotante de Liquidación en Ventanilla */}
              {selectedItemIds.length > 0 && (
                <div className="sticky bottom-4 z-40 bg-[#223a5e] text-white p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-bottom-2 duration-200 border border-[#2fbf71]/30">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-white/10 text-[#2fbf71]">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-300">
                        {selectedItemIds.length} concepto(s) seleccionado(s) para liquidar:
                      </p>
                      <p className="text-lg font-black text-white font-mono">
                        Total a Cobrar: <span className="text-[#2fbf71]">{formatSoles(selectedTotalAmount)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setSelectedItemIds([])}
                      className="px-3 py-2 rounded-xl border border-white/20 text-xs font-bold text-slate-300 hover:bg-white/10 transition cursor-pointer"
                    >
                      Limpiar
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenCollectModal}
                      className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-[#2fbf71] hover:bg-[#26995b] text-white text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                    >
                      <DollarSign className="w-4 h-4" />
                      <span>Proceder al Cobro en Ventanilla</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: COBRANZA EN VENTANILLA                                         */}
      {/* ===================================================================== */}
      {payModalOpen && statement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-gradient-to-r from-[#223a5e] to-[#1c2f4c] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#2fbf71]/20 text-[#2fbf71]">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Liquidación en Ventanilla</h3>
                  <p className="text-[11px] text-slate-300">Cobro de cuotas escolares con emisión de recibo</p>
                </div>
              </div>
              <button
                onClick={() => setPayModalOpen(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="p-6 space-y-4">
              {/* Resumen de alumno y conceptos */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-semibold">Estudiante:</span>
                  <span className="font-bold text-[#223a5e]">{statement.student.full_name}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-semibold">Apoderado:</span>
                  <span className="font-semibold text-slate-700">{statement.guardian?.full_name || 'Sin apoderado'}</span>
                </div>
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Conceptos a Liquidar ({selectedItems.length}):
                  </span>
                  <div className="max-h-28 overflow-y-auto divide-y divide-slate-100 pr-1">
                    {selectedItems.map((it) => (
                      <div key={it.id} className="py-1 flex justify-between text-[11px]">
                        <span className="text-slate-700 truncate pr-2">{it.concept_label}</span>
                        <span className="font-mono font-bold text-slate-900">{formatSoles(it.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t-2 border-slate-200 flex justify-between items-center">
                  <span className="font-black text-slate-800 uppercase text-xs">Total a Cobrar:</span>
                  <span className="font-mono font-black text-base text-[#26995b]">
                    {formatSoles(selectedTotalAmount)}
                  </span>
                </div>
              </div>

              {/* Formulario de Pago */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                    Medio de Pago *
                  </label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                  >
                    {availablePaymentMethods && availablePaymentMethods.length > 0 ? (
                      availablePaymentMethods.map((pm) => (
                        <option key={pm.code} value={pm.code}>
                          {pm.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="EFECTIVO">Efectivo (Caja)</option>
                        <option value="YAPE">Yape</option>
                        <option value="PLIN">Plin</option>
                        <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                        <option value="TARJETA_DEBITO">Tarjeta de Débito</option>
                        <option value="TARJETA_CREDITO">Tarjeta de Crédito</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                    N° Recibo / Comprobante
                  </label>
                  <input
                    type="text"
                    value={payReceiptNumber}
                    onChange={(e) => setPayReceiptNumber(e.target.value)}
                    placeholder="REC-2026-XXXXX"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold font-mono text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                  Fecha de Cobro *
                </label>
                <input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                  Observaciones / N° Operación (Opcional)
                </label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Ej: Operación BCP 541289 o Pago en ventanilla..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPayModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isProcessingPayment}
                  className="px-6 py-2 rounded-xl bg-[#2fbf71] hover:bg-[#26995b] text-white text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-md"
                >
                  {isProcessingPayment ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Procesando Cobro...
                    </>
                  ) : (
                    <>
                      <Printer className="w-3.5 h-3.5" /> Confirmar Cobro & Emitir Recibo
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* ===================================================================== */}
      {/* MODAL: RECIBO OFICIAL IMPRIMIBLE                                      */}
      {/* ===================================================================== */}
      <OfficialReceiptPrintModal
        isOpen={receiptModalOpen}
        receipt={activeReceiptData}
        onClose={() => {
          setReceiptModalOpen(false);
          setActiveReceiptData(null);
        }}
      />
    </div>
  );
}
