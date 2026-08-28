const { getConfig, saveConfig } = require('../../db/localDb');

const cashRepo = require('../cash-registers/cash-registers.repository');

/**
 * Update a payment status to 'pagado'
 * Handle late fees (mora) and payment method
 */
const processPayment = async (paymentId, data) => {
    // Validate cash session
    const currentSession = cashRepo.getCurrentSession(data.currentUserId);
    if (!currentSession) {
        return { success: false, message: 'Debe aperturar su caja para poder procesar pagos.' };
    }

    const config = getConfig();
    const payment = (config.payments || []).find(p => p.id == paymentId);
    
    if (!payment) return { success: false, message: 'Pago no encontrado' };
    if (payment.status === 'pagado') return { success: false, message: 'El pago ya fue realizado' };

    const { method, paymentDate, lateFee = 0, waiveLateFee = false } = data;

    payment.cashSessionId = currentSession.id;

    payment.status = 'pagado';
    payment.method = method || 'Efectivo';
    payment.paymentDate = paymentDate || new Date().toISOString();
    
    // Logic for late fee
    if (!waiveLateFee && lateFee > 0) {
        payment.lateFee = lateFee;
        payment.totalPaid = (payment.amount || 0) + lateFee;
    } else {
        payment.lateFee = 0;
        payment.totalPaid = payment.amount;
    }

    saveConfig(config);
    return { success: true, payment };
};

const getById = (id) => {
    const { payments = [] } = getConfig();
    return payments.find(p => p.id == id) || null;
};

module.exports = { processPayment, getById };
