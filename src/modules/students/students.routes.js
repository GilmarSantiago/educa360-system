const express = require('express');
const router = express.Router();
const ctrl = require('./students.controller');

router.get('/', ctrl.search);
router.get('/search', ctrl.search);

module.exports = router;
