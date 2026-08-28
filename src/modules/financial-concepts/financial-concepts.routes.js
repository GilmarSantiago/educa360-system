const express = require('express');
const router = express.Router();
const financialConceptsController = require('./financial-concepts.controller');
const { authenticateToken, requireRole } = require('../../middleware/auth');

const adminGuard = [authenticateToken, requireRole('administrador')];

// Allow read access to all authenticated users (needed for enrollments form)
router.get('/', authenticateToken, financialConceptsController.getAll);

// Restrict modifications to administrador
router.post('/', ...adminGuard, financialConceptsController.create);
router.put('/:id', ...adminGuard, financialConceptsController.update);
router.delete('/:id', ...adminGuard, financialConceptsController.remove);

module.exports = router;
