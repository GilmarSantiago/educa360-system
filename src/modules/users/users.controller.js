/**
 * USERS CONTROLLER
 * 
 * Maneja las peticiones HTTP para la gestión de usuarios.
 */

const usersService = require('./users.service');

const getAll = (req, res) => {
    try {
        const users = usersService.getAllUsers();
        res.json({ success: true, users });
    } catch (err) {
        res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
};

const getById = (req, res) => {
    try {
        const user = usersService.getUserById(req.params.id);
        res.json({ success: true, user });
    } catch (err) {
        res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
};

const create = (req, res) => {
    try {
        const user = usersService.createUser(req.body);
        res.status(201).json({ success: true, user });
    } catch (err) {
        res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
};

const update = (req, res) => {
    try {
        const user = usersService.updateUser(req.params.id, req.body);
        res.json({ success: true, user });
    } catch (err) {
        res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
};

const remove = (req, res) => {
    try {
        usersService.deleteUser(req.params.id, req.user.id);
        res.json({ success: true, message: 'Usuario eliminado correctamente.' });
    } catch (err) {
        res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
};

module.exports = { getAll, getById, create, update, remove };
