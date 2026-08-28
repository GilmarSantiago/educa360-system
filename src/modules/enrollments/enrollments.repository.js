const { getConfig, saveConfig } = require('../../db/localDb');
const bcrypt = require('bcryptjs');

/**
 * Cuenta los días escolares/laborables en un rango de fechas dentro de un mes,
 * excluyendo fines de semana y feriados oficiales.
 */
const getSchoolDaysInMonth = (year, month, workingDays, holidays, limitDate = null, startFromDate = null) => {
    const startDate = startFromDate ? new Date(startFromDate) : new Date(year, month, 1);
    const endDate = limitDate ? new Date(limitDate) : new Date(year, month + 1, 0);
    
    let count = 0;
    const holidayStrings = (holidays || []).map(h => typeof h === 'string' ? h : h.date);

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay();
        const dateString = d.toISOString().split('T')[0];
        
        if (workingDays.includes(dayOfWeek) && !holidayStrings.includes(dateString)) {
            count++;
        }
    }
    return count;
};

/**
 * Consulta de verificación rápida de apoderado.
 */
const checkParentExists = async (document) => {
    const config = getConfig();
    const parent = (config.users || []).find(u => u.username === document && u.role === 'apoderado');
    if (parent) {
        return {
            exists: true,
            parent: {
                name: parent.name,
                email: parent.email,
                phone: parent.phone,
                document: parent.username
            }
        };
    }
    return { exists: false };
};

/**
 * Calcula el historial del alumno, estado académico y datos del padre.
 */
const checkStudentHistory = async (document, academicYearId) => {
    const config = getConfig();
    const student = (config.students || []).find(s => s.document === document);
    if (!student) {
        return { exists: false, status: 'Nuevo' };
    }

    const parent = (config.users || []).find(u => u.id === student.parentId && u.role === 'apoderado');
    const studentEnrollments = (config.enrollments || []).filter(e => e.studentId === student.id && e.status === 'activo');
    
    let status = 'Nuevo';
    let lastGradeId = null;

    if (studentEnrollments.length > 0) {
        const sortedEnrollments = [...studentEnrollments].sort((a, b) => new Date(b.date) - new Date(a.date));
        lastGradeId = sortedEnrollments[0].gradeId;

        const sortedYears = [...(config.academicYears || [])].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        const activeYearIdx = sortedYears.findIndex(y => y.id == academicYearId);
        
        if (activeYearIdx > 0) {
            const precedingYear = sortedYears[activeYearIdx - 1];
            const wasEnrolledPreceding = studentEnrollments.some(e => e.academicYearId == precedingYear.id);
            status = wasEnrolledPreceding ? 'Regular' : 'Reingresante';
        } else {
            status = 'Regular';
        }
    }

    const alreadyEnrolled = (config.enrollments || []).some(e => e.studentId === student.id && e.academicYearId == academicYearId);

    return {
        exists: true,
        alreadyEnrolled,
        status,
        lastGradeId,
        student: {
            name: student.name,
            document: student.document,
            birthdate: student.birthdate,
            previousSchool: student.previousSchool
        },
        parent: parent ? {
            name: parent.name,
            email: parent.email,
            phone: parent.phone,
            document: parent.username
        } : null
    };
};

/**
 * Crea una inscripción y genera el cronograma de cobros correspondiente.
 */
