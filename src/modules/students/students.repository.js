const { getConfig } = require('../../db/localDb');

const search = (query) => {
    const config = getConfig();
    const q = query.toLowerCase();
    return (config.students || []).filter(s => 
        s.name.toLowerCase().includes(q) || 
        s.document.includes(q)
    ).map(s => {
        const parent = (config.users || []).find(u => u.id == s.parentId);
        const lastEnrollment = (config.enrollments || [])
            .filter(e => e.studentId == s.id)
            .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

        return {
            ...s,
            parentName: parent ? parent.name : 'No asignado',
            parentDoc: parent ? (parent.document || parent.username) : '',
            parentEmail: parent ? parent.email : '',
            parentPhone: parent ? parent.phone : '',
            lastGradeId: lastEnrollment ? lastEnrollment.gradeId : null
        };
    });
};

module.exports = { search };
