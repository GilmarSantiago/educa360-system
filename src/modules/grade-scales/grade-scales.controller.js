const mkController = require('../../shared/crud.controller');
module.exports = mkController(require('./grade-scales.service'), 'gradeScales');
