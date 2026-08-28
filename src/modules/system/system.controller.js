const { query } = require('../../db');
const systemService = require('./system.service');

const getAllModules = async (req, res, next) => {
    try {
        const result = await query('SELECT * FROM modules');
        const modulesMap = {};
        for (const row of result.rows) {
            modulesMap[row.name] = row;
        }
        res.json({ success: true, modules: modulesMap });
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
