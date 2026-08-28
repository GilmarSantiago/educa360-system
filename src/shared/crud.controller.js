const mkController = (svc, key) => {
    const wrap = (fn) => async (req, res) => {
        try { await fn(req, res); }
        catch (e) { res.status(e.statusCode || 500).json({ success: false, message: e.message }); }
    };
    return {
        getAll:  wrap((req, res) => res.json({ success: true, [key]: svc.getAll() })),
        getById: wrap((req, res) => res.json({ success: true, [key.slice(0,-1)]: svc.getById(req.params.id) })),
        create:  wrap((req, res) => res.status(201).json({ success: true, [key.slice(0,-1)]: svc.create(req.body) })),
        update:  wrap((req, res) => res.json({ success: true, [key.slice(0,-1)]: svc.update(req.params.id, req.body) })),
        remove:  wrap((req, res) => { svc.remove(req.params.id); res.json({ success: true, message: 'Eliminado correctamente.' }); }),
    };
};

// Each module exports its own controller using this factory
module.exports = mkController;
