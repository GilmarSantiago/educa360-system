const rolesService = require('./roles.service');

const getAll = async (req, res, next) => {
    try {
        const roles = await rolesService.getAllRoles();
        res.json({ success: true, roles });
    } catch (err) { next(err); }
};

const update = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { modules, newId } = req.body;
        const role = await rolesService.updateRolePermissions(id, modules, newId);
        res.json({ success: true, role });
    } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
    try {
        const { id } = req.params;
        await rolesService.deleteRole(id);
        res.json({ success: true, message: 'Rol eliminado' });
    } catch (err) { next(err); }
};

module.exports = { getAll, update, remove };
