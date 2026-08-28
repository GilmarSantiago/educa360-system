/**
 * CAPA DE BASE DE DATOS DUAL (POSTGRESQL + JSON FALLBACK)
 * 
 * Este archivo implementa un driver de base de datos híbrido para Educa360:
 * 1. Inicialización Asíncrona (`initDb`): Carga los datos de PostgreSQL local o nube a una caché en memoria.
 * 2. Auto-Migración: Si se conecta a una base de datos PostgreSQL vacía por primera vez, migra automáticamente 'config.json' a la BD.
 * 3. Fallback Seguro: Si PostgreSQL no está disponible o falla al conectar, se recupera automáticamente usando el archivo 'config.json'.
 * 4. Compatibilidad Síncrona: Permite que `getConfig()` y `saveConfig(config)` sigan funcionando sincrónicamente para evitar reescribir los repositorios.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'config.json');

// Estado y Caché de la base de datos
let cachedConfig = null;
let usePostgres = false;
let dbPool = null;

/**
 * Inicializa la conexión a la base de datos y precarga los datos en caché.
 */
const initDb = async () => {
    if (process.env.USE_POSTGRES === 'false') {
        console.log('📂 [localDb] PostgreSQL desactivado mediante .env. Usando archivo JSON local.');
        loadFromJsonFile();
        return;
    }

    try {
        console.log('🔌 [localDb] Intentando conectar a PostgreSQL...');
        
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
        usePostgres = true;
        console.log('✅ [localDb] Conexión establecida con PostgreSQL de forma exitosa.');

        // Asegurar la tabla de configuración
        await dbPool.query(`
            CREATE TABLE IF NOT EXISTS system_config (
                id INT PRIMARY KEY,
                data JSONB NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Comprobar si ya existen datos migrados
        const res = await dbPool.query('SELECT data FROM system_config WHERE id = 1');
        
        if (res.rowCount > 0) {
            console.log('📖 [localDb] Cargando datos del sistema desde PostgreSQL.');
            cachedConfig = res.rows[0].data;
        } else {
            console.log('📂 [localDb] Base de datos PostgreSQL vacía. Iniciando auto-migración desde config.json...');
            const configJson = loadFromJsonFile();
            
            await dbPool.query(`
                INSERT INTO system_config (id, data)
                VALUES ($1, $2)
                ON CONFLICT (id)
                DO UPDATE SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP
            `, [1, JSON.stringify(configJson)]);
            
            console.log('✅ [localDb] Auto-migración a PostgreSQL realizada con éxito.');
        }
    } catch (err) {
        console.warn(`⚠️ [localDb] No se pudo conectar a PostgreSQL: ${err.message}`);
        console.warn('📁 [localDb] Iniciando en modo legacy usando el archivo config.json local.');
        usePostgres = false;
        if (dbPool) {
            dbPool.end().catch(() => {});
        }
        loadFromJsonFile();
    }
};

/**
 * Lee el archivo JSON local para fallback
 */
const loadFromJsonFile = () => {
    try {
        const data = fs.readFileSync(DB_PATH, 'utf8');
        cachedConfig = JSON.parse(data);
        return cachedConfig;
    } catch (err) {
        console.error('❌ [localDb] Error leyendo config desde archivo JSON:', err.message);
        cachedConfig = { users: [], roles: {}, modules: {}, school: {}, financialConcepts: [] };
        return cachedConfig;
    }
};

/**
 * Lee y retorna el objeto completo de la base de datos desde la caché.
 * @returns {Object} El objeto completo del sistema.
 */
const getConfig = () => {
    if (!cachedConfig) {
        console.warn('⚠️ [localDb] getConfig() llamado antes de initDb(). Cargando JSON de emergencia.');
        loadFromJsonFile();
    }
    return cachedConfig;
};

/**
 * Serializa y guarda la configuración del sistema.
 * @param {Object} config El objeto completo a guardar.
 */
const saveConfig = (config) => {
    try {
        cachedConfig = config;

        if (usePostgres && dbPool) {
            // Guardar asíncronamente en PostgreSQL en segundo plano para no bloquear peticiones Express
            dbPool.query(`
                INSERT INTO system_config (id, data)
                VALUES ($1, $2)
                ON CONFLICT (id)
                DO UPDATE SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP
            `, [1, JSON.stringify(config)])
            .catch(err => {
                console.error('❌ [localDb] Error en segundo plano guardando a PostgreSQL:', err.message);
            });
        } else {
            // Guardar sincrónicamente en config.json (comportamiento clásico)
            fs.writeFileSync(DB_PATH, JSON.stringify(config, null, 4));
        }
    } catch (err) {
        console.error('❌ [localDb] Error escribiendo base de datos:', err.message);
        throw new Error('No se pudo guardar la información en la base de datos.');
    }
};

module.exports = { initDb, getConfig, saveConfig };
