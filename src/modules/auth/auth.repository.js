const bcrypt = require('bcryptjs');
const { query } = require('../../db');

const findByCredentials = async (usernameOrEmail, password) => {
    const res = await query('SELECT * FROM users WHERE username = $1 OR email = $1', [usernameOrEmail]);
    const user = res.rows[0];

    if (user && bcrypt.compareSync(password, user.password)) {
        if (user.status === 'bloqueado') {
            throw new Error('Esta cuenta ha sido bloqueada automáticamente por no tener alumnos con matrícula activa en el año escolar actual.');
        }
        return user;
    }
    
    return null;
};

const getModulesForRole = async (roleName) => {
    // We join roles and modules? No, modules are stored in a jsonb array.
    const resRole = await query('SELECT modules FROM roles WHERE name = $1', [roleName]);
    if (!resRole.rows[0]) return [];

    const moduleIds = resRole.rows[0].modules || [];
    
    const modulesRes = await query('SELECT * FROM modules');
    const modulesMap = {};
    for (const m of modulesRes.rows) {
        modulesMap[m.name] = m;
    }

    return moduleIds.map(modId => ({
        id: modId,
        ...(modulesMap[modId] || { name: modId, icon: 'fas fa-cube' }),
    }));
};

module.exports = { findByCredentials, getModulesForRole };
