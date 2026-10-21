import pg from 'pg';
import bcrypt from 'bcryptjs';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:UMdUoLQmDZlWjiyENdVbcnHkQXHxeJCl@acela.proxy.rlwy.net:45164/railway';

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 8000,
});

async function run() {
  console.log('🚀 [PostgreSQL Init] Conectando a la base de datos...');
  const client = await pool.connect();

  try {
    console.log('📦 [PostgreSQL Init] Creando schema limpio "v2" para aislar del proyecto anterior...');
    await client.query(`CREATE SCHEMA IF NOT EXISTS v2;`);
    await client.query(`SET search_path TO v2;`);

    // 1. Tabla de Tenants (Colegios Clientes)
    await client.query(`
      CREATE TABLE IF NOT EXISTS v2.tenants (
        id VARCHAR(64) PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        ruc VARCHAR(50),
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        logo TEXT,
        status VARCHAR(50) DEFAULT 'ACTIVE',
        plan VARCHAR(50) DEFAULT 'PRO',
        monthly_fee NUMERIC(10,2) DEFAULT 150.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Tabla de Reglas del Colegio (Configuradas por el Administrador)
    await client.query(`
      CREATE TABLE IF NOT EXISTS v2.school_configs (
        id VARCHAR(64) PRIMARY KEY,
        tenant_id VARCHAR(64) UNIQUE REFERENCES v2.tenants(id) ON DELETE CASCADE,
        grading_system VARCHAR(50) DEFAULT 'vigesimal',
        passing_grade NUMERIC(4,2) DEFAULT 11.0,
        period_type VARCHAR(50) DEFAULT 'bimestre',
        monthly_due_day INT DEFAULT 5,
        late_fee_daily_percentage NUMERIC(4,2) DEFAULT 0.5,
        grace_days INT DEFAULT 3,
        allow_multiple_cash_sessions BOOLEAN DEFAULT false,
        require_token_for_differences BOOLEAN DEFAULT true,
        enabled_modules JSONB DEFAULT '["school_config", "enrollments", "cash_register", "expenses", "teachers", "parents", "grades", "attendance"]'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Tabla de Usuarios y Roles
    await client.query(`
      CREATE TABLE IF NOT EXISTS v2.users (
        id VARCHAR(64) PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        document VARCHAR(50),
        address TEXT,
        avatar TEXT,
        is_active BOOLEAN DEFAULT true,
        tenant_id VARCHAR(64) REFERENCES v2.tenants(id) ON DELETE SET NULL,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Tabla de Costos del SaaS (Solo accesible por Soporte)
    await client.query(`
      CREATE TABLE IF NOT EXISTS v2.saas_costs (
        id VARCHAR(64) PRIMARY KEY,
        concept VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        amount NUMERIC(10,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'USD',
        month INT NOT NULL,
        year INT NOT NULL,
        is_recurring BOOLEAN DEFAULT true,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Tabla de Auditoría
    await client.query(`
      CREATE TABLE IF NOT EXISTS v2.audit_logs (
        id VARCHAR(64) PRIMARY KEY,
        tenant_id VARCHAR(64) REFERENCES v2.tenants(id) ON DELETE CASCADE,
        user_id VARCHAR(64) REFERENCES v2.users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        details TEXT,
        ip_address VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ [PostgreSQL Init] Tablas en schema v2 creadas con éxito.');

    // 6. Sembrar Tenant de Prueba
    const tenantId = 'tenant-demo-avanza-001';
    await client.query(`
      INSERT INTO v2.tenants (id, code, name, ruc, email, phone, address, status, plan, monthly_fee)
      VALUES ($1, 'avanza', 'Colegio Avanza College', '20601234567', 'contacto@avanzacollege.edu.pe', '(01) 485-9201', 'Av. Las Palmeras 450, Lima', 'ACTIVE', 'PRO', 180.00)
      ON CONFLICT (id) DO NOTHING;
    `, [tenantId]);

    // Sembrar Reglas del Colegio
    await client.query(`
      INSERT INTO v2.school_configs (id, tenant_id, grading_system, passing_grade, period_type, monthly_due_day, late_fee_daily_percentage, grace_days)
      VALUES ('config-avanza-001', $1, 'vigesimal', 11.0, 'bimestre', 5, 0.5, 3)
      ON CONFLICT (tenant_id) DO NOTHING;
    `, [tenantId]);

    // 7. Sembrar los 5 Usuarios Clave
    const salt = await bcrypt.genSalt(10);
    const users = [
      {
        id: 'user-soporte-001',
        username: 'soporte',
        pass: 'soporte123',
        role: 'SOPORTE',
        name: 'Ing. Santiago (Dueño del SaaS & Dev)',
        email: 'soporte@educa360.com',
        tenantId: null,
      },
      {
        id: 'user-director-001',
        username: 'director',
        pass: 'admin123',
        role: 'ADMINISTRADOR',
        name: 'Lic. Roberto Gómez (Director General)',
        email: 'director@avanzacollege.edu.pe',
        tenantId,
      },
      {
        id: 'user-cajero-001',
        username: 'cajero',
        pass: 'colab123',
        role: 'COLABORADOR',
        name: 'Ana Morales (Secretaría & Tesorería)',
        email: 'caja@avanzacollege.edu.pe',
        tenantId,
      },
      {
        id: 'user-profesor-001',
        username: 'profesor',
        pass: 'maestro123',
        role: 'MAESTRO',
        name: 'Prof. Carlos Mendoza (Matemáticas)',
        email: 'profesor@avanzacollege.edu.pe',
        tenantId,
      },
      {
        id: 'user-apoderado-001',
        username: 'apoderado',
        pass: 'padre123',
        role: 'APODERADO',
        name: 'Juan Pérez Ramos (Apoderado Alumno)',
        email: 'apoderado@gmail.com',
        tenantId,
      },
    ];

    for (const u of users) {
      const hashed = await bcrypt.hash(u.pass, salt);
      await client.query(`
        INSERT INTO v2.users (id, username, password, role, name, email, tenant_id, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, true)
        ON CONFLICT (username) DO UPDATE 
        SET password = EXCLUDED.password, role = EXCLUDED.role, name = EXCLUDED.name, tenant_id = EXCLUDED.tenant_id;
      `, [u.id, u.username, hashed, u.role, u.name, u.email, u.tenantId]);
      console.log(`👤 [PostgreSQL Init] Usuario preparado: ${u.username} (${u.role}) -> Clave: ${u.pass}`);
    }

    // 8. Sembrar Costos del SaaS para métricas de Soporte
    await client.query(`
      INSERT INTO v2.saas_costs (id, concept, category, amount, currency, month, year, is_recurring, notes)
      VALUES 
        ('cost-001', 'Servidor Cloud PostgreSQL & Backend (Railway)', 'INFRASTRUCTURE', 25.00, 'USD', 10, 2026, true, 'Base de datos y cómputo'),
        ('cost-002', 'Bolsa de Consultas RENIEC / DNI (Decolecta)', 'API_SERVICE', 15.00, 'USD', 10, 2026, false, '1000 consultas'),
        ('cost-003', 'Dominio y Certificados SSL (Cloudflare)', 'MAINTENANCE', 12.00, 'USD', 10, 2026, true, 'DNS y CDN')
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log('🎉 [PostgreSQL Init] ¡Base de datos limpia (Schema v2) inicializada y sembrada con éxito!');
  } catch (err) {
    console.error('❌ [PostgreSQL Init] Error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
