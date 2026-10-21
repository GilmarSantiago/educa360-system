export type UserRole = 'SOPORTE' | 'ADMINISTRADOR' | 'COLABORADOR' | 'MAESTRO' | 'APODERADO';

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  email?: string | null;
  role: UserRole;
  avatar?: string | null;
  phone?: string | null;
  tenantName?: string | null;
  tenant?: {
    id: string;
    code: string;
    name: string;
    plan: string;
    status: string;
    config?: SchoolConfig | null;
  } | null;
}

export interface SchoolConfig {
  id?: string;
  tenant_id?: string;
  grading_system?: 'vigesimal' | 'literal';
  gradingSystem?: string;
  passing_grade?: number;
  passingGrade?: number;
  period_type?: 'bimestre' | 'trimestre' | 'semestre';
  periodType?: string;
  monthly_due_day?: number;
  monthlyDueDay?: number;
  late_fee_daily_percentage?: number;
  lateFeeDailyPercentage?: number;
  grace_days?: number;
  graceDays?: number;
  allow_multiple_cash_sessions?: boolean;
  allowMultipleCashSessions?: boolean;
  require_token_for_differences?: boolean;
  requireTokenForDifferences?: boolean;
  enabled_modules?: string[];
  enabledModules?: string[];
  enrollment_rule_new?: 'OBLIGATORIO_AHORA' | 'DIFERIDO' | 'EXONERADO';
  enrollment_rule_regular?: 'OBLIGATORIO_AHORA' | 'DIFERIDO' | 'EXONERADO';
  entry_fee_rule_new?: 'APLICA' | 'EXONERADO';
  entry_fee_rule_regular?: 'APLICA' | 'EXONERADO';
  created_at?: string;
  updated_at?: string;
}

export interface SaasMetricData {
  totalRevenueMonthly: number;
  totalCostsMonthly: number;
  netProfitMonthly: number;
  activeSchoolsCount: number;
  totalStudentsEstimate: number;
  roiPercentage: number;
  costsBreakdown: {
    infrastructure: number;
    apis: number;
    maintenance: number;
  };
}

export interface ManagedUser {
  id: string;
  username: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  document?: string | null;
  address?: string | null;
  avatar?: string | null;
  role: UserRole;
  is_active: boolean;
  tenant_id?: string | null;
  tenant_name?: string | null;
  created_at: string;
}

export interface TenantItem {
  id: string;
  code: string;
  name: string;
  ruc?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  logo?: string | null;
  status: string;
  plan: string;
  monthly_fee: number;
  total_users?: number;
  admin_name?: string | null;
  admin_username?: string | null;
  admin_email?: string | null;
  created_at: string;
}

export type TransactionType = 'INCOME' | 'EXPENSE';

export type FundingSourceType = 'PROPIO' | 'PRESTAMO_BANCARIO' | 'PRESTAMISTA' | 'APORTE_SOCIO' | 'OTRO';

export interface FinancialCategory {
  id: string;
  tenant_id: string;
  name: string;
  type: TransactionType;
  description?: string | null;
  is_default: boolean;
  created_at: string;
}

export interface FinancialTransaction {
  id: string;
  tenant_id: string;
  category_id?: string | null;
  category_name?: string | null;
  type: TransactionType;
  amount: number;
  description: string;
  transaction_date: string;
  payment_method: string;
  receipt_number?: string | null;
  registered_by?: string | null;
  registered_by_name?: string | null;
  funding_source?: FundingSourceType | null;
  funding_loan_id?: string | null;
  funding_entity_name?: string | null;
  funding_details?: string | null;
  created_at: string;
}

export interface FundsSummary {
  propio: {
    totalProduced: number;
    totalSpent: number;
    availableBalance: number;
    isBlocked: boolean;
  };
  bankLoans: {
    id: string;
    bank_name: string;
    loan_title: string;
    total_principal: number;
    spent_amount: number;
    available_balance: number;
    percentSpent: number;
  }[];
  totalBankLoans: {
    totalPrincipal: number;
    totalSpent: number;
    totalAvailable: number;
  };
  partners: {
    totalContributed: number;
    totalSpent: number;
    availableBalance: number;
  };
  lenders: {
    totalBorrowed: number;
    totalSpent: number;
    availableBalance: number;
  };
}

