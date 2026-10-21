import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';
import { formatDbDate } from '@/lib/finances';

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
    const grade = searchParams.get('grade');
    const status = searchParams.get('status'); // 'ALL' | 'PAID' | 'PENDING' | 'OVERDUE'
    const search = searchParams.get('search')?.trim() || '';

    // 1. Actualizar automáticamente cuotas vencidas que sigan como PENDING
    await query(
      `UPDATE v2.student_tuitions
       SET status = 'OVERDUE', updated_at = NOW()
       WHERE tenant_id = $1 AND status = 'PENDING' AND due_date < CURRENT_DATE`,
      [tenantId]
    );

    // 2. Armar consulta con filtros
    const conditions: string[] = ['tenant_id = $1', 'period_month = $2'];
    const values: any[] = [tenantId, month];
    let pIdx = 3;

    if (status && status !== 'ALL') {
      conditions.push(`status = $${pIdx++}`);
      values.push(status);
    }

    if (grade && grade !== 'ALL') {
      conditions.push(`grade_section = $${pIdx++}`);
      values.push(grade);
    }

    if (search) {
      conditions.push(`(student_name ILIKE $${pIdx} OR parent_name ILIKE $${pIdx} OR parent_phone ILIKE $${pIdx})`);
      values.push(`%${search}%`);
      pIdx++;
    }

    const sql = `
      SELECT id, tenant_id, student_id, enrollment_id, concept_type, student_name, grade_section, parent_name, parent_phone,
             period_month, monthly_amount,
             TO_CHAR(due_date, 'YYYY-MM-DD') as due_date,
             status, transaction_id,
             TO_CHAR(paid_date, 'YYYY-MM-DD') as paid_date,
             payment_method, receipt_number, created_at
      FROM v2.student_tuitions
      WHERE ${conditions.join(' AND ')}
      ORDER BY 
        CASE status 
          WHEN 'OVERDUE' THEN 1 
          WHEN 'PENDING' THEN 2 
          WHEN 'PAID' THEN 3 
        END,
        grade_section ASC,
        student_name ASC
    `;

    const res = await query(sql, values);

    // 3. Obtener métricas globales del periodo (independientes de filtros de tabla)
    const metricsRes = await query(
      `SELECT 
        COUNT(*) as total_students,
        COUNT(CASE WHEN status = 'PAID' THEN 1 END) as paid_count,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'OVERDUE' THEN 1 END) as overdue_count,
        COALESCE(SUM(monthly_amount), 0) as total_expected,
        COALESCE(SUM(CASE WHEN status = 'PAID' THEN monthly_amount ELSE 0 END), 0) as total_collected,
        COALESCE(SUM(CASE WHEN status != 'PAID' THEN monthly_amount ELSE 0 END), 0) as total_pending,
        COALESCE(SUM(CASE WHEN status = 'PENDING' THEN monthly_amount ELSE 0 END), 0) as pending_amount,
        COALESCE(SUM(CASE WHEN status = 'OVERDUE' THEN monthly_amount ELSE 0 END), 0) as overdue_amount
       FROM v2.student_tuitions
       WHERE tenant_id = $1 AND period_month = $2`,
      [tenantId, month]
    );

    const m = metricsRes.rows[0];
    const totalStudents = Number(m?.total_students || 0);
    const paidCount = Number(m?.paid_count || 0);
    const pendingCount = Number(m?.pending_count || 0);
    const overdueCount = Number(m?.overdue_count || 0);
    const totalExpected = Number(m?.total_expected || 0);
    const totalCollected = Number(m?.total_collected || 0);
    const totalPending = Number(m?.total_pending || 0);
    const pendingAmount = Number(m?.pending_amount || 0);
    const overdueAmount = Number(m?.overdue_amount || 0);
    const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

    return NextResponse.json({
      success: true,
      periodMonth: month,
      tuitions: res.rows.map((r: any) => ({
        id: r.id,
        tenant_id: r.tenant_id,
        student_id: r.student_id,
        enrollment_id: r.enrollment_id,
        concept_type: r.concept_type || 'PENSION',
        student_name: r.student_name,
        grade_section: r.grade_section,
        parent_name: r.parent_name,
        parent_phone: r.parent_phone,
        period_month: r.period_month,
        monthly_amount: Number(r.monthly_amount),
        due_date: formatDbDate(r.due_date),
        status: r.status,
        transaction_id: r.transaction_id,
        paid_date: r.paid_date ? formatDbDate(r.paid_date) : null,
        payment_method: r.payment_method,
        receipt_number: r.receipt_number,
        created_at: r.created_at,
      })),
      metrics: {
        totalStudents,
        paidCount,
        pendingCount,
        overdueCount,
        totalExpected,
        totalCollected,
        totalPending,
        pendingAmount,
        overdueAmount,
        collectionRate,
      },
    });
  } catch (error: unknown) {
    console.error('[API /api/finances/tuitions GET] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error al obtener pensiones escolares';
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
    const { action = 'PAY_TUITION' } = body;

    // =========================================================================
    // ACCIÓN 1: REGISTRAR COBRO DE PENSIÓN (INGRESO DE CAJA AL INSTANTE)
    // =========================================================================
    if (action === 'PAY_TUITION') {
      const {
        tuition_id,
        payment_method = 'EFECTIVO',
        receipt_number,
        paid_date,
      } = body;

      if (!tuition_id) {
        return NextResponse.json({ success: false, message: 'ID de pensión requerido' }, { status: 400 });
      }

      // 1. Obtener datos de la pensión
      const tuitRes = await query(
        `SELECT id, student_name, grade_section, parent_name, period_month, monthly_amount, status
         FROM v2.student_tuitions WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
        [tuition_id, tenantId]
      );

      if (tuitRes.rows.length === 0) {
        return NextResponse.json({ success: false, message: 'Registro de pensión no encontrado' }, { status: 404 });
      }

      const tuit = tuitRes.rows[0];
      if (tuit.status === 'PAID') {
        return NextResponse.json({ success: false, message: 'Esta pensión ya ha sido pagada previamente.' }, { status: 400 });
      }

      const paymentDate = paid_date || new Date().toISOString().split('T')[0];
      const amountNum = Number(tuit.monthly_amount);

      // 2. Obtener o asignar categoría de ingreso "Mensualidades & Pensiones"
      let catRes = await query(
        `SELECT id FROM v2.financial_categories WHERE tenant_id = $1 AND name ILIKE '%Mensualidades%' LIMIT 1`,
        [tenantId]
      );
      const categoryId = catRes.rows[0]?.id || null;

      // 3. Crear transacción de INGRESO
      const txId = `tx-tuit-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const description = `Cobro Pensión ${tuit.period_month} - Alumno: ${tuit.student_name} (${tuit.grade_section})`;

      await query(
        `INSERT INTO v2.financial_transactions
          (id, tenant_id, category_id, type, amount, description, transaction_date, payment_method, receipt_number, registered_by, created_at)
         VALUES ($1, $2, $3, 'INCOME', $4, $5, $6, $7, $8, $9, NOW())`,
        [
          txId,
          tenantId,
          categoryId,
          amountNum,
          description,
          paymentDate,
          payment_method,
          receipt_number ? receipt_number.trim() : null,
          session.userId,
        ]
      );

      // 4. Actualizar estado de pensión a PAID
      await query(
        `UPDATE v2.student_tuitions
         SET status = 'PAID', transaction_id = $1, paid_date = $2, payment_method = $3, receipt_number = $4, updated_at = NOW()
         WHERE id = $5`,
        [txId, paymentDate, payment_method, receipt_number ? receipt_number.trim() : null, tuition_id]
      );

      // 5. Auditoría
      await query(
        `INSERT INTO v2.audit_logs (id, tenant_id, user_id, action, details, ip_address)
         VALUES ($1, $2, $3, 'COLLECT_STUDENT_TUITION', $4, $5)`,
        [
          `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          tenantId,
          session.userId,
          `Pensión cobrada: S/ ${amountNum.toFixed(2)} - ${tuit.student_name} (${tuit.grade_section})`,
          req.headers.get('x-forwarded-for') || '127.0.0.1',
        ]
      );

      return NextResponse.json({
        success: true,
        message: `¡Pensión cobrada con éxito a ${tuit.student_name}! Registrado en caja por S/ ${amountNum.toFixed(2)}.`,
        transaction_id: txId,
      });
    }

    // Las cuotas y mensualidades se programan exclusivamente a través de las Matrículas en el Pilar Administrativo
    if (action === 'CREATE_STUDENT_TUITION' || action === 'COPY_PREVIOUS_ROSTER') {
      return NextResponse.json({
        success: false,
        message: 'La incorporación de estudiantes y la programación de pensiones escolares se gestiona exclusivamente a través de las Matrículas en el Pilar Administrativo.',
      }, { status: 400 });
    }

    return NextResponse.json({ success: false, message: 'Acción no reconocida' }, { status: 400 });
  } catch (error: unknown) {
    console.error('[API /api/finances/tuitions POST] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error al procesar pensión';
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
      return NextResponse.json({ success: false, message: 'No tienes permiso para anular cobros de pensión' }, { status: 403 });
    }

    const tenantId = session.tenantId;
    if (!tenantId) {
      return NextResponse.json({ success: false, message: 'Colegio no identificado' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID de pensión requerido' }, { status: 400 });
    }

    const tuitRes = await query(
      `SELECT id, student_id, enrollment_id, student_name, grade_section, period_month, monthly_amount,
              due_date, status, transaction_id
       FROM v2.student_tuitions WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
      [id, tenantId]
    );

    if (tuitRes.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Registro de pensión no encontrado' }, { status: 404 });
    }

    const t = tuitRes.rows[0];

    // Protección del Pilar Administrativo: No se pueden eliminar cuotas no pagadas
    if (t.status !== 'PAID') {
      return NextResponse.json({
        success: false,
        message: 'No es posible eliminar cuotas escolares desde Finanzas. Para dar de baja a un estudiante del año escolar, gestiona la cancelación o retiro de matrícula desde el Pilar Administrativo (Matrículas).',
      }, { status: 400 });
    }

    // Si la pensión ya había sido cobrada, anular la transacción de ingreso en el flujo de caja
    if (t.transaction_id) {
      await query(
        `DELETE FROM v2.financial_transactions WHERE id = $1 AND tenant_id = $2`,
        [t.transaction_id, tenantId]
      );
    }

    // Revertir el estado de la cuota a PENDING u OVERDUE según fecha de vencimiento
    await query(
      `UPDATE v2.student_tuitions
       SET status = CASE WHEN due_date < CURRENT_DATE THEN 'OVERDUE' ELSE 'PENDING' END,
           transaction_id = NULL,
           paid_date = NULL,
           payment_method = NULL,
           receipt_number = NULL,
           updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    // Auditoría
    await query(
      `INSERT INTO v2.audit_logs (id, tenant_id, user_id, action, details, ip_address)
       VALUES ($1, $2, $3, 'VOID_TUITION_PAYMENT', $4, $5)`,
      [
        `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        tenantId,
        session.userId,
        `Cobro de pensión anulado: ${t.student_name} (${t.grade_section}) - Periodo ${t.period_month} (Monto: S/ ${Number(t.monthly_amount).toFixed(2)}). Ingreso revertido en caja.`,
        req.headers.get('x-forwarded-for') || '127.0.0.1',
      ]
    );

    return NextResponse.json({
      success: true,
      message: `Cobro de pensión de ${t.student_name} anulado exitosamente. Se revirtió el ingreso de S/ ${Number(t.monthly_amount).toFixed(2)} en el libro de caja y la cuota regresó al estado pendiente/moroso.`,
    });
  } catch (error: unknown) {
    console.error('[API /api/finances/tuitions DELETE] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error al anular cobro de pensión';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

