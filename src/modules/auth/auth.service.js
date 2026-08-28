/**
 * AUTH SERVICE
 * 
 * Lógica de negocio central para el proceso de autenticación.
 * Se encarga de validar usuarios, generar tokens JWT y resolver permisos/módulos.
 */

const jwt = require('jsonwebtoken');
const { findByCredentials, getModulesForRole } = require('./auth.repository');

// Clave secreta para firmar los tokens JWT (obtenida del entorno o un valor por defecto)
const SECRET_KEY = process.env.JWT_SECRET || 'educa360_secret_key';

/**
 * Procesa el inicio de sesión de un usuario.
 * @param {string} usernameOrEmail - Nombre de usuario o correo.
 * @param {string} password - Contraseña en texto plano a verificar.
 * @returns {Object} Datos de la sesión del usuario, incluyendo el token JWT.
 */
const login = (usernameOrEmail, password) => {
    // Buscar en la BD si existe el usuario y si coincide la contraseña (posiblemente hasheada en repository)
    const user = findByCredentials(usernameOrEmail, password);

    if (!user) {
        const error = new Error('Usuario o contraseña incorrectos.');
        error.statusCode = 401; // Unauthorized
        throw error;
    }

    // Generar el token JWT que el frontend usará para hacer peticiones a rutas protegidas
    const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role, name: user.name },
        SECRET_KEY,
        { expiresIn: '2h' } // El token expira en 2 horas
    );

    // Obtener los módulos/menús a los que el rol de este usuario tiene acceso
    const modules = getModulesForRole(user.role);

    return {
        token,
        role: user.role,
        name: user.name,
        avatar: user.avatar || null,
        modules,
        canGenerateTokens: user.canGenerateTokens || false
    };
};

const { getConfig, saveConfig } = require('../../db/localDb');

/**
 * Genera un código (token) temporal de 6 dígitos que un administrador
 * puede crear para aprobar operaciones sensibles (ej. cierres de caja).
 * @param {string} userId - ID del usuario que solicita generar el token.
 * @returns {string} El token numérico de 6 dígitos.
 */
const generateClosureToken = (userId) => {
    const { findById } = require('../users/users.repository');
    const user = findById(userId);
    
    // Verificar que el usuario tenga los privilegios necesarios
    if (!user || !user.canGenerateTokens) {
        const error = new Error('No tienes permiso para generar tokens de autorización.');
        error.statusCode = 403; // Forbidden
        throw error;
    }

    // Generar un código aleatorio de 6 dígitos (ej. 485912)
    const token = Math.floor(100000 + Math.random() * 900000).toString(); 
    
    // Guardar en la configuración general (o BD) la lista de tokens temporales
    const config = getConfig();
    if (!config.closureTokens) config.closureTokens = [];
    
    // Eliminar tokens previos de este usuario que aún no hayan expirado para evitar acumulación
    config.closureTokens = config.closureTokens.filter(t => t.userId !== userId && t.expiresAt > Date.now());
    
    // Agregar el nuevo token, con un tiempo de vida corto (1 minuto = 60000 ms)
    config.closureTokens.push({
        token,
        userId,
        expiresAt: Date.now() + 60000 // 1 minute
    });
    
    saveConfig(config);
    return token;
};

module.exports = { login, generateClosureToken };
