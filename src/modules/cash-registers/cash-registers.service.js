const repo = require('./cash-registers.repository');

const getCurrentSession = (userId) => {
    const session = repo.getCurrentSession(userId);
    if (!session) return null;
    
    // Adjuntar total de ventas calculadas
    const { totalSales, sessionPayments, salesByMethod } = repo.getSessionSales(userId, session.id);
    return {
        ...session,
        totalSales,
        paymentsCount: sessionPayments.length,
        systemCalculatedAmount: session.initialAmount + totalSales,
        salesByMethod,
        sessionPayments // Envía la lista detallada
    };
};

const openSession = (userId, initialAmount) => {
    if (initialAmount === undefined || initialAmount < 0) {
        throw new Error('El monto inicial no es válido.');
    }
    return repo.openSession(userId, initialAmount);
};

const closeSession = (userId, pin) => {
    if (!pin) {
        throw new Error('Debe proveer un código de autorización.');
    }
    const { getConfig, saveConfig } = require('../../db/localDb');
    const config = getConfig();
    const validTokenIndex = (config.closureTokens || []).findIndex(t => t.token === pin && t.expiresAt > Date.now());
    
    if (validTokenIndex === -1) {
        throw new Error('Código de autorización inválido o expirado.');
    }
    
    const tokenData = config.closureTokens[validTokenIndex];
    // Eliminar token usado
    config.closureTokens.splice(validTokenIndex, 1);
    saveConfig(config);

    return repo.closeSession(userId, tokenData.userId);
};

const getHistory = () => {
    return repo.getHistory();
};

module.exports = {
    getCurrentSession,
    openSession,
    closeSession,
    getHistory
};
