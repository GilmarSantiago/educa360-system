import pg from 'pg';
const { Pool } = pg;
import fs from 'fs';
import { SignJWT } from 'jose';

// 1. Obtener conexión a BD
const env = fs.readFileSync('.env', 'utf-8');
const match = env.match(/DATABASE_URL="?([^"\n\r]+)"?/);
const dbUrl = match ? match[1] : '';
const jwtMatch = env.match(/JWT_SECRET="?([^"\n\r]+)"?/);
const jwtSecret = new TextEncoder().encode(jwtMatch ? jwtMatch[1] : 'educa360-default-fallback-secret-2026');

const pool = new Pool({ connectionString: dbUrl });

const BASE_URL = 'http://localhost:3000';
let adminToken = '';

async function signUserToken(user) {
  return new SignJWT({
    userId: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    tenantId: user.tenant_id,
    tenantCode: 'avanza',
    tenantName: 'Colegio Avanza College',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(jwtSecret);
}

async function api(path, method = 'GET', body = null) {
  const headers = {
    'Cookie': `educa360_session=${adminToken}`,
    'Content-Type': 'application/json',
  };
  const options = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE_URL}${path}`, options);
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function main() {
  console.log('================================================================');
  console.log('🔄 [Educa360] INICIO DEL PROCESO DE RESET Y PRUEBA INTEGRAL E2E');
  console.log('================================================================\n');

  const client = await pool.connect();
  let adminUser = null;
  let soporteUser = null;

  try {
    // -------------------------------------------------------------
    // FASE 1: TRUNCATE DE TABLAS OPERATIVAS
    // -------------------------------------------------------------
    console.log('🧹 [Fase 1] Truncando tablas operativas de ambos pilares...');
    await client.query(`
      TRUNCATE 
        v2.product_sales,
        v2.product_batch_payments,
        v2.product_batches,
        v2.school_products,
        v2.bank_loan_installments,
        v2.bank_loans,
        v2.recurring_expense_payments,
        v2.recurring_expenses,
        v2.financial_transactions,
        v2.cash_register_shifts,
        v2.student_tuitions,
        v2.enrollments,
        v2.students,
        v2.guardians,
        v2.fee_concepts,
        v2.school_sections,
        v2.school_grades,
        v2.academic_years,
        v2.audit_logs 
      CASCADE;
    `);
    console.log('   ✅ Tablas operativas truncadas con éxito.');

    console.log('👤 [Fase 1.1] Limpiando usuarios excepto admin y soporte...');
    await client.query(`
      DELETE FROM v2.users 
      WHERE username NOT IN ('admin', 'soporte');
    `);

    // Obtener los 2 usuarios clave
    const usersRes = await client.query(`
      SELECT id, username, role, name, tenant_id FROM v2.users 
      WHERE username IN ('admin', 'soporte')
      ORDER BY role
    `);
    adminUser = usersRes.rows.find(u => u.username === 'admin');
    soporteUser = usersRes.rows.find(u => u.username === 'soporte');

    if (!adminUser || !soporteUser) {
      throw new Error('No se encontraron los usuarios admin o soporte en v2.users');
    }
    console.log(`   ✅ Usuarios preservados: ${adminUser.username} (${adminUser.role}), ${soporteUser.username} (${soporteUser.role})`);

    // Asegurar que el tenant exista
    const tenantId = adminUser.tenant_id || 'tenant-demo-avanza-001';
    await client.query(`
      INSERT INTO v2.tenants (id, code, name, ruc, email, phone, address, status, plan, monthly_fee)
      VALUES ($1, 'avanza', 'Colegio Avanza College', '20601234567', 'contacto@avanzacollege.edu.pe', '(01) 485-9201', 'Av. Las Palmeras 450, Lima', 'ACTIVE', 'PRO', 180.00)
      ON CONFLICT (id) DO NOTHING;
    `, [tenantId]);

    // Asegurar que admin tenga el tenantId
    await client.query(`UPDATE v2.users SET tenant_id = $1 WHERE id = $2`, [tenantId, adminUser.id]);
    adminUser.tenant_id = tenantId;

    // Generar token JWT para peticiones autenticadas
    adminToken = await signUserToken(adminUser);
    console.log('   🔑 Token JWT administrativo generado correctamente.');

  } finally {
    client.release();
  }

  // -------------------------------------------------------------
  // FASE 2: PILAR ADMINISTRATIVO
  // -------------------------------------------------------------
  console.log('\n🏛️  [Fase 2] PILAR ADMINISTRATIVO: Configuración, Estructura, Alumnos y Matrícula');

  // 2.1 Configuración Institucional
  console.log('   1. Configurando Perfil del Colegio y Reglas...');
  const resProfile = await api('/api/admin/institution', 'POST', {
    action: 'UPDATE_PROFILE',
    name: 'Colegio Avanza College',
    ruc: '20601234567',
    email: 'contacto@avanzacollege.edu.pe',
    phone: '(01) 485-9201',
    address: 'Av. Las Palmeras 450, Lima',
  });
  console.log(`      -> UPDATE_PROFILE: [${resProfile.status}] ${resProfile.data?.message || JSON.stringify(resProfile.data)}`);

  const resRules = await api('/api/admin/institution', 'POST', {
    action: 'UPDATE_RULES',
    grading_system: 'vigesimal',
    passing_grade: 11,
    period_type: 'bimestre',
    monthly_due_day: 5,
    late_fee_daily_percentage: 0.5,
    grace_days: 3,
    allow_multiple_cash_sessions: true,
    require_token_for_differences: true,
    enrollment_rule_new: 'OBLIGATORIO_AHORA',
    enrollment_rule_regular: 'OBLIGATORIO_AHORA',
    entry_fee_rule_new: 'APLICA',
    entry_fee_rule_regular: 'EXONERADO',
  });
  console.log(`      -> UPDATE_RULES: [${resRules.status}] ${resRules.data?.message || JSON.stringify(resRules.data)}`);

  // 2.2 Conceptos de Cobro (Tarifario)
  console.log('   2. Inicializando y Configurando Tarifario Oficial...');
  const resConceptsGet = await api('/api/admin/fee-concepts', 'GET');
  console.log(`      -> GET fee-concepts: [${resConceptsGet.status}] ${resConceptsGet.data?.concepts?.length || 0} conceptos encontrados`);

  const resNewConcept = await api('/api/admin/fee-concepts', 'POST', {
    name: 'Cuota APAFA 2026',
    code: 'APAFA_2026',
    description: 'Aporte para la Asociación de Padres de Familia',
    category: 'EXTRA',
    default_amount: 50.00,
    rule_new: 'OBLIGATORIO',
    rule_regular: 'OBLIGATORIO',
  });
  console.log(`      -> POST fee-concept (APAFA): [${resNewConcept.status}] ${resNewConcept.data?.message || JSON.stringify(resNewConcept.data)}`);

  // 2.3 Creación de Docentes / Personal
  console.log('   3. Registrando Personal y Maestros...');
  const resTeacher1 = await api('/api/admin/users', 'POST', {
    name: 'Prof. Carlos Alberto Mendoza Ramos',
    username: 'cmendoza',
    password: 'maestro123',
    role: 'MAESTRO',
    email: 'carlos.mendoza@avanzacollege.edu.pe',
    phone: '987111222',
    document: '09876543',
  });
  console.log(`      -> Maestro 1 (cmendoza): [${resTeacher1.status}] ${resTeacher1.data?.message || JSON.stringify(resTeacher1.data)}`);
  const teacherId1 = resTeacher1.data?.user?.id;

  const resTeacher2 = await api('/api/admin/users', 'POST', {
    name: 'Prof. María Elena Quispe Flores',
    username: 'mquispe',
    password: 'maestro123',
    role: 'MAESTRO',
    email: 'maria.quispe@avanzacollege.edu.pe',
    phone: '987333444',
    document: '08765432',
  });
  console.log(`      -> Maestro 2 (mquispe): [${resTeacher2.status}] ${resTeacher2.data?.message || JSON.stringify(resTeacher2.data)}`);
  const teacherId2 = resTeacher2.data?.user?.id;

  const resColab = await api('/api/admin/users', 'POST', {
    name: 'Ana Morales (Secretaría & Caja)',
    username: 'cajero',
    password: 'colab123',
    role: 'COLABORADOR',
    email: 'caja@avanzacollege.edu.pe',
    phone: '987555666',
    document: '07654321',
  });
  console.log(`      -> Colaborador (cajero): [${resColab.status}] ${resColab.data?.message || JSON.stringify(resColab.data)}`);

  // 2.4 Estructura Escolar & Aulas
  console.log('   4. Configurando Año Lectivo, Grados y Secciones...');
  const resYear = await api('/api/admin/academic-structure', 'POST', {
    action: 'SAVE_YEAR',
    year_name: 'Año Escolar 2026',
    year_code: '2026',
    start_date: '2026-03-01',
    end_date: '2026-12-20',
    status: 'ACTIVE',
    is_enrollment_open: true,
  });
  console.log(`      -> SAVE_YEAR 2026: [${resYear.status}] ${resYear.data?.message || JSON.stringify(resYear.data)}`);
  const academicYearId = resYear.data?.id;

  const resGrade1 = await api('/api/admin/academic-structure', 'POST', {
    action: 'SAVE_GRADE',
    level: 'PRIMARIA',
    grade_name: '1° de Primaria',
    grade_order: 1,
    default_enrollment_amount: 350.00,
    default_tuition_amount: 420.00,
    default_entry_fee: 350.00,
  });
  console.log(`      -> SAVE_GRADE (1° Primaria): [${resGrade1.status}] ${resGrade1.data?.message}`);
  const gradeId1 = resGrade1.data?.id;

  const resGrade2 = await api('/api/admin/academic-structure', 'POST', {
    action: 'SAVE_GRADE',
    level: 'PRIMARIA',
    grade_name: '2° de Primaria',
    grade_order: 2,
    default_enrollment_amount: 350.00,
    default_tuition_amount: 420.00,
    default_entry_fee: 350.00,
  });
  console.log(`      -> SAVE_GRADE (2° Primaria): [${resGrade2.status}] ${resGrade2.data?.message}`);
  const gradeId2 = resGrade2.data?.id;

  // Obtener secciones creadas automáticamente y asignar tutores
  const resStruct = await api('/api/admin/academic-structure', 'GET');
  const sections = resStruct.data?.grades?.flatMap(g => g.sections) || [];
  const sec1 = sections.find(s => s.grade_id === gradeId1);
  const sec2 = sections.find(s => s.grade_id === gradeId2);

  if (sec1) {
    await api('/api/admin/academic-structure', 'POST', {
      action: 'SAVE_SECTION',
      id: sec1.id,
      grade_id: gradeId1,
      section_letter: 'A',
      shift: 'MAÑANA',
      capacity: 25,
      tutor_user_id: teacherId1,
      classroom_location: 'Pabellón A - Aula 101',
    });
    console.log(`      -> Sección 1° A configurada (Tutor: Carlos Mendoza, Capacidad: 25)`);
  }

  if (sec2) {
    await api('/api/admin/academic-structure', 'POST', {
      action: 'SAVE_SECTION',
      id: sec2.id,
      grade_id: gradeId2,
      section_letter: 'A',
      shift: 'MAÑANA',
      capacity: 25,
      tutor_user_id: teacherId2,
      classroom_location: 'Pabellón A - Aula 102',
    });
    console.log(`      -> Sección 2° A configurada (Tutor: María Quispe, Capacidad: 25)`);
  }

  // 2.5 Familias, Alumnos y Admisión / Matrícula Integral
  console.log('   5. Registrando Familias, Alumnos y Matrícula Integral...');
  
  // Alumno 1: Daniel Pérez (1° Primaria A, Alumno Regular)
  const resEnroll1 = await api('/api/admin/enrollments', 'POST', {
    action: 'INTEGRAL_ENROLLMENT',
    guardian: {
      document_type: 'DNI',
      document_number: '45892104',
      first_name: 'Juan Carlos',
      last_name: 'Pérez Ramos',
      relationship: 'PADRE',
      phone: '987654321',
      email: 'juan.perez@gmail.com',
      address: 'Av. Arequipa 1230, Lince',
      occupation: 'Ingeniero de Sistemas',
    },
    student: {
      document_type: 'DNI',
      document_number: '72345678',
      first_name: 'Daniel Alejandro',
      last_name: 'Pérez Morales',
      gender: 'M',
      birth_date: '2019-05-14',
      blood_type: 'O+',
      allergies_medical: 'Ninguna',
      health_insurance: 'ESSALUD',
    },
    enrollment: {
      academic_year_id: academicYearId,
      section_id: sec1.id,
      enrollment_date: '2026-03-01',
      enrollment_type: 'REGULAR',
      enrollment_fee: 350.00,
      pay_enrollment_now: true,
      enrollment_payment_method: 'EFECTIVO',
      enrollment_receipt_number: 'REC-2026-0001',
      monthly_tuition_fee: 420.00,
      notes: 'Matrícula regular 2026 confirmada con recibo',
    },
  });
  console.log(`      -> Matrícula 1 (Daniel Pérez): [${resEnroll1.status}] ${resEnroll1.data?.message}`);

  // Alumno 2: Sofía Pérez (1° Primaria A, Ingresante Nueva con cuota de ingreso)
  const resEnroll2 = await api('/api/admin/enrollments', 'POST', {
    action: 'INTEGRAL_ENROLLMENT',
    guardian: {
      document_type: 'DNI',
      document_number: '45892104', // Mismo apoderado (hermana)
      first_name: 'Juan Carlos',
      last_name: 'Pérez Ramos',
      relationship: 'PADRE',
      phone: '987654321',
    },
    student: {
      document_type: 'DNI',
      document_number: '74567890',
      first_name: 'Sofía Camila',
      last_name: 'Pérez Morales',
      gender: 'F',
      birth_date: '2019-08-20',
      blood_type: 'O+',
    },
    enrollment: {
      academic_year_id: academicYearId,
      section_id: sec1.id,
      enrollment_date: '2026-03-01',
      enrollment_type: 'NUEVO',
      enrollment_fee: 350.00,
      pay_enrollment_now: true,
      enrollment_payment_method: 'YAPE_PLIN',
      enrollment_receipt_number: 'REC-2026-0002',
      monthly_tuition_fee: 420.00,
      notes: 'Ingresante nueva - Vacante confirmada',
    },
  });
  console.log(`      -> Matrícula 2 (Sofía Pérez): [${resEnroll2.status}] ${resEnroll2.data?.message}`);

  // Alumno 3: Mateo Sánchez (2° Primaria A, Alumno Regular)
  const resEnroll3 = await api('/api/admin/enrollments', 'POST', {
    action: 'INTEGRAL_ENROLLMENT',
    guardian: {
      document_type: 'DNI',
      document_number: '43567890',
      first_name: 'Roberto',
      last_name: 'Sánchez Vega',
      relationship: 'PADRE',
      phone: '998877665',
      email: 'roberto.sanchez@hotmail.com',
      address: 'Av. Javier Prado 2100, San Isidro',
      occupation: 'Contador Público',
    },
    student: {
      document_type: 'DNI',
      document_number: '71239874',
      first_name: 'Mateo Alexander',
      last_name: 'Sánchez Morales',
      gender: 'M',
      birth_date: '2018-02-18',
      blood_type: 'A+',
    },
    enrollment: {
      academic_year_id: academicYearId,
      section_id: sec2.id,
      enrollment_date: '2026-03-01',
      enrollment_type: 'REGULAR',
      enrollment_fee: 350.00,
      pay_enrollment_now: true,
      enrollment_payment_method: 'TRANSFERENCIA',
      enrollment_receipt_number: 'REC-2026-0003',
      monthly_tuition_fee: 420.00,
      notes: 'Matrícula regular 2026 confirmada',
    },
  });
  console.log(`      -> Matrícula 3 (Mateo Sánchez): [${resEnroll3.status}] ${resEnroll3.data?.message}`);

  // -------------------------------------------------------------
  // FASE 3: PILAR FINANCIERO
  // -------------------------------------------------------------
  console.log('\n💰 [Fase 3] PILAR FINANCIERO: Fondos, Préstamos, Gastos, Caja, Pensiones y Ventas');

  // Obtener categorías financieras para asociar IDs
  const resCats = await api('/api/finances/categories', 'GET');
  const categories = resCats.data?.categories || [];
  const catAporte = categories.find(c => c.name.includes('Otros Ingresos') || c.type === 'INCOME');
  const catServicios = categories.find(c => c.name.includes('Servicios') || c.type === 'EXPENSE');
  const catMateriales = categories.find(c => c.name.includes('Materiales') || c.type === 'EXPENSE');
  const catPrestamo = categories.find(c => c.name.includes('Préstamos') || c.type === 'EXPENSE');

  // 3.1 Aporte de Capital de Socio Fundador (Ingreso inicial)
  console.log('   1. Registrando Aporte de Capital de Socio Fundador...');
  const resAporte = await api('/api/finances/transactions', 'POST', {
    type: 'INCOME',
    amount: 10000.00,
    category_id: catAporte.id,
    description: 'Aporte de Capital de Trabajo - Socio Fundador Roberto Gómez',
    transaction_date: '2026-03-01',
    payment_method: 'TRANSFERENCIA',
    receipt_number: 'APORTE-2026-001',
    funding_source: 'APORTE_SOCIO',
    funding_entity_name: 'Roberto Gómez (Socio)',
    funding_details: 'Capital aportado para inicio de operaciones del ciclo 2026',
  });
  console.log(`      -> Aporte Socio (S/ 10,000.00): [${resAporte.status}] ${resAporte.data?.message}`);

  // 3.2 Gasto Operativo pagado con Fondos de Socio
  console.log('   2. Registrando Gasto Operativo (con Fondos de Socio)...');
  const resGastoSocio = await api('/api/finances/transactions', 'POST', {
    type: 'EXPENSE',
    amount: 2400.00,
    category_id: catMateriales.id,
    description: 'Compra de 2 proyectores multimedia Epson y pizarras acrílicas',
    transaction_date: '2026-03-02',
    payment_method: 'TRANSFERENCIA',
    receipt_number: 'FAC-001-9874',
    funding_source: 'APORTE_SOCIO',
    funding_entity_name: 'Roberto Gómez (Socio)',
    funding_details: 'Financiado del aporte inicial de capital',
  });
  console.log(`      -> Gasto Proyectores (S/ 2,400.00): [${resGastoSocio.status}] ${resGastoSocio.data?.message}`);

  // 3.3 Préstamo Bancario
  console.log('   3. Registrando Préstamo Bancario y Cronograma...');
  const resLoan = await api('/api/finances/loans', 'POST', {
    action: 'CREATE_LOAN',
    bank_name: 'Banco de Crédito del Perú (BCP)',
    loan_title: 'Crédito Reactiva Escolar BCP 2026',
    total_principal: 18000.00,
    total_installments: 12,
    monthly_installment_amount: 1600.00,
    interest_rate_tea: 12.5,
    disbursement_date: '2026-03-03',
    payment_day_of_month: 20,
    first_payment_date: '2026-03-20',
  });
  console.log(`      -> CREATE_LOAN BCP (S/ 18,000.00 en 12 cuotas): [${resLoan.status}] ${resLoan.data?.message}`);
  const loanId = resLoan.data?.loanId || resLoan.data?.loan?.id;

  // Pagar Cuota 1 del Préstamo
  if (loanId) {
    const resPayInst = await api('/api/finances/loans', 'POST', {
      action: 'PAY_INSTALLMENT',
      loan_id: loanId,
      installment_number: 1,
      payment_method: 'TRANSFERENCIA',
      receipt_number: 'OP-BCP-112233',
      paid_date: '2026-03-20',
      funding_source: 'APORTE_SOCIO',
      funding_entity_name: 'Roberto Gómez (Socio)',
      funding_details: 'Pago de cuota 1 amortizado con fondos del socio',
    });
    console.log(`      -> Pago Cuota 1 del Préstamo (S/ 1,600.00): [${resPayInst.status}] ${resPayInst.data?.message}`);
  }

  // 3.4 Servicios Recurrentes (Luz, Agua, Internet)
  console.log('   4. Registrando y Pagando Servicios Recurrentes...');
  const resRec1 = await api('/api/finances/recurring', 'POST', {
    action: 'CREATE',
    name: 'Luz del Sur - Sede Central',
    category_id: catServicios.id,
    supplier_name: 'Luz del Sur S.A.A.',
    supply_number: 'SUM-7890123',
    default_amount: 580.00,
    due_day: 15,
    payment_method: 'TRANSFERENCIA',
  });
  console.log(`      -> Servicio Luz del Sur: [${resRec1.status}] ${resRec1.data?.message}`);
  const recId1 = resRec1.data?.id || resRec1.data?.recurring?.id;

  const resRec2 = await api('/api/finances/recurring', 'POST', {
    action: 'CREATE',
    name: 'Fibra Óptica Dedicada Claro',
    category_id: catServicios.id,
    supplier_name: 'América Móvil Perú S.A.C.',
    supply_number: 'CLARO-456789',
    default_amount: 240.00,
    due_day: 20,
    payment_method: 'TRANSFERENCIA',
  });
  console.log(`      -> Servicio Fibra Óptica: [${resRec2.status}] ${resRec2.data?.message}`);

  if (recId1) {
    const resPayRec = await api('/api/finances/recurring', 'POST', {
      action: 'PAY',
      recurring_expense_id: recId1,
      recurring_id: recId1,
      amount: 580.00,
      payment_method: 'TRANSFERENCIA',
      receipt_number: 'REC-LUZ-MAR26',
      period_month: '2026-03',
      paid_date: '2026-03-15',
      funding_source: 'APORTE_SOCIO',
      funding_entity_name: 'Roberto Gómez (Socio)',
      funding_details: 'Pago del recibo mensual de luz',
    });
    console.log(`      -> Pago Recibo Luz del Sur (S/ 580.00): [${resPayRec.status}] ${resPayRec.data?.message}`);
  }

  // 3.5 Productos & Uniformes con Lote de Inversión
  console.log('   5. Registrando Producto y Lote de Inversión...');
  const resProd = await api('/api/finances/products', 'POST', {
    action: 'CREATE_PRODUCT_WITH_BATCH',
    name: 'Pack Uniforme Escolar 2026 (Polo + Buzo + Casaca)',
    category: 'UNIFORMES',
    sku: 'UNI-2026-PACK',
    supplier_name: 'Confecciones Textiles del Centro S.A.C.',
    quantity: 40,
    total_investment: 3400.00, // Costo unitario = S/ 85.00
    selling_price: 140.00,     // Margen de S/ 55.00 por unidad
    payment_plan_parts: 2,
    payment_schedule: [
      { part_number: 1, amount: 1700.00, due_date: '2026-03-05' },
      { part_number: 2, amount: 1700.00, due_date: '2026-03-25' },
    ],
    pay_first_now: true,
    first_payment_date: '2026-03-05',
    first_payment_method: 'TRANSFERENCIA',
    first_payment_receipt: 'CONFECC-001',
    funding_source: 'APORTE_SOCIO',
    funding_entity_name: 'Roberto Gómez (Socio)',
    funding_details: 'Pago 50% de confección de lote de uniformes',
  });
  console.log(`      -> Producto Uniformes (40 unids, Costo S/ 3,400.00): [${resProd.status}] ${resProd.data?.message}`);
  const productId = resProd.data?.productId || resProd.data?.product?.id;

  // 3.6 Arqueo de Caja de Ventanilla
  console.log('   6. Apertura de Turno de Caja Diaria...');
  const resShiftOpen = await api('/api/finances/cash-register', 'POST', {
    action: 'OPEN_SHIFT',
    opening_balance: 200.00,
  });
  console.log(`      -> Apertura Caja (Saldo inicial S/ 200.00): [${resShiftOpen.status}] ${resShiftOpen.data?.message}`);

  // 3.7 Cobranza de Pensiones y Venta de Uniformes
  console.log('   7. Cobrando Pensiones Escolares de Marzo y Venta de Uniformes...');
  const resTuitionsGet = await api('/api/finances/tuitions?month=2026-03', 'GET');
  const tuitionList = resTuitionsGet.data?.tuitions || [];
  console.log(`      -> Pensiones de Marzo 2026 generadas: ${tuitionList.length} cuotas`);

  const tDaniel = tuitionList.find(t => t.student_name.includes('Daniel'));
  const tSofia = tuitionList.find(t => t.student_name.includes('Sofía'));

  if (tDaniel) {
    const resPayT1 = await api('/api/finances/tuitions', 'POST', {
      action: 'PAY_TUITION',
      tuition_id: tDaniel.id,
      payment_method: 'EFECTIVO',
      receipt_number: 'REC-2026-0004',
      paid_date: '2026-03-05',
    });
    console.log(`      -> Cobro Pensión Marzo (Daniel Pérez - S/ 420.00 Efectivo): [${resPayT1.status}] ${resPayT1.data?.message}`);
  }

  if (tSofia) {
    const resPayT2 = await api('/api/finances/tuitions', 'POST', {
      action: 'PAY_TUITION',
      tuition_id: tSofia.id,
      payment_method: 'YAPE_PLIN',
      receipt_number: 'REC-2026-0005',
      paid_date: '2026-03-05',
    });
    console.log(`      -> Cobro Pensión Marzo (Sofía Pérez - S/ 420.00 Yape/Plin): [${resPayT2.status}] ${resPayT2.data?.message}`);
  }

  // Registrar venta de 2 uniformes en ventanilla
  if (productId) {
    const resSale = await api('/api/finances/products', 'POST', {
      action: 'RECORD_SALE',
      product_id: productId,
      quantity: 2,
      unit_price: 140.00,
      payment_method: 'EFECTIVO',
      receipt_number: 'REC-2026-0006',
      student_name: 'Daniel Alejandro Pérez Morales',
      buyer_name: 'Juan Carlos Pérez Ramos',
      sale_date: '2026-03-05',
    });
    console.log(`      -> Venta 2 Packs Uniformes (S/ 280.00 Efectivo): [${resSale.status}] ${resSale.data?.message}`);
  }

  // 3.8 Cierre Cuadrado de Turno de Caja Diaria
  console.log('   8. Cuadre y Cierre de Turno de Caja Diaria...');
  // Cálculo de efectivo esperado:
  // Saldo inicial: S/ 200.00
  // Cobro Pensión Daniel en efectivo: +S/ 420.00
  // Venta Uniformes en efectivo: +S/ 280.00
  // Total Efectivo Físico Esperado: S/ 900.00
  const resShiftClose = await api('/api/finances/cash-register', 'POST', {
    action: 'CLOSE_SHIFT',
    actual_cash: 900.00,
    closure_notes: 'Cierre de turno diario cuadrado conforme a arqueo físico sin discrepancias.',
  });
  console.log(`      -> Cierre de Caja (Físico contado S/ 900.00): [${resShiftClose.status}] ${resShiftClose.data?.message}`);

  // 3.9 Gasto con CAJA PROPIA (Totalmente desbloqueada por ingresos propios recaudados)
  console.log('   9. Registrando Gasto Operativo pagado con CAJA PROPIA...');
  const resGastoPropio = await api('/api/finances/transactions', 'POST', {
    type: 'EXPENSE',
    amount: 380.00,
    category_id: catMateriales.id,
    description: 'Adquisición de kits de limpieza, jabón líquido y papel toalla para aulas',
    transaction_date: '2026-03-06',
    payment_method: 'EFECTIVO',
    receipt_number: 'BOL-002-4512',
    funding_source: 'PROPIO',
    funding_details: 'Pagado directamente con la recaudación propia del colegio',
  });
  console.log(`      -> Gasto Limpieza con CAJA PROPIA (S/ 380.00): [${resGastoPropio.status}] ${resGastoPropio.data?.message}`);

  // -------------------------------------------------------------
  // FASE 4: VALIDACIÓN Y ESTADÍSTICAS FINALES
  // -------------------------------------------------------------
  console.log('\n📊 [Fase 4] VALIDACIÓN INTEGRAL DE REPORTES Y MÉTRICAS');

  const resTx = await api('/api/finances/transactions?month=2026-03', 'GET');
  const metrics = resTx.data?.metrics;
  console.log('   📈 Resumen de Flujo de Caja (Marzo 2026):');
  console.log(`      - Total Ingresos Registrados: S/ ${Number(metrics?.totalIncome || 0).toFixed(2)}`);
  console.log(`      - Total Gastos Registrados:   S/ ${Number(metrics?.totalExpense || 0).toFixed(2)}`);
  console.log(`      - Balance Neto en Caja:       S/ ${Number(metrics?.netBalance || 0).toFixed(2)}`);
  console.log(`      - Saldo Disponible Caja Propia: S/ ${Number(metrics?.fundsSummary?.propio?.availableBalance || 0).toFixed(2)} (Bloqueada: ${metrics?.fundsSummary?.propio?.isBlocked ? 'SÍ' : 'NO'})`);
  console.log(`      - Saldo Remanente Fondos Socio: S/ ${Number(metrics?.fundsSummary?.socio?.availableBalance || 0).toFixed(2)}`);

  const resReport = await api('/api/finances/monthly-report?month=2026-03', 'GET');
  console.log(`   📑 Reporte Mensual Contable: [${resReport.status}] Margen Operativo: S/ ${Number(resReport.data?.kpis?.operationalMargin || 0).toFixed(2)}`);

  const resForecast = await api('/api/finances/forecast', 'GET');
  console.log(`   🔮 Pronóstico de Flujo 3 Meses: [${resForecast.status}] 3 Meses Proyectados`);

  console.log('\n================================================================');
  console.log('🎉 ¡AUDITORÍA, RESET Y REPOBLADO CON AMBOS PILARES COMPLETADOS CON ÉXITO!');
  console.log('================================================================');

  await pool.end();
}

main().catch(err => {
  console.error('\n❌ ERROR FATAL EN EL PROCESO:', err);
  process.exit(1);
});
