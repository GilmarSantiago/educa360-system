/**
 * MULTER CONFIGURATION
 * 
 * Centraliza las instancias de multer para la subida de archivos.
 * - uploadAvatar: para fotos de perfil de usuarios.
 * - uploadSchoolLogo: para el logo de la institución.
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const IMAGE_FILTER = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten archivos de imagen.'), false);
    }
};

const FILE_LIMIT = { fileSize: 5 * 1024 * 1024 }; // 5MB

// ─── Avatar de Usuario ────────────────────────────────────────────────────────
const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '..', '..', 'public', 'uploads', 'avatars');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || '.jpg';
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `user-${req.user.id}-${uniqueSuffix}${ext}`);
    },
});

const uploadAvatar = multer({
    storage: avatarStorage,
    limits: FILE_LIMIT,
    fileFilter: IMAGE_FILTER,
});

// ─── Logo de Institución ──────────────────────────────────────────────────────
const schoolLogoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '..', '..', 'public', 'uploads', 'school');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || '.png';
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `logo-${uniqueSuffix}${ext}`);
    },
});

const uploadSchoolLogo = multer({
    storage: schoolLogoStorage,
    limits: FILE_LIMIT,
    fileFilter: IMAGE_FILTER,
});

module.exports = { uploadAvatar, uploadSchoolLogo };
