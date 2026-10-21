import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.cookies.get('educa360_session')?.value;
    if (!token) return NextResponse.json({ success: false, message: 'No autenticado' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session || !session.tenantId) {
      return NextResponse.json({ success: false, message: 'Sesión inválida' }, { status: 401 });
    }

    if (!['ADMINISTRADOR', 'SOPORTE'].includes(session.role)) {
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;
    const tenantId = session.tenantId;
    const body = await req.json();

    const {
      name,
      description,
      category,
      default_amount,
      rule_new,
      rule_regular,
      rule_transfer,
      rule_reentry,
      is_active,
      display_order,
    } = body;

    const res = await query(
      `UPDATE v2.fee_concepts
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           category = COALESCE($3, category),
           default_amount = COALESCE($4, default_amount),
           rule_new = COALESCE($5, rule_new),
           rule_regular = COALESCE($6, rule_regular),
           rule_transfer = COALESCE($7, rule_transfer),
           rule_reentry = COALESCE($8, rule_reentry),
           is_active = COALESCE($9, is_active),
           display_order = COALESCE($10, display_order),
           updated_at = NOW()
       WHERE id = $11 AND tenant_id = $12
       RETURNING id, tenant_id, code, name, description, category,
                 CAST(default_amount AS DOUBLE PRECISION) as default_amount,
                 rule_new, rule_regular, rule_transfer, rule_reentry,
                 is_system_default, is_active, display_order, created_at, updated_at`,
      [
        name ? name.trim() : null,
        description !== undefined ? description : null,
        category || null,
        default_amount !== undefined ? Number(default_amount) : null,
        rule_new || null,
        rule_regular || null,
        rule_transfer || null,
        rule_reentry || null,
        is_active !== undefined ? is_active : null,
        display_order !== undefined ? display_order : null,
        id,
        tenantId,
      ]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Concepto no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Concepto actualizado correctamente',
      concept: res.rows[0],
    });
  } catch (err: any) {
    console.error('Error al actualizar concepto de pago:', err);
    return NextResponse.json({ success: false, message: 'Error interno al actualizar' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.cookies.get('educa360_session')?.value;
    if (!token) return NextResponse.json({ success: false, message: 'No autenticado' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session || !session.tenantId) {
      return NextResponse.json({ success: false, message: 'Sesión inválida' }, { status: 401 });
    }

    if (!['ADMINISTRADOR', 'SOPORTE'].includes(session.role)) {
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;
    const tenantId = session.tenantId;

    // Verificar si es un concepto del sistema
    const checkRes = await query(
      `SELECT is_system_default, code FROM v2.fee_concepts WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    if (checkRes.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Concepto no encontrado' }, { status: 404 });
    }

    if (checkRes.rows[0].is_system_default) {
      // Los conceptos del sistema no se borran físicamente, solo se desactivan si se desea
      await query(
        `UPDATE v2.fee_concepts SET is_active = false, updated_at = NOW() WHERE id = $1 AND tenant_id = $2`,
        [id, tenantId]
      );
      return NextResponse.json({
        success: true,
        message: 'El concepto del sistema fue desactivado en lugar de eliminado para preservar la consistencia escolar.',
      });
    }

    await query(`DELETE FROM v2.fee_concepts WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);

    return NextResponse.json({
      success: true,
      message: 'Concepto de pago eliminado exitosamente',
    });
  } catch (err: any) {
    console.error('Error al eliminar concepto de pago:', err);
    return NextResponse.json({ success: false, message: 'Error al eliminar concepto' }, { status: 500 });
  }
}
