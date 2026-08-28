const repo = require('./schedules.repository');

const getAll = (filters) => repo.findAll(filters);
const getById = async (id) => {
    const item = repo.findById(id);
    if (!item) { const e = new Error('Horario no encontrado.'); e.statusCode = 404; throw e; }
    return item;
};
const create = (data) => repo.create(data);
const update = async (id, data) => {
    const updated = repo.update(id, data);
    if (!updated) { const e = new Error('Horario no encontrado.'); e.statusCode = 404; throw e; }
    return updated;
};
const remove = async (id) => {
    if (!repo.remove(id)) { const e = new Error('Horario no encontrado.'); e.statusCode = 404; throw e; }
    return true;
};
module.exports = { getAll, getById, create, update, remove };
