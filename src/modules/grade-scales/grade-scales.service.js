const repo = require('./grade-scales.repository');

const getAll = () => repo.findAll();
const getById = (id) => {
    const item = repo.findById(id);
    if (!item) { const e = new Error('Escala no encontrada.'); e.statusCode = 404; throw e; }
    return item;
};
const create = (data) => repo.create(data);
const update = (id, data) => {
    const updated = repo.update(id, data);
    if (!updated) { const e = new Error('Escala no encontrada.'); e.statusCode = 404; throw e; }
    return updated;
};
const remove = (id) => {
    const scale = repo.findById(id);
    if (!scale) { const e = new Error('Escala no encontrada.'); e.statusCode = 404; throw e; }
    if (scale.isDefault || scale.isActive) { const e = new Error('No se puede eliminar una escala de notas activa o por defecto.'); e.statusCode = 400; throw e; }
    if (!repo.remove(id)) { const e = new Error('Escala no encontrada.'); e.statusCode = 404; throw e; }
    return true;
};
module.exports = { getAll, getById, create, update, remove };
