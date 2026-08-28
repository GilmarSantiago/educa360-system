const router = require('express').Router();
const ctrl = require('./academic-year.controller');
const { authenticateToken, requireRole } = require('../../middleware/auth');

const adminGuard = [authenticateToken, requireRole('administrador')];

// Read operations: Available to all authenticated users (needed for colab, maestros, etc.)
router.get('/',                              authenticateToken, ctrl.getAll);
router.get('/:id',                           authenticateToken, ctrl.getById);

// Write operations: Restricted to administrador
router.post('/',                             ...adminGuard, ctrl.create);
router.put('/:id',                           ...adminGuard, ctrl.update);
router.delete('/:id',                        ...adminGuard, ctrl.remove);

// Periodos anidados (Write operations)
router.post('/:id/periods',                  ...adminGuard, ctrl.addPeriod);
router.put('/:id/periods/:periodId',         ...adminGuard, ctrl.updatePeriod);
router.delete('/:id/periods/:periodId',      ...adminGuard, ctrl.removePeriod);

module.exports = router;
