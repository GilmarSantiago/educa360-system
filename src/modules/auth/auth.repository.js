/**
 * AUTH REPOSITORY
 * 
 * Acceso a datos para autenticación.
 * Capa que interactúa directamente con localDb (hoy) o PostgreSQL (futuro).
 */

const bcrypt = require('bcryptjs');
const { getConfig } = require('../../db/localDb');

/**
 * Busca un usuario por username o email, y valida la contraseña.
 * @returns {Object|null} El usuario encontrado o null.
 */
const findByCredentials = (usernameOrEmail, password) => {
    const config = getConfig();
    const user = config.users.find(
        u => (u.username === usernameOrEmail || u.email === usernameOrEmail)
    );

    if (user && bcrypt.compareSync(password, user.password)) {
        if (user.status === 'bloqueado') {
            throw new Error('Esta cuenta ha sido bloqueada automáticamente por no tener alumnos con matrícula activa en el año escolar actual.');
        }
        return user;
    }
    
    return null;
};

/**
 * Obtiene los módulos asignados a un rol.
 * @param {string} role
 * @returns {Array} Lista de módulos con id, name, icon y category.
 */
const getModulesForRole = (role) => {
    const config = getConfig();
    const roleData = config.roles[role] || { modules: [] };
    return roleData.modules.map(modId => ({
        id: modId,
        ...(config.modules[modId] || { name: modId, icon: 'fas fa-cube' }),
    }));
};

module.exports = { findByCredentials, getModulesForRole };
