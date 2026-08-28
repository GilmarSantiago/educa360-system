const express = require('express');
const router = express.Router();
const rolesController = require('./roles.controller');

router.get('/', rolesController.getAll);
router.put('/:id', rolesController.update);
router.delete('/:id', rolesController.remove);

module.exports = router;
