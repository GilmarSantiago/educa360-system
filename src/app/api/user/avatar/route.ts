import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
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

    const contentType = req.headers.get('content-type') || '';

    let avatarUrl: string | null = null;

    // Caso 1: Carga de archivo multipart/form-data (Subir foto propia guardándola directo en BD como Base64)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ success: false, message: 'No se envió ningún archivo de imagen' }, { status: 400 });
      }

      // Validar tipo de archivo
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { success: false, message: 'Formato no soportado. Usa JPG, PNG o WebP' },
          { status: 400 }
        );
      }

      // Validar tamaño máximo (2MB para optimizar rendimiento y almacenamiento en BD)
      if (file.size > 2 * 1024 * 1024) {
        return NextResponse.json(
          { success: false, message: 'La imagen excede el límite de 2MB para almacenamiento en base de datos' },
          { status: 400 }
        );
      }

      // Conversión a Base64 Data URI: Se almacena 100% en PostgreSQL v2.users sin tocar el disco del servidor
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString('base64');
      const mimeType = file.type || 'image/jpeg';
      avatarUrl = `data:${mimeType};base64,${base64}`;
    } else {
      // Caso 2: JSON con avatar predefinido o acción de eliminar
      const body = await req.json();
      if (body.action === 'remove') {
        avatarUrl = null;
      } else if (body.presetUrl) {
        avatarUrl = body.presetUrl;
      } else {
        return NextResponse.json({ success: false, message: 'Petición inválida' }, { status: 400 });
      }
    }

    // Actualizar avatar directamente en la columna avatar de la tabla v2.users en PostgreSQL
    await query(`UPDATE v2.users SET avatar = $1 WHERE id = $2`, [avatarUrl, session.userId]);

    // Resumen para logs de auditoría sin saturar con el Base64 completo
    const auditDetail = avatarUrl
      ? avatarUrl.startsWith('data:')
        ? 'Foto de perfil subida y almacenada en base de datos (Base64 directo)'
        : `Avatar seleccionado de colección (${avatarUrl})`
      : 'Foto de perfil eliminada (valores por defecto)';

    // Registrar en auditoría
    await query(
      `INSERT INTO v2.audit_logs (id, tenant_id, user_id, action, details, ip_address)
       VALUES ($1, $2, $3, 'UPDATE_AVATAR', $4, $5)`,
      [
        `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        session.tenantId || null,
        session.userId,
        auditDetail,
        req.headers.get('x-forwarded-for') || '127.0.0.1',
      ]
    );

    return NextResponse.json({
      success: true,
      message: avatarUrl ? '¡Foto de perfil guardada en la base de datos!' : 'Foto de perfil eliminada',
      avatarUrl,
    });
  } catch (error: unknown) {
    console.error('[API /api/user/avatar] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error al procesar la foto de perfil';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
