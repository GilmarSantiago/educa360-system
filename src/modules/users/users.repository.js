const { query } = require('../../db');

const findAll = async () => {
    const res = await query('SELECT * FROM users ORDER BY id ASC');
    return res.rows;
};

const findById = async (id) => {
    const res = await query('SELECT * FROM users WHERE id = $1', [id]);
    return res.rows[0] || null;
};

const findByUsername = async (username) => {
    const res = await query('SELECT * FROM users WHERE username = $1', [username]);
    return res.rows[0] || null;
};

const create = async (data) => {
    const res = await query(`
        INSERT INTO users (username, password, role, name, email, phone, address, birthdate, avatar, "canGenerateTokens")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
    `, [
        data.username, data.password, data.role, data.name, data.email,
        data.phone, data.address, data.birthdate, data.avatar, data.canGenerateTokens || false
    ]);
    return res.rows[0];
};

const update = async (id, data) => {
    // Dynamic update query builder
    const fields = [];
    const values = [];
    let count = 1;

    for (const [key, value] of Object.entries(data)) {
        if (key !== 'id') {
            fields.push(`"${key}" = $${count}`);
            values.push(value);
            count++;
        }
    }

    if (fields.length === 0) return await findById(id);

    values.push(id);
    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = $${count} RETURNING *`;
    
    const res = await query(sql, values);
    return res.rows[0] || null;
};

const remove = async (id) => {
    const res = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    return res.rowCount > 0;
};

module.exports = { findAll, findById, findByUsername, create, update, remove };
