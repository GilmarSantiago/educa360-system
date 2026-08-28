const repo = require('./grades.repository');

const getAll = () => repo.findAll();
const getById = async (id) => {
    const item = repo.findById(id);
    if (!item) { const e = new Error('Grado no encontrado.'); e.statusCode = 404; throw e; }
    return item;
};
const create = async (data) => {
    if (data.sections && typeof data.sections === 'string') {
        data.sections = data.sections.split(',').map(s => s.trim()).filter(Boolean);
    }
    return repo.create(data);
};
const update = async (id, data) => {
    if (data.sections && typeof data.sections === 'string') {
        data.sections = data.sections.split(',').map(s => s.trim()).filter(Boolean);
    }
    const updated = repo.update(id, data);
    if (!updated) { const e = new Error('Grado no encontrado.'); e.statusCode = 404; throw e; }
    return updated;
};
const remove = async (id) => {
    if (!repo.remove(id)) { const e = new Error('Grado no encontrado.'); e.statusCode = 404; throw e; }
    return true;
};
module.exports = { getAll, getById, create, update, remove };
