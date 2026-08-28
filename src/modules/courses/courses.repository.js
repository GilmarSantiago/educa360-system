const { getConfig, saveConfig } = require('../../db/localDb');

const getAll = () => {
    const config = getConfig();
    return config.courses || [];
};

const getById = (id) => {
    const courses = getAll();
    return courses.find(c => c.id == id);
};

const create = (data) => {
    const config = getConfig();
    const newCourse = {
        id: Date.now(),
        ...data
    };
    if (!config.courses) config.courses = [];
    config.courses.push(newCourse);
    saveConfig(config);
    return newCourse;
};

const update = (id, data) => {
    const config = getConfig();
    const index = config.courses.findIndex(c => c.id == id);
    if (index === -1) throw new Error('Curso no encontrado');
    
    config.courses[index] = { ...config.courses[index], ...data };
    saveConfig(config);
    return config.courses[index];
};

const remove = (id) => {
    const config = getConfig();
    config.courses = config.courses.filter(c => c.id != id);
    saveConfig(config);
};

module.exports = { getAll, getById, create, update, remove };
