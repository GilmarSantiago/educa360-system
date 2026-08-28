const svc = require('./cash-registers.service');

const getCurrentSession = async (req, res, next) => {
    try {
        const session = svc.getCurrentSession(req.user.id);
        res.json({ success: true, session });
    } catch (err) { next(err); }
};

const openSession = async (req, res, next) => {
    try {
        const { initialAmount } = req.body;
        const session = svc.openSession(req.user.id, initialAmount);
        res.json({ success: true, session });
    } catch (err) { next(err); }
};

const closeSession = async (req, res, next) => {
    try {
        const { pin } = req.body;
        const session = svc.closeSession(req.user.id, pin);
        res.json({ success: true, session });
    } catch (err) { next(err); }
};

const getHistory = async (req, res, next) => {
    try {
        // En el futuro podemos filtrar por req.user.id si no es admin
        const history = svc.getHistory();
        res.json({ success: true, history });
    } catch (err) { next(err); }
};

module.exports = {
    getCurrentSession,
    openSession,
    closeSession,
    getHistory
};
