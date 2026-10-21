'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  PlusCircle,
  Tag,
  Search,
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  Landmark,
  CalendarCheck,
  Clock,
  Download,
  MessageCircle,
  Lock,
  Unlock,
  Check,
  Users,
  Sliders,
  Info,
  ShoppingBag,
  Package,
  Percent,
  Edit2,
  Zap,
  BarChart3,
  PieChart,
  Award,
  Receipt,
  ShieldCheck,
} from 'lucide-react';
import {
  FinancialCategory,
  FinancialTransaction,
  FinancialMetrics,
  FundsSummary,
  TransactionType,
  FundingSourceType,
  RecurringExpense,
  BankLoan,
  BankLoanInstallment,
  StudentTuition,
  SchoolProduct,
  ProductBatch,
  ProductBatchPayment,
  ProductSale,
  PaymentMethodItem,
} from '@/types';
import { AlertType } from '@/components/ui/AlertToast';
import Pagination from '@/components/ui/Pagination';
import StudentAccountStatementView from './StudentAccountStatementView';


export type FinancialSubmodule = 'cashflow' | 'tuitions' | 'products' | 'obligations' | 'shifts';

interface FinancesManagerProps {
  initialSubmodule?: FinancialSubmodule;
  onNotify: (alert: { type: AlertType; title: string; message?: string }) => void;
  onSubmoduleChange?: (submodule: FinancialSubmodule) => void;
}

