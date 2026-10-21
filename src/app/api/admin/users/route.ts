import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, hashPassword } from '@/lib/auth';
import { query } from '@/lib/db';
import { UserRole } from '@/types';

// =========================================================================
// GET: Listar usuarios con filtros y búsqueda (Multi-Tenant protegido)
// =========================================================================
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('educa360_session')?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: 'No autenticado' }, { status: 401 });
    }

    const session = await verifyToken(token);
    if (!session || (session.role !== 'ADMINISTRADOR' && session.role !== 'SOPORTE')) {
      return NextResponse.json(
        { success: false, message: 'No tienes permisos para ver el listado de usuarios' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const role = searchParams.get('role')?.trim() || '';

    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Si es Administrador, aislar estrictamente a los usuarios de su propio colegio (tenant)
    if (session.role === 'ADMINISTRADOR') {
      if (!session.tenantId) {
        return NextResponse.json({ success: false, message: 'Colegio no identificado' }, { status: 400 });
      }
      conditions.push(`u.tenant_id = $${paramIndex++}`);
      values.push(session.tenantId);
    }

    // Filtro por Rol
    if (role && role !== 'ALL') {
      conditions.push(`u.role = $${paramIndex++}`);
      values.push(role);
    }

    // Búsqueda por texto (Nombre, Usuario, DNI, Email)
    if (search) {
      conditions.push(
        `(u.name ILIKE $${paramIndex} OR u.username ILIKE $${paramIndex} OR u.document ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`
      );
      values.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT u.id, u.username, u.name, u.email, u.phone, u.document, u.address, u.avatar,
             u.role, u.is_active, u.created_at, u.tenant_id,
             t.name as tenant_name
      FROM v2.users u
      LEFT JOIN v2.tenants t ON u.tenant_id = t.id
      ${whereClause}
      ORDER BY u.created_at DESC
    `;

    const res = await query(sql, values);

    // Conteo global de usuarios por rol para este colegio (independiente de los filtros aplicados)
    let countsSql = `
      SELECT 
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE role = 'MAESTRO')::int as maestros,
        COUNT(*) FILTER (WHERE role = 'COLABORADOR')::int as colaboradores,
        COUNT(*) FILTER (WHERE role = 'APODERADO')::int as apoderados,
        COUNT(*) FILTER (WHERE role = 'ADMINISTRADOR')::int as administradores
      FROM v2.users u
    `;
    const countValues: any[] = [];
    if (session.role === 'ADMINISTRADOR') {
      countsSql += ` WHERE u.tenant_id = $1`;
      countValues.push(session.tenantId);
    }
    const countsRes = await query(countsSql, countValues);
    const countsRow = countsRes.rows[0];

    const roleCounters = {
      ALL: Number(countsRow?.total || 0),
      MAESTRO: Number(countsRow?.maestros || 0),
      COLABORADOR: Number(countsRow?.colaboradores || 0),
      APODERADO: Number(countsRow?.apoderados || 0),
      ADMINISTRADOR: Number(countsRow?.administradores || 0),
    };

    return NextResponse.json({
      success: true,
      users: res.rows,
      total: res.rows.length,
      roleCounters,
    });
  } catch (error: unknown) {
    console.error('[API /api/admin/users GET] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error al listar usuarios';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

// =========================================================================
// POST: Crear nuevo usuario
// =========================================================================
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('educa360_session')?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: 'No autenticado' }, { status: 401 });
    }

    const session = await verifyToken(token);
    if (!session || (session.role !== 'ADMINISTRADOR' && session.role !== 'SOPORTE')) {
      return NextResponse.json({ success: false, message: 'Acceso no autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { username, name, password, role, email, phone, document, address } = body;

    if (!username || !name || !password || !role) {
      return NextResponse.json(
        { success: false, message: 'Completa los campos obligatorios: usuario, nombre, contraseña y rol' },
        { status: 400 }
      );
    }

    // Validar longitud de contraseña
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'La contraseña provisional debe tener mínimo 6 caracteres' },
        { status: 400 }
      );
    }

    // Validar asignación de rol según jerarquía
    const validRoles: UserRole[] = ['ADMINISTRADOR', 'COLABORADOR', 'MAESTRO', 'APODERADO'];
    if (session.role === 'SOPORTE') {
      validRoles.push('SOPORTE');
    }

    if (!validRoles.includes(role)) {
      return NextResponse.json({ success: false, message: 'Rol inválido o no permitido' }, { status: 400 });
    }

    // Limpiar nombre de usuario (sin espacios, minúsculas)
    const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '');

    // Verificar si el username ya está ocupado en el sistema
    const existing = await query(`SELECT id FROM v2.users WHERE LOWER(username) = $1 LIMIT 1`, [cleanUsername]);
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { success: false, message: `El usuario "@${cleanUsername}" ya existe. Elige otro nombre de usuario.` },
        { status: 400 }
      );
    }

    // Determinar Tenant
    let targetTenantId: string | null = session.tenantId || null;
    if (session.role === 'SOPORTE' && body.tenantId) {
      targetTenantId = body.tenantId;
    }

    // Encriptar contraseña segura con bcrypt
    const passwordHash = await hashPassword(password);
    const userId = `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    await query(
      `INSERT INTO v2.users (
        id, tenant_id, username, password, name, email, phone, document, address, role, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, NOW(), NOW())`,
      [
        userId,
        targetTenantId,
        cleanUsername,
        passwordHash,
        name.trim(),
        email ? email.trim() : null,
        phone ? phone.trim() : null,
        document ? document.trim() : null,
        address ? address.trim() : null,
        role,
      ]
    );

    // Auditoría
    await query(
      `INSERT INTO v2.audit_logs (id, tenant_id, user_id, action, details, ip_address)
       VALUES ($1, $2, $3, 'CREATE_USER', $4, $5)`,
      [
        `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        targetTenantId,
        session.userId,
        `Usuario creado: @${cleanUsername} (${name}) con rol ${role}`,
        req.headers.get('x-forwarded-for') || '127.0.0.1',
      ]
    );

    return NextResponse.json({
      success: true,
      message: `¡Usuario @${cleanUsername} creado exitosamente!`,
      userId,
    });
  } catch (error: unknown) {
    console.error('[API /api/admin/users POST] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error al registrar usuario';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

// =========================================================================
// PUT: Editar datos de un usuario existente
// =========================================================================
export async function PUT(req: NextRequest) {
  try {
    const token = req.cookies.get('educa360_session')?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: 'No autenticado' }, { status: 401 });
    }

    const session = await verifyToken(token);
    if (!session || (session.role !== 'ADMINISTRADOR' && session.role !== 'SOPORTE')) {
      return NextResponse.json({ success: false, message: 'Acceso no autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { id, name, email, phone, document, address, role, is_active } = body;

    if (!id || !name || !role) {
      return NextResponse.json({ success: false, message: 'Faltan campos obligatorios' }, { status: 400 });
    }

    // Obtener el usuario objetivo para verificar tenant y jerarquía
    const target = await query(`SELECT id, username, tenant_id, role, is_active FROM v2.users WHERE id = $1 LIMIT 1`, [
      id,
    ]);
    if (target.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Usuario no encontrado' }, { status: 404 });
    }

    const targetUser = target.rows[0];

    // Restricción Multi-Tenant: El Administrador solo puede modificar usuarios de su colegio
    if (session.role === 'ADMINISTRADOR') {
      if (targetUser.tenant_id !== session.tenantId) {
        return NextResponse.json(
          { success: false, message: 'No tienes permiso para modificar usuarios de otra institución' },
          { status: 403 }
        );
      }
      if (role === 'SOPORTE') {
        return NextResponse.json({ success: false, message: 'No puedes promover usuarios a rol Soporte' }, { status: 403 });
      }
    }

    // Regla de seguridad: Un usuario no puede desactivar su propia cuenta ni quitarse su rol de administrador
    if (session.userId === id) {
      if (is_active === false) {
        return NextResponse.json(
          { success: false, message: 'Por seguridad no puedes desactivar tu propia cuenta activa' },
          { status: 400 }
        );
      }
      if (role !== session.role) {
        return NextResponse.json(
          { success: false, message: 'No puedes cambiar tu propio rol en esta ventana' },
          { status: 400 }
        );
      }
    }

    await query(
      `UPDATE v2.users
       SET name = $1, email = $2, phone = $3, document = $4, address = $5, role = $6, is_active = $7, updated_at = NOW()
       WHERE id = $8`,
      [
        name.trim(),
        email ? email.trim() : null,
        phone ? phone.trim() : null,
        document ? document.trim() : null,
        address ? address.trim() : null,
        role,
        is_active !== undefined ? is_active : targetUser.is_active,
        id,
      ]
    );

    // Auditoría
    await query(
      `INSERT INTO v2.audit_logs (id, tenant_id, user_id, action, details, ip_address)
       VALUES ($1, $2, $3, 'UPDATE_USER', $4, $5)`,
      [
        `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        targetUser.tenant_id,
        session.userId,
        `Usuario actualizado: @${targetUser.username} (${name}) - Rol: ${role}, Activo: ${is_active}`,
        req.headers.get('x-forwarded-for') || '127.0.0.1',
      ]
    );

    return NextResponse.json({
      success: true,
      message: `¡Usuario @${targetUser.username} actualizado con éxito!`,
    });
  } catch (error: unknown) {
    console.error('[API /api/admin/users PUT] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error al actualizar usuario';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

// =========================================================================
// PATCH: Acciones rápidas (Restablecer Contraseña / Cambiar Estado Activo)
// =========================================================================
export async function PATCH(req: NextRequest) {
  try {
    const token = req.cookies.get('educa360_session')?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: 'No autenticado' }, { status: 401 });
    }

    const session = await verifyToken(token);
    if (!session || (session.role !== 'ADMINISTRADOR' && session.role !== 'SOPORTE')) {
      return NextResponse.json({ success: false, message: 'Acceso no autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { action, userId } = body;

    if (!userId || !action) {
      return NextResponse.json({ success: false, message: 'Faltan parámetros requeridos' }, { status: 400 });
    }

    const target = await query(`SELECT id, username, tenant_id, is_active FROM v2.users WHERE id = $1 LIMIT 1`, [
      userId,
    ]);
    if (target.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Usuario no encontrado' }, { status: 404 });
    }

    const targetUser = target.rows[0];

    // Comprobar tenant
    if (session.role === 'ADMINISTRADOR' && targetUser.tenant_id !== session.tenantId) {
      return NextResponse.json({ success: false, message: 'No autorizado para este colegio' }, { status: 403 });
    }

    // Acción 1: Restablecer Contraseña
    if (action === 'reset_password') {
      const { newPassword } = body;
      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json(
          { success: false, message: 'La nueva contraseña debe tener al menos 6 caracteres' },
          { status: 400 }
        );
      }

      const passwordHash = await hashPassword(newPassword);
      await query(`UPDATE v2.users SET password = $1, updated_at = NOW() WHERE id = $2`, [
        passwordHash,
        userId,
      ]);

      await query(
        `INSERT INTO v2.audit_logs (id, tenant_id, user_id, action, details, ip_address)
         VALUES ($1, $2, $3, 'RESET_PASSWORD', $4, $5)`,
        [
          `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          targetUser.tenant_id,
          session.userId,
          `Contraseña restablecida para el usuario @${targetUser.username}`,
          req.headers.get('x-forwarded-for') || '127.0.0.1',
        ]
      );

      return NextResponse.json({
        success: true,
        message: `¡Contraseña de @${targetUser.username} restablecida con éxito!`,
      });
    }

    // Acción 2: Alternar Estado (Activar / Desactivar)
    if (action === 'toggle_status') {
      if (session.userId === userId) {
        return NextResponse.json(
          { success: false, message: 'No puedes desactivar tu propia cuenta activa' },
          { status: 400 }
        );
      }

      const newStatus = !targetUser.is_active;
      await query(`UPDATE v2.users SET is_active = $1, updated_at = NOW() WHERE id = $2`, [newStatus, userId]);

      await query(
        `INSERT INTO v2.audit_logs (id, tenant_id, user_id, action, details, ip_address)
         VALUES ($1, $2, $3, 'TOGGLE_USER_STATUS', $4, $5)`,
        [
          `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          targetUser.tenant_id,
          session.userId,
          `Estado de @${targetUser.username} cambiado a ${newStatus ? 'ACTIVO' : 'INACTIVO'}`,
          req.headers.get('x-forwarded-for') || '127.0.0.1',
        ]
      );

      return NextResponse.json({
        success: true,
        message: `El usuario @${targetUser.username} ha sido ${newStatus ? 'activado' : 'desactivado'}.`,
        is_active: newStatus,
      });
    }

    return NextResponse.json({ success: false, message: 'Acción no reconocida' }, { status: 400 });
  } catch (error: unknown) {
    console.error('[API /api/admin/users PATCH] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error al procesar acción';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
