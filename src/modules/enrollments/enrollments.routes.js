const express = require('express');
const router = express.Router();
const enrollmentsController = require('./enrollments.controller');
const { authenticateToken } = require('../../middleware/auth');
const { enrollmentValidation } = require('../../middleware/security.middleware');

router.post('/', authenticateToken, enrollmentValidation, enrollmentsController.create);
router.get('/', authenticateToken, enrollmentsController.getAll);
router.put('/cancel/:id', authenticateToken, enrollmentsController.cancel);
router.get('/folder/:studentId', authenticateToken, enrollmentsController.getFolder);
router.get('/check-parent/:document', authenticateToken, enrollmentsController.checkParent);
router.get('/check-student/:document', authenticateToken, enrollmentsController.checkStudent);
router.put('/transfer/:id', authenticateToken, enrollmentsController.transfer);
router.put('/withdraw/:id', authenticateToken, enrollmentsController.withdraw);
router.put('/payment-discount/:paymentId', authenticateToken, enrollmentsController.applyPaymentDiscount);

module.exports = router;
