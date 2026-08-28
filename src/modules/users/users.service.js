/**
 * USERS SERVICE
 * 
 * Lógica de negocio para la gestión de usuarios.
 */

const bcrypt = require('bcryptjs');
const usersRepository = require('./users.repository');

const getAllUsers = () => {
    const users = usersRepository.findAll();
    // Ocultar contraseñas en el listado masivo por seguridad
    return users.map(({ password, ...rest }) => rest);
};

const getUserById = (id) => {
    const user = usersRepository.findById(id);
    if (!user) {
        const error = new Error('Usuario no encontrado.');
        error.statusCode = 404;
        throw error;
    }
    return user;
};

const createUser = (data) => {
    if (data.password) {
        data.password = bcrypt.hashSync(data.password, 10);
    }
    return usersRepository.create(data);
};

const updateUser = (id, data) => {
    if (data.password) {
        data.password = bcrypt.hashSync(data.password, 10);
    }
    const updated = usersRepository.update(id, data);
    if (!updated) {
        const error = new Error('Usuario no encontrado.');
        error.statusCode = 404;
        throw error;
    }
    return updated;
};

const deleteUser = (id, requestingUserId) => {
    if (id == requestingUserId) {
        const error = new Error('No puedes eliminar tu propia cuenta activa.');
        error.statusCode = 400;
        throw error;
    }
    const deleted = usersRepository.remove(id);
    if (!deleted) {
        const error = new Error('Usuario no encontrado.');
        error.statusCode = 404;
        throw error;
    }
    return true;
};

module.exports = { getAllUsers, getUserById, createUser, updateUser, deleteUser };
