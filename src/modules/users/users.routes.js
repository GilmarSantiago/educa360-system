/**
 * USERS ROUTES
 * 
 * Todos los endpoints requieren autenticación y rol de administrador.
 * GET    /api/users
 * GET    /api/users/:id
 * POST   /api/users
 * PUT    /api/users/:id
 * DELETE /api/users/:id
 */

const router = require('express').Router();
const usersController = require('./users.controller');
const { authenticateToken, requireRole } = require('../../middleware/auth');
const { userValidation } = require('../../middleware/security.middleware');

const guard = [authenticateToken, requireRole('administrador')];

router.get('/',     ...guard, usersController.getAll);
router.get('/:id',  ...guard, usersController.getById);
router.post('/',    ...guard, userValidation, usersController.create);
router.put('/:id',  ...guard, userValidation, usersController.update);
router.delete('/:id', ...guard, usersController.remove);

module.exports = router;
