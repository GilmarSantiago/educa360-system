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

    const tenantId = session.tenantId;
    if (!tenantId) {
      return NextResponse.json({ success: false, message: 'Colegio no identificado' }, { status: 400 });
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const target30d = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const target30dStr = target30d.toISOString().split('T')[0];

    // 1. Saldo Actual en Caja / Bancos (Net Cash to date)
    const cashRes = await query(
      `SELECT COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE -amount END), 0) as net_cash
       FROM v2.financial_transactions
       WHERE tenant_id = $1`,
      [tenantId]
    );
    const currentCash = parseFloat(cashRes.rows[0]?.net_cash || '0');

    // 2. Egresos Comprometidos: Cuotas de Proveedores / Lotes de Mercadería (vencimiento próximo o vencidas)
    const supplierRes = await query(
      `SELECT 
        bp.id,
        p.name as product_name,
        bp.part_number,
        b.payment_plan_parts,
        bp.amount,
        TO_CHAR(bp.due_date, 'YYYY-MM-DD') as due_date,
        bp.status,
        b.supplier_name
       FROM v2.product_batch_payments bp
       JOIN v2.product_batches b ON bp.batch_id = b.id
       JOIN v2.school_products p ON b.product_id = p.id
       WHERE p.tenant_id = $1
         AND bp.status = 'PENDING'
         AND bp.due_date <= (CURRENT_DATE + INTERVAL '30 days')
       ORDER BY bp.due_date ASC`,
      [tenantId]
    );
    const supplierCommitments = supplierRes.rows.map((r: any) => ({
      id: r.id,
      title: `Pago Proveedor: ${r.product_name} (Cuota ${r.part_number}/${r.payment_plan_parts})`,
      category: 'PROVEEDOR',
      amount: parseFloat(r.amount),
      dueDate: r.due_date,
      supplierName: r.supplier_name || 'Proveedor general',
      status: r.status,
    }));
    const totalSupplierCommitments = supplierCommitments.reduce((acc: number, c: any) => acc + c.amount, 0);

    // 3. Egresos Comprometidos: Cuotas de Préstamos Bancarios (próximos 30 días o vencidas pendientes)
    const loanRes = await query(
      `SELECT 
        i.id,
        l.loan_title,
        l.bank_name,
        i.installment_number,
        l.total_installments,
        i.amount,
        TO_CHAR(i.due_date, 'YYYY-MM-DD') as due_date,
        i.status
       FROM v2.bank_loan_installments i
       JOIN v2.bank_loans l ON i.loan_id = l.id
       WHERE l.tenant_id = $1
         AND i.status = 'PENDING'
         AND i.due_date <= (CURRENT_DATE + INTERVAL '30 days')
       ORDER BY i.due_date ASC`,
      [tenantId]
    );
    const loanCommitments = loanRes.rows.map((r: any) => ({
      id: r.id,
      title: `Cuota ${r.installment_number}/${r.total_installments} - ${r.bank_name || 'Banco'} (${r.loan_title})`,
      category: 'PRESTAMO_BANCARIO',
      amount: parseFloat(r.amount),
      dueDate: r.due_date,
      bankName: r.bank_name,
      status: r.status,
    }));
    const totalLoanCommitments = loanCommitments.reduce((acc: number, c: any) => acc + c.amount, 0);

    // Si no hay cuotas de préstamos en 30 días, verificar cuál es la próxima para aviso informativo
    let nextUpcomingLoanInstallment = null;
    if (loanCommitments.length === 0) {
      const nextLoanRes = await query(
        `SELECT 
          i.id,
          l.loan_title,
          l.bank_name,
          i.installment_number,
          l.total_installments,
          i.amount,
          TO_CHAR(i.due_date, 'YYYY-MM-DD') as due_date
         FROM v2.bank_loan_installments i
         JOIN v2.bank_loans l ON i.loan_id = l.id
         WHERE l.tenant_id = $1 AND i.status = 'PENDING'
         ORDER BY i.due_date ASC
         LIMIT 1`,
        [tenantId]
      );
      if (nextLoanRes.rows.length > 0) {
        const nr = nextLoanRes.rows[0];
        nextUpcomingLoanInstallment = {
          title: `Cuota ${nr.installment_number}/${nr.total_installments} - ${nr.bank_name || 'Banco'} (${nr.loan_title})`,
          amount: parseFloat(nr.amount),
          dueDate: nr.due_date,
        };
      }
    }

    // 4. Egresos Comprometidos: Servicios Fijos y Recurrentes (Luz, Agua, Internet, etc.)
    const recRes = await query(
      `SELECT id, name, default_amount, due_day, is_variable_amount, supplier_name
       FROM v2.recurring_expenses
       WHERE tenant_id = $1 AND status = 'ACTIVE'
       ORDER BY due_day ASC`,
      [tenantId]
    );

    const recurringCommitments = recRes.rows.map((r: any) => {
      const dueDay = parseInt(r.due_day || '1', 10);
      const amount = parseFloat(r.default_amount || '0');
      
      // Calcular la fecha exacta del próximo vencimiento en los siguientes 30 días
      let dueYear = today.getFullYear();
      let dueMonth = today.getMonth() + 1; // 1-12
      if (today.getDate() > dueDay) {
        // Ya pasó en este mes, el próximo es el mes entrante
        dueMonth += 1;
        if (dueMonth > 12) {
          dueMonth = 1;
          dueYear += 1;
        }
      }
      const daysInMonth = new Date(dueYear, dueMonth, 0).getDate();
      const actualDay = Math.min(dueDay, daysInMonth);
      const dueDateStr = `${dueYear}-${String(dueMonth).padStart(2, '0')}-${String(actualDay).padStart(2, '0')}`;

      return {
        id: r.id,
        title: `Servicio Fijo: ${r.name}`,
        category: 'SERVICIO_FIJO',
        amount: amount,
        isVariable: r.is_variable_amount || amount === 0,
        dueDate: dueDateStr,
        supplierName: r.supplier_name || 'Servicio mensual',
        status: 'PENDING',
      };
    });
    const totalRecurringCommitments = recurringCommitments.reduce((acc: number, c: any) => acc + c.amount, 0);

    // Total Egresos Comprometidos en los próximos 30 días
    const totalCommittedExpenses = totalSupplierCommitments + totalLoanCommitments + totalRecurringCommitments;

    // 5. Ingresos Proyectados: Pensiones Escolares
    const tuitRes = await query(
      `SELECT 
        COUNT(*) as total_students,
        COALESCE(SUM(monthly_amount), 0) as total_tuition_potential,
        COALESCE(SUM(CASE WHEN status = 'PAID' THEN monthly_amount ELSE 0 END), 0) as tuition_collected,
        COALESCE(SUM(CASE WHEN status = 'PENDING' THEN monthly_amount ELSE 0 END), 0) as tuition_pending
       FROM v2.student_tuitions
       WHERE tenant_id = $1`,
      [tenantId]
    );
    const totalStudents = parseInt(tuitRes.rows[0]?.total_students || '0', 10);
    const totalTuitionPotential = parseFloat(tuitRes.rows[0]?.total_tuition_potential || '0');
    const tuitionCollected = parseFloat(tuitRes.rows[0]?.tuition_collected || '0');
    const tuitionPending = parseFloat(tuitRes.rows[0]?.tuition_pending || '0');

    // 6. Ingresos Proyectados: Mercadería y Stock Disponible en Almacén
    const prodRes = await query(
      `SELECT 
        id,
        name,
        category,
        current_stock,
        selling_price,
        unit_cost,
        (current_stock * selling_price) as total_retail_value,
        total_sold
       FROM v2.school_products
       WHERE tenant_id = $1 AND status = 'ACTIVE' AND current_stock > 0
       ORDER BY (current_stock * selling_price) DESC`,
      [tenantId]
    );
    const productsInStock = prodRes.rows.map((p: any) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      currentStock: parseInt(p.current_stock || '0', 10),
      sellingPrice: parseFloat(p.selling_price || '0'),
      unitCost: parseFloat(p.unit_cost || '0'),
      totalRetailValue: parseFloat(p.total_retail_value || '0'),
      totalSold: parseInt(p.total_sold || '0', 10),
    }));

    const totalStockUnits = productsInStock.reduce((acc: number, p: any) => acc + p.currentStock, 0);
    const totalInventoryRetailValue = productsInStock.reduce((acc: number, p: any) => acc + p.totalRetailValue, 0);

    // Ventas históricas en los últimos 30 días
    const recentSalesRes = await query(
      `SELECT COALESCE(SUM(amount), 0) as sales_30d, COUNT(*) as sales_count
       FROM v2.financial_transactions
       WHERE tenant_id = $1 AND type = 'INCOME' AND transaction_date >= (CURRENT_DATE - INTERVAL '30 days')`,
      [tenantId]
    );
    const historicalSales30d = parseFloat(recentSalesRes.rows[0]?.sales_30d || '0');

    // Proyección de ventas de mercadería a 30 días (estimado prudente: 25% del stock disponible o tendencia histórica)
    const projectedStockSalesModerate = Math.max(
      historicalSales30d,
      Math.round(totalInventoryRetailValue * 0.25 * 100) / 100
    );

    // Total Ingresos Proyectados Escenario Moderado (Pensiones pendientes + ventas estimadas de mercadería)
    const projectedIncomeModerate = tuitionPending + projectedStockSalesModerate;

    // 7. Cronograma Diario de Compromisos y Cobranzas (Timeline 30D ordenado cronológicamente)
    const timelineEvents = [
      ...supplierCommitments.map((s: any) => ({
        ...s,
        eventKind: 'OUTFLOW',
      })),
      ...loanCommitments.map((l: any) => ({
        ...l,
        eventKind: 'OUTFLOW',
      })),
      ...recurringCommitments.map((r: any) => ({
        ...r,
        eventKind: 'OUTFLOW',
      })),
    ].sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    // Añadir cálculo de días restantes a cada evento
    const timeline = timelineEvents.map((evt: any) => {
      const diffMs = new Date(evt.dueDate).getTime() - today.getTime();
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return {
        ...evt,
        daysRemaining,
        isOverdue: daysRemaining < 0,
      };
    });

    // 8. Escenarios Financieros a 30 Días (Calculados con números reales)
    const pessimisticIncome = Math.round((tuitionPending * 0.50 + totalInventoryRetailValue * 0.10) * 100) / 100;
    const moderateIncome = Math.round((tuitionPending * 0.85 + projectedStockSalesModerate) * 100) / 100;
    const optimisticIncome = Math.round((tuitionPending * 0.98 + totalInventoryRetailValue * 0.50) * 100) / 100;

    const scenarios = {
      pessimistic: {
        label: 'Pesimista (Cobranza baja 50% + Ventas 10%)',
        projectedIncome: pessimisticIncome,
        committedExpenses: totalCommittedExpenses,
        projectedNet: Math.round((pessimisticIncome - totalCommittedExpenses) * 100) / 100,
        projectedEndingCash: Math.round((currentCash + pessimisticIncome - totalCommittedExpenses) * 100) / 100,
      },
      moderate: {
        label: 'Moderado (Cobranza estimada 85% + Ventas 25%)',
        projectedIncome: moderateIncome,
        committedExpenses: totalCommittedExpenses,
        projectedNet: Math.round((moderateIncome - totalCommittedExpenses) * 100) / 100,
        projectedEndingCash: Math.round((currentCash + moderateIncome - totalCommittedExpenses) * 100) / 100,
      },
      optimistic: {
        label: 'Optimista (Cobranza alta 98% + Ventas 50%)',
        projectedIncome: optimisticIncome,
        committedExpenses: totalCommittedExpenses,
        projectedNet: Math.round((optimisticIncome - totalCommittedExpenses) * 100) / 100,
        projectedEndingCash: Math.round((currentCash + optimisticIncome - totalCommittedExpenses) * 100) / 100,
      },
    };

    // 9. Punto de Equilibrio y Diagnóstico Inteligente
    const breakEvenRequiredIncome = totalCommittedExpenses;
    const netProjected = scenarios.moderate.projectedNet;
    const endingCashProjected = scenarios.moderate.projectedEndingCash;

    let diagnosisStatus: 'SUPERAVIT' | 'EQUILIBRADO' | 'DEFICIT' = 'SUPERAVIT';
    let diagnosisMessage = '';

    if (endingCashProjected < 0) {
      diagnosisStatus = 'DEFICIT';
      if (supplierCommitments.length > 0 && currentCash < 0) {
        diagnosisMessage = `Atención: Tienes compromisos a proveedores por ${formatCurrency(totalSupplierCommitments)} en los próximos 30 días y el saldo actual de caja es de ${formatCurrency(currentCash)}. Se recomienda acelerar la cobranza o dinamizar la venta del inventario en almacén (${formatCurrency(totalInventoryRetailValue)} disponibles).`;
      } else {
        diagnosisMessage = `Se proyecta un déficit de caja en 30 días. Se requiere recaudar al menos ${formatCurrency(breakEvenRequiredIncome)} para cubrir la totalidad de cuotas y costos operativos.`;
      }
    } else if (endingCashProjected === 0 || endingCashProjected < 500) {
      diagnosisStatus = 'EQUILIBRADO';
      diagnosisMessage = `El flujo de caja proyectado se encuentra en punto de equilibrio ajustado. Los ingresos proyectados cubrirán los compromisos con poco margen de holgura.`;
    } else {
      diagnosisStatus = 'SUPERAVIT';
      diagnosisMessage = `Posición de liquidez saludable. Se proyecta un saldo favorable de ${formatCurrency(endingCashProjected)} al cierre de los próximos 30 días.`;
    }

    return NextResponse.json({
      success: true,
      period: {
        startDate: todayStr,
        endDate: target30dStr,
        days: 30,
      },
      forecast: {
        currentCash,
        // Egresos Comprometidos
        totalCommittedExpenses,
        totalSupplierCommitments,
        totalLoanCommitments,
        totalRecurringCommitments,
        supplierCommitments,
        loanCommitments,
        recurringCommitments,
        nextUpcomingLoanInstallment,
        // Ingresos Proyectados
        totalStudents,
        totalTuitionPotential,
        tuitionCollected,
        tuitionPending,
        totalStockUnits,
        totalInventoryRetailValue,
        historicalSales30d,
        projectedStockSalesModerate,
        projectedIncomeModerate,
        productsInStock,
        // Métricas Proyectadas
        netProjected,
        endingCashProjected,
        breakEvenRequiredIncome,
        diagnosisStatus,
        diagnosisMessage,
        // Cronograma y Escenarios
        timeline,
        scenarios,
      },
    });
  } catch (error: unknown) {
    console.error('[API /api/finances/forecast GET] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error al calcular previsión a 30 días';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

function formatCurrency(val: number): string {
  return `S/ ${Number(val || 0).toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
