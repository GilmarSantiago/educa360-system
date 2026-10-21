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

    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month'); // e.g., '2026-10' or empty for all

    const conditions: string[] = ['t.tenant_id = $1'];
    const values: any[] = [tenantId];

    let startDate = '';
    let endDate = '';
    let periodStr = 'Histórico Completo';

    if (month && month.includes('-')) {
      const parts = month.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const lastDay = new Date(y, m, 0).getDate();
      startDate = `${parts[0]}-${String(m).padStart(2, '0')}-01`;
      endDate = `${parts[0]}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      conditions.push(`t.transaction_date >= $2 AND t.transaction_date <= $3`);
      values.push(startDate, endDate);
      periodStr = `Del 01/${String(m).padStart(2, '0')}/${y} al ${lastDay}/${String(m).padStart(2, '0')}/${y}`;
    }

    const sql = `
      SELECT t.id, t.type, t.amount, t.description, 
             TO_CHAR(t.transaction_date, 'YYYY-MM-DD') as transaction_date,
             t.payment_method, t.receipt_number, t.created_at,
             t.funding_source, t.funding_entity_name,
             c.name as category_name,
             u.name as registered_by_name
      FROM v2.financial_transactions t
      LEFT JOIN v2.financial_categories c ON t.category_id = c.id
      LEFT JOIN v2.users u ON t.registered_by = u.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY t.transaction_date ASC, t.created_at ASC
    `;

    const res = await query(sql, values);
    const transactions = res.rows;

    // Calcular totales
    let totalProduced = 0;
    let loanDisbursements = 0;
    let totalExpense = 0;
    let producedAdmissions = 0;
    let producedEnrollments = 0;
    let producedTuitions = 0;
    let producedMerchandise = 0;
    let producedOther = 0;

    let investedBatches = 0;
    let investedPayroll = 0;
    let investedServices = 0;
    let investedLoans = 0;
    let investedOther = 0;

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

        if (isLoanDisbursement) {
          loanDisbursements += amt;
        } else {
          totalProduced += amt;
          if (cat.includes('cuota de ingreso') || desc.includes('cuota de ingreso')) {
            producedAdmissions += amt;
          } else if (cat.includes('matrícula') || cat.includes('matricula')) {
            producedEnrollments += amt;
          } else if (cat.includes('pensión') || cat.includes('pension') || cat.includes('mensualidad')) {
            producedTuitions += amt;
          } else if (cat.includes('uniforme') || cat.includes('libro') || desc.includes('venta')) {
            producedMerchandise += amt;
          } else {
            producedOther += amt;
          }
        }
      } else {
        totalExpense += amt;
        if (cat.includes('mercadería') || cat.includes('mercaderia') || desc.includes('lote') || desc.includes('inversión')) {
          investedBatches += amt;
        } else if (cat.includes('planilla') || cat.includes('sueldo') || cat.includes('remuneraci')) {
          investedPayroll += amt;
        } else if (cat.includes('servicios') || cat.includes('mantenimiento')) {
          investedServices += amt;
        } else if (cat.includes('préstamo') || cat.includes('prestamo') || desc.includes('cuota de préstamo') || desc.includes('amortiz')) {
          investedLoans += amt;
        } else {
          investedOther += amt;
        }
      }
    }

    const operatingResult = totalProduced - totalExpense;
    const netCashBalance = operatingResult + loanDisbursements;
    const merchandiseRecoveryGap = producedMerchandise - investedBatches;

    // Generar formato CSV con BOM UTF-8 para Excel
    const BOM = '\uFEFF';
    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const lines: string[] = [];

    // Encabezado institucional
    lines.push(`"EDUCA360 - REPORTE Y ANÁLISIS FINANCIERO MENSUAL"`);
    lines.push(`"PERIODO:",${escapeCsv(periodStr)}`);
    lines.push(`"FECHA DE EMISIÓN:",${escapeCsv(new Date().toLocaleDateString('es-PE'))}`);
    lines.push(`""`);

    // Resumen Ejecutivo
    lines.push(`"--- RESUMEN EJECUTIVO DEL MES ---"`);
    lines.push(`"Concepto","Monto en Soles (S/)","Diagnóstico Financiero"`);
    lines.push(`"TOTAL PRODUCIDO POR EL COLEGIO (INGRESOS OPERATIVOS)",${escapeCsv(totalProduced.toFixed(2))},"Matrículas, pensiones, ventas y cuotas de ingreso (excluye préstamos)"`);
    lines.push(`"TOTAL INVERTIDO Y GASTADO (EGRESOS Y COMPROMISOS)",${escapeCsv(totalExpense.toFixed(2))},"Compras de lotes, planilla, servicios y deuda"`);
    lines.push(`"RESULTADO OPERATIVO REAL (PRODUCCIÓN - GASTOS)",${escapeCsv(operatingResult.toFixed(2))},${escapeCsv(operatingResult >= 0 ? 'SUPERÁVIT OPERATIVO (El colegio es autosostenible y gana dinero)' : 'DÉFICIT OPERATIVO (Egresos e inversiones superan la producción propia)')}`);
    if (loanDisbursements > 0) {
      lines.push(`"PRÉSTAMOS BANCARIOS RECIBIDOS (PASIVO / DEUDA)",${escapeCsv(loanDisbursements.toFixed(2))},"Financiamiento externo recibido en cuenta bancaria (NO es producción propia)"`);
      lines.push(`"SALDO FINAL DE CAJA / BANCOS",${escapeCsv(netCashBalance.toFixed(2))},"Dinero disponible en cuenta corriente"`);
    }
    lines.push(`""`);

    // Análisis de Recuperación de Inversión en Mercadería
    if (investedBatches > 0 || producedMerchandise > 0) {
      lines.push(`"--- RECUPERACIÓN DE INVERSIÓN EN MERCADERÍA (UNIFORMES Y LIBROS) ---"`);
      lines.push(`"Concepto","Monto (S/)","Estado de Retorno"`);
      lines.push(`"Inversión en Lotes y Talleres",${escapeCsv(investedBatches.toFixed(2))},"Capital invertido en compras"`);
      lines.push(`"Ventas Cobradas de Mercadería",${escapeCsv(producedMerchandise.toFixed(2))},"Lo recuperado en ventanilla"`);
      lines.push(`"Brecha de Retorno de Inversión",${escapeCsv(merchandiseRecoveryGap.toFixed(2))},${escapeCsv(merchandiseRecoveryGap >= 0 ? 'Inversión 100% recuperada (Generando ganancia neta)' : `Aún no se recupera la inversión: faltan S/ ${Math.abs(merchandiseRecoveryGap).toFixed(2)} por vender`)}`);
      lines.push(`""`);
    }

    // Lo Producido
    lines.push(`"--- DESGLOSE DE LO PRODUCIDO POR EL COLEGIO ---"`);
    lines.push(`"Pilar de Ingreso","Monto (S/)","Naturaleza Financiera"`);
    lines.push(`"Cuotas de Ingreso (Nuevos Alumnos)",${escapeCsv(producedAdmissions.toFixed(2))},"Crecimiento Institucional (~100% Margen)"`);
    lines.push(`"Matrículas Escolares",${escapeCsv(producedEnrollments.toFixed(2))},"Apertura Anual de Vacantes"`);
    lines.push(`"Pensiones Escolares Cobradas",${escapeCsv(producedTuitions.toFixed(2))},"Sostenibilidad Operativa Recurrente"`);
    lines.push(`"Venta de Libros, Uniformes y Artículos",${escapeCsv(producedMerchandise.toFixed(2))},"Producción Comercial en Ventanilla"`);
    lines.push(`"Otros Ingresos Varios",${escapeCsv(producedOther.toFixed(2))},"Trámites, eventos y extraordinarios"`);
    lines.push(`""`);

    // Lo Invertido y Gastado
    lines.push(`"--- DESGLOSE DE LO INVERTIDO Y GASTADO (DESTINO DEL DINERO) ---"`);
    lines.push(`"Destino del Desembolso","Monto (S/)","Clasificación Económica"`);
    lines.push(`"Inversión en Mercadería y Lotes",${escapeCsv(investedBatches.toFixed(2))},"Compras a Talleres y Proveedores (Activo/Stock)"`);
    lines.push(`"Planilla y Remuneraciones Docentes",${escapeCsv(investedPayroll.toFixed(2))},"Costos Fijos de Personal"`);
    lines.push(`"Servicios Básicos y Mantenimiento",${escapeCsv(investedServices.toFixed(2))},"Operación del Local Escolar"`);
    lines.push(`"Cuotas de Préstamos Bancarios",${escapeCsv(investedLoans.toFixed(2))},"Servicio de Deuda y Amortización Financiera"`);
    lines.push(`"Otros Gastos Operativos",${escapeCsv(investedOther.toFixed(2))},"Compras menores y suministros"`);
    lines.push(`""`);

    // Detalle de Transacciones del Mes
    lines.push(`"--- DETALLE DE MOVIMIENTOS INDIVIDUALES DEL 01 AL FIN DE MES ---"`);
    const headers = [
      'Fecha',
      'Tipo',
      'Monto (S/)',
      'Concepto / Detalle',
      'Categoría',
      'Origen de Fondos (¿De dónde salió el dinero?)',
      'Medio de Pago',
      'N° Recibo / Voucher',
      'Registrado Por',
    ];
    lines.push(headers.map((h) => `"${h}"`).join(','));

    for (const r of transactions) {
      let fundingLabel = 'N/A';
      if (r.type === 'EXPENSE') {
        const src = r.funding_source || 'PROPIO';
        if (src === 'PRESTAMO_BANCARIO') {
          fundingLabel = `Préstamo Bancario: ${r.funding_entity_name || 'Banco'}`;
        } else if (src === 'PRESTAMISTA') {
          fundingLabel = `Prestamista: ${r.funding_entity_name || 'Particular'}`;
        } else if (src === 'APORTE_SOCIO') {
          fundingLabel = `Aporte de Socio: ${r.funding_entity_name || 'Socio Fundador'}`;
        } else if (src === 'OTRO') {
          fundingLabel = `Otro Fondo: ${r.funding_entity_name || 'Externo'}`;
        } else {
          fundingLabel = 'Ingresos Propios / Caja del Colegio';
        }
      }

      lines.push([
        escapeCsv(r.transaction_date || ''),
        escapeCsv(r.type === 'INCOME' ? 'INGRESO' : 'GASTO'),
        escapeCsv(Number(r.amount).toFixed(2)),
        escapeCsv(r.description),
        escapeCsv(r.category_name || 'Sin categoría'),
        escapeCsv(fundingLabel),
        escapeCsv(r.payment_method || 'EFECTIVO'),
        escapeCsv(r.receipt_number || 'S/N'),
        escapeCsv(r.registered_by_name || 'Sistema'),
      ].join(','));
    }

    const csvContent = BOM + lines.join('\r\n');
    const filename = `Reporte_Mensual_Educa360_${month || 'Historico'}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    console.error('[API /api/finances/export GET] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error al exportar reporte';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
