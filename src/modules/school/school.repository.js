/**
 * SCHOOL REPOSITORY
 * 
 * Acceso a datos para la configuración institucional.
 */

const { getConfig, saveConfig } = require('../../db/localDb');

const getSchool = () => {
    const config = getConfig();
    return config.school || {};
};

const updateSchool = (data) => {
    const config = getConfig();
    config.school = { ...(config.school || {}), ...data };
    saveConfig(config);
    return config.school;
};

module.exports = { getSchool, updateSchool };
