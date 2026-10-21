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

    // 1. Años Lectivos
    const yearsRes = await query(
      `SELECT id, tenant_id, year_name, year_code, 
              TO_CHAR(start_date, 'YYYY-MM-DD') as start_date, 
              TO_CHAR(end_date, 'YYYY-MM-DD') as end_date, 
              status, is_enrollment_open, created_at, updated_at
       FROM v2.academic_years
       WHERE tenant_id = $1
       ORDER BY year_code DESC`,
      [tenantId]
    );

    // 2. Grados con sus Secciones
    const gradesRes = await query(
      `SELECT id, tenant_id, level, grade_name, grade_order, 
              default_enrollment_amount, default_tuition_amount, default_entry_fee, created_at
       FROM v2.school_grades
       WHERE tenant_id = $1
       ORDER BY grade_order ASC`,
      [tenantId]
    );

    const sectionsRes = await query(
      `SELECT s.id, s.tenant_id, s.academic_year_id, s.grade_id, s.section_letter, 
              s.full_name, s.shift, s.capacity, s.enrolled_count, s.tutor_user_id,
              COALESCE(u.name, s.tutor_name) as tutor_name,
              u.username as tutor_username,
              u.email as tutor_email,
              u.avatar as tutor_avatar,
              s.classroom_location, s.status,
              GREATEST(0, s.capacity - s.enrolled_count) as available_vacancies
       FROM v2.school_sections s
       LEFT JOIN v2.users u ON s.tutor_user_id = u.id
       WHERE s.tenant_id = $1
       ORDER BY s.section_letter ASC`,
      [tenantId]
    );

    // Listado EXCLUSIVO de usuarios docentes/maestros activos del colegio para asignación de tutoría
    const teachersRes = await query(
      `SELECT id, name, username, email, phone, avatar, role, is_active
       FROM v2.users
       WHERE tenant_id = $1 AND role = 'MAESTRO' AND is_active = true
       ORDER BY name ASC`,
      [tenantId]
    );

    // Mapear secciones a cada grado
    const gradesWithSections = gradesRes.rows.map((grade: any) => ({
      ...grade,
      default_enrollment_amount: Number(grade.default_enrollment_amount || 0),
      default_tuition_amount: Number(grade.default_tuition_amount || 0),
      default_entry_fee: Number(grade.default_entry_fee || 0),
      sections: sectionsRes.rows
        .filter((sec: any) => sec.grade_id === grade.id)
        .map((sec: any) => ({
          ...sec,
          capacity: Number(sec.capacity || 0),
          enrolled_count: Number(sec.enrolled_count || 0),
          available_vacancies: Number(sec.available_vacancies || 0),
        })),
    }));

    // Métricas globales
    const totalCapacity = sectionsRes.rows.reduce((sum: number, s: any) => sum + Number(s.capacity || 0), 0);
    const totalEnrolled = sectionsRes.rows.reduce((sum: number, s: any) => sum + Number(s.enrolled_count || 0), 0);
    const availableVacancies = Math.max(0, totalCapacity - totalEnrolled);

    return NextResponse.json({
      success: true,
      academicYears: yearsRes.rows,
      grades: gradesWithSections,
      teachers: teachersRes.rows,
      stats: {
        totalGrades: gradesRes.rows.length,
        totalSections: sectionsRes.rows.length,
        totalCapacity,
        totalEnrolled,
        availableVacancies,
        occupancyRate: totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0,
      },
    });
  } catch (error: unknown) {
    console.error('[API /api/admin/academic-structure GET] Error:', error);
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

    // 1. Guardar o Actualizar Año Lectivo
    if (action === 'SAVE_YEAR') {
      const { id, year_name, year_code, start_date, end_date, status = 'ACTIVE', is_enrollment_open = true } = body;
      if (!year_name || !year_code || !start_date || !end_date) {
        return NextResponse.json({ success: false, message: 'Todos los campos del año lectivo son obligatorios' }, { status: 400 });
      }

      if (id) {
        await query(
          `UPDATE v2.academic_years
           SET year_name = $1, year_code = $2, start_date = $3, end_date = $4, 
               status = $5, is_enrollment_open = $6, updated_at = NOW()
           WHERE id = $7 AND tenant_id = $8`,
          [year_name, year_code, start_date, end_date, status, is_enrollment_open, id, tenantId]
        );
        return NextResponse.json({ success: true, message: 'Año lectivo actualizado exitosamente.' });
      } else {
        const newId = `ay-${year_code}-${Date.now()}`;
        await query(
          `INSERT INTO v2.academic_years 
            (id, tenant_id, year_name, year_code, start_date, end_date, status, is_enrollment_open)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [newId, tenantId, year_name, year_code, start_date, end_date, status, is_enrollment_open]
        );
        return NextResponse.json({ success: true, message: 'Año lectivo creado exitosamente.', id: newId });
      }
    }

    // 2. Guardar o Actualizar Grado (Nombre, Nivel, Orden y Tarifario)
    if (action === 'SAVE_GRADE') {
      const { id, level = 'PRIMARIA', grade_name, grade_order = 1, default_enrollment_amount = 0, default_tuition_amount = 0, default_entry_fee = 0 } = body;
      if (!grade_name?.trim()) {
        return NextResponse.json({ success: false, message: 'El nombre del grado es obligatorio' }, { status: 400 });
      }

      if (id) {
        await query(
          `UPDATE v2.school_grades
           SET level = $1, grade_name = $2, grade_order = $3, 
               default_enrollment_amount = $4, default_tuition_amount = $5, default_entry_fee = $6, updated_at = NOW()
           WHERE id = $7 AND tenant_id = $8`,
          [
            level,
            grade_name.trim(),
            Number(grade_order || 1),
            Number(default_enrollment_amount || 0),
            Number(default_tuition_amount || 0),
            Number(default_entry_fee || 0),
            id,
            tenantId,
          ]
        );

        // Actualizar el full_name de las secciones existentes de este grado
        await query(
          `UPDATE v2.school_sections
           SET full_name = $1 || ' - Sección ' || section_letter, updated_at = NOW()
           WHERE grade_id = $2 AND tenant_id = $3`,
          [grade_name.trim(), id, tenantId]
        );

        return NextResponse.json({ success: true, message: `¡Grado "${grade_name.trim()}" actualizado con éxito!` });
      } else {
        const newGradeId = `grd-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        await query(
          `INSERT INTO v2.school_grades
            (id, tenant_id, level, grade_name, grade_order, default_enrollment_amount, default_tuition_amount, default_entry_fee)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            newGradeId,
            tenantId,
            level,
            grade_name.trim(),
            Number(grade_order || 1),
            Number(default_enrollment_amount || 0),
            Number(default_tuition_amount || 0),
            Number(default_entry_fee || 0),
          ]
        );

        // Crear automáticamente la Sección A para el año activo si existe
        const yearRes = await query(
          `SELECT id FROM v2.academic_years WHERE tenant_id = $1 AND status = 'ACTIVE' LIMIT 1`,
          [tenantId]
        );
        const activeYearId = yearRes.rows[0]?.id || null;
        if (activeYearId) {
          const newSecId = `sec-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          await query(
            `INSERT INTO v2.school_sections
              (id, tenant_id, academic_year_id, grade_id, section_letter, full_name, shift, capacity, enrolled_count)
             VALUES ($1, $2, $3, $4, 'A', $5, 'MAÑANA', 30, 0)`,
            [newSecId, tenantId, activeYearId, newGradeId, `${grade_name.trim()} - Sección A`]
          );
        }

        return NextResponse.json({ success: true, message: `¡Grado "${grade_name.trim()}" creado exitosamente!`, id: newGradeId });
      }
    }

    // 2.1 Guardar Tarifario Base del Grado (rápido)
    if (action === 'SAVE_GRADE_RATES') {
      const { grade_id, default_enrollment_amount, default_tuition_amount, default_entry_fee } = body;
      if (!grade_id) return NextResponse.json({ success: false, message: 'ID del grado requerido' }, { status: 400 });

      await query(
        `UPDATE v2.school_grades
         SET default_enrollment_amount = $1, default_tuition_amount = $2, default_entry_fee = $3, updated_at = NOW()
         WHERE id = $4 AND tenant_id = $5`,
        [Number(default_enrollment_amount || 0), Number(default_tuition_amount || 0), Number(default_entry_fee || 0), grade_id, tenantId]
      );
      return NextResponse.json({ success: true, message: 'Tarifario del grado actualizado con éxito.' });
    }

    // 2.2 Eliminar Grado
    if (action === 'DELETE_GRADE') {
      const { grade_id } = body;
      if (!grade_id) return NextResponse.json({ success: false, message: 'ID del grado requerido' }, { status: 400 });

      // Validar si tiene alumnos matriculados
      const checkEnrolled = await query(
        `SELECT SUM(s.enrolled_count) as total_enrolled
         FROM v2.school_sections s
         WHERE s.grade_id = $1 AND s.tenant_id = $2`,
        [grade_id, tenantId]
      );
      const enrolled = Number(checkEnrolled.rows[0]?.total_enrolled || 0);
      if (enrolled > 0) {
        return NextResponse.json(
          { success: false, message: `No se puede eliminar el grado porque tiene ${enrolled} alumno(s) matriculado(s). Trasládalos primero.` },
          { status: 400 }
        );
      }

      await query(`DELETE FROM v2.school_sections WHERE grade_id = $1 AND tenant_id = $2`, [grade_id, tenantId]);
      await query(`DELETE FROM v2.school_grades WHERE id = $1 AND tenant_id = $2`, [grade_id, tenantId]);

      return NextResponse.json({ success: true, message: 'Grado eliminado exitosamente.' });
    }

    // 3. Crear o Actualizar Sección / Aula
    if (action === 'SAVE_SECTION') {
      const {
        id,
        academic_year_id,
        grade_id,
        section_letter = 'A',
        shift = 'MAÑANA',
        capacity = 30,
        tutor_user_id,
        classroom_location,
      } = body;

      if (!grade_id || !section_letter) {
        return NextResponse.json({ success: false, message: 'Grado y Letra de Sección son obligatorios' }, { status: 400 });
      }

      // Si no viene academic_year_id, buscar el activo
      let yearId = academic_year_id;
      if (!yearId) {
        const yearRes = await query(`SELECT id FROM v2.academic_years WHERE tenant_id = $1 AND status = 'ACTIVE' LIMIT 1`, [tenantId]);
        yearId = yearRes.rows[0]?.id;
      }

      // Obtener nombre del grado para formar el full_name
      const gradeRes = await query('SELECT grade_name FROM v2.school_grades WHERE id = $1 AND tenant_id = $2', [grade_id, tenantId]);
      const gradeName = gradeRes.rows[0]?.grade_name || 'Grado';
      const cleanLetter = section_letter.toUpperCase().trim();
      const fullName = `${gradeName} - Sección ${cleanLetter}`;

      // Resolver datos del usuario profesor asignado como tutor
      let resolvedTutorUserId: string | null = null;
      let resolvedTutorName: string | null = null;
      if (tutor_user_id && tutor_user_id.trim()) {
        const teacherRes = await query(
          `SELECT id, name FROM v2.users 
           WHERE id = $1 AND (tenant_id = $2 OR tenant_id IS NULL) AND role = 'MAESTRO' LIMIT 1`,
          [tutor_user_id.trim(), tenantId]
        );
        if (teacherRes.rows.length > 0) {
          resolvedTutorUserId = teacherRes.rows[0].id;
          resolvedTutorName = teacherRes.rows[0].name;
        }
      }

      if (id) {
        await query(
          `UPDATE v2.school_sections
           SET section_letter = $1, full_name = $2, shift = $3, capacity = $4, 
               tutor_user_id = $5, tutor_name = $6, classroom_location = $7, updated_at = NOW()
           WHERE id = $8 AND tenant_id = $9`,
          [cleanLetter, fullName, shift, Number(capacity || 30), resolvedTutorUserId, resolvedTutorName, classroom_location?.trim() || null, id, tenantId]
        );
        return NextResponse.json({ success: true, message: `¡${fullName} actualizada exitosamente!` });
      } else {
        // Verificar si ya existe esa sección en ese grado y año
        const exists = await query(
          `SELECT id FROM v2.school_sections WHERE tenant_id = $1 AND grade_id = $2 AND academic_year_id = $3 AND section_letter = $4`,
          [tenantId, grade_id, yearId, cleanLetter]
        );
        if (exists.rows.length > 0) {
          return NextResponse.json({ success: false, message: `Ya existe la Sección ${cleanLetter} en este grado.` }, { status: 400 });
        }

        const newSecId = `sec-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        await query(
          `INSERT INTO v2.school_sections
            (id, tenant_id, academic_year_id, grade_id, section_letter, full_name, shift, capacity, enrolled_count, tutor_user_id, tutor_name, classroom_location)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9, $10, $11)`,
          [newSecId, tenantId, yearId, grade_id, cleanLetter, fullName, shift, Number(capacity || 30), resolvedTutorUserId, resolvedTutorName, classroom_location?.trim() || null]
        );
        return NextResponse.json({ success: true, message: `¡${fullName} creada con éxito!`, id: newSecId });
      }
    }

    // 3.1 Eliminar Sección
    if (action === 'DELETE_SECTION') {
      const { section_id } = body;
      if (!section_id) return NextResponse.json({ success: false, message: 'ID de sección requerido' }, { status: 400 });

      const secRes = await query(
        `SELECT id, full_name, enrolled_count FROM v2.school_sections WHERE id = $1 AND tenant_id = $2`,
        [section_id, tenantId]
      );
      if (secRes.rows.length === 0) return NextResponse.json({ success: false, message: 'Sección no encontrada' }, { status: 404 });
      const sec = secRes.rows[0];

      if (Number(sec.enrolled_count || 0) > 0) {
        return NextResponse.json(
          { success: false, message: `No se puede eliminar ${sec.full_name} porque tiene ${sec.enrolled_count} alumno(s) matriculado(s).` },
          { status: 400 }
        );
      }

      await query(`DELETE FROM v2.school_sections WHERE id = $1 AND tenant_id = $2`, [section_id, tenantId]);
      return NextResponse.json({ success: true, message: `Aula "${sec.full_name}" eliminada exitosamente.` });
    }

    return NextResponse.json({ success: false, message: 'Acción no reconocida' }, { status: 400 });
  } catch (error: unknown) {
    console.error('[API /api/admin/academic-structure POST] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
