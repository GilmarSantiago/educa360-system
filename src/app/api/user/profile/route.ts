import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';

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

    const res = await query(
      `SELECT u.id, u.username, u.name, u.email, u.phone, u.document, u.address, u.avatar, u.role, u.is_active, u.created_at,
              t.id as tenant_id, t.code as tenant_code, t.name as tenant_name
       FROM v2.users u
       LEFT JOIN v2.tenants t ON u.tenant_id = t.id
       WHERE u.id = $1
       LIMIT 1`,
      [session.userId]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, profile: res.rows[0] });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error al obtener perfil';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = req.cookies.get('educa360_session')?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: 'No autenticado' }, { status: 401 });
    }

    const session = await verifyToken(token);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Sesión inválida' }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, phone, document, address, avatar } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'El nombre completo es requerido' },
        { status: 400 }
      );
    }

    // Actualizar datos del usuario en la base de datos
    const updateRes = await query(
      `UPDATE v2.users
       SET name = $1, email = $2, phone = $3, document = $4, address = $5, avatar = $6
       WHERE id = $7
       RETURNING id, username, name, email, phone, document, address, avatar, role, tenant_id`,
      [
        name.trim(),
        email ? email.trim() : null,
        phone ? phone.trim() : null,
        document ? document.trim() : null,
        address ? address.trim() : null,
        avatar ? avatar.trim() : null,
        session.userId,
      ]
    );

    // Registrar en auditoría
    await query(
      `INSERT INTO v2.audit_logs (id, tenant_id, user_id, action, details, ip_address)
       VALUES ($1, $2, $3, 'UPDATE_PROFILE', $4, $5)`,
      [
        `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        session.tenantId || null,
        session.userId,
        `Usuario actualizó sus datos de perfil (Nombre: ${name})`,
        req.headers.get('x-forwarded-for') || '127.0.0.1',
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Perfil actualizado correctamente',
      user: updateRes.rows[0],
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error al actualizar perfil';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
