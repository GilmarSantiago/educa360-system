import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, hashPassword } from '@/lib/auth';
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
    const sectionId = searchParams.get('sectionId');
    const academicYearId = searchParams.get('academicYearId');

    let sql = `
      SELECT e.id, e.tenant_id, e.academic_year_id, e.student_id, e.guardian_id, 
             e.section_id, e.enrollment_code, e.enrollment_type, 
             TO_CHAR(e.enrollment_date, 'YYYY-MM-DD') as enrollment_date,
             e.status, e.enrollment_fee, e.enrollment_fee_paid, e.entry_fee, 
             e.monthly_tuition_fee, e.discount_type, e.discount_percentage, e.notes, e.created_at,
             s.first_name as student_first_name, s.last_name as student_last_name, 
             s.document_number as student_doc, s.student_code, s.gender as student_gender,
             g.first_name as guardian_first_name, g.last_name as guardian_last_name, 
             g.phone as guardian_phone, g.document_number as guardian_doc, g.relationship as guardian_relationship,
             sec.full_name as section_name, sec.section_letter, sec.shift,
             grd.grade_name, grd.level as grade_level,
             ay.year_name, ay.year_code
      FROM v2.enrollments e
      JOIN v2.students s ON e.student_id = s.id
      JOIN v2.guardians g ON e.guardian_id = g.id
      JOIN v2.school_sections sec ON e.section_id = sec.id
      JOIN v2.school_grades grd ON sec.grade_id = grd.id
      JOIN v2.academic_years ay ON e.academic_year_id = ay.id
      WHERE e.tenant_id = $1
    `;
    const values: any[] = [tenantId];
    let pIdx = 2;

    if (academicYearId) {
      sql += ` AND e.academic_year_id = $${pIdx++}`;
      values.push(academicYearId);
    }

    if (sectionId) {
      sql += ` AND e.section_id = $${pIdx++}`;
      values.push(sectionId);
    }

    if (search) {
      sql += ` AND (s.first_name ILIKE $${pIdx} OR s.last_name ILIKE $${pIdx} OR s.document_number ILIKE $${pIdx} OR e.enrollment_code ILIKE $${pIdx} OR g.first_name ILIKE $${pIdx} OR g.last_name ILIKE $${pIdx})`;
      values.push(`%${search}%`);
      pIdx++;
    }

    sql += ` ORDER BY e.created_at DESC`;

    const res = await query(sql, values);

    const enrollments = res.rows.map((r: any) => ({
      id: r.id,
      tenant_id: r.tenant_id,
      academic_year_id: r.academic_year_id,
      student_id: r.student_id,
      guardian_id: r.guardian_id,
      section_id: r.section_id,
      enrollment_code: r.enrollment_code,
      enrollment_type: r.enrollment_type,
      enrollment_date: r.enrollment_date,
      status: r.status,
      enrollment_fee: Number(r.enrollment_fee || 0),
      enrollment_fee_paid: Boolean(r.enrollment_fee_paid),
      entry_fee: Number(r.entry_fee || 0),
      monthly_tuition_fee: Number(r.monthly_tuition_fee || 0),
      discount_type: r.discount_type,
      discount_percentage: Number(r.discount_percentage || 0),
      notes: r.notes,
      created_at: r.created_at,
      student: {
        id: r.student_id,
        first_name: r.student_first_name,
        last_name: r.student_last_name,
        document_number: r.student_doc,
        student_code: r.student_code,
        gender: r.student_gender,
      },
      guardian: {
        id: r.guardian_id,
        first_name: r.guardian_first_name,
        last_name: r.guardian_last_name,
        phone: r.guardian_phone,
        document_number: r.guardian_doc,
        relationship: r.guardian_relationship,
      },
      section: {
        id: r.section_id,
        full_name: r.section_name,
        section_letter: r.section_letter,
        shift: r.shift,
      },
      academic_year: {
        id: r.academic_year_id,
        year_name: r.year_name,
        year_code: r.year_code,
      },
    }));

    // Métricas del conjunto filtrado
    const totalEnrolled = enrollments.filter((e: any) => e.status !== 'CANCELLED').length;
    const regularCount = enrollments.filter((e: any) => e.enrollment_type === 'REGULAR' && e.status !== 'CANCELLED').length;
    const newCount = enrollments.filter((e: any) => e.enrollment_type === 'NUEVO' && e.status !== 'CANCELLED').length;
    const discountedCount = enrollments.filter((e: any) => e.discount_type !== 'NINGUNO' && e.status !== 'CANCELLED').length;
    const monthlyExpectedRevenue = enrollments
      .filter((e: any) => e.status !== 'CANCELLED')
      .reduce((sum: number, e: any) => sum + e.monthly_tuition_fee, 0);

    return NextResponse.json({
      success: true,
      enrollments,
      stats: {
        totalEnrolled,
        regularCount,
        newCount,
        discountedCount,
        monthlyExpectedRevenue,
      },
    });
  } catch (error: unknown) {
    console.error('[API /api/admin/enrollments GET] Error:', error);
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
    const { action } = body;

    // =========================================================================
    // ACCIÓN 0: FLUJO INTEGRAL DE MATRÍCULA (APODERADO + ALUMNO + CUOTA INGRESO + MATRÍCULA + PENSIONES)
    // =========================================================================
    if (action === 'INTEGRAL_ENROLLMENT') {
      const {
        guardian: guardianData,
        student: studentData,
        enrollment: enrollmentData,
      } = body;

      // 1. GESTIÓN DEL APODERADO
      let guardianId = guardianData?.id;
      if (!guardianId) {
        if (!guardianData?.document_number || !guardianData?.first_name || !guardianData?.last_name || !guardianData?.phone) {
          return NextResponse.json({ success: false, message: 'Datos incompletos del apoderado (DNI, nombres, apellidos y teléfono requeridos)' }, { status: 400 });
        }
        const existingG = await query(
          `SELECT id FROM v2.guardians WHERE tenant_id = $1 AND document_number = $2 LIMIT 1`,
          [tenantId, guardianData.document_number.trim()]
        );
        if (existingG.rows.length > 0) {
          guardianId = existingG.rows[0].id;
        } else {
          guardianId = `grd-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          await query(
            `INSERT INTO v2.guardians
              (id, tenant_id, document_type, document_number, first_name, last_name, relationship, phone, alt_phone, email, address, occupation, billing_tax_id, billing_name, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())`,
            [
              guardianId,
              tenantId,
              guardianData.document_type || 'DNI',
              guardianData.document_number.trim(),
              guardianData.first_name.trim(),
              guardianData.last_name.trim(),
              guardianData.relationship || 'PADRE',
              guardianData.phone.trim(),
              guardianData.alt_phone?.trim() || null,
              guardianData.email?.trim() || null,
              guardianData.address?.trim() || null,
              guardianData.occupation?.trim() || null,
              guardianData.billing_tax_id?.trim() || null,
              guardianData.billing_name?.trim() || null,
            ]
          );
        }
      } else {
        if (guardianData.phone || guardianData.address || guardianData.email) {
          await query(
            `UPDATE v2.guardians 
             SET phone = COALESCE($1, phone), 
                 address = COALESCE($2, address), 
                 email = COALESCE($3, email),
                 updated_at = NOW() 
             WHERE id = $4 AND tenant_id = $5`,
            [guardianData.phone?.trim() || null, guardianData.address?.trim() || null, guardianData.email?.trim() || null, guardianId, tenantId]
          );
        }
      }

      // 2. GESTIÓN DEL ESTUDIANTE
      let studentId = studentData?.id;
      if (!studentId) {
        if (!studentData?.document_number || !studentData?.first_name || !studentData?.last_name) {
          return NextResponse.json({ success: false, message: 'Datos incompletos del estudiante (DNI, nombres y apellidos requeridos)' }, { status: 400 });
        }
        const existingS = await query(
          `SELECT id FROM v2.students WHERE tenant_id = $1 AND document_number = $2 LIMIT 1`,
          [tenantId, studentData.document_number.trim()]
        );
        if (existingS.rows.length > 0) {
          studentId = existingS.rows[0].id;
          await query(
            `UPDATE v2.students SET guardian_id = $1, status = 'ENROLLED', updated_at = NOW() WHERE id = $2 AND tenant_id = $3`,
            [guardianId, studentId, tenantId]
          );
        } else {
          studentId = `stu-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const countRes = await query('SELECT COUNT(*) as count FROM v2.students WHERE tenant_id = $1', [tenantId]);
          const codeSeq = Number(countRes.rows[0]?.count || 0) + 1;
          const studentCode = `EST-${new Date().getFullYear()}-${String(codeSeq).padStart(4, '0')}`;

          await query(
            `INSERT INTO v2.students
              (id, tenant_id, guardian_id, student_code, document_type, document_number, first_name, last_name, gender, birth_date, blood_type, allergies_medical, emergency_contact_phone, health_insurance, previous_school, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'ENROLLED', NOW(), NOW())`,
            [
              studentId,
              tenantId,
              guardianId,
              studentCode,
              studentData.document_type || 'DNI',
              studentData.document_number.trim(),
              studentData.first_name.trim(),
              studentData.last_name.trim(),
              studentData.gender || 'M',
              studentData.birth_date || null,
              studentData.blood_type || 'O+',
              studentData.allergies_medical?.trim() || null,
              studentData.emergency_contact_phone?.trim() || guardianData?.phone?.trim() || null,
              studentData.health_insurance || 'SIS',
              studentData.previous_school?.trim() || null,
            ]
          );
        }
      } else {
        await query(
          `UPDATE v2.students SET guardian_id = $1, status = 'ENROLLED', updated_at = NOW() WHERE id = $2 AND tenant_id = $3`,
          [guardianId, studentId, tenantId]
        );
      }

      // 3. VALIDAR MATRÍCULA Y VACANTES
      const {
        academic_year_id,
        section_id,
        enrollment_type = 'REGULAR',
        enrollment_date,
        enrollment_fee = 0,
        pay_enrollment_now = true,
        enrollment_payment_method = 'EFECTIVO',
        enrollment_receipt_number,
        entry_fee = 0,
        pay_entry_now = false,
        entry_payment_method,
        entry_receipt_number,
        monthly_tuition_fee = 0,
        discount_type = 'NINGUNO',
        discount_percentage = 0,
        notes,
        allow_overcapacity = false,
      } = enrollmentData || {};

      if (!academic_year_id || !section_id) {
        return NextResponse.json({ success: false, message: 'Año escolar y Aula destino son requeridos' }, { status: 400 });
      }

      const finalEnrollmentFee = Number(enrollment_fee || 0);
      if (finalEnrollmentFee > 0 && pay_enrollment_now && (!enrollment_payment_method || !enrollment_receipt_number?.trim())) {
        return NextResponse.json({
          success: false,
          message: 'Has seleccionado cobro obligatorio al contado de la matrícula. Debes indicar el medio de pago y número de recibo/operación.'
        }, { status: 400 });
      }

      // Validación estricta: Solo debe existir un alumno por año académico
      const studentDoc = (studentData?.document_number || '').trim();
      const existingEnroll = await query(
        `SELECT e.id, e.enrollment_code, s.first_name, s.last_name 
         FROM v2.enrollments e
         JOIN v2.students s ON s.id = e.student_id
         WHERE e.tenant_id = $1 
           AND e.academic_year_id = $2 
           AND (e.student_id = $3 ${studentDoc ? 'OR s.document_number = $4' : ''})
           AND e.status != 'CANCELLED' 
         LIMIT 1`,
        studentDoc ? [tenantId, academic_year_id, studentId, studentDoc] : [tenantId, academic_year_id, studentId]
      );
      if (existingEnroll.rows.length > 0) {
        return NextResponse.json({
          success: false,
          message: `El estudiante ${existingEnroll.rows[0].first_name} ${existingEnroll.rows[0].last_name} ya cuenta con la matrícula activa ${existingEnroll.rows[0].enrollment_code} en este año escolar. Solo se permite una matrícula por alumno por año lectivo.`
        }, { status: 400 });
      }

      const sectionRes = await query(
        `SELECT s.id, s.full_name, s.capacity, s.enrolled_count, g.grade_name
         FROM v2.school_sections s
         JOIN v2.school_grades g ON s.grade_id = g.id
         WHERE s.id = $1 AND s.tenant_id = $2`,
        [section_id, tenantId]
      );
      if (sectionRes.rows.length === 0) {
        return NextResponse.json({ success: false, message: 'El aula seleccionada no existe' }, { status: 404 });
      }
      const section = sectionRes.rows[0];
      const capacity = Number(section.capacity || 30);
      const enrolled = Number(section.enrolled_count || 0);

      if (enrolled >= capacity && !allow_overcapacity) {
        return NextResponse.json({
          success: false,
          message: `El aula ${section.full_name} no tiene vacantes disponibles (${enrolled}/${capacity} ocupadas).`
        }, { status: 400 });
      }

      // 4. DATOS Y CÓDIGO DE MATRÍCULA
      const yearRes = await query('SELECT year_code FROM v2.academic_years WHERE id = $1 AND tenant_id = $2', [academic_year_id, tenantId]);
      const yearCode = yearRes.rows[0]?.year_code || new Date().getFullYear();

      const enrollCountRes = await query('SELECT COUNT(*) as count FROM v2.enrollments WHERE tenant_id = $1 AND academic_year_id = $2', [tenantId, academic_year_id]);
      const seq = Number(enrollCountRes.rows[0]?.count || 0) + 1;
      const enrollmentCode = `MAT-${yearCode}-${String(seq).padStart(4, '0')}`;

      const enrollId = `enr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const enrollDateStr = enrollment_date || new Date().toISOString().split('T')[0];
      const finalMonthlyTuition = Number(monthly_tuition_fee || 0);
      const finalEntryFee = Number(entry_fee || 0);

      const sRow = await query('SELECT first_name, last_name, document_number FROM v2.students WHERE id = $1', [studentId]);
      const studentFullName = `${sRow.rows[0]?.first_name || ''} ${sRow.rows[0]?.last_name || ''}`.trim();
      const gRow = await query('SELECT first_name, last_name, phone, document_number, email, address FROM v2.guardians WHERE id = $1', [guardianId]);
      const parentFullName = `${gRow.rows[0]?.first_name || ''} ${gRow.rows[0]?.last_name || ''}`.trim();
      const parentPhone = gRow.rows[0]?.phone || '';
      const parentDoc = (gRow.rows[0]?.document_number || guardianData?.document_number || '').trim();
      const parentEmail = gRow.rows[0]?.email || guardianData?.email || null;
      const parentAddress = gRow.rows[0]?.address || guardianData?.address || null;

      // 5. INSERTAR MATRÍCULA
      await query(
        `INSERT INTO v2.enrollments
          (id, tenant_id, academic_year_id, student_id, guardian_id, section_id, enrollment_code, enrollment_type, enrollment_date, status, enrollment_fee, enrollment_fee_paid, entry_fee, monthly_tuition_fee, discount_type, discount_percentage, notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'CONFIRMED', $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())`,
        [
          enrollId,
          tenantId,
          academic_year_id,
          studentId,
          guardianId,
          section_id,
          enrollmentCode,
          enrollment_type,
          enrollDateStr,
          finalEnrollmentFee,
          Boolean(pay_enrollment_now),
          finalEntryFee,
          finalMonthlyTuition,
          discount_type,
          Number(discount_percentage || 0),
          notes || null,
        ]
      );

      // Actualizar vacantes
      await query(`UPDATE v2.school_sections SET enrolled_count = enrolled_count + 1, updated_at = NOW() WHERE id = $1 AND tenant_id = $2`, [section_id, tenantId]);

      // 6. FINANZAS: MATRÍCULA (AL CONTADO O DIFERIDO)
      if (finalEnrollmentFee > 0) {
        let matTxId: string | null = null;
        if (pay_enrollment_now) {
          matTxId = `tx-mat-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const catRes = await query(
            `SELECT id FROM v2.financial_categories WHERE tenant_id = $1 AND type = 'INCOME' AND name ILIKE '%Matrícula%' LIMIT 1`,
            [tenantId]
          );
          const catId = catRes.rows[0]?.id || null;

          await query(
            `INSERT INTO v2.financial_transactions
              (id, tenant_id, category_id, type, amount, description, transaction_date, payment_method, receipt_number, registered_by, funding_source, created_at)
             VALUES ($1, $2, $3, 'INCOME', $4, $5, $6, $7, $8, $9, 'PROPIO', NOW())`,
            [
              matTxId,
              tenantId,
              catId,
              finalEnrollmentFee,
              `Cobro de Matrícula ${yearCode} - ${studentFullName} (${section.full_name})`,
              enrollDateStr,
              enrollment_payment_method,
              enrollment_receipt_number?.trim() || `REC-${enrollmentCode}`,
              session.userId,
            ]
          );
        }

        const matTuitionId = `tui-mat-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        await query(
          `INSERT INTO v2.student_tuitions
            (id, tenant_id, student_id, enrollment_id, guardian_id, concept_type, student_name, grade_section, parent_name, parent_phone, period_month, monthly_amount, due_date, status, transaction_id, paid_date, payment_method, receipt_number, created_at)
           VALUES ($1, $2, $3, $4, $5, 'MATRICULA', $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())`,
          [
            matTuitionId,
            tenantId,
            studentId,
            enrollId,
            guardianId,
            studentFullName,
            section.full_name,
            parentFullName,
            parentPhone,
            `${yearCode}-MAT`,
            finalEnrollmentFee,
            enrollDateStr,
            pay_enrollment_now ? 'PAID' : 'PENDING',
            matTxId,
            pay_enrollment_now ? enrollDateStr : null,
            pay_enrollment_now ? enrollment_payment_method : null,
            pay_enrollment_now ? (enrollment_receipt_number?.trim() || `REC-${enrollmentCode}`) : null,
          ]
        );
      }

      // 7. FINANZAS: CUOTA DE INGRESO
      if (finalEntryFee > 0) {
        let entryTxId: string | null = null;
        if (pay_entry_now) {
          entryTxId = `tx-ent-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const catEntRes = await query(
            `SELECT id FROM v2.financial_categories WHERE tenant_id = $1 AND type = 'INCOME' AND name ILIKE '%Ingreso%' LIMIT 1`,
            [tenantId]
          );
          const catEntId = catEntRes.rows[0]?.id || null;

          await query(
            `INSERT INTO v2.financial_transactions
              (id, tenant_id, category_id, type, amount, description, transaction_date, payment_method, receipt_number, registered_by, funding_source, created_at)
             VALUES ($1, $2, $3, 'INCOME', $4, $5, $6, $7, $8, $9, 'PROPIO', NOW())`,
            [
              entryTxId,
              tenantId,
              catEntId,
              finalEntryFee,
              `Cuota de Ingreso - ${studentFullName} (${section.full_name})`,
              enrollDateStr,
              entry_payment_method || enrollment_payment_method,
              entry_receipt_number?.trim() || enrollment_receipt_number.trim(),
              session.userId,
            ]
          );
        }

        const entryTuitionId = `tui-ent-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        await query(
          `INSERT INTO v2.student_tuitions
            (id, tenant_id, student_id, enrollment_id, guardian_id, concept_type, student_name, grade_section, parent_name, parent_phone, period_month, monthly_amount, due_date, status, transaction_id, paid_date, payment_method, receipt_number, created_at)
           VALUES ($1, $2, $3, $4, $5, 'INGRESO', $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())`,
          [
            entryTuitionId,
            tenantId,
            studentId,
            enrollId,
            guardianId,
            studentFullName,
            section.full_name,
            parentFullName,
            parentPhone,
            `${yearCode}-ING`,
            finalEntryFee,
            enrollDateStr,
            pay_entry_now ? 'PAID' : 'PENDING',
            entryTxId,
            pay_entry_now ? enrollDateStr : null,
            pay_entry_now ? (entry_payment_method || enrollment_payment_method) : null,
            pay_entry_now ? (entry_receipt_number?.trim() || enrollment_receipt_number.trim()) : null,
          ]
        );
      }

      // 8. CRONOGRAMA DE 10 PENSIONES MENSUALES (MARZO A DICIEMBRE)
      const months = [
        { code: '03', name: 'Marzo' },
        { code: '04', name: 'Abril' },
        { code: '05', name: 'Mayo' },
        { code: '06', name: 'Junio' },
        { code: '07', name: 'Julio' },
        { code: '08', name: 'Agosto' },
        { code: '09', name: 'Setiembre' },
        { code: '10', name: 'Octubre' },
        { code: '11', name: 'Noviembre' },
        { code: '12', name: 'Diciembre' },
      ];

      for (const m of months) {
        const periodMonth = `${yearCode}-${m.code}`;
        const dueDate = `${yearCode}-${m.code}-05`;
        const tuitionId = `tui-${periodMonth}-${studentId}-${Math.floor(Math.random() * 1000)}`;

        await query(
          `INSERT INTO v2.student_tuitions
            (id, tenant_id, student_id, enrollment_id, guardian_id, concept_type, student_name, grade_section, parent_name, parent_phone, period_month, monthly_amount, due_date, status, created_at)
           VALUES ($1, $2, $3, $4, $5, 'PENSION', $6, $7, $8, $9, $10, $11, $12, 'PENDING', NOW())
           ON CONFLICT DO NOTHING`,
          [
            tuitionId,
            tenantId,
            studentId,
            enrollId,
            guardianId,
            studentFullName,
            section.full_name,
            parentFullName,
            parentPhone,
            periodMonth,
            finalMonthlyTuition,
            dueDate,
          ]
        );
      }

      // 9. GESTIÓN AUTOMÁTICA DEL USUARIO PARA EL APODERADO (ACCESO AL PORTAL EDUCA360)
      let guardianUserAccount: { username: string; tempPassword?: string; isNewUser: boolean } | null = null;
      if (parentDoc) {
        // Verificar si ya existe usuario con este documento o username en este colegio
        const existingUserRes = await query(
          `SELECT id, username FROM v2.users WHERE tenant_id = $1 AND (document = $2 OR username = $2) LIMIT 1`,
          [tenantId, parentDoc]
        );

        if (existingUserRes.rows.length > 0) {
          guardianUserAccount = {
            username: existingUserRes.rows[0].username,
            isNewUser: false,
          };
        } else {
          // Crear nuevo usuario con rol APODERADO
          let desiredUsername = parentDoc;
          const userGlobalCheck = await query(`SELECT id FROM v2.users WHERE LOWER(username) = $1 LIMIT 1`, [desiredUsername.toLowerCase()]);
          if (userGlobalCheck.rows.length > 0) {
            desiredUsername = `apo_${parentDoc}`;
          }

          const tempPassword = parentDoc.length >= 6 ? parentDoc : `${parentDoc}123`;
          const passwordHash = await hashPassword(tempPassword);
          const newUserId = `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

          await query(
            `INSERT INTO v2.users (
              id, tenant_id, username, password, name, email, phone, document, address, role, is_active, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'APODERADO', true, NOW(), NOW())`,
            [
              newUserId,
              tenantId,
              desiredUsername,
              passwordHash,
              parentFullName,
              parentEmail,
              parentPhone || null,
              parentDoc,
              parentAddress,
            ]
          );

          await query(
            `INSERT INTO v2.audit_logs (id, tenant_id, user_id, action, details, ip_address)
             VALUES ($1, $2, $3, 'CREATE_USER_GUARDIAN', $4, $5)`,
            [
              `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              tenantId,
              session.userId,
              `Cuenta de Apoderado creada automáticamente: @${desiredUsername} (${parentFullName}) para matrícula ${enrollmentCode}`,
              req.headers.get('x-forwarded-for') || '127.0.0.1',
            ]
          );

          guardianUserAccount = {
            username: desiredUsername,
            tempPassword: tempPassword,
            isNewUser: true,
          };
        }
      }

      // 10. AUDITORÍA
      await query(
        `INSERT INTO v2.audit_logs (id, tenant_id, user_id, action, details, ip_address)
         VALUES ($1, $2, $3, 'INTEGRAL_ENROLLMENT', $4, $5)`,
        [
          `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          tenantId,
          session.userId,
          `Matrícula Integral completada: ${studentFullName} en ${section.full_name} (${enrollmentCode}). Apoderado: ${parentFullName}.`,
          req.headers.get('x-forwarded-for') || '127.0.0.1',
        ]
      );

      return NextResponse.json({
        success: true,
        message: `¡Matrícula integral ${enrollmentCode} registrada con éxito! Estudiante: ${studentFullName}.`,
        enrollmentId: enrollId,
        enrollmentCode,
        studentId,
        guardianId,
        guardianUser: guardianUserAccount,
      });
    }

    // =========================================================================
    // ACCIÓN 1: REGISTRAR NUEVA MATRÍCULA (CON AUTOGENERACIÓN FINANCIERA)
    // =========================================================================
    if (action === 'CREATE_ENROLLMENT') {
      const {
        academic_year_id,
        student_id,
        guardian_id,
        section_id,
        enrollment_type = 'REGULAR',
        enrollment_date,
        enrollment_fee,
        pay_enrollment_now = false,
        enrollment_payment_method = 'EFECTIVO',
        enrollment_receipt_number,
        entry_fee = 0,
        monthly_tuition_fee,
        discount_type = 'NINGUNO',
        discount_percentage = 0,
        notes,
      } = body;

      if (!academic_year_id || !student_id || !guardian_id || !section_id) {
        return NextResponse.json(
          { success: false, message: 'Año escolar, Estudiante, Apoderado y Aula son obligatorios' },
          { status: 400 }
        );
      }

      // 1. Validar estrictamente que solo exista un alumno por año académico
      const existing = await query(
        `SELECT e.id, e.enrollment_code, s.first_name, s.last_name 
         FROM v2.enrollments e
         JOIN v2.students s ON s.id = e.student_id
         WHERE e.tenant_id = $1 AND e.academic_year_id = $2 AND e.student_id = $3 AND e.status != 'CANCELLED' 
         LIMIT 1`,
        [tenantId, academic_year_id, student_id]
      );
      if (existing.rows.length > 0) {
        return NextResponse.json(
          { success: false, message: `El estudiante ${existing.rows[0].first_name} ${existing.rows[0].last_name} ya cuenta con la matrícula activa ${existing.rows[0].enrollment_code} en este año escolar. Solo se permite una matrícula por alumno por año académico.` },
          { status: 400 }
        );
      }

      // 2. Obtener datos de la sección y validar vacantes
      const sectionRes = await query(
        `SELECT s.id, s.full_name, s.capacity, s.enrolled_count, g.grade_name
         FROM v2.school_sections s
         JOIN v2.school_grades g ON s.grade_id = g.id
         WHERE s.id = $1 AND s.tenant_id = $2`,
        [section_id, tenantId]
      );
      if (sectionRes.rows.length === 0) {
        return NextResponse.json({ success: false, message: 'La sección seleccionada no existe' }, { status: 404 });
      }
      const section = sectionRes.rows[0];
      const capacity = Number(section.capacity || 30);
      const enrolled = Number(section.enrolled_count || 0);

      if (enrolled >= capacity && !body.allow_overcapacity) {
        return NextResponse.json(
          { success: false, message: `El aula ${section.full_name} está completa (${enrolled}/${capacity} vacantes ocupadas).` },
          { status: 400 }
        );
      }

      // 3. Obtener datos del alumno y apoderado
      const studentRes = await query('SELECT first_name, last_name, document_number FROM v2.students WHERE id = $1 AND tenant_id = $2', [student_id, tenantId]);
      const student = studentRes.rows[0];
      if (!student) return NextResponse.json({ success: false, message: 'Estudiante no encontrado' }, { status: 404 });

      const guardianRes = await query('SELECT first_name, last_name, phone FROM v2.guardians WHERE id = $1 AND tenant_id = $2', [guardian_id, tenantId]);
      const guardian = guardianRes.rows[0];
      if (!guardian) return NextResponse.json({ success: false, message: 'Apoderado no encontrado' }, { status: 404 });

      // 4. Obtener año lectivo para generar código de matrícula
      const yearRes = await query('SELECT year_code FROM v2.academic_years WHERE id = $1 AND tenant_id = $2', [academic_year_id, tenantId]);
      const yearCode = yearRes.rows[0]?.year_code || new Date().getFullYear();

      const enrollCountRes = await query('SELECT COUNT(*) as count FROM v2.enrollments WHERE tenant_id = $1 AND academic_year_id = $2', [tenantId, academic_year_id]);
      const seq = Number(enrollCountRes.rows[0]?.count || 0) + 1;
      const enrollmentCode = `MAT-${yearCode}-${String(seq).padStart(4, '0')}`;

      const finalEnrollmentFee = Number(enrollment_fee || 0);
      const finalMonthlyTuition = Number(monthly_tuition_fee || 0);
      const finalEntryFee = Number(entry_fee || 0);
      const enrollId = `enr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const enrollDateStr = enrollment_date || new Date().toISOString().split('T')[0];

      // 5. Insertar Matrícula
      await query(
        `INSERT INTO v2.enrollments
          (id, tenant_id, academic_year_id, student_id, guardian_id, section_id, enrollment_code, enrollment_type, enrollment_date, status, enrollment_fee, enrollment_fee_paid, entry_fee, monthly_tuition_fee, discount_type, discount_percentage, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'CONFIRMED', $10, $11, $12, $13, $14, $15, $16)`,
        [
          enrollId,
          tenantId,
          academic_year_id,
          student_id,
          guardian_id,
          section_id,
          enrollmentCode,
          enrollment_type,
          enrollDateStr,
          finalEnrollmentFee,
          Boolean(pay_enrollment_now),
          finalEntryFee,
          finalMonthlyTuition,
          discount_type,
          Number(discount_percentage || 0),
          notes || null,
        ]
      );

      // 6. Actualizar vacantes en la sección y estado del alumno
      await query(
        `UPDATE v2.school_sections SET enrolled_count = enrolled_count + 1, updated_at = NOW() WHERE id = $1 AND tenant_id = $2`,
        [section_id, tenantId]
      );
      await query(
        `UPDATE v2.students SET status = 'ENROLLED', guardian_id = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`,
        [guardian_id, student_id, tenantId]
      );

      // =========================================================================
      // 7. VINCULACIÓN FINANCIERA AUTOMÁTICA (GENERACIÓN DE PENSIONES & MATRÍCULA)
      // =========================================================================
      const studentFullName = `${student.first_name} ${student.last_name}`;
      const parentFullName = `${guardian.first_name} ${guardian.last_name}`;

      // 7.1 Cuota de Matrícula
      if (finalEnrollmentFee > 0) {
        const matTxId = pay_enrollment_now ? `tx-mat-${Date.now()}-${Math.floor(Math.random() * 1000)}` : null;

        // Si se pagó ahora mismo en caja, registrar el ingreso directo a Caja Propia
        if (pay_enrollment_now) {
          // Obtener categoría de ingresos "Matrículas & Cuotas"
          const catRes = await query(
            `SELECT id FROM v2.financial_categories WHERE tenant_id = $1 AND type = 'INCOME' AND name ILIKE '%Matrícula%' LIMIT 1`,
            [tenantId]
          );
          const catId = catRes.rows[0]?.id || null;

          await query(
            `INSERT INTO v2.financial_transactions
              (id, tenant_id, category_id, type, amount, description, transaction_date, payment_method, receipt_number, registered_by, funding_source, created_at)
             VALUES ($1, $2, $3, 'INCOME', $4, $5, $6, $7, $8, $9, 'PROPIO', NOW())`,
            [
              matTxId,
              tenantId,
              catId,
              finalEnrollmentFee,
              `Cobro de Matrícula ${yearCode} - ${studentFullName} (${section.full_name})`,
              enrollDateStr,
              enrollment_payment_method,
              enrollment_receipt_number?.trim() || `REC-${enrollmentCode}`,
              session.userId,
            ]
          );
        }

        const matTuitionId = `tui-mat-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        await query(
          `INSERT INTO v2.student_tuitions
            (id, tenant_id, student_id, enrollment_id, guardian_id, concept_type, student_name, grade_section, parent_name, parent_phone, period_month, monthly_amount, due_date, status, transaction_id, paid_date, payment_method, receipt_number, created_at)
           VALUES ($1, $2, $3, $4, $5, 'MATRICULA', $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())`,
          [
            matTuitionId,
            tenantId,
            student_id,
            enrollId,
            guardian_id,
            studentFullName,
            section.full_name,
            parentFullName,
            guardian.phone,
            `${yearCode}-MAT`,
            finalEnrollmentFee,
            enrollDateStr,
            pay_enrollment_now ? 'PAID' : 'PENDING',
            matTxId,
            pay_enrollment_now ? enrollDateStr : null,
            pay_enrollment_now ? enrollment_payment_method : null,
            pay_enrollment_now ? (enrollment_receipt_number?.trim() || `REC-${enrollmentCode}`) : null,
          ]
        );
      }

      // 7.2 Cuota de Ingreso (si es alumno nuevo y aplica cuota de ingreso)
      if (finalEntryFee > 0) {
        const entryTuitionId = `tui-ent-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        await query(
          `INSERT INTO v2.student_tuitions
            (id, tenant_id, student_id, enrollment_id, guardian_id, concept_type, student_name, grade_section, parent_name, parent_phone, period_month, monthly_amount, due_date, status, created_at)
           VALUES ($1, $2, $3, $4, $5, 'INGRESO', $6, $7, $8, $9, $10, $11, $12, 'PENDING', NOW())`,
          [
            entryTuitionId,
            tenantId,
            student_id,
            enrollId,
            guardian_id,
            studentFullName,
            section.full_name,
            parentFullName,
            guardian.phone,
            `${yearCode}-ING`,
            finalEntryFee,
            enrollDateStr,
          ]
        );
      }

      // 7.3 Autogenerar las 10 mensualidades del año escolar (Marzo a Diciembre)
      // Día de vencimiento: 5 de cada mes
      const months = [
        { code: '03', name: 'Marzo' },
        { code: '04', name: 'Abril' },
        { code: '05', name: 'Mayo' },
        { code: '06', name: 'Junio' },
        { code: '07', name: 'Julio' },
        { code: '08', name: 'Agosto' },
        { code: '09', name: 'Setiembre' },
        { code: '10', name: 'Octubre' },
        { code: '11', name: 'Noviembre' },
        { code: '12', name: 'Diciembre' },
      ];

      for (const m of months) {
        const periodMonth = `${yearCode}-${m.code}`;
        const dueDate = `${yearCode}-${m.code}-05`;
        const tuitionId = `tui-${periodMonth}-${student_id}-${Math.floor(Math.random() * 1000)}`;

        await query(
          `INSERT INTO v2.student_tuitions
            (id, tenant_id, student_id, enrollment_id, guardian_id, concept_type, student_name, grade_section, parent_name, parent_phone, period_month, monthly_amount, due_date, status, created_at)
           VALUES ($1, $2, $3, $4, $5, 'PENSION', $6, $7, $8, $9, $10, $11, $12, 'PENDING', NOW())
           ON CONFLICT DO NOTHING`,
          [
            tuitionId,
            tenantId,
            student_id,
            enrollId,
            guardian_id,
            studentFullName,
            section.full_name,
            parentFullName,
            guardian.phone,
            periodMonth,
            finalMonthlyTuition,
            dueDate,
          ]
        );
      }

      // 8. Registro de Auditoría
      await query(
        `INSERT INTO v2.audit_logs (id, tenant_id, user_id, action, details, ip_address)
         VALUES ($1, $2, $3, 'CREATE_ENROLLMENT', $4, $5)`,
        [
          `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          tenantId,
          session.userId,
          `Matrícula completada: ${studentFullName} en ${section.full_name} (${enrollmentCode}). Pensión pactada: S/ ${finalMonthlyTuition.toFixed(2)}.`,
          req.headers.get('x-forwarded-for') || '127.0.0.1',
        ]
      );

      return NextResponse.json({
        success: true,
        message: `¡Matrícula ${enrollmentCode} completada con éxito! Se inscribió a ${studentFullName} en ${section.full_name} y se generaron sus 10 pensiones en el módulo financiero.`,
        enrollmentId: enrollId,
        enrollmentCode,
      });
    }

    // =========================================================================
    // ACCIÓN 2: CANCELAR MATRÍCULA
    // =========================================================================
    if (action === 'CANCEL_ENROLLMENT') {
      const { enrollment_id } = body;
      if (!enrollment_id) return NextResponse.json({ success: false, message: 'ID de matrícula requerido' }, { status: 400 });

      const enrRes = await query(
        `SELECT id, section_id, student_id, enrollment_code, status 
         FROM v2.enrollments WHERE id = $1 AND tenant_id = $2`,
        [enrollment_id, tenantId]
      );
      if (enrRes.rows.length === 0) return NextResponse.json({ success: false, message: 'Matrícula no encontrada' }, { status: 404 });
      const enr = enrRes.rows[0];

      if (enr.status === 'CANCELLED') {
        return NextResponse.json({ success: false, message: 'Esta matrícula ya se encuentra cancelada' }, { status: 400 });
      }

      // Marcar como cancelada
      await query(`UPDATE v2.enrollments SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1 AND tenant_id = $2`, [enrollment_id, tenantId]);

      // Liberar vacante en sección
      await query(`UPDATE v2.school_sections SET enrolled_count = GREATEST(0, enrolled_count - 1), updated_at = NOW() WHERE id = $1 AND tenant_id = $2`, [enr.section_id, tenantId]);

      // Actualizar estado del alumno a RETIRADO
      await query(`UPDATE v2.students SET status = 'WITHDRAWN', updated_at = NOW() WHERE id = $1 AND tenant_id = $2`, [enr.student_id, tenantId]);

      // Eliminar pensiones pendientes no pagadas
      await query(`DELETE FROM v2.student_tuitions WHERE enrollment_id = $1 AND status != 'PAID' AND tenant_id = $2`, [enrollment_id, tenantId]);

      return NextResponse.json({
        success: true,
        message: `La matrícula ${enr.enrollment_code} fue cancelada. Se liberó la vacante en el aula y se cancelaron las cuotas pendientes.`,
      });
    }

    return NextResponse.json({ success: false, message: 'Acción no reconocida' }, { status: 400 });
  } catch (error: unknown) {
    console.error('[API /api/admin/enrollments POST] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
