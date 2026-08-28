const mkController = require('../../shared/crud.controller');
module.exports = mkController(require('./grades.service'), 'grades');
