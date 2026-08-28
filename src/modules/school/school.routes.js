/**
 * SCHOOL ROUTES
 * 
 * GET /api/school  — obtiene la configuración institucional
 * PUT /api/school  — actualiza la configuración (con subida de logo)
 */

const router = require('express').Router();
const schoolController = require('./school.controller');
const { authenticateToken, requireRole } = require('../../middleware/auth');
const { uploadSchoolLogo } = require('../../config/multer');

const guard = [authenticateToken, requireRole('administrador')];

router.get('/', authenticateToken, schoolController.getSchool);
router.put('/', ...guard, uploadSchoolLogo.single('logoFile'), schoolController.updateSchool);

module.exports = router;
