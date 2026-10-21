import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';
import { formatDbDate } from '@/lib/finances';

// =========================================================================
// GET: Consultar Estado de Cuenta de Estudiante / Familia o Buscar Alumnos
// =========================================================================
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('educa360_session')?.value;
    if (!token) return NextResponse.json({ success: false, message: 'No autenticado' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session || !session.tenantId) {
      return NextResponse.json({ success: false, message: 'Sesión inválida' }, { status: 401 });
    }

    const tenantId = session.tenantId;
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const studentId = searchParams.get('studentId')?.trim();
    const guardianId = searchParams.get('guardianId')?.trim();

    // 1. Actualizar cuotas vencidas automáticamente
    await query(
      `UPDATE v2.student_tuitions
       SET status = 'OVERDUE', updated_at = NOW()
       WHERE tenant_id = $1 AND status = 'PENDING' AND due_date < CURRENT_DATE`,
      [tenantId]
    );

    // =====================================================================
    // CASO A: CONSULTA DETALLADA DE ESTADO DE CUENTA DE UN ESTUDIANTE
    // =====================================================================
    if (studentId) {
      // 1. Obtener datos del estudiante, su aula y su apoderado
      const studentRes = await query(
        `SELECT s.id, s.first_name, s.last_name, s.document_type, s.document_number,
                s.student_code, s.gender, s.status as student_status, s.guardian_id,
                g.first_name as guardian_first_name, g.last_name as guardian_last_name,
                g.document_type as guardian_doc_type, g.document_number as guardian_doc_num,
                g.phone as guardian_phone, g.email as guardian_email, g.address as guardian_address,
                g.relationship as guardian_relationship,
                e.id as enrollment_id, e.enrollment_code, e.enrollment_type,
                sec.full_name as section_name, sec.shift as section_shift,
                grd.grade_name, grd.level as grade_level,
                ay.year_name, ay.year_code
         FROM v2.students s
         LEFT JOIN v2.guardians g ON s.guardian_id = g.id
         LEFT JOIN v2.enrollments e ON e.student_id = s.id AND e.status != 'CANCELLED'
         LEFT JOIN v2.school_sections sec ON e.section_id = sec.id
         LEFT JOIN v2.school_grades grd ON sec.grade_id = grd.id
         LEFT JOIN v2.academic_years ay ON e.academic_year_id = ay.id
         WHERE s.id = $1 AND s.tenant_id = $2
         ORDER BY e.created_at DESC
         LIMIT 1`,
        [studentId, tenantId]
      );

      if (studentRes.rows.length === 0) {
        return NextResponse.json({ success: false, message: 'Estudiante no encontrado' }, { status: 404 });
      }

      const s = studentRes.rows[0];

      // 2. Obtener datos de la institución para el membrete
      const instRes = await query(
        `SELECT name, ruc, phone, email, address, logo FROM v2.tenants WHERE id = $1`,
        [tenantId]
      );
      const institution = instRes.rows[0] || {};

      // 3. Obtener todas las cuotas / conceptos registrados para este alumno
      const tuitionsRes = await query(
        `SELECT id, tenant_id, student_id, enrollment_id, guardian_id, concept_type,
                student_name, grade_section, parent_name, parent_phone, period_month,
                monthly_amount, TO_CHAR(due_date, 'YYYY-MM-DD') as due_date,
                status, transaction_id, TO_CHAR(paid_date, 'YYYY-MM-DD') as paid_date,
                payment_method, receipt_number, created_at, updated_at
         FROM v2.student_tuitions
         WHERE tenant_id = $1 AND (student_id = $2 OR student_name ILIKE $3)
         ORDER BY 
           CASE 
             WHEN concept_type = 'INGRESO' THEN 1
             WHEN concept_type = 'MATRICULA' THEN 2
             ELSE 3
           END,
           due_date ASC,
           period_month ASC`,
        [tenantId, studentId, `%${s.first_name}%${s.last_name}%`]
      );

      const items = tuitionsRes.rows.map((r: any) => {
        let label = 'Pensión Mensual';
        if (r.concept_type === 'MATRICULA') label = 'Matrícula Anual';
        else if (r.concept_type === 'INGRESO') label = 'Cuota de Ingreso / Admisión';
        else if (r.concept_type === 'PENSION') {
          const parts = (r.period_month || '').split('-');
          const monthNum = parts[1] || '';
          const monthNames: Record<string, string> = {
            '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
            '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
            '09': 'Setiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
          };
          label = `Pensión ${monthNames[monthNum] || r.period_month}`;
        } else if (r.concept_type) {
          label = r.concept_type;
        }

        return {
          id: r.id,
          concept_type: r.concept_type || 'PENSION',
          concept_label: label,
          period_month: r.period_month,
          amount: Number(r.monthly_amount || 0),
          due_date: r.due_date,
          status: r.status,
          paid_date: r.paid_date,
          payment_method: r.payment_method,
          receipt_number: r.receipt_number,
          transaction_id: r.transaction_id,
        };
      });

      // Calcular métricas del estado de cuenta
      const totalBilled = items.reduce((acc: number, it: any) => acc + it.amount, 0);
      const totalPaid = items
        .filter((it: any) => it.status === 'PAID')
        .reduce((acc: number, it: any) => acc + it.amount, 0);
      const totalPending = items
        .filter((it: any) => it.status !== 'PAID')
        .reduce((acc: number, it: any) => acc + it.amount, 0);
      const totalOverdue = items
        .filter((it: any) => it.status === 'OVERDUE')
        .reduce((acc: number, it: any) => acc + it.amount, 0);

      const pendingCount = items.filter((it: any) => it.status !== 'PAID').length;
      const overdueCount = items.filter((it: any) => it.status === 'OVERDUE').length;

      return NextResponse.json({
        success: true,
        accountStatement: {
          student: {
            id: s.id,
            first_name: s.first_name,
            last_name: s.last_name,
            full_name: `${s.first_name} ${s.last_name}`,
            document_type: s.document_type,
            document_number: s.document_number,
            student_code: s.student_code,
            gender: s.gender,
            status: s.student_status,
          },
          guardian: s.guardian_id ? {
            id: s.guardian_id,
            first_name: s.guardian_first_name,
            last_name: s.guardian_last_name,
            full_name: `${s.guardian_first_name} ${s.guardian_last_name}`,
            document_type: s.guardian_doc_type,
            document_number: s.guardian_doc_num,
            phone: s.guardian_phone,
            email: s.guardian_email,
            address: s.guardian_address,
            relationship: s.guardian_relationship,
          } : null,
          enrollment: s.enrollment_id ? {
            id: s.enrollment_id,
            enrollment_code: s.enrollment_code,
            enrollment_type: s.enrollment_type,
            year_name: s.year_name,
            year_code: s.year_code,
            grade_name: s.grade_name,
            grade_level: s.grade_level,
            section_name: s.section_name,
            shift: s.section_shift,
          } : null,
          institution: {
            name: institution.name || 'Colegio Educa360',
            ruc: institution.ruc || '',
            phone: institution.phone || '',
            email: institution.email || '',
            address: institution.address || '',
            logo: institution.logo || null,
          },
          summary: {
            total_billed: totalBilled,
            total_paid: totalPaid,
            total_pending: totalPending,
            total_overdue: totalOverdue,
            pending_count: pendingCount,
            overdue_count: overdueCount,
            has_debt: totalPending > 0,
            has_overdue: totalOverdue > 0,
          },
          items,
        },
      });
    }

    // =====================================================================
    // CASO B: BUSCADOR GENERAL DE ESTUDIANTES PARA COBRANZAS EN VENTANILLA
    // =====================================================================
    let sql = `
      SELECT s.id, s.first_name, s.last_name, s.document_number, s.student_code, s.status,
             g.id as guardian_id, g.first_name as guardian_first_name, g.last_name as guardian_last_name,
             g.phone as guardian_phone, g.document_number as guardian_doc,
             sec.full_name as section_name, grd.grade_name,
             COALESCE(SUM(t.monthly_amount), 0) as total_expected,
             COALESCE(SUM(CASE WHEN t.status = 'PAID' THEN t.monthly_amount ELSE 0 END), 0) as total_paid,
             COALESCE(SUM(CASE WHEN t.status != 'PAID' THEN t.monthly_amount ELSE 0 END), 0) as total_debt,
             COALESCE(SUM(CASE WHEN t.status = 'OVERDUE' THEN t.monthly_amount ELSE 0 END), 0) as overdue_debt,
             COUNT(CASE WHEN t.status != 'PAID' THEN 1 END) as pending_count,
             COUNT(CASE WHEN t.status = 'OVERDUE' THEN 1 END) as overdue_count
      FROM v2.students s
      LEFT JOIN v2.guardians g ON s.guardian_id = g.id
      LEFT JOIN v2.enrollments e ON e.student_id = s.id AND e.status != 'CANCELLED'
      LEFT JOIN v2.school_sections sec ON e.section_id = sec.id
      LEFT JOIN v2.school_grades grd ON sec.grade_id = grd.id
      LEFT JOIN v2.student_tuitions t ON t.student_id = s.id
      WHERE s.tenant_id = $1
    `;
    const values: any[] = [tenantId];

    if (search) {
      sql += ` AND (
        s.first_name ILIKE $2 OR s.last_name ILIKE $2 OR s.document_number ILIKE $2 
        OR s.student_code ILIKE $2 OR g.first_name ILIKE $2 OR g.last_name ILIKE $2 
        OR g.document_number ILIKE $2 OR g.phone ILIKE $2
      )`;
      values.push(`%${search}%`);
    }

    sql += `
      GROUP BY s.id, s.first_name, s.last_name, s.document_number, s.student_code, s.status,
               g.id, g.first_name, g.last_name, g.phone, g.document_number,
               sec.full_name, grd.grade_name
      ORDER BY total_debt DESC, s.last_name ASC, s.first_name ASC
      LIMIT 50
    `;

    const res = await query(sql, values);

    return NextResponse.json({
      success: true,
      students: res.rows.map((r: any) => ({
        id: r.id,
        first_name: r.first_name,
        last_name: r.last_name,
        full_name: `${r.first_name} ${r.last_name}`.trim(),
        document_number: r.document_number,
        student_code: r.student_code,
        status: r.status,
        grade_name: r.grade_name || 'Sin grado',
        section_name: r.section_name || 'Sin aula',
        guardian_id: r.guardian_id,
        guardian_name: r.guardian_id ? `${r.guardian_first_name} ${r.guardian_last_name}`.trim() : 'Sin apoderado',
        guardian_phone: r.guardian_phone || '',
        guardian_doc: r.guardian_doc || '',
        total_expected: Number(r.total_expected || 0),
        total_paid: Number(r.total_paid || 0),
        total_debt: Number(r.total_debt || 0),
        overdue_debt: Number(r.overdue_debt || 0),
        pending_count: Number(r.pending_count || 0),
        overdue_count: Number(r.overdue_count || 0),
      })),
    });
  } catch (error: unknown) {
    console.error('Error en account statement GET:', error);
    const msg = error instanceof Error ? error.message : 'Error al consultar estado de cuenta';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

// =========================================================================
// POST: Liquidar Pagos en Caja / Emitir Recibo Oficial
// =========================================================================
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('educa360_session')?.value;
    if (!token) return NextResponse.json({ success: false, message: 'No autenticado' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session || !session.tenantId) {
      return NextResponse.json({ success: false, message: 'Sesión inválida' }, { status: 401 });
    }

    if (!['ADMINISTRADOR', 'SOPORTE', 'COLABORADOR'].includes(session.role)) {
      return NextResponse.json({ success: false, message: 'Permiso denegado' }, { status: 403 });
    }

    const tenantId = session.tenantId;
    const body = await req.json();
    const { action = 'COLLECT_PAYMENT' } = body;

    // =====================================================================
    // ACCIÓN 1: LIQUIDAR UNO O MÚLTIPLES CONCEPTOS EN CAJA CON RECIBO
    // =====================================================================
    if (action === 'COLLECT_PAYMENT') {
      const {
        tuition_ids = [],
        payment_method = 'EFECTIVO',
        receipt_number,
        paid_date,
        notes,
      } = body;

      if (!Array.isArray(tuition_ids) || tuition_ids.length === 0) {
        return NextResponse.json({ success: false, message: 'Debes seleccionar al menos un concepto a cobrar.' }, { status: 400 });
      }

      // 1. Obtener las cuotas a cobrar que pertenezcan al colegio y estén pendientes
      const placeholders = tuition_ids.map((_, i) => `$${i + 2}`).join(',');
      const tuitsRes = await query(
        `SELECT id, student_id, student_name, grade_section, parent_name, parent_phone,
                concept_type, period_month, monthly_amount, status
         FROM v2.student_tuitions
         WHERE tenant_id = $1 AND id IN (${placeholders})`,
        [tenantId, ...tuition_ids]
      );

      if (tuitsRes.rows.length === 0) {
        return NextResponse.json({ success: false, message: 'No se encontraron las cuotas seleccionadas.' }, { status: 404 });
      }

      const pendingTuitions = tuitsRes.rows.filter((t: any) => t.status !== 'PAID');
      if (pendingTuitions.length === 0) {
        return NextResponse.json({ success: false, message: 'Todos los conceptos seleccionados ya fueron pagados previamente.' }, { status: 400 });
      }

      const paymentDate = paid_date || new Date().toISOString().split('T')[0];
      const studentId = pendingTuitions[0].student_id;
      const studentName = pendingTuitions[0].student_name;
      const gradeSection = pendingTuitions[0].grade_section;

      // Generar o usar número de recibo
      let officialReceipt = receipt_number?.trim();
      if (!officialReceipt) {
        const countRes = await query(
          `SELECT COUNT(*) as count FROM v2.financial_transactions WHERE tenant_id = $1 AND receipt_number LIKE 'REC-%'`,
          [tenantId]
        );
        const seq = Number(countRes.rows[0]?.count || 0) + 1;
        const currentYear = new Date().getFullYear();
        officialReceipt = `REC-${currentYear}-${String(seq).padStart(5, '0')}`;
      }

      // 2. Categorías de ingresos para asignación contable
      const catRes = await query(
        `SELECT id, name FROM v2.financial_categories WHERE tenant_id = $1 AND type = 'INCOME'`,
        [tenantId]
      );
      const categories = catRes.rows;

      const getCategoryId = (conceptType: string) => {
        if (conceptType === 'MATRICULA') {
          return categories.find((c: any) => c.name.toLowerCase().includes('matrícula'))?.id || null;
        }
        if (conceptType === 'INGRESO') {
          return categories.find((c: any) => c.name.toLowerCase().includes('ingreso'))?.id || null;
        }
        if (conceptType === 'PENSION') {
          return categories.find((c: any) => c.name.toLowerCase().includes('pensión') || c.name.toLowerCase().includes('mensualidad'))?.id || null;
        }
        return categories.find((c: any) => c.name.toLowerCase().includes('otros'))?.id || categories[0]?.id || null;
      };

      const paidItems: any[] = [];
      let totalCollected = 0;

      // 3. Procesar cada cuota: Crear transacción en caja y marcar cuota como PAID
      for (const t of pendingTuitions) {
        const amountNum = Number(t.monthly_amount);
        totalCollected += amountNum;
        const txId = `tx-col-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

        let conceptLabel = 'Pensión Escolar';
        if (t.concept_type === 'MATRICULA') conceptLabel = 'Matrícula Anual';
        else if (t.concept_type === 'INGRESO') conceptLabel = 'Cuota de Ingreso / Admisión';
        else if (t.concept_type === 'PENSION') conceptLabel = `Pensión ${t.period_month}`;
        else if (t.concept_type) conceptLabel = t.concept_type;

        const description = `Cobro de ${conceptLabel} - Alumno: ${t.student_name} (${t.grade_section})`;
        const catId = getCategoryId(t.concept_type);

        // Insertar en v2.financial_transactions
        await query(
          `INSERT INTO v2.financial_transactions
            (id, tenant_id, category_id, type, amount, description, transaction_date, payment_method, receipt_number, registered_by, funding_source, created_at)
           VALUES ($1, $2, $3, 'INCOME', $4, $5, $6, $7, $8, $9, 'PROPIO', NOW())`,
          [
            txId,
            tenantId,
            catId,
            amountNum,
            description,
            paymentDate,
            payment_method,
            officialReceipt,
            session.userId,
          ]
        );

        // Actualizar en v2.student_tuitions
        await query(
          `UPDATE v2.student_tuitions
           SET status = 'PAID', transaction_id = $1, paid_date = $2, payment_method = $3, receipt_number = $4, updated_at = NOW()
           WHERE id = $5`,
          [txId, paymentDate, payment_method, officialReceipt, t.id]
        );

        paidItems.push({
          id: t.id,
          concept_type: t.concept_type,
          concept_label: conceptLabel,
          period_month: t.period_month,
          amount: amountNum,
          transaction_id: txId,
        });
      }

      // 4. Datos institucionales para el recibo
      const tenantRow = await query(
        `SELECT name, ruc, phone, email, address, logo FROM v2.tenants WHERE id = $1`,
        [tenantId]
      );
      const institution = tenantRow.rows[0] || {};

      // 5. Auditoría
      await query(
        `INSERT INTO v2.audit_logs (id, tenant_id, user_id, action, details, ip_address)
         VALUES ($1, $2, $3, 'COLLECT_ACCOUNT_STATEMENT_PAYMENT', $4, $5)`,
        [
          `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          tenantId,
          session.userId,
          `Recibo ${officialReceipt} emitido para ${studentName} por S/ ${totalCollected.toFixed(2)} (${paidItems.length} concepto(s))`,
          req.headers.get('x-forwarded-for') || '127.0.0.1',
        ]
      );

      return NextResponse.json({
        success: true,
        message: `¡Cobranza procesada exitosamente! Se emitió el comprobante ${officialReceipt} por S/ ${totalCollected.toFixed(2)}.`,
        receipt: {
          receipt_number: officialReceipt,
          payment_date: paymentDate,
          created_at: new Date().toISOString(),
          cashier_name: session.name || session.username || 'Caja Central',
          student: {
            id: studentId,
            name: studentName,
            grade_section: gradeSection,
          },
          guardian: {
            name: pendingTuitions[0].parent_name,
            phone: pendingTuitions[0].parent_phone,
          },
          institution: {
            name: institution.name || 'Colegio Educa360',
            ruc: institution.ruc || '',
            phone: institution.phone || '',
            email: institution.email || '',
            address: institution.address || '',
            logo: institution.logo || null,
          },
          items: paidItems,
          total_amount: totalCollected,
          payment_method,
          notes: notes?.trim() || null,
        },
      });
    }

    // =====================================================================
    // ACCIÓN NO PERMITIDA: ASIGNAR CARGO / CONCEPTO MANUAL FUERA DE MATRÍCULA
    // =====================================================================
    if (action === 'ADD_CONCEPT_CHARGE') {
      return NextResponse.json(
        {
          success: false,
          message:
            'No está permitido crear cobros o conceptos manuales directamente en Finanzas. Todo concepto, cuota de ingreso y mensualidades se derivan exclusivamente de la matrícula oficial registrada en el Pilar Administrativo.',
        },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: false, message: 'Acción no reconocida' }, { status: 400 });
  } catch (error: unknown) {
    console.error('Error en account statement POST:', error);
    const msg = error instanceof Error ? error.message : 'Error al procesar cobranza';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
