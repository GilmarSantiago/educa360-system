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

    let sql = `
      SELECT g.id, g.tenant_id, g.document_type, g.document_number, 
             g.first_name, g.last_name, g.relationship, g.phone, g.alt_phone, 
             g.email, g.address, g.occupation, g.billing_tax_id, g.billing_name, 
             g.created_at,
             COUNT(s.id) as students_count
      FROM v2.guardians g
      LEFT JOIN v2.students s ON s.guardian_id = g.id
      WHERE g.tenant_id = $1
    `;
    const values: any[] = [tenantId];

    if (search) {
      sql += ` AND (g.document_number ILIKE $2 OR g.first_name ILIKE $2 OR g.last_name ILIKE $2 OR g.phone ILIKE $2)`;
      values.push(`%${search}%`);
    }

    sql += ` GROUP BY g.id ORDER BY g.last_name ASC, g.first_name ASC`;

    const res = await query(sql, values);

    // Obtener los estudiantes vinculados a cada apoderado
    const guardiansWithStudents = await Promise.all(
      res.rows.map(async (guardian: any) => {
        const studentsRes = await query(
          `SELECT id, first_name, last_name, document_number, status
           FROM v2.students WHERE guardian_id = $1 AND tenant_id = $2`,
          [guardian.id, tenantId]
        );
        return {
          ...guardian,
          students_count: Number(guardian.students_count || 0),
          students: studentsRes.rows,
        };
      })
    );

    return NextResponse.json({
      success: true,
      guardians: guardiansWithStudents,
    });
  } catch (error: unknown) {
    console.error('[API /api/admin/guardians GET] Error:', error);
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
      document_type = 'DNI',
      document_number,
      first_name,
      last_name,
      relationship = 'PADRE',
      phone,
      alt_phone,
      email,
      address,
      occupation,
      billing_tax_id,
      billing_name,
    } = body;

    if (!document_number || !first_name || !last_name || !phone) {
      return NextResponse.json(
        { success: false, message: 'Documento, Nombres, Apellidos y Teléfono son requeridos' },
        { status: 400 }
      );
    }

    if (id) {
      await query(
        `UPDATE v2.guardians
         SET document_type = $1, document_number = $2, first_name = $3, last_name = $4,
             relationship = $5, phone = $6, alt_phone = $7, email = $8, address = $9,
             occupation = $10, billing_tax_id = $11, billing_name = $12, updated_at = NOW()
         WHERE id = $13 AND tenant_id = $14`,
        [
          document_type,
          document_number.trim(),
          first_name.trim(),
          last_name.trim(),
          relationship,
          phone.trim(),
          alt_phone?.trim() || null,
          email?.trim() || null,
          address?.trim() || null,
          occupation?.trim() || null,
          billing_tax_id?.trim() || null,
          billing_name?.trim() || null,
          id,
          tenantId,
        ]
      );

      // Sincronizar datos con su usuario si ya existe
      await query(
        `UPDATE v2.users 
         SET name = $1, phone = $2, email = $3, address = $4, updated_at = NOW()
         WHERE tenant_id = $5 AND document = $6`,
        [
          `${first_name.trim()} ${last_name.trim()}`,
          phone.trim(),
          email?.trim() || null,
          address?.trim() || null,
          tenantId,
          document_number.trim(),
        ]
      );

      return NextResponse.json({ success: true, message: 'Datos del apoderado actualizados con éxito.' });
    } else {
      // Verificar si ya existe con ese documento
      const exists = await query(
        `SELECT id FROM v2.guardians WHERE tenant_id = $1 AND document_number = $2 LIMIT 1`,
        [tenantId, document_number.trim()]
      );
      if (exists.rows.length > 0) {
        return NextResponse.json(
          { success: false, message: `Ya existe un apoderado registrado con el documento ${document_number.trim()}` },
          { status: 400 }
        );
      }

      const newId = `grd-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      await query(
        `INSERT INTO v2.guardians
          (id, tenant_id, document_type, document_number, first_name, last_name, relationship, phone, alt_phone, email, address, occupation, billing_tax_id, billing_name, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())`,
        [
          newId,
          tenantId,
          document_type,
          document_number.trim(),
          first_name.trim(),
          last_name.trim(),
          relationship,
          phone.trim(),
          alt_phone?.trim() || null,
          email?.trim() || null,
          address?.trim() || null,
          occupation?.trim() || null,
          billing_tax_id?.trim() || null,
          billing_name?.trim() || null,
        ]
      );

      // CREAR AUTOMÁTICAMENTE EL USUARIO PARA EL APODERADO
      const docClean = document_number.trim();
      let createdUsername = docClean;
      const userExists = await query(
        `SELECT id, username FROM v2.users WHERE tenant_id = $1 AND (document = $2 OR username = $2) LIMIT 1`,
        [tenantId, docClean]
      );

      let isNewUser = false;
      if (userExists.rows.length === 0) {
        // Validar si username ya existe globalmente
        const userGlobalCheck = await query(`SELECT id FROM v2.users WHERE LOWER(username) = $1 LIMIT 1`, [createdUsername.toLowerCase()]);
        if (userGlobalCheck.rows.length > 0) {
          createdUsername = `apo_${docClean}`;
        }

        const tempPassword = docClean.length >= 6 ? docClean : `${docClean}123`;
        const passwordHash = await hashPassword(tempPassword);
        const newUserId = `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        await query(
          `INSERT INTO v2.users (
            id, tenant_id, username, password, name, email, phone, document, address, role, is_active, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'APODERADO', true, NOW(), NOW())`,
          [
            newUserId,
            tenantId,
            createdUsername,
            passwordHash,
            `${first_name.trim()} ${last_name.trim()}`,
            email?.trim() || null,
            phone.trim(),
            docClean,
            address?.trim() || null,
          ]
        );

        isNewUser = true;

        await query(
          `INSERT INTO v2.audit_logs (id, tenant_id, user_id, action, details, ip_address)
           VALUES ($1, $2, $3, 'CREATE_USER_GUARDIAN', $4, $5)`,
          [
            `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            tenantId,
            session.userId,
            `Cuenta de Apoderado creada: @${createdUsername} (${first_name} ${last_name})`,
            req.headers.get('x-forwarded-for') || '127.0.0.1',
          ]
        );
      } else {
        createdUsername = userExists.rows[0].username;
      }

      return NextResponse.json({
        success: true,
        message: `¡Apoderado registrado con éxito! Usuario de acceso: @${createdUsername} (Contraseña: ${docClean}).`,
        id: newId,
        userAccount: {
          username: createdUsername,
          tempPassword: docClean,
          isNewUser,
        },
      });
    }
  } catch (error: unknown) {
    console.error('[API /api/admin/guardians POST] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
