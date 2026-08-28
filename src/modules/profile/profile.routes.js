/**
 * PROFILE ROUTES
 * 
 * GET /api/profile    — obtiene el perfil del usuario autenticado
 * PUT /api/profile    — actualiza el perfil (con subida de avatar)
 */

const router = require('express').Router();
const profileController = require('./profile.controller');
const { authenticateToken } = require('../../middleware/auth');
const { uploadAvatar } = require('../../config/multer');

router.get('/', authenticateToken, profileController.getProfile);
router.put('/', authenticateToken, uploadAvatar.single('avatarFile'), profileController.updateProfile);

module.exports = router;