const createEnrollment = async (enrollData) => {
    const config = getConfig();
    const { student, parent, enrollment } = enrollData;

    // 0. Validación de matrícula duplicada activa para el año
    const existingSt = config.students.find(s => s.document === student.document);
    if (existingSt) {
        const duplicate = config.enrollments.find(e => 
            e.studentId === existingSt.id && 
            e.academicYearId == enrollment.academicYearId && 
            e.status === 'activo'
        );
        if (duplicate) {
            throw new Error(`El alumno ya cuenta con una matrícula activa para el año escolar ${duplicate.academicYearName || ''}.`);
        }
    }

    // Calcular estado académico real del alumno
    let studentStatus = 'Nuevo';
    if (existingSt) {
        const studentEnrollments = config.enrollments.filter(e => e.studentId === existingSt.id && e.status === 'activo');
        if (studentEnrollments.length > 0) {
            const sortedYears = [...config.academicYears].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
            const activeYearIdx = sortedYears.findIndex(y => y.id == enrollment.academicYearId);
            if (activeYearIdx > 0) {
                const precedingYear = sortedYears[activeYearIdx - 1];
                const wasEnrolledPreceding = studentEnrollments.some(e => e.academicYearId == precedingYear.id);
                studentStatus = wasEnrolledPreceding ? 'Regular' : 'Reingresante';
            } else {
                studentStatus = 'Regular';
            }
        }
    }

    // 1. Obtener o crear Apoderado
    let parentUser = config.users.find(u => u.username === parent.document && u.role === 'apoderado');
    if (!parentUser) {
        parentUser = {
            id: Date.now(),
            username: parent.document,
            password: bcrypt.hashSync(parent.document, 10), // Contraseña inicial es su DNI (haseada)
            role: 'apoderado',
            name: parent.name,
            email: parent.email,
            phone: parent.phone,
            address: '',
            status: 'activo'
        };
        config.users.push(parentUser);
    } else {
        // Si el apoderado estaba bloqueado, se desbloquea al matricular un nuevo hijo
        if (parentUser.status === 'bloqueado') {
            parentUser.status = 'activo';
        }
    }

    // 2. Obtener o crear Alumno
    let studentId;
    if (existingSt) {
        studentId = existingSt.id;
        existingSt.isNew = (studentStatus === 'Nuevo');
        existingSt.previousSchool = (studentStatus === 'Nuevo') ? (student.previousSchool || 'Ninguno') : 'Interno';
    } else {
        const newStudent = {
            id: Date.now() + 1,
            name: student.name,
            document: student.document,
            birthdate: student.birthdate,
            parentId: parentUser.id,
            isNew: true,
            previousSchool: student.previousSchool || 'Ninguno'
        };
        config.students.push(newStudent);
        studentId = newStudent.id;
    }

    // 3. Crear Inscripción
    const ay = config.academicYears.find(y => y.id == enrollment.academicYearId);
    const newEnrollment = {
        id: Date.now() + 2,
        studentId: studentId,
        gradeId: enrollment.gradeId,
        section: enrollment.section,
        academicYearId: enrollment.academicYearId,
        academicYearName: ay ? ay.name : 'N/A',
        status: 'activo',
        date: new Date().toISOString()
    };
    config.enrollments.push(newEnrollment);

    // 4. Generar Pagos basados en Conceptos Financieros y Matriz
    config.payments = config.payments || [];
    const concepts = config.financialConcepts || [];
    const grade = config.grades.find(g => g.id == enrollment.gradeId);
    const level = grade ? grade.level : 'primaria';

    const enrollDate = enrollment.date ? new Date(enrollment.date) : new Date();
    
    // Fix timezone shift: "YYYY-MM-DD" is parsed as UTC midnight, which in GMT-5 becomes the previous day.
    let ayStartStr = ay.startDate;
    if (ayStartStr && !ayStartStr.includes('T')) {
        ayStartStr += 'T12:00:00';
    }
    const ayStart = ayStartStr ? new Date(ayStartStr) : new Date(enrollDate);
    
    const isLateEnrollment = enrollDate > ayStart;

    concepts.forEach(concept => {
        // Reglas de aplicación
        if (studentStatus === 'Nuevo' && !concept.appliesToNew) return;
        if (studentStatus !== 'Nuevo' && !concept.appliesToRegular) return;

        if (!concept.isMandatory) {
            const optionalServices = enrollment.optionalServices || [];
            if (!optionalServices.includes(concept.id.toString())) return;
        }

        // Obtener costo de la matriz según nivel
        let conceptAmount = (concept.amounts && concept.amounts[level]) ?? Number(concept.defaultAmount) ?? 0;

        const installments = Number(concept.installmentsCount) || 1;

        for (let i = 0; i < installments; i++) {
            let conceptName = concept.name;
            let dueDate = new Date(ayStart);
            let isPaid = false;
            let method = '';
            let currentAmount = conceptAmount;
            
            if (concept.periodicity === 'monthly') {
                dueDate.setMonth(dueDate.getMonth() + i);
                dueDate.setDate(5);
                
                // Si la cuota mensual corresponde a un mes completamente ANTERIOR a la matrícula, se omite
                if (dueDate.getFullYear() < enrollDate.getFullYear() || 
                   (dueDate.getFullYear() === enrollDate.getFullYear() && dueDate.getMonth() < enrollDate.getMonth())) {
                    continue;
                }
                
                // Si la cuota mensual es del mes de matrícula y es tardía, se calcula el proporcional
                if (isLateEnrollment && dueDate.getFullYear() === enrollDate.getFullYear() && dueDate.getMonth() === enrollDate.getMonth()) {
                    const workingDays = ay.workingDays || [1, 2, 3, 4, 5];
                    const holidays = ay.holidays || [];
                    
                    const year = enrollDate.getFullYear();
                    const month = enrollDate.getMonth();
                    
                    const monthStart = new Date(year, month, 1);
                    const startForTotal = ayStart > monthStart ? ayStart : monthStart;
                    
                    const totalDays = getSchoolDaysInMonth(year, month, workingDays, holidays, null, startForTotal);
                    const startForRemaining = enrollDate > startForTotal ? enrollDate : startForTotal;
                    const remainingDays = getSchoolDaysInMonth(year, month, workingDays, holidays, null, startForRemaining);
                    
                    if (totalDays > 0) {
                        const ratio = remainingDays / totalDays;
                        currentAmount = ratio * conceptAmount;
                    }
                }

                const monthName = dueDate.toLocaleString('es-ES', { month: 'long' });
                conceptName = `${concept.name} - ${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${dueDate.getFullYear()}`;
            } else if (concept.periodicity === 'once') {
                if (installments > 1) {
                    conceptName = `${concept.name} (Cuota ${i + 1}/${installments})`;
                    dueDate.setMonth(dueDate.getMonth() + i);
                }
            }
            
            // Pago inmediato de Matrícula y Cuota de Ingreso
            if (i === 0 && (concept.type === 'enrollment_fee' || concept.type === 'tuition')) {
                isPaid = true;
                method = enrollment.paymentMethod || 'Efectivo';
                dueDate = null;
            }

            config.payments.push({
                id: Date.now() + config.payments.length + 100 + i,
                studentId: studentId,
                parentId: parentUser.id,
                enrollmentId: newEnrollment.id,
                conceptId: concept.id,
                concept: conceptName,
                amount: Number(currentAmount.toFixed(2)),
                status: isPaid ? 'pagado' : 'pendiente',
                method: method,
                paymentDate: isPaid ? new Date().toISOString() : null,
                dueDate: dueDate ? dueDate.toISOString() : null,
                createdAt: new Date().toISOString(),
                cashSessionId: isPaid ? (enrollData.cashSessionId || null) : null
            });
        }
    });

    saveConfig(config);
    return { success: true, studentId, parentId: parentUser.id, enrollmentId: newEnrollment.id };
};

