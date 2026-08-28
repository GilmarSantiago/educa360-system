const rolesRepository = require('./roles.repository');

const getAllRoles = async () => {
    return await rolesRepository.getAll();
};

const updateRolePermissions = async (id, modules, newId = null) => {
    return await rolesRepository.update(id, { modules, newId });
};

const deleteRole = async (id) => {
    return await rolesRepository.remove(id);
};

module.exports = { getAllRoles, updateRolePermissions, deleteRole };
