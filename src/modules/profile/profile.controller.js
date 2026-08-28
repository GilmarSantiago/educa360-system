/**
 * PROFILE CONTROLLER
 * 
 * Maneja las peticiones HTTP para el perfil del usuario autenticado.
 */

const profileService = require('./profile.service');

const getProfile = (req, res) => {
    try {
        const user = profileService.getProfile(req.user.id);
        res.json({ success: true, user });
    } catch (err) {
        res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
};

const updateProfile = (req, res) => {
    try {
        const { user, requiresReauth } = profileService.updateProfile(req.user.id, req.body, req.file);
        res.json({ success: true, requiresReauth, avatar: user.avatar || null });
    } catch (err) {
        res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
};

module.exports = { getProfile, updateProfile };
