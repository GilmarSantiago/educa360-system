import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';
import { ensureDefaultPaymentMethods } from '@/lib/finances';

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

    const tenantId = session.tenantId;
    if (!tenantId) {
      return NextResponse.json({ success: false, message: 'Colegio no identificado' }, { status: 400 });
    }

    // Asegurar que el colegio tenga los medios de pago base
    await ensureDefaultPaymentMethods(tenantId);

    const res = await query(
      `SELECT id, tenant_id, name, code, account_info, is_active, is_default, created_at
       FROM v2.payment_methods
       WHERE tenant_id = $1 AND is_active = true
       ORDER BY is_default DESC, name ASC`,
      [tenantId]
    );

    return NextResponse.json({
      success: true,
      paymentMethods: res.rows,
    });
  } catch (error: unknown) {
    console.error('[API /api/finances/payment-methods GET] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error al obtener medios de pago';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('educa360_session')?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: 'No autenticado' }, { status: 401 });
    }

    const session = await verifyToken(token);
    if (!session || (session.role !== 'ADMINISTRADOR' && session.role !== 'SOPORTE')) {
      return NextResponse.json({ success: false, message: 'Permiso denegado' }, { status: 403 });
    }

    const tenantId = session.tenantId;
    if (!tenantId) {
      return NextResponse.json({ success: false, message: 'Colegio no identificado' }, { status: 400 });
    }

    const body = await req.json();
    const { name, code, account_info } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, message: 'El nombre del medio de pago es obligatorio' }, { status: 400 });
    }

    const cleanCode = (code || name)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, '_');

    const id = `pm-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    await query(
      `INSERT INTO v2.payment_methods (id, tenant_id, name, code, account_info, is_active, is_default, created_at)
       VALUES ($1, $2, $3, $4, $5, true, false, NOW())`,
      [id, tenantId, name.trim(), cleanCode, account_info ? account_info.trim() : null]
    );

    return NextResponse.json({
      success: true,
      message: `Medio de pago "${name.trim()}" registrado con éxito.`,
    });
  } catch (error: unknown) {
    console.error('[API /api/finances/payment-methods POST] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error al registrar medio de pago';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
