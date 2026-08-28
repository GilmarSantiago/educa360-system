const { initDb, query } = require('../db');

const createTables = async () => {
    try {
        await initDb();
        console.log('🚧 [Init Tables] Creando esquema de base de datos...');

        const tables = [
            `CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255),
                phone VARCHAR(50),
                address TEXT,
                birthdate DATE,
                avatar TEXT,
                "canGenerateTokens" BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );`,
            `CREATE TABLE IF NOT EXISTS roles (
                name VARCHAR(50) PRIMARY KEY,
                modules JSONB NOT NULL DEFAULT '[]'::jsonb
            );`,
            `CREATE TABLE IF NOT EXISTS school (
                id INT PRIMARY KEY DEFAULT 1,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255),
                phone VARCHAR(50),
                address TEXT,
                logo TEXT,
                "paymentMethods" JSONB DEFAULT '[]'::jsonb,
                "allowMultipleCashSessions" BOOLEAN DEFAULT false
            );`,
            `CREATE TABLE IF NOT EXISTS modules (
                name VARCHAR(100) PRIMARY KEY,
                title VARCHAR(100),
                icon VARCHAR(100),
                category VARCHAR(100)
            );`,
            `CREATE TABLE IF NOT EXISTS "academicYears" (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) NOT NULL,
                "startDate" DATE,
                "endDate" DATE,
                "isActive" BOOLEAN DEFAULT false,
                periods JSONB DEFAULT '[]'::jsonb,
                periodicity VARCHAR(50),
                "staffStartDate" DATE,
                "workingDays" JSONB DEFAULT '[]'::jsonb,
                holidays JSONB DEFAULT '[]'::jsonb
            );`,
            `CREATE TABLE IF NOT EXISTS "gradeScales" (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                type VARCHAR(50),
                min NUMERIC,
                max NUMERIC,
                "passingGrade" NUMERIC,
                "isDefault" BOOLEAN DEFAULT false
            );`,
            `CREATE TABLE IF NOT EXISTS grades (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                level VARCHAR(50),
                "order" INT,
                sections JSONB DEFAULT '[]'::jsonb
            );`,
            `CREATE TABLE IF NOT EXISTS courses (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                code VARCHAR(50),
                "gradeId" INT REFERENCES grades(id) ON DELETE SET NULL,
                "hoursPerWeek" INT
            );`,
            `CREATE TABLE IF NOT EXISTS parents (
                id BIGINT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                document VARCHAR(50),
                email VARCHAR(255),
                phone VARCHAR(50)
            );`,
            `CREATE TABLE IF NOT EXISTS students (
                id BIGINT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                document VARCHAR(50),
                birthdate DATE,
                "parentId" BIGINT,
                "isNew" BOOLEAN DEFAULT false,
                "previousSchool" VARCHAR(255)
            );`,
            `CREATE TABLE IF NOT EXISTS enrollments (
                id BIGINT PRIMARY KEY,
                "studentId" BIGINT REFERENCES students(id) ON DELETE CASCADE,
                "gradeId" VARCHAR(50),
                section VARCHAR(10),
                "academicYearId" VARCHAR(50),
                "academicYearName" VARCHAR(50),
                status VARCHAR(50),
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );`,
            `CREATE TABLE IF NOT EXISTS "cashSessions" (
                id BIGINT PRIMARY KEY,
                "userId" INT REFERENCES users(id),
                "openedAt" TIMESTAMP,
                "closedAt" TIMESTAMP,
                "initialAmount" NUMERIC,
                "finalAmount" NUMERIC,
                "systemCalculatedAmount" NUMERIC,
                status VARCHAR(50),
                "closedBy" INT,
                "finalAmounts" JSONB,
                "systemCalculatedAmounts" JSONB,
                differences JSONB,
                "totalDifference" NUMERIC
            );`,
            `CREATE TABLE IF NOT EXISTS "financialConcepts" (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                type VARCHAR(50),
                "defaultAmount" NUMERIC,
                "isMandatory" BOOLEAN DEFAULT false,
                "appliesToNew" BOOLEAN DEFAULT false,
                "appliesToRegular" BOOLEAN DEFAULT false,
                "installmentsCount" INT DEFAULT 1,
                periodicity VARCHAR(50)
            );`,
            `CREATE TABLE IF NOT EXISTS payments (
                id BIGINT PRIMARY KEY,
                "studentId" BIGINT REFERENCES students(id),
                "parentId" BIGINT,
                "enrollmentId" BIGINT,
                "conceptId" INT,
                concept VARCHAR(255),
                amount NUMERIC,
                status VARCHAR(50),
                method VARCHAR(50),
                "paymentDate" TIMESTAMP,
                "dueDate" TIMESTAMP,
                "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "cashSessionId" BIGINT
            );`,
            `CREATE TABLE IF NOT EXISTS "closureTokens" (
                token VARCHAR(255) PRIMARY KEY,
                "generatedBy" INT REFERENCES users(id),
                "generatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "expiresAt" TIMESTAMP,
                "usedAt" TIMESTAMP,
                status VARCHAR(50) DEFAULT 'active'
            );`,
            `CREATE TABLE IF NOT EXISTS schedules (
                id SERIAL PRIMARY KEY,
                "courseId" INT REFERENCES courses(id),
                "gradeId" INT,
                section VARCHAR(10),
                day VARCHAR(20),
                "startTime" TIME,
                "endTime" TIME
            );`
        ];

        for (const sql of tables) {
            await query(sql);
        }

        console.log('✅ [Init Tables] Esquema relacional creado correctamente.');
        process.exit(0);
    } catch (err) {
        console.error('❌ [Init Tables] Error al crear tablas:', err);
        process.exit(1);
    }
};

createTables();