/**
 * Obtiene todas las inscripciones filtradas por año escolar.
 */
const getAll = async (filters = {}) => {
    const config = getConfig();
    const { academicYearId } = filters;
    
    let list = config.enrollments || [];
    
    if (academicYearId) {
        list = list.filter(e => e.academicYearId == academicYearId);
    } else {
        const activeAy = (config.academicYears || []).find(y => y.isActive);
        if (activeAy) list = list.filter(e => e.academicYearId == activeAy.id);
    }

    return list.map(e => {
        const student = config.students.find(s => s.id === e.studentId);
        const grade = config.grades.find(g => g.id == e.gradeId);
        const ay = config.academicYears.find(y => y.id == e.academicYearId);
        return {
            ...e,
            studentName: student?.name || 'Desconocido',
            isNew: student?.isNew || false,
            gradeName: grade?.name || 'Desconocido',
            academicYearName: ay?.name || 'Desconocido'
        };
    });
};

/**
 * Anula una inscripción, cancela pagos pendientes y bloquea al apoderado si es necesario.
 */
const cancelEnrollment = async (id) => {
    const config = getConfig();
    const enrollment = config.enrollments.find(e => e.id == id);
    if (!enrollment) return false;

    // Cambiar estado de matrícula a cancelado
    enrollment.status = 'cancelado';

    // Cancelar todos sus pagos pendientes
    (config.payments || []).forEach(p => {
        if (p.enrollmentId == id && p.status === 'pendiente') {
            p.status = 'cancelado';
        }
    });

    // Evaluar bloqueo del apoderado
    const student = config.students.find(s => s.id === enrollment.studentId);
    if (student) {
        const parentId = student.parentId;
        const otherStudents = config.students.filter(s => s.parentId === parentId);
        const activeYearId = enrollment.academicYearId;
        
        let hasOtherActive = false;
        for (const os of otherStudents) {
            const activeEnrollments = config.enrollments.filter(e => 
                e.studentId === os.id && 
                e.id != id && 
                e.academicYearId == activeYearId && 
                e.status === 'activo'
            );
            if (activeEnrollments.length > 0) {
                hasOtherActive = true;
                break;
            }
        }
        
        // Bloquear si no hay más hijos activos
        if (!hasOtherActive) {
            const parentUser = config.users.find(u => u.id === parentId);
            if (parentUser) {
                parentUser.status = 'bloqueado';
                console.log(`[localDb] Cuenta del apoderado ${parentUser.username} bloqueada automáticamente por no tener alumnos activos.`);
            }
        }
    }

    saveConfig(config);
    return true;
};

