import { query } from '@/lib/db';

export const DEFAULT_FINANCIAL_CATEGORIES = [
  // Gastos / Egresos (EXPENSE)
  {
    name: 'Servicios Básicos (Luz, Agua, Internet)',
    type: 'EXPENSE',
    description: 'Pagos mensuales de energía eléctrica, agua potable, internet y telefonía',
  },
  {
    name: 'Préstamos Bancarios & Financieros',
    type: 'EXPENSE',
    description: 'Amortización de créditos bancarios, cuotas de préstamos e intereses',
  },
  {
    name: 'Planilla & Remuneraciones',
    type: 'EXPENSE',
    description: 'Pago de honorarios y sueldos a docentes, administrativos y personal de mantenimiento',
  },
  {
    name: 'Mantenimiento & Infraestructura',
    type: 'EXPENSE',
    description: 'Mantenimiento preventivo, reparaciones, pintura, gasfitería y mobiliario escolar',
  },
  {
    name: 'Materiales Educativos & Oficina',
    type: 'EXPENSE',
    description: 'Adquisición de papelería, tintas, útiles de oficina y material didáctico',
  },
  {
    name: 'Impuestos & Tasas Municipales',
    type: 'EXPENSE',
    description: 'Obligaciones tributarias (SUNAT), arbitrios municipales y licencias',
  },
  {
    name: 'Otros Gastos Varios',
    type: 'EXPENSE',
    description: 'Gastos operativos imprevistos y compras menores',
  },

  // Ingresos (INCOME)
  {
    name: 'Mensualidades & Pensiones',
    type: 'INCOME',
    description: 'Recaudación regular de pensiones escolares mensuales',
  },
  {
    name: 'Matrícula Escolar',
    type: 'INCOME',
    description: 'Ingresos por matrícula del año lectivo',
  },
  {
    name: 'Cuota de Ingreso',
    type: 'INCOME',
    description: 'Aporte de admisión para nuevos estudiantes ingresantes',
  },
  {
    name: 'Venta de Uniformes',
    type: 'INCOME',
    description: 'Ingresos por confección y venta de uniformes institucionales y deportivos',
  },
  {
    name: 'Venta de Libros & Cuadernos',
    type: 'INCOME',
    description: 'Venta de textos escolares, guías de estudio y cuadernos institucionales',
  },
  {
    name: 'Talleres & Actividades Extracurriculares',
    type: 'INCOME',
    description: 'Cuotas de talleres deportivos, artísticos y eventos escolares',
  },
  {
    name: 'Otros Ingresos Varios',
    type: 'INCOME',
    description: 'Certificados de estudios, constancias y otros conceptos extraordinarios',
  },
];

export const DEFAULT_PAYMENT_METHODS = [
  { name: 'Efectivo (Ventanilla)', code: 'EFECTIVO' },
  { name: 'Transferencia Bancaria', code: 'TRANSFERENCIA' },
  { name: 'Yape / Plin', code: 'YAPE_PLIN' },
  { name: 'Tarjeta Débito/Crédito', code: 'TARJETA' },
];

/**
 * Asegura que el colegio (tenant) tenga las categorías financieras por defecto creadas.
 */
export async function ensureDefaultCategories(tenantId: string) {
  const existing = await query(
    `SELECT COUNT(*) as count FROM v2.financial_categories WHERE tenant_id = $1`,
    [tenantId]
  );

  if (Number(existing.rows[0]?.count || 0) === 0) {
    for (const cat of DEFAULT_FINANCIAL_CATEGORIES) {
      const id = `fcat-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
      await query(
        `INSERT INTO v2.financial_categories (id, tenant_id, name, type, description, is_default, created_at)
         VALUES ($1, $2, $3, $4, $5, true, NOW())`,
        [id, tenantId, cat.name, cat.type, cat.description]
      );
    }
  }
}

/**
 * Asegura que el colegio (tenant) tenga los medios de pago base inicializados.
 */
export async function ensureDefaultPaymentMethods(tenantId: string) {
  const existing = await query(
    `SELECT COUNT(*) as count FROM v2.payment_methods WHERE tenant_id = $1`,
    [tenantId]
  );

  if (Number(existing.rows[0]?.count || 0) === 0) {
    for (const pm of DEFAULT_PAYMENT_METHODS) {
      const id = `pm-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
      await query(
        `INSERT INTO v2.payment_methods (id, tenant_id, name, code, is_default, is_active, created_at)
         VALUES ($1, $2, $3, $4, true, true, NOW())
         ON CONFLICT (tenant_id, code) DO NOTHING`,
        [id, tenantId, pm.name, pm.code]
      );
    }
  }
}

/**
 * Convierte de manera segura cualquier fecha (Date object, string ISO o PostgreSQL date)
 * a formato estricto 'YYYY-MM-DD' sin perder días por zona horaria ni romperse con split('T').
 */
export function formatDbDate(d: any): string {
  if (!d) return '';
  if (d instanceof Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  const str = String(d).trim();
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return str;
}