export interface FinancialMetrics {
  totalProduced?: number;
  totalPartnerContributions?: number;
  totalLoansReceived?: number;
  totalLendersReceived?: number;
  totalIncome: number;
  totalExpense: number;
  operatingBalance?: number;
  netBalance: number;
  transactionsCount: number;
  incomeByCategory: { category: string; amount: number }[];
  expenseByCategory: { category: string; amount: number }[];
  expensesByFunding?: {
    propio: number;
    prestamo_bancario: number;
    prestamista: number;
    aporte_socio: number;
    otro: number;
  };
  fundsSummary?: FundsSummary;
}

export interface RecurringExpense {
  id: string;
  tenant_id: string;
  name: string;
  category_id?: string | null;
  category_name?: string | null;
  supplier_name?: string | null;
  supply_number?: string | null;
  default_amount: number;
  is_variable_amount: boolean;
  due_day: number;
  payment_method: string;
  status: 'ACTIVE' | 'PAUSED';
  created_at: string;
  is_paid_this_month?: boolean;
  paid_amount_this_month?: number | null;
  paid_date_this_month?: string | null;
}

export interface BankLoanInstallment {
  id: string;
  loan_id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  status: 'PENDING' | 'PAID';
  transaction_id?: string | null;
  paid_date?: string | null;
  payment_method?: string | null;
  receipt_number?: string | null;
  created_at: string;
}

export interface BankLoan {
  id: string;
  tenant_id: string;
  bank_name: string;
  loan_title: string;
  total_principal: number;
  total_installments: number;
  monthly_installment_amount: number;
  interest_rate_tea?: number | null;
  disbursement_date: string;
  payment_day_of_month: number;
  first_payment_date: string;
  disbursement_transaction_id?: string | null;
  status: 'ACTIVE' | 'PAID_OFF' | 'CANCELLED';
  created_at: string;
  paid_installments_count?: number;
  paid_amount_total?: number;
  remaining_installments_count?: number;
  next_installment?: BankLoanInstallment | null;
  installments?: BankLoanInstallment[];
  spent_amount?: number;
  available_balance?: number;
}

export interface StudentTuition {
  id: string;
  tenant_id: string;
  student_id?: string | null;
  enrollment_id?: string | null;
  guardian_id?: string | null;
  concept_type?: 'PENSION' | 'MATRICULA' | 'INGRESO' | 'OTRO';
  student_name: string;
  grade_section: string;
  parent_name: string;
  parent_phone: string;
  period_month: string;
  monthly_amount: number;
  due_date: string;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  transaction_id?: string | null;
  paid_date?: string | null;
  payment_method?: string | null;
  receipt_number?: string | null;
  created_at: string;
}

export interface CashRegisterShift {
  id: string;
  tenant_id: string;
  opened_by?: string | null;
  opened_by_name?: string | null;
  closed_by?: string | null;
  closed_by_name?: string | null;
  opening_balance: number;
  opened_at: string;
  closed_at?: string | null;
  status: 'OPEN' | 'CLOSED';
  expected_cash: number;
  expected_digital: number;
  actual_cash: number;
  discrepancy: number;
  closure_notes?: string | null;
  created_at: string;
}

export interface PaymentMethodItem {
  id: string;
  tenant_id?: string | null;
  name: string;
  code: string;
  account_info?: string | null;
  is_active: boolean;
  is_default: boolean;
  created_at?: string;
}

export interface ProductBatchPayment {
  id: string;
  batch_id: string;
  part_number: number;
  amount: number;
  due_date: string;
  paid_date?: string | null;
  payment_method?: string | null;
  receipt_number?: string | null;
  status: 'PENDING' | 'PAID';
  transaction_id?: string | null;
  funding_source?: FundingSourceType | null;
  funding_loan_id?: string | null;
  funding_entity_name?: string | null;
}

export interface ProductBatch {
  id: string;
  product_id: string;
  supplier_name?: string | null;
  quantity: number;
  total_investment: number;
  unit_cost: number;
  payment_plan_parts: number;
  paidAmount: number;
  pendingAmount: number;
  payments: ProductBatchPayment[];
  created_at: string;
}

