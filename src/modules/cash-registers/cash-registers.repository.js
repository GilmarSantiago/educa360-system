const { getConfig, saveConfig } = require('../../db/localDb');

/**
 * Obtiene la sesión de caja abierta actual para el usuario indicado.
 * @param {string|number} userId 
 */
const getCurrentSession = (userId) => {
    const config = getConfig();
    if (!config.cashSessions) config.cashSessions = [];
    return config.cashSessions.find(s => s.userId == userId && s.status === 'open');
};

/**
 * Obtiene el total de pagos (ventas) realizados durante una sesión de caja específica.
 * @param {string|number} userId
 * @param {string} openedAt (ISO Date string)
 */
const getSessionSales = (userId, sessionId) => {
    const config = getConfig();
    const payments = config.payments || [];
    
    const sessionPaymentsRaw = payments.filter(p => {
        if (p.status !== 'pagado') return false;
        return p.cashSessionId == sessionId;
    });

    // Populate studentName
    const students = config.students || [];

    const sessionPayments = sessionPaymentsRaw.map(p => {
        let studentName = 'Desconocido';
        const studentId = p.studentId || (p.enrollmentId ? (config.enrollments || []).find(e => e.id == p.enrollmentId)?.studentId : null);
        
        if (studentId) {
            const student = students.find(s => s.id == studentId);
            if (student) {
                studentName = student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim();
            }
        }
        return { ...p, studentName };
    });

    const totalSales = sessionPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    
    // Agrupar por método de pago
    const salesByMethod = {};
    sessionPayments.forEach(p => {
        const method = p.method || 'Efectivo';
        if (!salesByMethod[method]) salesByMethod[method] = 0;
        salesByMethod[method] += (Number(p.amount) || 0);
    });

    return { totalSales, count: sessionPayments.length, sessionPayments, salesByMethod };
};

/**
 * Abre una nueva sesión de caja.
 * @param {string|number} userId 
 * @param {number} initialAmount 
 */
const openSession = (userId, initialAmount) => {
    const config = getConfig();
    if (!config.cashSessions) config.cashSessions = [];

    const existingUserSession = getCurrentSession(userId);
    if (existingUserSession) {
        throw new Error('Ya tienes una caja abierta. Ciérrala antes de abrir otra.');
    }

    const allowMultiple = config.school && config.school.allowMultipleCashSessions;
    if (!allowMultiple) {
        // Validar que no haya ninguna caja abierta en todo el sistema
        const anyOpenSession = config.cashSessions.find(s => s.status === 'open');
        if (anyOpenSession) {
            throw new Error('Actualmente hay una caja abierta por otro usuario y la configuración no permite múltiples cajas. Solo puede haber una caja abierta a la vez.');
        }
    }

    const newSession = {
        id: Date.now().toString(),
        userId: Number(userId),
        openedAt: new Date().toISOString(),
        closedAt: null,
        initialAmount: Number(initialAmount),
        finalAmounts: null,
        systemCalculatedAmounts: null,
        differences: null,
        status: 'open'
    };

    config.cashSessions.push(newSession);
    saveConfig(config);
    return newSession;
};

/**
 * Cierra la sesión actual de caja.
 * @param {string|number} userId 
 * @param {string|number} supervisorId 
 */
const closeSession = (userId, supervisorId) => {
    const config = getConfig();
    const session = getCurrentSession(userId);
    
    if (!session) {
        throw new Error('No hay una caja abierta para este usuario.');
    }

    const payments = config.payments || [];
    const sessionPayments = payments.filter(p => p.status === 'pagado' && p.cashSessionId === session.id);
    
    const systemCalculatedAmounts = { 'Efectivo': session.initialAmount }; // Efectivo arranca con el inicial
    
    // Initialize config methods with 0 to ensure they appear
    const paymentMethods = (config.school && config.school.paymentMethods) || ['Efectivo', 'Yape / Plin', 'Transferencia', 'Tarjeta'];
    paymentMethods.forEach(m => {
        if (!systemCalculatedAmounts[m]) systemCalculatedAmounts[m] = 0;
    });

    // Sumar ventas por método
    sessionPayments.forEach(p => {
        const method = p.method || 'Efectivo';
        if (!systemCalculatedAmounts[method]) systemCalculatedAmounts[method] = 0;
        systemCalculatedAmounts[method] += (Number(p.amount) || 0);
    });
    
    // Al no haber conteo manual, las cantidades reales son iguales a las calculadas por el sistema.
    const actualAmounts = { ...systemCalculatedAmounts };
    const differences = {};
    let totalDifference = 0;

    const allMethods = new Set(Object.keys(systemCalculatedAmounts));
    allMethods.forEach(method => {
        differences[method] = 0;
    });

    session.closedAt = new Date().toISOString();
    session.closedBy = supervisorId;
    session.finalAmounts = actualAmounts;
    session.systemCalculatedAmounts = systemCalculatedAmounts;
    session.differences = differences;
    session.totalDifference = totalDifference;
    session.status = 'closed';

    saveConfig(config);
    return session;
};

/**
 * Historial de cajas
 */
const getHistory = () => {
    const config = getConfig();
    const sessions = config.cashSessions || [];
    
    // Reverse so latest is first
    const sorted = [...sessions].sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
    
    return sorted.map(s => {
        const user = (config.users || []).find(u => u.id == s.userId);
        const salesData = getSessionSales(s.userId, s.id);
        
        return {
            ...s,
            userName: user ? user.name : 'Desconocido',
            totalSales: salesData.totalSales,
            paymentsCount: salesData.count,
            sessionPayments: salesData.sessionPayments,
            salesByMethod: salesData.salesByMethod
        };
    });
};

module.exports = {
    getCurrentSession,
    getSessionSales,
    openSession,
    closeSession,
    getHistory
};
