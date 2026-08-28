const BaseRepository = require('../../shared/BaseRepository');
const { query } = require('../../db');

class Repository extends BaseRepository {
    constructor() {
        super('cashSessions');
    }

    async getCurrentSession(userId) {
        const res = await query('SELECT * FROM "cashSessions" WHERE "userId" = $1 AND status = \'open\' ORDER BY "openedAt" DESC LIMIT 1', [userId]);
        return res.rows[0] || null;
    }

    async getSessionSales(userId, sessionId) {
        const res = await query('SELECT * FROM payments WHERE "sessionId" = $1', [sessionId]);
        const sessionPayments = res.rows;
        
        let totalSales = 0;
        const salesByMethod = {};
        
        for (const payment of sessionPayments) {
            totalSales += Number(payment.amount);
            if (!salesByMethod[payment.paymentMethod]) {
                salesByMethod[payment.paymentMethod] = 0;
            }
            salesByMethod[payment.paymentMethod] += Number(payment.amount);
        }
        
        return { totalSales, sessionPayments, salesByMethod };
    }

    async openSession(userId, initialAmount) {
        const active = await this.getCurrentSession(userId);
        if (active) throw new Error('El usuario ya tiene una caja abierta.');

        const res = await query(
            'INSERT INTO "cashSessions" ("userId", "initialAmount", status) VALUES ($1, $2, \'open\') RETURNING *',
            [userId, initialAmount]
        );
        return res.rows[0];
    }

    async closeSession(userId, authorizerId) {
        const session = await this.getCurrentSession(userId);
        if (!session) throw new Error('No hay caja abierta para cerrar.');

        const res = await query(
            'UPDATE "cashSessions" SET status = \'closed\', "closedAt" = CURRENT_TIMESTAMP, "closedBy" = $1 WHERE id = $2 RETURNING *',
            [authorizerId || userId, session.id]
        );
        return res.rows[0];
    }

    async getHistory() {
        const res = await query('SELECT cs.*, u.name as "userName" FROM "cashSessions" cs LEFT JOIN users u ON cs."userId" = u.id ORDER BY cs."openedAt" DESC');
        return res.rows;
    }
}

module.exports = new Repository();