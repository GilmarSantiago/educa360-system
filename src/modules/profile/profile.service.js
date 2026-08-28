/**
 * PROFILE SERVICE
 * 
 * Lógica de negocio para el perfil del usuario autenticado.
 */

const path = require('path');
const fs = require('fs');
const profileRepository = require('./profile.repository');

const getProfile = (userId) => {
    const user = profileRepository.findById(userId);
    if (!user) {
        const error = new Error('Usuario no encontrado.');
        error.statusCode = 404;
        throw error;
    }
    // Remove the password hash before sending to the client for security
    const userSafe = { ...user };
    delete userSafe.password;
    return userSafe;
};

const updateProfile = (userId, data, file) => {
    const oldUser = profileRepository.findById(userId);
    if (!oldUser) {
        const error = new Error('Usuario no encontrado.');
        error.statusCode = 404;
        throw error;
    }

    const updateData = { ...data };
    const bcrypt = require('bcryptjs');

    // Handle password update securely
    let requiresReauth = false;
    
    if (data.username && oldUser.username !== data.username) {
        requiresReauth = true;
    }

    if (data.password && data.password.trim() !== '') {
        // If a new password is provided, hash it
        updateData.password = bcrypt.hashSync(data.password, 10);
        requiresReauth = true;
    } else {
        // If the password field is empty, do not update the password
        delete updateData.password;
    }

    if (file) {
        updateData.avatar = '/uploads/avatars/' + file.filename;
        // Eliminar el avatar antiguo si existe en el servidor local
        if (oldUser.avatar && oldUser.avatar.startsWith('/uploads/avatars/')) {
            const oldPath = path.join(__dirname, '..', '..', '..', 'public', oldUser.avatar);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
    }

    const updatedUser = profileRepository.update(userId, updateData);
    return { user: updatedUser, requiresReauth };
};

module.exports = { getProfile, updateProfile };
