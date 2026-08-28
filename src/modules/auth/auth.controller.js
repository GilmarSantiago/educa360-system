/**
 * AUTH CONTROLLER
 * 
 * Extrae datos del request y delega la lógica al AuthService.
 */

const authService = require('./auth.service');

const login = (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Usuario y contraseña son requeridos.' });
        }
        const result = authService.login(username, password);
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
};

const generateClosureToken = (req, res) => {
    try {
        const token = authService.generateClosureToken(req.user.id);
        res.json({ success: true, token });
    } catch (err) {
        res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
};

module.exports = { login, generateClosureToken };
