const router = require('express').Router();
const ctrl = require('./cash-registers.controller');
const { authenticateToken } = require('../../middleware/auth');

router.get('/current', authenticateToken, ctrl.getCurrentSession);
router.post('/open', authenticateToken, ctrl.openSession);
router.post('/close', authenticateToken, ctrl.closeSession);
router.get('/history', authenticateToken, ctrl.getHistory);

module.exports = router;
