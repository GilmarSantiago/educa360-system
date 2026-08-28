const { getConfig, saveConfig } = require('../../db/localDb');

const findAll = (filters = {}) => {
    let { schedules = [] } = getConfig();
    if (filters.gradeId) schedules = schedules.filter(s => s.gradeId == filters.gradeId);
    if (filters.section) schedules = schedules.filter(s => s.section === filters.section);
    if (filters.day) schedules = schedules.filter(s => s.day === filters.day);
    return schedules;
};

const findById = (id) => {
    const { schedules = [] } = getConfig();
    return schedules.find(s => s.id == id) || null;
};

const create = (data) => {
    const config = getConfig();
    config.schedules = config.schedules || [];
    const maxId = config.schedules.reduce((m, s) => (s.id > m ? s.id : m), 0);
    const newSchedule = { ...data, id: maxId + 1 };
    config.schedules.push(newSchedule);
    saveConfig(config);
    return newSchedule;
};

const update = (id, data) => {
    const config = getConfig();
    config.schedules = config.schedules || [];
    const idx = config.schedules.findIndex(s => s.id == id);
    if (idx === -1) return null;
    config.schedules[idx] = { ...config.schedules[idx], ...data, id: Number(id) };
    saveConfig(config);
    return config.schedules[idx];
};

const remove = (id) => {
    const config = getConfig();
    const before = (config.schedules || []).length;
    config.schedules = (config.schedules || []).filter(s => s.id != id);
    if (config.schedules.length === before) return false;
    saveConfig(config);
    return true;
};

module.exports = { findAll, findById, create, update, remove };
