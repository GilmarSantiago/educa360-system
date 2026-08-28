const { getConfig, saveConfig } = require('../../db/localDb');

const findAll = () => getConfig().gradeScales || [];

const findById = (id) => {
    const { gradeScales = [] } = getConfig();
    return gradeScales.find(s => s.id == id) || null;
};

const create = (data) => {
    const config = getConfig();
    config.gradeScales = config.gradeScales || [];
    const maxId = config.gradeScales.reduce((m, s) => (s.id > m ? s.id : m), 0);
    const newScale = { ...data, id: maxId + 1 };
    config.gradeScales.push(newScale);
    saveConfig(config);
    return newScale;
};

const update = (id, data) => {
    const config = getConfig();
    config.gradeScales = config.gradeScales || [];
    const idx = config.gradeScales.findIndex(s => s.id == id);
    if (idx === -1) return null;
    config.gradeScales[idx] = { ...config.gradeScales[idx], ...data, id: Number(id) };
    saveConfig(config);
    return config.gradeScales[idx];
};

const remove = (id) => {
    const config = getConfig();
    const before = (config.gradeScales || []).length;
    config.gradeScales = (config.gradeScales || []).filter(s => s.id != id);
    if (config.gradeScales.length === before) return false;
    saveConfig(config);
    return true;
};

module.exports = { findAll, findById, create, update, remove };
