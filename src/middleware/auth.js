/**
 * MIDDLEWARE: JWT Authentication
 * 
 * Verifica el token Bearer en el header Authorization.
 * Si es válido, adjunta el payload decodificado en req.user.
 */

const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET || 'educa360_secret_key';

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Token no proporcionado.' });
    }

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            const message = err.name === 'TokenExpiredError' 
                ? 'Su sesión ha expirado. Por favor, inicie sesión de nuevo.' 
                : 'Token inválido.';
            return res.status(403).json({ success: false, message });
        }
        req.user = user;
        next();
    });
};

/**
 * Middleware para restringir acceso a un rol específico.
 * @param {...string} roles - Roles permitidos.
 */
const requireRole = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
        return res.status(403).json({ success: false, message: 'Acceso denegado. Permisos insuficientes.' });
    }
    next();
};

module.exports = { authenticateToken, requireRole };
