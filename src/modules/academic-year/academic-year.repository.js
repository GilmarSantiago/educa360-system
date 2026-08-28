const { getConfig, saveConfig } = require('../../db/localDb');

const findAll = () => getConfig().academicYears || [];

const findById = (id) => {
    const { academicYears = [] } = getConfig();
    return academicYears.find(y => y.id == id) || null;
};

const create = (data) => {
    const config = getConfig();
    config.academicYears = config.academicYears || [];
    const maxId = config.academicYears.reduce((m, y) => (y.id > m ? y.id : m), 0);
    const newYear = { ...data, id: maxId + 1, periods: data.periods || [] };
    
    // Ensure only one active academic year
    if (newYear.isActive) {
        config.academicYears.forEach(y => y.isActive = false);
    }
    
    config.academicYears.push(newYear);
    saveConfig(config);
    return newYear;
};

const update = (id, data) => {
    const config = getConfig();
    config.academicYears = config.academicYears || [];
    const idx = config.academicYears.findIndex(y => y.id == id);
    if (idx === -1) return null;
    
    // Ensure only one active academic year
    if (data.isActive) {
        config.academicYears.forEach(y => y.isActive = false);
    }
    
    config.academicYears[idx] = { ...config.academicYears[idx], ...data, id: Number(id) };
    saveConfig(config);
    return config.academicYears[idx];
};

const remove = (id) => {
    const config = getConfig();
    const before = (config.academicYears || []).length;
    config.academicYears = (config.academicYears || []).filter(y => y.id != id);
    if (config.academicYears.length === before) return false;
    saveConfig(config);
    return true;
};

// ─── Periodos (anidados dentro del año) ──────────────────────────────────────
const addPeriod = (yearId, periodData) => {
    const config = getConfig();
    const yearIdx = (config.academicYears || []).findIndex(y => y.id == yearId);
    if (yearIdx === -1) return null;
    const periods = config.academicYears[yearIdx].periods || [];
    const maxPId = periods.reduce((m, p) => (p.id > m ? p.id : m), 0);
    const newPeriod = { ...periodData, id: maxPId + 1 };
    config.academicYears[yearIdx].periods.push(newPeriod);
    saveConfig(config);
    return newPeriod;
};

const updatePeriod = (yearId, periodId, data) => {
    const config = getConfig();
    const yearIdx = (config.academicYears || []).findIndex(y => y.id == yearId);
    if (yearIdx === -1) return null;
    const pIdx = config.academicYears[yearIdx].periods.findIndex(p => p.id == periodId);
    if (pIdx === -1) return null;
    config.academicYears[yearIdx].periods[pIdx] = { ...config.academicYears[yearIdx].periods[pIdx], ...data, id: Number(periodId) };
    saveConfig(config);
    return config.academicYears[yearIdx].periods[pIdx];
};

const removePeriod = (yearId, periodId) => {
    const config = getConfig();
    const yearIdx = (config.academicYears || []).findIndex(y => y.id == yearId);
    if (yearIdx === -1) return false;
    const before = config.academicYears[yearIdx].periods.length;
    config.academicYears[yearIdx].periods = config.academicYears[yearIdx].periods.filter(p => p.id != periodId);
    if (config.academicYears[yearIdx].periods.length === before) return false;
    saveConfig(config);
    return true;
};

module.exports = { findAll, findById, create, update, remove, addPeriod, updatePeriod, removePeriod };
