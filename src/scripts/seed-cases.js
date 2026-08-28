const db = require('../db/localDb');
const repo = require('../modules/enrollments/enrollments.repository');

// Hardcoded dates for year 2027 scenarios
const DATE_NORMAL = '2027-02-15';
const DATE_LATE = '2027-05-15';
const DATE_WITHDRAWAL = '2027-06-10';
const YEAR_2026_ID = 1;
const YEAR_2027_ID = 2;

async function runSeeder() {
    console.log('Iniciando generador de casos complejos de matrícula...');
    db.initDb();
    const config = db.getConfig();
    
    // CASO 1: Alumno Nuevo (Matrícula Normal)
    console.log('Generando Caso 1: Alumno Nuevo...');
    await repo.createEnrollment({
        student: { name: 'Juan Pérez (NUEVO)', document: '10000001', birthdate: '2015-05-10', previousSchool: 'Colegio Externo' },
        parent: { name: 'Carlos Pérez', document: 'P1000001', email: 'carlos@test.com', phone: '999111001' },
        enrollment: { gradeId: 4, section: 'A', academicYearId: YEAR_2027_ID, paymentMethod: 'Efectivo', date: DATE_NORMAL }
    });

    // CASO 2: Alumno Regular (Exonerado de Cuota de Ingreso)
    console.log('Generando Caso 2: Alumno Regular...');
    // Primero matriculamos en 2026
    await repo.createEnrollment({
        student: { name: 'María Gómez (REGULAR)', document: '20000002', birthdate: '2016-08-20', previousSchool: 'Interno' },
        parent: { name: 'Elena Gómez', document: 'P2000002', email: 'elena@test.com', phone: '999222002' },
        enrollment: { gradeId: 4, section: 'A', academicYearId: YEAR_2026_ID, paymentMethod: 'Transferencia', date: '2026-02-10' }
    });
    // Luego matriculamos en 2027 (Debería ser regular y exonerar cuota de ingreso)
    await repo.createEnrollment({
        student: { name: 'María Gómez (REGULAR)', document: '20000002', birthdate: '2016-08-20', previousSchool: 'Interno' },
        parent: { name: 'Elena Gómez', document: 'P2000002', email: 'elena@test.com', phone: '999222002' },
        enrollment: { gradeId: 5, section: 'A', academicYearId: YEAR_2027_ID, paymentMethod: 'Yape / Plin', date: DATE_NORMAL }
    });

    // CASO 3: Alumno Nuevo con Inscripción Tardía
    console.log('Generando Caso 3: Inscripción Tardía (Mayo)...');
    await repo.createEnrollment({
        student: { name: 'Luis Rojas (TARDÍO)', document: '30000003', birthdate: '2010-01-15', previousSchool: 'San Martín' },
        parent: { name: 'Roberto Rojas', document: 'P3000003', email: 'roberto@test.com', phone: '999333003' },
        enrollment: { gradeId: 10, section: 'A', academicYearId: YEAR_2027_ID, paymentMethod: 'Efectivo', date: DATE_LATE }
    });

    // CASO 4: Alumno Retirado (Retiro a mitad de año)
    console.log('Generando Caso 4: Alumno Retirado en Junio...');
    await repo.createEnrollment({
        student: { name: 'Ana Silva (RETIRADA)', document: '40000004', birthdate: '2014-11-05', previousSchool: 'N/A' },
        parent: { name: 'Sofia Silva', document: 'P4000004', email: 'sofia@test.com', phone: '999444004' },
        enrollment: { gradeId: 6, section: 'A', academicYearId: YEAR_2027_ID, paymentMethod: 'Efectivo', date: DATE_NORMAL }
    });
    // Encontrar su matrícula y retirarlo
    let c = db.getConfig();
    let st4 = c.students.find(s => s.document === '40000004');
    let en4 = c.enrollments.find(e => e.studentId === st4.id && e.academicYearId == YEAR_2027_ID);
    await repo.withdrawEnrollment(en4.id, DATE_WITHDRAWAL);

    // CASO 5: Alumno Trasladado (Sube de Nivel: Primaria -> Secundaria)
    console.log('Generando Caso 5: Alumno Trasladado de Nivel...');
    await repo.createEnrollment({
        student: { name: 'Pedro Torres (TRASLADADO)', document: '50000005', birthdate: '2012-04-12', previousSchool: 'N/A' },
        parent: { name: 'Rosa Torres', document: 'P5000005', email: 'rosa@test.com', phone: '999555005' },
        enrollment: { gradeId: 9, section: 'B', academicYearId: YEAR_2027_ID, paymentMethod: 'Tarjeta', date: DATE_NORMAL }
    });
    // Encontrar y trasladar de 6to Primaria (9) a 1ro Secundaria (10)
    c = db.getConfig();
    let st5 = c.students.find(s => s.document === '50000005');
    let en5 = c.enrollments.find(e => e.studentId === st5.id && e.academicYearId == YEAR_2027_ID);
    await repo.transferEnrollment(en5.id, 10, 'A');

    // CASO 6: Alumno con Beca del 50% en una pensión
    console.log('Generando Caso 6: Alumno con Beca Especial...');
    await repo.createEnrollment({
        student: { name: 'Carla Díaz (BECADA)', document: '60000006', birthdate: '2015-09-30', previousSchool: 'N/A' },
        parent: { name: 'Mario Díaz', document: 'P6000006', email: 'mario@test.com', phone: '999666006' },
        enrollment: { gradeId: 4, section: 'A', academicYearId: YEAR_2027_ID, paymentMethod: 'Efectivo', date: DATE_NORMAL }
    });
    // Aplicar beca del 50% a su pensión de Mayo (la que tiene dueDate en Mayo)
    c = db.getConfig();
    let st6 = c.students.find(s => s.document === '60000006');
    let en6 = c.enrollments.find(e => e.studentId === st6.id && e.academicYearId == YEAR_2027_ID);
    let targetPayment = c.payments.find(p => p.enrollmentId === en6.id && p.status === 'pendiente' && new Date(p.dueDate).getMonth() === 4);
    if (targetPayment) {
        await repo.applyPaymentDiscount(targetPayment.id, 'percentage', 50);
    }

    console.log('¡Todos los casos han sido inyectados con éxito en la base de datos!');
}

runSeeder().catch(console.error);