export default function FinancesManager({
  initialSubmodule = 'cashflow',
  onNotify,
  onSubmoduleChange,
}: FinancesManagerProps) {
  // Submódulo seleccionado
  const [currentSubmodule, setCurrentSubmodule] = useState<FinancialSubmodule>(initialSubmodule);

  const handleSelectSubmodule = (sub: FinancialSubmodule) => {
    setCurrentSubmodule(sub);
    onSubmoduleChange?.(sub);
  };

  // Sincronizar si cambia el prop desde la barra lateral
  useEffect(() => {
    if (initialSubmodule) {
      setCurrentSubmodule(initialSubmodule);
    }
  }, [initialSubmodule]);

  // Estados de datos generales
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [metrics, setMetrics] = useState<FinancialMetrics>({
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
    transactionsCount: 0,
    incomeByCategory: [],
    expenseByCategory: [],
  });
  const [loading, setLoading] = useState(true);

  // Filtros de fecha y búsqueda
  const currentMonthStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedType, setSelectedType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Paginación de Movimientos de Caja
  const [txPage, setTxPage] = useState(1);
  const [txPageSize, setTxPageSize] = useState(15);

  useEffect(() => {
    setTxPage(1);
  }, [selectedMonth, selectedType, searchTerm]);

  const paginatedTransactions = useMemo(() => {
    const start = (txPage - 1) * txPageSize;
    return transactions.slice(start, start + txPageSize);
  }, [transactions, txPage, txPageSize]);

  // =========================================================================
  // SUBMÓDULO 2: MOROSIDAD & PENSIONES DE ALUMNOS
  // =========================================================================
  const [tuitions, setTuitions] = useState<StudentTuition[]>([]);
  const [tuitionMetrics, setTuitionMetrics] = useState({
    totalStudents: 0,
    paidCount: 0,
    pendingCount: 0,
    overdueCount: 0,
    totalExpected: 0,
    totalCollected: 0,
    totalPending: 0,
    pendingAmount: 0,
    overdueAmount: 0,
    collectionRate: 0,
  });
  const [loadingTuitions, setLoadingTuitions] = useState(false);
  const [tuitionStatusFilter, setTuitionStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING' | 'OVERDUE'>('ALL');
  const [tuitionViewMode, setTuitionViewMode] = useState<'statement' | 'roster'>('statement');
  const [statementSelectedStudentId, setStatementSelectedStudentId] = useState<string | null>(null);

  // Paginación de Pensiones
  const [tuitionPage, setTuitionPage] = useState(1);
  const [tuitionPageSize, setTuitionPageSize] = useState(15);

  useEffect(() => {
    setTuitionPage(1);
  }, [selectedMonth, tuitionStatusFilter]);

  const paginatedTuitions = useMemo(() => {
    const start = (tuitionPage - 1) * tuitionPageSize;
    return tuitions.slice(start, start + tuitionPageSize);
  }, [tuitions, tuitionPage, tuitionPageSize]);

  // Modales Pensiones
  const [payTuitionModalOpen, setPayTuitionModalOpen] = useState(false);
  const [selectedTuitionForPay, setSelectedTuitionForPay] = useState<StudentTuition | null>(null);
  const [payTuitionMethod, setPayTuitionMethod] = useState('EFECTIVO');
  const [payTuitionReceipt, setPayTuitionReceipt] = useState('');
  const [payTuitionDate, setPayTuitionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [payingTuition, setPayingTuition] = useState(false);
  // =========================================================================
  // SUBMÓDULO 3: SERVICIOS FIJOS & PRÉSTAMOS BANCARIOS
  // =========================================================================
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [recurringMetrics, setRecurringMetrics] = useState({
    totalServices: 0,
    paidServicesCount: 0,
    pendingServicesCount: 0,
    totalPaidAmount: 0,
  });
  const [loadingRecurring, setLoadingRecurring] = useState(false);

  const [bankLoans, setBankLoans] = useState<BankLoan[]>([]);
  const [loansMetrics, setLoansMetrics] = useState({
    totalBorrowed: 0,
    totalPaidDebt: 0,
    totalPendingDebt: 0,
    activeLoansCount: 0,
  });
  const [loadingLoans, setLoadingLoans] = useState(false);

  // Modales de Servicios y Préstamos
  const [createRecurringModalOpen, setCreateRecurringModalOpen] = useState(false);
  const [payRecurringModalOpen, setPayRecurringModalOpen] = useState(false);
  const [selectedRecurringForPay, setSelectedRecurringForPay] = useState<RecurringExpense | null>(null);
  const [newRecName, setNewRecName] = useState('');
  const [newRecSupplier, setNewRecSupplier] = useState('');
  const [newRecSupplyNumber, setNewRecSupplyNumber] = useState('');
  const [newRecDefaultAmount, setNewRecDefaultAmount] = useState('');
  const [newRecIsVariable, setNewRecIsVariable] = useState(false);
  const [newRecDueDay, setNewRecDueDay] = useState('15');
  const [newRecPaymentMethod, setNewRecPaymentMethod] = useState('TRANSFERENCIA');
  const [savingRecurring, setSavingRecurring] = useState(false);

  const [payRecAmount, setPayRecAmount] = useState('');
  const [payRecDate, setPayRecDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [payRecMethod, setPayRecMethod] = useState('TRANSFERENCIA');
  const [payRecReceipt, setPayRecReceipt] = useState('');
  const [payRecFundingSource, setPayRecFundingSource] = useState<FundingSourceType>('PROPIO');
  const [payRecFundingLoanId, setPayRecFundingLoanId] = useState('');
  const [payRecFundingEntityName, setPayRecFundingEntityName] = useState('');
  const [payingRecurring, setPayingRecurring] = useState(false);

  const [createLoanModalOpen, setCreateLoanModalOpen] = useState(false);
  const [payInstallmentModalOpen, setPayInstallmentModalOpen] = useState(false);
  const [selectedLoanForSchedule, setSelectedLoanForSchedule] = useState<BankLoan | null>(null);
  const [selectedLoanForPay, setSelectedLoanForPay] = useState<{
    loan: BankLoan;
    installment: BankLoanInstallment;
  } | null>(null);

  const [newLoanBank, setNewLoanBank] = useState('BCP');
  const [newLoanTitle, setNewLoanTitle] = useState('');
  const [newLoanPrincipal, setNewLoanPrincipal] = useState('');
  const [newLoanInstallments, setNewLoanInstallments] = useState('');
  const [newLoanMonthlyAmount, setNewLoanMonthlyAmount] = useState('');
  const [newLoanTea, setNewLoanTea] = useState('');
  const [newLoanDisbursementDate, setNewLoanDisbursementDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newLoanFirstPaymentDate, setNewLoanFirstPaymentDate] = useState(() => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth.toISOString().split('T')[0];
  });
  const [savingLoan, setSavingLoan] = useState(false);

  const [payInstDate, setPayInstDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [payInstMethod, setPayInstMethod] = useState('TRANSFERENCIA');
  const [payInstReceipt, setPayInstReceipt] = useState('');
  const [payInstAmount, setPayInstAmount] = useState('');
  const [payInstFundingSource, setPayInstFundingSource] = useState<FundingSourceType>('APORTE_SOCIO');
  const [payInstFundingEntityName, setPayInstFundingEntityName] = useState('');
  const [payingInstallment, setPayingInstallment] = useState(false);

  // Estados para Edición de Cuota Individual
  const [editInstallmentModalOpen, setEditInstallmentModalOpen] = useState(false);
  const [selectedInstForEdit, setSelectedInstForEdit] = useState<{ loanId: string; installment: BankLoanInstallment } | null>(null);
  const [editInstAmount, setEditInstAmount] = useState('');
  const [editInstDueDate, setEditInstDueDate] = useState('');
  const [updatingInstallment, setUpdatingInstallment] = useState(false);

  // Estados para Reprogramación de Préstamo
  const [reprogramModalOpen, setReprogramModalOpen] = useState(false);
  const [selectedLoanForReprogram, setSelectedLoanForReprogram] = useState<BankLoan | null>(null);
  const [reprogramNewInstallments, setReprogramNewInstallments] = useState('');
  const [reprogramNewAmount, setReprogramNewAmount] = useState('');
  const [reprogramFirstDueDate, setReprogramFirstDueDate] = useState('');
  const [reprogramNotes, setReprogramNotes] = useState('');
  const [reprogramming, setReprogramming] = useState(false);

  // Estados para Amortización Extraordinaria a Capital
  const [amortizeModalOpen, setAmortizeModalOpen] = useState(false);
  const [selectedLoanForAmortize, setSelectedLoanForAmortize] = useState<BankLoan | null>(null);
  const [amortizeAmount, setAmortizeAmount] = useState('');
  const [amortizeDate, setAmortizeDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [amortizeMethod, setAmortizeMethod] = useState('TRANSFERENCIA');
  const [amortizeReceipt, setAmortizeReceipt] = useState('');
  const [amortizeMode, setAmortizeMode] = useState<'REDUCE_TERM' | 'REDUCE_AMOUNT'>('REDUCE_TERM');
  const [amortizing, setAmortizing] = useState(false);

  // Estados para Reporte y Análisis Mensual (Lo Producido vs Lo Invertido)
  const [monthlyReportModalOpen, setMonthlyReportModalOpen] = useState(false);
  const [monthlyReportData, setMonthlyReportData] = useState<any>(null);
  const [loadingMonthlyReport, setLoadingMonthlyReport] = useState(false);
  const [reportSelectedMonth, setReportSelectedMonth] = useState(currentMonthStr);

  // =========================================================================
  // SUBMÓDULO 4: CAJA DIARIA & ARQUEO DE VENTANILLA
  // =========================================================================
  const [activeShift, setActiveShift] = useState<any>(null);
  const [shiftHistory, setShiftHistory] = useState<any[]>([]);
  const [loadingShift, setLoadingShift] = useState(false);

  // Paginación de Historial de Arqueos
  const [shiftPage, setShiftPage] = useState(1);
  const [shiftPageSize, setShiftPageSize] = useState(10);

  const paginatedShifts = useMemo(() => {
    const start = (shiftPage - 1) * shiftPageSize;
    return shiftHistory.slice(start, start + shiftPageSize);
  }, [shiftHistory, shiftPage, shiftPageSize]);

  const [openShiftModalOpen, setOpenShiftModalOpen] = useState(false);
  const [openShiftBalance, setOpenShiftBalance] = useState('0.00');
  const [lastClosedCash, setLastClosedCash] = useState<number>(0);
  const [openingShift, setOpeningShift] = useState(false);

  const [closeShiftModalOpen, setCloseShiftModalOpen] = useState(false);
  const [countedActualCash, setCountedActualCash] = useState('');
  const [closureNotes, setClosureNotes] = useState('');
  const [closingShift, setClosingShift] = useState(false);

  // =========================================================================
  // HERRAMIENTAS ADICIONALES: PREVISIÓN (MODAL) Y OPERACIONES RÁPIDAS
  // =========================================================================
  const [forecastModalOpen, setForecastModalOpen] = useState(false);
  const [forecastData, setForecastData] = useState<any>(null);
  const [loadingForecast, setLoadingForecast] = useState(false);

  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txModalType, setTxModalType] = useState<TransactionType>('INCOME');
  const [formAmount, setFormAmount] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState('EFECTIVO');
  const [formReceiptNumber, setFormReceiptNumber] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formFundingSource, setFormFundingSource] = useState<FundingSourceType>('PROPIO');
  const [formFundingLoanId, setFormFundingLoanId] = useState('');
  const [formFundingEntityName, setFormFundingEntityName] = useState('');
  const [formFundingDetails, setFormFundingDetails] = useState('');
  const [savingTx, setSavingTx] = useState(false);

  const [categoriesModalOpen, setCategoriesModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FinancialCategory | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<TransactionType>('EXPENSE');
  const [newCatDescription, setNewCatDescription] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);

  // Medios de pago dinámicos desde BD
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodItem[]>([]);

  const availablePaymentMethods = useMemo(() => {
    if (paymentMethods && paymentMethods.length > 0) {
      return paymentMethods.map((pm) => ({ code: pm.code, name: pm.name }));
    }
    return [
      { code: 'EFECTIVO', name: 'Efectivo (Ventanilla)' },
      { code: 'TRANSFERENCIA', name: 'Transferencia Bancaria' },
      { code: 'YAPE_PLIN', name: 'Yape / Plin' },
      { code: 'TARJETA', name: 'Tarjeta Débito/Crédito' },
    ];
  }, [paymentMethods]);

  // =========================================================================
  // SUBMÓDULO: PRODUCTOS, UNIFORMES & LIBROS (INVENTARIO & INVERSIÓN)
  // =========================================================================
  const [products, setProducts] = useState<SchoolProduct[]>([]);
  const [productsMetrics, setProductsMetrics] = useState({
    totalProductsCount: 0,
    totalStockAvailable: 0,
    totalInvestedGlobal: 0,
    totalRevenueGlobal: 0,
    totalProfitRealizedGlobal: 0,
    potentialProfitGlobal: 0,
  });
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productCategoryFilter, setProductCategoryFilter] = useState<'ALL' | 'LIBROS' | 'UNIFORMES' | 'MATERIALES' | 'OTROS'>('ALL');

  // Paginación de Catálogo e Inventario
  const [prodPage, setProdPage] = useState(1);
  const [prodPageSize, setProdPageSize] = useState(10);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => productCategoryFilter === 'ALL' || p.category === productCategoryFilter);
  }, [products, productCategoryFilter]);

  useEffect(() => {
    setProdPage(1);
  }, [productCategoryFilter]);

  const paginatedProducts = useMemo(() => {
    const start = (prodPage - 1) * prodPageSize;
    return filteredProducts.slice(start, start + prodPageSize);
  }, [filteredProducts, prodPage, prodPageSize]);

  // Modales de Productos
  const [createProductModalOpen, setCreateProductModalOpen] = useState(false);
  const [recordSaleModalOpen, setRecordSaleModalOpen] = useState(false);
  const [selectedProductForSale, setSelectedProductForSale] = useState<SchoolProduct | null>(null);
  const [batchesModalOpen, setBatchesModalOpen] = useState(false);
  const [selectedProductForBatches, setSelectedProductForBatches] = useState<SchoolProduct | null>(null);
  const [payBatchPartModalOpen, setPayBatchPartModalOpen] = useState(false);
  const [selectedBatchPaymentForPay, setSelectedBatchPaymentForPay] = useState<{
    product: SchoolProduct;
    batch: ProductBatch;
    payment: ProductBatchPayment;
  } | null>(null);

  // Formulario Nuevo Producto con Lote de Inversión
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState<'LIBROS' | 'UNIFORMES' | 'MATERIALES' | 'OTROS'>('LIBROS');
  const [prodSku, setProdSku] = useState('');
  const [prodSupplier, setProdSupplier] = useState('');
  const [prodQuantity, setProdQuantity] = useState('');
  const [prodTotalInvestment, setProdTotalInvestment] = useState('');
  const [prodSellingPrice, setProdSellingPrice] = useState('');
  const [prodTargetMargin, setProdTargetMargin] = useState('35');
  const [prodPaymentParts, setProdPaymentParts] = useState<'1' | '2' | '3'>('1');
  const [prodPart1DueDate, setProdPart1DueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [prodPart2DueDate, setProdPart2DueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });
  const [prodPart3DueDate, setProdPart3DueDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  });
  const [prodPayFirstNow, setProdPayFirstNow] = useState(true);
  const [prodFirstPaymentMethod, setProdFirstPaymentMethod] = useState('TRANSFERENCIA');
  const [prodFirstPaymentReceipt, setProdFirstPaymentReceipt] = useState('');
  const [prodFundingSource, setProdFundingSource] = useState<FundingSourceType>('PROPIO');
  const [prodFundingLoanId, setProdFundingLoanId] = useState('');
  const [prodFundingEntityName, setProdFundingEntityName] = useState('');
  const [savingProduct, setSavingProduct] = useState(false);

  // Formulario Venta de Producto
  const [saleQuantity, setSaleQuantity] = useState('1');
  const [saleUnitPrice, setSaleUnitPrice] = useState('');
  const [saleStudentName, setSaleStudentName] = useState('');
  const [saleBuyerName, setSaleBuyerName] = useState('');
  const [salePaymentMethod, setSalePaymentMethod] = useState('EFECTIVO');
  const [saleReceiptNumber, setSaleReceiptNumber] = useState('');
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [savingSale, setSavingSale] = useState(false);

  // Formulario Pago de Cuota de Inversión
  const [payBatchPartDate, setPayBatchPartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [payBatchPartMethod, setPayBatchPartMethod] = useState('TRANSFERENCIA');
  const [payBatchPartReceipt, setPayBatchPartReceipt] = useState('');
  const [payBatchPartFundingSource, setPayBatchPartFundingSource] = useState<FundingSourceType>('PROPIO');
  const [payBatchPartFundingLoanId, setPayBatchPartFundingLoanId] = useState('');
  const [payBatchPartFundingEntityName, setPayBatchPartFundingEntityName] = useState('');
  const [payingBatchPart, setPayingBatchPart] = useState(false);

  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    isOpen: boolean;
    itemType: 'transaction' | 'recurring' | 'loan' | 'category' | 'product' | 'tuition';
    transaction?: FinancialTransaction | null;
    recurring?: RecurringExpense | null;
    loan?: BankLoan | null;
    category?: FinancialCategory | null;
    product?: SchoolProduct | null;
    tuition?: StudentTuition | null;
  }>({
    isOpen: false,
    itemType: 'transaction',
    transaction: null,
    recurring: null,
    loan: null,
    category: null,
    product: null,
    tuition: null,
  });

  const [deleting, setDeleting] = useState(false);

  // Formato Soles
  const formatSoles = (val: number) => {
    return `S/ ${Number(val || 0).toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Formato Fecha en Español sin horas (ej: "19/11/2026")
  const formatDisplayDate = (val?: string | null) => {
    if (!val || String(val).trim() === '' || val === 'null' || val === '—') return '—';
    const clean = String(val).trim();
    // Si viene en formato YYYY-MM-DD
    const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, y, m, d] = match;
      return `${d}/${m}/${y}`;
    }
    // Si viene como fecha ISO o timestamp
    try {
      const parsed = new Date(clean);
      if (!isNaN(parsed.getTime())) {
        const day = String(parsed.getDate()).padStart(2, '0');
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const year = parsed.getFullYear();
        return `${day}/${month}/${year}`;
      }
    } catch {}
    return clean;
  };

  // =========================================================================
  // CARGA DE DATOS
  // =========================================================================
  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/finances/categories');
      const data = await res.json();
      if (data.success && Array.isArray(data.categories)) {
        setCategories(data.categories);
      }
    } catch (err) {
      console.error('Error al cargar categorías:', err);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedMonth) params.append('month', selectedMonth);
      if (selectedType !== 'ALL') params.append('type', selectedType);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());

      const res = await fetch(`/api/finances/transactions?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setTransactions(data.transactions || []);
        if (data.metrics) setMetrics(data.metrics);
      }
    } catch {
      onNotify({ type: 'error', title: 'Error', message: 'No se pudieron cargar transacciones.' });
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedType, searchTerm, onNotify]);

  const fetchTuitions = useCallback(async () => {
    setLoadingTuitions(true);
    try {
      const month = selectedMonth || currentMonthStr;
      const params = new URLSearchParams({ month });
      if (tuitionStatusFilter !== 'ALL') params.append('status', tuitionStatusFilter);

      const res = await fetch(`/api/finances/tuitions?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setTuitions(data.tuitions || []);
        if (data.metrics) setTuitionMetrics(data.metrics);
      }
    } catch (err) {
      console.error('Error al cargar pensiones:', err);
    } finally {
      setLoadingTuitions(false);
    }
  }, [selectedMonth, currentMonthStr, tuitionStatusFilter]);

  const fetchCashRegister = useCallback(async () => {
    setLoadingShift(true);
    try {
      const res = await fetch('/api/finances/cash-register');
      const data = await res.json();
      if (data.success) {
        setActiveShift(data.activeShift || null);
        setShiftHistory(data.history || []);
        if (typeof data.last_closed_actual_cash === 'number') {
          setLastClosedCash(data.last_closed_actual_cash);
        }
      }
    } catch (err) {
      console.error('Error al cargar caja:', err);
    } finally {
      setLoadingShift(false);
    }
  }, []);

  const fetchRecurringExpenses = useCallback(async () => {
    setLoadingRecurring(true);
    try {
      const month = selectedMonth || currentMonthStr;
      const res = await fetch(`/api/finances/recurring?month=${month}`);
      const data = await res.json();
      if (data.success) {
        setRecurringExpenses(data.recurringExpenses || []);
        if (data.metrics) setRecurringMetrics(data.metrics);
      }
    } catch (err) {
      console.error('Error al cargar servicios:', err);
    } finally {
      setLoadingRecurring(false);
    }
  }, [selectedMonth, currentMonthStr]);

  const fetchBankLoans = useCallback(async () => {
    setLoadingLoans(true);
    try {
      const res = await fetch('/api/finances/loans');
      const data = await res.json();
      if (data.success) {
        setBankLoans(data.loans || []);
        if (data.metrics) setLoansMetrics(data.metrics);
        setSelectedLoanForSchedule((prev) => {
          if (!prev) return null;
          return (data.loans || []).find((l: BankLoan) => l.id === prev.id) || null;
        });
      }
    } catch (err) {
      console.error('Error al cargar préstamos:', err);
    } finally {
      setLoadingLoans(false);
    }
  }, []);

  const fetchForecast = useCallback(async () => {
    setLoadingForecast(true);
    try {
      const month = selectedMonth || currentMonthStr;
      const res = await fetch(`/api/finances/forecast?month=${month}`);
      const data = await res.json();
      if (data.success) {
        setForecastData({
          ...data.forecast,
          period: data.period,
        });
      }
    } catch (err) {
      console.error('Error al calcular previsión:', err);
    } finally {
      setLoadingForecast(false);
    }
  }, [selectedMonth, currentMonthStr]);

  const fetchMonthlyReport = useCallback(async (monthToFetch?: string) => {
    setLoadingMonthlyReport(true);
    try {
      const month = monthToFetch || reportSelectedMonth || selectedMonth || currentMonthStr;
      const res = await fetch(`/api/finances/monthly-report?month=${month}`);
      const data = await res.json();
      if (data.success) {
        setMonthlyReportData(data);
        setReportSelectedMonth(data.month);
      } else {
        onNotify({ type: 'error', title: 'Error', message: data.message || 'Error al obtener análisis mensual' });
      }
    } catch (err) {
      console.error('Error al calcular reporte mensual:', err);
      onNotify({ type: 'error', title: 'Error', message: 'Error de conexión al generar reporte mensual' });
    } finally {
      setLoadingMonthlyReport(false);
    }
  }, [reportSelectedMonth, selectedMonth, currentMonthStr, onNotify]);

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch('/api/finances/products');
      const data = await res.json();
      if (data.success) {
        setProducts(data.products || []);
        if (data.metrics) setProductsMetrics(data.metrics);
      }
    } catch (err) {
      console.error('Error al cargar productos:', err);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const fetchPaymentMethods = useCallback(async () => {
    try {
      const res = await fetch('/api/finances/payment-methods');
      const data = await res.json();
      if (data.success && Array.isArray(data.paymentMethods)) {
        setPaymentMethods(data.paymentMethods);
      }
    } catch (err) {
      console.error('Error al cargar medios de pago:', err);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchPaymentMethods();
  }, [fetchCategories, fetchPaymentMethods]);

  useEffect(() => {
    fetchTransactions();
    fetchTuitions();
    fetchCashRegister();
    fetchRecurringExpenses();
    fetchBankLoans();
    fetchProducts();
  }, [fetchTransactions, fetchTuitions, fetchCashRegister, fetchRecurringExpenses, fetchBankLoans, fetchProducts]);

  // =========================================================================
  // HANDLERS: COBRANZAS Y RECORDATORIOS WHATSAPP
  // =========================================================================
  const handleOpenPayTuition = (t: StudentTuition) => {
    setSelectedTuitionForPay(t);
    setPayTuitionMethod('EFECTIVO');
    setPayTuitionReceipt(`REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setPayTuitionDate(new Date().toISOString().split('T')[0]);
    setPayTuitionModalOpen(true);
  };

  const handleExecutePayTuition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTuitionForPay) return;

    setPayingTuition(true);
    try {
      const res = await fetch('/api/finances/tuitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'PAY_TUITION',
          tuition_id: selectedTuitionForPay.id,
          payment_method: payTuitionMethod,
          receipt_number: payTuitionReceipt.trim() || null,
          paid_date: payTuitionDate,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onNotify({ type: 'success', title: 'Pensión Cobrada', message: data.message });
        setPayTuitionModalOpen(false);
        fetchTuitions();
        fetchTransactions();
        fetchCashRegister();
      } else {
        onNotify({ type: 'error', title: 'Error', message: data.message });
      }
    } catch {
      onNotify({ type: 'error', title: 'Error', message: 'No se pudo procesar el cobro.' });
    } finally {
      setPayingTuition(false);
    }
  };

  const handleSendWhatsAppReminder = (t: StudentTuition) => {
    const cleanPhone = t.parent_phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('51') ? cleanPhone : `51${cleanPhone}`;
    const text = encodeURIComponent(
      `Estimado(a) ${t.parent_name}, le recordamos cordialmente que la pensión escolar de ${t.student_name} (${t.grade_section}) por el monto de S/ ${t.monthly_amount.toFixed(2)} correspondiente a ${t.period_month} vence el ${formatDisplayDate(t.due_date)}. Puede cancelar en ventanilla, transferencia o Yape. ¡Muchas gracias!`
    );
    window.open(`https://wa.me/${phoneWithCountry}?text=${text}`, '_blank');
  };

  // =========================================================================
  // HANDLERS: ARQUEO DE CAJA
  // =========================================================================
  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setOpeningShift(true);
    try {
      const res = await fetch('/api/finances/cash-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'OPEN_SHIFT',
          opening_balance: parseFloat(openShiftBalance) || 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onNotify({ type: 'success', title: 'Caja Abierta', message: data.message });
        setOpenShiftModalOpen(false);
        fetchCashRegister();
      } else {
        onNotify({ type: 'error', title: 'Error', message: data.message });
      }
    } catch {
      onNotify({ type: 'error', title: 'Error', message: 'No se pudo abrir el turno.' });
    } finally {
      setOpeningShift(false);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;

    setClosingShift(true);
    try {
      const res = await fetch('/api/finances/cash-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CLOSE_SHIFT',
          shift_id: activeShift.id,
          actual_cash: parseFloat(countedActualCash) || 0,
          closure_notes: closureNotes.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onNotify({ type: 'success', title: 'Caja Cerrada', message: data.message });
        setCloseShiftModalOpen(false);
        fetchCashRegister();
      } else {
        onNotify({ type: 'error', title: 'Error', message: data.message });
      }
    } catch {
      onNotify({ type: 'error', title: 'Error', message: 'No se pudo cerrar la caja.' });
    } finally {
      setClosingShift(false);
    }
  };

  // =========================================================================
  // HANDLERS: SERVICIOS RECURRENTES
  // =========================================================================
  const handleCreateRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecName.trim()) {
      onNotify({ type: 'warning', title: 'Nombre Requerido', message: 'Ingresa el nombre del servicio recurrente.' });
      return;
    }
    const day = parseInt(newRecDueDay, 10);
    if (isNaN(day) || day < 1 || day > 31) {
      onNotify({ type: 'warning', title: 'Día Inválido', message: 'El día de vencimiento debe estar entre 1 y 31.' });
      return;
    }

    setSavingRecurring(true);
    try {
      const res = await fetch('/api/finances/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE',
          name: newRecName.trim(),
          supplier_name: newRecSupplier.trim() || null,
          supply_number: newRecSupplyNumber.trim() || null,
          default_amount: parseFloat(newRecDefaultAmount) || 0,
          is_variable_amount: newRecIsVariable,
          due_day: day,
          payment_method: newRecPaymentMethod,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onNotify({ type: 'success', title: 'Servicio Configurado', message: data.message });
        setCreateRecurringModalOpen(false);
        setNewRecName('');
        setNewRecSupplier('');
        setNewRecSupplyNumber('');
        setNewRecDefaultAmount('');
        setNewRecIsVariable(false);
        setNewRecDueDay('15');
        fetchRecurringExpenses();
      } else {
        onNotify({ type: 'error', title: 'Error', message: data.message });
      }
    } catch {
      onNotify({ type: 'error', title: 'Error', message: 'No se pudo guardar el servicio recurrente.' });
    } finally {
      setSavingRecurring(false);
    }
  };

  const handlePayRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecurringForPay) return;
    const amountNum = parseFloat(payRecAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      onNotify({ type: 'warning', title: 'Monto Requerido', message: 'Ingresa un monto válido mayor a 0.' });
      return;
    }

    setPayingRecurring(true);
    try {
      const res = await fetch('/api/finances/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'PAY',
          recurring_expense_id: selectedRecurringForPay.id,
          period_month: selectedMonth || currentMonthStr,
          amount: amountNum,
          payment_method: payRecMethod,
          receipt_number: payRecReceipt.trim() || null,
          paid_date: payRecDate,
          funding_source: payRecFundingSource,
          funding_loan_id: payRecFundingSource === 'PRESTAMO_BANCARIO' ? payRecFundingLoanId : null,
          funding_entity_name: (payRecFundingSource === 'PRESTAMISTA' || payRecFundingSource === 'APORTE_SOCIO') ? payRecFundingEntityName.trim() : null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onNotify({ type: 'success', title: 'Servicio Pagado', message: data.message });
        setPayRecurringModalOpen(false);
        setSelectedRecurringForPay(null);
        setPayRecAmount('');
        setPayRecReceipt('');
        setPayRecFundingSource('PROPIO');
        setPayRecFundingLoanId('');
        setPayRecFundingEntityName('');
        fetchRecurringExpenses();
        fetchTransactions();
        fetchCashRegister();
        fetchBankLoans();
      } else {
        onNotify({ type: 'error', title: 'Error', message: data.message });
      }
    } catch {
      onNotify({ type: 'error', title: 'Error', message: 'No se pudo registrar el pago del servicio.' });
    } finally {
      setPayingRecurring(false);
    }
  };

  // =========================================================================
  // HANDLERS: PRÉSTAMOS BANCARIOS
  // =========================================================================
  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    const principalNum = parseFloat(newLoanPrincipal);
    const installmentsNum = parseInt(newLoanInstallments, 10);
    const monthlyNum = parseFloat(newLoanMonthlyAmount);

    if (!newLoanTitle.trim() || isNaN(principalNum) || principalNum <= 0 || isNaN(installmentsNum) || installmentsNum < 1 || isNaN(monthlyNum) || monthlyNum <= 0) {
      onNotify({
        type: 'warning',
        title: 'Campos Incompletos',
        message: 'Completa el título, monto prestado, número de cuotas y cuota mensual.',
      });
      return;
    }

    setSavingLoan(true);
    try {
      const res = await fetch('/api/finances/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE',
          bank_name: newLoanBank,
          loan_title: newLoanTitle.trim(),
          total_principal: principalNum,
          total_installments: installmentsNum,
          monthly_installment_amount: monthlyNum,
          interest_rate_tea: newLoanTea ? parseFloat(newLoanTea) : null,
          disbursement_date: newLoanDisbursementDate,
          first_payment_date: newLoanFirstPaymentDate,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onNotify({ type: 'success', title: 'Préstamo Registrado', message: data.message });
        setCreateLoanModalOpen(false);
        setNewLoanTitle('');
        setNewLoanPrincipal('');
        setNewLoanInstallments('');
        setNewLoanMonthlyAmount('');
        setNewLoanTea('');
        fetchBankLoans();
        fetchTransactions();
        fetchCashRegister();
      } else {
        onNotify({ type: 'error', title: 'Error', message: data.message });
      }
    } catch {
      onNotify({ type: 'error', title: 'Error', message: 'No se pudo registrar el préstamo bancario.' });
    } finally {
      setSavingLoan(false);
    }
  };

  const handlePayInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanForPay) return;

    setPayingInstallment(true);
    try {
      const parsedPayAmount = parseFloat(payInstAmount) || Number(selectedLoanForPay.installment.amount);
      const res = await fetch('/api/finances/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'PAY_INSTALLMENT',
          loan_id: selectedLoanForPay.loan.id,
          installment_number: selectedLoanForPay.installment.installment_number,
          paid_date: payInstDate,
          payment_method: payInstMethod,
          receipt_number: payInstReceipt.trim() || null,
          pay_amount: parsedPayAmount,
          funding_source: payInstFundingSource,
          funding_entity_name: payInstFundingSource === 'APORTE_SOCIO' ? (payInstFundingEntityName.trim() || null) : null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onNotify({ type: 'success', title: 'Cuota Pagada', message: data.message });
        setPayInstallmentModalOpen(false);
        setSelectedLoanForPay(null);
        setPayInstReceipt('');
        fetchBankLoans();
        fetchTransactions();
        fetchCashRegister();
      } else {
        onNotify({ type: 'error', title: 'Error', message: data.message });
      }
    } catch {
      onNotify({ type: 'error', title: 'Error', message: 'No se pudo registrar el pago de la cuota.' });
    } finally {
      setPayingInstallment(false);
    }
  };

  const handleUpdateInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstForEdit) return;

    setUpdatingInstallment(true);
    try {
      const res = await fetch('/api/finances/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_INSTALLMENT',
          loan_id: selectedInstForEdit.loanId,
          installment_id: selectedInstForEdit.installment.id,
          amount: parseFloat(editInstAmount),
          due_date: editInstDueDate,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onNotify({ type: 'success', title: 'Cuota Modificada', message: data.message });
        setEditInstallmentModalOpen(false);
        setSelectedInstForEdit(null);
        fetchBankLoans();
      } else {
        onNotify({ type: 'error', title: 'Error', message: data.message });
      }
    } catch {
      onNotify({ type: 'error', title: 'Error', message: 'No se pudo actualizar la cuota.' });
    } finally {
      setUpdatingInstallment(false);
    }
  };

  const handleReprogramLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanForReprogram) return;

    setReprogramming(true);
    try {
      const res = await fetch('/api/finances/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REPROGRAM_LOAN',
          loan_id: selectedLoanForReprogram.id,
          new_remaining_installments: parseInt(reprogramNewInstallments, 10),
          new_installment_amount: parseFloat(reprogramNewAmount),
          first_reprogram_due_date: reprogramFirstDueDate,
          notes: reprogramNotes.trim() || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onNotify({ type: 'success', title: 'Préstamo Reprogramado', message: data.message });
        setReprogramModalOpen(false);
        setSelectedLoanForReprogram(null);
        fetchBankLoans();
        fetchForecast();
      } else {
        onNotify({ type: 'error', title: 'Error', message: data.message });
      }
    } catch {
      onNotify({ type: 'error', title: 'Error', message: 'No se pudo reprogramar el préstamo.' });
    } finally {
      setReprogramming(false);
    }
  };

  const handleCapitalAmortization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanForAmortize) return;

    setAmortizing(true);
    try {
      const res = await fetch('/api/finances/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CAPITAL_AMORTIZATION',
          loan_id: selectedLoanForAmortize.id,
          amount: parseFloat(amortizeAmount),
          payment_date: amortizeDate,
          payment_method: amortizeMethod,
          receipt_number: amortizeReceipt.trim() || null,
          reduction_mode: amortizeMode,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onNotify({ type: 'success', title: 'Amortización Exitosa', message: data.message });
        setAmortizeModalOpen(false);
        setSelectedLoanForAmortize(null);
        fetchBankLoans();
        fetchTransactions();
        fetchCashRegister();
        fetchForecast();
      } else {
        onNotify({ type: 'error', title: 'Error', message: data.message });
      }
    } catch {
      onNotify({ type: 'error', title: 'Error', message: 'No se pudo registrar la amortización.' });
    } finally {
      setAmortizing(false);
    }
  };

  // =========================================================================
  // HANDLERS: CATEGORÍAS FINANCIERAS (CREAR, EDITAR, ELIMINAR)
  // =========================================================================
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      onNotify({ type: 'warning', title: 'Nombre Requerido', message: 'Escribe el nombre de la categoría.' });
      return;
    }

    setSavingCategory(true);
    try {
      const isEditing = Boolean(editingCategory);
      const url = '/api/finances/categories';
      const method = isEditing ? 'PUT' : 'POST';
      const bodyPayload = isEditing
        ? {
            id: editingCategory!.id,
            name: newCatName.trim(),
            type: newCatType,
            description: newCatDescription.trim() || null,
          }
        : {
            name: newCatName.trim(),
            type: newCatType,
            description: newCatDescription.trim() || null,
          };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      const data = await res.json();
      if (data.success) {
        onNotify({
          type: 'success',
          title: isEditing ? 'Categoría Actualizada' : 'Categoría Creada',
          message: data.message,
        });
        setEditingCategory(null);
        setNewCatName('');
        setNewCatDescription('');
        setNewCatType('EXPENSE');
        fetchCategories();
      } else {
        onNotify({ type: 'error', title: 'Error', message: data.message });
      }
    } catch {
      onNotify({ type: 'error', title: 'Error', message: 'No se pudo procesar la categoría.' });
    } finally {
      setSavingCategory(false);
    }
  };

  const handleStartEditCategory = (cat: FinancialCategory) => {
    setEditingCategory(cat);
    setNewCatName(cat.name);
    setNewCatType(cat.type);
    setNewCatDescription(cat.description || '');
  };

  const handleCancelEditCategory = () => {
    setEditingCategory(null);
    setNewCatName('');
    setNewCatDescription('');
    setNewCatType('EXPENSE');
  };

  const handleDeleteCategory = async (cat: FinancialCategory) => {
    try {
      const res = await fetch(`/api/finances/categories?id=${cat.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        onNotify({ type: 'success', title: 'Categoría Eliminada', message: data.message });
        if (editingCategory?.id === cat.id) {
          handleCancelEditCategory();
        }
        fetchCategories();
      } else {
        onNotify({ type: 'error', title: 'Error', message: data.message });
      }
    } catch {
      onNotify({ type: 'error', title: 'Error', message: 'No se pudo eliminar la categoría.' });
    }
  };

  // =========================================================================
  // HANDLERS: PRODUCTOS & INVERSIONES EN LOTES
  // =========================================================================
  const handleCreateProductWithBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(prodQuantity, 10);
    const investment = parseFloat(prodTotalInvestment);
    const price = parseFloat(prodSellingPrice);

    if (!prodName.trim() || isNaN(qty) || qty <= 0 || isNaN(investment) || investment <= 0 || isNaN(price) || price <= 0) {
      onNotify({
        type: 'warning',
        title: 'Campos Incompletos',
        message: 'Por favor ingresa nombre, cantidad, inversión total y precio de venta válidos.',
      });
      return;
    }

    setSavingProduct(true);
    try {
      const partsCount = parseInt(prodPaymentParts, 10) || 1;
      let payment_schedule: { part_number: number; amount: number; due_date: string }[] = [];

      if (partsCount === 1) {
        payment_schedule = [{ part_number: 1, amount: investment, due_date: prodPart1DueDate }];
      } else if (partsCount === 2) {
        const half = Number((investment / 2).toFixed(2));
        payment_schedule = [
          { part_number: 1, amount: half, due_date: prodPart1DueDate },
          { part_number: 2, amount: Number((investment - half).toFixed(2)), due_date: prodPart2DueDate },
        ];
      } else {
        const third = Number((investment / 3).toFixed(2));
        payment_schedule = [
          { part_number: 1, amount: third, due_date: prodPart1DueDate },
          { part_number: 2, amount: third, due_date: prodPart2DueDate },
          { part_number: 3, amount: Number((investment - third * 2).toFixed(2)), due_date: prodPart3DueDate },
        ];
      }

      const res = await fetch('/api/finances/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_PRODUCT_WITH_BATCH',
          name: prodName.trim(),
          category: prodCategory,
          sku: prodSku.trim() || null,
          supplier_name: prodSupplier.trim() || null,
          quantity: qty,
          total_investment: investment,
          selling_price: price,
          target_margin_percent: parseFloat(prodTargetMargin) || 0,
          payment_plan_parts: partsCount,
          payment_schedule,
          pay_first_now: prodPayFirstNow,
          first_payment_method: prodFirstPaymentMethod,
          first_payment_receipt: prodFirstPaymentReceipt.trim() || null,
          funding_source: prodPayFirstNow ? prodFundingSource : null,
          funding_loan_id: (prodPayFirstNow && prodFundingSource === 'PRESTAMO_BANCARIO') ? prodFundingLoanId : null,
          funding_entity_name: (prodPayFirstNow && (prodFundingSource === 'PRESTAMISTA' || prodFundingSource === 'APORTE_SOCIO')) ? prodFundingEntityName.trim() : null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onNotify({ type: 'success', title: 'Producto Registrado', message: data.message });
        setCreateProductModalOpen(false);
        setProdName('');
        setProdSku('');
        setProdSupplier('');
        setProdQuantity('');
        setProdTotalInvestment('');
        setProdSellingPrice('');
        setProdFirstPaymentReceipt('');
        setProdFundingSource('PROPIO');
        setProdFundingLoanId('');
        setProdFundingEntityName('');
        fetchProducts();
        fetchTransactions();
        fetchCashRegister();
        fetchBankLoans();
      } else {
        onNotify({ type: 'error', title: 'Error', message: data.message });
      }
    } catch {
      onNotify({ type: 'error', title: 'Error', message: 'No se pudo registrar el producto e inversión.' });
    } finally {
      setSavingProduct(false);
    }
  };

  const handleRecordSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForSale) return;
    const qty = parseInt(saleQuantity, 10);
    const unitPrice = parseFloat(saleUnitPrice);

    if (isNaN(qty) || qty <= 0 || isNaN(unitPrice) || unitPrice <= 0) {
      onNotify({ type: 'warning', title: 'Datos Inválidos', message: 'Ingresa cantidad y precio unitario válidos.' });
      return;
    }

    if (qty > selectedProductForSale.current_stock) {
      onNotify({
        type: 'warning',
        title: 'Stock Insuficiente',
        message: `Solo quedan ${selectedProductForSale.current_stock} unidades disponibles en almacén.`,
      });
      return;
    }

    setSavingSale(true);
    try {
      const res = await fetch('/api/finances/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RECORD_SALE',
          product_id: selectedProductForSale.id,
          quantity: qty,
          unit_price: unitPrice,
          student_name: saleStudentName.trim() || null,
          buyer_name: saleBuyerName.trim() || null,
          payment_method: salePaymentMethod,
          receipt_number: saleReceiptNumber.trim() || null,
          sale_date: saleDate,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onNotify({ type: 'success', title: 'Venta Registrada', message: data.message });
        setRecordSaleModalOpen(false);
        setSelectedProductForSale(null);
        setSaleQuantity('1');
        setSaleUnitPrice('');
        setSaleStudentName('');
        setSaleBuyerName('');
        setSaleReceiptNumber('');
        fetchProducts();
        fetchTransactions();
        fetchCashRegister();
      } else {
        onNotify({ type: 'error', title: 'Error', message: data.message });
      }
    } catch {
      onNotify({ type: 'error', title: 'Error', message: 'No se pudo procesar la venta.' });
    } finally {
      setSavingSale(false);
    }
  };

  const handlePayBatchPart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchPaymentForPay) return;
    if (payBatchPartFundingSource === 'PRESTAMO_BANCARIO' && !payBatchPartFundingLoanId) {
      onNotify({ type: 'warning', title: 'Préstamo Requerido', message: 'Selecciona el préstamo bancario del cual se extraen los fondos.' });
      return;
    }
    if ((payBatchPartFundingSource === 'PRESTAMISTA' || payBatchPartFundingSource === 'APORTE_SOCIO') && !payBatchPartFundingEntityName.trim()) {
      onNotify({ type: 'warning', title: 'Nombre Requerido', message: 'Ingresa el nombre del prestamista o socio que financió la cuota.' });
      return;
    }

    setPayingBatchPart(true);
    try {
      const res = await fetch('/api/finances/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'PAY_BATCH_PART',
          payment_id: selectedBatchPaymentForPay.payment.id,
          paid_date: payBatchPartDate,
          payment_method: payBatchPartMethod,
          receipt_number: payBatchPartReceipt.trim() || null,
          funding_source: payBatchPartFundingSource,
          funding_loan_id: payBatchPartFundingSource === 'PRESTAMO_BANCARIO' ? payBatchPartFundingLoanId : null,
          funding_entity_name: (payBatchPartFundingSource === 'PRESTAMISTA' || payBatchPartFundingSource === 'APORTE_SOCIO') ? payBatchPartFundingEntityName.trim() : null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onNotify({ type: 'success', title: 'Cuota de Inversión Pagada', message: data.message });
        setPayBatchPartModalOpen(false);
        setSelectedBatchPaymentForPay(null);
        setPayBatchPartReceipt('');
        setPayBatchPartFundingSource('PROPIO');
        setPayBatchPartFundingLoanId('');
        setPayBatchPartFundingEntityName('');
        fetchProducts();
        fetchTransactions();
        fetchCashRegister();
        fetchBankLoans();
      } else {
        onNotify({ type: 'error', title: 'Error', message: data.message });
      }
    } catch {
      onNotify({ type: 'error', title: 'Error', message: 'No se pudo pagar la cuota de inversión.' });
    } finally {
      setPayingBatchPart(false);
    }
  };

  // =========================================================================
  // HANDLERS: TRANSACCIÓN GENERAL
  // =========================================================================
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(formAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      onNotify({ type: 'warning', title: 'Monto Requerido', message: 'Ingresa un monto válido mayor a 0.' });
      return;
    }
    if (!formDescription.trim()) {
      onNotify({ type: 'warning', title: 'Concepto Requerido', message: 'Escribe el concepto del movimiento.' });
      return;
    }

    if (txModalType === 'EXPENSE') {
      if (formFundingSource === 'PRESTAMO_BANCARIO' && !formFundingLoanId) {
        onNotify({
          type: 'warning',
          title: 'Préstamo Requerido',
          message: 'Selecciona de qué préstamo bancario activo provienen los fondos.',
        });
        return;
      }
      if ((formFundingSource === 'PRESTAMISTA' || formFundingSource === 'APORTE_SOCIO') && !formFundingEntityName.trim()) {
        onNotify({
          type: 'warning',
          title: 'Nombre Requerido',
          message:
            formFundingSource === 'APORTE_SOCIO'
              ? 'Indica el nombre del socio o promotor que aporta los fondos.'
              : 'Indica el nombre del prestamista o tercero que facilitó el dinero.',
        });
        return;
      }
    }

    setSavingTx(true);
    try {
      const res = await fetch('/api/finances/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: txModalType,
          amount: amountNum,
          category_id: formCategoryId || null,
          description: formDescription.trim(),
          payment_method: formPaymentMethod,
          receipt_number: formReceiptNumber.trim() || null,
          transaction_date: formDate,
          funding_source: txModalType === 'EXPENSE' ? formFundingSource : null,
          funding_loan_id: txModalType === 'EXPENSE' && formFundingSource === 'PRESTAMO_BANCARIO' ? formFundingLoanId : null,
          funding_entity_name:
            txModalType === 'EXPENSE' && (formFundingSource === 'PRESTAMISTA' || formFundingSource === 'APORTE_SOCIO')
              ? formFundingEntityName.trim()
              : null,
          funding_details: txModalType === 'EXPENSE' ? formFundingDetails.trim() || null : null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onNotify({ type: 'success', title: 'Registrado', message: data.message });
        setTxModalOpen(false);
        setFormFundingSource('PROPIO');
        setFormFundingLoanId('');
        setFormFundingEntityName('');
        setFormFundingDetails('');
        fetchTransactions();
        fetchCashRegister();
        fetchBankLoans();
      } else {
        onNotify({ type: 'error', title: 'Error', message: data.message });
      }
    } catch {
      onNotify({ type: 'error', title: 'Error', message: 'Error al registrar.' });
    } finally {
      setSavingTx(false);
    }
  };

  const handleExportExcel = () => {
    const url = `/api/finances/export?month=${selectedMonth || ''}`;
    window.location.href = url;
    onNotify({ type: 'info', title: 'Descarga Iniciada', message: 'Generando reporte contable para Excel...' });
  };

  return (
    <div className="space-y-6">
      
      {/* ========================================================================= */}
      {/* CABECERA: TÍTULO Y LOS 4 SUBMÓDULOS BIEN DELIMITADOS                      */}
      {/* ========================================================================= */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2fbf71] uppercase tracking-wider mb-1">
            <DollarSign className="w-4 h-4" />
            <span>Pilar Financiero Escolar</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#223a5e] tracking-tight">
            Gestión Financiera del Colegio
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Selecciona un submódulo para administrar tu caja, pensiones, servicios o arqueos diarios.
          </p>
        </div>

        {/* Acciones Globales */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => setCategoriesModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-200"
            title="Administrar categorías de ingresos y gastos"
          >
            <Tag className="w-3.5 h-3.5 text-slate-500" />
            <span>Categorías</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-emerald-200"
            title="Descargar libro de operaciones para Excel"
          >
            <Download className="w-3.5 h-3.5 text-[#2fbf71]" />
            <span>Exportar Excel</span>
          </button>

          <button
            onClick={() => {
              fetchForecast();
              setForecastModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-blue-200"
            title="Ver simulador y punto de equilibrio a 30 días"
          >
            <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
            <span>Previsión 30D</span>
          </button>

          <button
            onClick={() => {
              fetchMonthlyReport(selectedMonth || currentMonthStr);
              setMonthlyReportModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-purple-200"
            title="Ver análisis mensual: Lo Producido vs Lo Invertido (del 1° al último día del mes)"
          >
            <BarChart3 className="w-3.5 h-3.5 text-purple-700" />
            <span>Análisis Mensual</span>
          </button>

          <button
            onClick={() => {
              setTxModalType('INCOME');
              setFormAmount('');
              setFormDescription('');
              setFormReceiptNumber('');
              setFormCategoryId('');
              setFormDate(new Date().toISOString().split('T')[0]);
              setFormFundingSource('PROPIO');
              setFormFundingLoanId('');
              setFormFundingEntityName('');
              setFormFundingDetails('');
              setTxModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-[#2fbf71] hover:bg-[#26995b] text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>+ Ingreso</span>
          </button>

          <button
            onClick={() => {
              setTxModalType('EXPENSE');
              setFormAmount('');
              setFormDescription('');
              setFormReceiptNumber('');
              setFormCategoryId('');
              setFormDate(new Date().toISOString().split('T')[0]);
              const isPropioBlocked = Boolean(metrics.fundsSummary?.propio?.isBlocked);
              const activeLoanWithBal = bankLoans.find(
                (l) => l.status === 'ACTIVE' && (Number(l.available_balance ?? l.total_principal) > 0)
              );
              let defaultSource: FundingSourceType = 'PROPIO';
              let defaultLoanId = '';
              if (isPropioBlocked) {
                if (activeLoanWithBal) {
                  defaultSource = 'PRESTAMO_BANCARIO';
                  defaultLoanId = activeLoanWithBal.id;
                } else {
                  defaultSource = 'APORTE_SOCIO';
                }
              }
              setFormFundingSource(defaultSource);
              setFormFundingLoanId(defaultLoanId);
              setFormFundingEntityName('');
              setFormFundingDetails('');
              setTxModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>- Gasto</span>
          </button>

          <button
            onClick={() => {
              fetchTransactions();
              fetchTuitions();
              fetchCashRegister();
              fetchRecurringExpenses();
              fetchBankLoans();
              fetchProducts();
            }}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            title="Refrescar"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#2fbf71]' : ''}`} />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BARRA DE ESTADO RÁPIDO DE CAJA DE VENTANILLA (ACCESO PERMANENTE)         */}
      {/* ========================================================================= */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${activeShift ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
            <Wallet className="w-5 h-5 text-[#2fbf71]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${activeShift ? 'bg-[#2fbf71] animate-pulse' : 'bg-slate-400'}`} />
              <span className="text-xs font-bold text-[#223a5e]">
                {activeShift ? `Caja de Ventanilla Abierta (${activeShift.opened_by_name})` : 'Caja de Ventanilla Cerrada'}
              </span>
              {activeShift && (
                <span className="text-[10px] text-slate-400 font-mono">
                  &bull; Apertura: {new Date(activeShift.opened_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {activeShift ? (
                <>
                  Efectivo disponible en gaveta:{' '}
                  <strong className="font-mono text-[#26995b] font-black">{formatSoles(activeShift.expected_cash)}</strong>{' '}
                  <span className="text-slate-400 font-normal">
                    (Base: {formatSoles(activeShift.opening_balance)} | Cobros: +{formatSoles(activeShift.cash_income)} | Salidas: -{formatSoles(activeShift.cash_expense)})
                  </span>
                </>
              ) : (
                'No hay turno de ventanilla abierto para hoy. Abre caja para registrar cobranzas físicas en efectivo con arqueo diario.'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          {!activeShift ? (
            <button
              onClick={() => {
                if (lastClosedCash > 0) {
                  setOpenShiftBalance(lastClosedCash.toFixed(2));
                }
                setOpenShiftModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-[#2fbf71] hover:bg-[#26995b] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Abrir Turno de Caja</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setCountedActualCash(String(activeShift.expected_cash || '0'));
                setClosureNotes('');
                setCloseShiftModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Arqueo & Cerrar Caja</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SELECTOR DE SUBMÓDULOS (5 TARJETAS/BOTONES LIMPIOS)                       */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <button
          onClick={() => handleSelectSubmodule('cashflow')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-center gap-3 ${
            currentSubmodule === 'cashflow'
              ? 'bg-[#223a5e] text-white border-[#223a5e] shadow-md shadow-[#223a5e]/20'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className={`p-2 rounded-xl shrink-0 ${currentSubmodule === 'cashflow' ? 'bg-white/10 text-[#2fbf71]' : 'bg-[#e6f9ef] text-[#2fbf71]'}`}>
            <DollarSign className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold truncate">1. Flujo & Caja</p>
            <p className={`text-[10px] truncate ${currentSubmodule === 'cashflow' ? 'text-slate-300' : 'text-slate-400'}`}>
              Balance y movimientos
            </p>
          </div>
        </button>

        <button
          onClick={() => handleSelectSubmodule('tuitions')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-center gap-3 ${
            currentSubmodule === 'tuitions'
              ? 'bg-[#223a5e] text-white border-[#223a5e] shadow-md shadow-[#223a5e]/20'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className={`p-2 rounded-xl shrink-0 ${currentSubmodule === 'tuitions' ? 'bg-white/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
            <Receipt className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-bold truncate">2. Caja & Cobranzas</p>
              {tuitionMetrics.overdueCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              )}
            </div>
            <p className={`text-[10px] truncate ${currentSubmodule === 'tuitions' ? 'text-slate-300' : 'text-slate-400'}`}>
              Estado de cuenta y recibos
            </p>
          </div>
        </button>

        <button
          onClick={() => handleSelectSubmodule('products')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-center gap-3 ${
            currentSubmodule === 'products'
              ? 'bg-[#223a5e] text-white border-[#223a5e] shadow-md shadow-[#223a5e]/20'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className={`p-2 rounded-xl shrink-0 ${currentSubmodule === 'products' ? 'bg-white/10 text-cyan-400' : 'bg-cyan-50 text-cyan-600'}`}>
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-bold truncate">3. Productos</p>
              {productsMetrics.totalStockAvailable > 0 && (
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-cyan-100 text-cyan-800">
                  {productsMetrics.totalStockAvailable}
                </span>
              )}
            </div>
            <p className={`text-[10px] truncate ${currentSubmodule === 'products' ? 'text-slate-300' : 'text-slate-400'}`}>
              Uniformes, libros y lotes
            </p>
          </div>
        </button>

        <button
          onClick={() => handleSelectSubmodule('obligations')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-center gap-3 ${
            currentSubmodule === 'obligations'
              ? 'bg-[#223a5e] text-white border-[#223a5e] shadow-md shadow-[#223a5e]/20'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className={`p-2 rounded-xl shrink-0 ${currentSubmodule === 'obligations' ? 'bg-white/10 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
            <Landmark className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold truncate">4. Fijos & Préstamos</p>
            <p className={`text-[10px] truncate ${currentSubmodule === 'obligations' ? 'text-slate-300' : 'text-slate-400'}`}>
              Luz, agua y banco
            </p>
          </div>
        </button>

        <button
          onClick={() => handleSelectSubmodule('shifts')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-center gap-3 ${
            currentSubmodule === 'shifts'
              ? 'bg-[#223a5e] text-white border-[#223a5e] shadow-md shadow-[#223a5e]/20'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className={`p-2 rounded-xl shrink-0 ${currentSubmodule === 'shifts' ? 'bg-white/10 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
            <Wallet className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-bold truncate">5. Arqueo de Caja</p>
              {activeShift && <span className="w-2 h-2 rounded-full bg-[#2fbf71] animate-pulse shrink-0" />}
            </div>
            <p className={`text-[10px] truncate ${currentSubmodule === 'shifts' ? 'text-slate-300' : 'text-slate-400'}`}>
              Efectivo y cuadre diario
            </p>
          </div>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUBMÓDULO 1: FLUJO DE CAJA & MOVIMIENTOS                                  */}
      {/* ========================================================================= */}
      {currentSubmodule === 'cashflow' && (
        <div className="space-y-6">
          {/* Tarjetas Métricas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase">
                  <ArrowDownLeft className="w-4 h-4 text-[#2fbf71]" />
                  <span>Lo Producido (Ingresos)</span>
                </div>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">Producción</span>
              </div>
              <p className="text-2xl font-black text-[#26995b] mt-1 font-mono">
                {formatSoles(metrics.totalProduced !== undefined ? metrics.totalProduced : metrics.totalIncome)}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Matrículas, pensiones, ventas y cuotas de ingreso</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase">
                    <ArrowUpRight className="w-4 h-4 text-rose-500" />
                    <span>Lo Invertido y Gastado</span>
                  </div>
                  <span className="text-[10px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full font-bold">Desembolsos</span>
                </div>
                <p className="text-2xl font-black text-rose-600 mt-1 font-mono">{formatSoles(metrics.totalExpense)}</p>
                <p className="text-xs text-slate-500 mt-0.5">Lotes de mercadería, sueldos, servicios y deuda</p>
              </div>

              {/* Desglose visual directo: ¿De dónde salió el dinero para pagar? */}
              {metrics.expensesByFunding && (
                <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    ¿De dónde se pagó este dinero?:
                  </span>
                  <div className="flex flex-wrap gap-1.5 text-[10.5px]">
                    {metrics.expensesByFunding.propio > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium font-mono inline-flex items-center gap-1">
                        <span>🏫</span> Caja Propia: <strong>{formatSoles(metrics.expensesByFunding.propio)}</strong>
                      </span>
                    )}
                    {metrics.expensesByFunding.aporte_socio > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 font-medium font-mono inline-flex items-center gap-1">
                        <span>💼</span> Aporte Socio: <strong>{formatSoles(metrics.expensesByFunding.aporte_socio)}</strong>
                      </span>
                    )}
                    {metrics.expensesByFunding.prestamo_bancario > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200 font-medium font-mono inline-flex items-center gap-1">
                        <span>🏦</span> Préstamo: <strong>{formatSoles(metrics.expensesByFunding.prestamo_bancario)}</strong>
                      </span>
                    )}
                    {metrics.expensesByFunding.prestamista > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-medium font-mono inline-flex items-center gap-1">
                        <span>🤝</span> Prestamista: <strong>{formatSoles(metrics.expensesByFunding.prestamista)}</strong>
                      </span>
                    )}
                    {metrics.expensesByFunding.otro > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-50 text-slate-700 border border-slate-200 font-medium font-mono inline-flex items-center gap-1">
                        <span>📁</span> Otro: <strong>{formatSoles(metrics.expensesByFunding.otro)}</strong>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                {(() => {
                  const opBal = metrics.operatingBalance !== undefined ? metrics.operatingBalance : metrics.netBalance;
                  const isSurplus = opBal >= 0;
                  return (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase">
                          <Wallet className="w-4 h-4 text-[#223a5e]" />
                          <span>Resultado Operativo Real</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${isSurplus ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                          {isSurplus ? 'Superávit Operativo' : 'Déficit Operativo'}
                        </span>
                      </div>
                      <p className={`text-2xl font-black mt-1 font-mono ${isSurplus ? 'text-[#223a5e]' : 'text-rose-600'}`}>
                        {formatSoles(opBal)}
                      </p>
                      
                      <div className="mt-2 space-y-1">
                        {metrics.totalPartnerContributions !== undefined && metrics.totalPartnerContributions > 0 && (
                          <div className="p-1 px-1.5 rounded-md bg-blue-50 text-[10.5px] text-blue-900 border border-blue-200 flex justify-between font-mono">
                            <span className="font-sans font-medium text-blue-700 flex items-center gap-1">💼 Aporte Socios (Capital):</span>
                            <strong>+{formatSoles(metrics.totalPartnerContributions)}</strong>
                          </div>
                        )}
                        {metrics.totalLoansReceived !== undefined && metrics.totalLoansReceived > 0 && (
                          <div className="p-1 px-1.5 rounded-md bg-purple-50 text-[10.5px] text-purple-900 border border-purple-200 flex justify-between font-mono">
                            <span className="font-sans font-medium text-purple-700 flex items-center gap-1">🏦 Préstamo Bancario (Deuda):</span>
                            <strong>+{formatSoles(metrics.totalLoansReceived)}</strong>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
              <button
                type="button"
                onClick={() => {
                  fetchMonthlyReport(selectedMonth || currentMonthStr);
                  setMonthlyReportModalOpen(true);
                }}
                className="mt-2 text-[11px] font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer transition text-left"
              >
                <span>Ver Análisis de Rendimiento (1° al Fin de Mes)</span>
                <span>&rarr;</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* BLOQUE DE CONTROL: DISPONIBILIDAD DE FONDOS POR CAJA Y ORIGEN DE DINERO  */}
          {/* ========================================================================= */}
          {metrics.fundsSummary && (
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-[#223a5e] text-white shadow-xs">
                    <Landmark className="w-5 h-5 text-[#2fbf71]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-[#223a5e] tracking-tight">
                        Disponibilidad de Fondos por Origen (Control de Cajas)
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 uppercase">
                        Auditoría de Liquidez
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Visualiza de dónde proviene el dinero, cuánto ingresó, cuánto se ha gastado y cuánto saldo real queda disponible en cada caja o fuente.
                    </p>
                  </div>
                </div>

                {metrics.fundsSummary.propio.isBlocked && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Caja Propia Bloqueada para Gastos (S/ 0.00 recaudado)</span>
                  </div>
                )}
              </div>

              {/* Grid de 4 Cajas / Fuentes */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. CAJA PROPIA (Recaudación Escolar) */}
                <div className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                  metrics.fundsSummary.propio.isBlocked
                    ? 'bg-slate-50/70 border-slate-200 text-slate-700'
                    : 'bg-emerald-50/30 border-emerald-200 text-[#223a5e]'
                }`}>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🏫</span>
                        <div>
                          <strong className="block text-xs font-black text-[#223a5e]">Caja Propia</strong>
                          <span className="text-[10px] text-slate-400">Recaudación del colegio</span>
                        </div>
                      </div>
                      {metrics.fundsSummary.propio.isBlocked ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Bloqueada
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Con Saldo
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 py-2 border-y border-slate-200/60 text-xs font-mono">
                      <div className="flex justify-between items-center">
                        <span className="font-sans text-[11px] text-slate-500">¿Cuánto dinero hay?:</span>
                        <strong className="text-[#26995b] font-bold">
                          {formatSoles(metrics.fundsSummary.propio.totalProduced)}
                        </strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-sans text-[11px] text-slate-500">¿Cuánto se ha usado?:</span>
                        <strong className="text-rose-600 font-bold">
                          {formatSoles(metrics.fundsSummary.propio.totalSpent)}
                        </strong>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-dashed border-slate-200 font-bold">
                        <span className="font-sans text-[11px] text-[#223a5e]">¿Cuánto queda?:</span>
                        <span className={`text-sm ${
                          metrics.fundsSummary.propio.availableBalance > 0 ? 'text-[#26995b]' : 'text-slate-400'
                        }`}>
                          {formatSoles(metrics.fundsSummary.propio.availableBalance)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 mt-2 leading-tight">
                    {metrics.fundsSummary.propio.isBlocked
                      ? '🔒 No hay ingresos recaudados (pensiones o matrículas). Los gastos con Caja Propia están bloqueados.'
                      : '✓ Disponible para cubrir sueldos, servicios fijos y compras escolares.'}
                  </p>
                </div>

                {/* 2. PRÉSTAMOS BANCARIOS */}
                <div className="p-4 rounded-2xl border bg-purple-50/30 border-purple-200 text-[#223a5e] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🏦</span>
                        <div>
                          <strong className="block text-xs font-black text-[#223a5e]">Préstamos Bancarios</strong>
                          <span className="text-[10px] text-purple-700">Créditos institucionales</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-purple-100 text-purple-800 border border-purple-200">
                        {metrics.fundsSummary.bankLoans.length} Crédito(s)
                      </span>
                    </div>

                    <div className="space-y-2 py-2 border-y border-purple-200/60 text-xs font-mono">
                      <div className="flex justify-between items-center">
                        <span className="font-sans text-[11px] text-slate-500">¿Cuánto dinero hay?:</span>
                        <strong className="text-purple-900 font-bold">
                          {formatSoles(metrics.fundsSummary.totalBankLoans.totalPrincipal)}
                        </strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-sans text-[11px] text-slate-500">¿Cuánto se ha usado?:</span>
                        <strong className="text-rose-600 font-bold">
                          {formatSoles(metrics.fundsSummary.totalBankLoans.totalSpent)}
                        </strong>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-dashed border-purple-200 font-bold">
                        <span className="font-sans text-[11px] text-[#223a5e]">¿Cuánto queda?:</span>
                        <span className="text-sm text-purple-900">
                          {formatSoles(metrics.fundsSummary.totalBankLoans.totalAvailable)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 space-y-1">
                    {metrics.fundsSummary.bankLoans.map((loan) => (
                      <div key={loan.id} className="p-1.5 rounded-lg bg-white/80 border border-purple-100 text-[10px] flex items-center justify-between">
                        <span className="font-bold text-purple-900 truncate max-w-[120px]">{loan.bank_name}</span>
                        <span className="font-mono text-slate-600">Disp: <strong className="text-purple-800">{formatSoles(loan.available_balance)}</strong></span>
                      </div>
                    ))}
                    {metrics.fundsSummary.bankLoans.length === 0 && (
                      <p className="text-[10px] text-slate-400">Sin préstamos activos registrados.</p>
                    )}
                  </div>
                </div>

                {/* 3. APORTES DE SOCIOS / PROMOTORES */}
                <div className="p-4 rounded-2xl border bg-blue-50/30 border-blue-200 text-[#223a5e] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">💼</span>
                        <div>
                          <strong className="block text-xs font-black text-[#223a5e]">Aportes de Socios</strong>
                          <span className="text-[10px] text-blue-700">Capital de promotores</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-100 text-blue-800 border border-blue-200">
                        {metrics.fundsSummary.partners.totalContributed > 0 ? 'Activo' : 'S/ 0.00'}
                      </span>
                    </div>

                    <div className="space-y-2 py-2 border-y border-blue-200/60 text-xs font-mono">
                      <div className="flex justify-between items-center">
                        <span className="font-sans text-[11px] text-slate-500">¿Cuánto dinero hay?:</span>
                        <strong className="text-blue-900 font-bold">
                          {formatSoles(metrics.fundsSummary.partners.totalContributed)}
                        </strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-sans text-[11px] text-slate-500">¿Cuánto se ha usado?:</span>
                        <strong className="text-rose-600 font-bold">
                          {formatSoles(metrics.fundsSummary.partners.totalSpent)}
                        </strong>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-dashed border-blue-200 font-bold">
                        <span className="font-sans text-[11px] text-[#223a5e]">¿Cuánto queda?:</span>
                        <span className="text-sm text-blue-900">
                          {formatSoles(metrics.fundsSummary.partners.availableBalance)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 mt-2 leading-tight">
                    Inyecciones directas de los fundadores para inversión inicial o contingencias.
                  </p>
                </div>

                {/* 4. PRESTAMISTAS / TERCEROS */}
                <div className="p-4 rounded-2xl border bg-amber-50/30 border-amber-200 text-[#223a5e] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🤝</span>
                        <div>
                          <strong className="block text-xs font-black text-[#223a5e]">Prestamistas</strong>
                          <span className="text-[10px] text-amber-700">Terceros particulares</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200">
                        {metrics.fundsSummary.lenders.totalBorrowed > 0 ? 'Activo' : 'S/ 0.00'}
                      </span>
                    </div>

                    <div className="space-y-2 py-2 border-y border-amber-200/60 text-xs font-mono">
                      <div className="flex justify-between items-center">
                        <span className="font-sans text-[11px] text-slate-500">¿Cuánto dinero hay?:</span>
                        <strong className="text-amber-900 font-bold">
                          {formatSoles(metrics.fundsSummary.lenders.totalBorrowed)}
                        </strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-sans text-[11px] text-slate-500">¿Cuánto se ha usado?:</span>
                        <strong className="text-rose-600 font-bold">
                          {formatSoles(metrics.fundsSummary.lenders.totalSpent)}
                        </strong>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-dashed border-amber-200 font-bold">
                        <span className="font-sans text-[11px] text-[#223a5e]">¿Cuánto queda?:</span>
                        <span className="text-sm text-amber-900">
                          {formatSoles(metrics.fundsSummary.lenders.availableBalance)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 mt-2 leading-tight">
                    Financiamiento privado externo sustentado con pagarés o contratos de mutuo.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Filtros Compactos */}
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#2fbf71]"
              />
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setSelectedType('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${selectedType === 'ALL' ? 'bg-white text-[#223a5e] shadow-xs' : 'text-slate-500'}`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setSelectedType('INCOME')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${selectedType === 'INCOME' ? 'bg-[#2fbf71] text-white' : 'text-slate-500'}`}
                >
                  Ingresos
                </button>
                <button
                  onClick={() => setSelectedType('EXPENSE')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${selectedType === 'EXPENSE' ? 'bg-rose-600 text-white' : 'text-slate-500'}`}
                >
                  Gastos
                </button>
              </div>
            </div>

            <div className="relative max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar concepto o recibo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#2fbf71]"
              />
            </div>
          </div>

          {/* Tabla Compacta que Ajusta 100% al Ancho */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xs font-bold text-[#223a5e] uppercase tracking-wider">Libro Diario de Transacciones</h3>
              <span className="text-xs text-slate-400">{transactions.length} registros</span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#2fbf71]" />
                <p className="text-xs font-semibold text-slate-500">Cargando movimientos financieros...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="py-12 text-center space-y-1">
                <p className="text-xs font-bold text-slate-600">No hay movimientos registrados en este periodo</p>
                <p className="text-[11px] text-slate-400">Utiliza los botones de arriba para ingresar operaciones.</p>
              </div>
            ) : (
              <div className="w-full">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/75 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-4 w-32">Fecha / Recibo</th>
                      <th className="py-2.5 px-4">Concepto & Categoría</th>
                      <th className="py-2.5 px-4 text-right w-36">Monto</th>
                      <th className="py-2.5 px-3 text-center w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedTransactions.map((tx) => {
                      const isIncome = tx.type === 'INCOME';
                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-bold text-slate-700 font-mono text-[11px]">
                              {formatDisplayDate(tx.transaction_date)}
                            </span>
                            <p className="text-[10px] text-slate-400 font-mono">{tx.receipt_number || 'S/N'}</p>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-bold text-[#223a5e] leading-snug line-clamp-1" title={tx.description}>
                              {tx.description}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="text-[10px] text-slate-500 font-medium">
                                {tx.category_name || 'General'}
                              </span>
                              <span className="text-slate-300">&bull;</span>
                              <span className="text-[10px] text-slate-400 font-mono uppercase">{tx.payment_method}</span>
                              {!isIncome && (
                                <>
                                  <span className="text-slate-300">&bull;</span>
                                  {(() => {
                                    const src = (tx.funding_source as string) || '';
                                    const isSocio = src === 'APORTE_SOCIO' || src === 'SOCIO';
                                    const isLoan = src === 'PRESTAMO_BANCARIO' || src === 'PRESTAMO';
                                    const isLender = src === 'PRESTAMISTA';
                                    const isOtro = src === 'OTRO';

                                    if (isSocio) {
                                      return (
                                        <span className="text-[10px] px-2 py-0.5 rounded-md font-bold inline-flex items-center gap-1 bg-blue-50 text-blue-800 border border-blue-200">
                                          <span>💼</span> Financiado con: Aporte de Socio ({tx.funding_entity_name || 'Promotor'})
                                        </span>
                                      );
                                    }
                                    if (isLoan) {
                                      return (
                                        <span className="text-[10px] px-2 py-0.5 rounded-md font-bold inline-flex items-center gap-1 bg-purple-50 text-purple-800 border border-purple-200">
                                          <span>🏦</span> Financiado con: Préstamo Bancario
                                        </span>
                                      );
                                    }
                                    if (isLender) {
                                      return (
                                        <span className="text-[10px] px-2 py-0.5 rounded-md font-bold inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200">
                                          <span>🤝</span> Financiado con: Prestamista ({tx.funding_entity_name || 'Tercero'})
                                        </span>
                                      );
                                    }
                                    if (isOtro) {
                                      return (
                                        <span className="text-[10px] px-2 py-0.5 rounded-md font-bold inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200">
                                          <span>📁</span> Financiado con: {tx.funding_details || 'Otro'}
                                        </span>
                                      );
                                    }
                                    return (
                                      <span className="text-[10px] px-2 py-0.5 rounded-md font-bold inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200">
                                        <span>🏫</span> Financiado con: Caja Propia (Recaudación escolar)
                                      </span>
                                    );
                                  })()}
                                </>
                              )}
                              {isIncome && (
                                <>
                                  <span className="text-slate-300">&bull;</span>
                                  {(() => {
                                    const desc = (tx.description || '').toLowerCase();
                                    const src = (tx.funding_source as string) || '';
                                    const isSocio = src === 'APORTE_SOCIO' || src === 'SOCIO' || desc.includes('aporte');
                                    const isLoan = tx.id.startsWith('tx-disb') || desc.includes('desembolso') || desc.includes('préstamo');
                                    const isLender = src === 'PRESTAMISTA' || desc.includes('prestamista');

                                    if (isSocio) {
                                      return (
                                        <span className="text-[10px] px-2 py-0.5 rounded-md font-bold inline-flex items-center gap-1 bg-blue-50 text-blue-800 border border-blue-200">
                                          <span>💼</span> Inyección de Capital de Socio ({tx.funding_entity_name || 'Promotor'})
                                        </span>
                                      );
                                    }
                                    if (isLoan) {
                                      return (
                                        <span className="text-[10px] px-2 py-0.5 rounded-md font-bold inline-flex items-center gap-1 bg-purple-50 text-purple-800 border border-purple-200">
                                          <span>🏦</span> Desembolso de Préstamo Bancario (Pasivo)
                                        </span>
                                      );
                                    }
                                    if (isLender) {
                                      return (
                                        <span className="text-[10px] px-2 py-0.5 rounded-md font-bold inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200">
                                          <span>🤝</span> Financiamiento de Prestamista
                                        </span>
                                      );
                                    }
                                    return (
                                      <span className="text-[10px] px-2 py-0.5 rounded-md font-bold inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200">
                                        <span>🏫</span> Ingreso Operativo (Producción del Colegio)
                                      </span>
                                    );
                                  })()}
                                </>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <span className={`font-mono font-black text-sm ${isIncome ? 'text-[#26995b]' : 'text-rose-600'}`}>
                              {isIncome ? '+' : '-'} {formatSoles(tx.amount)}
                            </span>
                            <p className={`text-[9px] font-bold uppercase ${isIncome ? 'text-[#26995b]' : 'text-rose-500'}`}>
                              {isIncome ? 'Ingreso' : 'Gasto'}
                            </p>
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <button
                              onClick={() => setConfirmDeleteModal({ isOpen: true, itemType: 'transaction', transaction: tx })}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              title="Anular"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <Pagination
                  currentPage={txPage}
                  totalItems={transactions.length}
                  itemsPerPage={txPageSize}
                  onPageChange={setTxPage}
                  onItemsPerPageChange={(size) => {
                    setTxPageSize(size);
                    setTxPage(1);
                  }}
                  itemsPerPageOptions={[10, 15, 25, 50]}
                  labelSingular="movimiento"
                  labelPlural="movimientos"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBMÓDULO 2: MOROSIDAD & PENSIONES DE ALUMNOS                             */}
      {/* ========================================================================= */}
      {currentSubmodule === 'tuitions' && (
        <div className="space-y-6">
          {/* Sub-navegación entre Caja & Estado de Cuenta vs Padrón Mensual */}
          <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 rounded-2xl max-w-fit">
            <button
              type="button"
              onClick={() => setTuitionViewMode('statement')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                tuitionViewMode === 'statement'
                  ? 'bg-[#223a5e] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Receipt className="w-4 h-4 text-[#2fbf71]" />
              <span>Caja & Estado de Cuenta por Alumno</span>
            </button>
            <button
              type="button"
              onClick={() => setTuitionViewMode('roster')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                tuitionViewMode === 'roster'
                  ? 'bg-[#223a5e] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Users className="w-4 h-4 text-emerald-500" />
              <span>Padrón Mensual & Semáforo</span>
              {tuitionMetrics.overdueCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500" />
              )}
            </button>
          </div>

          {tuitionViewMode === 'statement' ? (
            <StudentAccountStatementView
              initialStudentId={statementSelectedStudentId}
              onNotify={onNotify}
              availablePaymentMethods={availablePaymentMethods}
              onPaymentSuccess={() => {
                fetchTuitions();
                fetchTransactions();
                fetchCashRegister();
              }}
            />
          ) : (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#26995b] border border-emerald-200 font-bold text-[10px] uppercase flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Padrón Oficial por Matrícula
                    </span>
                  </div>
                  <h3 className="text-base font-black text-[#223a5e]">Control de Pensiones & Semáforo de Morosidad</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Cronograma de mensualidades escolares generado automáticamente desde las matrículas activas del Pilar Administrativo.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-600">Mes:</span>
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="bg-transparent text-xs font-bold text-[#223a5e] focus:outline-none cursor-pointer"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchTuitions()}
                    disabled={loadingTuitions}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                    title="Actualizar padrón de mensualidades"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingTuitions ? 'animate-spin text-[#2fbf71]' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Tarjetas del Semáforo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 shadow-xs">
                  <div className="flex justify-between items-center text-xs font-bold text-[#26995b] uppercase">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#2fbf71]" />
                      Al Día (Pagado)
                    </span>
                    <span>{tuitionMetrics.paidCount} alumnos</span>
                  </div>
                  <p className="text-2xl font-black text-[#26995b] mt-1 font-mono">{formatSoles(tuitionMetrics.totalCollected)}</p>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 shadow-xs">
                  <div className="flex justify-between items-center text-xs font-bold text-amber-700 uppercase">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      Por Vencer
                    </span>
                    <span>{tuitionMetrics.pendingCount} alumnos</span>
                  </div>
                  <p className="text-2xl font-black text-amber-700 mt-1 font-mono">
                    {formatSoles(tuitionMetrics.pendingAmount)}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200 shadow-xs">
                  <div className="flex justify-between items-center text-xs font-bold text-rose-700 uppercase">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
                      Morosos (Vencidos)
                    </span>
                    <span>{tuitionMetrics.overdueCount} alumnos</span>
                  </div>
                  <p className="text-2xl font-black text-rose-600 mt-1 font-mono">
                    {formatSoles(tuitionMetrics.overdueAmount)}
                  </p>
                </div>
              </div>

              {/* Filtros Rápidos */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl max-w-md">
                <button
                  onClick={() => setTuitionStatusFilter('ALL')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${tuitionStatusFilter === 'ALL' ? 'bg-white text-[#223a5e] shadow-xs' : 'text-slate-500'}`}
                >
                  Todos ({tuitions.length})
                </button>
                <button
                  onClick={() => setTuitionStatusFilter('OVERDUE')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${tuitionStatusFilter === 'OVERDUE' ? 'bg-rose-600 text-white' : 'text-slate-500'}`}
                >
                  Morosos
                </button>
                <button
                  onClick={() => setTuitionStatusFilter('PENDING')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${tuitionStatusFilter === 'PENDING' ? 'bg-amber-500 text-white' : 'text-slate-500'}`}
                >
                  Por Vencer
                </button>
                <button
                  onClick={() => setTuitionStatusFilter('PAID')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${tuitionStatusFilter === 'PAID' ? 'bg-[#2fbf71] text-white' : 'text-slate-500'}`}
                >
                  Al Día
                </button>
              </div>

              {/* Tabla Compacta de Cobranza */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                {loadingTuitions ? (
                  <div className="p-12 text-center text-slate-400 space-y-3">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#2fbf71]" />
                    <p className="text-xs font-semibold text-slate-500">Cargando padrón de pensiones escolares...</p>
                  </div>
                ) : tuitions.length === 0 ? (
                  <div className="py-14 text-center space-y-2">
                    <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                      <Users className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-700">No hay mensualidades registradas para el periodo {selectedMonth}</p>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                      Las cuotas y mensualidades escolares se programan automáticamente según las reglas de cobro al matricular estudiantes desde el Pilar Administrativo.
                    </p>
                  </div>
                ) : (
                  <div className="w-full">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/75 text-slate-400 font-bold uppercase text-[10px]">
                          <th className="py-2.5 px-4 w-32">Estado</th>
                          <th className="py-2.5 px-4">Estudiante & Grado</th>
                          <th className="py-2.5 px-4">Apoderado & Contacto</th>
                          <th className="py-2.5 px-4 text-right w-56">Monto & Cobranza</th>
                          <th className="py-2.5 px-3 text-center w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedTuitions.map((t) => {
                          const isPaid = t.status === 'PAID';
                          const isOverdue = t.status === 'OVERDUE';
                          return (
                            <tr key={t.id} className="hover:bg-slate-50/80 transition">
                              <td className="py-3 px-4 whitespace-nowrap">
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  isPaid ? 'bg-[#e6f9ef] text-[#26995b]' : isOverdue ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${isPaid ? 'bg-[#2fbf71]' : isOverdue ? 'bg-rose-600' : 'bg-amber-400'}`} />
                                  <span>{isPaid ? 'Al Día' : isOverdue ? 'Moroso' : 'Pendiente'}</span>
                                </span>
                                <p className="text-[10px] text-slate-500 font-mono mt-0.5">Vence: {formatDisplayDate(t.due_date)}</p>
                              </td>
                              <td className="py-3 px-4">
                                <p className="font-bold text-[#223a5e] leading-snug">{t.student_name}</p>
                                <p className="text-[11px] text-slate-500">{t.grade_section}</p>
                              </td>
                              <td className="py-3 px-4">
                                <p className="text-xs font-semibold text-slate-700">{t.parent_name}</p>
                                <p className="font-mono text-[11px] text-slate-400">{t.parent_phone}</p>
                              </td>
                              <td className="py-3 px-4 text-right whitespace-nowrap">
                                <p className="font-mono font-black text-sm text-[#223a5e]">{formatSoles(t.monthly_amount)}</p>
                                <div className="flex items-center justify-end gap-1.5 mt-1">
                                  <button
                                    onClick={() => {
                                      setStatementSelectedStudentId(t.student_id || null);
                                      setTuitionViewMode('statement');
                                    }}
                                    className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] transition flex items-center gap-1 cursor-pointer"
                                    title="Ver Estado de Cuenta Completo"
                                  >
                                    <Receipt className="w-3 h-3 text-[#223a5e]" />
                                    <span>Estado Cta.</span>
                                  </button>
                                  {!isPaid ? (
                                    <>
                                      <button
                                        onClick={() => handleSendWhatsAppReminder(t)}
                                        className="px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#26995b] border border-emerald-300 font-bold text-[10px] transition flex items-center gap-1 cursor-pointer"
                                        title="Enviar recordatorio WhatsApp"
                                      >
                                        <MessageCircle className="w-3 h-3 text-[#2fbf71]" />
                                        <span>WhatsApp</span>
                                      </button>
                                      <button
                                        onClick={() => handleOpenPayTuition(t)}
                                        className="px-2.5 py-0.5 rounded-lg bg-[#2fbf71] hover:bg-[#26995b] text-white font-bold text-[10px] transition cursor-pointer"
                                      >
                                        Cobrar
                                      </button>
                                    </>
                                  ) : (
                                    <span className="text-[10px] text-[#26995b] font-bold">Pagado &bull; {formatDisplayDate(t.paid_date)}</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-center whitespace-nowrap">
                                {isPaid ? (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteModal({ isOpen: true, itemType: 'tuition', tuition: t })}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                                    title="Anular cobro de pensión y revertir en caja"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <span className="text-slate-300 text-xs font-mono">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <Pagination
                      currentPage={tuitionPage}
                      totalItems={tuitions.length}
                      itemsPerPage={tuitionPageSize}
                      onPageChange={setTuitionPage}
                      onItemsPerPageChange={(size) => {
                        setTuitionPageSize(size);
                        setTuitionPage(1);
                      }}
                      itemsPerPageOptions={[10, 15, 25, 50]}
                      labelSingular="pensión"
                      labelPlural="pensiones"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBMÓDULO 3: PRODUCTOS, UNIFORMES & LIBROS (INVENTARIO & INVERSIÓN)       */}
      {/* ========================================================================= */}
      {currentSubmodule === 'products' && (
        <div className="space-y-6">
          {/* Cabecera del Submódulo */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-600 uppercase tracking-wider mb-1">
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Gestión de Inventario & Inversión Escolar</span>
              </div>
              <h3 className="text-base font-black text-[#223a5e]">Productos, Uniformes & Libros</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Calcula costos unitarios, márgenes de ganancia en vivo, cronograma de inversión (1 a 3 cuotas) y salidas de almacén.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setCreateProductModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-[#223a5e] hover:bg-[#1a2d4a] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <PlusCircle className="w-3.5 h-3.5 text-cyan-400" />
                <span>+ Invertir en Lote</span>
              </button>

              <button
                onClick={() => {
                  if (products.length === 0) {
                    onNotify({
                      type: 'warning',
                      title: 'Sin Productos',
                      message: 'Primero registra un lote o producto escolar para poder vender.',
                    });
                    return;
                  }
                  const availableProd = products.find((p) => p.current_stock > 0) || products[0];
                  setSelectedProductForSale(availableProd);
                  setSaleQuantity('1');
                  setSaleUnitPrice(String(availableProd.selling_price));
                  setSaleStudentName('');
                  setSaleBuyerName('');
                  setSaleReceiptNumber(`VEN-${Date.now().toString().slice(-4)}`);
                  setRecordSaleModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-[#2fbf71] hover:bg-[#26995b] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>+ Registrar Venta / Despacho</span>
              </button>
            </div>
          </div>

          {/* Tarjetas Métricas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Inversión en Lotes</span>
              <p className="text-xl sm:text-2xl font-black text-[#223a5e] mt-1 font-mono">{formatSoles(productsMetrics.totalInvestedGlobal)}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{productsMetrics.totalProductsCount} productos registrados</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recaudado x Ventas</span>
              <p className="text-xl sm:text-2xl font-black text-blue-600 mt-1 font-mono">{formatSoles(productsMetrics.totalRevenueGlobal)}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Ingreso total en caja</p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 shadow-xs">
              <span className="text-[10px] font-bold text-[#26995b] uppercase tracking-wider block">Ganancia Neta Obtenida</span>
              <p className="text-xl sm:text-2xl font-black text-[#26995b] mt-1 font-mono">+{formatSoles(productsMetrics.totalProfitRealizedGlobal)}</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">Rentabilidad líquida</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Stock en Almacén</span>
              <p className="text-xl sm:text-2xl font-black text-cyan-700 mt-1 font-mono">{productsMetrics.totalStockAvailable} <span className="text-xs font-normal text-slate-400">unids</span></p>
              <p className="text-[11px] text-cyan-600 font-semibold mt-0.5">Potencial: +{formatSoles(productsMetrics.potentialProfitGlobal)}</p>
            </div>
          </div>

          {/* Filtros de Productos */}
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {(['ALL', 'LIBROS', 'UNIFORMES', 'MATERIALES', 'OTROS'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setProductCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    productCategoryFilter === cat ? 'bg-white text-[#223a5e] shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {cat === 'ALL' ? 'Todos' : cat === 'LIBROS' ? 'Libros' : cat === 'UNIFORMES' ? 'Uniformes' : cat === 'MATERIALES' ? 'Materiales' : 'Otros'}
                </button>
              ))}
            </div>

            <div className="text-xs text-slate-400 font-medium">
              Mostrando {products.filter((p) => productCategoryFilter === 'ALL' || p.category === productCategoryFilter).length} producto(s)
            </div>
          </div>

          {/* Tabla de Productos Compacta y 100% Ancho */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex justify-between items-center">
              <h4 className="text-xs font-bold text-[#223a5e] uppercase tracking-wider">Catálogo de Productos & Inventario</h4>
              <span className="text-xs text-slate-400">{products.length} productos en total</span>
            </div>

            {loadingProducts ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#2fbf71]" />
                <p className="text-xs font-semibold text-slate-500">Cargando catálogo de productos e inventario...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Package className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">No hay productos registrados en este colegio</p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Registra tu primera compra o lote de libros, uniformes o agendas para calcular costos, fijar tu margen y controlar tu stock.
                </p>
                <button
                  onClick={() => setCreateProductModalOpen(true)}
                  className="mt-2 px-4 py-2 rounded-xl bg-[#2fbf71] hover:bg-[#26995b] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>+ Invertir en Primer Lote</span>
                </button>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-12 text-center space-y-1">
                <p className="text-xs font-bold text-slate-600">No se encontraron productos en la categoría seleccionada</p>
                <p className="text-[11px] text-slate-400">Intenta cambiando el filtro de categoría.</p>
              </div>
            ) : (
              <div className="w-full">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/75 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-4">Producto</th>
                      <th className="py-2.5 px-4 font-mono">Costo Unit.</th>
                      <th className="py-2.5 px-4 font-mono">P. Venta / Margen</th>
                      <th className="py-2.5 px-4">Stock</th>
                      <th className="py-2.5 px-4 font-mono">Ventas & Ganancia</th>
                      <th className="py-2.5 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedProducts.map((prod) => {
                        const unitProfit = prod.selling_price - prod.unit_cost;
                        const marginPercent = prod.unit_cost > 0 ? ((unitProfit / prod.unit_cost) * 100).toFixed(0) : '0';
                        const isLowStock = prod.current_stock > 0 && prod.current_stock <= 5;
                        const isOutOfStock = prod.current_stock === 0;

                        return (
                          <tr key={prod.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-slate-100 text-slate-700 shrink-0">
                                  <Package className="w-4 h-4 text-cyan-600" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-[#223a5e] truncate">{prod.name}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-slate-100 text-slate-600">
                                      {prod.category}
                                    </span>
                                    {prod.sku && <span className="text-[10px] text-slate-400 font-mono">SKU: {prod.sku}</span>}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-4 font-mono">
                              <span className="font-semibold text-slate-700">{formatSoles(prod.unit_cost)}</span>
                              <span className="block text-[10px] text-slate-400">Total inv.: {formatSoles(prod.batches.reduce((s, b) => s + b.total_investment, 0))}</span>
                            </td>

                            <td className="py-3 px-4 font-mono">
                              <div className="flex items-center gap-1">
                                <span className="font-bold text-[#223a5e]">{formatSoles(prod.selling_price)}</span>
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded">
                                  +{formatSoles(unitProfit)} ({marginPercent}%)
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400">Margen x unidad</span>
                            </td>

                            <td className="py-3 px-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className={`font-mono font-bold ${isOutOfStock ? 'text-rose-600' : isLowStock ? 'text-amber-600' : 'text-slate-800'}`}>
                                    {prod.current_stock} unids
                                  </span>
                                  {isOutOfStock ? (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-700 uppercase">Agotado</span>
                                  ) : isLowStock ? (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 uppercase">Bajo</span>
                                  ) : null}
                                </div>
                                <span className="block text-[10px] text-slate-400">{prod.total_sold} vendidas de {prod.total_purchased} compradas</span>
                              </div>
                            </td>

                            <td className="py-3 px-4 font-mono">
                              <span className="font-bold text-blue-600">{formatSoles(prod.totalRevenue)}</span>
                              <span className="block text-[10px] font-bold text-emerald-600">Neto: +{formatSoles(prod.totalProfitRealized)}</span>
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedProductForBatches(prod);
                                    setBatchesModalOpen(true);
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
                                  title="Ver lotes de inversión y cronograma de pagos"
                                >
                                  Lotes & Cuotas ({prod.batches.length})
                                </button>

                                <button
                                  type="button"
                                  disabled={prod.current_stock <= 0}
                                  onClick={() => {
                                    setSelectedProductForSale(prod);
                                    setSaleQuantity('1');
                                    setSaleUnitPrice(String(prod.selling_price));
                                    setSaleStudentName('');
                                    setSaleBuyerName('');
                                    setSaleReceiptNumber(`VEN-${Date.now().toString().slice(-4)}`);
                                    setRecordSaleModalOpen(true);
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-[#2fbf71] hover:bg-[#26995b] text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  <ShoppingBag className="w-3 h-3" />
                                  <span>Vender</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setConfirmDeleteModal({
                                      isOpen: true,
                                      itemType: 'product',
                                      product: prod,
                                    })
                                  }
                                  className="p-1.5 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                  title="Eliminar producto del catálogo"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>

                          </tr>
                        );
                      })}
                  </tbody>
                </table>
                <Pagination
                  currentPage={prodPage}
                  totalItems={filteredProducts.length}
                  itemsPerPage={prodPageSize}
                  onPageChange={setProdPage}
                  onItemsPerPageChange={(size) => {
                    setProdPageSize(size);
                    setProdPage(1);
                  }}
                  itemsPerPageOptions={[5, 10, 20, 50]}
                  labelSingular="producto"
                  labelPlural="productos"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBMÓDULO 4: SERVICIOS FIJOS & PRÉSTAMOS BANCARIOS                        */}
      {/* ========================================================================= */}
      {currentSubmodule === 'obligations' && (
        <div className="space-y-6">
          {/* Sección 1: Servicios Recurrentes */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#223a5e] flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-[#2fbf71]" />
                  <span>Servicios Fijos & Recurrentes (Luz, Agua, Internet, Alquiler)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Configura una vez y paga cada mes con 1 clic.</p>
              </div>

              <button
                onClick={() => setCreateRecurringModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-[#223a5e] hover:bg-[#1c2f4c] text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5 text-[#2fbf71]" />
                <span>+ Configurar Servicio</span>
              </button>
            </div>

            {loadingRecurring ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#2fbf71]" />
                <p className="text-xs font-semibold text-slate-500">Cargando servicios fijos y recurrentes...</p>
              </div>
            ) : recurringExpenses.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No hay servicios fijos configurados todavía.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recurringExpenses.map((rec) => {
                  const isPaid = rec.is_paid_this_month;
                  return (
                    <div key={rec.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex justify-between items-center gap-3">
                      <div>
                        <p className="text-xs font-bold text-[#223a5e]">{rec.name}</p>
                        <p className="text-[10px] text-slate-400">Vence: día {rec.due_day} &bull; Suministro: {rec.supply_number || 'S/N'}</p>
                        <p className="text-xs font-mono font-bold text-slate-800 mt-1">
                          {rec.is_variable_amount ? 'Monto Variable' : formatSoles(rec.default_amount)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isPaid ? (
                          <span className="px-2 py-0.5 rounded-full bg-[#e6f9ef] text-[#26995b] text-[10px] font-bold">
                            Pagado este mes
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedRecurringForPay(rec);
                              setPayRecAmount(rec.default_amount > 0 ? String(rec.default_amount) : '');
                              const isPropioBlocked = Boolean(metrics.fundsSummary?.propio?.isBlocked);
                              const activeLoanWithBal = bankLoans.find(
                                (l) => l.status === 'ACTIVE' && (Number(l.available_balance ?? l.total_principal) > 0)
                              );
                              if (isPropioBlocked) {
                                if (activeLoanWithBal) {
                                  setPayRecFundingSource('PRESTAMO_BANCARIO');
                                  setPayRecFundingLoanId(activeLoanWithBal.id);
                                } else {
                                  setPayRecFundingSource('APORTE_SOCIO');
                                }
                              } else {
                                setPayRecFundingSource('PROPIO');
                                setPayRecFundingLoanId('');
                              }
                              setPayRecurringModalOpen(true);
                            }}
                            className="px-3 py-1 rounded-lg bg-[#2fbf71] hover:bg-[#26995b] text-white text-[11px] font-bold cursor-pointer"
                          >
                            Pagar
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteModal({ isOpen: true, itemType: 'recurring', recurring: rec })}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Eliminar servicio recurrente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sección 2: Préstamos Bancarios */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#223a5e] flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-purple-600" />
                  <span>Préstamos Bancarios & Financiamientos</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">El desembolso entra a caja y las cuotas se amortizan mensualmente.</p>
              </div>

              <button
                onClick={() => setCreateLoanModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5 text-emerald-300" />
                <span>+ Registrar Préstamo</span>
              </button>
            </div>

            {loadingLoans ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#2fbf71]" />
                <p className="text-xs font-semibold text-slate-500">Cargando préstamos bancarios...</p>
              </div>
            ) : bankLoans.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No hay préstamos bancarios registrados.
              </div>
            ) : (
              <div className="space-y-3">
                {bankLoans.map((loan) => (
                  <div key={loan.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#223a5e]">{loan.loan_title}</span>
                        <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 text-[10px] font-bold uppercase">{loan.bank_name}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-1.5">
                        <span>Progreso: {loan.paid_installments_count || 0} de {loan.total_installments} cuotas pagadas</span>
                        {loan.next_installment && (
                          <>
                            <span className="text-slate-300">&bull;</span>
                            <span className="text-amber-700 font-semibold font-mono">
                              Próx. Vencimiento: {formatDisplayDate(loan.next_installment.due_date)}
                            </span>
                          </>
                        )}
                      </p>

                      {/* Indicador de Uso del Préstamo (Gastado vs Saldo Disponible) */}
                      <div className="mt-2 pt-2 border-t border-slate-200/80 flex flex-wrap items-center gap-2.5 text-[10.5px]">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400">Capital:</span>
                          <strong className="font-mono text-purple-900 font-bold">{formatSoles(loan.total_principal)}</strong>
                        </div>
                        <span className="text-slate-300">&bull;</span>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400">Gastado:</span>
                          <strong className="font-mono text-rose-600 font-bold">{formatSoles(loan.spent_amount || 0)}</strong>
                        </div>
                        <span className="text-slate-300">&bull;</span>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400">Disponible:</span>
                          <strong className={`font-mono font-bold ${(loan.available_balance ?? loan.total_principal) > 0 ? 'text-[#26995b]' : 'text-slate-600'}`}>
                            {formatSoles(loan.available_balance ?? loan.total_principal)}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {loan.next_installment && (
                        <button
                          onClick={() => {
                            setSelectedLoanForPay({ loan, installment: loan.next_installment! });
                            setPayInstAmount(String(loan.next_installment!.amount));
                            setPayInstDate(new Date().toISOString().split('T')[0]);
                            setPayInstReceipt('');
                            const isPropioBlocked = Boolean(metrics.fundsSummary?.propio?.isBlocked);
                            setPayInstFundingSource(isPropioBlocked ? 'APORTE_SOCIO' : 'PROPIO');
                            setPayInstFundingEntityName('');
                            setPayInstallmentModalOpen(true);
                          }}
                          className="px-3 py-1 rounded-lg bg-[#2fbf71] hover:bg-[#26995b] text-white text-[11px] font-bold cursor-pointer"
                        >
                          Pagar Cuota ({formatSoles(loan.next_installment.amount)})
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedLoanForSchedule(loan)}
                        className="px-3 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-bold cursor-pointer"
                      >
                        Cronograma
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteModal({ isOpen: true, itemType: 'loan', loan })}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Cancelar préstamo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBMÓDULO 4: ARQUEO DE CAJA DIARIA                                        */}
      {/* ========================================================================= */}
      {currentSubmodule === 'shifts' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-base font-black text-[#223a5e]">Arqueo & Cuadre de Caja Diaria</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Supervisa el dinero físico en ventanilla y verifica que coincida con las cobranzas del día.
              </p>
            </div>

            <div>
              {!activeShift ? (
                <button
                  onClick={() => setOpenShiftModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-[#2fbf71] hover:bg-[#26995b] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Abrir Turno de Caja Hoy</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setCountedActualCash(String(activeShift.expected_cash || '0'));
                    setCloseShiftModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Realizar Arqueo & Cerrar Caja</span>
                </button>
              )}
            </div>
          </div>

          {loadingShift ? (
            <div className="p-12 text-center text-slate-400 space-y-3 bg-white rounded-2xl border border-slate-200">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#2fbf71]" />
              <p className="text-xs font-semibold text-slate-500">Cargando estado de caja y turnos...</p>
            </div>
          ) : activeShift ? (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-[#223a5e] to-[#1c2f4c] text-white space-y-4">
              <div className="flex justify-between items-center text-xs border-b border-white/10 pb-3">
                <span className="flex items-center gap-2 font-bold">
                  <span className="w-2 h-2 rounded-full bg-[#2fbf71] animate-pulse" />
                  Turno Activo: {activeShift.opened_by_name}
                </span>
                <span className="text-slate-300 font-mono">
                  Apertura: {new Date(activeShift.opened_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white/10">
                  <span className="text-[10px] text-slate-300 uppercase">Saldo Base</span>
                  <p className="text-base font-black font-mono mt-0.5">{formatSoles(activeShift.opening_balance)}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/10">
                  <span className="text-[10px] text-emerald-300 uppercase">+ Cobros Efectivo</span>
                  <p className="text-base font-black text-emerald-400 font-mono mt-0.5">+{formatSoles(activeShift.cash_income)}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/10">
                  <span className="text-[10px] text-rose-300 uppercase">- Salidas Caja</span>
                  <p className="text-base font-black text-rose-300 font-mono mt-0.5">-{formatSoles(activeShift.cash_expense)}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/30">
                  <span className="text-[10px] text-emerald-200 uppercase font-bold">Físico Esperado</span>
                  <p className="text-lg font-black font-mono mt-0.5">{formatSoles(activeShift.expected_cash)}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
              No hay turno de caja abierto en este momento.
            </div>
          )}

          {/* Historial de Turnos */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100">
              <h4 className="text-xs font-bold text-[#223a5e] uppercase tracking-wider">Historial de Arqueos</h4>
            </div>

            {loadingShift ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#2fbf71]" />
                <p className="text-xs font-semibold">Cargando historial de arqueos...</p>
              </div>
            ) : shiftHistory.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">Sin historial de arqueos cerrados todavía.</div>
            ) : (
              <>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/75 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-4">Fecha Cierre</th>
                      <th className="py-2.5 px-4">Cajero</th>
                      <th className="py-2.5 px-4">Esperado</th>
                      <th className="py-2.5 px-4">Contado</th>
                      <th className="py-2.5 px-4">Cuadre</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedShifts.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                          {new Date(s.closed_at).toLocaleDateString('es-PE')}
                        </td>
                        <td className="py-3 px-4 font-bold text-[#223a5e]">{s.closed_by_name}</td>
                        <td className="py-3 px-4 font-mono">{formatSoles(s.expected_cash)}</td>
                        <td className="py-3 px-4 font-mono font-bold">{formatSoles(s.actual_cash)}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.discrepancy === 0 ? 'bg-[#e6f9ef] text-[#26995b]' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {s.discrepancy === 0 ? 'Exacta' : formatSoles(s.discrepancy)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pagination
                  currentPage={shiftPage}
                  totalItems={shiftHistory.length}
                  itemsPerPage={shiftPageSize}
                  onPageChange={setShiftPage}
                  onItemsPerPageChange={(size) => {
                    setShiftPageSize(size);
                    setShiftPage(1);
                  }}
                  itemsPerPageOptions={[5, 10, 20]}
                  labelSingular="arqueo"
                  labelPlural="arqueos"
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PREVISIÓN & FLUJO 30 DÍAS (FORECAST)                              */}
      {/* ========================================================================= */}
      {forecastModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-5 bg-[#223a5e] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-300">
                  <TrendingUp className="w-5 h-5 text-[#2fbf71]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">Previsión Financiera y Flujo a 30 Días</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#2fbf71]/20 text-[#2fbf71] border border-[#2fbf71]/30">
                      En Tiempo Real
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    {forecastData?.period?.startDate && forecastData?.period?.endDate ? (
                      <>Ventana de proyección: <span className="font-mono font-semibold text-white">{forecastData.period.startDate}</span> al <span className="font-mono font-semibold text-white">{forecastData.period.endDate}</span> (30 días)</>
                    ) : (
                      'Simulación basada en obligaciones registradas, inventario y cobranzas'
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchForecast}
                  disabled={loadingForecast}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition cursor-pointer disabled:opacity-50"
                  title="Recalcular proyección"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingForecast ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setForecastModalOpen(false)}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto no-scrollbar space-y-5 text-xs">
              {loadingForecast ? (
                <div className="p-12 text-center text-slate-400 space-y-3">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#2fbf71]" />
                  <p className="text-xs font-semibold text-slate-500">Calculando proyección y flujo de caja a 30 días...</p>
                </div>
              ) : forecastData ? (
                <>
                  {/* Diagnóstico Inteligente */}
                  <div
                    className={`p-4 rounded-2xl border flex items-start gap-3 ${
                      forecastData.diagnosisStatus === 'DEFICIT'
                        ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                        : forecastData.diagnosisStatus === 'EQUILIBRADO'
                        ? 'bg-blue-50/80 border-blue-200 text-blue-900'
                        : 'bg-emerald-50/80 border-emerald-200 text-[#1b6e41]'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-xl shrink-0 ${
                        forecastData.diagnosisStatus === 'DEFICIT'
                          ? 'bg-amber-100 text-amber-700'
                          : forecastData.diagnosisStatus === 'EQUILIBRADO'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-emerald-100 text-[#26995b]'
                      }`}
                    >
                      {forecastData.diagnosisStatus === 'DEFICIT' ? (
                        <AlertTriangle className="w-5 h-5" />
                      ) : forecastData.diagnosisStatus === 'EQUILIBRADO' ? (
                        <Info className="w-5 h-5" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <strong className="text-xs uppercase font-bold tracking-wide">
                          {forecastData.diagnosisStatus === 'DEFICIT'
                            ? 'Diagnóstico: Ajuste de Liquidez Requerido'
                            : forecastData.diagnosisStatus === 'EQUILIBRADO'
                            ? 'Diagnóstico: Flujo Equilibrado'
                            : 'Diagnóstico: Posición Financiera Holgada'}
                        </strong>
                      </div>
                      <p className="text-[11.5px] mt-1 leading-relaxed opacity-90">
                        {forecastData.diagnosisMessage}
                      </p>
                    </div>
                  </div>

                  {/* 4 KPI Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Saldo Hoy en Caja</span>
                      <p className={`text-base font-black font-mono mt-0.5 ${forecastData.currentCash >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                        {formatSoles(forecastData.currentCash)}
                      </p>
                      <span className="text-[10px] text-slate-400 mt-0.5 block truncate">Disponible inmediato</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200">
                      <span className="text-[10px] text-rose-600 uppercase font-bold tracking-wider">Egresos 30 Días</span>
                      <p className="text-base font-black text-rose-600 font-mono mt-0.5">
                        {formatSoles(forecastData.totalCommittedExpenses)}
                      </p>
                      <span className="text-[10px] text-rose-500 mt-0.5 block truncate">Compromisos exigibles</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200">
                      <span className="text-[10px] text-[#26995b] uppercase font-bold tracking-wider">Ingresos Estimados</span>
                      <p className="text-base font-black text-[#26995b] font-mono mt-0.5">
                        {formatSoles(forecastData.projectedIncomeModerate)}
                      </p>
                      <span className="text-[10px] text-emerald-600 mt-0.5 block truncate">Pensiones + Mercadería</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200">
                      <span className="text-[10px] text-blue-700 uppercase font-bold tracking-wider">Saldo Proyectado 30D</span>
                      <p className={`text-base font-black font-mono mt-0.5 ${forecastData.endingCashProjected >= 0 ? 'text-[#26995b]' : 'text-rose-600'}`}>
                        {formatSoles(forecastData.endingCashProjected)}
                      </p>
                      <span className="text-[10px] text-blue-600 mt-0.5 block truncate">Al término de 30 días</span>
                    </div>
                  </div>

                  {/* Cronograma de Compromisos a 30 Días */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                          Cronograma de Vencimientos y Compromisos (Próximos 30 Días)
                        </h4>
                      </div>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">
                        {forecastData.timeline?.length || 0} eventos programados
                      </span>
                    </div>

                    {forecastData.timeline && forecastData.timeline.length > 0 ? (
                      <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                        {forecastData.timeline.map((item: any, idx: number) => (
                          <div key={item.id || idx} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition">
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`p-2 rounded-xl shrink-0 ${
                                  item.category === 'PROVEEDOR'
                                    ? 'bg-amber-100 text-amber-700'
                                    : item.category === 'PRESTAMO_BANCARIO'
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-blue-100 text-blue-700'
                                }`}
                              >
                                {item.category === 'PROVEEDOR' ? (
                                  <Package className="w-4 h-4" />
                                ) : item.category === 'PRESTAMO_BANCARIO' ? (
                                  <Landmark className="w-4 h-4" />
                                ) : (
                                  <Zap className="w-4 h-4" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-800 text-xs truncate">{item.title}</p>
                                <div className="flex items-center gap-2 text-[10.5px] text-slate-400 mt-0.5">
                                  <span>Vence: <strong className="font-mono text-slate-600">{item.dueDate}</strong></span>
                                  <span>•</span>
                                  <span>{item.supplierName || item.bankName || 'Operación'}</span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <p className="font-mono font-bold text-xs text-rose-600">
                                -{formatSoles(item.amount)}
                              </p>
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[9.5px] font-bold mt-0.5 ${
                                  item.isOverdue
                                    ? 'bg-rose-100 text-rose-700'
                                    : item.daysRemaining <= 5
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {item.isOverdue
                                  ? 'Vencido'
                                  : item.daysRemaining === 0
                                  ? 'Vence hoy'
                                  : `En ${item.daysRemaining} días`}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1 opacity-80" />
                        <p className="text-xs text-slate-600 font-medium">No hay compromisos pendientes de pago en los próximos 30 días</p>
                        {forecastData.nextUpcomingLoanInstallment && (
                          <p className="text-[11px] text-slate-400 mt-1">
                            Próxima cuota programada: <strong className="text-slate-700">{forecastData.nextUpcomingLoanInstallment.title}</strong> el <strong className="font-mono text-slate-700">{forecastData.nextUpcomingLoanInstallment.dueDate}</strong> ({formatSoles(forecastData.nextUpcomingLoanInstallment.amount)})
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Respaldo de Liquidez: Stock & Inventario Valorizado */}
                  {forecastData.totalStockUnits > 0 && (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-emerald-100 text-[#26995b]">
                          <ShoppingBag className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs">Inventario Comercial en Almacén</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Cuentas con <strong className="text-slate-800">{forecastData.totalStockUnits} unidades</strong> de productos valorizadas en <strong className="text-[#26995b] font-mono">{formatSoles(forecastData.totalInventoryRetailValue)}</strong>.
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Venta 30D Estimada</span>
                        <span className="font-mono font-bold text-xs text-[#26995b]">
                          +{formatSoles(forecastData.projectedStockSalesModerate)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Escenarios de Cierre de Mes */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wide">
                      Simulación de 3 Escenarios de Cierre (Próximos 30 Días):
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Pesimista */}
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">1. Conservador</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-200 text-slate-700">50% Cobro</span>
                        </div>
                        <div className="text-xs">
                          <span className="text-slate-400 text-[10.5px]">Ingreso Proyectado:</span>
                          <p className="font-mono font-bold text-slate-800">{formatSoles(forecastData.scenarios?.pessimistic?.projectedIncome || 0)}</p>
                        </div>
                        <div className="pt-1.5 border-t border-slate-200 flex justify-between items-center text-xs">
                          <span className="text-slate-400 text-[10.5px]">Saldo Final:</span>
                          <strong className={`font-mono ${forecastData.scenarios?.pessimistic?.projectedEndingCash >= 0 ? 'text-[#26995b]' : 'text-rose-600'}`}>
                            {formatSoles(forecastData.scenarios?.pessimistic?.projectedEndingCash || 0)}
                          </strong>
                        </div>
                      </div>

                      {/* Moderado */}
                      <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-1.5 ring-1 ring-blue-300">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-blue-700 uppercase">2. Esperado (Base)</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-200/80 text-blue-800">85% Cobro</span>
                        </div>
                        <div className="text-xs">
                          <span className="text-blue-500 text-[10.5px]">Ingreso Proyectado:</span>
                          <p className="font-mono font-bold text-blue-900">{formatSoles(forecastData.scenarios?.moderate?.projectedIncome || 0)}</p>
                        </div>
                        <div className="pt-1.5 border-t border-blue-200 flex justify-between items-center text-xs">
                          <span className="text-blue-500 text-[10.5px]">Saldo Final:</span>
                          <strong className={`font-mono ${forecastData.scenarios?.moderate?.projectedEndingCash >= 0 ? 'text-[#26995b]' : 'text-rose-600'}`}>
                            {formatSoles(forecastData.scenarios?.moderate?.projectedEndingCash || 0)}
                          </strong>
                        </div>
                      </div>

                      {/* Optimista */}
                      <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-[#26995b] uppercase">3. Dinámico</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-200/80 text-[#1b6e41]">98% Cobro</span>
                        </div>
                        <div className="text-xs">
                          <span className="text-emerald-600 text-[10.5px]">Ingreso Proyectado:</span>
                          <p className="font-mono font-bold text-emerald-900">{formatSoles(forecastData.scenarios?.optimistic?.projectedIncome || 0)}</p>
                        </div>
                        <div className="pt-1.5 border-t border-emerald-200 flex justify-between items-center text-xs">
                          <span className="text-emerald-600 text-[10.5px]">Saldo Final:</span>
                          <strong className={`font-mono ${forecastData.scenarios?.optimistic?.projectedEndingCash >= 0 ? 'text-[#26995b]' : 'text-rose-600'}`}>
                            {formatSoles(forecastData.scenarios?.optimistic?.projectedEndingCash || 0)}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-slate-400">Sin datos de proyección</div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50 shrink-0">
              <button
                type="button"
                onClick={() => setForecastModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold cursor-pointer transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REGISTRAR INGRESO O GASTO MANUAL                                   */}
      {/* ========================================================================= */}
      {txModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md max-h-[90vh] bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-auto">
            <div className={`px-6 py-4 text-white flex items-center justify-between shrink-0 ${txModalType === 'INCOME' ? 'bg-[#223a5e]' : 'bg-rose-700'}`}>
              <h3 className="text-sm font-bold">{txModalType === 'INCOME' ? 'Registrar Ingreso' : 'Registrar Gasto'}</h3>
              <button onClick={() => setTxModalOpen(false)} className="text-white/80 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleSaveTransaction} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">Monto (S/) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-[#2fbf71]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">Concepto *</label>
                <input
                  type="text"
                  required
                  placeholder={txModalType === 'INCOME' ? 'Ej: Venta de libros y cuadernos' : 'Ej: Compra de útiles de limpieza'}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-[#223a5e] uppercase tracking-wider">Categoría</label>
                    <button
                      type="button"
                      onClick={() => setCategoriesModalOpen(true)}
                      className="text-[10px] font-bold text-[#2fbf71] hover:underline cursor-pointer"
                    >
                      + Nueva
                    </button>
                  </div>
                  <select
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                  >
                    <option value="">General</option>
                    {categories.filter((c) => c.type === txModalType).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">Medio</label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                  >
                    {availablePaymentMethods.map((pm) => (
                      <option key={pm.code} value={pm.code}>
                        {pm.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">Fecha *</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">N° Comprobante (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej: REC-0023, F001-923"
                    value={formReceiptNumber}
                    onChange={(e) => setFormReceiptNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                  />
                </div>
              </div>

              {formPaymentMethod === 'EFECTIVO' && !activeShift && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Nota: La caja de ventanilla está cerrada actualmente. Puedes abrir turno para incluir este movimiento en efectivo en el arqueo del día.
                  </span>
                </div>
              )}

              {/* SECCIÓN OBLIGATORIA: ORIGEN DE FONDOS (¿DE DÓNDE SALIÓ EL DINERO?) */}
              {txModalType === 'EXPENSE' && (
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/90 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-amber-950 uppercase tracking-wider mb-1">
                      ¿De dónde salió el dinero para este gasto? *
                    </label>
                    <p className="text-[11px] text-amber-800">
                      Todo gasto debe tener un origen de fondos sustentado (caja del colegio, crédito bancario o aporte inicial).
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setFormFundingSource('PROPIO');
                        setFormFundingLoanId('');
                        setFormFundingEntityName('');
                      }}
                      className={`p-2.5 rounded-xl border text-left flex items-start gap-2 transition cursor-pointer ${
                        formFundingSource === 'PROPIO'
                          ? 'bg-[#223a5e] text-white border-[#223a5e] shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-sm">🏫</span>
                      <div>
                        <div className="flex items-center gap-1">
                          <strong className="block text-[11px] leading-tight">Caja Propia</strong>
                          {metrics.fundsSummary?.propio?.isBlocked && (
                            <span className="px-1.5 py-0.2 rounded text-[8.5px] font-black uppercase bg-rose-500 text-white">
                              🔒 Bloqueada
                            </span>
                          )}
                        </div>
                        <span className={`text-[10px] ${formFundingSource === 'PROPIO' ? 'text-slate-200' : 'text-slate-400'}`}>
                          {metrics.fundsSummary?.propio?.isBlocked ? 'S/ 0.00 recaudado' : 'Producción del colegio'}
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormFundingSource('PRESTAMO_BANCARIO')}
                      className={`p-2.5 rounded-xl border text-left flex items-start gap-2 transition cursor-pointer ${
                        formFundingSource === 'PRESTAMO_BANCARIO'
                          ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-sm">🏦</span>
                      <div>
                        <strong className="block text-[11px] leading-tight">Préstamo Bancario</strong>
                        <span className={`text-[10px] ${formFundingSource === 'PRESTAMO_BANCARIO' ? 'text-purple-200' : 'text-slate-400'}`}>
                          Crédito activo
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormFundingSource('PRESTAMISTA')}
                      className={`p-2.5 rounded-xl border text-left flex items-start gap-2 transition cursor-pointer ${
                        formFundingSource === 'PRESTAMISTA'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-sm">🤝</span>
                      <div>
                        <strong className="block text-[11px] leading-tight">Prestamista</strong>
                        <span className={`text-[10px] ${formFundingSource === 'PRESTAMISTA' ? 'text-amber-100' : 'text-slate-400'}`}>
                          Préstamo de terceros
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormFundingSource('APORTE_SOCIO')}
                      className={`p-2.5 rounded-xl border text-left flex items-start gap-2 transition cursor-pointer ${
                        formFundingSource === 'APORTE_SOCIO'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-sm">💼</span>
                      <div>
                        <strong className="block text-[11px] leading-tight">Aporte de Socio</strong>
                        <span className={`text-[10px] ${formFundingSource === 'APORTE_SOCIO' ? 'text-blue-100' : 'text-slate-400'}`}>
                          Capital de promotores
                        </span>
                      </div>
                    </button>
                  </div>

                  {/* Campos dinámicos según el origen */}
                  {formFundingSource === 'PRESTAMO_BANCARIO' && (
                    <div className="space-y-1.5 pt-1">
                      <label className="block text-[11px] font-bold text-purple-950 uppercase">
                        Selecciona el Préstamo Bancario Activo *
                      </label>
                      {bankLoans.filter((l) => l.status === 'ACTIVE').length === 0 ? (
                        <div className="p-2.5 rounded-xl bg-purple-100/70 text-purple-900 text-[11px] space-y-1">
                          <p className="font-semibold">No tienes ningún préstamo bancario activo registrado.</p>
                          <p className="text-[10px]">
                            Para sustentar este gasto con crédito bancario, primero regístralo en la pestaña &quot;Obligaciones y Deuda&quot; o selecciona &quot;Aporte de Socio&quot; / &quot;Prestamista&quot;.
                          </p>
                        </div>
                      ) : (
                        <select
                          required
                          value={formFundingLoanId}
                          onChange={(e) => setFormFundingLoanId(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl text-xs font-semibold text-purple-950 focus:outline-none focus:border-purple-600"
                        >
                          <option value="">-- Seleccionar Préstamo Bancario --</option>
                          {bankLoans
                            .filter((l) => l.status === 'ACTIVE')
                            .map((l) => {
                              const avail = typeof l.available_balance === 'number' ? l.available_balance : l.total_principal;
                              return (
                                <option key={l.id} value={l.id}>
                                  {l.bank_name} - {l.loan_title} (Disponible para gastar: {formatSoles(avail)})
                                </option>
                              );
                            })}
                        </select>
                      )}
                    </div>
                  )}

                  {formFundingSource === 'PRESTAMISTA' && (
                    <div className="space-y-1.5 pt-1">
                      <label className="block text-[11px] font-bold text-amber-950 uppercase">
                        Nombre del Prestamista o Entidad *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Don Juan Pérez / Financiera Solución"
                        value={formFundingEntityName}
                        onChange={(e) => setFormFundingEntityName(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-amber-600"
                      />
                    </div>
                  )}

                  {formFundingSource === 'APORTE_SOCIO' && (
                    <div className="space-y-1.5 pt-1">
                      <label className="block text-[11px] font-bold text-blue-950 uppercase">
                        Nombre del Socio o Promotor que aporta el capital *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Lic. Carlos Medina / Promotora Educa"
                        value={formFundingEntityName}
                        onChange={(e) => setFormFundingEntityName(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  )}

                  {formFundingSource === 'PROPIO' && (
                    metrics.fundsSummary?.propio?.isBlocked ? (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>Caja Propia Bloqueada para Gastos</span>
                        </div>
                        <p className="text-[11px] text-rose-700 leading-relaxed">
                          La Caja Propia del colegio tiene <strong>S/ 0.00 disponible</strong> porque aún no se han registrado ingresos propios (pensiones, matrículas o ventas). No se pueden pagar gastos con Caja Propia. Selecciona un <strong>Préstamo Bancario</strong> o <strong>Aporte de Socio</strong> para sustentar este pago.
                        </p>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 flex items-center justify-between font-mono">
                        <span className="font-sans text-[11px]">Saldo disponible en Caja Propia:</span>
                        <strong className="font-bold text-[#26995b]">
                          {formatSoles(metrics.fundsSummary?.propio?.availableBalance ?? 0)}
                        </strong>
                      </div>
                    )
                  )}
                </div>
              )}

              </div>

              <div className="flex justify-end gap-2 p-4 border-t border-slate-200 bg-slate-50 shrink-0">
                <button
                  type="button"
                  onClick={() => setTxModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingTx || (txModalType === 'EXPENSE' && formFundingSource === 'PROPIO' && Boolean(metrics.fundsSummary?.propio?.isBlocked))}
                  className="px-5 py-2 rounded-xl bg-[#2fbf71] hover:bg-[#26995b] text-white text-xs font-bold cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {savingTx ? (
                    <span className="inline-flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Guardando...
                    </span>
                  ) : (
                    'Confirmar y Guardar'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: COBRAR PENSIÓN                                                     */}
      {/* ========================================================================= */}
      {payTuitionModalOpen && selectedTuitionForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-5 bg-gradient-to-r from-[#2fbf71] to-[#26995b] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">Cobrar Pensión: {selectedTuitionForPay.student_name}</h3>
              <button onClick={() => setPayTuitionModalOpen(false)} className="text-white/80 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleExecutePayTuition} className="p-6 space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span>Monto:</span>
                  <span className="font-bold font-mono text-sm text-[#26995b]">{formatSoles(selectedTuitionForPay.monthly_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Alumno:</span>
                  <span className="font-semibold">{selectedTuitionForPay.grade_section}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">Medio</label>
                  <select
                    value={payTuitionMethod}
                    onChange={(e) => setPayTuitionMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                  >
                    {availablePaymentMethods.map((pm) => (
                      <option key={pm.code} value={pm.code}>
                        {pm.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">N° Recibo</label>
                  <input
                    type="text"
                    value={payTuitionReceipt}
                    onChange={(e) => setPayTuitionReceipt(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setPayTuitionModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" disabled={payingTuition} className="px-5 py-2 rounded-xl bg-[#2fbf71] hover:bg-[#26995b] text-white text-xs font-bold cursor-pointer disabled:opacity-50">
                  {payingTuition ? (
                    <span className="inline-flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Cobrando...
                    </span>
                  ) : (
                    'Confirmar Cobro'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* ========================================================================= */}
      {/* MODAL: APERTURA Y CIERRE DE CAJA                                          */}
      {/* ========================================================================= */}
      {openShiftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col p-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-[#223a5e]">Apertura de Turno de Caja</h3>
              <p className="text-xs text-slate-500 mt-0.5">Ingresa el saldo base en efectivo (sencillo en monedas y billetes).</p>
            </div>

            {lastClosedCash > 0 && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-[#26995b] flex items-center justify-between">
                <span>Último saldo cerrado:</span>
                <strong className="font-mono">{formatSoles(lastClosedCash)}</strong>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#223a5e] mb-1">Monto Inicial en Soles (S/) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={openShiftBalance}
                onChange={(e) => setOpenShiftBalance(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-[#2fbf71]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setOpenShiftModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer">
                Cancelar
              </button>
              <button type="button" onClick={handleOpenShift} disabled={openingShift} className="px-4 py-2 rounded-xl bg-[#2fbf71] hover:bg-[#26995b] text-white text-xs font-bold cursor-pointer disabled:opacity-50">
                {openingShift ? (
                  <span className="inline-flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Abriendo...
                  </span>
                ) : (
                  'Abrir Turno'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {closeShiftModalOpen && activeShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col p-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-rose-700">Arqueo & Cierre de Caja</h3>
              <p className="text-xs text-slate-500 mt-0.5">Cuenta el efectivo en gaveta e ingrésalo para cuadrar.</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Saldo base inicial:</span>
                <span className="font-mono font-semibold">{formatSoles(activeShift.opening_balance)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-700">Cobros en efectivo:</span>
                <span className="font-mono font-semibold text-emerald-700">+{formatSoles(activeShift.cash_income)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-rose-700">Salidas de caja:</span>
                <span className="font-mono font-semibold text-rose-700">-{formatSoles(activeShift.cash_expense)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1 font-bold">
                <span className="text-[#223a5e]">Físico Esperado:</span>
                <strong className="font-mono text-sm text-[#223a5e]">{formatSoles(activeShift.expected_cash)}</strong>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#223a5e] mb-1">Efectivo Físico Contado (S/) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={countedActualCash}
                onChange={(e) => setCountedActualCash(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-[#2fbf71]"
              />
            </div>

            {/* Cálculo de diferencia en tiempo real */}
            {(() => {
              const expected = activeShift.expected_cash || 0;
              const counted = parseFloat(countedActualCash) || 0;
              const diff = counted - expected;
              const isExact = Math.abs(diff) < 0.01;
              const isShort = diff < -0.01;
              const isSurplus = diff > 0.01;

              return (
                <div className={`p-3 rounded-xl border text-xs space-y-1 ${
                  isExact
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : isShort
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                  <div className="flex justify-between font-bold">
                    <span>Resultado del Cuadre:</span>
                    <span>
                      {isExact && '✓ Caja Cuadrada (Exacta)'}
                      {isShort && `⚠️ Faltante: -S/ ${Math.abs(diff).toFixed(2)}`}
                      {isSurplus && `ℹ️ Sobrante: +S/ ${diff.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] opacity-80 font-mono">
                    <span>Esperado: {formatSoles(expected)}</span>
                    <span>Contado: {formatSoles(counted)}</span>
                  </div>
                </div>
              );
            })()}

            <div>
              <label className="block text-xs font-bold text-[#223a5e] mb-1">Observaciones / Motivo de descuadre (Opcional)</label>
              <textarea
                rows={2}
                placeholder="Ej: Faltante de S/ 0.50 por redondeo en monedas..."
                value={closureNotes}
                onChange={(e) => setClosureNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#2fbf71]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setCloseShiftModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer">
                Cancelar
              </button>
              <button type="button" onClick={handleCloseShift} disabled={closingShift} className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50">
                {closingShift ? (
                  <span className="inline-flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Cerrando...
                  </span>
                ) : (
                  'Confirmar Cierre'
                )}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ========================================================================= */}
      {/* MODAL: CONFIGURAR SERVICIO FIJO / RECURRENTE                              */}
      {/* ========================================================================= */}
      {createRecurringModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md max-h-[90vh] bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-auto">
            <div className="px-6 py-4 bg-[#223a5e] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-[#2fbf71]" />
                <h3 className="text-sm font-bold">Configurar Servicio Recurrente</h3>
              </div>
              <button
                type="button"
                onClick={() => setCreateRecurringModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRecurring} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                    Nombre del Servicio *
                  </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Luz Eléctrica del Campus, Internet, Agua Potable"
                  value={newRecName}
                  onChange={(e) => setNewRecName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                    Empresa Proveedora
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Enel, Luz del Sur, Sedapal"
                    value={newRecSupplier}
                    onChange={(e) => setNewRecSupplier(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                    N° Suministro / Código
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: SUM-2948210"
                    value={newRecSupplyNumber}
                    onChange={(e) => setNewRecSupplyNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                    Día de Vencimiento (1 - 31) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={newRecDueDay}
                    onChange={(e) => setNewRecDueDay(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                    Medio Habitual
                  </label>
                  <select
                    value={newRecPaymentMethod}
                    onChange={(e) => setNewRecPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                  >
                    {availablePaymentMethods.map((pm) => (
                      <option key={pm.code} value={pm.code}>
                        {pm.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newRecIsVariable}
                    onChange={(e) => setNewRecIsVariable(e.target.checked)}
                    className="w-4 h-4 rounded text-[#2fbf71] focus:ring-[#2fbf71]"
                  />
                  <span>El monto varía cada mes según el consumo del recibo</span>
                </label>

                {!newRecIsVariable && (
                  <div className="pt-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">
                      Monto Fijo Mensual (S/) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newRecDefaultAmount}
                      onChange={(e) => setNewRecDefaultAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#2fbf71]"
                    />
                  </div>
                )}
              </div>

              </div>

              <div className="flex justify-end gap-2 p-4 border-t border-slate-200 bg-slate-50 shrink-0">
                <button
                  type="button"
                  onClick={() => setCreateRecurringModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingRecurring}
                  className="px-5 py-2 rounded-xl bg-[#2fbf71] hover:bg-[#26995b] text-white text-xs font-bold cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {savingRecurring ? (
                    <span className="inline-flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Guardando...
                    </span>
                  ) : (
                    'Guardar Servicio'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PAGAR SERVICIO RECURRENTE                                          */}
      {/* ========================================================================= */}
      {payRecurringModalOpen && selectedRecurringForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md max-h-[90vh] bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-auto">
            <div className="px-6 py-4 bg-gradient-to-r from-[#223a5e] to-[#1c2f4c] text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-bold">Pagar Servicio: {selectedRecurringForPay.name}</h3>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Periodo: {selectedMonth || currentMonthStr} &bull; Suministro: {selectedRecurringForPay.supply_number || 'S/N'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPayRecurringModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePayRecurring} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                    Monto a Pagar del Recibo (S/) *
                  </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={payRecAmount}
                  onChange={(e) => setPayRecAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-[#2fbf71]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                    Fecha de Pago *
                  </label>
                  <input
                    type="date"
                    required
                    value={payRecDate}
                    onChange={(e) => setPayRecDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                    Medio de Pago
                  </label>
                  <select
                    value={payRecMethod}
                    onChange={(e) => setPayRecMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                  >
                    {availablePaymentMethods.map((pm) => (
                      <option key={pm.code} value={pm.code}>
                        {pm.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                  N° Operación / Voucher / Recibo (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: OP-948192 o REC-091"
                  value={payRecReceipt}
                  onChange={(e) => setPayRecReceipt(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                />
              </div>

              {/* SECCIÓN ORIGEN DE FONDOS */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="block text-[11px] font-bold text-[#223a5e] uppercase tracking-wider">
                  Origen de Fondos (¿De dónde sale el dinero?)
                </label>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setPayRecFundingSource('PROPIO');
                      setPayRecFundingLoanId('');
                      setPayRecFundingEntityName('');
                    }}
                    className={`p-2 rounded-xl border text-left text-[11px] font-bold transition cursor-pointer ${
                      payRecFundingSource === 'PROPIO'
                        ? 'bg-[#223a5e] text-white border-[#223a5e]'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <span>🏫 Caja Propia</span>
                      {metrics.fundsSummary?.propio?.isBlocked && (
                        <span className="px-1 py-0.2 rounded text-[8.5px] font-black uppercase bg-rose-500 text-white">
                          🔒
                        </span>
                      )}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayRecFundingSource('PRESTAMO_BANCARIO')}
                    className={`p-2 rounded-xl border text-left text-[11px] font-bold transition cursor-pointer ${
                      payRecFundingSource === 'PRESTAMO_BANCARIO'
                        ? 'bg-purple-700 text-white border-purple-700'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    🏦 Préstamo Bancario
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayRecFundingSource('PRESTAMISTA')}
                    className={`p-2 rounded-xl border text-left text-[11px] font-bold transition cursor-pointer ${
                      payRecFundingSource === 'PRESTAMISTA'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    🤝 Prestamista
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayRecFundingSource('APORTE_SOCIO')}
                    className={`p-2 rounded-xl border text-left text-[11px] font-bold transition cursor-pointer ${
                      payRecFundingSource === 'APORTE_SOCIO'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    💼 Aporte Socio
                  </button>
                </div>

                {payRecFundingSource === 'PROPIO' && metrics.fundsSummary?.propio?.isBlocked && (
                  <p className="text-[11px] text-rose-600 font-semibold bg-rose-50 p-2 rounded-xl border border-rose-200">
                    🔒 Caja Propia bloqueada: El colegio no tiene ingresos recaudados (S/ 0.00). Selecciona Préstamo Bancario o Aporte de Socio.
                  </p>
                )}

                {payRecFundingSource === 'PRESTAMO_BANCARIO' && (
                  <select
                    value={payRecFundingLoanId}
                    onChange={(e) => setPayRecFundingLoanId(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-purple-300 rounded-xl text-xs font-semibold text-purple-950"
                  >
                    <option value="">-- Seleccionar Préstamo --</option>
                    {bankLoans
                      .filter((l) => l.status === 'ACTIVE')
                      .map((l) => {
                        const avail = typeof l.available_balance === 'number' ? l.available_balance : l.total_principal;
                        return (
                          <option key={l.id} value={l.id}>
                            {l.bank_name} - {l.loan_title} (Disponible: {formatSoles(avail)})
                          </option>
                        );
                      })}
                  </select>
                )}

                {(payRecFundingSource === 'PRESTAMISTA' || payRecFundingSource === 'APORTE_SOCIO') && (
                  <input
                    type="text"
                    placeholder={payRecFundingSource === 'APORTE_SOCIO' ? 'Nombre del socio/promotor' : 'Nombre del prestamista'}
                    value={payRecFundingEntityName}
                    onChange={(e) => setPayRecFundingEntityName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                  />
                )}
              </div>

              </div>

              <div className="flex justify-end gap-2 p-4 border-t border-slate-200 bg-slate-50 shrink-0">
                <button
                  type="button"
                  onClick={() => setPayRecurringModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={payingRecurring || (payRecFundingSource === 'PROPIO' && Boolean(metrics.fundsSummary?.propio?.isBlocked))}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {payingRecurring ? (
                    <span className="inline-flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Registrando...
                    </span>
                  ) : (
                    'Confirmar Pago de Servicio'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REGISTRAR PRÉSTAMO BANCARIO                                        */}
      {/* ========================================================================= */}
      {createLoanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 bg-gradient-to-r from-purple-800 to-purple-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-emerald-300" />
                <h3 className="text-sm font-bold">Registrar Préstamo Bancario</h3>
              </div>
              <button
                type="button"
                onClick={() => setCreateLoanModalOpen(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLoan} className="p-6 overflow-y-auto space-y-4 no-scrollbar">
              <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-950 text-xs flex items-start gap-2.5">
                <Info className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Mecanismo Financiero Automático:</p>
                  <p className="text-[11px] text-purple-800 mt-0.5">
                    El capital prestado ingresará inmediatamente al flujo de caja como un <strong>INGRESO</strong> por desembolso. Al mismo tiempo, se programarán las cuotas mensuales que se registrarán como <strong>GASTOS</strong> conforme las pagues.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                    Banco / Entidad *
                  </label>
                  <select
                    value={newLoanBank}
                    onChange={(e) => setNewLoanBank(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                  >
                    <option value="BCP">Banco de Crédito (BCP)</option>
                    <option value="BBVA">BBVA Perú</option>
                    <option value="Interbank">Interbank</option>
                    <option value="Scotiabank">Scotiabank</option>
                    <option value="Banco de la Nación">Banco de la Nación</option>
                    <option value="Caja Huancayo">Caja Huancayo</option>
                    <option value="Caja Arequipa">Caja Arequipa</option>
                    <option value="Caja Piura">Caja Piura</option>
                    <option value="Caja Cusco">Caja Cusco</option>
                    <option value="Otro">Otro Banco / Financiera</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                    Propósito / Título *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Construcción Pabellón Primaria"
                    value={newLoanTitle}
                    onChange={(e) => setNewLoanTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                    Capital Desembolsado (S/) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={newLoanPrincipal}
                    onChange={(e) => setNewLoanPrincipal(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-[#2fbf71]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                    N° de Cuotas *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="Ej: 24"
                    value={newLoanInstallments}
                    onChange={(e) => setNewLoanInstallments(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-[#2fbf71]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                    Cuota Mensual (S/) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={newLoanMonthlyAmount}
                    onChange={(e) => setNewLoanMonthlyAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-[#2fbf71]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                    Tasa TEA % (Opcional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ej: 14.5"
                    value={newLoanTea}
                    onChange={(e) => setNewLoanTea(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                    Fecha de Desembolso *
                  </label>
                  <input
                    type="date"
                    required
                    value={newLoanDisbursementDate}
                    onChange={(e) => setNewLoanDisbursementDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                    Fecha Primera Cuota *
                  </label>
                  <input
                    type="date"
                    required
                    value={newLoanFirstPaymentDate}
                    onChange={(e) => setNewLoanFirstPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setCreateLoanModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingLoan}
                  className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {savingLoan ? (
                    <span className="inline-flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Procesando...
                    </span>
                  ) : (
                    'Registrar y Desembolsar'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PAGAR CUOTA DE PRÉSTAMO                                            */}
      {/* ========================================================================= */}
      {payInstallmentModalOpen && selectedLoanForPay && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md max-h-[90vh] bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col relative z-[61] my-auto">
            <div className="px-6 py-4 bg-gradient-to-r from-purple-800 to-purple-700 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-bold">Pagar Cuota {selectedLoanForPay.installment.installment_number} de {selectedLoanForPay.loan.total_installments}</h3>
                <p className="text-[11px] text-purple-200 mt-0.5">
                  {selectedLoanForPay.loan.loan_title} &bull; {selectedLoanForPay.loan.bank_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPayInstallmentModalOpen(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePayInstallment} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Monto Programado:</span>
                    <span className="font-mono font-bold text-sm text-purple-900">{formatSoles(selectedLoanForPay.installment.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Vencimiento programado:</span>
                    <span className="font-semibold text-slate-700 font-mono">{formatDisplayDate(selectedLoanForPay.installment.due_date)}</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-[#223a5e] uppercase tracking-wider">
                      Monto a Descontar / Pagar (S/) *
                    </label>
                    <span className="text-[10px] text-slate-400">Modificable si varió la cuota</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">S/</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0.01"
                      value={payInstAmount}
                      onChange={(e) => setPayInstAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold font-mono text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                    Fecha de Pago *
                  </label>
                  <input
                    type="date"
                    required
                    value={payInstDate}
                    onChange={(e) => setPayInstDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                    Medio de Pago
                  </label>
                  <select
                    value={payInstMethod}
                    onChange={(e) => setPayInstMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                  >
                    {availablePaymentMethods.map((pm) => (
                      <option key={pm.code} value={pm.code}>
                        {pm.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                  N° Operación Bancaria / Voucher (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: OP-8492049"
                  value={payInstReceipt}
                  onChange={(e) => setPayInstReceipt(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                />
              </div>

              {/* Origen de Fondos para Pagar la Cuota */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-[#223a5e] uppercase tracking-wider">
                  Origen de Fondos para Pagar la Cuota *
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setPayInstFundingSource('PROPIO');
                      setPayInstFundingEntityName('');
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition cursor-pointer ${
                      payInstFundingSource === 'PROPIO'
                        ? 'bg-[#223a5e] text-white border-[#223a5e]'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <span>🏫 Caja Propia</span>
                      {metrics.fundsSummary?.propio?.isBlocked && (
                        <span className="px-1.5 py-0.2 rounded text-[8.5px] font-black uppercase bg-rose-500 text-white">
                          🔒 S/ 0
                        </span>
                      )}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayInstFundingSource('APORTE_SOCIO')}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition cursor-pointer ${
                      payInstFundingSource === 'APORTE_SOCIO'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    <span>💼 Aporte Socio / Promotor</span>
                  </button>
                </div>

                {payInstFundingSource === 'APORTE_SOCIO' && (
                  <input
                    type="text"
                    required
                    placeholder="Nombre del socio o promotor que asume la cuota *"
                    value={payInstFundingEntityName}
                    onChange={(e) => setPayInstFundingEntityName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                )}

                {payInstFundingSource === 'PROPIO' && metrics.fundsSummary?.propio?.isBlocked && (
                  <p className="text-[11px] text-rose-600 font-semibold bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                    🔒 Caja Propia bloqueada: El colegio no tiene ingresos propios recaudados (S/ 0.00). Selecciona Aporte de Socio para registrar este pago de cuota.
                  </p>
                )}
              </div>

              </div>

              <div className="flex justify-end gap-2 p-4 border-t border-slate-200 bg-slate-50 shrink-0">
                <button
                  type="button"
                  onClick={() => setPayInstallmentModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={payingInstallment || (payInstFundingSource === 'PROPIO' && Boolean(metrics.fundsSummary?.propio?.isBlocked))}
                  className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {payingInstallment ? (
                    <span className="inline-flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Procesando...
                    </span>
                  ) : (
                    'Confirmar Pago de Cuota'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CRONOGRAMA DE CUOTAS DEL PRÉSTAMO                                  */}
      {/* ========================================================================= */}
      {selectedLoanForSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-5 bg-[#223a5e] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-[#2fbf71]" />
                  <span>Cronograma: {selectedLoanForSchedule.loan_title}</span>
                </h3>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  {selectedLoanForSchedule.bank_name} &bull; Capital: {formatSoles(selectedLoanForSchedule.total_principal)} &bull; {selectedLoanForSchedule.total_installments} Cuotas
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLoanForAmortize(selectedLoanForSchedule);
                    setAmortizeAmount('');
                    setAmortizeReceipt('');
                    setAmortizeDate(new Date().toISOString().split('T')[0]);
                    setAmortizeModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition"
                  title="Abono extraordinario a capital para reducir cuotas o deuda"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Amortizar Capital</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLoanForReprogram(selectedLoanForSchedule);
                    const pendingCount = (selectedLoanForSchedule.installments || []).filter((i) => i.status === 'PENDING').length;
                    setReprogramNewInstallments(String(pendingCount || selectedLoanForSchedule.total_installments));
                    setReprogramNewAmount(String(selectedLoanForSchedule.monthly_installment_amount || ''));
                    setReprogramFirstDueDate(new Date().toISOString().split('T')[0]);
                    setReprogramNotes('');
                    setReprogramModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition"
                  title="Extender cuotas o pactar nuevo monto mensual con el banco"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reprogramar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLoanForSchedule(null)}
                  className="text-slate-400 hover:text-white cursor-pointer ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto no-scrollbar space-y-4">
              <div className="p-3 bg-blue-50/70 border border-blue-200/60 rounded-2xl text-[11px] text-blue-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Regla de Pagos:</span> Las cuotas deben amortizarse en <strong>orden correlativo estricto</strong>. Puedes hacer clic en el botón de edición (lápiz) de cualquier cuota pendiente para ajustar su monto o fecha de vencimiento si el banco aplicó una variación mensual.
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-4 w-16">Cuota</th>
                      <th className="py-2.5 px-4">Vencimiento</th>
                      <th className="py-2.5 px-4 font-mono">Monto</th>
                      <th className="py-2.5 px-4">Estado</th>
                      <th className="py-2.5 px-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(() => {
                      const firstPendingInst = (selectedLoanForSchedule.installments || []).find((i) => i.status === 'PENDING');
                      return (selectedLoanForSchedule.installments || []).map((inst) => {
                        const isPaid = inst.status === 'PAID';
                        const isNextPayable = !isPaid && inst.id === firstPendingInst?.id;

                        return (
                          <tr key={inst.id} className={`transition ${isNextPayable ? 'bg-emerald-50/40 hover:bg-emerald-50/70 font-semibold' : 'hover:bg-slate-50/70'}`}>
                            <td className="py-2.5 px-4 font-bold text-slate-700">#{inst.installment_number}</td>
                            <td className="py-2.5 px-4 font-mono font-medium text-slate-700">{formatDisplayDate(inst.due_date)}</td>
                            <td className="py-2.5 px-4 font-mono font-bold text-[#223a5e]">{formatSoles(inst.amount)}</td>
                            <td className="py-2.5 px-4">
                              {isPaid ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-[#26995b] text-[10px] font-bold">
                                  <Check className="w-3 h-3" /> Pagada ({formatDisplayDate(inst.paid_date)})
                                </span>
                              ) : isNextPayable ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                  Siguiente a Pagar
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-medium" title="Debes pagar las cuotas anteriores primero">
                                  En espera de cuota #{firstPendingInst?.installment_number}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              {!isPaid && (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedInstForEdit({ loanId: selectedLoanForSchedule.id, installment: inst });
                                      setEditInstAmount(String(inst.amount));
                                      setEditInstDueDate(inst.due_date || '');
                                      setEditInstallmentModalOpen(true);
                                    }}
                                    className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-[#223a5e] hover:bg-slate-100 transition cursor-pointer"
                                    title="Modificar monto o fecha de esta cuota"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>

                                  {isNextPayable ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedLoanForPay({ loan: selectedLoanForSchedule, installment: inst });
                                        setPayInstAmount(String(inst.amount));
                                        setPayInstDate(new Date().toISOString().split('T')[0]);
                                        setPayInstReceipt('');
                                        const isPropioBlocked = Boolean(metrics.fundsSummary?.propio?.isBlocked);
                                        setPayInstFundingSource(isPropioBlocked ? 'APORTE_SOCIO' : 'PROPIO');
                                        setPayInstFundingEntityName('');
                                        setPayInstallmentModalOpen(true);
                                      }}
                                      className="px-2.5 py-1 rounded-lg bg-[#2fbf71] hover:bg-[#26995b] text-white font-bold text-[10px] cursor-pointer shadow-xs transition"
                                    >
                                      Pagar
                                    </button>
                                  ) : (
                                    <span
                                      className="px-2 py-1 rounded-lg bg-slate-100 text-slate-400 font-bold text-[10px] cursor-not-allowed select-none"
                                      title="Debes pagar las cuotas en orden correlativo"
                                    >
                                      Bloqueada
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end shrink-0 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setSelectedLoanForSchedule(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cerrar Cronograma
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDITAR CUOTA INDIVIDUAL (MONTO O VENCIMIENTO)                      */}
      {/* ========================================================================= */}
      {editInstallmentModalOpen && selectedInstForEdit && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 relative z-[61]">
            <div className="px-6 py-4 bg-[#223a5e] text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-[#2fbf71]" />
                  <span>Editar Cuota #{selectedInstForEdit.installment.installment_number}</span>
                </h3>
                <p className="text-[11px] text-slate-300 mt-0.5">Ajusta el monto o fecha para esta cuota específica</p>
              </div>
              <button onClick={() => setEditInstallmentModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateInstallment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                  Monto de la Cuota (S/) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">S/</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    value={editInstAmount}
                    onChange={(e) => setEditInstAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold font-mono text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                  Fecha de Vencimiento *
                </label>
                <input
                  type="date"
                  required
                  value={editInstDueDate}
                  onChange={(e) => setEditInstDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditInstallmentModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updatingInstallment}
                  className="px-4 py-2 rounded-xl bg-[#2fbf71] hover:bg-[#26995b] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {updatingInstallment ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REPROGRAMAR / REFINANCIAR PRÉSTAMO                                 */}
      {/* ========================================================================= */}
      {reprogramModalOpen && selectedLoanForReprogram && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 relative z-[61]">
            <div className="px-6 py-4 bg-purple-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-purple-300" />
                  <span>Reprogramar / Refinanciar Préstamo</span>
                </h3>
                <p className="text-[11px] text-purple-200 mt-0.5">
                  {selectedLoanForReprogram.bank_name} &bull; {selectedLoanForReprogram.loan_title}
                </p>
              </div>
              <button onClick={() => setReprogramModalOpen(false)} className="text-purple-300 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReprogramLoan} className="p-6 space-y-4">
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl text-xs space-y-1">
                <p className="font-bold text-purple-950 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-purple-600" />
                  <span>Historial Contable Protegido</span>
                </p>
                <p className="text-purple-800 text-[11px]">
                  Las cuotas ya pagadas ({selectedLoanForReprogram.paid_installments_count || 0}) se mantendrán intactas en tu contabilidad. Las cuotas pendientes serán reemplazadas por el nuevo acuerdo pactado con el banco.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                    Nuevas Cuotas Restantes *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="120"
                    value={reprogramNewInstallments}
                    onChange={(e) => setReprogramNewInstallments(e.target.value)}
                    placeholder="Ej: 18"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                    Nuevo Monto Cuota (S/) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">S/</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0.01"
                      value={reprogramNewAmount}
                      onChange={(e) => setReprogramNewAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold font-mono text-slate-800 focus:outline-none focus:border-purple-600"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                  Primer Vencimiento del Nuevo Plan *
                </label>
                <input
                  type="date"
                  required
                  value={reprogramFirstDueDate}
                  onChange={(e) => setReprogramFirstDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                  Motivo / Nota del Banco (Opcional)
                </label>
                <input
                  type="text"
                  value={reprogramNotes}
                  onChange={(e) => setReprogramNotes(e.target.value)}
                  placeholder="Ej: Extensión de plazo acordada con sectorista"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-purple-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReprogramModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={reprogramming}
                  className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {reprogramming ? 'Reprogramando...' : 'Aplicar Reprogramación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: AMORTIZACIÓN EXTRAORDINARIA A CAPITAL                              */}
      {/* ========================================================================= */}
      {amortizeModalOpen && selectedLoanForAmortize && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 relative z-[61]">
            <div className="px-6 py-4 bg-amber-600 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-200 fill-current" />
                  <span>Amortización Extraordinaria a Capital</span>
                </h3>
                <p className="text-[11px] text-amber-100 mt-0.5">
                  {selectedLoanForAmortize.bank_name} &bull; {selectedLoanForAmortize.loan_title}
                </p>
              </div>
              <button onClick={() => setAmortizeModalOpen(false)} className="text-amber-200 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCapitalAmortization} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                    Monto a Amortizar (S/) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">S/</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0.01"
                      value={amortizeAmount}
                      onChange={(e) => setAmortizeAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold font-mono text-slate-800 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                    Fecha del Abono *
                  </label>
                  <input
                    type="date"
                    required
                    value={amortizeDate}
                    onChange={(e) => setAmortizeDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                    Medio de Pago *
                  </label>
                  <select
                    value={amortizeMethod}
                    onChange={(e) => setAmortizeMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-amber-500"
                  >
                    {availablePaymentMethods.map((pm) => (
                      <option key={pm.code} value={pm.code}>{pm.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                    N° Operación / Voucher
                  </label>
                  <input
                    type="text"
                    value={amortizeReceipt}
                    onChange={(e) => setAmortizeReceipt(e.target.value)}
                    placeholder="Ej: OP-982314"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#223a5e] mb-1.5 uppercase tracking-wider">
                  ¿Cómo deseas aplicar la amortización? *
                </label>
                <div className="space-y-2">
                  <label className={`flex items-start gap-2.5 p-3 rounded-2xl border cursor-pointer transition ${amortizeMode === 'REDUCE_TERM' ? 'border-amber-500 bg-amber-50/50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <input
                      type="radio"
                      name="amortize_mode"
                      checked={amortizeMode === 'REDUCE_TERM'}
                      onChange={() => setAmortizeMode('REDUCE_TERM')}
                      className="mt-0.5 text-amber-600"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Reducir plazo (Cancelar cuotas del final)</p>
                      <p className="text-[11px] text-slate-500">Cancela las últimas cuotas del cronograma para terminar de pagar el préstamo antes.</p>
                    </div>
                  </label>

                  <label className={`flex items-start gap-2.5 p-3 rounded-2xl border cursor-pointer transition ${amortizeMode === 'REDUCE_AMOUNT' ? 'border-amber-500 bg-amber-50/50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <input
                      type="radio"
                      name="amortize_mode"
                      checked={amortizeMode === 'REDUCE_AMOUNT'}
                      onChange={() => setAmortizeMode('REDUCE_AMOUNT')}
                      className="mt-0.5 text-amber-600"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Reducir cuota mensual</p>
                      <p className="text-[11px] text-slate-500">Mantiene el mismo número de meses pero baja el monto de cada cuota restante.</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAmortizeModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={amortizing}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {amortizing ? 'Registrando Abono...' : 'Registrar Amortización'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NUEVA INVERSIÓN & LOTE DE PRODUCTOS (CON CALCULADORA EN VIVO)      */}
      {/* ========================================================================= */}
      {createProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 py-5 bg-[#223a5e] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-sm font-bold">Registrar Producto & Lote de Inversión</h3>
                  <p className="text-[11px] text-slate-300">Calcula costos unitarios, proyecciones de ganancia y cronograma de pago</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateProductModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProductWithBatch} className="p-6 overflow-y-auto no-scrollbar space-y-5 text-xs">
              {/* Información General del Producto */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#223a5e] uppercase tracking-wider">1. Datos del Producto</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Nombre del Producto / Mercadería *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Libro de Razonamiento Matemático 4°, Polo Deportivo"
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Categoría *</label>
                    <select
                      value={prodCategory}
                      onChange={(e) => setProdCategory(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                    >
                      <option value="LIBROS">Libros & Textos</option>
                      <option value="UNIFORMES">Uniformes & Ropa</option>
                      <option value="MATERIALES">Materiales & Útiles</option>
                      <option value="OTROS">Otros Artículos</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Proveedor / Fabricante (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Ej: Editorial Santillana, Confecciones Lima"
                      value={prodSupplier}
                      onChange={(e) => setProdSupplier(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Código / SKU (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Ej: LIB-MAT-04, POLO-AZUL-M"
                      value={prodSku}
                      onChange={(e) => setProdSku(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                    />
                  </div>
                </div>
              </div>

              {/* Lote e Inversión */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold text-[#223a5e] uppercase tracking-wider">2. Inversión & Cálculo de Rentabilidad</h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Cantidad Comprada (Unids) *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="Ej: 100"
                      value={prodQuantity}
                      onChange={(e) => setProdQuantity(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#2fbf71]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Inversión Total del Lote (S/) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="Ej: 4000.00"
                      value={prodTotalInvestment}
                      onChange={(e) => setProdTotalInvestment(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#2fbf71]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Precio de Venta al Público (S/) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="Ej: 60.00"
                      value={prodSellingPrice}
                      onChange={(e) => setProdSellingPrice(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-[#223a5e] focus:outline-none focus:border-[#2fbf71]"
                    />
                  </div>
                </div>

                {/* Simulador de Rentabilidad en Vivo */}
                {(() => {
                  const qty = parseInt(prodQuantity, 10) || 0;
                  const inv = parseFloat(prodTotalInvestment) || 0;
                  const uCost = qty > 0 ? inv / qty : 0;
                  const sPrice = parseFloat(prodSellingPrice) || 0;
                  const uProfit = sPrice - uCost;
                  const marginPct = uCost > 0 ? ((uProfit / uCost) * 100).toFixed(1) : '0';
                  const totalRev = qty * sPrice;
                  const totalProf = qty * uProfit;

                  return (
                    <div className="p-3.5 rounded-2xl bg-cyan-50/70 border border-cyan-200 text-slate-800 space-y-2">
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1.5 text-cyan-900">
                          <Percent className="w-4 h-4 text-cyan-600" />
                          <span>Simulación en Tiempo Real de Ganancia</span>
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${uProfit >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          Margen: {marginPct}%
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-1 font-mono">
                        <div className="p-2 rounded-xl bg-white border border-cyan-100">
                          <span className="text-[10px] text-slate-400 block">Costo x Unidad</span>
                          <span className="text-xs font-bold text-slate-700">{formatSoles(uCost)}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-white border border-cyan-100">
                          <span className="text-[10px] text-slate-400 block">Ganancia x Unidad</span>
                          <span className={`text-xs font-black ${uProfit >= 0 ? 'text-[#26995b]' : 'text-rose-600'}`}>
                            {uProfit >= 0 ? '+' : ''}{formatSoles(uProfit)}
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-white border border-cyan-100">
                          <span className="text-[10px] text-slate-400 block">Recaudación Total</span>
                          <span className="text-xs font-bold text-blue-700">{formatSoles(totalRev)}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-white border border-cyan-100">
                          <span className="text-[10px] text-slate-400 block">Ganancia Neta Total</span>
                          <span className={`text-xs font-black ${totalProf >= 0 ? 'text-[#26995b]' : 'text-rose-600'}`}>
                            {totalProf >= 0 ? '+' : ''}{formatSoles(totalProf)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Plan de Pago de la Inversión (1, 2 o 3 partes) */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-[#223a5e] uppercase tracking-wider">3. Modalidad de Pago de la Inversión</h4>
                  <span className="text-[11px] text-slate-400">¿Cómo le pagarás al proveedor?</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setProdPaymentParts('1')}
                    className={`py-2 px-3 rounded-xl border text-center font-bold text-xs cursor-pointer transition ${
                      prodPaymentParts === '1' ? 'bg-[#223a5e] text-white border-[#223a5e]' : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    1 Pago (Contado)
                  </button>
                  <button
                    type="button"
                    onClick={() => setProdPaymentParts('2')}
                    className={`py-2 px-3 rounded-xl border text-center font-bold text-xs cursor-pointer transition ${
                      prodPaymentParts === '2' ? 'bg-[#223a5e] text-white border-[#223a5e]' : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    2 Partes (50% / 50%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setProdPaymentParts('3')}
                    className={`py-2 px-3 rounded-xl border text-center font-bold text-xs cursor-pointer transition ${
                      prodPaymentParts === '3' ? 'bg-[#223a5e] text-white border-[#223a5e]' : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    3 Partes (En 3 cuotas)
                  </button>
                </div>

                {/* Fechas de Vencimiento de las Partes */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Parte 1 {prodPaymentParts !== '1' && `(S/ ${(parseFloat(prodTotalInvestment) / parseInt(prodPaymentParts, 10) || 0).toFixed(2)})`}
                    </label>
                    <input
                      type="date"
                      required
                      value={prodPart1DueDate}
                      onChange={(e) => setProdPart1DueDate(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                    />
                  </div>

                  {parseInt(prodPaymentParts, 10) >= 2 && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Parte 2 (S/ {(parseFloat(prodTotalInvestment) / parseInt(prodPaymentParts, 10) || 0).toFixed(2)})
                      </label>
                      <input
                        type="date"
                        required
                        value={prodPart2DueDate}
                        onChange={(e) => setProdPart2DueDate(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                      />
                    </div>
                  )}

                  {parseInt(prodPaymentParts, 10) === 3 && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Parte 3 (S/ {(parseFloat(prodTotalInvestment) / 3 || 0).toFixed(2)})
                      </label>
                      <input
                        type="date"
                        required
                        value={prodPart3DueDate}
                        onChange={(e) => setProdPart3DueDate(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                      />
                    </div>
                  )}
                </div>

                {/* Checkbox para pagar la primera parte ahora mismo */}
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={prodPayFirstNow}
                      onChange={(e) => setProdPayFirstNow(e.target.checked)}
                      className="rounded text-[#2fbf71] focus:ring-[#2fbf71] w-4 h-4 cursor-pointer"
                    />
                    <span>¿Pagar la 1ra cuota ahora mismo y registrar la salida en caja chica / banco?</span>
                  </label>

                  {prodPayFirstNow && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Medio de Pago</label>
                        <select
                          value={prodFirstPaymentMethod}
                          onChange={(e) => setProdFirstPaymentMethod(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                        >
                          {availablePaymentMethods.map((pm) => (
                            <option key={pm.code} value={pm.code}>
                              {pm.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">N° Operación / Factura Proveedor</label>
                        <input
                          type="text"
                          placeholder="Ej: F001-00281"
                          value={prodFirstPaymentReceipt}
                          onChange={(e) => setProdFirstPaymentReceipt(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                        />
                      </div>

                      <div className="sm:col-span-2 pt-2 border-t border-emerald-200/60 space-y-2">
                        <label className="block text-[11px] font-bold text-[#223a5e] uppercase">
                          Origen de Fondos para esta Inversión *
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
                          <button
                            type="button"
                            onClick={() => {
                              setProdFundingSource('PROPIO');
                              setProdFundingLoanId('');
                              setProdFundingEntityName('');
                            }}
                            className={`p-2 rounded-xl border text-center text-[10.5px] font-bold transition cursor-pointer ${
                              prodFundingSource === 'PROPIO'
                                ? 'bg-[#223a5e] text-white border-[#223a5e]'
                                : 'bg-white text-slate-700 border-slate-200'
                            }`}
                          >
                            <span className="flex items-center justify-center gap-1">
                              <span>🏫 Caja Propia</span>
                              {metrics.fundsSummary?.propio?.isBlocked && (
                                <span className="px-1 py-0.2 rounded text-[8.5px] font-black uppercase bg-rose-500 text-white">
                                  🔒
                                </span>
                              )}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setProdFundingSource('PRESTAMO_BANCARIO')}
                            className={`p-2 rounded-xl border text-center text-[10.5px] font-bold transition cursor-pointer ${
                              prodFundingSource === 'PRESTAMO_BANCARIO'
                                ? 'bg-purple-700 text-white border-purple-700'
                                : 'bg-white text-slate-700 border-slate-200'
                            }`}
                          >
                            🏦 Préstamo
                          </button>
                          <button
                            type="button"
                            onClick={() => setProdFundingSource('PRESTAMISTA')}
                            className={`p-2 rounded-xl border text-center text-[10.5px] font-bold transition cursor-pointer ${
                              prodFundingSource === 'PRESTAMISTA'
                                ? 'bg-amber-600 text-white border-amber-600'
                                : 'bg-white text-slate-700 border-slate-200'
                            }`}
                          >
                            🤝 Prestamista
                          </button>
                          <button
                            type="button"
                            onClick={() => setProdFundingSource('APORTE_SOCIO')}
                            className={`p-2 rounded-xl border text-center text-[10.5px] font-bold transition cursor-pointer ${
                              prodFundingSource === 'APORTE_SOCIO'
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-slate-700 border-slate-200'
                            }`}
                          >
                            💼 Aporte Socio
                          </button>
                        </div>

                        {prodPayFirstNow && prodFundingSource === 'PROPIO' && metrics.fundsSummary?.propio?.isBlocked && (
                          <p className="text-[11px] text-rose-600 font-semibold bg-rose-50 p-2 rounded-xl border border-rose-200">
                            🔒 Caja Propia bloqueada: El colegio no tiene ingresos recaudados (S/ 0.00). Selecciona Préstamo Bancario o Aporte de Socio.
                          </p>
                        )}

                        {prodFundingSource === 'PRESTAMO_BANCARIO' && (
                          <select
                            value={prodFundingLoanId}
                            onChange={(e) => setProdFundingLoanId(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-purple-300 rounded-xl text-xs font-semibold text-purple-950"
                          >
                            <option value="">-- Seleccionar Préstamo Bancario --</option>
                            {bankLoans
                              .filter((l) => l.status === 'ACTIVE')
                              .map((l) => {
                                const avail = typeof l.available_balance === 'number' ? l.available_balance : l.total_principal;
                                return (
                                  <option key={l.id} value={l.id}>
                                    {l.bank_name} - {l.loan_title} (Disponible: {formatSoles(avail)})
                                  </option>
                                );
                              })}
                          </select>
                        )}

                        {(prodFundingSource === 'PRESTAMISTA' || prodFundingSource === 'APORTE_SOCIO') && (
                          <input
                            type="text"
                            placeholder={prodFundingSource === 'APORTE_SOCIO' ? 'Nombre del socio o promotor' : 'Nombre del prestamista'}
                            value={prodFundingEntityName}
                            onChange={(e) => setProdFundingEntityName(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingProduct || (prodPayFirstNow && prodFundingSource === 'PROPIO' && Boolean(metrics.fundsSummary?.propio?.isBlocked))}
                  className="px-5 py-2 rounded-xl bg-[#2fbf71] hover:bg-[#26995b] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {savingProduct ? (
                    <span className="inline-flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Registrando...
                    </span>
                  ) : (
                    'Confirmar Inversión & Guardar Producto'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REGISTRAR VENTA / DESPACHO DE PRODUCTO EN VENTANILLA               */}
      {/* ========================================================================= */}
      {recordSaleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md max-h-[90vh] bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-auto">
            <div className="px-6 py-5 bg-[#2fbf71] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                <h3 className="text-sm font-bold">Registrar Venta / Despacho</h3>
              </div>
              <button
                type="button"
                onClick={() => setRecordSaleModalOpen(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordSale} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">Producto *</label>
                <select
                  value={selectedProductForSale?.id || ''}
                  onChange={(e) => {
                    const found = products.find((p) => p.id === e.target.value);
                    if (found) {
                      setSelectedProductForSale(found);
                      setSaleUnitPrice(String(found.selling_price));
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} &bull; Stock: {p.current_stock} unids &bull; P. Venta: {formatSoles(p.selling_price)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                    Cantidad a Vender *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedProductForSale?.current_stock || 1}
                    required
                    value={saleQuantity}
                    onChange={(e) => setSaleQuantity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#2fbf71]"
                  />
                  {selectedProductForSale && (
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Disponible: {selectedProductForSale.current_stock} unids</span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                    Precio Unitario (S/) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={saleUnitPrice}
                    onChange={(e) => setSaleUnitPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#2fbf71]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                    Alumno / Apoderado
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Daniel Rojas"
                    value={saleStudentName}
                    onChange={(e) => setSaleStudentName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">Medio</label>
                  <select
                    value={salePaymentMethod}
                    onChange={(e) => setSalePaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                  >
                    {availablePaymentMethods.map((pm) => (
                      <option key={pm.code} value={pm.code}>
                        {pm.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                    Fecha de Venta *
                  </label>
                  <input
                    type="date"
                    required
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                    N° Comprobante (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: VEN-012"
                    value={saleReceiptNumber}
                    onChange={(e) => setSaleReceiptNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                  />
                </div>
              </div>

              {salePaymentMethod === 'EFECTIVO' && !activeShift && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Nota: La caja de ventanilla está cerrada actualmente. Puedes abrir turno para incluir este cobro en efectivo en el arqueo del día.
                  </span>
                </div>
              )}

              {/* Resumen de la venta */}
              {(() => {
                const q = parseInt(saleQuantity, 10) || 0;
                const p = parseFloat(saleUnitPrice) || 0;
                const c = selectedProductForSale?.unit_cost || 0;
                const total = q * p;
                const cost = q * c;
                const profit = total - cost;

                return (
                  <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 font-mono space-y-1">
                    <div className="flex justify-between text-slate-700">
                      <span>Total a Cobrar:</span>
                      <strong className="text-sm text-emerald-800">{formatSoles(total)}</strong>
                    </div>
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>Costo de Mercadería:</span>
                      <span>-{formatSoles(cost)}</span>
                    </div>
                    <div className="flex justify-between border-t border-emerald-200/60 pt-1 text-emerald-900 font-bold">
                      <span>Ganancia Neta en Caja:</span>
                      <span>+{formatSoles(profit)}</span>
                    </div>
                  </div>
                );
              })()}

              </div>

              <div className="flex justify-end gap-2 p-4 border-t border-slate-200 bg-slate-50 shrink-0">
                <button
                  type="button"
                  onClick={() => setRecordSaleModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingSale}
                  className="px-5 py-2 rounded-xl bg-[#2fbf71] hover:bg-[#26995b] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {savingSale ? (
                    <span className="inline-flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Registrando...
                    </span>
                  ) : (
                    'Confirmar Venta & Despacho'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CRONOGRAMA DE LOTES & CUOTAS DE INVERSIÓN                         */}
      {/* ========================================================================= */}
      {batchesModalOpen && selectedProductForBatches && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
            <div className="px-6 py-5 bg-[#223a5e] text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Package className="w-4 h-4 text-cyan-400" />
                  <span>Lotes de Inversión: {selectedProductForBatches.name}</span>
                </h3>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Stock actual: {selectedProductForBatches.current_stock} unids &bull; Costo unitario: {formatSoles(selectedProductForBatches.unit_cost)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBatchesModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto no-scrollbar space-y-5 text-xs">
              {selectedProductForBatches.batches.length === 0 ? (
                <div className="py-8 text-center text-slate-400">No hay lotes registrados para este producto.</div>
              ) : (
                selectedProductForBatches.batches.map((b, idx) => (
                  <div key={b.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex justify-between items-center text-xs border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#223a5e]">Lote #{idx + 1}</span>
                        {b.supplier_name && <span className="text-slate-500">&bull; {b.supplier_name}</span>}
                      </div>
                      <span className="font-mono text-slate-500">
                        {b.quantity} unids &bull; Inversión: <strong className="text-slate-800">{formatSoles(b.total_investment)}</strong>
                      </span>
                    </div>

                    {/* Cuotas de la Inversión */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                            <th className="py-2 px-3">Cuota</th>
                            <th className="py-2 px-3">Vencimiento</th>
                            <th className="py-2 px-3 font-mono">Monto</th>
                            <th className="py-2 px-3">Estado</th>
                            <th className="py-2 px-3 text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {b.payments.map((pmt) => {
                            const isPaid = pmt.status === 'PAID';
                            return (
                              <tr key={pmt.id} className="hover:bg-slate-50/60 transition">
                                <td className="py-2.5 px-3 font-bold text-slate-700">Parte {pmt.part_number}</td>
                                <td className="py-2.5 px-3 font-mono font-medium text-slate-700">{formatDisplayDate(pmt.due_date)}</td>
                                <td className="py-2.5 px-3 font-mono font-bold text-[#223a5e]">{formatSoles(pmt.amount)}</td>
                                <td className="py-2.5 px-3">
                                  {isPaid ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-[#26995b] text-[10px] font-bold">
                                      <Check className="w-3 h-3" /> Pagado ({formatDisplayDate(pmt.paid_date)})
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold">
                                      Pendiente
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  {!isPaid && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedBatchPaymentForPay({
                                          product: selectedProductForBatches,
                                          batch: b,
                                          payment: pmt,
                                        });
                                        setPayBatchPartDate(new Date().toISOString().split('T')[0]);
                                        setPayBatchPartReceipt('');
                                        const isPropioBlocked = Boolean(metrics.fundsSummary?.propio?.isBlocked);
                                        const activeLoanWithBal = bankLoans.find(
                                          (l) => l.status === 'ACTIVE' && (Number(l.available_balance ?? l.total_principal) > 0)
                                        );
                                        if (isPropioBlocked) {
                                          if (activeLoanWithBal) {
                                            setPayBatchPartFundingSource('PRESTAMO_BANCARIO');
                                            setPayBatchPartFundingLoanId(activeLoanWithBal.id);
                                          } else {
                                            setPayBatchPartFundingSource('APORTE_SOCIO');
                                          }
                                        } else {
                                          setPayBatchPartFundingSource('PROPIO');
                                          setPayBatchPartFundingLoanId('');
                                        }
                                        setPayBatchPartModalOpen(true);
                                      }}
                                      className="px-2.5 py-1 rounded-lg bg-[#2fbf71] hover:bg-[#26995b] text-white font-bold text-[10px] cursor-pointer"
                                    >
                                      Pagar Cuota
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end shrink-0 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setBatchesModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PAGAR CUOTA DE INVERSIÓN A PROVEEDOR                               */}
      {/* ========================================================================= */}
      {payBatchPartModalOpen && selectedBatchPaymentForPay && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col relative z-[61]">
            <div className="px-6 py-5 bg-[#223a5e] text-white flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold">Pagar Cuota de Inversión</h3>
              <button
                type="button"
                onClick={() => setPayBatchPartModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePayBatchPart} className="p-6 space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Producto:</span>
                  <strong className="text-slate-800">{selectedBatchPaymentForPay.product.name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cuota:</span>
                  <span className="font-semibold">Parte {selectedBatchPaymentForPay.payment.part_number} de {selectedBatchPaymentForPay.batch.payment_plan_parts}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-700 font-bold">Monto a Descontar:</span>
                  <strong className="text-sm font-mono text-rose-600">{formatSoles(selectedBatchPaymentForPay.payment.amount)}</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">Fecha de Pago *</label>
                  <input
                    type="date"
                    required
                    value={payBatchPartDate}
                    onChange={(e) => setPayBatchPartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">Medio</label>
                  <select
                    value={payBatchPartMethod}
                    onChange={(e) => setPayBatchPartMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    {availablePaymentMethods.map((pm) => (
                      <option key={pm.code} value={pm.code}>
                        {pm.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                  N° Operación / Voucher (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: OP-982348"
                  value={payBatchPartReceipt}
                  onChange={(e) => setPayBatchPartReceipt(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                />
              </div>

              {/* Origen de Fondos */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="block text-[11px] font-bold text-[#223a5e] uppercase tracking-wider">
                  Origen de Fondos (¿De dónde sale el dinero?) *
                </label>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setPayBatchPartFundingSource('PROPIO');
                      setPayBatchPartFundingLoanId('');
                      setPayBatchPartFundingEntityName('');
                    }}
                    className={`p-2 rounded-xl border text-center text-[10.5px] font-bold transition cursor-pointer ${
                      payBatchPartFundingSource === 'PROPIO'
                        ? 'bg-[#223a5e] text-white border-[#223a5e]'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    <span className="flex items-center justify-center gap-1">
                      <span>🏫 Caja Propia</span>
                      {metrics.fundsSummary?.propio?.isBlocked && (
                        <span className="px-1 py-0.2 rounded text-[8.5px] font-black uppercase bg-rose-500 text-white">
                          🔒
                        </span>
                      )}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayBatchPartFundingSource('PRESTAMO_BANCARIO')}
                    className={`p-2 rounded-xl border text-center text-[10.5px] font-bold transition cursor-pointer ${
                      payBatchPartFundingSource === 'PRESTAMO_BANCARIO'
                        ? 'bg-purple-700 text-white border-purple-700'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    🏦 Préstamo
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayBatchPartFundingSource('PRESTAMISTA')}
                    className={`p-2 rounded-xl border text-center text-[10.5px] font-bold transition cursor-pointer ${
                      payBatchPartFundingSource === 'PRESTAMISTA'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    🤝 Prestamista
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayBatchPartFundingSource('APORTE_SOCIO')}
                    className={`p-2 rounded-xl border text-center text-[10.5px] font-bold transition cursor-pointer ${
                      payBatchPartFundingSource === 'APORTE_SOCIO'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    💼 Aporte Socio
                  </button>
                </div>

                {payBatchPartFundingSource === 'PROPIO' && metrics.fundsSummary?.propio?.isBlocked && (
                  <p className="text-[11px] text-rose-600 font-semibold bg-rose-50 p-2 rounded-xl border border-rose-200">
                    🔒 Caja Propia bloqueada: El colegio no tiene ingresos recaudados (S/ 0.00). Selecciona Préstamo Bancario o Aporte de Socio.
                  </p>
                )}

                {payBatchPartFundingSource === 'PRESTAMO_BANCARIO' && (
                  <select
                    value={payBatchPartFundingLoanId}
                    onChange={(e) => setPayBatchPartFundingLoanId(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-purple-300 rounded-xl text-xs font-semibold text-purple-950"
                  >
                    <option value="">-- Seleccionar Préstamo Bancario --</option>
                    {bankLoans
                      .filter((l) => l.status === 'ACTIVE')
                      .map((l) => {
                        const avail = typeof l.available_balance === 'number' ? l.available_balance : l.total_principal;
                        return (
                          <option key={l.id} value={l.id}>
                            {l.bank_name} - {l.loan_title} (Disponible: {formatSoles(avail)})
                          </option>
                        );
                      })}
                  </select>
                )}

                {(payBatchPartFundingSource === 'PRESTAMISTA' || payBatchPartFundingSource === 'APORTE_SOCIO') && (
                  <input
                    type="text"
                    placeholder={payBatchPartFundingSource === 'APORTE_SOCIO' ? 'Nombre del socio/promotor' : 'Nombre del prestamista'}
                    value={payBatchPartFundingEntityName}
                    onChange={(e) => setPayBatchPartFundingEntityName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                  />
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPayBatchPartModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={payingBatchPart || (payBatchPartFundingSource === 'PROPIO' && Boolean(metrics.fundsSummary?.propio?.isBlocked))}
                  className="px-5 py-2 rounded-xl bg-[#2fbf71] hover:bg-[#26995b] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {payingBatchPart ? (
                    <span className="inline-flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Pagando...
                    </span>
                  ) : (
                    'Confirmar Pago de Cuota'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADMINISTRADOR DE CATEGORÍAS FINANCIERAS (EDICIÓN Y ELIMINACIÓN)    */}
      {/* ========================================================================= */}
      {categoriesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 bg-[#223a5e] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-[#2fbf71]" />
                <div>
                  <h3 className="text-sm font-bold">Categorías de Ingresos y Gastos</h3>
                  <p className="text-[11px] text-slate-300">Crea, edita o elimina las categorías para clasificar tus movimientos</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  handleCancelEditCategory();
                  setCategoriesModalOpen(false);
                }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto no-scrollbar space-y-5">
              {/* Formulario para Crear o Editar Categoría */}
              <form onSubmit={handleSaveCategory} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-[#223a5e] uppercase tracking-wider flex items-center gap-1.5">
                    {editingCategory ? (
                      <>
                        <Edit2 className="w-4 h-4 text-blue-600" />
                        <span>Editar Categoría: {editingCategory.name}</span>
                      </>
                    ) : (
                      <>
                        <PlusCircle className="w-4 h-4 text-[#2fbf71]" />
                        <span>Crear Nueva Categoría</span>
                      </>
                    )}
                  </p>
                  {editingCategory && (
                    <button
                      type="button"
                      onClick={handleCancelEditCategory}
                      className="text-[11px] text-slate-500 hover:text-slate-700 underline cursor-pointer"
                    >
                      Cancelar edición
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Nombre *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Venta de Libros, Uniformes, Robótica"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Tipo *</label>
                    <select
                      value={newCatType}
                      onChange={(e) => setNewCatType(e.target.value as TransactionType)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                    >
                      <option value="EXPENSE">Gasto</option>
                      <option value="INCOME">Ingreso</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Descripción (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Breve detalle sobre qué incluye esta categoría"
                    value={newCatDescription}
                    onChange={(e) => setNewCatDescription(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  {editingCategory && (
                    <button
                      type="button"
                      onClick={handleCancelEditCategory}
                      className="px-3 py-2 rounded-xl border border-slate-300 text-slate-600 text-xs font-bold hover:bg-slate-100 cursor-pointer"
                    >
                      Descartar
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={savingCategory}
                    className={`px-4 py-2 rounded-xl text-white text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1.5 ${
                      editingCategory ? 'bg-blue-600 hover:bg-blue-700' : 'bg-[#2fbf71] hover:bg-[#26995b]'
                    }`}
                  >
                    {savingCategory ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : editingCategory ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <PlusCircle className="w-3.5 h-3.5" />
                    )}
                    <span>{savingCategory ? 'Guardando...' : editingCategory ? 'Actualizar Categoría' : 'Guardar Categoría'}</span>
                  </button>
                </div>
              </form>

              {/* Lista de Categorías Existentes */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Categorías Registradas ({categories.length})
                  </span>
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                  {categories.map((cat) => {
                    const isIncome = cat.type === 'INCOME';
                    const isBeingEdited = editingCategory?.id === cat.id;
                    return (
                      <div
                        key={cat.id}
                        className={`p-3 hover:bg-slate-50 transition flex items-center justify-between gap-3 text-xs ${
                          isBeingEdited ? 'bg-blue-50/60' : ''
                        }`}
                      >
                        <div className="min-w-0 flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                              isIncome
                                ? 'bg-emerald-50 text-[#26995b] border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {isIncome ? 'Ingreso' : 'Gasto'}
                          </span>
                          <span className="font-bold text-[#223a5e] truncate">{cat.name}</span>
                          {cat.description && (
                            <span className="text-[11px] text-slate-400 truncate hidden sm:inline">&bull; {cat.description}</span>
                          )}
                          {cat.is_default && (
                            <span className="text-[9px] text-slate-400 font-semibold px-1.5 py-0.2 rounded bg-slate-100 hidden sm:inline">
                              Defecto
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEditCategory(cat)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                            title="Editar nombre o tipo de categoría"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDeleteModal({
                                isOpen: true,
                                itemType: 'category',
                                category: cat,
                              })
                            }
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Eliminar categoría"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end shrink-0 bg-slate-50/50">
              <button
                type="button"
                onClick={() => {
                  handleCancelEditCategory();
                  setCategoriesModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REPORTE & ANÁLISIS MENSUAL (LO PRODUCIDO VS LO INVERTIDO)          */}
      {/* ========================================================================= */}
      {monthlyReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-4xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header del Modal */}
            <div className="px-6 py-4 bg-[#223a5e] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-400/30">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <span>Análisis Mensual: Lo Producido vs Lo Invertido</span>
                  </h3>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    {monthlyReportData?.periodLabel || `Periodo: ${reportSelectedMonth || selectedMonth || currentMonthStr}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-700">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="month"
                    value={reportSelectedMonth}
                    onChange={(e) => {
                      setReportSelectedMonth(e.target.value);
                      fetchMonthlyReport(e.target.value);
                    }}
                    className="bg-transparent text-xs text-white font-semibold focus:outline-none cursor-pointer"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const url = `/api/finances/export?month=${reportSelectedMonth || ''}`;
                    window.location.href = url;
                    onNotify({ type: 'info', title: 'Exportación', message: 'Descargando reporte oficial del mes...' });
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#2fbf71] hover:bg-[#26995b] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Descargar reporte mensual para Excel"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Excel</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMonthlyReportModalOpen(false)}
                  className="text-slate-400 hover:text-white cursor-pointer ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Contenido Scrolleable */}
            <div className="p-6 overflow-y-auto no-scrollbar space-y-5 text-xs">
              {loadingMonthlyReport ? (
                <div className="py-16 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#2fbf71]" />
                  <p className="text-xs font-semibold text-slate-600">Calculando balance del 01 al fin de mes...</p>
                </div>
              ) : !monthlyReportData || !monthlyReportData.diagnosis ? (
                <div className="py-12 text-center text-slate-400 space-y-3">
                  <p>No se pudo cargar la información para este periodo.</p>
                  <button
                    type="button"
                    onClick={() => fetchMonthlyReport(reportSelectedMonth || selectedMonth || currentMonthStr)}
                    className="px-3.5 py-2 rounded-xl bg-[#223a5e] text-white text-xs font-bold transition hover:bg-[#1a2c47] cursor-pointer"
                  >
                    Reintentar Análisis
                  </button>
                </div>
              ) : (
                <>
                  {/* 1. Diagnóstico Ejecutivo: ¿El colegio está surgiendo? */}
                  <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    monthlyReportData.diagnosis?.status === 'EXCELLENT'
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                      : monthlyReportData.diagnosis?.status === 'GOOD'
                      ? 'bg-blue-50/70 border-blue-200 text-blue-950'
                      : monthlyReportData.diagnosis?.status === 'NEUTRAL'
                      ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                      : 'bg-rose-50/70 border-rose-200 text-rose-950'
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                        monthlyReportData.diagnosis?.status === 'EXCELLENT'
                          ? 'bg-emerald-600 text-white'
                          : monthlyReportData.diagnosis?.status === 'GOOD'
                          ? 'bg-blue-600 text-white'
                          : monthlyReportData.diagnosis?.status === 'NEUTRAL'
                          ? 'bg-amber-600 text-white'
                          : 'bg-rose-600 text-white'
                      }`}>
                        {monthlyReportData.diagnosis?.status === 'EXCELLENT' && <Award className="w-5 h-5" />}
                        {monthlyReportData.diagnosis?.status === 'GOOD' && <TrendingUp className="w-5 h-5" />}
                        {monthlyReportData.diagnosis?.status === 'NEUTRAL' && <Info className="w-5 h-5" />}
                        {monthlyReportData.diagnosis?.status === 'WARNING' && <AlertTriangle className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-black">{monthlyReportData.diagnosis?.title || 'Diagnóstico Financiero'}</h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/80 border border-current">
                            Diagnóstico del Mes
                          </span>
                        </div>
                        <p className="text-[11px] mt-1 text-slate-700 leading-relaxed max-w-xl">
                          {monthlyReportData.diagnosis?.explanation}
                        </p>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-500">Resultado Operativo Real</span>
                      <span className={`text-xl font-black font-mono ${(monthlyReportData.summary?.operatingResult || 0) >= 0 ? 'text-[#26995b]' : 'text-rose-600'}`}>
                        {formatSoles(monthlyReportData.summary?.operatingResult || 0)}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase mt-0.5 ${
                        (monthlyReportData.summary?.operatingResult || 0) >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {(monthlyReportData.summary?.operatingResult || 0) >= 0 ? 'Superávit Operativo' : 'Déficit Operativo'}
                      </span>
                    </div>
                  </div>

                  {/* 2. Resumen Métrico de Tres Cifras */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80">
                      <div className="flex items-center justify-between text-[11px] text-emerald-800 font-bold uppercase">
                        <span>Lo Producido por el Colegio</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full">Producción</span>
                      </div>
                      <p className="text-xl font-black text-[#26995b] font-mono mt-1">
                        {formatSoles(monthlyReportData.summary?.totalProducedReal || 0)}
                      </p>
                      <p className="text-[10px] text-emerald-700 mt-0.5">
                        Matrículas, cuotas, pensiones y ventas (sin préstamos)
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200/80">
                      <div className="flex items-center justify-between text-[11px] text-rose-800 font-bold uppercase">
                        <span>Total Invertido & Gastado</span>
                        <span className="text-[10px] bg-rose-100 text-rose-900 px-2 py-0.5 rounded-full">Desembolsado</span>
                      </div>
                      <p className="text-xl font-black text-rose-600 font-mono mt-1">
                        {formatSoles(monthlyReportData.summary?.totalInvestedReal || 0)}
                      </p>
                      <p className="text-[10px] text-rose-700 mt-0.5">
                        Compras lotes, planilla, servicios y deuda
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200/80">
                      <div className="flex items-center justify-between text-[11px] text-purple-900 font-bold uppercase">
                        <span>Resultado Operativo Real</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          (monthlyReportData.summary?.operatingResult || 0) >= 0 ? 'bg-purple-100 text-purple-900' : 'bg-rose-100 text-rose-900'
                        }`}>
                          {(monthlyReportData.summary?.operatingResult || 0) >= 0 ? 'Superávit' : 'Déficit'}
                        </span>
                      </div>
                      <p className={`text-xl font-black font-mono mt-1 ${(monthlyReportData.summary?.operatingResult || 0) >= 0 ? 'text-purple-900' : 'text-rose-600'}`}>
                        {formatSoles(monthlyReportData.summary?.operatingResult || 0)}
                      </p>
                      <p className="text-[10px] text-purple-700 mt-0.5">
                        Producción propia menos egresos e inversiones
                      </p>
                    </div>
                  </div>

                  {/* Tarjeta de Recuperación de Inversión en Mercadería */}
                  {monthlyReportData.merchandiseRecovery && (monthlyReportData.merchandiseRecovery.investedInBatches > 0 || monthlyReportData.merchandiseRecovery.totalSales > 0) && (
                    <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-amber-700 shrink-0" />
                        <div>
                          <span className="font-bold text-amber-950">Recuperación de Inversión en Mercadería: </span>
                          <span className="text-slate-600">
                            Invertido en compras: <strong className="font-mono text-slate-800">{formatSoles(monthlyReportData.merchandiseRecovery.investedInBatches)}</strong> &bull; Ventas cobradas: <strong className="font-mono text-slate-800">{formatSoles(monthlyReportData.merchandiseRecovery.totalSales)}</strong>
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {monthlyReportData.merchandiseRecovery.isFullyRecovered ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                            <Check className="w-3.5 h-3.5" /> Inversión 100% Recuperada (+{formatSoles(monthlyReportData.merchandiseRecovery.recoveryGap)} utilidad)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                            Faltan {formatSoles(Math.abs(monthlyReportData.merchandiseRecovery.recoveryGap))} por vender ({monthlyReportData.merchandiseRecovery.recoveryPercent}% recuperado)
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tarjeta Informativa de Financiamiento Externo (Préstamos Bancarios) */}
                  {monthlyReportData.financing && monthlyReportData.financing.loansReceived > 0 && (
                    <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <Landmark className="w-4 h-4 text-purple-700 shrink-0" />
                        <div>
                          <div className="font-bold text-purple-950 flex items-center gap-1.5">
                            <span>Financiamiento Bancario Recibido:</span>
                            <span className="font-mono font-bold text-purple-900">+{formatSoles(monthlyReportData.financing.loansReceived)}</span>
                          </div>
                          <p className="text-[11px] text-purple-700 mt-0.5">
                            Este monto ingresó por desembolso de crédito bancario. <strong>No es producción del colegio</strong> (es deuda a pagar con intereses).
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-purple-700 block">Saldo Final en Bancos/Caja:</span>
                        <span className="font-mono font-bold text-slate-800 text-sm">{formatSoles(monthlyReportData.summary.netCashBalance)}</span>
                      </div>
                    </div>
                  )}

                  {/* Tarjeta: Origen de Fondos de los Gastos e Inversiones del Mes */}
                  {monthlyReportData.fundingBreakdown && (
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                        <span className="font-bold text-[#223a5e] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                          <span>🔍 Trazabilidad Financiera: ¿De dónde salió el dinero gastado en el mes?</span>
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">Sustento Contable</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                          <span className="text-[10px] text-slate-400 block font-semibold">🏫 Caja Propia</span>
                          <strong className="text-xs font-mono text-emerald-800">
                            {formatSoles(monthlyReportData.fundingBreakdown.operating?.amount || 0)}
                          </strong>
                          <span className="text-[9.5px] text-slate-400 block mt-0.5">
                            {monthlyReportData.fundingBreakdown.operating?.count || 0} movimientos
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                          <span className="text-[10px] text-slate-400 block font-semibold">🏦 Préstamos Bancarios</span>
                          <strong className="text-xs font-mono text-purple-900">
                            {formatSoles(monthlyReportData.fundingBreakdown.bankLoans?.amount || 0)}
                          </strong>
                          <span className="text-[9.5px] text-slate-400 block mt-0.5">
                            {monthlyReportData.fundingBreakdown.bankLoans?.count || 0} movimientos
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                          <span className="text-[10px] text-slate-400 block font-semibold">🤝 Prestamistas Terceros</span>
                          <strong className="text-xs font-mono text-amber-900">
                            {formatSoles(monthlyReportData.fundingBreakdown.lenders?.amount || 0)}
                          </strong>
                          <span className="text-[9.5px] text-slate-400 block mt-0.5">
                            {monthlyReportData.fundingBreakdown.lenders?.count || 0} movimientos
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                          <span className="text-[10px] text-slate-400 block font-semibold">💼 Aportes de Socios</span>
                          <strong className="text-xs font-mono text-blue-900">
                            {formatSoles(monthlyReportData.fundingBreakdown.partners?.amount || 0)}
                          </strong>
                          <span className="text-[9.5px] text-slate-400 block mt-0.5">
                            {monthlyReportData.fundingBreakdown.partners?.count || 0} movimientos
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. Las Dos Columnas Enfrentadas: LO PRODUCIDO vs LO INVERTIDO */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* COLUMNA IZQUIERDA: LO PRODUCIDO */}
                    <div className="space-y-3 bg-slate-50/60 p-4 rounded-2xl border border-slate-200">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <div className="flex items-center gap-1.5">
                          <ArrowDownLeft className="w-4 h-4 text-[#2fbf71]" />
                          <h4 className="text-xs font-bold text-[#223a5e] uppercase tracking-wider">
                            Lo Producido en el Mes
                          </h4>
                        </div>
                        <span className="font-mono font-bold text-[#26995b] text-sm">
                          {formatSoles(monthlyReportData.produced.totalProduced)}
                        </span>
                      </div>

                      {/* Item 1: Crecimiento Institucional */}
                      <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-indigo-900 flex items-center gap-1">
                            <Award className="w-3.5 h-3.5 text-indigo-600" />
                            <span>1. Crecimiento Institucional (~100% Margen)</span>
                          </span>
                          <span className="font-mono font-bold text-indigo-900">
                            {formatSoles(monthlyReportData.summary.institutionalGrowthIncome)}
                          </span>
                        </div>
                        <div className="space-y-1 text-[11px] pl-4 border-l-2 border-indigo-200 text-slate-600">
                          <div className="flex justify-between">
                            <span>Cuotas de Ingreso (Nuevos alumnos):</span>
                            <span className="font-mono font-semibold text-slate-800">
                              {formatSoles(monthlyReportData.produced.admissions.amount)} ({monthlyReportData.produced.admissions.count} cobros)
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Matrículas del año lectivo:</span>
                            <span className="font-mono font-semibold text-slate-800">
                              {formatSoles(monthlyReportData.produced.enrollments.amount)} ({monthlyReportData.produced.enrollments.count} cobros)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Item 2: Sostenibilidad Operativa Recurrente */}
                      <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-emerald-900 flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-[#2fbf71]" />
                            <span>2. Pensiones Escolares (Sostenibilidad)</span>
                          </span>
                          <span className="font-mono font-bold text-[#26995b]">
                            {formatSoles(monthlyReportData.produced.tuitions.amount)}
                          </span>
                        </div>
                        <div className="space-y-1 text-[11px] pl-4 border-l-2 border-emerald-200 text-slate-600">
                          <div className="flex justify-between">
                            <span>Cobrado en el mes:</span>
                            <span className="font-mono font-semibold text-slate-800">
                              {formatSoles(monthlyReportData.produced.tuitions.amount)} ({monthlyReportData.produced.tuitions.count} pagos)
                            </span>
                          </div>
                          {monthlyReportData.tuitionStats && monthlyReportData.tuitionStats.totalAmount > 0 && (
                            <div className="flex justify-between text-slate-500 text-[10px]">
                              <span>Efectividad de cobranza:</span>
                              <span className="font-semibold text-emerald-700">
                                {monthlyReportData.tuitionStats.collectionRate}% recaudado ({formatSoles(monthlyReportData.tuitionStats.pendingAmount || 0)} pendiente)
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Item 3: Producción Comercial de Mercadería */}
                      <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-amber-900 flex items-center gap-1">
                            <ShoppingBag className="w-3.5 h-3.5 text-amber-600" />
                            <span>3. Venta de Mercadería (Libros, Uniformes)</span>
                          </span>
                          <span className="font-mono font-bold text-amber-900">
                            {formatSoles(monthlyReportData.produced.uniforms.amount + monthlyReportData.produced.books.amount)}
                          </span>
                        </div>
                        <div className="space-y-1 text-[11px] pl-4 border-l-2 border-amber-200 text-slate-600">
                          <div className="flex justify-between">
                            <span>Uniformes institucionales y deportivos:</span>
                            <span className="font-mono font-semibold text-slate-800">
                              {formatSoles(monthlyReportData.produced.uniforms.amount)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Libros, textos y cuadernos:</span>
                            <span className="font-mono font-semibold text-slate-800">
                              {formatSoles(monthlyReportData.produced.books.amount)}
                            </span>
                          </div>
                          {monthlyReportData.commercialBreakdown && monthlyReportData.commercialBreakdown.unitsSold > 0 && (
                            <div className="mt-1 pt-1 border-t border-slate-100 flex justify-between text-[10px] text-amber-800 bg-amber-50 p-1.5 rounded-lg">
                              <span>Ganancia Neta Comercial Real (Venta - Costo):</span>
                              <strong className="font-mono font-bold">
                                {formatSoles(monthlyReportData.commercialBreakdown.netCommercialProfit || 0)}
                              </strong>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Item 4: Otros Ingresos */}
                      {monthlyReportData.produced.other.amount > 0 && (
                        <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex justify-between items-center text-[11px]">
                          <span className="text-slate-600">Otros ingresos (certificados, eventos):</span>
                          <span className="font-mono font-semibold text-slate-800">
                            {formatSoles(monthlyReportData.produced.other.amount)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* COLUMNA DERECHA: LO INVERTIDO Y GASTADO */}
                    <div className="space-y-3 bg-slate-50/60 p-4 rounded-2xl border border-slate-200">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <div className="flex items-center gap-1.5">
                          <ArrowUpRight className="w-4 h-4 text-rose-500" />
                          <h4 className="text-xs font-bold text-[#223a5e] uppercase tracking-wider">
                            Lo Invertido & Gastado
                          </h4>
                        </div>
                        <span className="font-mono font-bold text-rose-600 text-sm">
                          {formatSoles(monthlyReportData.invested.totalInvested)}
                        </span>
                      </div>

                      {/* Item 1: Inversión en Lotes de Mercadería */}
                      <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-rose-900 flex items-center gap-1">
                            <Package className="w-3.5 h-3.5 text-rose-600" />
                            <span>1. Inversión en Mercadería y Lotes</span>
                          </span>
                          <span className="font-mono font-bold text-rose-600">
                            {formatSoles(monthlyReportData.invested.batches.amount)}
                          </span>
                        </div>
                        <div className="space-y-1 text-[11px] pl-4 border-l-2 border-rose-200 text-slate-600">
                          <div className="flex justify-between">
                            <span>Pagos a talleres textiles / editoriales:</span>
                            <span className="font-mono font-semibold text-slate-800">
                              {formatSoles(monthlyReportData.invested.batches.amount)} ({monthlyReportData.invested.batches.count} pagos)
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400">
                            * Este dinero no es pérdida: se convirtió en stock físico para vender a los alumnos.
                          </p>
                        </div>
                      </div>

                      {/* Item 2: Planilla y Remuneraciones */}
                      <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-800 flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-slate-600" />
                            <span>2. Planilla & Remuneraciones</span>
                          </span>
                          <span className="font-mono font-bold text-slate-900">
                            {formatSoles(monthlyReportData.invested.payroll.amount)}
                          </span>
                        </div>
                        <div className="space-y-1 text-[11px] pl-4 border-l-2 border-slate-300 text-slate-600">
                          <div className="flex justify-between">
                            <span>Sueldos docentes y administrativos:</span>
                            <span className="font-mono font-semibold text-slate-800">
                              {formatSoles(monthlyReportData.invested.payroll.amount)} ({monthlyReportData.invested.payroll.count} registros)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Item 3: Servicios Básicos y Mantenimiento */}
                      <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-800 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-600" />
                            <span>3. Servicios Básicos & Operación</span>
                          </span>
                          <span className="font-mono font-bold text-slate-900">
                            {formatSoles(monthlyReportData.invested.services.amount)}
                          </span>
                        </div>
                        <div className="space-y-1 text-[11px] pl-4 border-l-2 border-slate-300 text-slate-600">
                          <div className="flex justify-between">
                            <span>Luz, agua, internet, local y reparaciones:</span>
                            <span className="font-mono font-semibold text-slate-800">
                              {formatSoles(monthlyReportData.invested.services.amount)} ({monthlyReportData.invested.services.count} pagos)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Item 4: Préstamos Bancarios */}
                      <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-800 flex items-center gap-1">
                            <Landmark className="w-3.5 h-3.5 text-purple-600" />
                            <span>4. Cuotas de Préstamos Bancarios</span>
                          </span>
                          <span className="font-mono font-bold text-purple-900">
                            {formatSoles(monthlyReportData.invested.loans.amount)}
                          </span>
                        </div>
                        <div className="space-y-1 text-[11px] pl-4 border-l-2 border-purple-200 text-slate-600">
                          <div className="flex justify-between">
                            <span>Amortización de deuda bancaria en el mes:</span>
                            <span className="font-mono font-semibold text-slate-800">
                              {formatSoles(monthlyReportData.invested.loans.amount)} ({monthlyReportData.invested.loans.count} cuotas)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Item 5: Otros Gastos */}
                      {monthlyReportData.invested.other.amount > 0 && (
                        <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex justify-between items-center text-[11px]">
                          <span className="text-slate-600">Otros gastos y suministros de oficina:</span>
                          <span className="font-mono font-semibold text-slate-800">
                            {formatSoles(monthlyReportData.invested.other.amount)}
                          </span>
                        </div>
                      )}
                    </div>

                  </div>

                  {/* 4. Capital en Almacén al Cierre del Mes */}
                  <div className="p-4 rounded-2xl bg-cyan-50/60 border border-cyan-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-cyan-950 uppercase text-[11px]">
                        <Package className="w-4 h-4 text-cyan-700" />
                        <span>Capital Activo en Almacén (Inventario al Cierre)</span>
                      </div>
                      <p className="text-[11px] text-cyan-800 mt-0.5">
                        Mercadería adquirida que aún no ha sido vendida (activo disponible en stock):
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3 w-full sm:w-auto font-mono text-center">
                      <div className="p-2 bg-white rounded-xl border border-cyan-200">
                        <div className="text-[10px] text-slate-400 uppercase font-sans">Stock Físico</div>
                        <div className="font-bold text-slate-800">{monthlyReportData.warehouseInventory?.stockUnits || 0} unids</div>
                      </div>
                      <div className="p-2 bg-white rounded-xl border border-cyan-200">
                        <div className="text-[10px] text-slate-400 uppercase font-sans">Valor a Costo</div>
                        <div className="font-bold text-slate-800">{formatSoles(monthlyReportData.warehouseInventory?.valueAtCost || 0)}</div>
                      </div>
                      <div className="p-2 bg-white rounded-xl border border-cyan-200">
                        <div className="text-[10px] text-slate-400 uppercase font-sans">Ganancia Latente</div>
                        <div className="font-bold text-emerald-700">{formatSoles(monthlyReportData.warehouseInventory?.potentialProfit || 0)}</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer del Modal */}
            <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 bg-slate-50/70">
              <span className="text-[11px] text-slate-500">
                Los reportes abarcan del primer día hasta el último día del mes seleccionado.
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const url = `/api/finances/export?month=${reportSelectedMonth || ''}`;
                    window.location.href = url;
                    onNotify({ type: 'info', title: 'Descarga Iniciada', message: 'Descargando reporte oficial del mes...' });
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar Excel del Mes</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMonthlyReportModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ALERTA DE CONFIRMACIÓN DE ELIMINACIÓN (TOP Z-INDEX Z-[100])        */}
      {/* ========================================================================= */}
      {confirmDeleteModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col p-6 space-y-4 relative z-[101]">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-2xl bg-rose-100 text-rose-600 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900">
                  {confirmDeleteModal.itemType === 'category'
                    ? '¿Eliminar Categoría Financiera?'
                    : confirmDeleteModal.itemType === 'product'
                    ? '¿Eliminar Producto del Catálogo?'
                    : confirmDeleteModal.itemType === 'transaction'
                    ? '¿Anular Movimiento Contable?'
                    : confirmDeleteModal.itemType === 'recurring'
                    ? '¿Desactivar Servicio Recurrente?'
                    : confirmDeleteModal.itemType === 'tuition'
                    ? '¿Eliminar Registro de Pensión?'
                    : '¿Cancelar Préstamo Bancario?'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Esta acción requiere tu confirmación explícita para evitar pérdidas involuntarias de datos.
                </p>
              </div>
            </div>

            {/* Tarjeta con los detalles del elemento a eliminar */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1.5">
              {confirmDeleteModal.itemType === 'category' && confirmDeleteModal.category && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Categoría:</span>
                    <strong className="text-slate-900 text-sm">{confirmDeleteModal.category.name}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Tipo:</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        confirmDeleteModal.category.type === 'INCOME'
                          ? 'bg-emerald-50 text-[#26995b]'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {confirmDeleteModal.category.type === 'INCOME' ? 'Ingreso' : 'Gasto'}
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-xl mt-1 border border-amber-200">
                    Nota: Solo se podrá eliminar si no tiene transacciones o registros contables asociados.
                  </p>
                </>
              )}

              {confirmDeleteModal.itemType === 'product' && confirmDeleteModal.product && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Producto:</span>
                    <strong className="text-slate-900 text-sm">{confirmDeleteModal.product.name}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Categoría:</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-200 text-slate-700">
                      {confirmDeleteModal.product.category}
                    </span>
                  </div>
                  <div className="flex justify-between items-center font-mono">
                    <span className="text-slate-400 font-sans">Stock Disponible:</span>
                    <strong className="text-slate-800">{confirmDeleteModal.product.current_stock} unids</strong>
                  </div>
                  <p className="text-[11px] text-slate-500 pt-1">
                    Si el producto cuenta con ventas previas, se archivará automáticamente para preservar el historial de caja.
                  </p>
                </>
              )}

              {confirmDeleteModal.itemType === 'transaction' && confirmDeleteModal.transaction && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Concepto:</span>
                    <strong className="text-slate-900 text-sm truncate max-w-[200px]">
                      {confirmDeleteModal.transaction.description}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center font-mono">
                    <span className="text-slate-400 font-sans">Monto:</span>
                    <strong
                      className={`text-sm ${
                        confirmDeleteModal.transaction.type === 'INCOME' ? 'text-[#26995b]' : 'text-rose-600'
                      }`}
                    >
                      {formatSoles(confirmDeleteModal.transaction.amount)}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">Fecha:</span>
                    <span className="font-mono text-slate-600">{confirmDeleteModal.transaction.transaction_date}</span>
                  </div>
                </>
              )}

              {confirmDeleteModal.itemType === 'recurring' && confirmDeleteModal.recurring && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Servicio:</span>
                    <strong className="text-slate-900 text-sm">{confirmDeleteModal.recurring.name}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Vencimiento:</span>
                    <span>Día {confirmDeleteModal.recurring.due_day} de cada mes</span>
                  </div>
                </>
              )}

              {confirmDeleteModal.itemType === 'loan' && confirmDeleteModal.loan && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Préstamo:</span>
                    <strong className="text-slate-900 text-sm">{confirmDeleteModal.loan.loan_title}</strong>
                  </div>
                  <div className="flex justify-between items-center font-mono">
                    <span className="text-slate-400 font-sans">Capital:</span>
                    <span>{formatSoles(confirmDeleteModal.loan.total_principal)}</span>
                  </div>
                </>
              )}

              {confirmDeleteModal.itemType === 'tuition' && confirmDeleteModal.tuition && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Alumno:</span>
                    <strong className="text-slate-900 text-sm">{confirmDeleteModal.tuition.student_name}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Grado:</span>
                    <span className="font-semibold text-slate-700">{confirmDeleteModal.tuition.grade_section}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Periodo:</span>
                    <span className="font-mono text-slate-600">{confirmDeleteModal.tuition.period_month}</span>
                  </div>
                  <div className="flex justify-between items-center font-mono">
                    <span className="text-slate-400 font-sans">Monto:</span>
                    <strong className="text-slate-900">{formatSoles(confirmDeleteModal.tuition.monthly_amount)}</strong>
                  </div>
                  <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 mt-1">
                    ⚠️ Al confirmar, se <strong>anulará el cobro de esta pensión</strong>, se revertirá el ingreso registrado en el libro de caja y la mensualidad volverá a quedar pendiente/morosa.
                  </p>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmDeleteModal({ isOpen: false, itemType: 'transaction' })}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  setDeleting(true);
                  try {
                    if (confirmDeleteModal.itemType === 'transaction' && confirmDeleteModal.transaction) {
                      const res = await fetch(`/api/finances/transactions?id=${confirmDeleteModal.transaction.id}`, {
                        method: 'DELETE',
                      });
                      const data = await res.json();
                      if (data.success) {
                        onNotify({ type: 'success', title: 'Movimiento Anulado', message: data.message });
                        fetchTransactions();
                        fetchCashRegister();
                      } else {
                        onNotify({ type: 'error', title: 'Error', message: data.message });
                      }
                    } else if (confirmDeleteModal.itemType === 'category' && confirmDeleteModal.category) {
                      await handleDeleteCategory(confirmDeleteModal.category);
                    } else if (confirmDeleteModal.itemType === 'product' && confirmDeleteModal.product) {
                      const res = await fetch(`/api/finances/products?id=${confirmDeleteModal.product.id}`, {
                        method: 'DELETE',
                      });
                      const data = await res.json();
                      if (data.success) {
                        onNotify({ type: 'success', title: 'Producto Eliminado', message: data.message });
                        fetchProducts();
                        fetchTransactions();
                        fetchCashRegister();
                      } else {
                        onNotify({ type: 'error', title: 'Error', message: data.message });
                      }
                    } else if (confirmDeleteModal.itemType === 'recurring' && confirmDeleteModal.recurring) {
                      const res = await fetch(`/api/finances/recurring?id=${confirmDeleteModal.recurring.id}`, {
                        method: 'DELETE',
                      });
                      const data = await res.json();
                      if (data.success) {
                        onNotify({ type: 'success', title: 'Servicio Eliminado', message: data.message });
                        fetchRecurringExpenses();
                      } else {
                        onNotify({ type: 'error', title: 'Error', message: data.message });
                      }
                    } else if (confirmDeleteModal.itemType === 'loan' && confirmDeleteModal.loan) {
                      const res = await fetch(`/api/finances/loans?id=${confirmDeleteModal.loan.id}`, {
                        method: 'DELETE',
                      });
                      const data = await res.json();
                      if (data.success) {
                        onNotify({ type: 'success', title: 'Préstamo Eliminado', message: data.message });
                        fetchBankLoans();
                        fetchTransactions();
                        fetchCashRegister();
                      } else {
                        onNotify({ type: 'error', title: 'Error', message: data.message });
                      }
                    } else if (confirmDeleteModal.itemType === 'tuition' && confirmDeleteModal.tuition) {
                      const res = await fetch(`/api/finances/tuitions?id=${confirmDeleteModal.tuition.id}`, {
                        method: 'DELETE',
                      });
                      const data = await res.json();
                      if (data.success) {
                        onNotify({ type: 'success', title: 'Cobro Anulado', message: data.message });
                        fetchTuitions();
                        fetchTransactions();
                        fetchCashRegister();
                      } else {
                        onNotify({ type: 'error', title: 'Error', message: data.message });
                      }
                    }
                  } catch {
                    onNotify({ type: 'error', title: 'Error', message: 'No se pudo completar la eliminación.' });
                  } finally {
                    setDeleting(false);
                    setConfirmDeleteModal({ isOpen: false, itemType: 'transaction' });
                  }
                }}
                disabled={deleting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {deleting ? (
                  <span className="inline-flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Eliminando...
                  </span>
                ) : (
                  'Sí, Confirmar Eliminación'
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