/**
 * Carga la carpeta personal del alumno para visualización.
 */
const getStudentFolderData = async (studentId) => {
    const config = getConfig();
    const student = config.students.find(s => s.id == studentId);
    if (!student) return null;

    const parent = config.users.find(u => u.id == student.parentId);
    const enrollments = config.enrollments.filter(e => e.studentId == studentId);
    const payments = config.payments.filter(p => p.studentId == studentId);

    return {
        student,
        parent,
        enrollments,
        payments
    };
};

/**
 * Realiza el traslado de aula (cambio de grado/sección) recalculando las mensualidades pendientes.
 */
const transferEnrollment = async (enrollmentId, gradeId, section) => {
    const config = getConfig();
    const enrollment = config.enrollments.find(e => e.id == enrollmentId);
    if (!enrollment) return false;

    const oldGradeId = enrollment.gradeId;
    
    // Actualizar grado y sección
    enrollment.gradeId = Number(gradeId);
    enrollment.section = section;

    const oldGrade = config.grades.find(g => g.id == oldGradeId);
    const oldLevel = oldGrade ? oldGrade.level : 'primaria';
    const newGrade = config.grades.find(g => g.id == gradeId);
    const newLevel = newGrade ? newGrade.level : 'primaria';

    // Recalcular montos de cobros pendientes si el nivel educativo cambia
    if (oldLevel !== newLevel) {
        const concepts = config.financialConcepts || [];
        (config.payments || []).forEach(p => {
            if (p.enrollmentId == enrollmentId && p.status === 'pendiente') {
                const concept = concepts.find(c => c.id == p.conceptId);
                if (concept) {
                    const oldBaseAmount = (concept.amounts && concept.amounts[oldLevel]) ?? Number(concept.defaultAmount) ?? 0;
                    const newBaseAmount = (concept.amounts && concept.amounts[newLevel]) ?? Number(concept.defaultAmount) ?? 0;

                    if (oldBaseAmount > 0) {
                        const ratio = p.amount / oldBaseAmount;
                        p.amount = Number((newBaseAmount * ratio).toFixed(2));
                    } else {
                        p.amount = newBaseAmount;
                    }
                }
            }
        });
    }

    saveConfig(config);
    return true;
};

/**
 * Registra el retiro oficial de un alumno, anula pensiones futuras y prorratea el mes de retiro.
 */
