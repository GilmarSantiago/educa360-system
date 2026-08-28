const BaseRepository = require('../../shared/BaseRepository');
const repo = new BaseRepository('financialConcepts');

const getConcepts = async () => {
    return await repo.findAll();
};

const createConcept = async (conceptData) => {
    return await repo.create(conceptData);
};

const updateConcept = async (id, conceptData) => {
    const updated = await repo.update(id, conceptData);
    if (!updated) throw new Error('Concepto financiero no encontrado');
    return updated;
};

const deleteConcept = async (id) => {
    const deleted = await repo.remove(id);
    if (!deleted) throw new Error('Concepto financiero no encontrado');
    return true;
};

module.exports = { getConcepts, createConcept, updateConcept, deleteConcept };
