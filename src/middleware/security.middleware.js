const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

/**
 * Limitador de velocidad para intentos de inicio de sesión.
 * Previene ataques de fuerza bruta.
 */
const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // Limita a 5 intentos por IP
    message: {
        success: false,
        message: 'Demasiados intentos de inicio de sesión. Por favor, intente de nuevo en 15 minutos.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Middleware genérico para manejar errores de validación de express-validator.
 */
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array().map(err => ({ field: err.path, message: err.msg }))
        });
    }
    next();
};

/**
 * Validaciones básicas para el login.
 */
const loginValidation = [
    body('username').trim().notEmpty().withMessage('El usuario o email es requerido.'),
    body('password').notEmpty().withMessage('La contraseña es requerida.'),
    validateRequest
];

/**
 * Validaciones para Inscripciones.
 */
const enrollmentValidation = [
    body('student.name').trim().notEmpty().withMessage('El nombre del alumno es requerido.'),
    body('student.document').trim().notEmpty().withMessage('El DNI del alumno es requerido.'),
    body('parent.name').trim().notEmpty().withMessage('El nombre del apoderado es requerido.'),
    body('parent.email').isEmail().withMessage('Email del apoderado inválido.'),
    body('enrollment.gradeId').notEmpty().withMessage('El grado es requerido.'),
    body('enrollment.academicYearId').notEmpty().withMessage('El año académico es requerido.'),
    validateRequest
];

/**
 * Validaciones para Gestión de Usuarios.
 */
const userValidation = [
    body('username').trim().isLength({ min: 3 }).withMessage('El usuario debe tener al menos 3 caracteres.'),
    body('email').isEmail().withMessage('Email inválido.'),
    body('role').notEmpty().withMessage('El rol es requerido.'),
    // Password es opcional en actualizaciones, pero requerido en creación. 
    // Manejaremos la lógica específica en el controlador o service si es necesario.
    validateRequest
];

module.exports = {
    loginRateLimiter,
    loginValidation,
    enrollmentValidation,
    userValidation,
    validateRequest
};
