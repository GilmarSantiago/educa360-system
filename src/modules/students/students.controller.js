const repo = require('./students.repository');

const search = async (req, res) => {
    const { q } = req.query;
    const results = repo.search(q || '');
    res.json({ success: true, students: results });
};

module.exports = { search };
