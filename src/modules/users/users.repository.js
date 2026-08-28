/**
 * USERS REPOSITORY
 * 
 * Operaciones CRUD sobre la colección 'users' en localDb.
 * Al migrar a PostgreSQL, solo se reescribe este archivo.
 */

const { getConfig, saveConfig } = require('../../db/localDb');

const findAll = () => {
    const { users } = getConfig();
    return users;
};

const findById = (id) => {
    const { users } = getConfig();
    return users.find(u => u.id == id) || null;
};

const create = (data) => {
    const config = getConfig();
    const maxId = config.users.reduce((max, u) => (u.id > max ? u.id : max), 0);
    const newUser = { ...data, id: maxId + 1 };
    config.users.push(newUser);
    saveConfig(config);
    return newUser;
};

const update = (id, data) => {
    const config = getConfig();
    const index = config.users.findIndex(u => u.id == id);
    if (index === -1) return null;
    config.users[index] = { ...config.users[index], ...data, id: Number(id) };
    saveConfig(config);
    return config.users[index];
};

const remove = (id) => {
    const config = getConfig();
    const initialLength = config.users.length;
    config.users = config.users.filter(u => u.id != id);
    if (config.users.length === initialLength) return false;
    saveConfig(config);
    return true;
};

module.exports = { findAll, findById, create, update, remove };
