import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';
import { formatDbDate } from '@/lib/finances';
import { validateExpenseFunding } from '@/lib/finances/fundingValidation';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('educa360_session')?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: 'No autenticado' }, { status: 401 });
    }

    const session = await verifyToken(token);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Sesión inválida' }, { status: 401 });
    }

    const tenantId = session.tenantId;
    if (!tenantId) {
      return NextResponse.json({ success: false, message: 'Colegio no identificado' }, { status: 400 });
    }

    // 1. Obtener préstamos activos del colegio
    const loansRes = await query(
      `SELECT id, tenant_id, bank_name, loan_title, total_principal, total_installments,
              monthly_installment_amount, interest_rate_tea,
              TO_CHAR(disbursement_date, 'YYYY-MM-DD') as disbursement_date,
              payment_day_of_month,
              TO_CHAR(first_payment_date, 'YYYY-MM-DD') as first_payment_date,
              disbursement_transaction_id,
              status, created_at
       FROM v2.bank_loans
       WHERE tenant_id = $1 AND status != 'CANCELLED'
       ORDER BY created_at DESC`,
      [tenantId]
    );

    // 2. Para cada préstamo, obtener sus cuotas y calcular métricas
    const loansWithDetails = await Promise.all(
      loansRes.rows.map(async (loan: any) => {
        const instRes = await query(
          `SELECT id, loan_id, installment_number,
                  TO_CHAR(due_date, 'YYYY-MM-DD') as due_date,
                  amount, status,
                  transaction_id,
                  TO_CHAR(paid_date, 'YYYY-MM-DD') as paid_date,
                  payment_method, receipt_number, created_at
           FROM v2.bank_loan_installments
           WHERE loan_id = $1
           ORDER BY installment_number ASC`,
          [loan.id]
        );

        const installments = instRes.rows.map((i: any) => ({
          id: i.id,
          loan_id: i.loan_id,
          installment_number: Number(i.installment_number),
          due_date: formatDbDate(i.due_date),
          amount: Number(i.amount),
          status: i.status,
          transaction_id: i.transaction_id,
          paid_date: i.paid_date ? formatDbDate(i.paid_date) : null,
          payment_method: i.payment_method,
          receipt_number: i.receipt_number,
          created_at: i.created_at,
        }));

        const paidInstallments = installments.filter((i: any) => i.status === 'PAID');
        const paid_installments_count = paidInstallments.length;
        const paid_amount_total = paidInstallments.reduce((sum: number, i: any) => sum + i.amount, 0);
        const remaining_installments_count = installments.length - paid_installments_count;
        const next_installment = installments.find((i: any) => i.status === 'PENDING') || null;

        // Calcular cuánto de este préstamo se ha utilizado para financiar gastos del colegio
        const spentRes = await query(
          `SELECT COALESCE(SUM(amount), 0) as spent
           FROM v2.financial_transactions
           WHERE tenant_id = $1 AND funding_loan_id = $2 AND type = 'EXPENSE'`,
          [tenantId, loan.id]
        );
        const spent_amount = Number(spentRes.rows[0]?.spent || 0);
        const available_balance = Math.max(0, Number(loan.total_principal) - spent_amount);

        return {
          id: loan.id,
          tenant_id: loan.tenant_id,
          bank_name: loan.bank_name,
          loan_title: loan.loan_title,
          total_principal: Number(loan.total_principal),
          total_installments: Number(loan.total_installments),
          monthly_installment_amount: Number(loan.monthly_installment_amount),
          interest_rate_tea: loan.interest_rate_tea ? Number(loan.interest_rate_tea) : null,
          disbursement_date: formatDbDate(loan.disbursement_date),
          payment_day_of_month: Number(loan.payment_day_of_month),
          first_payment_date: formatDbDate(loan.first_payment_date),
          disbursement_transaction_id: loan.disbursement_transaction_id,
          status: loan.status,
          created_at: loan.created_at,
          paid_installments_count,
          paid_amount_total,
          remaining_installments_count,
          next_installment,
          installments,
          spent_amount,
          available_balance,
        };
      })
    );

    // Métricas globales de préstamos
    const totalBorrowed = loansWithDetails.reduce((sum, l) => sum + l.total_principal, 0);
    const totalPaidDebt = loansWithDetails.reduce((sum, l) => sum + (l.paid_amount_total || 0), 0);
    const totalPendingDebt = loansWithDetails.reduce(
      (sum, l) => sum + (l.total_installments * l.monthly_installment_amount - (l.paid_amount_total || 0)),
      0
    );

    return NextResponse.json({
      success: true,
      loans: loansWithDetails,
      metrics: {
        totalBorrowed,
        totalPaidDebt,
        totalPendingDebt: Math.max(0, totalPendingDebt),
        activeLoansCount: loansWithDetails.filter((l) => l.status === 'ACTIVE').length,
      },
    });
  } catch (error: unknown) {
    console.error('[API /api/finances/loans GET] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error al obtener préstamos bancarios';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('educa360_session')?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: 'No autenticado' }, { status: 401 });
    }

    const session = await verifyToken(token);
    if (!session || (session.role !== 'ADMINISTRADOR' && session.role !== 'SOPORTE')) {
      return NextResponse.json(
        { success: false, message: 'Solo el Administrador del colegio puede gestionar préstamos bancarios' },
        { status: 403 }
      );
    }

    const tenantId = session.tenantId;
    if (!tenantId) {
      return NextResponse.json({ success: false, message: 'Colegio no identificado' }, { status: 400 });
    }

    const body = await req.json();
    const { action = 'CREATE' } = body;

    // =========================================================================
    // ACCIÓN 1: REGISTRAR NUEVO PRÉSTAMO Y GENERAR INGRESO POR DESEMBOLSO
    // =========================================================================
    if (action === 'CREATE' || action === 'CREATE_LOAN') {
      const {
        bank_name,
        loan_title,
        total_principal,
        total_installments,
        monthly_installment_amount,
        interest_rate_tea,
        disbursement_date,
        payment_day_of_month = 20,
        first_payment_date,
      } = body;

      if (!bank_name || !loan_title || !total_principal || !total_installments || !monthly_installment_amount) {
        return NextResponse.json({ success: false, message: 'Por favor completa todos los campos del préstamo' }, { status: 400 });
      }

      const numPrincipal = parseFloat(total_principal);
      const numInstallments = parseInt(total_installments, 10);
      const numMonthlyAmount = parseFloat(monthly_installment_amount);

      if (isNaN(numPrincipal) || numPrincipal <= 0) {
        return NextResponse.json({ success: false, message: 'Monto total del préstamo inválido' }, { status: 400 });
      }

      if (isNaN(numInstallments) || numInstallments < 1) {
        return NextResponse.json({ success: false, message: 'Número de cuotas debe ser al menos 1' }, { status: 400 });
      }

      if (isNaN(numMonthlyAmount) || numMonthlyAmount <= 0) {
        return NextResponse.json({ success: false, message: 'Monto de cuota mensual inválido' }, { status: 400 });
      }

      const disDate = disbursement_date || new Date().toISOString().split('T')[0];
      const firstPayDate = first_payment_date || disDate;

      // 1. Obtener o crear la categoría de egreso "Préstamos Bancarios & Financieros"
      let catRes = await query(
        `SELECT id FROM v2.financial_categories WHERE tenant_id = $1 AND name ILIKE '%Préstamos Bancarios%' LIMIT 1`,
        [tenantId]
      );
      let categoryId = catRes.rows[0]?.id;

      // Si no existe, buscar categoría de ingreso o crear una
      if (!categoryId) {
        const anyCat = await query(`SELECT id FROM v2.financial_categories WHERE tenant_id = $1 LIMIT 1`, [tenantId]);
        categoryId = anyCat.rows[0]?.id || null;
      }

      // 2. Crear transacción de INGRESO por desembolso de capital
      const txDisbursementId = `tx-disb-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const disDescription = `Desembolso Préstamo Bancario - ${bank_name} (${loan_title})`;

      await query(
        `INSERT INTO v2.financial_transactions
          (id, tenant_id, category_id, type, amount, description, transaction_date, payment_method, registered_by, created_at)
         VALUES ($1, $2, $3, 'INCOME', $4, $5, $6, 'TRANSFERENCIA', $7, NOW())`,
        [
          txDisbursementId,
          tenantId,
          categoryId,
          numPrincipal,
          disDescription,
          disDate,
          session.userId,
        ]
      );

      // 3. Crear registro de préstamo
      const loanId = `loan-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      await query(
        `INSERT INTO v2.bank_loans
          (id, tenant_id, bank_name, loan_title, total_principal, total_installments,
           monthly_installment_amount, interest_rate_tea, disbursement_date, payment_day_of_month,
           first_payment_date, disbursement_transaction_id, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'ACTIVE', NOW(), NOW())`,
        [
          loanId,
          tenantId,
          bank_name.trim(),
          loan_title.trim(),
          numPrincipal,
          numInstallments,
          numMonthlyAmount,
          interest_rate_tea ? parseFloat(interest_rate_tea) : null,
          disDate,
          parseInt(payment_day_of_month, 10) || 20,
          firstPayDate,
          txDisbursementId,
        ]
      );

      // 4. Generar el cronograma de cuotas
      const [startYear, startMonth, startDay] = firstPayDate.split('-').map((n: string) => parseInt(n, 10));

      for (let i = 1; i <= numInstallments; i++) {
        // Calcular fecha de vencimiento sumando (i - 1) meses a la primera cuota
        const targetDate = new Date(startYear, startMonth - 1 + (i - 1), startDay);
        const y = targetDate.getFullYear();
        const m = String(targetDate.getMonth() + 1).padStart(2, '0');
        const d = String(targetDate.getDate()).padStart(2, '0');
        const dueDateStr = `${y}-${m}-${d}`;

        const instId = `inst-${loanId}-${i}`;

        await query(
          `INSERT INTO v2.bank_loan_installments
            (id, loan_id, installment_number, due_date, amount, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, 'PENDING', NOW(), NOW())`,
          [instId, loanId, i, dueDateStr, numMonthlyAmount]
        );
      }

      // 5. Auditoría
      await query(
        `INSERT INTO v2.audit_logs (id, tenant_id, user_id, action, details, ip_address)
         VALUES ($1, $2, $3, 'CREATE_BANK_LOAN', $4, $5)`,
        [
          `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          tenantId,
          session.userId,
          `Préstamo bancario registrado: ${bank_name} por S/ ${numPrincipal.toFixed(2)} (${numInstallments} cuotas de S/ ${numMonthlyAmount.toFixed(2)})`,
          req.headers.get('x-forwarded-for') || '127.0.0.1',
        ]
      );

      return NextResponse.json({
        success: true,
        message: `¡Préstamo de ${bank_name} registrado! Se ingresaron S/ ${numPrincipal.toFixed(2)} al flujo de caja y se generaron ${numInstallments} cuotas.`,
        loanId,
      });
    }

    // =========================================================================
    // ACCIÓN 2: PAGAR CUOTA DE PRÉSTAMO (DESCUENTO DE GASTO EN 1 CLIC)
    // =========================================================================
    if (action === 'PAY_INSTALLMENT') {
      const {
        loan_id,
        installment_number,
        paid_date,
        payment_method = 'TRANSFERENCIA',
        receipt_number,
        pay_amount,
        funding_source = 'PROPIO',
        funding_loan_id,
        funding_entity_name,
        funding_details,
      } = body;

      if (!loan_id || !installment_number) {
        return NextResponse.json({ success: false, message: 'Datos de préstamo y cuota requeridos' }, { status: 400 });
      }

      // 1. Obtener préstamo y verificar cuota
      const loanRes = await query(
        `SELECT id, bank_name, loan_title, total_installments, monthly_installment_amount
         FROM v2.bank_loans WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
        [loan_id, tenantId]
      );

      if (loanRes.rows.length === 0) {
        return NextResponse.json({ success: false, message: 'Préstamo no encontrado' }, { status: 404 });
      }

      const loan = loanRes.rows[0];

      // Validación estricta: Las cuotas deben pagarse en orden correlativo
      const priorPendingRes = await query(
        `SELECT installment_number FROM v2.bank_loan_installments 
         WHERE loan_id = $1 AND installment_number < $2 AND status = 'PENDING' 
         ORDER BY installment_number ASC LIMIT 1`,
        [loan_id, installment_number]
      );

      if (priorPendingRes.rows.length > 0) {
        return NextResponse.json({
          success: false,
          message: `Debes pagar las cuotas en orden correlativo. La cuota #${priorPendingRes.rows[0].installment_number} aún está pendiente.`
        }, { status: 400 });
      }

      const instRes = await query(
        `SELECT id, amount, status FROM v2.bank_loan_installments WHERE loan_id = $1 AND installment_number = $2 LIMIT 1`,
        [loan_id, installment_number]
      );

      if (instRes.rows.length === 0) {
        return NextResponse.json({ success: false, message: 'Cuota no encontrada' }, { status: 404 });
      }

      const installment = instRes.rows[0];

      if (installment.status === 'PAID') {
        return NextResponse.json({ success: false, message: 'Esta cuota ya se encuentra pagada' }, { status: 400 });
      }

      const paymentDate = paid_date || new Date().toISOString().split('T')[0];
      const parsedPayAmount = pay_amount ? parseFloat(pay_amount) : Number(installment.amount);
      if (isNaN(parsedPayAmount) || parsedPayAmount <= 0) {
        return NextResponse.json({ success: false, message: 'Monto de pago inválido' }, { status: 400 });
      }
      const instAmount = parsedPayAmount;

      // Validar origen de fondos para pagar la cuota
      const check = await validateExpenseFunding(
        tenantId,
        funding_source as any,
        instAmount,
        funding_loan_id,
        funding_entity_name
      );
      if (!check.allowed) {
        return NextResponse.json({ success: false, message: check.message }, { status: 400 });
      }

      // 2. Obtener categoría de Gasto "Préstamos Bancarios & Financieros"
      let catRes = await query(
        `SELECT id FROM v2.financial_categories WHERE tenant_id = $1 AND name ILIKE '%Préstamos Bancarios%' LIMIT 1`,
        [tenantId]
      );
      const categoryId = catRes.rows[0]?.id || null;

      // 3. Crear transacción de GASTO
      const txExpenseId = `tx-inst-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const expDescription = `Pago Cuota ${installment_number}/${loan.total_installments} - ${loan.bank_name} (${loan.loan_title})`;

      await query(
        `INSERT INTO v2.financial_transactions
          (id, tenant_id, category_id, type, amount, description, transaction_date, payment_method, receipt_number, registered_by, funding_source, funding_loan_id, funding_entity_name, funding_details, created_at)
         VALUES ($1, $2, $3, 'EXPENSE', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())`,
        [
          txExpenseId,
          tenantId,
          categoryId,
          instAmount,
          expDescription,
          paymentDate,
          payment_method,
          receipt_number ? receipt_number.trim() : null,
          session.userId,
          funding_source || 'PROPIO',
          funding_loan_id || null,
          funding_entity_name || null,
          funding_details || null,
        ]
      );

      // 4. Actualizar cuota a PAID (actualizando el monto si varió)
      await query(
        `UPDATE v2.bank_loan_installments
         SET status = 'PAID', amount = $1, transaction_id = $2, paid_date = $3, payment_method = $4, receipt_number = $5, updated_at = NOW()
         WHERE id = $6`,
        [instAmount, txExpenseId, paymentDate, payment_method, receipt_number ? receipt_number.trim() : null, installment.id]
      );

      // 5. Verificar si todas las cuotas están pagadas para marcar el préstamo como PAID_OFF
      const remainingRes = await query(
        `SELECT COUNT(*) as count FROM v2.bank_loan_installments WHERE loan_id = $1 AND status = 'PENDING'`,
        [loan_id]
      );

      const remainingCount = Number(remainingRes.rows[0]?.count || 0);
      if (remainingCount === 0) {
        await query(`UPDATE v2.bank_loans SET status = 'PAID_OFF', updated_at = NOW() WHERE id = $1`, [loan_id]);
      }

      // 6. Auditoría
      await query(
        `INSERT INTO v2.audit_logs (id, tenant_id, user_id, action, details, ip_address)
         VALUES ($1, $2, $3, 'PAY_LOAN_INSTALLMENT', $4, $5)`,
        [
          `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          tenantId,
          session.userId,
          `Pagada cuota ${installment_number}/${loan.total_installments} del préstamo ${loan.bank_name} por S/ ${instAmount.toFixed(2)}`,
          req.headers.get('x-forwarded-for') || '127.0.0.1',
        ]
      );

      return NextResponse.json({
        success: true,
        message: `¡Cuota ${installment_number} de ${loan.bank_name} pagada con éxito! (S/ ${instAmount.toFixed(2)})`,
        isLoanFullyPaid: remainingCount === 0,
      });
    }

    // =========================================================================
    // ACCIÓN 3: EDITAR CUOTA INDIVIDUAL (MONTO VARIABLE O FECHA)
    // =========================================================================
    if (action === 'UPDATE_INSTALLMENT') {
      const { loan_id, installment_id, amount, due_date } = body;

      if (!loan_id || !installment_id || !amount || !due_date) {
        return NextResponse.json({ success: false, message: 'Datos incompletos para actualizar cuota' }, { status: 400 });
      }

      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return NextResponse.json({ success: false, message: 'El monto debe ser un número mayor a 0' }, { status: 400 });
      }

      // Verificar que pertenezca al tenant y esté PENDING
      const instRes = await query(
        `SELECT i.id, i.installment_number, i.status 
         FROM v2.bank_loan_installments i
         JOIN v2.bank_loans l ON i.loan_id = l.id
         WHERE i.id = $1 AND l.id = $2 AND l.tenant_id = $3
         LIMIT 1`,
        [installment_id, loan_id, tenantId]
      );

      if (instRes.rows.length === 0) {
        return NextResponse.json({ success: false, message: 'Cuota no encontrada' }, { status: 404 });
      }

      if (instRes.rows[0].status === 'PAID') {
        return NextResponse.json({ success: false, message: 'No se puede editar una cuota que ya fue pagada' }, { status: 400 });
      }

      await query(
        `UPDATE v2.bank_loan_installments
         SET amount = $1, due_date = $2, updated_at = NOW()
         WHERE id = $3`,
        [numAmount, due_date, installment_id]
      );

      return NextResponse.json({
        success: true,
        message: `Cuota #${instRes.rows[0].installment_number} actualizada a S/ ${numAmount.toFixed(2)} (Vence: ${due_date}).`
      });
    }

    // =========================================================================
    // ACCIÓN 4: REPROGRAMACIÓN / REFINANCIAMIENTO DE PRÉSTAMO
    // =========================================================================
    if (action === 'REPROGRAM_LOAN') {
      const {
        loan_id,
        new_remaining_installments,
        new_installment_amount,
        first_reprogram_due_date,
        notes
      } = body;

      const numNewInst = parseInt(new_remaining_installments, 10);
      const numNewAmount = parseFloat(new_installment_amount);

      if (!loan_id || isNaN(numNewInst) || numNewInst <= 0 || isNaN(numNewAmount) || numNewAmount <= 0 || !first_reprogram_due_date) {
        return NextResponse.json({
          success: false,
          message: 'Parámetros inválidos para la reprogramación (número de cuotas, monto y primera fecha requeridos).'
        }, { status: 400 });
      }

      const loanRes = await query(
        `SELECT id, bank_name, loan_title, total_installments, status 
         FROM v2.bank_loans WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
        [loan_id, tenantId]
      );

      if (loanRes.rows.length === 0) {
        return NextResponse.json({ success: false, message: 'Préstamo no encontrado' }, { status: 404 });
      }

      const loan = loanRes.rows[0];

      // Obtener el número de cuotas pagadas (éstas se preservan)
      const paidRes = await query(
        `SELECT installment_number FROM v2.bank_loan_installments 
         WHERE loan_id = $1 AND status = 'PAID' 
         ORDER BY installment_number DESC LIMIT 1`,
        [loan_id]
      );
      const lastPaidNumber = paidRes.rows.length > 0 ? Number(paidRes.rows[0].installment_number) : 0;

      // Eliminar las cuotas pendientes antiguas
      await query(
        `DELETE FROM v2.bank_loan_installments WHERE loan_id = $1 AND status = 'PENDING'`,
        [loan_id]
      );

      // Generar las nuevas cuotas reprogramadas
      const [rYear, rMonth, rDay] = first_reprogram_due_date.split('-').map((n: string) => parseInt(n, 10));

      for (let i = 1; i <= numNewInst; i++) {
        const instNumber = lastPaidNumber + i;
        const targetDate = new Date(rYear, rMonth - 1 + (i - 1), rDay);
        const y = targetDate.getFullYear();
        const m = String(targetDate.getMonth() + 1).padStart(2, '0');
        const d = String(targetDate.getDate()).padStart(2, '0');
        const dueDateStr = `${y}-${m}-${d}`;
        const newInstId = `inst-${loan_id}-rep-${instNumber}-${Date.now().toString().slice(-4)}`;

        await query(
          `INSERT INTO v2.bank_loan_installments
            (id, loan_id, installment_number, due_date, amount, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, 'PENDING', NOW(), NOW())`,
          [newInstId, loan_id, instNumber, dueDateStr, numNewAmount]
        );
      }

      // Actualizar el total de cuotas y cuota mensual en bank_loans
      const totalNewInstallments = lastPaidNumber + numNewInst;
      await query(
        `UPDATE v2.bank_loans 
         SET total_installments = $1, monthly_installment_amount = $2, status = 'ACTIVE', updated_at = NOW() 
         WHERE id = $3`,
        [totalNewInstallments, numNewAmount, loan_id]
      );

      // Auditoría
      await query(
        `INSERT INTO v2.audit_logs (id, tenant_id, user_id, action, details, ip_address)
         VALUES ($1, $2, $3, 'REPROGRAM_BANK_LOAN', $4, $5)`,
        [
          `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          tenantId,
          session.userId,
          `Reprogramación de préstamo: ${loan.bank_name} (${loan.loan_title}). ${numNewInst} nuevas cuotas de S/ ${numNewAmount.toFixed(2)}. ${notes ? `Nota: ${notes}` : ''}`,
          req.headers.get('x-forwarded-for') || '127.0.0.1',
        ]
      );

      return NextResponse.json({
        success: true,
        message: `¡Préstamo reprogramado con éxito! Se generaron ${numNewInst} cuotas de S/ ${numNewAmount.toFixed(2)} a partir del ${first_reprogram_due_date}.`
      });
    }

    // =========================================================================
    // ACCIÓN 5: AMORTIZACIÓN EXTRAORDINARIA A CAPITAL
    // =========================================================================
    if (action === 'CAPITAL_AMORTIZATION') {
      const {
        loan_id,
        amount,
        payment_date,
        payment_method = 'TRANSFERENCIA',
        receipt_number,
        reduction_mode = 'REDUCE_TERM', // 'REDUCE_TERM' | 'REDUCE_AMOUNT'
        funding_source = 'PROPIO',
        funding_loan_id,
        funding_entity_name,
        funding_details,
      } = body;

      const numAmount = parseFloat(amount);
      if (!loan_id || isNaN(numAmount) || numAmount <= 0) {
        return NextResponse.json({ success: false, message: 'Monto de amortización inválido' }, { status: 400 });
      }

      // Validar origen de fondos para amortización
      const check = await validateExpenseFunding(
        tenantId,
        funding_source as any,
        numAmount,
        funding_loan_id,
        funding_entity_name
      );
      if (!check.allowed) {
        return NextResponse.json({ success: false, message: check.message }, { status: 400 });
      }

      const loanRes = await query(
        `SELECT id, bank_name, loan_title, total_installments, monthly_installment_amount 
         FROM v2.bank_loans WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
        [loan_id, tenantId]
      );

      if (loanRes.rows.length === 0) {
        return NextResponse.json({ success: false, message: 'Préstamo no encontrado' }, { status: 404 });
      }

      const loan = loanRes.rows[0];

      // Obtener cuotas pendientes ordenadas
      const pendingRes = await query(
        `SELECT id, installment_number, amount, due_date FROM v2.bank_loan_installments 
         WHERE loan_id = $1 AND status = 'PENDING' 
         ORDER BY installment_number ASC`,
        [loan_id]
      );

      if (pendingRes.rows.length === 0) {
        return NextResponse.json({ success: false, message: 'Este préstamo no tiene cuotas pendientes por amortizar' }, { status: 400 });
      }

      const payDate = payment_date || new Date().toISOString().split('T')[0];

      // 1. Obtener categoría de gasto
      let catRes = await query(
        `SELECT id FROM v2.financial_categories WHERE tenant_id = $1 AND name ILIKE '%Préstamos Bancarios%' LIMIT 1`,
        [tenantId]
      );
      const categoryId = catRes.rows[0]?.id || null;

      // 2. Registrar transacción de GASTO
      const txExpenseId = `tx-amort-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const expDescription = `Amortización Extraordinaria a Capital - ${loan.bank_name} (${loan.loan_title})`;

      await query(
        `INSERT INTO v2.financial_transactions
          (id, tenant_id, category_id, type, amount, description, transaction_date, payment_method, receipt_number, registered_by, funding_source, funding_loan_id, funding_entity_name, funding_details, created_at)
         VALUES ($1, $2, $3, 'EXPENSE', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())`,
        [
          txExpenseId,
          tenantId,
          categoryId,
          numAmount,
          expDescription,
          payDate,
          payment_method,
          receipt_number ? receipt_number.trim() : null,
          session.userId,
          funding_source || 'PROPIO',
          funding_loan_id || null,
          funding_entity_name || null,
          funding_details || null,
        ]
      );

      // 3. Aplicar amortización según el modo
      let messageDetail = '';

      if (reduction_mode === 'REDUCE_TERM') {
        // Reducir cuotas desde la última hacia atrás
        let remainingToAmortize = numAmount;
        const pendingDesc = [...pendingRes.rows].reverse();
        let cancelledCount = 0;

        for (const inst of pendingDesc) {
          const instAmt = Number(inst.amount);
          if (remainingToAmortize >= instAmt) {
            await query(
              `UPDATE v2.bank_loan_installments 
               SET status = 'PAID', paid_date = $1, payment_method = $2, receipt_number = $3, transaction_id = $4, updated_at = NOW() 
               WHERE id = $5`,
              [payDate, payment_method, receipt_number ? `${receipt_number} (Amortización Capital)` : 'Amortización Extraordinaria', txExpenseId, inst.id]
            );
            remainingToAmortize -= instAmt;
            cancelledCount++;
          } else if (remainingToAmortize > 0) {
            const newInstAmt = Number((instAmt - remainingToAmortize).toFixed(2));
            await query(
              `UPDATE v2.bank_loan_installments SET amount = $1, updated_at = NOW() WHERE id = $2`,
              [newInstAmt, inst.id]
            );
            remainingToAmortize = 0;
            break;
          }
        }
        messageDetail = `Se amortizó S/ ${numAmount.toFixed(2)}, cancelando ${cancelledCount} cuota(s) del final del préstamo.`;
      } else {
        // REDUCE_AMOUNT: Distribuir el descuento entre todas las cuotas pendientes
        const totalPendingDebt = pendingRes.rows.reduce((sum: number, r: any) => sum + Number(r.amount), 0);
        const newTotalDebt = Math.max(0, totalPendingDebt - numAmount);
        const newPerInst = Number((newTotalDebt / pendingRes.rows.length).toFixed(2));

        for (const inst of pendingRes.rows) {
          await query(
            `UPDATE v2.bank_loan_installments SET amount = $1, updated_at = NOW() WHERE id = $2`,
            [newPerInst, inst.id]
          );
        }

        await query(
          `UPDATE v2.bank_loans SET monthly_installment_amount = $1, updated_at = NOW() WHERE id = $2`,
          [newPerInst, loan_id]
        );
        messageDetail = `Se amortizó S/ ${numAmount.toFixed(2)}, recalculando las ${pendingRes.rows.length} cuotas restantes a S/ ${newPerInst.toFixed(2)} cada una.`;
      }

      // 4. Verificar si quedaron cuotas pendientes
      const checkPending = await query(
        `SELECT COUNT(*) as count FROM v2.bank_loan_installments WHERE loan_id = $1 AND status = 'PENDING'`,
        [loan_id]
      );
      if (Number(checkPending.rows[0].count) === 0) {
        await query(`UPDATE v2.bank_loans SET status = 'PAID_OFF', updated_at = NOW() WHERE id = $1`, [loan_id]);
      }

      // 5. Auditoría
      await query(
        `INSERT INTO v2.audit_logs (id, tenant_id, user_id, action, details, ip_address)
         VALUES ($1, $2, $3, 'AMORTIZE_BANK_LOAN', $4, $5)`,
        [
          `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          tenantId,
          session.userId,
          `Amortización a capital: ${loan.bank_name} (${loan.loan_title}) por S/ ${numAmount.toFixed(2)}. ${messageDetail}`,
          req.headers.get('x-forwarded-for') || '127.0.0.1',
        ]
      );

      return NextResponse.json({
        success: true,
        message: `¡Amortización registrada con éxito! ${messageDetail}`,
      });
    }

    return NextResponse.json({ success: false, message: 'Acción no reconocida' }, { status: 400 });
  } catch (error: unknown) {
    console.error('[API /api/finances/loans POST] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error al procesar préstamo bancario';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = req.cookies.get('educa360_session')?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: 'No autenticado' }, { status: 401 });
    }

    const session = await verifyToken(token);
    if (!session || (session.role !== 'ADMINISTRADOR' && session.role !== 'SOPORTE')) {
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 403 });
    }

    const tenantId = session.tenantId;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID de préstamo requerido' }, { status: 400 });
    }

    // 1. Obtener datos del préstamo a eliminar
    const loanRes = await query(
      `SELECT id, loan_title, bank_name, total_principal, disbursement_transaction_id 
       FROM v2.bank_loans WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    if (loanRes.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Préstamo no encontrado' }, { status: 404 });
    }
    const loan = loanRes.rows[0];

    // 2. Obtener todas las transacciones financieras asociadas (desembolso + cuotas pagadas)
    const instRes = await query(
      `SELECT transaction_id FROM v2.bank_loan_installments WHERE loan_id = $1 AND transaction_id IS NOT NULL`,
      [id]
    );

    const txIdsToDelete: string[] = [];
    if (loan.disbursement_transaction_id) {
      txIdsToDelete.push(loan.disbursement_transaction_id);
    }
    for (const r of instRes.rows) {
      if (r.transaction_id) {
        txIdsToDelete.push(r.transaction_id);
      }
    }

    // 3. Revertir y eliminar las transacciones de flujo de caja asociadas para evitar desbalance
    if (txIdsToDelete.length > 0) {
      await query(
        `DELETE FROM v2.financial_transactions WHERE id = ANY($1::varchar[]) AND tenant_id = $2`,
        [txIdsToDelete, tenantId]
      );
    }

    // 4. Eliminar las cuotas del cronograma
    await query(`DELETE FROM v2.bank_loan_installments WHERE loan_id = $1`, [id]);

    // 5. Eliminar el préstamo bancario definitivamente
    await query(`DELETE FROM v2.bank_loans WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);

    await query(
      `INSERT INTO v2.audit_logs (id, tenant_id, user_id, action, details, ip_address)
       VALUES ($1, $2, $3, 'DELETE_BANK_LOAN', $4, $5)`,
      [
        `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        tenantId,
        session.userId,
        `Préstamo bancario eliminado y transacciones revertidas: "${loan.loan_title}" (${loan.bank_name})`,
        req.headers.get('x-forwarded-for') || '127.0.0.1',
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Préstamo bancario y movimientos asociados eliminados correctamente.',
    });
  } catch (error: unknown) {
    console.error('[API /api/finances/loans DELETE] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error al cancelar préstamo';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
