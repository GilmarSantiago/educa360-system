const repo = require('./academic-year.repository');

const getAll = () => repo.findAll();

const getById = async (id) => {
    const year = repo.findById(id);
    if (!year) { const e = new Error('Año escolar no encontrado.'); e.statusCode = 404; throw e; }
    return year;
};

const create = (data) => repo.create(data);

const update = async (id, data) => {
    const updated = repo.update(id, data);
    if (!updated) { const e = new Error('Año escolar no encontrado.'); e.statusCode = 404; throw e; }
    return updated;
};

const remove = async (id) => {
    const year = repo.findById(id);
    if (!year) { const e = new Error('Año escolar no encontrado.'); e.statusCode = 404; throw e; }
    if (year.isActive) { const e = new Error('No se puede eliminar un año escolar activo.'); e.statusCode = 400; throw e; }
    if (!repo.remove(id)) { const e = new Error('Año escolar no encontrado.'); e.statusCode = 404; throw e; }
    return true;
};

const addPeriod = async (yearId, data) => {
    getById(yearId); // validates year exists
    return repo.addPeriod(yearId, data);
};

const updatePeriod = async (yearId, periodId, data) => {
    const updated = repo.updatePeriod(yearId, periodId, data);
    if (!updated) { const e = new Error('Periodo no encontrado.'); e.statusCode = 404; throw e; }
    return updated;
};

const removePeriod = async (yearId, periodId) => {
    if (!repo.removePeriod(yearId, periodId)) { const e = new Error('Periodo no encontrado.'); e.statusCode = 404; throw e; }
    return true;
};

module.exports = { getAll, getById, create, update, remove, addPeriod, updatePeriod, removePeriod };
