import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';
import { formatDbDate } from '@/lib/finances';
import { validateExpenseFunding } from '@/lib/finances/fundingValidation';

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

    // 1. Obtener productos del colegio
    const prodRes = await query(
      `SELECT id, tenant_id, name, category, sku, unit_cost, selling_price,
              target_margin_percent, current_stock, total_purchased, total_sold, status, created_at
       FROM v2.school_products
       WHERE tenant_id = $1
       ORDER BY category ASC, name ASC`,
      [tenantId]
    );

    // 2. Para cada producto, traer lotes con sus pagos y ventas
    const productsWithDetails = await Promise.all(
      prodRes.rows.map(async (p: any) => {
        // Lotes de compra
        const batchesRes = await query(
          `SELECT id, product_id, supplier_name, quantity, total_investment, unit_cost, payment_plan_parts, status, created_at
           FROM v2.product_batches
           WHERE product_id = $1
           ORDER BY created_at DESC`,
          [p.id]
        );

        const batches = await Promise.all(
          batchesRes.rows.map(async (b: any) => {
            const paymentsRes = await query(
              `SELECT id, batch_id, part_number, amount,
                      TO_CHAR(due_date, 'YYYY-MM-DD') as due_date,
                      TO_CHAR(paid_date, 'YYYY-MM-DD') as paid_date,
                      payment_method, receipt_number, status, transaction_id
               FROM v2.product_batch_payments
               WHERE batch_id = $1
               ORDER BY part_number ASC`,
              [b.id]
            );

            const payments = paymentsRes.rows.map((pm: any) => ({
              id: pm.id,
              batch_id: pm.batch_id,
              part_number: Number(pm.part_number),
              amount: Number(pm.amount),
              due_date: formatDbDate(pm.due_date),
              paid_date: pm.paid_date ? formatDbDate(pm.paid_date) : null,
              payment_method: pm.payment_method,
              receipt_number: pm.receipt_number,
              status: pm.status,
              transaction_id: pm.transaction_id,
            }));

            const paidAmount = payments
              .filter((pm: any) => pm.status === 'PAID')
              .reduce((sum: number, pm: any) => sum + pm.amount, 0);

            const pendingAmount = Number(b.total_investment) - paidAmount;

            return {
              id: b.id,
              product_id: b.product_id,
              supplier_name: b.supplier_name,
              quantity: Number(b.quantity),
              total_investment: Number(b.total_investment),
              unit_cost: Number(b.unit_cost),
              payment_plan_parts: Number(b.payment_plan_parts),
              paidAmount,
              pendingAmount: Math.max(0, pendingAmount),
              payments,
              created_at: b.created_at,
            };
          })
        );

        // Ventas recientes
        const salesRes = await query(
          `SELECT id, product_id, quantity, unit_price, total_amount, unit_cost, net_profit,
                  student_name, buyer_name, payment_method, receipt_number,
                  TO_CHAR(sale_date, 'YYYY-MM-DD') as sale_date, created_at
           FROM v2.product_sales
           WHERE product_id = $1
           ORDER BY sale_date DESC, created_at DESC
           LIMIT 20`,
          [p.id]
        );

        const sales = salesRes.rows.map((s: any) => ({
          id: s.id,
          product_id: s.product_id,
          quantity: Number(s.quantity),
          unit_price: Number(s.unit_price),
          total_amount: Number(s.total_amount),
          unit_cost: Number(s.unit_cost),
          net_profit: Number(s.net_profit),
          student_name: s.student_name,
          buyer_name: s.buyer_name,
          payment_method: s.payment_method,
          receipt_number: s.receipt_number,
          sale_date: formatDbDate(s.sale_date),
          created_at: s.created_at,
        }));

        const totalRevenue = sales.reduce((sum: number, s: any) => sum + s.total_amount, 0);
        const totalProfitRealized = sales.reduce((sum: number, s: any) => sum + s.net_profit, 0);
        const potentialProfitRemaining =
          Number(p.current_stock) * (Number(p.selling_price) - Number(p.unit_cost));

        return {
          id: p.id,
          tenant_id: p.tenant_id,
          name: p.name,
          category: p.category,
          sku: p.sku,
          unit_cost: Number(p.unit_cost),
          selling_price: Number(p.selling_price),
          target_margin_percent: Number(p.target_margin_percent || 0),
          current_stock: Number(p.current_stock),
          total_purchased: Number(p.total_purchased),
          total_sold: Number(p.total_sold),
          status: p.status,
          created_at: p.created_at,
          batches,
          sales,
          totalRevenue,
          totalProfitRealized,
          potentialProfitRemaining: Math.max(0, potentialProfitRemaining),
        };
      })
    );

    // Métricas globales del catálogo de productos
    const totalProductsCount = productsWithDetails.length;
    const totalStockAvailable = productsWithDetails.reduce((sum, p) => sum + p.current_stock, 0);
    const totalInvestedGlobal = productsWithDetails.reduce(
      (sum, p) => sum + p.batches.reduce((bSum: number, b: any) => bSum + b.total_investment, 0),
      0
    );
    const totalRevenueGlobal = productsWithDetails.reduce((sum, p) => sum + p.totalRevenue, 0);
    const totalProfitRealizedGlobal = productsWithDetails.reduce(
      (sum, p) => sum + p.totalProfitRealized,
      0
    );
    const potentialProfitGlobal = productsWithDetails.reduce(
      (sum, p) => sum + p.potentialProfitRemaining,
      0
    );

    return NextResponse.json({
      success: true,
      products: productsWithDetails,
      metrics: {
        totalProductsCount,
        totalStockAvailable,
        totalInvestedGlobal,
        totalRevenueGlobal,
        totalProfitRealizedGlobal,
        potentialProfitGlobal,
      },
    });
  } catch (error: unknown) {
    console.error('[API /api/finances/products GET] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error al obtener productos escolares';
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
    if (!session || (session.role !== 'ADMINISTRADOR' && session.role !== 'SOPORTE' && session.role !== 'COLABORADOR')) {
      return NextResponse.json({ success: false, message: 'Permiso denegado' }, { status: 403 });
    }

    const tenantId = session.tenantId;
    if (!tenantId) {
      return NextResponse.json({ success: false, message: 'Colegio no identificado' }, { status: 400 });
    }

    const body = await req.json();
    const { action } = body;

    // =========================================================================
    // ACCIÓN 1: CREAR PRODUCTO CON LOTE DE INVERSIÓN (EN 1, 2 O 3 PARTES)
    // =========================================================================
    if (action === 'CREATE_PRODUCT_WITH_BATCH') {
      const {
        name,
        category = 'OTROS',
        sku,
        supplier_name,
        quantity,
        total_investment,
        selling_price,
        target_margin_percent,
        payment_plan_parts = 1,
        payment_schedule, // Array de { part_number, amount, due_date }
        pay_first_now = false,
        first_payment_date,
        first_payment_method = 'TRANSFERENCIA',
        first_payment_receipt,
        funding_source = 'PROPIO',
        funding_loan_id,
        funding_entity_name,
        funding_details,
      } = body;

      const normFundingSource = funding_source === 'SOCIO' ? 'APORTE_SOCIO' : (funding_source === 'PRESTAMO' ? 'PRESTAMO_BANCARIO' : funding_source);

      if (!name || !name.trim()) {
        return NextResponse.json({ success: false, message: 'El nombre del producto es obligatorio' }, { status: 400 });
      }

      const numQuantity = parseInt(quantity, 10);
      const numTotalInvestment = parseFloat(total_investment);
      const numSellingPrice = parseFloat(selling_price);

      if (isNaN(numQuantity) || numQuantity <= 0) {
        return NextResponse.json({ success: false, message: 'La cantidad debe ser un entero mayor a 0' }, { status: 400 });
      }

      if (isNaN(numTotalInvestment) || numTotalInvestment <= 0) {
        return NextResponse.json({ success: false, message: 'La inversión total debe ser mayor a 0' }, { status: 400 });
      }

      if (isNaN(numSellingPrice) || numSellingPrice <= 0) {
        return NextResponse.json({ success: false, message: 'El precio de venta debe ser mayor a 0' }, { status: 400 });
      }

      if (pay_first_now) {
        const partsCount = Math.max(1, Math.min(3, parseInt(payment_plan_parts, 10) || 1));
        const schedule = Array.isArray(payment_schedule) ? payment_schedule : [];
        const firstAmount = schedule[0]?.amount ? Number(schedule[0].amount) : Number((numTotalInvestment / partsCount).toFixed(2));

        const check = await validateExpenseFunding(
          tenantId,
          funding_source as any,
          firstAmount,
          funding_loan_id,
          funding_entity_name
        );
        if (!check.allowed) {
          return NextResponse.json({ success: false, message: check.message }, { status: 400 });
        }
      }

      const unitCost = Number((numTotalInvestment / numQuantity).toFixed(2));
      const productId = `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const batchId = `pbatch-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // 1. Insertar el Producto
      await query(
        `INSERT INTO v2.school_products 
          (id, tenant_id, name, category, sku, unit_cost, selling_price, target_margin_percent, current_stock, total_purchased, total_sold, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, 0, 'ACTIVE', NOW(), NOW())`,
        [
          productId,
          tenantId,
          name.trim(),
          category,
          sku ? sku.trim() : null,
          unitCost,
          numSellingPrice,
          parseFloat(target_margin_percent) || 0,
          numQuantity,
        ]
      );

      // 2. Insertar el Lote de Compra
      await query(
        `INSERT INTO v2.product_batches 
          (id, tenant_id, product_id, supplier_name, quantity, total_investment, unit_cost, payment_plan_parts, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE', NOW())`,
        [
          batchId,
          tenantId,
          productId,
          supplier_name ? supplier_name.trim() : null,
          numQuantity,
          numTotalInvestment,
          unitCost,
          parseInt(payment_plan_parts, 10) || 1,
        ]
      );

      // 3. Obtener o asignar categoría de gasto "Inversión en Mercadería"
      let catRes = await query(
        `SELECT id FROM v2.financial_categories WHERE tenant_id = $1 AND name ILIKE '%Mercadería%' AND type = 'EXPENSE' LIMIT 1`,
        [tenantId]
      );
      let expenseCatId = catRes.rows[0]?.id || null;

      // 4. Crear las cuotas/partes de la inversión
      const partsCount = Math.max(1, Math.min(3, parseInt(payment_plan_parts, 10) || 1));
      const schedule = Array.isArray(payment_schedule) && payment_schedule.length === partsCount
        ? payment_schedule
        : [];

      for (let i = 1; i <= partsCount; i++) {
        const paymentId = `pbp-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`;
        const partAmount = schedule[i - 1]?.amount
          ? parseFloat(schedule[i - 1].amount)
          : Number((numTotalInvestment / partsCount).toFixed(2));

        const dueDate = schedule[i - 1]?.due_date || new Date().toISOString().split('T')[0];

        // Si es la parte 1 y se marcó pay_first_now = true
        let isPaid = false;
        let paidDate = null;
        let txId = null;

        if (i === 1 && pay_first_now) {
          isPaid = true;
          paidDate = first_payment_date || new Date().toISOString().split('T')[0];
          txId = `tx-inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

          await query(
            `INSERT INTO v2.financial_transactions
              (id, tenant_id, category_id, type, amount, description, transaction_date, payment_method, receipt_number, registered_by, funding_source, funding_loan_id, funding_entity_name, funding_details, created_at)
             VALUES ($1, $2, $3, 'EXPENSE', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())`,
            [
              txId,
              tenantId,
              expenseCatId,
              partAmount,
              `Inversión: Compra de lote (${numQuantity}x ${name.trim()}) - Pago 1/${partsCount}`,
              paidDate,
              first_payment_method || 'TRANSFERENCIA',
              first_payment_receipt ? first_payment_receipt.trim() : null,
              session.userId,
              normFundingSource || 'PROPIO',
              funding_loan_id || null,
              funding_entity_name || null,
              funding_details || null,
            ]
          );
        }

        await query(
          `INSERT INTO v2.product_batch_payments
            (id, batch_id, part_number, amount, due_date, paid_date, payment_method, receipt_number, status, transaction_id, funding_source, funding_loan_id, funding_entity_name, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())`,
          [
            paymentId,
            batchId,
            i,
            partAmount,
            dueDate,
            paidDate,
            isPaid ? first_payment_method : null,
            isPaid && first_payment_receipt ? first_payment_receipt.trim() : null,
            isPaid ? 'PAID' : 'PENDING',
            txId,
            isPaid ? (funding_source || 'PROPIO') : null,
            isPaid ? (funding_loan_id || null) : null,
            isPaid ? (funding_entity_name || null) : null,
          ]
        );
      }

      await query(
        `INSERT INTO v2.audit_logs (id, tenant_id, user_id, action, details, ip_address)
         VALUES ($1, $2, $3, 'CREATE_PRODUCT_BATCH', $4, $5)`,
        [
          `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          tenantId,
          session.userId,
          `Registrado producto e inversión: "${name.trim()}" (Lote de ${numQuantity} unids. por S/ ${numTotalInvestment.toFixed(2)})`,
          req.headers.get('x-forwarded-for') || '127.0.0.1',
        ]
      );

      return NextResponse.json({
        success: true,
        message: `¡Producto "${name.trim()}" registrado con lote de ${numQuantity} unidades en stock!`,
        productId,
      });
    }

    // =========================================================================
    // ACCIÓN 2: PAGAR CUOTA/PARTE DE LA INVERSIÓN
    // =========================================================================
    if (action === 'PAY_BATCH_PART') {
      const {
        payment_id,
        paid_date,
        payment_method = 'TRANSFERENCIA',
        receipt_number,
        funding_source = 'PROPIO',
        funding_loan_id,
        funding_entity_name,
        funding_details,
      } = body;

      if (!payment_id) {
        return NextResponse.json({ success: false, message: 'ID de pago requerido' }, { status: 400 });
      }

      const pmtRes = await query(
        `SELECT p.id, p.batch_id, p.part_number, p.amount, p.status, b.product_id, prod.name as product_name, b.payment_plan_parts
         FROM v2.product_batch_payments p
         JOIN v2.product_batches b ON p.batch_id = b.id
         JOIN v2.school_products prod ON b.product_id = prod.id
         WHERE p.id = $1 AND b.tenant_id = $2 LIMIT 1`,
        [payment_id, tenantId]
      );

      if (pmtRes.rows.length === 0) {
        return NextResponse.json({ success: false, message: 'Cuota de inversión no encontrada' }, { status: 404 });
      }

      const pmt = pmtRes.rows[0];
      if (pmt.status === 'PAID') {
        return NextResponse.json({ success: false, message: 'Esta cuota ya se encuentra pagada' }, { status: 400 });
      }

      // Validar origen de fondos
      const check = await validateExpenseFunding(
        tenantId,
        funding_source as any,
        Number(pmt.amount),
        funding_loan_id,
        funding_entity_name
      );
      if (!check.allowed) {
        return NextResponse.json({ success: false, message: check.message }, { status: 400 });
      }

      const pDate = paid_date || new Date().toISOString().split('T')[0];
      const txId = `tx-inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Buscar categoría de gasto
      const catRes = await query(
        `SELECT id FROM v2.financial_categories WHERE tenant_id = $1 AND name ILIKE '%Mercadería%' AND type = 'EXPENSE' LIMIT 1`,
        [tenantId]
      );
      const catId = catRes.rows[0]?.id || null;

      // Crear transacción de egreso
      await query(
        `INSERT INTO v2.financial_transactions
          (id, tenant_id, category_id, type, amount, description, transaction_date, payment_method, receipt_number, registered_by, funding_source, funding_loan_id, funding_entity_name, funding_details, created_at)
         VALUES ($1, $2, $3, 'EXPENSE', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())`,
        [
          txId,
          tenantId,
          catId,
          Number(pmt.amount),
          `Pago de inversión: ${pmt.product_name} - Cuota ${pmt.part_number}/${pmt.payment_plan_parts}`,
          pDate,
          payment_method,
          receipt_number ? receipt_number.trim() : null,
          session.userId,
          funding_source || 'PROPIO',
          funding_loan_id || null,
          funding_entity_name || null,
          funding_details || null,
        ]
      );

      // Marcar cuota como pagada
      await query(
        `UPDATE v2.product_batch_payments
         SET status = 'PAID', paid_date = $1, payment_method = $2, receipt_number = $3, transaction_id = $4,
             funding_source = $5, funding_loan_id = $6, funding_entity_name = $7
         WHERE id = $8`,
        [pDate, payment_method, receipt_number ? receipt_number.trim() : null, txId, funding_source || 'PROPIO', funding_loan_id || null, funding_entity_name || null, payment_id]
      );

      return NextResponse.json({
        success: true,
        message: `Cuota ${pmt.part_number} de inversión pagada exitosamente. Se descontaron S/ ${Number(pmt.amount).toFixed(2)} de caja.`,
      });
    }

    // =========================================================================
    // ACCIÓN 3: VENTA Y DESPACHO DE PRODUCTO (SALIDA DE STOCK Y COBRO EN CAJA)
    // =========================================================================
    if (action === 'RECORD_SALE') {
      const {
        product_id,
        quantity = 1,
        unit_price,
        student_name,
        buyer_name,
        payment_method = 'EFECTIVO',
        receipt_number,
        sale_date,
      } = body;

      if (!product_id) {
        return NextResponse.json({ success: false, message: 'Producto requerido' }, { status: 400 });
      }

      const numQty = parseInt(quantity, 10);
      if (isNaN(numQty) || numQty <= 0) {
        return NextResponse.json({ success: false, message: 'Cantidad a vender inválida' }, { status: 400 });
      }

      const prodRes = await query(
        `SELECT id, name, unit_cost, selling_price, current_stock FROM v2.school_products WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
        [product_id, tenantId]
      );

      if (prodRes.rows.length === 0) {
        return NextResponse.json({ success: false, message: 'Producto no encontrado' }, { status: 404 });
      }

      const prod = prodRes.rows[0];
      const currentStock = Number(prod.current_stock);

      if (currentStock < numQty) {
        return NextResponse.json(
          {
            success: false,
            message: `Stock insuficiente. Disponibles en almacén: ${currentStock} unidades. Intentas vender: ${numQty}.`,
          },
          { status: 400 }
        );
      }

      const pricePerUnit = parseFloat(unit_price) || Number(prod.selling_price);
      const totalAmount = Number((pricePerUnit * numQty).toFixed(2));
      const unitCost = Number(prod.unit_cost);
      const totalCost = Number((unitCost * numQty).toFixed(2));
      const netProfit = Number((totalAmount - totalCost).toFixed(2));

      const sDate = sale_date || new Date().toISOString().split('T')[0];
      const saleId = `sale-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const txId = `tx-sale-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Buscar categoría de ingreso "Venta de Productos"
      const catRes = await query(
        `SELECT id FROM v2.financial_categories WHERE tenant_id = $1 AND name ILIKE '%Venta de Productos%' AND type = 'INCOME' LIMIT 1`,
        [tenantId]
      );
      const catId = catRes.rows[0]?.id || null;

      // 1. Crear transacción de INGRESO en el flujo de caja
      const txDesc = `Venta de ${numQty}x ${prod.name}${student_name ? ` (Alumno: ${student_name.trim()})` : ''}`;

      await query(
        `INSERT INTO v2.financial_transactions
          (id, tenant_id, category_id, type, amount, description, transaction_date, payment_method, receipt_number, registered_by, created_at)
         VALUES ($1, $2, $3, 'INCOME', $4, $5, $6, $7, $8, $9, NOW())`,
        [
          txId,
          tenantId,
          catId,
          totalAmount,
          txDesc,
          sDate,
          payment_method,
          receipt_number ? receipt_number.trim() : null,
          session.userId,
        ]
      );

      // 2. Insertar registro de venta
      await query(
        `INSERT INTO v2.product_sales
          (id, tenant_id, product_id, quantity, unit_price, total_amount, unit_cost, net_profit, student_name, buyer_name, payment_method, receipt_number, sale_date, transaction_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())`,
        [
          saleId,
          tenantId,
          product_id,
          numQty,
          pricePerUnit,
          totalAmount,
          unitCost,
          netProfit,
          student_name ? student_name.trim() : null,
          buyer_name ? buyer_name.trim() : null,
          payment_method,
          receipt_number ? receipt_number.trim() : null,
          sDate,
          txId,
        ]
      );

      // 3. Descontar Stock y sumar total_sold
      await query(
        `UPDATE v2.school_products
         SET current_stock = current_stock - $1, total_sold = total_sold + $1, updated_at = NOW()
         WHERE id = $2`,
        [numQty, product_id]
      );

      return NextResponse.json({
        success: true,
        message: `¡Venta registrada! Ingresaron S/ ${totalAmount.toFixed(2)} a caja. Quedan ${currentStock - numQty} en stock.`,
        saleId,
        netProfit,
      });
    }

    return NextResponse.json({ success: false, message: 'Acción no reconocida' }, { status: 400 });
  } catch (error: unknown) {
    console.error('[API /api/finances/products POST] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error al procesar operación de producto';
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
      return NextResponse.json({ success: false, message: 'ID de producto requerido' }, { status: 400 });
    }

    // Comprobar si hay ventas registradas
    const salesCheck = await query(
      `SELECT COUNT(*) as count FROM v2.product_sales WHERE product_id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    // Comprobar si hay pagos de inversión a proveedores ya realizados
    const batchPaidCheck = await query(
      `SELECT COUNT(*) as count 
       FROM v2.product_batch_payments bp
       JOIN v2.product_batches b ON bp.batch_id = b.id
       WHERE b.product_id = $1 AND b.tenant_id = $2 AND bp.status = 'PAID'`,
      [id, tenantId]
    );

    const hasSales = Number(salesCheck.rows[0]?.count || 0) > 0;
    const hasPaidBatches = Number(batchPaidCheck.rows[0]?.count || 0) > 0;

    if (hasSales || hasPaidBatches) {
      // Si tiene ventas o inversiones ya desembolsadas, archivar para preservar libro contable y flujo de caja
      await query(
        `UPDATE v2.school_products SET status = 'ARCHIVED', updated_at = NOW() WHERE id = $1 AND tenant_id = $2`,
        [id, tenantId]
      );
      return NextResponse.json({
        success: true,
        message: hasSales
          ? 'El producto cuenta con ventas previas registradas. Se ha archivado para preservar los balances contables.'
          : 'El producto cuenta con cuotas de inversión ya pagadas a proveedores. Se ha archivado para salvaguardar el balance de egresos.',
      });
    }

    // Si no tiene ventas, eliminar dependencias y producto
    await query(
      `DELETE FROM v2.product_batch_payments WHERE batch_id IN (SELECT id FROM v2.product_batches WHERE product_id = $1)`,
      [id]
    );
    await query(`DELETE FROM v2.product_batches WHERE product_id = $1 AND tenant_id = $2`, [id, tenantId]);
    await query(`DELETE FROM v2.school_products WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);

    await query(
      `INSERT INTO v2.audit_logs (id, tenant_id, user_id, action, details, ip_address)
       VALUES ($1, $2, $3, 'DELETE_PRODUCT', $4, $5)`,
      [
        `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        tenantId,
        session.userId,
        `Producto eliminado: ID ${id}`,
        req.headers.get('x-forwarded-for') || '127.0.0.1',
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Producto eliminado correctamente del catálogo.',
    });
  } catch (error: unknown) {
    console.error('[API /api/finances/products DELETE] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error al eliminar producto';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

