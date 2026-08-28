const usersService = require('./users.service');

const getAll = async (req, res) => {
    try {
        const users = await usersService.getAllUsers();
        res.json({ success: true, users });
    } catch (err) {
        res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
};

const getById = async (req, res) => {
    try {
        const user = await usersService.getUserById(req.params.id);
        res.json({ success: true, user });
    } catch (err) {
        res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
};

const create = async (req, res) => {
    try {
        const user = await usersService.createUser(req.body);
        res.status(201).json({ success: true, user });
    } catch (err) {
        res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
};

const update = async (req, res) => {
    try {
        const user = await usersService.updateUser(req.params.id, req.body);
        res.json({ success: true, user });
    } catch (err) {
        res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
};

const remove = async (req, res) => {
    try {
        await usersService.deleteUser(req.params.id, req.user.id);
        res.json({ success: true, message: 'Usuario eliminado correctamente.' });
    } catch (err) {
        res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
};

module.exports = { getAll, getById, create, update, remove };
