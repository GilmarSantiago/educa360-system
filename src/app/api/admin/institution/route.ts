import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';

// =========================================================================
// GET: Obtener Información Institucional, Reglas y Años Lectivos del Colegio
// =========================================================================
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('educa360_session')?.value;
    if (!token) return NextResponse.json({ success: false, message: 'No autenticado' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session || !session.tenantId) {
      return NextResponse.json({ success: false, message: 'Sesión inválida' }, { status: 401 });
    }

    if (!['ADMINISTRADOR', 'SOPORTE'].includes(session.role)) {
      return NextResponse.json({ success: false, message: 'Acceso no autorizado' }, { status: 403 });
    }

    const tenantId = session.tenantId;

    // 1. Datos del Colegio (v2.tenants)
    const tenantRes = await query(
      `SELECT t.id, t.code, t.name, t.ruc, t.email, t.phone, t.address, t.logo,
              t.status, t.plan, t.monthly_fee, t.created_at, t.updated_at,
              (SELECT name FROM v2.users WHERE tenant_id = t.id AND role = 'ADMINISTRADOR' LIMIT 1) as admin_name,
              (SELECT username FROM v2.users WHERE tenant_id = t.id AND role = 'ADMINISTRADOR' LIMIT 1) as admin_username,
              (SELECT email FROM v2.users WHERE tenant_id = t.id AND role = 'ADMINISTRADOR' LIMIT 1) as admin_email
       FROM v2.tenants t
       WHERE t.id = $1`,
      [tenantId]
    );

    if (tenantRes.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Colegio no encontrado' }, { status: 404 });
    }

    const institution = tenantRes.rows[0];

    // 2. Configuración de Reglas del Colegio (v2.school_configs)
    let configRes = await query(
      `SELECT id, tenant_id, grading_system, passing_grade, period_type, monthly_due_day,
              late_fee_daily_percentage, grace_days, allow_multiple_cash_sessions,
              require_token_for_differences, enabled_modules,
              COALESCE(enrollment_rule_new, 'OBLIGATORIO_AHORA') as enrollment_rule_new,
              COALESCE(enrollment_rule_regular, 'OBLIGATORIO_AHORA') as enrollment_rule_regular,
              COALESCE(entry_fee_rule_new, 'APLICA') as entry_fee_rule_new,
              COALESCE(entry_fee_rule_regular, 'EXONERADO') as entry_fee_rule_regular,
              created_at, updated_at
       FROM v2.school_configs
       WHERE tenant_id = $1`,
      [tenantId]
    );

    // Si no existe configuración previa, crear una por defecto
    if (configRes.rows.length === 0) {
      const newConfigId = `cfg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      await query(
        `INSERT INTO v2.school_configs (
          id, tenant_id, grading_system, passing_grade, period_type, monthly_due_day,
          late_fee_daily_percentage, grace_days, allow_multiple_cash_sessions,
          require_token_for_differences, enrollment_rule_new, enrollment_rule_regular, entry_fee_rule_new, entry_fee_rule_regular,
          created_at, updated_at
        ) VALUES ($1, $2, 'vigesimal', 11, 'bimestre', 5, 0.5, 3, true, true, 'OBLIGATORIO_AHORA', 'OBLIGATORIO_AHORA', 'APLICA', 'EXONERADO', NOW(), NOW())`,
        [newConfigId, tenantId]
      );
      configRes = await query(`SELECT * FROM v2.school_configs WHERE id = $1`, [newConfigId]);
    }

    const config = configRes.rows[0];

    // 3. Años Lectivos registrados con métricas
    const yearsRes = await query(
      `SELECT y.id, y.tenant_id, y.year_name, y.year_code,
              TO_CHAR(y.start_date, 'YYYY-MM-DD') as start_date,
              TO_CHAR(y.end_date, 'YYYY-MM-DD') as end_date,
              y.status, y.is_enrollment_open, y.created_at, y.updated_at,
              COUNT(DISTINCT s.id) as total_sections,
              COALESCE(SUM(s.capacity), 0) as total_capacity,
              COALESCE(SUM(s.enrolled_count), 0) as total_enrolled
       FROM v2.academic_years y
       LEFT JOIN v2.school_sections s ON s.academic_year_id = y.id AND s.tenant_id = y.tenant_id
       WHERE y.tenant_id = $1
       GROUP BY y.id
       ORDER BY y.year_code DESC`,
      [tenantId]
    );

    return NextResponse.json({
      success: true,
      institution,
      config,
      academicYears: yearsRes.rows,
    });
  } catch (error: unknown) {
    console.error('[API /api/admin/institution GET] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error al obtener datos de la institución';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

// =========================================================================
// POST: Actualizar Datos de la Institución, Reglas o Años Lectivos
// =========================================================================
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('educa360_session')?.value;
    if (!token) return NextResponse.json({ success: false, message: 'No autenticado' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session || !session.tenantId) {
      return NextResponse.json({ success: false, message: 'Sesión inválida' }, { status: 401 });
    }

    if (!['ADMINISTRADOR', 'SOPORTE'].includes(session.role)) {
      return NextResponse.json({ success: false, message: 'Acceso no autorizado' }, { status: 403 });
    }

    const tenantId = session.tenantId;
    const body = await req.json();
    const { action } = body;

    // 1. ACTUALIZAR PERFIL INSTITUCIONAL DEL COLEGIO
    if (action === 'UPDATE_PROFILE') {
      const { name, ruc, email, phone, address, logo } = body;

      if (!name || !name.trim()) {
        return NextResponse.json({ success: false, message: 'El nombre del colegio es obligatorio' }, { status: 400 });
      }

      await query(
        `UPDATE v2.tenants
         SET name = $1, ruc = $2, email = $3, phone = $4, address = $5, logo = $6, updated_at = NOW()
         WHERE id = $7`,
        [
          name.trim(),
          ruc?.trim() || null,
          email?.trim() || null,
          phone?.trim() || null,
          address?.trim() || null,
          logo || null,
          tenantId,
        ]
      );

      // Registrar en Auditoría
      await query(
        `INSERT INTO v2.audit_logs (id, tenant_id, user_id, action, details, ip_address)
         VALUES ($1, $2, $3, 'UPDATE_INSTITUTION_PROFILE', $4, $5)`,
        [
          `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          tenantId,
          session.userId,
          `Datos institucionales del colegio actualizados: "${name.trim()}"`,
          req.headers.get('x-forwarded-for') || '127.0.0.1',
        ]
      );

      return NextResponse.json({
        success: true,
        message: '¡Datos de la institución actualizados exitosamente!',
      });
    }

    // 2. ACTUALIZAR REGLAS OPERATIVAS, ACADÉMICAS Y DE MATRÍCULA
    if (action === 'UPDATE_RULES') {
      const {
        grading_system = 'vigesimal',
        passing_grade = 11,
        period_type = 'bimestre',
        monthly_due_day = 5,
        late_fee_daily_percentage = 0.5,
        grace_days = 3,
        allow_multiple_cash_sessions = true,
        require_token_for_differences = true,
        enrollment_rule_new = 'OBLIGATORIO_AHORA',
        enrollment_rule_regular = 'OBLIGATORIO_AHORA',
        entry_fee_rule_new = 'APLICA',
        entry_fee_rule_regular = 'EXONERADO',
      } = body;

      await query(
        `UPDATE v2.school_configs
         SET grading_system = $1,
             passing_grade = $2,
             period_type = $3,
             monthly_due_day = $4,
             late_fee_daily_percentage = $5,
             grace_days = $6,
             allow_multiple_cash_sessions = $7,
             require_token_for_differences = $8,
             enrollment_rule_new = $9,
             enrollment_rule_regular = $10,
             entry_fee_rule_new = $11,
             entry_fee_rule_regular = $12,
             updated_at = NOW()
         WHERE tenant_id = $13`,
        [
          grading_system,
          Number(passing_grade || 11),
          period_type,
          Number(monthly_due_day || 5),
          Number(late_fee_daily_percentage || 0),
          Number(grace_days || 0),
          Boolean(allow_multiple_cash_sessions),
          Boolean(require_token_for_differences),
          enrollment_rule_new,
          enrollment_rule_regular,
          entry_fee_rule_new,
          entry_fee_rule_regular,
          tenantId,
        ]
      );

      return NextResponse.json({
        success: true,
        message: '¡Reglas institucionales del colegio guardadas exitosamente!',
      });
    }

    // 3. GUARDAR O CREAR AÑO ESCOLAR (con opción de clonar estructura)
    if (action === 'SAVE_YEAR') {
      const { id, year_name, year_code, start_date, end_date, status = 'ACTIVE', is_enrollment_open = true, clone_structure = false } = body;

      if (!year_name || !year_code || !start_date || !end_date) {
        return NextResponse.json({ success: false, message: 'Todos los campos del año lectivo son obligatorios' }, { status: 400 });
      }

      if (id) {
        await query(
          `UPDATE v2.academic_years
           SET year_name = $1, year_code = $2, start_date = $3, end_date = $4,
               status = $5, is_enrollment_open = $6, updated_at = NOW()
           WHERE id = $7 AND tenant_id = $8`,
          [year_name.trim(), year_code.trim(), start_date, end_date, status, is_enrollment_open, id, tenantId]
        );
        return NextResponse.json({ success: true, message: `¡${year_name} actualizado con éxito!` });
      } else {
        const newYearId = `ay-${year_code.trim()}-${Date.now()}`;

        // Si se marca como ACTIVE, desactivar los demás
        if (status === 'ACTIVE') {
          await query(
            `UPDATE v2.academic_years SET status = 'CLOSED', updated_at = NOW() WHERE tenant_id = $1 AND status = 'ACTIVE'`,
            [tenantId]
          );
        }

        await query(
          `INSERT INTO v2.academic_years
            (id, tenant_id, year_name, year_code, start_date, end_date, status, is_enrollment_open)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [newYearId, tenantId, year_name.trim(), year_code.trim(), start_date, end_date, status, is_enrollment_open]
        );

        // Si se seleccionó clonar la estructura de grados y secciones del año previo
        if (clone_structure) {
          const prevYearRes = await query(
            `SELECT id FROM v2.academic_years WHERE tenant_id = $1 AND id != $2 ORDER BY year_code DESC LIMIT 1`,
            [tenantId, newYearId]
          );
          const prevYearId = prevYearRes.rows[0]?.id;

          if (prevYearId) {
            const sectionsToClone = await query(
              `SELECT grade_id, section_letter, full_name, shift, capacity, tutor_user_id, tutor_name, classroom_location
               FROM v2.school_sections
               WHERE tenant_id = $1 AND academic_year_id = $2`,
              [tenantId, prevYearId]
            );

            for (const sec of sectionsToClone.rows) {
              const secId = `sec-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
              await query(
                `INSERT INTO v2.school_sections
                  (id, tenant_id, academic_year_id, grade_id, section_letter, full_name, shift, capacity, enrolled_count, tutor_user_id, tutor_name, classroom_location)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9, $10, $11)`,
                [
                  secId,
                  tenantId,
                  newYearId,
                  sec.grade_id,
                  sec.section_letter,
                  sec.full_name,
                  sec.shift,
                  sec.capacity,
                  sec.tutor_user_id,
                  sec.tutor_name,
                  sec.classroom_location,
                ]
              );
            }
          }
        }

        return NextResponse.json({
          success: true,
          message: `¡${year_name} creado exitosamente!${clone_structure ? ' Se clonó la estructura de aulas previa.' : ''}`,
          id: newYearId,
        });
      }
    }

    // 4. CAMBIAR AÑO ESCOLAR ACTIVO
    if (action === 'SET_ACTIVE_YEAR') {
      const { year_id } = body;
      if (!year_id) return NextResponse.json({ success: false, message: 'ID del año requerido' }, { status: 400 });

      // Desactivar todos los años anteriores a CLOSED
      await query(
        `UPDATE v2.academic_years SET status = 'CLOSED', updated_at = NOW() WHERE tenant_id = $1`,
        [tenantId]
      );

      // Activar el año seleccionado
      await query(
        `UPDATE v2.academic_years SET status = 'ACTIVE', updated_at = NOW() WHERE id = $1 AND tenant_id = $2`,
        [year_id, tenantId]
      );

      return NextResponse.json({
        success: true,
        message: '¡Año escolar activo cambiado exitosamente!',
      });
    }

    return NextResponse.json({ success: false, message: 'Acción no reconocida' }, { status: 400 });
  } catch (error: unknown) {
    console.error('[API /api/admin/institution POST] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error al procesar configuración';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
