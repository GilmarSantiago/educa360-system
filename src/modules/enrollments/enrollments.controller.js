const enrollmentsService = require('./enrollments.service');

const create = async (req, res, next) => {
    try {
        const data = { ...req.body, currentUserId: req.user.id };
        const result = await enrollmentsService.enrollStudent(data);
        res.json({ success: true, ...result });
    } catch (err) { next(err); }
};

const getAll = async (req, res, next) => {
    try {
        const { academicYearId } = req.query;
        const enrollments = await enrollmentsService.getEnrollments({ academicYearId });
        res.json({ success: true, enrollments });
    } catch (err) { next(err); }
};

const cancel = async (req, res, next) => {
    try {
        const success = await enrollmentsService.cancelEnrollment(req.params.id);
        res.json({ success });
    } catch (err) { next(err); }
};

const getFolder = async (req, res, next) => {
    try {
        const data = await enrollmentsService.getStudentFolder(req.params.studentId);
        res.json({ success: true, data });
    } catch (err) { next(err); }
};

const checkParent = async (req, res, next) => {
    try {
        const { document } = req.params;
        const result = await enrollmentsService.checkParentExists(document);
        res.json({ success: true, ...result });
    } catch (err) { next(err); }
};

const checkStudent = async (req, res, next) => {
    try {
        const { document } = req.params;
        const { academicYearId } = req.query;
        const result = await enrollmentsService.checkStudentHistory(document, academicYearId);
        res.json({ success: true, ...result });
    } catch (err) { next(err); }
};

const transfer = async (req, res, next) => {
    try {
        const { gradeId, section } = req.body;
        const success = await enrollmentsService.transferStudent(req.params.id, gradeId, section);
        res.json({ success });
    } catch (err) { next(err); }
};

const withdraw = async (req, res, next) => {
    try {
        const { withdrawalDate } = req.body;
        const success = await enrollmentsService.withdrawStudent(req.params.id, withdrawalDate);
        res.json({ success });
    } catch (err) { next(err); }
};

const applyPaymentDiscount = async (req, res, next) => {
    try {
        const { discountType, discountValue } = req.body;
        const success = await enrollmentsService.applyDiscount(req.params.paymentId, discountType, discountValue);
        res.json({ success });
    } catch (err) { next(err); }
};

module.exports = { 
    create, 
    getAll, 
    cancel, 
    getFolder, 
    checkParent, 
    checkStudent,
    transfer,
    withdraw,
    applyPaymentDiscount
};
