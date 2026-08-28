const { query } = require('../../db');

const getAll = async () => {
    const res = await query('SELECT * FROM roles ORDER BY name ASC');
    return res.rows.map(row => ({
        id: row.name,
        modules: row.modules
    }));
};

const update = async (id, data) => {
    // If the ID (name) changed, we might need to handle renaming.
    // In SQL, we can update the primary key if it cascades, but let's just do a DELETE/INSERT or UPDATE.
    if (data.newId && data.newId !== id) {
        await query('UPDATE roles SET name = $1 WHERE name = $2', [data.newId, id]);
        id = data.newId;
    }

    // Upsert role modules
    const modulesJson = JSON.stringify(data.modules || []);
    const res = await query(`
        INSERT INTO roles (name, modules) 
        VALUES ($1, $2::jsonb)
        ON CONFLICT (name) DO UPDATE SET modules = EXCLUDED.modules
        RETURNING *
    `, [id, modulesJson]);

    return { id: res.rows[0].name, modules: res.rows[0].modules };
};

const remove = async (id) => {
    const res = await query('DELETE FROM roles WHERE name = $1 RETURNING name', [id]);
    return res.rowCount > 0;
};

module.exports = { getAll, update, remove };
