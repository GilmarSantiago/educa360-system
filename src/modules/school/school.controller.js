/**
 * SCHOOL CONTROLLER
 * 
 * Maneja las peticiones HTTP para la configuración institucional.
 */

const schoolService = require('./school.service');

const getSchool = (req, res) => {
    try {
        const school = schoolService.getSchool();
        res.json({ success: true, school });
    } catch (err) {
        res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
};

const updateSchool = (req, res) => {
    try {
        const school = schoolService.updateSchool(req.body, req.file);
        res.json({ success: true, school });
    } catch (err) {
        res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
};

module.exports = { getSchool, updateSchool };
