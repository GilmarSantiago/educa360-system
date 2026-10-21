import { query } from '@/lib/db';
import { FundingSourceType } from '@/types';

export interface FundingCheckResult {
  allowed: boolean;
  message?: string;
  availableAmount?: number;
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

/**
 * Obtiene el resumen de disponibilidad financiera desglosado por cada caja / fuente de fondos:
 * - Cuánto dinero ingresó
 * - Cuánto se ha usado
 * - Cuánto queda disponible
 */
export async function getFundsSummary(tenantId: string): Promise<FundsSummary> {
  // 1. CAJA PROPIA (Producción del colegio: pensiones, matrículas, cuotas de ingreso, ventas)
  // Excluye estrictamente desembolsos de créditos bancarios y aportes de socios
  const producedRes = await query(
    `SELECT COALESCE(SUM(t.amount), 0) as total_produced
     FROM v2.financial_transactions t
     LEFT JOIN v2.financial_categories c ON t.category_id = c.id
     WHERE t.tenant_id = $1 
       AND t.type = 'INCOME'
       AND (t.id NOT LIKE 'tx-disb-%')
       AND (t.description NOT ILIKE '%Desembolso%')
       AND (c.name NOT ILIKE '%Préstamo%' OR c.name IS NULL)
       AND (c.name NOT ILIKE '%Prestamo%' OR c.name IS NULL)
       AND (c.name NOT ILIKE '%Aporte de Capital%' OR c.name IS NULL)
       AND (t.funding_source NOT IN ('PRESTAMO_BANCARIO', 'PRESTAMO', 'APORTE_SOCIO', 'SOCIO', 'PRESTAMISTA') OR t.funding_source IS NULL)`,
    [tenantId]
  );
  const totalProduced = Number(producedRes.rows[0]?.total_produced || 0);

  const spentPropioRes = await query(
    `SELECT COALESCE(SUM(amount), 0) as total_spent
     FROM v2.financial_transactions
     WHERE tenant_id = $1 
       AND type = 'EXPENSE'
       AND (funding_source = 'PROPIO' OR funding_source IS NULL)`,
    [tenantId]
  );
  const totalSpentPropio = Number(spentPropioRes.rows[0]?.total_spent || 0);
  const availablePropio = Math.max(0, totalProduced - totalSpentPropio);

  // 2. PRÉSTAMOS BANCARIOS
  const loansRes = await query(
    `SELECT id, bank_name, loan_title, total_principal, status
     FROM v2.bank_loans
     WHERE tenant_id = $1 AND status != 'CANCELLED'
     ORDER BY created_at DESC`,
    [tenantId]
  );

  let totalPrincipalLoans = 0;
  let totalSpentLoans = 0;
  const bankLoansList = [];

  for (const loan of loansRes.rows) {
    const principal = Number(loan.total_principal || 0);
    const spentRes = await query(
      `SELECT COALESCE(SUM(amount), 0) as spent FROM v2.financial_transactions WHERE tenant_id = $1 AND funding_loan_id = $2 AND type = 'EXPENSE'`,
      [tenantId, loan.id]
    );
    const spent = Number(spentRes.rows[0]?.spent || 0);
    const avail = Math.max(0, principal - spent);
    const pct = principal > 0 ? Math.min(100, (spent / principal) * 100) : 0;

    totalPrincipalLoans += principal;
    totalSpentLoans += spent;

    bankLoansList.push({
      id: loan.id,
      bank_name: loan.bank_name,
      loan_title: loan.loan_title,
      total_principal: principal,
      spent_amount: spent,
      available_balance: avail,
      percentSpent: Math.round(pct * 10) / 10,
    });
  }

  // 3. APORTES DE SOCIOS / CAPITAL INICIAL
  const partnerInRes = await query(
    `SELECT COALESCE(SUM(t.amount), 0) as total_in
     FROM v2.financial_transactions t
     LEFT JOIN v2.financial_categories c ON t.category_id = c.id
     WHERE t.tenant_id = $1 
       AND t.type = 'INCOME'
       AND (t.funding_source IN ('APORTE_SOCIO', 'SOCIO') OR c.name ILIKE '%Aporte de Capital%' OR t.description ILIKE '%Aporte de Capital%' OR t.description ILIKE '%Aporte%')`,
    [tenantId]
  );
  const totalPartnerIn = Number(partnerInRes.rows[0]?.total_in || 0);

  const partnerSpentRes = await query(
    `SELECT COALESCE(SUM(amount), 0) as total_spent
     FROM v2.financial_transactions
     WHERE tenant_id = $1 AND type = 'EXPENSE' AND funding_source IN ('APORTE_SOCIO', 'SOCIO')`,
    [tenantId]
  );
  const totalPartnerSpent = Number(partnerSpentRes.rows[0]?.total_spent || 0);

  // 4. PRESTAMISTAS PARTICULARES / TERCEROS
  const lenderInRes = await query(
    `SELECT COALESCE(SUM(t.amount), 0) as total_in
     FROM v2.financial_transactions t
     LEFT JOIN v2.financial_categories c ON t.category_id = c.id
     WHERE t.tenant_id = $1 
       AND t.type = 'INCOME'
       AND (t.funding_source = 'PRESTAMISTA' OR c.name ILIKE '%Prestamista%' OR t.description ILIKE '%Prestamista%')`,
    [tenantId]
  );
  const totalLenderIn = Number(lenderInRes.rows[0]?.total_in || 0);

  const lenderSpentRes = await query(
    `SELECT COALESCE(SUM(amount), 0) as total_spent
     FROM v2.financial_transactions
     WHERE tenant_id = $1 AND type = 'EXPENSE' AND funding_source = 'PRESTAMISTA'`,
    [tenantId]
  );
  const totalLenderSpent = Number(lenderSpentRes.rows[0]?.total_spent || 0);

  return {
    propio: {
      totalProduced,
      totalSpent: totalSpentPropio,
      availableBalance: availablePropio,
      isBlocked: totalProduced <= 0 || availablePropio <= 0,
    },
    bankLoans: bankLoansList,
    totalBankLoans: {
      totalPrincipal: totalPrincipalLoans,
      totalSpent: totalSpentLoans,
      totalAvailable: Math.max(0, totalPrincipalLoans - totalSpentLoans),
    },
    partners: {
      totalContributed: totalPartnerIn,
      totalSpent: totalPartnerSpent,
      availableBalance: Math.max(0, totalPartnerIn - totalPartnerSpent),
    },
    lenders: {
      totalBorrowed: totalLenderIn,
      totalSpent: totalLenderSpent,
      availableBalance: Math.max(0, totalLenderIn - totalLenderSpent),
    },
  };
}

/**
 * Valida de forma estricta si un gasto puede ser pagado con la fuente seleccionada.
 * Si es PROPIO y no hay ingresos o no alcanza, se BLOQUEA.
 * Si es PRESTAMO_BANCARIO y no hay saldo en ese crédito, se BLOQUEA.
 */
export async function validateExpenseFunding(
  tenantId: string,
  fundingSource: FundingSourceType | 'SOCIO' | 'PRESTAMO',
  amount: number,
  fundingLoanId?: string | null,
  fundingEntityName?: string | null
): Promise<FundingCheckResult> {
  if (amount <= 0) {
    return { allowed: false, message: 'El monto del gasto debe ser mayor a 0.' };
  }

  const normSource = fundingSource === 'SOCIO' ? 'APORTE_SOCIO' : (fundingSource === 'PRESTAMO' ? 'PRESTAMO_BANCARIO' : fundingSource);

  // 1. CASO CAJA PROPIA (Ingresos producidos por pensiones, matrículas, ventas)
  if (normSource === 'PROPIO') {
    const summary = await getFundsSummary(tenantId);

    if (summary.propio.totalProduced <= 0) {
      return {
        allowed: false,
        message:
          'Operación Bloqueada: La Caja Propia del colegio tiene S/ 0.00 disponible porque aún no se han registrado ingresos propios (pensiones, matrículas o ventas). No puedes gastar de Caja Propia si no hay ingresos recaudados. Debes seleccionar de qué Préstamo Bancario o Aporte de Socio proviene este dinero.',
        availableAmount: 0,
      };
    }

    if (amount > summary.propio.availableBalance) {
      return {
        allowed: false,
        message: `Operación Bloqueada: Saldo insuficiente en Caja Propia. Solo quedan S/ ${summary.propio.availableBalance.toFixed(
          2
        )} disponibles de ingresos recaudados, pero el gasto es de S/ ${amount.toFixed(
          2
        )}. Selecciona un Préstamo Bancario o Aporte de Socio para sustentar este pago.`,
        availableAmount: summary.propio.availableBalance,
      };
    }

    return { allowed: true, availableAmount: summary.propio.availableBalance };
  }

  // 2. CASO PRÉSTAMO BANCARIO
  if (normSource === 'PRESTAMO_BANCARIO') {
    if (!fundingLoanId) {
      return {
        allowed: false,
        message: 'Debes seleccionar el préstamo bancario del cual se dispone el dinero para pagar este gasto.',
      };
    }

    const loanRes = await query(
      `SELECT id, bank_name, loan_title, total_principal FROM v2.bank_loans WHERE id = $1 AND tenant_id = $2 AND status != 'CANCELLED'`,
      [fundingLoanId, tenantId]
    );

    if (loanRes.rows.length === 0) {
      return { allowed: false, message: 'El préstamo bancario seleccionado no existe o está cancelado.' };
    }

    const loan = loanRes.rows[0];
    const spentRes = await query(
      `SELECT COALESCE(SUM(amount), 0) as spent FROM v2.financial_transactions WHERE tenant_id = $1 AND funding_loan_id = $2 AND type = 'EXPENSE'`,
      [tenantId, fundingLoanId]
    );
    const spent = Number(spentRes.rows[0]?.spent || 0);
    const available = Math.max(0, Number(loan.total_principal) - spent);

    if (amount > available) {
      return {
        allowed: false,
        message: `Operación Bloqueada: Saldo insuficiente en el préstamo "${loan.bank_name} - ${loan.loan_title}". Solo quedan S/ ${available.toFixed(
          2
        )} disponibles de los S/ ${Number(loan.total_principal).toFixed(2)} desembolsados para financiar gastos.`,
        availableAmount: available,
      };
    }

    return { allowed: true, availableAmount: available };
  }

  // 3. CASO PRESTAMISTA PARTICULAR
  if (normSource === 'PRESTAMISTA') {
    if (!fundingEntityName || !fundingEntityName.trim()) {
      return {
        allowed: false,
        message: 'Por favor indica el nombre o entidad del prestamista que facilitó este dinero.',
      };
    }
    return { allowed: true };
  }

  // 4. CASO APORTE DE SOCIO / PROMOTOR
  if (normSource === 'APORTE_SOCIO') {
    if (!fundingEntityName || !fundingEntityName.trim()) {
      return {
        allowed: false,
        message: 'Por favor indica el nombre del socio fundador o promotor que aportó el capital para este gasto.',
      };
    }
    return { allowed: true };
  }

  // 5. OTRO
  return { allowed: true };
}
