const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../../data/config.json');

try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    console.log(`Borrando ${config.students.length} estudiantes...`);
    config.students = [];

    console.log(`Borrando ${config.enrollments.length} inscripciones...`);
    config.enrollments = [];

    console.log(`Borrando ${config.payments.length} pagos...`);
    config.payments = [];

    // Opcional: Borrar usuarios con rol 'apoderado' que fueron creados automáticamente
    const initialUserCount = config.users.length;
    config.users = config.users.filter(u => u.role !== 'apoderado' || u.id < 1000);
    console.log(`Borrando ${initialUserCount - config.users.length} usuarios (apoderados)...`);

    fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
    console.log('✅ Datos de inscripciones limpiados correctamente.');
} catch (err) {
    console.error('❌ Error al limpiar datos:', err.message);
}
