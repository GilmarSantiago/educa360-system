import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyPassword, signToken, UserSessionPayload } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Usuario y contraseña son requeridos' },
        { status: 400 }
      );
    }

    // Buscar usuario en schema v2 con datos del Tenant
    const userRes = await query(
      `SELECT u.id, u.username, u.password, u.role, u.name, u.email, u.phone, u.avatar, u.is_active, u.tenant_id,
              t.code as tenant_code, t.name as tenant_name, t.status as tenant_status
       FROM v2.users u
       LEFT JOIN v2.tenants t ON u.tenant_id = t.id
       WHERE LOWER(u.username) = LOWER($1)
       LIMIT 1`,
      [username.trim()]
    );

    if (userRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    const user = userRes.rows[0];

    if (!user.is_active) {
      return NextResponse.json(
        { success: false, message: 'La cuenta se encuentra inactiva. Contacte al administrador.' },
        { status: 403 }
      );
    }

    if (user.tenant_status === 'SUSPENDED') {
      return NextResponse.json(
        { success: false, message: 'El acceso institucional para este colegio está temporalmente suspendido.' },
        { status: 403 }
      );
    }

    // Validar contraseña con bcrypt
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    // Generar token JWT con payload tipado
    const sessionPayload: UserSessionPayload = {
      userId: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      tenantId: user.tenant_id,
      tenantCode: user.tenant_code || null,
      tenantName: user.tenant_name || null,
    };

    const token = await signToken(sessionPayload);

    // Actualizar último login
    await query(`UPDATE v2.users SET last_login = CURRENT_TIMESTAMP WHERE id = $1`, [user.id]);

    // Registrar en auditoría
    await query(
      `INSERT INTO v2.audit_logs (id, tenant_id, user_id, action, details, ip_address)
       VALUES ($1, $2, $3, 'USER_LOGIN', $4, $5)`,
      [
        `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        user.tenant_id,
        user.id,
        `Inicio de sesión exitoso [Rol: ${user.role}]`,
        req.headers.get('x-forwarded-for') || '127.0.0.1',
      ]
    );

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        tenant: user.tenant_id
          ? {
              id: user.tenant_id,
              code: user.tenant_code,
              name: user.tenant_name,
            }
          : null,
      },
      message: 'Inicio de sesión exitoso',
    });

    // Guardar cookie HTTP-Only segura
    response.cookies.set('educa360_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 horas
    });

    return response;
  } catch (error: unknown) {
    console.error('[API /api/auth/login] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error interno al procesar login';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
