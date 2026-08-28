const express = require('express');
const router = express.Router();
const systemController = require('./system.controller');

const { authenticateToken } = require('../../middleware/auth');

router.get('/modules', systemController.getAllModules);
// router.get('/dni/:dni', authenticateToken, systemController.getDniData);

module.exports = router;
