const svc = require('./schedules.service');
const wrap = (fn) => async (req, res) => {
    try { await fn(req, res); } catch (e) { res.status(e.statusCode || 500).json({ success: false, message: e.message }); }
};
module.exports = {
    getAll:  wrap((req, res) => res.json({ success: true, schedules: svc.getAll(req.query) })),
    getById: wrap((req, res) => res.json({ success: true, schedule: svc.getById(req.params.id) })),
    create:  wrap((req, res) => res.status(201).json({ success: true, schedule: svc.create(req.body) })),
    update:  wrap((req, res) => res.json({ success: true, schedule: svc.update(req.params.id, req.body) })),
    remove:  wrap((req, res) => { svc.remove(req.params.id); res.json({ success: true, message: 'Horario eliminado.' }); }),
};
