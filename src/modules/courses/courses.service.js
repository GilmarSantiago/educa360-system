const repo = require('./courses.repository');

const getAll = () => repo.getAll();
const getById = (id) => repo.getById(id);
const create = (data) => repo.create(data);
const update = (id, data) => repo.update(id, data);
const remove = (id) => repo.remove(id);

module.exports = { getAll, getById, create, update, remove };
