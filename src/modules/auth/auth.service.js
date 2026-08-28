const jwt = require('jsonwebtoken');
const { findByCredentials, getModulesForRole } = require('./auth.repository');
const { query } = require('../../db');

const SECRET_KEY = process.env.JWT_SECRET || 'educa360_secret_key';

const login = async (usernameOrEmail, password) => {
    const user = await findByCredentials(usernameOrEmail, password);

    if (!user) {
        const error = new Error('Usuario o contraseña incorrectos.');
        error.statusCode = 401; 
        throw error;
    }

    const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role, name: user.name },
        SECRET_KEY,
        { expiresIn: '2h' } 
    );

    const modules = await getModulesForRole(user.role);

    return {
        token,
        role: user.role,
        name: user.name,
        avatar: user.avatar || null,
        modules,
        canGenerateTokens: user.canGenerateTokens || false
    };
};

const generateClosureToken = async (userId) => {
    const resUser = await query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = resUser.rows[0];
    
    if (!user || !user.canGenerateTokens) {
        const error = new Error('No tienes permiso para generar tokens de autorización.');
        error.statusCode = 403; 
        throw error;
    }

    const token = Math.floor(100000 + Math.random() * 900000).toString(); 
    
    // Cleanup old tokens
    await query('DELETE FROM "closureTokens" WHERE "generatedBy" = $1', [userId]);
    
    const expiresAt = new Date(Date.now() + 60000);
    await query(
        'INSERT INTO "closureTokens" (token, "generatedBy", "expiresAt") VALUES ($1, $2, $3)', 
        [token, userId, expiresAt]
    );
    
    return token;
};

module.exports = { login, generateClosureToken };
