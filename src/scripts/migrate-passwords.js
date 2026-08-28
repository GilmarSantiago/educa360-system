const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'config.json');

const migrate = () => {
    try {
        console.log('Iniciando migración de contraseñas...');
        const data = fs.readFileSync(DB_PATH, 'utf8');
        const config = JSON.parse(data);

        let migratedCount = 0;
        config.users.forEach(user => {
            // Si la contraseña no parece un hash de bcrypt (comienzan con $2a$ o $2b$), la hasheamos
            if (user.password && !user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
                console.log(`Hasheando contraseña para el usuario: ${user.username}`);
                user.password = bcrypt.hashSync(user.password, 10);
                migratedCount++;
            }
        });

        if (migratedCount > 0) {
            fs.writeFileSync(DB_PATH, JSON.stringify(config, null, 4));
            console.log(`Migración completada. Se actualizaron ${migratedCount} usuarios.`);
        } else {
            console.log('No se encontraron contraseñas pendientes de migrar.');
        }
    } catch (err) {
        console.error('Error durante la migración:', err.message);
    }
};

migrate();
