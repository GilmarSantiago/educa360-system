const db = require('../../db/localDb');

const getConcepts = async () => {
    const data = db.getConfig();
    return data.financialConcepts || [];
};

const createConcept = async (conceptData) => {
    const data = db.getConfig();
    if (!data.financialConcepts) data.financialConcepts = [];
    
    const newConcept = {
        id: Date.now(),
        ...conceptData
    };
    
    data.financialConcepts.push(newConcept);
    db.saveConfig(data);
    return newConcept;
};

const updateConcept = async (id, conceptData) => {
    const data = db.getConfig();
    const index = (data.financialConcepts || []).findIndex(c => c.id == id);
    if (index === -1) throw new Error('Concepto financiero no encontrado');
    
    data.financialConcepts[index] = { ...data.financialConcepts[index], ...conceptData };
    db.saveConfig(data);
    return data.financialConcepts[index];
};

const deleteConcept = async (id) => {
    const data = db.getConfig();
    const index = (data.financialConcepts || []).findIndex(c => c.id == id);
    if (index === -1) throw new Error('Concepto financiero no encontrado');
    
    data.financialConcepts.splice(index, 1);
    db.saveConfig(data);
    return true;
};

module.exports = { getConcepts, createConcept, updateConcept, deleteConcept };