export interface ProductSale {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  unit_cost: number;
  net_profit: number;
  student_name?: string | null;
  buyer_name?: string | null;
  payment_method: string;
  receipt_number?: string | null;
  sale_date: string;
  created_at: string;
}

export interface SchoolProduct {
  id: string;
  tenant_id: string;
  name: string;
  category: 'LIBROS' | 'UNIFORMES' | 'MATERIALES' | 'OTROS';
  sku?: string | null;
  unit_cost: number;
  selling_price: number;
  target_margin_percent: number;
  current_stock: number;
  total_purchased: number;
  total_sold: number;
  status: 'ACTIVE' | 'ARCHIVED';
  created_at: string;
  batches: ProductBatch[];
  sales: ProductSale[];
  totalRevenue: number;
  totalProfitRealized: number;
  potentialProfitRemaining: number;
}

// =========================================================================
// PILAR ADMINISTRATIVO: ESTRUCTURA, FAMILIAS, ESTUDIANTES Y MATRÍCULAS
// =========================================================================

export interface AcademicYear {
  id: string;
  tenant_id: string;
  year_name: string;
  year_code: string;
  start_date: string;
  end_date: string;
  status: 'PLANNING' | 'ACTIVE' | 'CLOSED';
  is_enrollment_open: boolean;
  created_at: string;
  updated_at: string;
  total_sections?: number;
  total_capacity?: number;
  total_enrolled?: number;
}

export interface SchoolInstitutionProfile {
  id: string;
  code: string;
  name: string;
  ruc?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  logo?: string | null;
  status: string;
  plan: string;
  monthly_fee?: number;
  created_at: string;
  updated_at?: string;
  admin_name?: string | null;
  admin_username?: string | null;
  admin_email?: string | null;
}

export interface SchoolGrade {
  id: string;
  tenant_id: string;
  level: 'INICIAL' | 'PRIMARIA' | 'SECUNDARIA';
  grade_name: string;
  grade_order: number;
  default_enrollment_amount: number;
  default_tuition_amount: number;
  default_entry_fee: number;
  created_at: string;
  sections?: SchoolSection[];
}

export interface TeacherUser {
  id: string;
  name: string;
  username: string;
  email?: string | null;
  phone?: string | null;
  avatar?: string | null;
  role: string;
  is_active?: boolean;
}

export interface SchoolSection {
  id: string;
  tenant_id: string;
  academic_year_id: string;
  grade_id: string;
  section_letter: string;
  full_name: string;
  shift: 'MAÑANA' | 'TARDE';
  capacity: number;
  enrolled_count: number;
  tutor_user_id?: string | null;
  tutor_name?: string | null;
  tutor_email?: string | null;
  tutor_username?: string | null;
  tutor_avatar?: string | null;
  classroom_location?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  grade?: SchoolGrade;
  available_vacancies?: number;
}

export interface Guardian {
  id: string;
  tenant_id: string;
  document_type: 'DNI' | 'CE' | 'PASAPORTE';
  document_number: string;
  first_name: string;
  last_name: string;
  relationship: 'PADRE' | 'MADRE' | 'TUTOR' | 'ABUELO' | 'OTRO';
  phone: string;
  alt_phone?: string | null;
  email?: string | null;
  address?: string | null;
  occupation?: string | null;
  billing_tax_id?: string | null;
  billing_name?: string | null;
  created_at: string;
  students_count?: number;
  students?: Student[];
}

export interface Student {
  id: string;
  tenant_id: string;
  guardian_id?: string | null;
  student_code?: string | null;
  document_type: 'DNI' | 'CE' | 'PASAPORTE';
  document_number: string;
  first_name: string;
  last_name: string;
  gender: 'M' | 'F';
  birth_date?: string | null;
  blood_type?: string | null;
  allergies_medical?: string | null;
  emergency_contact_phone?: string | null;
  health_insurance?: string | null;
  previous_school?: string | null;
  status: 'PROSPECT' | 'ENROLLED' | 'TRANSFERRED' | 'WITHDRAWN' | 'PROMOTED' | 'GRADUATED';
  created_at: string;
  guardian?: Guardian | null;
  current_enrollment?: Enrollment | null;
}

export type EnrollmentDiscountType = 'NINGUNO' | 'HERMANO' | 'CONVENIO' | 'BECA_PARCIAL' | 'BECA_COMPLETA';

