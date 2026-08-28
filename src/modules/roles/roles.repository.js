const { getConfig, saveConfig } = require('../../db/localDb');

const getAll = async () => {
    const config = getConfig();
    // Transformamos el objeto de roles en un array para el frontend
    return Object.entries(config.roles).map(([id, data]) => ({
        id,
        ...data
    }));
};

const update = async (id, data) => {
    const config = getConfig();
    // Si el ID cambió (renombrar), manejamos la lógica
    if (data.newId && data.newId !== id) {
        config.roles[data.newId] = config.roles[id] || { modules: [] };
        if (config.roles[id]) delete config.roles[id];
        id = data.newId;
    }

    if (!config.roles[id]) {
        config.roles[id] = { modules: [] };
    }
    
    if (data.modules) config.roles[id].modules = data.modules;
    
    saveConfig(config);
    return { id, ...config.roles[id] };
};

const remove = async (id) => {
    const config = getConfig();
    if (config.roles[id]) {
        delete config.roles[id];
        saveConfig(config);
        return true;
    }
    return false;
};

module.exports = { getAll, update, remove };
