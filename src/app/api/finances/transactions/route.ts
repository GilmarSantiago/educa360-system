import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';
import { getFundsSummary, validateExpenseFunding } from '@/lib/finances/fundingValidation';

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
      return NextResponse.json(
        { success: false, message: 'No perteneces a ningún colegio' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'ALL' | 'INCOME' | 'EXPENSE'
    const categoryId = searchParams.get('categoryId');
    const search = searchParams.get('search')?.trim() || '';
    const month = searchParams.get('month'); // e.g. '2026-10' or null

    const conditions: string[] = ['t.tenant_id = $1'];
    const values: any[] = [tenantId];
    let paramIndex = 2;

    if (type && type !== 'ALL') {
      conditions.push(`t.type = $${paramIndex++}`);
      values.push(type);
    }

    if (categoryId && categoryId !== 'ALL') {
      conditions.push(`t.category_id = $${paramIndex++}`);
      values.push(categoryId);
    }

    if (search) {
      conditions.push(
        `(t.description ILIKE $${paramIndex} OR t.receipt_number ILIKE $${paramIndex} OR c.name ILIKE $${paramIndex})`
      );
      values.push(`%${search}%`);
      paramIndex++;
    }

    if (month) {
      conditions.push(`TO_CHAR(t.transaction_date, 'YYYY-MM') = $${paramIndex++}`);
      values.push(month);
    }

    const whereClause = conditions.join(' AND ');

    // 1. Obtener lista de transacciones detalladas con origen de fondos
    const sqlTransactions = `
      SELECT t.id, t.tenant_id, t.category_id, t.type, t.amount, t.description,
             TO_CHAR(t.transaction_date, 'YYYY-MM-DD') as transaction_date,
             t.payment_method, t.receipt_number, t.registered_by,
             t.funding_source, t.funding_loan_id, t.funding_entity_name, t.funding_details,
             t.created_at,
             c.name as category_name,
             u.name as registered_by_name
      FROM v2.financial_transactions t
      LEFT JOIN v2.financial_categories c ON t.category_id = c.id
      LEFT JOIN v2.users u ON t.registered_by = u.id
      WHERE ${whereClause}
      ORDER BY t.transaction_date DESC, t.created_at DESC
    `;

    const txRes = await query(sqlTransactions, values);

    // 2. Calcular Métricas Totales para el periodo (independiente de filtros de tipo)
    const metricsConditions: string[] = ['t.tenant_id = $1'];
    const metricsValues: any[] = [tenantId];
    let mIdx = 2;

    if (month) {
      metricsConditions.push(`TO_CHAR(t.transaction_date, 'YYYY-MM') = $${mIdx++}`);
      metricsValues.push(month);
    }

    const sqlMetrics = `
      SELECT 
        COALESCE(SUM(CASE WHEN t.type = 'INCOME' AND NOT (
          t.description ILIKE '%Desembolso%' OR 
          t.description ILIKE '%Préstamo Bancario%' OR 
          t.description ILIKE '%Prestamo Bancario%' OR 
          t.id LIKE 'tx-disb%' OR
          t.description ILIKE '%Aporte de Capital%' OR
          t.description ILIKE '%Aporte de Socio%' OR
          t.funding_source = 'APORTE_SOCIO' OR
          t.funding_source = 'SOCIO' OR
          t.funding_source = 'PRESTAMISTA' OR
          t.description ILIKE '%Prestamista%'
        ) THEN t.amount ELSE 0 END), 0) as total_produced,
        COALESCE(SUM(CASE WHEN t.type = 'INCOME' AND (
          t.description ILIKE '%Aporte de Capital%' OR
          t.description ILIKE '%Aporte de Socio%' OR
          t.funding_source = 'APORTE_SOCIO' OR
          t.funding_source = 'SOCIO'
        ) THEN t.amount ELSE 0 END), 0) as total_partner_contributions,
        COALESCE(SUM(CASE WHEN t.type = 'INCOME' AND (
          t.description ILIKE '%Desembolso%' OR 
          t.description ILIKE '%Préstamo Bancario%' OR 
          t.description ILIKE '%Prestamo Bancario%' OR 
          t.id LIKE 'tx-disb%'
        ) THEN t.amount ELSE 0 END), 0) as total_loans_received,
        COALESCE(SUM(CASE WHEN t.type = 'INCOME' AND (
          t.funding_source = 'PRESTAMISTA' OR
          t.description ILIKE '%Prestamista%'
        ) THEN t.amount ELSE 0 END), 0) as total_lenders_received,
        COALESCE(SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount ELSE 0 END), 0) as total_expense,
        COUNT(t.id) as total_count
      FROM v2.financial_transactions t
      WHERE ${metricsConditions.join(' AND ')}
    `;

    const metricsRes = await query(sqlMetrics, metricsValues);
    const totalProduced = Number(metricsRes.rows[0]?.total_produced || 0);
    const totalPartnerContributions = Number(metricsRes.rows[0]?.total_partner_contributions || 0);
    const totalLoansReceived = Number(metricsRes.rows[0]?.total_loans_received || 0);
    const totalLendersReceived = Number(metricsRes.rows[0]?.total_lenders_received || 0);
    const totalIncome = Number(metricsRes.rows[0]?.total_income || 0);
    const totalExpense = Number(metricsRes.rows[0]?.total_expense || 0);
    const operatingBalance = totalProduced - totalExpense;
    const netBalance = totalIncome - totalExpense;
    const transactionsCount = Number(metricsRes.rows[0]?.total_count || 0);

    // 3. Desglose de Gastos por Categoría
    const sqlExpenseBreakdown = `
      SELECT c.name as category, COALESCE(SUM(t.amount), 0) as amount
      FROM v2.financial_transactions t
      JOIN v2.financial_categories c ON t.category_id = c.id
      WHERE t.tenant_id = $1 AND t.type = 'EXPENSE' ${month ? "AND TO_CHAR(t.transaction_date, 'YYYY-MM') = $2" : ""}
      GROUP BY c.name
      ORDER BY amount DESC
    `;
    const expBreakdownRes = await query(sqlExpenseBreakdown, month ? [tenantId, month] : [tenantId]);

    // 4. Desglose de Ingresos Producidos por Categoría (Excluye Préstamos Bancarios y Aportes de Socios)
    const sqlIncomeBreakdown = `
      SELECT c.name as category, COALESCE(SUM(t.amount), 0) as amount
      FROM v2.financial_transactions t
      JOIN v2.financial_categories c ON t.category_id = c.id
      WHERE t.tenant_id = $1 
        AND t.type = 'INCOME' 
        AND NOT (
          t.description ILIKE '%Desembolso%' OR 
          t.description ILIKE '%Préstamo Bancario%' OR 
          t.description ILIKE '%Prestamo Bancario%' OR 
          t.id LIKE 'tx-disb%' OR
          t.description ILIKE '%Aporte de Capital%' OR
          t.description ILIKE '%Aporte de Socio%' OR
          t.funding_source = 'APORTE_SOCIO' OR
          t.funding_source = 'SOCIO' OR
          t.funding_source = 'PRESTAMISTA' OR
          t.description ILIKE '%Prestamista%'
        )
        ${month ? "AND TO_CHAR(t.transaction_date, 'YYYY-MM') = $2" : ""}
      GROUP BY c.name
      ORDER BY amount DESC
    `;
    const incBreakdownRes = await query(sqlIncomeBreakdown, month ? [tenantId, month] : [tenantId]);

    // 5. Desglose de Gastos por Origen de Fondos (¿Con qué dinero se pagó cada gasto?)
    const sqlFundingBreakdown = `
      SELECT 
        COALESCE(SUM(CASE WHEN t.funding_source = 'PROPIO' OR t.funding_source IS NULL THEN t.amount ELSE 0 END), 0) as propio,
        COALESCE(SUM(CASE WHEN t.funding_source = 'PRESTAMO_BANCARIO' OR t.funding_source = 'PRESTAMO' THEN t.amount ELSE 0 END), 0) as prestamo_bancario,
        COALESCE(SUM(CASE WHEN t.funding_source = 'PRESTAMISTA' THEN t.amount ELSE 0 END), 0) as prestamista,
        COALESCE(SUM(CASE WHEN t.funding_source = 'APORTE_SOCIO' OR t.funding_source = 'SOCIO' THEN t.amount ELSE 0 END), 0) as aporte_socio,
        COALESCE(SUM(CASE WHEN t.funding_source = 'OTRO' THEN t.amount ELSE 0 END), 0) as otro
      FROM v2.financial_transactions t
      WHERE t.tenant_id = $1 AND t.type = 'EXPENSE' ${month ? "AND TO_CHAR(t.transaction_date, 'YYYY-MM') = $2" : ""}
    `;
    const fundBreakdownRes = await query(sqlFundingBreakdown, month ? [tenantId, month] : [tenantId]);
    const fundRow = fundBreakdownRes.rows[0] || {};
    const expensesByFunding = {
      propio: Number(fundRow.propio || 0),
      prestamo_bancario: Number(fundRow.prestamo_bancario || 0),
      prestamista: Number(fundRow.prestamista || 0),
      aporte_socio: Number(fundRow.aporte_socio || 0),
      otro: Number(fundRow.otro || 0),
    };

    const fundsSummary = await getFundsSummary(tenantId);

    return NextResponse.json({
      success: true,
      transactions: txRes.rows,
      metrics: {
        totalProduced,
        totalPartnerContributions,
        totalLoansReceived,
        totalLendersReceived,
        totalIncome,
        totalExpense,
        operatingBalance,
        netBalance,
        transactionsCount,
        expenseByCategory: expBreakdownRes.rows.map((r: any) => ({ category: r.category, amount: Number(r.amount) })),
        incomeByCategory: incBreakdownRes.rows.map((r: any) => ({ category: r.category, amount: Number(r.amount) })),
        expensesByFunding,
        fundsSummary,
      },
    });
  } catch (error: unknown) {
    console.error('[API /api/finances/transactions GET] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error al obtener transacciones financieras';
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
    if (!session || (session.role !== 'ADMINISTRADOR' && session.role !== 'SOPORTE' && session.role !== 'COLABORADOR')) {
      return NextResponse.json(
        { success: false, message: 'No tienes permiso para registrar movimientos financieros' },
        { status: 403 }
      );
    }

    const tenantId = session.tenantId;
    if (!tenantId) {
      return NextResponse.json({ success: false, message: 'Colegio no identificado' }, { status: 400 });
    }

    const body = await req.json();
    const {
      type,
      amount,
      category_id,
      description,
      transaction_date,
      payment_method = 'EFECTIVO',
      receipt_number,
      funding_source = 'PROPIO',
      funding_loan_id,
      funding_entity_name,
      funding_details,
    } = body;

    if (!type || (type !== 'INCOME' && type !== 'EXPENSE')) {
      return NextResponse.json({ success: false, message: 'Tipo de movimiento inválido (Ingreso o Gasto)' }, { status: 400 });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ success: false, message: 'El monto debe ser un número positivo mayor a 0' }, { status: 400 });
    }

    if (!description || !description.trim()) {
      return NextResponse.json({ success: false, message: 'El concepto o descripción es obligatorio' }, { status: 400 });
    }

    if (!category_id) {
      return NextResponse.json({ success: false, message: 'Selecciona una categoría para clasificar el movimiento' }, { status: 400 });
    }

    // Validar que la categoría exista en este colegio y que su tipo coincida con la transacción
    const catCheck = await query(
      `SELECT id, name, type FROM v2.financial_categories WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
      [category_id, tenantId]
    );

    if (catCheck.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'La categoría seleccionada no existe en este colegio' }, { status: 400 });
    }

    if (catCheck.rows[0].type !== type) {
      return NextResponse.json(
        {
          success: false,
          message: `La categoría "${catCheck.rows[0].name}" es de tipo ${catCheck.rows[0].type === 'INCOME' ? 'Ingreso' : 'Gasto'} y no corresponde a un movimiento de ${type === 'INCOME' ? 'Ingreso' : 'Gasto'}.`,
        },
        { status: 400 }
      );
    }

    // =========================================================================
    // VALIDACIÓN ESTRICTA: ¿DE DÓNDE SALIÓ EL DINERO? (ORIGEN DE FONDOS)
    // =========================================================================
    let finalFundingSource = funding_source || 'PROPIO';
    if (finalFundingSource === 'SOCIO') finalFundingSource = 'APORTE_SOCIO';
    if (finalFundingSource === 'PRESTAMO') finalFundingSource = 'PRESTAMO_BANCARIO';
    let finalFundingLoanId: string | null = funding_loan_id || null;
    let finalFundingEntityName: string | null = funding_entity_name ? funding_entity_name.trim() : null;
    let finalFundingDetails: string | null = funding_details ? funding_details.trim() : null;

    if (type === 'EXPENSE') {
      const check = await validateExpenseFunding(
        tenantId,
        finalFundingSource as any,
        numAmount,
        finalFundingLoanId,
        finalFundingEntityName
      );

      if (!check.allowed) {
        return NextResponse.json({ success: false, message: check.message }, { status: 400 });
      }

      if (finalFundingSource === 'PRESTAMO_BANCARIO' && !finalFundingEntityName) {
        const loanRes = await query(`SELECT bank_name, loan_title FROM v2.bank_loans WHERE id = $1`, [finalFundingLoanId]);
        if (loanRes.rows.length > 0) {
          finalFundingEntityName = `${loanRes.rows[0].bank_name} (${loanRes.rows[0].loan_title})`;
        }
      }
    }

    const dateVal = transaction_date ? transaction_date : new Date().toISOString().split('T')[0];
    const txId = `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    await query(
      `INSERT INTO v2.financial_transactions (
        id, tenant_id, category_id, type, amount, description, transaction_date,
        payment_method, receipt_number, registered_by,
        funding_source, funding_loan_id, funding_entity_name, funding_details,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())`,
      [
        txId,
        tenantId,
        category_id,
        type,
        numAmount,
        description.trim(),
        dateVal,
        payment_method,
        receipt_number ? receipt_number.trim() : null,
        session.userId,
        finalFundingSource,
        finalFundingLoanId,
        finalFundingEntityName,
        finalFundingDetails,
      ]
    );

    // Auditoría
    await query(
      `INSERT INTO v2.audit_logs (id, tenant_id, user_id, action, details, ip_address)
       VALUES ($1, $2, $3, 'REGISTER_FINANCE_TX', $4, $5)`,
      [
        `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        tenantId,
        session.userId,
        `${type === 'INCOME' ? 'Ingreso' : 'Gasto'} registrado: S/ ${numAmount.toFixed(2)} - "${description.trim()}"`,
        req.headers.get('x-forwarded-for') || '127.0.0.1',
      ]
    );

    return NextResponse.json({
      success: true,
      message: `${type === 'INCOME' ? 'Ingreso' : 'Gasto'} de S/ ${numAmount.toFixed(2)} registrado con éxito`,
      transactionId: txId,
    });
  } catch (error: unknown) {
    console.error('[API /api/finances/transactions POST] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error al registrar movimiento';
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
      return NextResponse.json(
        { success: false, message: 'Solo el Administrador del colegio puede anular transacciones' },
        { status: 403 }
      );
    }

    const tenantId = session.tenantId;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID de transacción requerido' }, { status: 400 });
    }

    const txRes = await query(
      `SELECT id, type, amount, description FROM v2.financial_transactions WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
      [id, tenantId]
    );

    if (txRes.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Transacción no encontrada' }, { status: 404 });
    }

    const tx = txRes.rows[0];

    // =========================================================================
    // VALIDACIONES DE INTEGRIDAD FINANCIERA (PREVENIR DESBALANCES)
    // =========================================================================

    // 1. Verificar si es el desembolso de un préstamo bancario activo
    const loanDisb = await query(
      `SELECT id, loan_title, bank_name, total_principal 
       FROM v2.bank_loans 
       WHERE disbursement_transaction_id = $1 AND tenant_id = $2 AND status != 'CANCELLED'`,
      [id, tenantId]
    );
    if (loanDisb.rows.length > 0) {
      const l = loanDisb.rows[0];
      return NextResponse.json(
        {
          success: false,
          message: `No se puede anular este movimiento directamente. Corresponde al desembolso del préstamo bancario "${l.loan_title}" (${l.bank_name}). Para dar de baja este ingreso sin desbalancear la contabilidad, debes eliminar o cancelar el préstamo desde el submódulo de "4. Fijos & Préstamos".`,
        },
        { status: 400 }
      );
    }

    // 2. Verificar si es el pago de una cuota de préstamo bancario
    const loanInst = await query(
      `SELECT i.id, i.installment_number, l.loan_title, l.bank_name
       FROM v2.bank_loan_installments i
       JOIN v2.bank_loans l ON i.loan_id = l.id
       WHERE i.transaction_id = $1 AND l.tenant_id = $2`,
      [id, tenantId]
    );
    if (loanInst.rows.length > 0) {
      const li = loanInst.rows[0];
      return NextResponse.json(
        {
          success: false,
          message: `Este movimiento está vinculado al pago de la Cuota ${li.installment_number} del préstamo "${li.loan_title}". Para anularlo de forma segura, gestiónalo desde el submódulo de "4. Fijos & Préstamos".`,
        },
        { status: 400 }
      );
    }

    // 3. Verificar si es el pago de una cuota a proveedor de mercadería / lote
    const batchPay = await query(
      `SELECT bp.id, bp.part_number, p.name as product_name
       FROM v2.product_batch_payments bp
       JOIN v2.product_batches b ON bp.batch_id = b.id
       JOIN v2.school_products p ON b.product_id = p.id
       WHERE bp.transaction_id = $1 AND p.tenant_id = $2`,
      [id, tenantId]
    );
    if (batchPay.rows.length > 0) {
      const bp = batchPay.rows[0];
      return NextResponse.json(
        {
          success: false,
          message: `Este movimiento corresponde al pago de la Cuota ${bp.part_number} de inversión a proveedor del producto "${bp.product_name}". Para mantener la coherencia contable, debe gestionarse desde el submódulo de "3. Productos".`,
        },
        { status: 400 }
      );
    }

    // 4. Verificar si es una venta de producto / mercadería
    const prodSale = await query(
      `SELECT s.id, p.name as product_name, s.quantity
       FROM v2.product_sales s
       JOIN v2.school_products p ON s.product_id = p.id
       WHERE s.transaction_id = $1 AND p.tenant_id = $2`,
      [id, tenantId]
    );
    if (prodSale.rows.length > 0) {
      const ps = prodSale.rows[0];
      return NextResponse.json(
        {
          success: false,
          message: `Este movimiento corresponde a la venta de ${ps.quantity} unidad(es) de "${ps.product_name}". Eliminarlo directamente provocaría un desajuste en el stock e historial de caja.`,
        },
        { status: 400 }
      );
    }

    // 5. Verificar si es el cobro de una pensión escolar
    const tuitionPay = await query(
      `SELECT id, student_name, period_month 
       FROM v2.student_tuitions 
       WHERE transaction_id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    if (tuitionPay.rows.length > 0) {
      const tp = tuitionPay.rows[0];
      return NextResponse.json(
        {
          success: false,
          message: `Este movimiento está vinculado al cobro de pensión de "${tp.student_name}" (${tp.period_month}). Debe gestionarse desde el submódulo de "2. Pensiones".`,
        },
        { status: 400 }
      );
    }

    // Si es un movimiento libre/manual sin enlaces críticos, se procede con la eliminación
    await query(`DELETE FROM v2.financial_transactions WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);

    await query(
      `INSERT INTO v2.audit_logs (id, tenant_id, user_id, action, details, ip_address)
       VALUES ($1, $2, $3, 'DELETE_FINANCE_TX', $4, $5)`,
      [
        `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        tenantId,
        session.userId,
        `Transacción anulada: ${tx.type === 'INCOME' ? 'Ingreso' : 'Gasto'} de S/ ${Number(tx.amount).toFixed(2)} - "${tx.description}"`,
        req.headers.get('x-forwarded-for') || '127.0.0.1',
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Movimiento financiero eliminado correctamente',
    });
  } catch (error: unknown) {
    console.error('[API /api/finances/transactions DELETE] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error al eliminar transacción';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