export type StudentConditionType = 'NUEVO' | 'REGULAR' | 'TRASLADO' | 'REINGRESANTE';

export interface Enrollment {
  id: string;
  tenant_id: string;
  academic_year_id: string;
  student_id: string;
  guardian_id: string;
  section_id: string;
  enrollment_code: string;
  enrollment_type: 'REGULAR' | 'NUEVO' | 'TRASLADO' | 'REINGRESANTE';
  enrollment_date: string;
  status: 'REGISTERED' | 'CONFIRMED' | 'CANCELLED';
  enrollment_fee: number;
  enrollment_fee_paid: boolean;
  entry_fee: number;
  monthly_tuition_fee: number;
  discount_type: EnrollmentDiscountType;
  discount_percentage: number;
  notes?: string | null;
  created_at: string;
  student?: Student;
  guardian?: Guardian;
  section?: SchoolSection;
  section_name?: string;
  grade_name?: string;
  grade_level?: string;
  academic_year?: AcademicYear;
}

export type FeeRule = 'OBLIGATORIO' | 'OPCIONAL' | 'EXONERADO';
export type FeeCategory = 'ADMISSION' | 'ENROLLMENT' | 'TUITION' | 'SERVICE' | 'OTHER';

export interface FeeConcept {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  description?: string | null;
  category: FeeCategory;
  default_amount: number;
  rule_new: FeeRule;
  rule_regular: FeeRule;
  rule_transfer: FeeRule;
  rule_reentry: FeeRule;
  is_system_default: boolean;
  is_default?: boolean;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// =========================================================================
// PILAR FINANCIERO: ESTADO DE CUENTA INTEGRAL & COMPROBANTES DE PAGO
// =========================================================================
export interface AccountStatementItem {
  id: string;
  concept_type: string;
  concept_label: string;
  period_month: string;
  amount: number;
  due_date: string;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  paid_date?: string | null;
  payment_method?: string | null;
  receipt_number?: string | null;
  transaction_id?: string | null;
}

export interface AccountStatementSummary {
  total_billed: number;
  total_paid: number;
  total_pending: number;
  total_overdue: number;
  pending_count: number;
  overdue_count: number;
  has_debt: boolean;
  has_overdue: boolean;
}

export interface StudentAccountStatement {
  student: {
    id: string;
    first_name: string;
    last_name: string;
    full_name: string;
    document_type: string;
    document_number: string;
    student_code?: string;
    gender?: string;
    status: string;
  };
  guardian: {
    id: string;
    first_name: string;
    last_name: string;
    full_name: string;
    document_type?: string;
    document_number?: string;
    phone?: string;
    email?: string;
    address?: string;
    relationship?: string;
  } | null;
  enrollment: {
    id: string;
    enrollment_code?: string;
    enrollment_type?: string;
    year_name?: string;
    year_code?: string;
    grade_name?: string;
    grade_level?: string;
    section_name?: string;
    shift?: string;
  } | null;
  institution: {
    name: string;
    ruc?: string;
    phone?: string;
    email?: string;
    address?: string;
    logo?: string | null;
  };
  summary: AccountStatementSummary;
  items: AccountStatementItem[];
}

export interface OfficialReceiptData {
  receipt_number: string;
  payment_date: string;
  created_at?: string;
  cashier_name: string;
  student: {
    id?: string;
    name: string;
    grade_section: string;
    document_number?: string;
  };
  guardian: {
    name: string;
    phone?: string;
    document_number?: string;
  };
  institution: {
    name: string;
    ruc?: string;
    phone?: string;
    email?: string;
    address?: string;
    logo?: string | null;
  };
  payment_method: string;
  notes?: string;
  items: {
    id?: string;
    concept_type?: string;
    concept_label: string;
    period_month?: string;
    amount: number;
    transaction_id?: string;
  }[];
  total_amount: number;
}

export interface StudentSearchFinancial {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  document_number: string;
  student_code?: string;
  status: string;
  grade_name: string;
  section_name: string;
  guardian_id?: string | null;
  guardian_name: string;
  guardian_phone: string;
  guardian_doc?: string;
  total_expected: number;
  total_paid: number;
  total_debt: number;
  overdue_debt: number;
  pending_count: number;
  overdue_count: number;
}
