import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('educa360_session')?.value;
    if (!token) return NextResponse.json({ success: false, message: 'No autenticado' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session || !session.tenantId) {
      return NextResponse.json({ success: false, message: 'Sesión inválida' }, { status: 401 });
    }

    const tenantId = session.tenantId;

    // Obtener los conceptos ordenados
    const res = await query(
      `SELECT id, tenant_id, code, name, description, category,
              CAST(default_amount AS DOUBLE PRECISION) as default_amount,
              rule_new, rule_regular, rule_transfer, rule_reentry,
              is_system_default, is_active, display_order, created_at, updated_at
       FROM v2.fee_concepts
       WHERE tenant_id = $1
       ORDER BY display_order ASC, created_at ASC`,
      [tenantId]
    );

    // Si por alguna razón el tenant no tiene conceptos creados, creamos los 3 por defecto
    if (res.rows.length === 0) {
      const defaultConcepts = [
        {
          id: `fee-${tenantId}-ingreso`,
          code: 'CUOTA_INGRESO',
          name: 'Cuota de Ingreso (Admisión)',
          description: 'Aporte económico único de incorporación para estudiantes nuevos o traslados.',
          category: 'ADMISSION',
          amount: 350.0,
          new: 'OBLIGATORIO',
          regular: 'EXONERADO',
          transfer: 'OBLIGATORIO',
          reentry: 'OPCIONAL',
          order: 1,
        },
        {
          id: `fee-${tenantId}-matricula`,
          code: 'MATRICULA',
          name: 'Matrícula Anual',
          description: 'Derecho de matrícula para confirmación oficial de vacante al inicio del año escolar.',
          category: 'ENROLLMENT',
          amount: 280.0,
          new: 'OBLIGATORIO',
          regular: 'OBLIGATORIO',
          transfer: 'OBLIGATORIO',
          reentry: 'OBLIGATORIO',
          order: 2,
        },
        {
          id: `fee-${tenantId}-pension`,
          code: 'PENSION',
          name: 'Pensión Escolar (Mensualidades)',
          description: 'Cuotas ordinarias mensuales de enseñanza (Marzo a Diciembre - 10 cuotas).',
          category: 'TUITION',
          amount: 320.0,
          new: 'OBLIGATORIO',
          regular: 'OBLIGATORIO',
          transfer: 'OBLIGATORIO',
          reentry: 'OBLIGATORIO',
          order: 3,
        },
      ];

      for (const dc of defaultConcepts) {
        await query(
          `INSERT INTO v2.fee_concepts (
            id, tenant_id, code, name, description, category, default_amount,
            rule_new, rule_regular, rule_transfer, rule_reentry, is_system_default, is_active, display_order
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, true, $12)
          ON CONFLICT (tenant_id, code) DO NOTHING`,
          [
            dc.id,
            tenantId,
            dc.code,
            dc.name,
            dc.description,
            dc.category,
            dc.amount,
            dc.new,
            dc.regular,
            dc.transfer,
            dc.reentry,
            dc.order,
          ]
        );
      }

      // Volver a consultar
      const refetched = await query(
        `SELECT id, tenant_id, code, name, description, category,
                CAST(default_amount AS DOUBLE PRECISION) as default_amount,
                rule_new, rule_regular, rule_transfer, rule_reentry,
                is_system_default, is_active, display_order, created_at, updated_at
         FROM v2.fee_concepts
         WHERE tenant_id = $1
         ORDER BY display_order ASC, created_at ASC`,
        [tenantId]
      );
      return NextResponse.json({ success: true, concepts: refetched.rows });
    }

    return NextResponse.json({ success: true, concepts: res.rows });
  } catch (err: any) {
    console.error('Error al obtener conceptos de pago:', err);
    return NextResponse.json({ success: false, message: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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

    const tenantId = session.tenantId;
    const body = await req.json();

    const {
      name,
      code,
      description,
      category = 'OTHER',
      default_amount = 0,
      rule_new = 'OBLIGATORIO',
      rule_regular = 'OPCIONAL',
      rule_transfer = 'OBLIGATORIO',
      rule_reentry = 'OPCIONAL',
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, message: 'El nombre del concepto es obligatorio' }, { status: 400 });
    }

    // Generar código único si no se envió
    const cleanCode = (code || name)
      .toUpperCase()
      .trim()
      .replace(/[^A-Z0-9]/g, '_')
      .replace(/__+/g, '_')
      .slice(0, 40);

    const conceptId = `fee-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const maxOrderRes = await query(
      `SELECT COALESCE(MAX(display_order), 3) + 1 as next_order FROM v2.fee_concepts WHERE tenant_id = $1`,
      [tenantId]
    );
    const nextOrder = Number(maxOrderRes.rows[0]?.next_order || 4);

    const insertRes = await query(
      `INSERT INTO v2.fee_concepts (
        id, tenant_id, code, name, description, category, default_amount,
        rule_new, rule_regular, rule_transfer, rule_reentry, is_system_default, is_active, display_order, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false, true, $12, NOW(), NOW()
      ) RETURNING id, tenant_id, code, name, description, category,
                  CAST(default_amount AS DOUBLE PRECISION) as default_amount,
                  rule_new, rule_regular, rule_transfer, rule_reentry,
                  is_system_default, is_active, display_order, created_at, updated_at`,
      [
        conceptId,
        tenantId,
        cleanCode,
        name.trim(),
        description?.trim() || null,
        category,
        Number(default_amount) || 0,
        rule_new,
        rule_regular,
        rule_transfer,
        rule_reentry,
        nextOrder,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Concepto de pago creado exitosamente',
      concept: insertRes.rows[0],
    });
  } catch (err: any) {
    if (err.code === '23505') {
      return NextResponse.json({ success: false, message: 'Ya existe un concepto de pago con ese código en el colegio' }, { status: 400 });
    }
    console.error('Error al crear concepto de pago:', err);
    return NextResponse.json({ success: false, message: 'Error al registrar concepto' }, { status: 500 });
  }
}
