const { initDb, query } = require('../db');

const seedBasicData = async () => {
    try {
        await initDb();
        console.log('🌱 [Seed] Insertando datos básicos...');

        // 1. School
        await query(`
            INSERT INTO school (id, name, email, phone, address, "paymentMethods", "allowMultipleCashSessions")
            VALUES (1, 'Avanza College', 'contacto@educa360.com', '012345678', 'Av. Principal 123', '["Efectivo", "Yape / Plin", "Transferencia", "Tarjeta"]'::jsonb, false)
            ON CONFLICT (id) DO NOTHING;
        `);

        // 2. Roles
        const roles = [
            { name: 'administrador', modules: ["home", "school", "enrollments", "reports", "caja", "settings", "reporte_cajas", "academic_records"] },
            { name: 'soporte', modules: ["home", "tickets", "logs", "db"] },
            { name: 'maestro', modules: ["home", "classes", "grades", "attendance", "messages"] },
            { name: 'apoderado', modules: ["home", "student_progress", "bills", "news"] },
            { name: 'colaborador', modules: ["home", "enrollments", "tasks", "calendar", "caja"] }
        ];

        for (const role of roles) {
            await query(`
                INSERT INTO roles (name, modules)
                VALUES ($1, $2::jsonb)
                ON CONFLICT (name) DO NOTHING;
            `, [role.name, JSON.stringify(role.modules)]);
        }

        // 3. Admin User
        await query(`
            INSERT INTO users (id, username, password, role, name, email, "canGenerateTokens")
            VALUES (1, 'admin', '$2b$10$6NvtK4G3ZXF3xTxocOJEweDjSiRYykkFjVsmCMbthtcxxIUbsk1K2', 'administrador', 'Admin Educa360', 'admin@educa360.com', true)
            ON CONFLICT (id) DO NOTHING;
        `);

        // Update the sequence for users so next inserts don't fail if we seeded id=1 manually
        await query(`SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));`);

        console.log('✅ [Seed] Datos básicos insertados correctamente.');
        process.exit(0);
    } catch (err) {
        console.error('❌ [Seed] Error al insertar datos:', err);
        process.exit(1);
    }
};

seedBasicData();
