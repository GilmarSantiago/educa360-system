const paymentsRepository = require('./payments.repository');

const pay = async (req, res) => {
    try {
        const { id } = req.params;
        const data = { ...req.body, currentUserId: req.user.id };
        const result = await paymentsRepository.processPayment(id, data);
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getPayment = async (req, res) => {
    try {
        const payment = await paymentsRepository.getById(req.params.id);
        if (payment) {
            res.json({ success: true, payment });
        } else {
            res.status(404).json({ success: false, message: 'Pago no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { pay, getPayment };
