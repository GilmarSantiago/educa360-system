import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, hashPassword } from '@/lib/auth';
import { query } from '@/lib/db';

// =========================================================================
// GET: Listar colegios clientes con conteo de usuarios y director asignado
// =========================================================================
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('educa360_session')?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: 'No autenticado' }, { status: 401 });
    }

    const session = await verifyToken(token);
    if (!session || session.role !== 'SOPORTE') {
      return NextResponse.json(
        { success: false, message: 'Solo el rol Soporte (Dueño del SaaS) tiene acceso a colegios' },
        { status: 403 }
      );
    }

    const sql = `
      SELECT t.id, t.code, t.name, t.ruc, t.email, t.phone, t.address, t.logo,
             t.status, t.plan, t.monthly_fee, t.created_at, t.updated_at,
             COUNT(DISTINCT u.id) as total_users,
             (SELECT name FROM v2.users WHERE tenant_id = t.id AND role = 'ADMINISTRADOR' LIMIT 1) as admin_name,
             (SELECT username FROM v2.users WHERE tenant_id = t.id AND role = 'ADMINISTRADOR' LIMIT 1) as admin_username,
             (SELECT email FROM v2.users WHERE tenant_id = t.id AND role = 'ADMINISTRADOR' LIMIT 1) as admin_email
      FROM v2.tenants t
      LEFT JOIN v2.users u ON u.tenant_id = t.id
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `;

    const res = await query(sql);

    return NextResponse.json({
      success: true,
      tenants: res.rows,
      total: res.rows.length,
    });
  } catch (error: unknown) {
    console.error('[API /api/admin/tenants GET] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error al listar colegios';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

// =========================================================================
// POST: Registrar nuevo Colegio + Crear primer Administrador (Director)
// =========================================================================
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('educa360_session')?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: 'No autenticado' }, { status: 401 });
    }

    const session = await verifyToken(token);
    if (!session || session.role !== 'SOPORTE') {
      return NextResponse.json(
        { success: false, message: 'Solo el rol Soporte puede registrar nuevos colegios' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      name,
      code,
      plan = 'PRO',
      monthly_fee = 180,
      email,
      phone,
      address,
      ruc,
      // Datos del primer Administrador (Director)
      adminName,
      adminUsername,
      adminPassword,
      adminEmail,
      adminPhone,
      adminDocument,
    } = body;

    // Validaciones del Colegio
    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, message: 'El nombre del colegio es requerido' }, { status: 400 });
    }

    if (!code || !code.trim()) {
      return NextResponse.json({ success: false, message: 'El código/identificador del colegio es requerido' }, { status: 400 });
    }

    // Validaciones del Director
    if (!adminName || !adminName.trim()) {
      return NextResponse.json({ success: false, message: 'El nombre del Director/Dueño es requerido' }, { status: 400 });
    }

    if (!adminUsername || !adminUsername.trim()) {
      return NextResponse.json({ success: false, message: 'El usuario de acceso del Director es requerido' }, { status: 400 });
    }

    if (!adminPassword || adminPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: 'La contraseña inicial del Director debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    // Normalizar código
    const cleanCode = code.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const cleanAdminUsername = adminUsername.trim().toLowerCase().replace(/\s+/g, '');

    // 1. Verificar si el código del colegio ya existe
    const existingCode = await query(`SELECT id FROM v2.tenants WHERE LOWER(code) = $1 LIMIT 1`, [cleanCode]);
    if (existingCode.rows.length > 0) {
      return NextResponse.json(
        { success: false, message: `El identificador de colegio "${cleanCode}" ya está en uso.` },
        { status: 400 }
      );
    }

    // 2. Verificar si el username del director ya existe
    const existingUser = await query(`SELECT id FROM v2.users WHERE LOWER(username) = $1 LIMIT 1`, [cleanAdminUsername]);
    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { success: false, message: `El nombre de usuario "@${cleanAdminUsername}" ya existe. Elige otro.` },
        { status: 400 }
      );
    }

    const tenantId = `tnt-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const configId = `cfg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const adminId = `usr-dir-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // 3. Crear el Colegio (Tenant)
    await query(
      `INSERT INTO v2.tenants (
        id, code, name, ruc, email, phone, address, status, plan, monthly_fee, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE', $8, $9, NOW(), NOW())`,
      [
        tenantId,
        cleanCode,
        name.trim(),
        ruc ? ruc.trim() : null,
        email ? email.trim() : null,
        phone ? phone.trim() : null,
        address ? address.trim() : null,
        plan,
        Number(monthly_fee) || 0,
      ]
    );

    // 4. Crear la Configuración Inicial de Reglas del Colegio
    await query(
      `INSERT INTO v2.school_configs (
        id, tenant_id, grading_system, passing_grade, period_type, monthly_due_day,
        late_fee_daily_percentage, grace_days, allow_multiple_cash_sessions,
        require_token_for_differences, created_at
      ) VALUES ($1, $2, 'vigesimal', 11, 'bimestre', 5, 0.5, 3, true, true, NOW())`,
      [configId, tenantId]
    );

    // 5. Crear el Primer Usuario Administrador (Director)
    const passwordHash = await hashPassword(adminPassword);
    await query(
      `INSERT INTO v2.users (
        id, tenant_id, username, password, name, email, phone, document, role, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ADMINISTRADOR', true, NOW(), NOW())`,
      [
        adminId,
        tenantId,
        cleanAdminUsername,
        passwordHash,
        adminName.trim(),
        adminEmail ? adminEmail.trim() : email ? email.trim() : null,
        adminPhone ? adminPhone.trim() : null,
        adminDocument ? adminDocument.trim() : null,
      ]
    );

    // 6. Registrar en Auditoría
    await query(
      `INSERT INTO v2.audit_logs (id, tenant_id, user_id, action, details, ip_address)
       VALUES ($1, $2, $3, 'CREATE_TENANT_ONBOARDING', $4, $5)`,
      [
        `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        tenantId,
        session.userId,
        `Nuevo colegio registrado: "${name}" (${cleanCode}) con director @${cleanAdminUsername}`,
        req.headers.get('x-forwarded-for') || '127.0.0.1',
      ]
    );

    return NextResponse.json({
      success: true,
      message: `¡Colegio "${name}" y Director @${cleanAdminUsername} creados exitosamente!`,
      tenantId,
      adminId,
      code: cleanCode,
    });
  } catch (error: unknown) {
    console.error('[API /api/admin/tenants POST] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error al registrar el colegio';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

// =========================================================================
// PATCH: Modificar estado del colegio (Activar / Suspender) o Plan
// =========================================================================
export async function PATCH(req: NextRequest) {
  try {
    const token = req.cookies.get('educa360_session')?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: 'No autenticado' }, { status: 401 });
    }

    const session = await verifyToken(token);
    if (!session || session.role !== 'SOPORTE') {
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { tenantId, action } = body;

    if (!tenantId) {
      return NextResponse.json({ success: false, message: 'ID de colegio requerido' }, { status: 400 });
    }

    const tenantRes = await query(`SELECT id, name, status FROM v2.tenants WHERE id = $1 LIMIT 1`, [tenantId]);
    if (tenantRes.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Colegio no encontrado' }, { status: 404 });
    }

    const currentTenant = tenantRes.rows[0];

    if (action === 'toggle_status') {
      const newStatus = currentTenant.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      await query(`UPDATE v2.tenants SET status = $1, updated_at = NOW() WHERE id = $2`, [newStatus, tenantId]);

      await query(
        `INSERT INTO v2.audit_logs (id, tenant_id, user_id, action, details, ip_address)
         VALUES ($1, $2, $3, 'TOGGLE_TENANT_STATUS', $4, $5)`,
        [
          `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          tenantId,
          session.userId,
          `Estado del colegio "${currentTenant.name}" cambiado a ${newStatus}`,
          req.headers.get('x-forwarded-for') || '127.0.0.1',
        ]
      );

      return NextResponse.json({
        success: true,
        message: `El colegio "${currentTenant.name}" ahora está ${newStatus === 'ACTIVE' ? 'ACTIVO' : 'SUSPENDIDO'}.`,
        status: newStatus,
      });
    }

    return NextResponse.json({ success: false, message: 'Acción no soportada' }, { status: 400 });
  } catch (error: unknown) {
    console.error('[API /api/admin/tenants PATCH] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error al modificar colegio';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
