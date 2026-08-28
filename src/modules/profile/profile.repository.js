/**
 * PROFILE REPOSITORY
 * 
 * Acceso a datos para el perfil del usuario autenticado.
 */

const { getConfig, saveConfig } = require('../../db/localDb');

const findById = (id) => {
    const { users } = getConfig();
    return users.find(u => u.id == id) || null;
};

const update = (id, data) => {
    const config = getConfig();
    const index = config.users.findIndex(u => u.id == id);
    if (index === -1) return null;
    config.users[index] = { ...config.users[index], ...data };
    saveConfig(config);
    return config.users[index];
};

module.exports = { findById, update };
