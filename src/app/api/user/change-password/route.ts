import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, verifyPassword, hashPassword } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
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
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'Todos los campos de contraseña son requeridos' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: 'La nueva contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    // Obtener la contraseña actual hasheada de la base de datos
    const userRes = await query(`SELECT password FROM v2.users WHERE id = $1 LIMIT 1`, [session.userId]);
    if (userRes.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Usuario no encontrado' }, { status: 404 });
    }

    const isMatch = await verifyPassword(currentPassword, userRes.rows[0].password);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: 'La contraseña actual ingresada es incorrecta' },
        { status: 400 }
      );
    }

    // Hashear y actualizar nueva contraseña
    const newHash = await hashPassword(newPassword);
    await query(`UPDATE v2.users SET password = $1 WHERE id = $2`, [newHash, session.userId]);

    // Registrar en auditoría
    await query(
      `INSERT INTO v2.audit_logs (id, tenant_id, user_id, action, details, ip_address)
       VALUES ($1, $2, $3, 'CHANGE_PASSWORD', 'Cambio de contraseña exitoso por el usuario', $4)`,
      [
        `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        session.tenantId || null,
        session.userId,
        req.headers.get('x-forwarded-for') || '127.0.0.1',
      ]
    );

    return NextResponse.json({
      success: true,
      message: '¡Contraseña actualizada correctamente!',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error al cambiar contraseña';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
