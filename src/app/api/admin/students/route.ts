import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('educa360_session')?.value;
    if (!token) return NextResponse.json({ success: false, message: 'No autenticado' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session || !session.tenantId) return NextResponse.json({ success: false, message: 'Sesión inválida' }, { status: 401 });
    const tenantId = session.tenantId;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status');

    let sql = `
      SELECT s.id, s.tenant_id, s.guardian_id, s.student_code, s.document_type, 
             s.document_number, s.first_name, s.last_name, s.gender,
             TO_CHAR(s.birth_date, 'YYYY-MM-DD') as birth_date,
             s.blood_type, s.allergies_medical, s.emergency_contact_phone, 
             s.health_insurance, s.previous_school, s.status, s.created_at,
             g.first_name as guardian_first_name, g.last_name as guardian_last_name,
             g.phone as guardian_phone, g.email as guardian_email, g.relationship as guardian_relationship,
             e.id as enrollment_id, e.enrollment_code, sec.full_name as section_name, sec.id as section_id,
             grd.grade_name, grd.level as grade_level
      FROM v2.students s
      LEFT JOIN v2.guardians g ON s.guardian_id = g.id
      LEFT JOIN v2.enrollments e ON e.student_id = s.id AND e.status != 'CANCELLED'
      LEFT JOIN v2.school_sections sec ON e.section_id = sec.id
      LEFT JOIN v2.school_grades grd ON sec.grade_id = grd.id
      WHERE s.tenant_id = $1
    `;
    const values: any[] = [tenantId];
    let pIdx = 2;

    if (status && status !== 'ALL') {
      sql += ` AND s.status = $${pIdx++}`;
      values.push(status);
    }

    if (search) {
      sql += ` AND (s.document_number ILIKE $${pIdx} OR s.first_name ILIKE $${pIdx} OR s.last_name ILIKE $${pIdx} OR s.student_code ILIKE $${pIdx} OR g.first_name ILIKE $${pIdx} OR g.last_name ILIKE $${pIdx})`;
      values.push(`%${search}%`);
      pIdx++;
    }

    sql += ` ORDER BY s.last_name ASC, s.first_name ASC`;

    const res = await query(sql, values);

    const students = res.rows.map((row: any) => ({
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
      guardian: row.guardian_id
        ? {
            id: row.guardian_id,
            first_name: row.guardian_first_name,
            last_name: row.guardian_last_name,
            phone: row.guardian_phone,
            email: row.guardian_email,
            relationship: row.guardian_relationship,
          }
        : null,
      current_enrollment: row.enrollment_id
        ? {
            id: row.enrollment_id,
            enrollment_code: row.enrollment_code,
            section_id: row.section_id,
            section_name: row.section_name,
            grade_name: row.grade_name,
            grade_level: row.grade_level,
          }
        : null,
    }));

    return NextResponse.json({
      success: true,
      students,
    });
  } catch (error: unknown) {
    console.error('[API /api/admin/students GET] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('educa360_session')?.value;
    if (!token) return NextResponse.json({ success: false, message: 'No autenticado' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session || !session.tenantId) return NextResponse.json({ success: false, message: 'Sesión inválida' }, { status: 401 });
    const tenantId = session.tenantId;

    const body = await req.json();
    const {
      id,
      guardian_id,
      student_code,
      document_type = 'DNI',
      document_number,
      first_name,
      last_name,
      gender = 'M',
      birth_date,
      blood_type,
      allergies_medical,
      emergency_contact_phone,
      health_insurance,
      previous_school,
      status = 'PROSPECT',
    } = body;

    if (!document_number || !first_name || !last_name) {
      return NextResponse.json(
        { success: false, message: 'Documento, Nombres y Apellidos son obligatorios' },
        { status: 400 }
      );
    }

    if (id) {
      await query(
        `UPDATE v2.students
         SET guardian_id = $1, student_code = $2, document_type = $3, document_number = $4,
             first_name = $5, last_name = $6, gender = $7, birth_date = $8, blood_type = $9,
             allergies_medical = $10, emergency_contact_phone = $11, health_insurance = $12,
             previous_school = $13, status = $14, updated_at = NOW()
         WHERE id = $15 AND tenant_id = $16`,
        [
          guardian_id || null,
          student_code?.trim() || null,
          document_type,
          document_number.trim(),
          first_name.trim(),
          last_name.trim(),
          gender,
          birth_date || null,
          blood_type?.trim() || null,
          allergies_medical?.trim() || null,
          emergency_contact_phone?.trim() || null,
          health_insurance?.trim() || null,
          previous_school?.trim() || null,
          status,
          id,
          tenantId,
        ]
      );
      return NextResponse.json({ success: true, message: 'Ficha del estudiante actualizada con éxito.' });
    } else {
      // Verificar si ya existe con ese documento
      const exists = await query(
        `SELECT id FROM v2.students WHERE tenant_id = $1 AND document_number = $2 LIMIT 1`,
        [tenantId, document_number.trim()]
      );
      if (exists.rows.length > 0) {
        return NextResponse.json(
          { success: false, message: `Ya existe un alumno registrado con el documento ${document_number.trim()}` },
          { status: 400 }
        );
      }

      const newId = `stu-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const autoCode = student_code?.trim() || `EST-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      await query(
        `INSERT INTO v2.students
          (id, tenant_id, guardian_id, student_code, document_type, document_number, first_name, last_name, gender, birth_date, blood_type, allergies_medical, emergency_contact_phone, health_insurance, previous_school, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          newId,
          tenantId,
          guardian_id || null,
          autoCode,
          document_type,
          document_number.trim(),
          first_name.trim(),
          last_name.trim(),
          gender,
          birth_date || null,
          blood_type?.trim() || null,
          allergies_medical?.trim() || null,
          emergency_contact_phone?.trim() || null,
          health_insurance?.trim() || null,
          previous_school?.trim() || null,
          status,
        ]
      );
      return NextResponse.json({
        success: true,
        message: `¡Estudiante ${first_name} ${last_name} registrado exitosamente!`,
        id: newId,
        student_code: autoCode,
      });
    }
  } catch (error: unknown) {
    console.error('[API /api/admin/students POST] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
