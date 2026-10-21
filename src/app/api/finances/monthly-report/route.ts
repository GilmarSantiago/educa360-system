import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';
import { formatDbDate } from '@/lib/finances';

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

    const { searchParams } = new URL(req.url);
    const today = new Date();
    const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const month = searchParams.get('month') || defaultMonth;

    const parts = month.split('-');
    const year = parseInt(parts[0], 10) || today.getFullYear();
    const m = parseInt(parts[1], 10) || (today.getMonth() + 1);

    const startDate = `${year}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(year, m, 0).getDate();
    const endDate = `${year}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const monthLabel = `${monthNames[m - 1]} ${year}`;
    const periodLabel = `Del 01 de ${monthNames[m - 1]} de ${year} al ${lastDay} de ${monthNames[m - 1]} de ${year}`;

    // 1. Transacciones del mes
    const txSql = `
      SELECT t.id, t.type, t.amount, t.description, 
             TO_CHAR(t.transaction_date, 'YYYY-MM-DD') as transaction_date,
             t.payment_method, t.receipt_number,
             t.funding_source, t.funding_loan_id, t.funding_entity_name, t.funding_details,
             c.name as category_name, c.type as category_type
      FROM v2.financial_transactions t
      LEFT JOIN v2.financial_categories c ON t.category_id = c.id
      WHERE t.tenant_id = $1 
        AND t.transaction_date >= $2 
        AND t.transaction_date <= $3
      ORDER BY t.transaction_date ASC, t.created_at ASC
    `;
    const txRes = await query(txSql, [tenantId, startDate, endDate]);
    const transactions = txRes.rows;

    // Desglose de LO PRODUCIDO POR EL COLEGIO (Excluye tajantemente préstamos de bancos)
    let producedTuitions = 0;
    let producedTuitionsCount = 0;
    let producedAdmissions = 0; // Cuotas de ingreso (alumnos nuevos)
    let producedAdmissionsCount = 0;
    let producedEnrollments = 0; // Matrículas
    let producedEnrollmentsCount = 0;
    let producedUniforms = 0;
    let producedUniformsCount = 0;
    let producedBooks = 0;
    let producedBooksCount = 0;
    let producedOtherIncome = 0;
    let producedOtherIncomeCount = 0;

    // Financiamiento / Endeudamiento Externo (NO es producción del colegio)
    let loanDisbursements = 0;
    let loanDisbursementsCount = 0;
    let partnerContributions = 0;
    let partnerContributionsCount = 0;
    let lenderContributions = 0;
    let lenderContributionsCount = 0;

    // Desglose de LO INVERTIDO Y GASTADO (Egresos)
    let investedBatches = 0; // Inversión en mercadería/lotes
    let investedBatchesCount = 0;
    let investedPayroll = 0; // Planilla docentes/administrativos
    let investedPayrollCount = 0;
    let investedServices = 0; // Luz, agua, internet, mantenimiento
    let investedServicesCount = 0;
    let investedLoans = 0; // Pago cuotas de préstamos
    let investedLoansCount = 0;
    let investedOtherExpenses = 0;
    let investedOtherExpensesCount = 0;

    // Desglose de FUENTES DE FINANCIAMIENTO DE LOS EGRESOS (¿Con qué dinero se pagó cada gasto?)
    let financedByOperating = 0;
    let financedByOperatingCount = 0;
    let financedByBankLoans = 0;
    let financedByBankLoansCount = 0;
    let financedByLenders = 0;
    let financedByLendersCount = 0;
    let financedByPartners = 0;
    let financedByPartnersCount = 0;
    let financedByOther = 0;
    let financedByOtherCount = 0;

    for (const tx of transactions) {
      const amt = Number(tx.amount) || 0;
      const cat = (tx.category_name || '').toLowerCase();
      const desc = (tx.description || '').toLowerCase();

      if (tx.type === 'INCOME') {
        const isLoanDisbursement =
          desc.includes('desembolso') ||
          desc.includes('préstamo bancario') ||
          desc.includes('prestamo bancario') ||
          cat.includes('préstamo') ||
          cat.includes('prestamo') ||
          tx.id.startsWith('tx-disb');

        const isPartnerContribution =
          desc.includes('aporte de capital') ||
          desc.includes('aporte de socio') ||
          cat.includes('aporte') ||
          tx.funding_source === 'APORTE_SOCIO' ||
          tx.funding_source === 'SOCIO';

        const isLenderContribution =
          desc.includes('prestamista') ||
          cat.includes('prestamista') ||
          tx.funding_source === 'PRESTAMISTA';

        if (isLoanDisbursement) {
          // Dinero recibido de bancos por préstamos (Pasivo / Deuda)
          loanDisbursements += amt;
          loanDisbursementsCount++;
        } else if (isPartnerContribution) {
          // Aporte de capital de promotores / socios (Patrimonio / Inyección)
          partnerContributions += amt;
          partnerContributionsCount++;
        } else if (isLenderContribution) {
          lenderContributions += amt;
          lenderContributionsCount++;
        } else if (cat.includes('cuota de ingreso') || desc.includes('cuota de ingreso')) {
          producedAdmissions += amt;
          producedAdmissionsCount++;
        } else if (cat.includes('matrícula') || cat.includes('matricula') || desc.includes('matrícula') || desc.includes('matricula')) {
          producedEnrollments += amt;
          producedEnrollmentsCount++;
        } else if (cat.includes('pensión') || cat.includes('pension') || cat.includes('mensualidad') || desc.includes('pensión') || desc.includes('pension')) {
          producedTuitions += amt;
          producedTuitionsCount++;
        } else if (cat.includes('uniforme') || desc.includes('uniforme')) {
          producedUniforms += amt;
          producedUniformsCount++;
        } else if (cat.includes('libro') || cat.includes('cuaderno') || desc.includes('libro')) {
          producedBooks += amt;
          producedBooksCount++;
        } else {
          producedOtherIncome += amt;
          producedOtherIncomeCount++;
        }
      } else {
        // EXPENSE
        if (cat.includes('mercadería') || cat.includes('mercaderia') || desc.includes('inversión') || desc.includes('inversion') || desc.includes('lote') || desc.includes('proveedor')) {
          investedBatches += amt;
          investedBatchesCount++;
        } else if (cat.includes('planilla') || cat.includes('remuneraci') || cat.includes('sueldo') || desc.includes('sueldo') || desc.includes('honorarios')) {
          investedPayroll += amt;
          investedPayrollCount++;
        } else if (cat.includes('servicios') || cat.includes('luz') || cat.includes('agua') || cat.includes('mantenimiento') || desc.includes('luz') || desc.includes('agua')) {
          investedServices += amt;
          investedServicesCount++;
        } else if (cat.includes('préstamo') || cat.includes('prestamo') || desc.includes('cuota de préstamo') || desc.includes('banco') || desc.includes('amortiz')) {
          investedLoans += amt;
          investedLoansCount++;
        } else {
          investedOtherExpenses += amt;
          investedOtherExpensesCount++;
        }

        // Trazabilidad de origen de fondos del gasto (¿Quién financió este egreso?)
        const src = tx.funding_source || 'PROPIO';
        if (src === 'PRESTAMO_BANCARIO' || src === 'PRESTAMO') {
          financedByBankLoans += amt;
          financedByBankLoansCount++;
        } else if (src === 'PRESTAMISTA') {
          financedByLenders += amt;
          financedByLendersCount++;
        } else if (src === 'APORTE_SOCIO' || src === 'SOCIO') {
          financedByPartners += amt;
          financedByPartnersCount++;
        } else if (src === 'OTRO') {
          financedByOther += amt;
          financedByOtherCount++;
        } else {
          financedByOperating += amt;
          financedByOperatingCount++;
        }
      }
    }

    // TOTAL PRODUCIDO REAL (Sin inflar con préstamos de bancos)
    const totalProducedReal = producedTuitions + producedAdmissions + producedEnrollments + producedUniforms + producedBooks + producedOtherIncome;
    const totalInvestedReal = investedBatches + investedPayroll + investedServices + investedLoans + investedOtherExpenses;
    
    // RESULTADO OPERATIVO REAL (¿El colegio generó ganancia o pérdida por su propia actividad?)
    const operatingResult = totalProducedReal - totalInvestedReal;
    
    // FLUJO NETO DE CAJA (Resultado Operativo + Préstamos Recibidos)
    const netCashBalance = operatingResult + loanDisbursements;

    // 2. Detalle Comercial de Ventas de Productos en este mes
    const salesSql = `
      SELECT s.id, s.product_id, s.quantity, s.unit_price, s.total_amount, s.unit_cost, s.net_profit,
             s.student_name, s.buyer_name, s.payment_method, s.receipt_number,
             TO_CHAR(s.sale_date, 'YYYY-MM-DD') as sale_date,
             p.name as product_name, p.category as product_category
      FROM v2.product_sales s
      JOIN v2.school_products p ON s.product_id = p.id
      WHERE p.tenant_id = $1 
        AND s.sale_date >= $2 
        AND s.sale_date <= $3
      ORDER BY s.sale_date DESC
    `;
    const salesRes = await query(salesSql, [tenantId, startDate, endDate]);
    const salesList = salesRes.rows;

    const commercialTotalSales = salesList.reduce((sum, s) => sum + Number(s.total_amount), 0);
    const commercialTotalCost = salesList.reduce((sum, s) => sum + (Number(s.unit_cost) * Number(s.quantity)), 0);
    const commercialNetProfit = salesList.reduce((sum, s) => sum + Number(s.net_profit), 0);
    const commercialUnitsSold = salesList.reduce((sum, s) => sum + Number(s.quantity), 0);

    // 3. Análisis de Recuperación de Inversión en Mercadería (Uniformes, Libros, etc.)
    const totalMerchandiseSold = commercialTotalSales > 0 ? commercialTotalSales : (producedUniforms + producedBooks);
    const merchandiseRecoveryGap = totalMerchandiseSold - investedBatches;
    const isMerchandiseInvested = investedBatches > 0;
    const merchandiseRecoveryPercent = isMerchandiseInvested
      ? Math.round((totalMerchandiseSold / investedBatches) * 100)
      : (totalMerchandiseSold > 0 ? 100 : 0);

    // 4. Estado de Pensiones del Mes
    const tuitionSql = `
      SELECT 
        COUNT(*) as total_records,
        COALESCE(SUM(monthly_amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN status = 'PAID' THEN monthly_amount ELSE 0 END), 0) as paid_amount,
        COALESCE(SUM(CASE WHEN status = 'PENDING' THEN monthly_amount ELSE 0 END), 0) as pending_amount,
        COALESCE(SUM(CASE WHEN status = 'OVERDUE' THEN monthly_amount ELSE 0 END), 0) as overdue_amount,
        COUNT(CASE WHEN status = 'PAID' THEN 1 END) as paid_count,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'OVERDUE' THEN 1 END) as overdue_count
      FROM v2.student_tuitions
      WHERE tenant_id = $1 AND period_month = $2
    `;
    const tuitionRes = await query(tuitionSql, [tenantId, month]);
    const tuitRow = tuitionRes.rows[0] || {};
    const tuitionStats = {
      totalRecords: parseInt(tuitRow.total_records || '0', 10),
      totalAmount: parseFloat(tuitRow.total_amount || '0'),
      paidAmount: parseFloat(tuitRow.paid_amount || '0'),
      pendingAmount: parseFloat(tuitRow.pending_amount || '0'),
      overdueAmount: parseFloat(tuitRow.overdue_amount || '0'),
      paidCount: parseInt(tuitRow.paid_count || '0', 10),
      pendingCount: parseInt(tuitRow.pending_count || '0', 10),
      overdueCount: parseInt(tuitRow.overdue_count || '0', 10),
      collectionRate: parseFloat(tuitRow.total_amount || '0') > 0
        ? Math.round((parseFloat(tuitRow.paid_amount || '0') / parseFloat(tuitRow.total_amount || '0')) * 100)
        : 0,
    };

    // 5. Estado del Inventario / Capital en Almacén actual
    const invSql = `
      SELECT 
        COALESCE(SUM(current_stock), 0) as total_stock_units,
        COALESCE(SUM(current_stock * unit_cost), 0) as inventory_at_cost,
        COALESCE(SUM(current_stock * selling_price), 0) as inventory_at_retail,
        COALESCE(SUM(current_stock * (selling_price - unit_cost)), 0) as potential_profit
      FROM v2.school_products
      WHERE tenant_id = $1 AND status = 'ACTIVE'
    `;
    const invRes = await query(invSql, [tenantId]);
    const invRow = invRes.rows[0] || {};
    const warehouseInventory = {
      stockUnits: parseInt(invRow.total_stock_units || '0', 10),
      valueAtCost: parseFloat(invRow.inventory_at_cost || '0'),
      valueAtRetail: parseFloat(invRow.inventory_at_retail || '0'),
      potentialProfit: parseFloat(invRow.potential_profit || '0'),
    };

    // 6. Diagnóstico y Salud del Colegio (Basado en RESULTADO OPERATIVO REAL, nunca en préstamos)
    const institutionalGrowthIncome = producedAdmissions + producedEnrollments;
    const operationalTuitionIncome = producedTuitions;
    const commercialMarginGenerated = commercialNetProfit > 0 
      ? commercialNetProfit 
      : Math.max(0, totalMerchandiseSold - investedBatches);

    const fixedOperationalCosts = investedPayroll + investedServices + investedLoans + investedOtherExpenses;
    const realEconomicProfit = (institutionalGrowthIncome + operationalTuitionIncome + commercialMarginGenerated) - fixedOperationalCosts;

    let healthStatus: 'EXCELLENT' | 'GOOD' | 'NEUTRAL' | 'WARNING';
    let healthTitle = '';
    let healthExplanation = '';

    if (operatingResult > 0 && institutionalGrowthIncome > 0) {
      healthStatus = 'EXCELLENT';
      healthTitle = 'Crecimiento Genuino y Superávit Operativo';
      healthExplanation = `El colegio generó un superávit operativo real de S/ ${operatingResult.toFixed(2)} por su propia producción educativa y comercial (se captaron ${producedAdmissionsCount + producedEnrollmentsCount} alumnos por matrícula/cuota de ingreso).`;
    } else if (operatingResult > 0) {
      healthStatus = 'GOOD';
      healthTitle = 'Operación Autosostenible en Superávit';
      healthExplanation = `Lo producido por el colegio (S/ ${totalProducedReal.toFixed(2)}) superó a los egresos e inversiones del mes (S/ ${totalInvestedReal.toFixed(2)}) con un margen favorable de S/ ${operatingResult.toFixed(2)}.`;
    } else if (operatingResult === 0) {
      healthStatus = 'NEUTRAL';
      healthTitle = 'Punto de Equilibrio Operativo';
      healthExplanation = 'Lo producido por el colegio igualó exactamente a los egresos del mes. Se recomienda acelerar la venta de mercadería y la cobranza de pensiones para generar margen.';
    } else {
      healthStatus = 'WARNING';
      healthTitle = 'Déficit Operativo / Inversión en Fase de Recuperación';
      healthExplanation = `Los egresos del mes (S/ ${totalInvestedReal.toFixed(2)}) superaron a lo producido por el colegio (S/ ${totalProducedReal.toFixed(2)}) por una brecha de S/ ${Math.abs(operatingResult).toFixed(2)}.`;
      
      if (loanDisbursements > 0) {
        healthExplanation += ` Aunque ingresaron S/ ${loanDisbursements.toFixed(2)} por desembolso de préstamo bancario a la cuenta, ese dinero es deuda y NO producción del colegio.`;
      }
      
      if (isMerchandiseInvested && merchandiseRecoveryGap < 0) {
        healthExplanation += ` La inversión en uniformes/libros está en fase de recuperación (${merchandiseRecoveryPercent}% recuperado; faltan vender S/ ${Math.abs(merchandiseRecoveryGap).toFixed(2)} para recuperar el capital invertido).`;
      }
    }

    return NextResponse.json({
      success: true,
      month,
      monthLabel,
      periodLabel,
      startDate,
      endDate,
      summary: {
        totalProducedReal, // Solo lo que produjo el colegio
        loanDisbursements, // Deuda externa recibida (NO es producción)
        totalInvestedReal, // Gastos e inversiones
        operatingResult,   // Superávit / Déficit Operativo Real
        netCashBalance,    // Saldo final en cuenta corriente
        realEconomicProfit,
        institutionalGrowthIncome,
        operationalTuitionIncome,
        commercialMarginGenerated,
        fixedOperationalCosts,
        transactionsCount: transactions.length,
      },
      produced: {
        admissions: { amount: producedAdmissions, count: producedAdmissionsCount, label: 'Cuotas de Ingreso (Nuevos Alumnos)' },
        enrollments: { amount: producedEnrollments, count: producedEnrollmentsCount, label: 'Matrículas Escolares' },
        tuitions: { amount: producedTuitions, count: producedTuitionsCount, label: 'Pensiones Cobradas' },
        uniforms: { amount: producedUniforms, count: producedUniformsCount, label: 'Venta de Uniformes' },
        books: { amount: producedBooks, count: producedBooksCount, label: 'Venta de Libros & Cuadernos' },
        other: { amount: producedOtherIncome, count: producedOtherIncomeCount, label: 'Otros Ingresos Varios' },
        totalProduced: totalProducedReal,
      },
      financing: {
        loansReceived: loanDisbursements,
        loansCount: loanDisbursementsCount,
        partnersReceived: partnerContributions,
        partnersCount: partnerContributionsCount,
        lendersReceived: lenderContributions,
        lendersCount: lenderContributionsCount,
        totalExternal: loanDisbursements + partnerContributions + lenderContributions,
        label: 'Financiamiento Externo Recibido (Aportes de Capital & Créditos)',
      },
      invested: {
        batches: { amount: investedBatches, count: investedBatchesCount, label: 'Inversión en Lotes de Mercadería' },
        payroll: { amount: investedPayroll, count: investedPayrollCount, label: 'Planilla & Remuneraciones' },
        services: { amount: investedServices, count: investedServicesCount, label: 'Servicios Básicos & Mantenimiento' },
        loans: { amount: investedLoans, count: investedLoansCount, label: 'Cuotas de Préstamos Bancarios' },
        other: { amount: investedOtherExpenses, count: investedOtherExpensesCount, label: 'Otros Gastos Operativos' },
        totalInvested: totalInvestedReal,
      },
      merchandiseRecovery: {
        investedInBatches: investedBatches,
        totalSales: totalMerchandiseSold,
        recoveryGap: merchandiseRecoveryGap,
        recoveryPercent: merchandiseRecoveryPercent,
        isFullyRecovered: merchandiseRecoveryGap >= 0,
      },
      fundingBreakdown: {
        operating: { amount: financedByOperating, count: financedByOperatingCount, label: 'Ingresos Propios / Caja del Colegio' },
        bankLoans: { amount: financedByBankLoans, count: financedByBankLoansCount, label: 'Préstamos Bancarios' },
        lenders: { amount: financedByLenders, count: financedByLendersCount, label: 'Prestamistas Particulares / Terceros' },
        partners: { amount: financedByPartners, count: financedByPartnersCount, label: 'Aporte de Capital de Socios / Promotores' },
        other: { amount: financedByOther, count: financedByOtherCount, label: 'Otros Fondos' },
        totalFinancedExpenses: totalInvestedReal,
      },
      commercialBreakdown: {
        totalSales: commercialTotalSales,
        totalCostOfGoods: commercialTotalCost,
        netCommercialProfit: commercialNetProfit,
        unitsSold: commercialUnitsSold,
        salesList,
      },
      tuitionStats,
      warehouseInventory,
      diagnosis: {
        status: healthStatus,
        title: healthTitle,
        explanation: healthExplanation,
      },
      transactions,
    });
  } catch (error: unknown) {
    console.error('[API /api/finances/monthly-report GET] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error al generar reporte mensual';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
