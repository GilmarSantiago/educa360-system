const repo = require('./cash-registers.repository');
const { query } = require('../../db');

const getCurrentSession = async (userId) => {
    const session = await repo.getCurrentSession(userId);
    if (!session) return null;
    
    const { totalSales, sessionPayments, salesByMethod } = await repo.getSessionSales(userId, session.id);
    return {
        ...session,
        totalSales,
        paymentsCount: sessionPayments.length,
        systemCalculatedAmount: Number(session.initialAmount) + totalSales,
        salesByMethod,
        sessionPayments
    };
};

const openSession = async (userId, initialAmount) => {
    if (initialAmount === undefined || initialAmount < 0) {
        throw new Error('El monto inicial no es válido.');
    }
    return await repo.openSession(userId, initialAmount);
};

const closeSession = async (userId, pin) => {
    if (!pin) {
        throw new Error('Debe proveer un código de autorización.');
    }
    
    // Validar token desde la tabla closureTokens
    const resToken = await query('SELECT * FROM "closureTokens" WHERE token = $1 AND "expiresAt" > CURRENT_TIMESTAMP', [pin]);
    const tokenData = resToken.rows[0];
    
    if (!tokenData) {
        throw new Error('Código de autorización inválido o expirado.');
    }
    
    // Eliminar token usado
    await query('DELETE FROM "closureTokens" WHERE token = $1', [pin]);

    return await repo.closeSession(userId, tokenData.generatedBy);
};

const getHistory = async () => {
    return await repo.getHistory();
};

module.exports = {
    getCurrentSession,
    openSession,
    closeSession,
    getHistory
};
