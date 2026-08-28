/**
 * AUTH ROUTES
 * POST /api/login
 */

const router = require('express').Router();
const authController = require('./auth.controller');
const { loginRateLimiter, loginValidation } = require('../../middleware/security.middleware');
const { authenticateToken } = require('../../middleware/auth.js');

router.post('/login', loginRateLimiter, loginValidation, authController.login);
router.post('/generate-closure-token', authenticateToken, authController.generateClosureToken);

module.exports = router;
