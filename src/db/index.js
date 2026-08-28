const { Pool } = require('pg');
require('dotenv').config();

let dbPool = null;

const initDb = async () => {
    try {
        console.log('🔌 [Database] Intentando conectar a PostgreSQL (Relacional)...');
        
        const poolConfig = process.env.DATABASE_URL
            ? {
                connectionString: process.env.DATABASE_URL,
                connectionTimeoutMillis: 4000
            }
            : {
                user: process.env.DB_USER || 'postgres',
                password: process.env.DB_PASSWORD || 'postgres',
                host: process.env.DB_HOST || 'localhost',
                port: Number(process.env.DB_PORT) || 5432,
                database: process.env.DB_DATABASE || 'educa360',
                connectionTimeoutMillis: 4000
            };

        dbPool = new Pool(poolConfig);

        // Probar conexión básica
        await dbPool.query('SELECT 1');
        console.log('✅ [Database] Conexión establecida con PostgreSQL exitosamente.');
    } catch (err) {
        console.error(`❌ [Database] No se pudo conectar a PostgreSQL: ${err.message}`);
        process.exit(1);
    }
};

/**
 * Ejecuta una consulta SQL en la base de datos.
 * @param {string} text Sentencia SQL
 * @param {Array} params Parámetros para la consulta
 * @returns {Promise<any>} Resultado de la consulta
 */
const query = async (text, params) => {
    if (!dbPool) {
        throw new Error('La base de datos no ha sido inicializada. Llama a initDb() primero.');
    }
    return dbPool.query(text, params);
};

module.exports = { initDb, query };
