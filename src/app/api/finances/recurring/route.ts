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

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const month = searchParams.get('month') || currentMonth;

    const sql = `
      SELECT 
        r.id, r.tenant_id, r.name, r.category_id, r.supplier_name, r.supply_number,
        r.default_amount, r.is_variable_amount, r.due_day, r.payment_method, r.status, r.created_at,
        c.name as category_name,
        CASE WHEN p.id IS NOT NULL THEN TRUE ELSE FALSE END as is_paid_this_month,
        p.amount as paid_amount_this_month,
        TO_CHAR(p.paid_date, 'YYYY-MM-DD') as paid_date_this_month,
        p.transaction_id as paid_transaction_id
      FROM v2.recurring_expenses r
      LEFT JOIN v2.financial_categories c ON r.category_id = c.id
      LEFT JOIN v2.recurring_expense_payments p 
        ON r.id = p.recurring_expense_id AND p.period_month = $2
      WHERE r.tenant_id = $1 AND r.status = 'ACTIVE'
      ORDER BY r.due_day ASC, r.name ASC
    `;

    const res = await query(sql, [tenantId, month]);

    const totalServices = res.rows.length;
    const paidServicesCount = res.rows.filter((r: any) => r.is_paid_this_month).length;
    const pendingServicesCount = totalServices - paidServicesCount;
    const totalPaidAmount = res.rows
      .filter((r: any) => r.is_paid_this_month)
      .reduce((sum: number, r: any) => sum + Number(r.paid_amount_this_month || 0), 0);

    return NextResponse.json({
      success: true,
      periodMonth: month,
      recurringExpenses: res.rows.map((r: any) => ({
        id: r.id,
        tenant_id: r.tenant_id,
        name: r.name,
        category_id: r.category_id,
        category_name: r.category_name,
        supplier_name: r.supplier_name,
        supply_number: r.supply_number,
        default_amount: Number(r.default_amount || 0),
        is_variable_amount: Boolean(r.is_variable_amount),
        due_day: Number(r.due_day),
        payment_method: r.payment_method,
        status: r.status,
        created_at: r.created_at,
        is_paid_this_month: Boolean(r.is_paid_this_month),
        paid_amount_this_month: r.paid_amount_this_month ? Number(r.paid_amount_this_month) : null,
        paid_date_this_month: r.paid_date_this_month ? formatDbDate(r.paid_date_this_month) : null,
      })),
      metrics: {
        totalServices,
        paidServicesCount,
        pendingServicesCount,
        totalPaidAmount,
      },
    });
  } catch (error: unknown) {
    console.error('[API /api/finances/recurring GET] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error al obtener gastos recurrentes';
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
      return NextResponse.json({ success: false, message: 'Permiso denegado' }, { status: 403 });
    }

    const tenantId = session.tenantId;
    if (!tenantId) {
      return NextResponse.json({ success: false, message: 'Colegio no identificado' }, { status: 400 });
    }

    const body = await req.json();
    const { action = 'CREATE' } = body;

    // =========================================================================
    // ACCIÓN 1: CREAR NUEVO SERVICIO RECURRENTE / GASTO FIJO
    // =========================================================================
    if (action === 'CREATE') {
      const {
        name,
        category_id,
        supplier_name,
        supply_number,
        default_amount = 0,
        is_variable_amount = false,
        due_day = 1,
        payment_method = 'TRANSFERENCIA',
      } = body;

      if (!name || !name.trim()) {
        return NextResponse.json({ success: false, message: 'El nombre del servicio es obligatorio' }, { status: 400 });
      }

      const numDueDay = parseInt(due_day, 10);
      if (isNaN(numDueDay) || numDueDay < 1 || numDueDay > 31) {
        return NextResponse.json({ success: false, message: 'El día de vencimiento debe estar entre 1 y 31' }, { status: 400 });
      }

      const id = `rec-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      await query(
        `INSERT INTO v2.recurring_expenses 
          (id, tenant_id, name, category_id, supplier_name, supply_number, default_amount, is_variable_amount, due_day, payment_method, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'ACTIVE', NOW(), NOW())`,
        [
          id,
          tenantId,
          name.trim(),
          category_id || null,
          supplier_name ? supplier_name.trim() : null,
          supply_number ? supply_number.trim() : null,
          Number(default_amount) || 0,
          Boolean(is_variable_amount),
          numDueDay,
          payment_method || 'TRANSFERENCIA',
        ]
      );

      await query(
        `INSERT INTO v2.audit_logs (id, tenant_id, user_id, action, details, ip_address)
         VALUES ($1, $2, $3, 'CREATE_RECURRING_EXPENSE', $4, $5)`,
        [
          `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          tenantId,
          session.userId,
          `Configurado servicio recurrente: "${name.trim()}" (Día ${numDueDay} de cada mes)`,
          req.headers.get('x-forwarded-for') || '127.0.0.1',
        ]
      );

      return NextResponse.json({
        success: true,
        message: `Servicio "${name.trim()}" configurado exitosamente.`,
        id,
      });
    }

    // =========================================================================
    // ACCIÓN 2: PAGAR SERVICIO DEL MES (GENERAR TRANSACCIÓN EN 1 CLIC)
    // =========================================================================
    if (action === 'PAY') {
      const {
        recurring_expense_id,
        period_month,
        amount,
        payment_method = 'TRANSFERENCIA',
        receipt_number,
        paid_date,
        funding_source = 'PROPIO',
        funding_loan_id,
        funding_entity_name,
        funding_details,
      } = body;

      if (!recurring_expense_id || !period_month) {
        return NextResponse.json({ success: false, message: 'Datos de servicio y periodo incompletos' }, { status: 400 });
      }

      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return NextResponse.json({ success: false, message: 'El monto pagado debe ser mayor a 0' }, { status: 400 });
      }

      // Validar origen de fondos
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

      // 1. Obtener detalles del servicio recurrente
      const recRes = await query(
        `SELECT id, name, category_id, supplier_name, supply_number FROM v2.recurring_expenses WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
        [recurring_expense_id, tenantId]
      );

      if (recRes.rows.length === 0) {
        return NextResponse.json({ success: false, message: 'Servicio recurrente no encontrado' }, { status: 404 });
      }

      const rec = recRes.rows[0];

      // 2. Comprobar si ya fue pagado para este periodo
      const checkPaid = await query(
        `SELECT id FROM v2.recurring_expense_payments WHERE recurring_expense_id = $1 AND period_month = $2 LIMIT 1`,
        [recurring_expense_id, period_month]
      );

      if (checkPaid.rows.length > 0) {
        return NextResponse.json(
          { success: false, message: `Este servicio ya fue registrado como pagado para el periodo ${period_month}.` },
          { status: 400 }
        );
      }

      const txDate = paid_date || new Date().toISOString().split('T')[0];
      const txId = `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const pmtId = `rpay-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const description = `Pago de ${rec.name} - Periodo ${period_month}${
        rec.supply_number ? ` (Suministro: ${rec.supply_number})` : ''
      }`;

      // 3. Crear transacción de GASTO
      await query(
        `INSERT INTO v2.financial_transactions
          (id, tenant_id, category_id, type, amount, description, transaction_date, payment_method, receipt_number, registered_by, funding_source, funding_loan_id, funding_entity_name, funding_details, created_at)
         VALUES ($1, $2, $3, 'EXPENSE', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())`,
        [
          txId,
          tenantId,
          rec.category_id,
          numAmount,
          description,
          txDate,
          payment_method,
          receipt_number ? receipt_number.trim() : null,
          session.userId,
          funding_source || 'PROPIO',
          funding_loan_id || null,
          funding_entity_name || null,
          funding_details || null,
        ]
      );

      // 4. Registrar en historial de pagos recurrentes
      await query(
        `INSERT INTO v2.recurring_expense_payments
          (id, recurring_expense_id, transaction_id, period_month, amount, paid_date, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [pmtId, recurring_expense_id, txId, period_month, numAmount, txDate]
      );

      // 5. Auditoría
      await query(
        `INSERT INTO v2.audit_logs (id, tenant_id, user_id, action, details, ip_address)
         VALUES ($1, $2, $3, 'PAY_RECURRING_EXPENSE', $4, $5)`,
        [
          `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          tenantId,
          session.userId,
          `Pagado servicio recurrente: "${rec.name}" periodo ${period_month} por S/ ${numAmount.toFixed(2)}`,
          req.headers.get('x-forwarded-for') || '127.0.0.1',
        ]
      );

      return NextResponse.json({
        success: true,
        message: `¡Pago de ${rec.name} registrado con éxito! (S/ ${numAmount.toFixed(2)})`,
        transaction_id: txId,
      });
    }

    return NextResponse.json({ success: false, message: 'Acción no reconocida' }, { status: 400 });
  } catch (error: unknown) {
    console.error('[API /api/finances/recurring POST] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error al procesar servicio recurrente';
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
      return NextResponse.json({ success: false, message: 'ID de servicio requerido' }, { status: 400 });
    }

    // Desactivar servicio
    await query(`UPDATE v2.recurring_expenses SET status = 'PAUSED', updated_at = NOW() WHERE id = $1 AND tenant_id = $2`, [
      id,
      tenantId,
    ]);

    await query(
      `INSERT INTO v2.audit_logs (id, tenant_id, user_id, action, details, ip_address)
       VALUES ($1, $2, $3, 'PAUSE_RECURRING_EXPENSE', $4, $5)`,
      [
        `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        tenantId,
        session.userId,
        `Servicio recurrente desactivado: ID ${id}`,
        req.headers.get('x-forwarded-for') || '127.0.0.1',
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Servicio recurrente eliminado / desactivado del calendario.',
    });
  } catch (error: unknown) {
    console.error('[API /api/finances/recurring DELETE] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error al eliminar servicio recurrente';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
