const bcrypt = require('bcryptjs');
const usersRepository = require('./users.repository');

const getAllUsers = async () => {
    const users = await usersRepository.findAll();
    return users.map(({ password, ...rest }) => rest);
};

const getUserById = async (id) => {
    const user = await usersRepository.findById(id);
    if (!user) {
        const error = new Error('Usuario no encontrado.');
        error.statusCode = 404;
        throw error;
    }
    return user;
};

const createUser = async (data) => {
    if (data.password) {
        data.password = bcrypt.hashSync(data.password, 10);
    }
    return await usersRepository.create(data);
};

const updateUser = async (id, data) => {
    if (data.password) {
        data.password = bcrypt.hashSync(data.password, 10);
    }
    const updated = await usersRepository.update(id, data);
    if (!updated) {
        const error = new Error('Usuario no encontrado.');
        error.statusCode = 404;
        throw error;
    }
    return updated;
};

const deleteUser = async (id, requestingUserId) => {
    if (id == requestingUserId) {
        const error = new Error('No puedes eliminar tu propia cuenta activa.');
        error.statusCode = 400;
        throw error;
    }
    const deleted = await usersRepository.remove(id);
    if (!deleted) {
        const error = new Error('Usuario no encontrado.');
        error.statusCode = 404;
        throw error;
    }
    return true;
};

module.exports = { getAllUsers, getUserById, createUser, updateUser, deleteUser };
