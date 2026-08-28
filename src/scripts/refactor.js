const fs = require('fs');
const path = require('path');

const modulesDir = path.join(__dirname, '..', 'modules');

const baseRepoCode = `const { query } = require('../../db');

class BaseRepository {
    constructor(tableName) {
        this.tableName = tableName;
    }
    async findAll() {
        const res = await query(\`SELECT * FROM "\${this.tableName}"\`);
        return res.rows;
    }
    async findById(id) {
        const res = await query(\`SELECT * FROM "\${this.tableName}" WHERE id = $1\`, [id]);
        return res.rows[0] || null;
    }
    async create(data) {
        const keys = Object.keys(data).filter(k => data[k] !== undefined);
        const values = keys.map(k => data[k]);
        const placeholders = keys.map((_, i) => \`$\${i + 1}\`).join(', ');
        const sql = \`INSERT INTO "\${this.tableName}" ("\${keys.join('", "')}") VALUES (\${placeholders}) RETURNING *\`;
        const res = await query(sql, values);
        return res.rows[0];
    }
    async update(id, data) {
        const keys = Object.keys(data).filter(k => k !== 'id' && data[k] !== undefined);
        if (keys.length === 0) return await this.findById(id);
        const values = keys.map(k => data[k]);
        const sets = keys.map((k, i) => \`"\${k}" = $\${i + 1}\`).join(', ');
        values.push(id);
        const sql = \`UPDATE "\${this.tableName}" SET \${sets} WHERE id = $\${values.length} RETURNING *\`;
        const res = await query(sql, values);
        return res.rows[0] || null;
    }
    async remove(id) {
        const res = await query(\`DELETE FROM "\${this.tableName}" WHERE id = $1 RETURNING *\`, [id]);
        return res.rowCount > 0;
    }
}

module.exports = BaseRepository;
`;

fs.writeFileSync(path.join(__dirname, '..', 'shared', 'BaseRepository.js'), baseRepoCode);

const tableMap = {
    'academic-year': 'academicYears',
    'auth': 'users', 
    'cash-registers': 'cashSessions',
    'courses': 'courses',
    'enrollments': 'enrollments',
    'financial-concepts': 'financialConcepts',
    'grade-scales': 'gradeScales',
    'grades': 'grades',
    'payments': 'payments',
    'profile': 'users',
    'roles': 'roles',
    'schedules': 'schedules',
    'school': 'school',
    'students': 'students',
    'system': 'modules',
    'users': 'users'
};

const processFiles = () => {
    const modules = fs.readdirSync(modulesDir);

    for (const mod of modules) {
        const modPath = path.join(modulesDir, mod);
        if (!fs.statSync(modPath).isDirectory()) continue;
        
        if (mod === 'users' || mod === 'roles') continue;

        const tableName = tableMap[mod];

        const repoPath = path.join(modPath, `${mod}.repository.js`);
        if (fs.existsSync(repoPath) && tableName && mod !== 'auth' && mod !== 'school' && mod !== 'profile' && mod !== 'system') {
            const repoCode = `const BaseRepository = require('../../shared/BaseRepository');\n\nclass Repository extends BaseRepository {\n    constructor() {\n        super('${tableName}');\n    }\n}\n\nmodule.exports = new Repository();`;
            fs.writeFileSync(repoPath, repoCode);
        }

        const svcPath = path.join(modPath, `${mod}.service.js`);
        if (fs.existsSync(svcPath)) {
            let svcCode = fs.readFileSync(svcPath, 'utf8');
            svcCode = svcCode.replace(/const (\w+) = \((.*?)\) => {/g, 'const $1 = async ($2) => {');
            svcCode = svcCode.replace(/return (\w+Repository\.(\w+)\()/g, 'return await $1');
            svcCode = svcCode.replace(/const (\w+) = (\w+Repository\.(\w+)\()/g, 'const $1 = await $2');
            
            if (mod === 'auth') {
                 svcCode = svcCode.replace(/usersRepository\.(findByUsername|findById|create)/g, 'await usersRepository.$1');
                 svcCode = svcCode.replace(/await await/g, 'await');
            }
            fs.writeFileSync(svcPath, svcCode);
        }

        const ctrlPath = path.join(modPath, `${mod}.controller.js`);
        if (fs.existsSync(ctrlPath)) {
            let ctrlCode = fs.readFileSync(ctrlPath, 'utf8');
            ctrlCode = ctrlCode.replace(/const (\w+) = \((req, res|req, res, next)\) => {/g, 'const $1 = async ($2) => {');
            ctrlCode = ctrlCode.replace(/= (\w+Service\.(\w+)\()/g, '= await $1');
            ctrlCode = ctrlCode.replace(/(\w+Service\.(\w+)\()/g, (match, p1, p2, offset, string) => {
                if (string.substring(offset - 6, offset) === 'await ') return match;
                return 'await ' + match;
            });
            fs.writeFileSync(ctrlPath, ctrlCode);
        }
    }
};

processFiles();
console.log('Refactor script done');
