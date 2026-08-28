const express = require('express');
const router = express.Router();
const paymentsController = require('./payments.controller');
const { authenticateToken } = require('../../middleware/auth');

router.get('/:id', authenticateToken, paymentsController.getPayment);
router.put('/:id/pay', authenticateToken, paymentsController.pay);

module.exports = router;
