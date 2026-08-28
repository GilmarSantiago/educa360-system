const { getConfig } = require('../../db/localDb');
const systemService = require('./system.service');

const getAllModules = async (req, res, next) => {
    try {
        const config = getConfig();
        res.json({ success: true, modules: config.modules });
    } catch (err) { next(err); }
};

const getDniData = async (req, res, next) => {
    try {
        const { dni } = req.params;
        const data = await systemService.getDniData(dni);
        res.json({ success: true, data });
    } catch (err) { 
        res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
};

module.exports = { getAllModules, getDniData };
