const { getConfig, saveConfig } = require('../../db/localDb');

const findAll = () => getConfig().grades || [];

const findById = (id) => {
    const { grades = [] } = getConfig();
    return grades.find(g => g.id == id) || null;
};

const create = (data) => {
    const config = getConfig();
    config.grades = config.grades || [];
    const maxId = config.grades.reduce((m, g) => (g.id > m ? g.id : m), 0);
    const newGrade = { ...data, id: maxId + 1, sections: data.sections || [] };
    config.grades.push(newGrade);
    saveConfig(config);
    return newGrade;
};

const update = (id, data) => {
    const config = getConfig();
    config.grades = config.grades || [];
    const idx = config.grades.findIndex(g => g.id == id);
    if (idx === -1) return null;
    config.grades[idx] = { ...config.grades[idx], ...data, id: Number(id) };
    saveConfig(config);
    return config.grades[idx];
};

const remove = (id) => {
    const config = getConfig();
    const before = (config.grades || []).length;
    config.grades = (config.grades || []).filter(g => g.id != id);
    if (config.grades.length === before) return false;
    saveConfig(config);
    return true;
};

module.exports = { findAll, findById, create, update, remove };
