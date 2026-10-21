import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';

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

    // 1. Obtener turno actualmente abierto (si existe)
    const openShiftRes = await query(
      `SELECT s.id, s.tenant_id, s.opened_by, s.opening_balance, s.opened_at, s.status,
              u.name as opened_by_name
       FROM v2.cash_register_shifts s
       LEFT JOIN v2.users u ON s.opened_by = u.id
       WHERE s.tenant_id = $1 AND s.status = 'OPEN'
       ORDER BY s.opened_at DESC LIMIT 1`,
      [tenantId]
    );

    let activeShift = null;

    if (openShiftRes.rows.length > 0) {
      const s = openShiftRes.rows[0];

      // Calcular operaciones ocurridas desde que se abrió el turno
      const txRes = await query(
        `SELECT 
          COALESCE(SUM(CASE WHEN type = 'INCOME' AND payment_method = 'EFECTIVO' THEN amount ELSE 0 END), 0) as cash_income,
          COALESCE(SUM(CASE WHEN type = 'EXPENSE' AND payment_method = 'EFECTIVO' THEN amount ELSE 0 END), 0) as cash_expense,
          COALESCE(SUM(CASE WHEN type = 'INCOME' AND payment_method != 'EFECTIVO' THEN amount ELSE 0 END), 0) as digital_income,
          COUNT(*) as shift_tx_count
         FROM v2.financial_transactions
         WHERE tenant_id = $1 AND created_at >= $2`,
        [tenantId, s.opened_at]
      );

      const cashIncome = Number(txRes.rows[0]?.cash_income || 0);
      const cashExpense = Number(txRes.rows[0]?.cash_expense || 0);
      const digitalIncome = Number(txRes.rows[0]?.digital_income || 0);
      const shiftTxCount = Number(txRes.rows[0]?.shift_tx_count || 0);

      const openingBalance = Number(s.opening_balance);
      const expectedCash = openingBalance + cashIncome - cashExpense;
      const expectedDigital = digitalIncome;

      activeShift = {
        id: s.id,
        opened_by: s.opened_by,
        opened_by_name: s.opened_by_name || 'Cajero de Turno',
        opening_balance: openingBalance,
        opened_at: s.opened_at,
        status: 'OPEN',
        cash_income: cashIncome,
        cash_expense: cashExpense,
        digital_income: digitalIncome,
        expected_cash: expectedCash,
        expected_digital: expectedDigital,
        shift_tx_count: shiftTxCount,
      };
    }

    // 2. Historial de turnos cerrados recientemente
    const historyRes = await query(
      `SELECT s.id, s.opening_balance, s.opened_at, s.closed_at, s.status,
              s.expected_cash, s.expected_digital, s.actual_cash, s.discrepancy, s.closure_notes,
              u1.name as opened_by_name,
              u2.name as closed_by_name
       FROM v2.cash_register_shifts s
       LEFT JOIN v2.users u1 ON s.opened_by = u1.id
       LEFT JOIN v2.users u2 ON s.closed_by = u2.id
       WHERE s.tenant_id = $1 AND s.status = 'CLOSED'
       ORDER BY s.closed_at DESC LIMIT 10`,
      [tenantId]
    );

    // 3. Saldo del último turno cerrado para sugerir saldo inicial al abrir
    const lastClosedRes = await query(
      `SELECT actual_cash FROM v2.cash_register_shifts WHERE tenant_id = $1 AND status = 'CLOSED' ORDER BY closed_at DESC LIMIT 1`,
      [tenantId]
    );
    const lastClosedActualCash = Number(lastClosedRes.rows[0]?.actual_cash || 0);

    return NextResponse.json({
      success: true,
      activeShift,
      last_closed_actual_cash: lastClosedActualCash,
      history: historyRes.rows.map((r: any) => ({
        id: r.id,
        opening_balance: Number(r.opening_balance),
        opened_at: r.opened_at,
        closed_at: r.closed_at,
        status: r.status,
        expected_cash: Number(r.expected_cash || 0),
        expected_digital: Number(r.expected_digital || 0),
        actual_cash: Number(r.actual_cash || 0),
        discrepancy: Number(r.discrepancy || 0),
        closure_notes: r.closure_notes,
        opened_by_name: r.opened_by_name || 'Usuario',
        closed_by_name: r.closed_by_name || 'Administrador',
      })),
    });
  } catch (error: unknown) {
    console.error('[API /api/finances/cash-register GET] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error al obtener estado de caja';
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
    const { action = 'OPEN_SHIFT' } = body;

    // =========================================================================
    // ACCIÓN 1: APERTURA DE TURNO DE CAJA
    // =========================================================================
    if (action === 'OPEN_SHIFT') {
      const { opening_balance = 0 } = body;

      // Verificar si ya hay un turno abierto
      const checkOpen = await query(
        `SELECT id FROM v2.cash_register_shifts WHERE tenant_id = $1 AND status = 'OPEN' LIMIT 1`,
        [tenantId]
      );

      if (checkOpen.rows.length > 0) {
        return NextResponse.json({ success: false, message: 'Ya existe un turno de caja abierto actualmente.' }, { status: 400 });
      }

      const shiftId = `shift-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const numOpening = parseFloat(opening_balance) || 0;

      await query(
        `INSERT INTO v2.cash_register_shifts
          (id, tenant_id, opened_by, opening_balance, opened_at, status)
         VALUES ($1, $2, $3, $4, NOW(), 'OPEN')`,
        [shiftId, tenantId, session.userId, numOpening]
      );

      await query(
        `INSERT INTO v2.audit_logs (id, tenant_id, user_id, action, details, ip_address)
         VALUES ($1, $2, $3, 'OPEN_CASH_SHIFT', $4, $5)`,
        [
          `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          tenantId,
          session.userId,
          `Apertura de turno de caja con saldo inicial de S/ ${numOpening.toFixed(2)}`,
          req.headers.get('x-forwarded-for') || '127.0.0.1',
        ]
      );

      return NextResponse.json({
        success: true,
        message: `¡Caja abierta exitosamente con S/ ${numOpening.toFixed(2)} de saldo base!`,
        shiftId,
      });
    }

    // =========================================================================
    // ACCIÓN 2: CIERRE Y ARQUEO DE CAJA
    // =========================================================================
    if (action === 'CLOSE_SHIFT') {
      const { shift_id, actual_cash, closure_notes } = body;

      let targetShiftId = shift_id;
      if (!targetShiftId) {
        const activeRes = await query(
          `SELECT id FROM v2.cash_register_shifts WHERE tenant_id = $1 AND status = 'OPEN' ORDER BY opened_at DESC LIMIT 1`,
          [tenantId]
        );
        targetShiftId = activeRes.rows[0]?.id;
      }

      if (!targetShiftId) {
        return NextResponse.json({ success: false, message: 'No hay turno abierto para cerrar o ID no especificado' }, { status: 400 });
      }

      const shiftRes = await query(
        `SELECT id, opening_balance, opened_at FROM v2.cash_register_shifts WHERE id = $1 AND tenant_id = $2 AND status = 'OPEN' LIMIT 1`,
        [targetShiftId, tenantId]
      );

      if (shiftRes.rows.length === 0) {
        return NextResponse.json({ success: false, message: 'Turno no encontrado o ya cerrado' }, { status: 404 });
      }

      const shift = shiftRes.rows[0];

      // Calcular operaciones del turno
      const txRes = await query(
        `SELECT 
          COALESCE(SUM(CASE WHEN type = 'INCOME' AND payment_method = 'EFECTIVO' THEN amount ELSE 0 END), 0) as cash_income,
          COALESCE(SUM(CASE WHEN type = 'EXPENSE' AND payment_method = 'EFECTIVO' THEN amount ELSE 0 END), 0) as cash_expense,
          COALESCE(SUM(CASE WHEN type = 'INCOME' AND payment_method != 'EFECTIVO' THEN amount ELSE 0 END), 0) as digital_income
         FROM v2.financial_transactions
         WHERE tenant_id = $1 AND created_at >= $2`,
        [tenantId, shift.opened_at]
      );

      const cashIncome = Number(txRes.rows[0]?.cash_income || 0);
      const cashExpense = Number(txRes.rows[0]?.cash_expense || 0);
      const digitalIncome = Number(txRes.rows[0]?.digital_income || 0);

      const openingBalance = Number(shift.opening_balance);
      const expectedCash = openingBalance + cashIncome - cashExpense;
      const expectedDigital = digitalIncome;
      const actualCashNum = parseFloat(actual_cash) || 0;
      const discrepancy = actualCashNum - expectedCash;

      await query(
        `UPDATE v2.cash_register_shifts
         SET closed_by = $1, closed_at = NOW(), status = 'CLOSED',
             expected_cash = $2, expected_digital = $3, actual_cash = $4,
             discrepancy = $5, closure_notes = $6
         WHERE id = $7`,
        [
          session.userId,
          expectedCash,
          expectedDigital,
          actualCashNum,
          discrepancy,
          closure_notes ? closure_notes.trim() : null,
          shift_id,
        ]
      );

      await query(
        `INSERT INTO v2.audit_logs (id, tenant_id, user_id, action, details, ip_address)
         VALUES ($1, $2, $3, 'CLOSE_CASH_SHIFT', $4, $5)`,
        [
          `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          tenantId,
          session.userId,
          `Arqueo de caja cerrado: Efectivo esperado S/ ${expectedCash.toFixed(2)}, Físico contado S/ ${actualCashNum.toFixed(2)}, Diferencia: S/ ${discrepancy.toFixed(2)}`,
          req.headers.get('x-forwarded-for') || '127.0.0.1',
        ]
      );

      return NextResponse.json({
        success: true,
        message: `¡Caja cerrada correctamente! Arqueo completado con diferencia de S/ ${discrepancy.toFixed(2)}.`,
        expectedCash,
        actualCash: actualCashNum,
        discrepancy,
      });
    }

    return NextResponse.json({ success: false, message: 'Acción no reconocida' }, { status: 400 });
  } catch (error: unknown) {
    console.error('[API /api/finances/cash-register POST] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error al procesar arqueo de caja';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
