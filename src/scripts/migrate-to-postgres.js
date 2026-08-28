/**
 * SCRIPT DE MIGRACIÓN A POSTGRESQL (EDUCA360)
 * 
 * Este script se encarga de:
 * 1. Leer las credenciales de base de datos de .env.
 * 2. Conectarse a Postgres para validar si la BD 'educa360' existe; de lo contrario, la crea.
 * 3. Conectarse a la BD 'educa360' para crear la tabla 'system_config' si no existe.
 * 4. Leer 'data/config.json' e insertarlo como el registro de configuración inicial (id = 1).
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 5432;
const DB_DATABASE = process.env.DB_DATABASE || 'educa360';

const runMigration = async () => {
    console.log('🚀 Iniciando proceso de migración de datos a PostgreSQL...');

    // Paso 1: Conectar a la base de datos 'postgres' por defecto para asegurar la existencia de 'educa360'
    const defaultClient = new Client({
        user: DB_USER,
        password: DB_PASSWORD,
        host: DB_HOST,
        port: DB_PORT,
        database: 'postgres'
    });

    try {
        console.log(`🔌 Conectando al servidor PostgreSQL en ${DB_HOST}:${DB_PORT} (Base de datos: postgres)...`);
        await defaultClient.connect();
        
        // Verificar si la base de datos de Educa360 ya existe
        const checkDbResult = await defaultClient.query(
            "SELECT 1 FROM pg_database WHERE datname = $1",
            [DB_DATABASE]
        );

        if (checkDbResult.rowCount === 0) {
            console.log(`🔨 Creando la base de datos '${DB_DATABASE}'...`);
            // NOTA: Los nombres de BD dinámicos deben concatenarse de forma segura y sin parámetros por restricciones de PG.
            await defaultClient.query(`CREATE DATABASE "${DB_DATABASE}"`);
            console.log(`✅ Base de datos '${DB_DATABASE}' creada exitosamente.`);
        } else {
            console.log(`ℹ️ La base de datos '${DB_DATABASE}' ya existe en el servidor.`);
        }
    } catch (err) {
        console.error('❌ Error asegurando la base de datos:', err.message);
        console.log('💡 Asegúrate de que el servidor PostgreSQL local esté encendido e instalado.');
        process.exit(1);
    } finally {
        await defaultClient.end();
    }

    // Paso 2: Conectar a la base de datos objetivo 'educa360'
    const targetClient = new Client({
        user: DB_USER,
        password: DB_PASSWORD,
        host: DB_HOST,
        port: DB_PORT,
        database: DB_DATABASE
    });

    try {
        console.log(`🔌 Conectando a la base de datos '${DB_DATABASE}'...`);
        await targetClient.connect();

        // Crear la tabla 'system_config'
        console.log('🔨 Asegurando la tabla system_config...');
        await targetClient.query(`
            CREATE TABLE IF NOT EXISTS system_config (
                id INT PRIMARY KEY,
                data JSONB NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Tabla system_config lista.');

        // Cargar los datos desde config.json
        const configJsonPath = path.join(__dirname, '..', '..', 'data', 'config.json');
        if (!fs.existsSync(configJsonPath)) {
            console.error(`❌ No se encontró el archivo de datos original en: ${configJsonPath}`);
            process.exit(1);
        }

        console.log(`📖 Leyendo datos desde ${configJsonPath}...`);
        const rawData = fs.readFileSync(configJsonPath, 'utf8');
        const parsedData = JSON.parse(rawData);

        console.log('💾 Insertando/Actualizando datos en la tabla system_config...');
        await targetClient.query(`
            INSERT INTO system_config (id, data)
            VALUES ($1, $2)
            ON CONFLICT (id)
            DO UPDATE SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP
        `, [1, JSON.stringify(parsedData)]);

        console.log('🎉 ¡Migración finalizada con éxito! Los datos ahora están en PostgreSQL local.');
    } catch (err) {
        console.error('❌ Error migrando los datos a la tabla system_config:', err.message);
        process.exit(1);
    } finally {
        await targetClient.end();
    }
};

runMigration();
