import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';
import { ensureDefaultCategories } from '@/lib/finances';

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
      return NextResponse.json(
        { success: false, message: 'No perteneces a ningún colegio para consultar finanzas' },
        { status: 400 }
      );
    }

    // Asegurar que existan las categorías base si es un colegio nuevo
    await ensureDefaultCategories(tenantId);

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'INCOME' | 'EXPENSE' | null

    let sql = `
      SELECT id, tenant_id, name, type, description, is_default, created_at
      FROM v2.financial_categories
      WHERE tenant_id = $1
    `;
    const params: any[] = [tenantId];

    if (type && (type === 'INCOME' || type === 'EXPENSE')) {
      sql += ` AND type = $2`;
      params.push(type);
    }

    sql += ` ORDER BY type DESC, name ASC`;

    const res = await query(sql, params);

    return NextResponse.json({
      success: true,
      categories: res.rows,
    });
  } catch (error: unknown) {
    console.error('[API /api/finances/categories GET] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error al obtener categorías';
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
      return NextResponse.json(
        { success: false, message: 'Solo el Administrador del colegio puede crear categorías' },
        { status: 403 }
      );
    }

    const tenantId = session.tenantId;
    if (!tenantId) {
      return NextResponse.json({ success: false, message: 'Colegio no identificado' }, { status: 400 });
    }

    const body = await req.json();
    const { name, type, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, message: 'El nombre de la categoría es requerido' }, { status: 400 });
    }

    if (type !== 'INCOME' && type !== 'EXPENSE') {
      return NextResponse.json({ success: false, message: 'Tipo inválido (debe ser Ingreso o Gasto)' }, { status: 400 });
    }

    // Comprobar si ya existe una categoría con el mismo nombre y tipo en este colegio
    const existing = await query(
      `SELECT id FROM v2.financial_categories WHERE tenant_id = $1 AND LOWER(name) = LOWER($2) AND type = $3 LIMIT 1`,
      [tenantId, name.trim(), type]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { success: false, message: `Ya existe una categoría llamada "${name.trim()}" para este tipo de movimiento.` },
        { status: 400 }
      );
    }

    const categoryId = `fcat-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    await query(
      `INSERT INTO v2.financial_categories (id, tenant_id, name, type, description, is_default, created_at)
       VALUES ($1, $2, $3, $4, $5, false, NOW())`,
      [categoryId, tenantId, name.trim(), type, description ? description.trim() : null]
    );

    await query(
      `INSERT INTO v2.audit_logs (id, tenant_id, user_id, action, details, ip_address)
       VALUES ($1, $2, $3, 'CREATE_FINANCIAL_CATEGORY', $4, $5)`,
      [
        `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        tenantId,
        session.userId,
        `Nueva categoría creada: "${name.trim()}" (${type === 'INCOME' ? 'Ingreso' : 'Gasto'})`,
        req.headers.get('x-forwarded-for') || '127.0.0.1',
      ]
    );

    return NextResponse.json({
      success: true,
      message: `¡Categoría "${name.trim()}" creada con éxito!`,
      category: {
        id: categoryId,
        tenant_id: tenantId,
        name: name.trim(),
        type,
        description: description ? description.trim() : null,
        is_default: false,
      },
    });
  } catch (error: unknown) {
    console.error('[API /api/finances/categories POST] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error al registrar categoría';
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
    if (!session || (session.role !== 'ADMINISTRADOR' && session.role !== 'SOPORTE')) {
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 403 });
    }

    const tenantId = session.tenantId;
    if (!tenantId) {
      return NextResponse.json({ success: false, message: 'Colegio no identificado' }, { status: 400 });
    }

    const body = await req.json();
    const { id, name, type, description } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID de categoría requerido' }, { status: 400 });
    }

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, message: 'El nombre de la categoría es requerido' }, { status: 400 });
    }

    if (type !== 'INCOME' && type !== 'EXPENSE') {
      return NextResponse.json({ success: false, message: 'Tipo inválido (debe ser Ingreso o Gasto)' }, { status: 400 });
    }

    // Comprobar que pertenezca al tenant
    const catRes = await query(
      `SELECT id, name FROM v2.financial_categories WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
      [id, tenantId]
    );

    if (catRes.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Categoría no encontrada' }, { status: 404 });
    }

    // Verificar si el nuevo nombre no colisiona con otra categoría del mismo tipo
    const dupRes = await query(
      `SELECT id FROM v2.financial_categories WHERE tenant_id = $1 AND LOWER(name) = LOWER($2) AND type = $3 AND id != $4 LIMIT 1`,
      [tenantId, name.trim(), type, id]
    );

    if (dupRes.rows.length > 0) {
      return NextResponse.json(
        { success: false, message: `Ya existe otra categoría llamada "${name.trim()}" para este tipo de movimiento.` },
        { status: 400 }
      );
    }

    await query(
      `UPDATE v2.financial_categories
       SET name = $1, type = $2, description = $3
       WHERE id = $4 AND tenant_id = $5`,
      [name.trim(), type, description ? description.trim() : null, id, tenantId]
    );

    await query(
      `INSERT INTO v2.audit_logs (id, tenant_id, user_id, action, details, ip_address)
       VALUES ($1, $2, $3, 'UPDATE_FINANCIAL_CATEGORY', $4, $5)`,
      [
        `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        tenantId,
        session.userId,
        `Categoría actualizada: "${name.trim()}" (${type === 'INCOME' ? 'Ingreso' : 'Gasto'})`,
        req.headers.get('x-forwarded-for') || '127.0.0.1',
      ]
    );

    return NextResponse.json({
      success: true,
      message: `Categoría "${name.trim()}" actualizada exitosamente.`,
    });
  } catch (error: unknown) {
    console.error('[API /api/finances/categories PUT] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error al actualizar categoría';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = req.cookies.get('educa360_session')?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: 'No autenticado' }, { status: 401 });
    }

    const session = await verifyToken(token);
    if (!session || (session.role !== 'ADMINISTRADOR' && session.role !== 'SOPORTE')) {
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 403 });
    }

    const tenantId = session.tenantId;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID de categoría requerido' }, { status: 400 });
    }

    // Verificar que la categoría pertenezca a este colegio
    const catRes = await query(
      `SELECT id, name, is_default FROM v2.financial_categories WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
      [id, tenantId]
    );

    if (catRes.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Categoría no encontrada' }, { status: 404 });
    }

    // Verificar si hay transacciones vinculadas
    const countRes = await query(
      `SELECT COUNT(*) as count FROM v2.financial_transactions WHERE category_id = $1`,
      [id]
    );

    if (Number(countRes.rows[0]?.count || 0) > 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'No puedes eliminar esta categoría porque tiene transacciones financieras asociadas.',
        },
        { status: 400 }
      );
    }

    await query(`DELETE FROM v2.financial_categories WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);

    return NextResponse.json({
      success: true,
      message: `Categoría eliminada correctamente.`,
    });
  } catch (error: unknown) {
    console.error('[API /api/finances/categories DELETE] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error al eliminar categoría';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
