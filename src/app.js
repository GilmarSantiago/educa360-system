/**
 * APP ENTRY POINT (Configuración Principal de Express)
 * 
 * Este archivo crea y configura la instancia de Express ('app').
 * Aquí se definen:
 * - Middlewares globales (CORS, seguridad con Helmet, parseo del body).
 * - Servido de archivos estáticos.
 * - Registro de todas las rutas (endpoints) separados por módulos (Auth, School, Users, etc.).
 * - Manejo global de errores y fallback para Single Page Applications (SPA).
 */

const express = require('express');
const cors = require('cors'); // Permite peticiones de distintos orígenes (Cross-Origin Resource Sharing)
const bodyParser = require('body-parser'); // Convierte el body de las peticiones HTTP a objetos JSON manejables
const path = require('path');

const helmet = require('helmet'); // Middleware de seguridad que configura cabeceras HTTP recomendadas

const app = express();

// ─── Middlewares Globales ─────────────────────────────────────────────────────
// helmet() protege la app estableciendo varias cabeceras HTTP de seguridad
app.use(helmet({
    contentSecurityPolicy: {
        useDefaults: true,
        directives: {
            // Reglas para restringir de dónde se pueden cargar recursos externos y scripts,
            // previniendo ataques de tipo Cross-Site Scripting (XSS).
            "script-src": ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net", "code.jquery.com"],
            "script-src-attr": ["'unsafe-inline'"],
            "style-src": ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net", "fonts.googleapis.com", "cdnjs.cloudflare.com", "ka-f.fontawesome.com"],
            "font-src": ["'self'", "fonts.gstatic.com", "cdnjs.cloudflare.com", "ka-f.fontawesome.com"],
            "img-src": ["'self'", "data:", "blob:", "ui-avatars.com"],
            "connect-src": ["'self'", "ka-f.fontawesome.com"]
        },
    },
}));

app.use(cors()); // Habilita las solicitudes de dominios externos
app.use(bodyParser.json()); // Permite que la app entienda peticiones con body en formato JSON

// Middleware: Forzar "No-cache" (útil principalmente para desarrollo y evitar información desactualizada)
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

// Servir archivos estáticos desde el directorio 'public' (CSS, JS, Imágenes del cliente)
app.use(express.static(path.join(__dirname, '..', 'public')));

// ─── Rutas de Módulos (Endpoints Principales) ─────────────────────────────────
// Cada línea monta el enrutador de un módulo en un path base particular
app.use('/api',                  require('./modules/auth/auth.routes')); // Rutas de autenticación (Login, Token)
app.use('/api/profile',          require('./modules/profile/profile.routes')); // Perfil del usuario autenticado
app.use('/api/school',           require('./modules/school/school.routes')); // Configuración y datos de la escuela
app.use('/api/users',            require('./modules/users/users.routes')); // Gestión de usuarios (Admin, etc)
app.use('/api/system',           require('./modules/system/system.routes')); // Opciones de sistema (backups, logs)

// ─── Institución: Sub-módulos (Operaciones de la Institución) ─────────────────
// Rutas enfocadas en la parte académica y administrativa de la escuela
app.use('/api/academic-years',   require('./modules/academic-year/academic-year.routes')); // Años académicos
app.use('/api/grade-scales',     require('./modules/grade-scales/grade-scales.routes')); // Escalas de notas
app.use('/api/grades',           require('./modules/grades/grades.routes')); // Notas, secciones
app.use('/api/courses',          require('./modules/courses/courses.routes')); // Gestión de cursos
app.use('/api/schedules',        require('./modules/schedules/schedules.routes')); // Horarios de clase
app.use('/api/roles',            require('./modules/roles/roles.routes')); // Roles y permisos del sistema
app.use('/api/financial-concepts', require('./modules/financial-concepts/financial-concepts.routes')); // Conceptos financieros (pagos)
app.use('/api/enrollments',      require('./modules/enrollments/enrollments.routes')); // Matrículas
app.use('/api/students',         require('./modules/students/students.routes')); // Gestión de estudiantes
app.use('/api/payments',         require('./modules/payments/payments.routes')); // Pagos y facturación
app.use('/api/cash-registers',   require('./modules/cash-registers/cash-registers.routes')); // Cajas registradoras (apertura/cierre)

// ─── SPA Fallback (Soporte para Frontend) ─────────────────────────────────────
// Retorna la página de login (index.html) para la raíz principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Middleware comodín para rutas Frontend
// Si se pide una página por GET que NO empiece con "/api/", sirve la página del dashboard
// Esto permite que el enrutamiento del lado del cliente funcione sin arrojar 404
app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api/')) {
        res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'));
    } else {
        next(); // Si es una ruta API no encontrada, continuará al middleware de error
    }
});

// ─── Manejo Global de Errores ─────────────────────────────────────────────────
// Atrapa cualquier error lanzado en las rutas mediante `next(err)` o excepciones no controladas en endpoints
app.use((err, req, res, next) => {
    console.error('[Error]', err.message);
    // Devuelve un error genérico o el específico del objeto `err` en formato JSON para el frontend
    res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Error interno del servidor.' });
});

module.exports = app;
