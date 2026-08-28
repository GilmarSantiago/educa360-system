const financialConceptsService = require('./financial-concepts.service');

const getAll = async (req, res, next) => {
    try {
        const concepts = await financialConceptsService.getConcepts();
        res.json({ success: true, concepts });
    } catch (err) { next(err); }
};

const create = async (req, res, next) => {
    try {
        const newConcept = await financialConceptsService.createConcept(req.body);
        res.json({ success: true, concept: newConcept });
    } catch (err) { next(err); }
};

const update = async (req, res, next) => {
    try {
        const updatedConcept = await financialConceptsService.updateConcept(req.params.id, req.body);
        res.json({ success: true, concept: updatedConcept });
    } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
    try {
        await financialConceptsService.deleteConcept(req.params.id);
        res.json({ success: true, message: 'Concepto eliminado correctamente' });
    } catch (err) { next(err); }
};

module.exports = { getAll, create, update, remove };
