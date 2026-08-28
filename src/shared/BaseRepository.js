const { query } = require('../db');

class BaseRepository {
    constructor(tableName) {
        this.tableName = tableName;
    }
    async findAll() {
        const res = await query(`SELECT * FROM "${this.tableName}"`);
        return res.rows;
    }
    async findById(id) {
        const res = await query(`SELECT * FROM "${this.tableName}" WHERE id = $1`, [id]);
        return res.rows[0] || null;
    }
    async create(data) {
        const keys = Object.keys(data).filter(k => data[k] !== undefined);
        const values = keys.map(k => data[k]);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const sql = `INSERT INTO "${this.tableName}" ("${keys.join('", "')}") VALUES (${placeholders}) RETURNING *`;
        const res = await query(sql, values);
        return res.rows[0];
    }
    async update(id, data) {
        const keys = Object.keys(data).filter(k => k !== 'id' && data[k] !== undefined);
        if (keys.length === 0) return await this.findById(id);
        const values = keys.map(k => data[k]);
        const sets = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
        values.push(id);
        const sql = `UPDATE "${this.tableName}" SET ${sets} WHERE id = $${values.length} RETURNING *`;
        const res = await query(sql, values);
        return res.rows[0] || null;
    }
    async remove(id) {
        const res = await query(`DELETE FROM "${this.tableName}" WHERE id = $1 RETURNING *`, [id]);
        return res.rowCount > 0;
    }
}

module.exports = BaseRepository;