const withdrawEnrollment = async (enrollmentId, withdrawalDateStr) => {
    const config = getConfig();
    const enrollment = config.enrollments.find(e => e.id == enrollmentId);
    if (!enrollment) return false;

    enrollment.status = 'retirado';
    enrollment.withdrawalDate = withdrawalDateStr;

    const withdrawalDate = new Date(withdrawalDateStr);
    const ay = config.academicYears.find(y => y.id == enrollment.academicYearId);
    const ayStart = ay ? new Date(ay.startDate) : new Date();

    const workingDays = ay?.workingDays || [1, 2, 3, 4, 5];
    const holidays = ay?.holidays || [];

    (config.payments || []).forEach(p => {
        if (p.enrollmentId == enrollmentId && p.status === 'pendiente') {
            if (p.dueDate) {
                const dueDate = new Date(p.dueDate);
                
                const wYear = withdrawalDate.getFullYear();
                const wMonth = withdrawalDate.getMonth();
                const dYear = dueDate.getFullYear();
                const dMonth = dueDate.getMonth();

                if (dYear > wYear || (dYear === wYear && dMonth > wMonth)) {
                    // Mes completamente futuro: Anular cuota
                    p.status = 'cancelado';
                } else if (dYear === wYear && dMonth === wMonth) {
                    // Mes de retiro: Prorratear cuota
                    const monthStart = new Date(wYear, wMonth, 1);
                    const startForTotal = ayStart > monthStart ? ayStart : monthStart;

                    const totalDays = getSchoolDaysInMonth(wYear, wMonth, workingDays, holidays, null, startForTotal);
                    
                    // attendedDays son los días escolares transcurridos hasta el retiro inclusive
                    const attendedDays = getSchoolDaysInMonth(wYear, wMonth, workingDays, holidays, withdrawalDateStr, startForTotal);

                    if (totalDays > 0) {
                        const ratio = Math.min(1, Math.max(0, attendedDays / totalDays));
                        p.amount = Number((p.amount * ratio).toFixed(2));
                        // Si el prorrateo es 0, lo cancelamos
                        if (p.amount === 0) {
                            p.status = 'cancelado';
                        }
                    }
                }
            }
        }
    });

    // Evaluar bloqueo del apoderado
    const student = config.students.find(s => s.id === enrollment.studentId);
    if (student) {
        const parentId = student.parentId;
        const otherStudents = config.students.filter(s => s.parentId === parentId);
        const activeYearId = enrollment.academicYearId;

        let hasOtherActive = false;
        for (const os of otherStudents) {
            const activeEnrollments = config.enrollments.filter(e =>
                e.studentId === os.id &&
                e.id != enrollmentId &&
                e.academicYearId == activeYearId &&
                e.status === 'activo'
            );
            if (activeEnrollments.length > 0) {
                hasOtherActive = true;
                break;
            }
        }

        if (!hasOtherActive) {
            const parentUser = config.users.find(u => u.id === parentId);
            if (parentUser) {
                parentUser.status = 'bloqueado';
                console.log(`[localDb] Cuenta del apoderado ${parentUser.username} bloqueada automáticamente tras retiro oficial del único alumno activo.`);
            }
        }
    }

    saveConfig(config);
    return true;
};

/**
 * Aplica una beca o descuento especial a un cobro específico.
 */
const applyPaymentDiscount = async (paymentId, discountType, discountValue) => {
    const config = getConfig();
    const payment = (config.payments || []).find(p => p.id == paymentId);
    if (!payment) return false;

    // Resguardar monto original
    if (payment.originalAmount === undefined) {
        payment.originalAmount = payment.amount;
    }

    const value = Number(discountValue);
    if (discountType === 'percentage') {
        payment.amount = Number((payment.originalAmount * (1 - value / 100)).toFixed(2));
    } else if (discountType === 'amount') {
        payment.amount = Number(Math.max(0, payment.originalAmount - value).toFixed(2));
    }

    payment.discount = {
        type: discountType,
        value: value,
        date: new Date().toISOString()
    };

    saveConfig(config);
    return true;
};

module.exports = { 
    createEnrollment, 
    getAll, 
    cancelEnrollment, 
    getStudentFolderData, 
    checkParentExists, 
    checkStudentHistory,
    transferEnrollment,
    withdrawEnrollment,
    applyPaymentDiscount
};
