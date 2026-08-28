/**
 * SERVER BOOTSTRAP (Punto de Entrada del Servidor)
 * 
 * Este archivo es el punto de inicio del proceso de Node.js.
 * Su responsabilidad principal es preparar el entorno y levantar el servidor HTTP.
 * Pasos que realiza:
 * 1. Establecer la zona horaria.
 * 2. Inicializar la base de datos.
 * 3. Iniciar el servidor Express para que escuche en el puerto definido.
 */

// Forzar la zona horaria del sistema a Perú ('America/Lima') para tener consistencia en el manejo de fechas
process.env.TZ = 'America/Lima';

// Importa la instancia de la aplicación Express ya configurada con rutas y middlewares
const app = require('./src/app');

// Importa la función encargada de inicializar el pool de la base de datos
const { initDb } = require('./src/db');

// Define el puerto donde correrá el servidor (variable de entorno PORT o por defecto 5000)
const PORT = process.env.PORT || 5000;

// Inicializar la base de datos antes de arrancar el servidor HTTP
initDb().then(() => {
    // Una vez que la BD responde correctamente, arranca el servidor web
    app.listen(PORT, () => {
        console.log(`✅ Servidor Educa360 corriendo en http://localhost:${PORT}`);
    });
}).catch(err => {
    // Si la base de datos falla al iniciar, capturamos el error y abortamos la ejecución de la app
    console.error('❌ Error fatal inicializando la base de datos:', err);
    process.exit(1); // Finaliza el proceso con código de error 1
});
