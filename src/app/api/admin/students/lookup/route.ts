import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';

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
    const documentNumber = (searchParams.get('document_number') || searchParams.get('dni') || '').trim();
    const targetYearId = searchParams.get('academic_year_id');

    if (!documentNumber) {
      return NextResponse.json({ success: false, message: 'Número de documento requerido' }, { status: 400 });
    }

    // 1. Buscar al estudiante por DNI en el colegio
    const studentRes = await query(
      `SELECT s.id, s.tenant_id, s.guardian_id, s.student_code, s.document_type, s.document_number,
              s.first_name, s.last_name, s.gender, s.birth_date, s.blood_type, s.allergies_medical,
              s.emergency_contact_phone, s.health_insurance, s.previous_school, s.status, s.created_at,
              g.id as g_id, g.document_type as g_document_type, g.document_number as g_document_number,
              g.first_name as g_first_name, g.last_name as g_last_name, g.relationship as g_relationship,
              g.phone as g_phone, g.alt_phone as g_alt_phone, g.email as g_email, g.address as g_address,
              g.billing_tax_id as g_billing_tax_id, g.billing_name as g_billing_name
       FROM v2.students s
       LEFT JOIN v2.guardians g ON s.guardian_id = g.id
       WHERE s.tenant_id = $1 AND s.document_number = $2`,
      [tenantId, documentNumber]
    );

    // Caso 1: NO EXISTE en la base de datos del colegio
    if (studentRes.rows.length === 0) {
      return NextResponse.json({
        success: true,
        found: false,
        student: null,
        detectedCondition: 'NUEVO',
        canEnroll: true,
        message: 'Estudiante no registrado previamente en la institución. Se aplicará política de Alumno Nuevo o Traslado.',
      });
    }

    const row = studentRes.rows[0];
    const student = {
      id: row.id,
      tenant_id: row.tenant_id,
      guardian_id: row.guardian_id,
      student_code: row.student_code,
      document_type: row.document_type,
      document_number: row.document_number,
      first_name: row.first_name,
      last_name: row.last_name,
      gender: row.gender,
      birth_date: row.birth_date,
      blood_type: row.blood_type,
      allergies_medical: row.allergies_medical,
      emergency_contact_phone: row.emergency_contact_phone,
      health_insurance: row.health_insurance,
      previous_school: row.previous_school,
      status: row.status,
      created_at: row.created_at,
      guardian: row.g_id
        ? {
            id: row.g_id,
            document_type: row.g_document_type,
            document_number: row.g_document_number,
            first_name: row.g_first_name,
            last_name: row.g_last_name,
            relationship: row.g_relationship,
            phone: row.g_phone,
            alt_phone: row.g_alt_phone,
            email: row.g_email,
            address: row.g_address,
            billing_tax_id: row.g_billing_tax_id,
            billing_name: row.g_billing_name,
          }
        : null,
    };

    // Caso 2: El alumno tiene estado EGRESADO (Culminó toda su etapa escolar)
    if (student.status === 'GRADUATED') {
      return NextResponse.json({
        success: true,
        found: true,
        student,
        detectedCondition: 'EGRESADO',
        canEnroll: false,
        message: 'El estudiante figura como EGRESADO de la institución (culminó 5° de Secundaria). No es posible matricularlo en un ciclo regular.',
      });
    }

    // 2. Consultar historial de matrículas del alumno
    const enrollmentsRes = await query(
      `SELECT e.id, e.academic_year_id, e.section_id, e.enrollment_code, e.enrollment_type,
              e.enrollment_date, e.status as enrollment_status, e.created_at,
              ay.year_name, ay.year_code,
              sec.full_name as section_name, sec.grade_id,
              sg.grade_name, sg.level, sg.grade_order
       FROM v2.enrollments e
       JOIN v2.academic_years ay ON e.academic_year_id = ay.id
       JOIN v2.school_sections sec ON e.section_id = sec.id
       JOIN v2.school_grades sg ON sec.grade_id = sg.id
       WHERE e.tenant_id = $1 AND e.student_id = $2
       ORDER BY e.created_at DESC, e.enrollment_date DESC`,
      [tenantId, student.id]
    );

    const history = enrollmentsRes.rows;
    const latestEnrollment = history[0] || null;

    // Verificar si ya está matriculado en el año objetivo
    if (targetYearId && history.some((h) => h.academic_year_id === targetYearId && h.enrollment_status !== 'CANCELLED')) {
      const currentYearEnr = history.find((h) => h.academic_year_id === targetYearId && h.enrollment_status !== 'CANCELLED');
      return NextResponse.json({
        success: true,
        found: true,
        student,
        alreadyEnrolledInYear: true,
        currentEnrollment: currentYearEnr,
        detectedCondition: currentYearEnr.enrollment_type || 'REGULAR',
        canEnroll: false,
        message: `El estudiante ya cuenta con matrícula activa para este periodo lectivo en ${currentYearEnr.section_name}.`,
      });
    }

    // Caso 3: Alumno con estado RETIRADO o sin matrículas previas activas
    if (student.status === 'WITHDRAWN') {
      return NextResponse.json({
        success: true,
        found: true,
        student,
        latestEnrollment,
        detectedCondition: 'REINGRESANTE',
        canEnroll: true,
        message: 'Estudiante con retiro previo registrado. Condición detectada: REINGRESANTE (Retorno a la institución).',
      });
    }

    // Caso 4: Alumno que nunca fue matriculado aunque estuviera registrado como prospecto
    if (!latestEnrollment) {
      return NextResponse.json({
        success: true,
        found: true,
        student,
        detectedCondition: 'NUEVO',
        canEnroll: true,
        message: 'Estudiante registrado previamente como prospecto. Aplica admisión como Alumno Nuevo.',
      });
    }

    // Caso 5: Alumno con matrícula previa. Evaluar si es continuo (REGULAR) o hubo pausa (REINGRESANTE)
    // Buscamos si existe un año lectivo previo inmediato
    const prevYearRes = await query(
      `SELECT id, year_name, year_code FROM v2.academic_years
       WHERE tenant_id = $1
       ORDER BY year_code DESC LIMIT 2`,
      [tenantId]
    );

    // Sugerencia de grado siguiente si fue promovido
    let suggestedNextGrade = null;
    if (latestEnrollment) {
      const nextGradeRes = await query(
        `SELECT id, grade_name, level, grade_order FROM v2.school_grades
         WHERE tenant_id = $1 AND grade_order > $2
         ORDER BY grade_order ASC LIMIT 1`,
        [tenantId, latestEnrollment.grade_order]
      );
      if (nextGradeRes.rows.length > 0) {
        suggestedNextGrade = nextGradeRes.rows[0];
      }
    }

    // Si la última matrícula fue en el ciclo previo o activo: REGULAR
    return NextResponse.json({
      success: true,
      found: true,
      student,
      latestEnrollment,
      suggestedNextGrade,
      detectedCondition: 'REGULAR',
      canEnroll: true,
      message: `Estudiante continuador. Cursó ${latestEnrollment.grade_name} (${latestEnrollment.year_name}). Condición detectada: ALUMNO REGULAR (Antiguo). Exonerado de Cuota de Ingreso.`,
    });
  } catch (err: any) {
    console.error('Error en student lookup:', err);
    return NextResponse.json({ success: false, message: 'Error interno en la búsqueda de estudiante' }, { status: 500 });
  }
}
