const mkController = require('../../shared/crud.controller');
module.exports = mkController(require('./courses.service'), 'courses');
