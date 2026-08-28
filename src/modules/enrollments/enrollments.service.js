const enrollmentsRepository = require('./enrollments.repository');
const cashRepo = require('../cash-registers/cash-registers.repository');

const enrollStudent = async (data) => {
    // Validate cash session
    const currentSession = cashRepo.getCurrentSession(data.currentUserId);
    if (!currentSession) {
        throw new Error('Debe aperturar su caja para poder registrar una inscripción y cobrar pagos.');
    }
    data.cashSessionId = currentSession.id; // To bind generated payments to this session

    // Basic validation
    if (!data.student || !data.parent || !data.enrollment) {
        throw new Error('Datos incompletos para la inscripción.');
    }
    return await enrollmentsRepository.createEnrollment(data);
};

const getEnrollments = async (filters) => {
    return await enrollmentsRepository.getAll(filters);
};

const cancelEnrollment = async (id) => {
    return await enrollmentsRepository.cancelEnrollment(id);
};

const getStudentFolder = async (studentId) => {
    return await enrollmentsRepository.getStudentFolderData(studentId);
};

const checkParentExists = async (document) => {
    return await enrollmentsRepository.checkParentExists(document);
};

const checkStudentHistory = async (document, academicYearId) => {
    return await enrollmentsRepository.checkStudentHistory(document, academicYearId);
};

const transferStudent = async (enrollmentId, gradeId, section) => {
    return await enrollmentsRepository.transferEnrollment(enrollmentId, gradeId, section);
};

const withdrawStudent = async (enrollmentId, withdrawalDate) => {
    return await enrollmentsRepository.withdrawEnrollment(enrollmentId, withdrawalDate);
};

const applyDiscount = async (paymentId, discountType, discountValue) => {
    return await enrollmentsRepository.applyPaymentDiscount(paymentId, discountType, discountValue);
};

module.exports = { 
    enrollStudent, 
    getEnrollments, 
    cancelEnrollment, 
    getStudentFolder,
    checkParentExists,
    checkStudentHistory,
    transferStudent,
    withdrawStudent,
    applyDiscount
};
