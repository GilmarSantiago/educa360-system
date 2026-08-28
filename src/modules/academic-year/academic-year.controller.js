const svc = require('./academic-year.service');

const wrap = (fn) => async (req, res) => {
    try { await fn(req, res); } catch (e) { res.status(e.statusCode || 500).json({ success: false, message: e.message }); }
};

const getAll  = wrap((req, res) => res.json({ success: true, academicYears: svc.getAll() }));
const getById = wrap((req, res) => res.json({ success: true, academicYear: svc.getById(req.params.id) }));
const create  = wrap((req, res) => res.status(201).json({ success: true, academicYear: svc.create(req.body) }));
const update  = wrap((req, res) => res.json({ success: true, academicYear: svc.update(req.params.id, req.body) }));
const remove  = wrap((req, res) => { svc.remove(req.params.id); res.json({ success: true, message: 'Año escolar eliminado.' }); });

const addPeriod    = wrap((req, res) => res.status(201).json({ success: true, period: svc.addPeriod(req.params.id, req.body) }));
const updatePeriod = wrap((req, res) => res.json({ success: true, period: svc.updatePeriod(req.params.id, req.params.periodId, req.body) }));
const removePeriod = wrap((req, res) => { svc.removePeriod(req.params.id, req.params.periodId); res.json({ success: true, message: 'Periodo eliminado.' }); });

module.exports = { getAll, getById, create, update, remove, addPeriod, updatePeriod, removePeriod };
