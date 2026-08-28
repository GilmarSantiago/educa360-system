const mkRoutes = (ctrl, routerOptions = {}) => {
    const router = require('express').Router(routerOptions);
    const { authenticateToken, requireRole } = require('../middleware/auth');
    
    const adminGuard = [authenticateToken, requireRole('administrador')];
    
    // Allow read access for all authenticated users
    router.get('/',      authenticateToken, ctrl.getAll);
    router.get('/:id',   authenticateToken, ctrl.getById);
    
    // Restrict write access to administrators
    router.post('/',     ...adminGuard, ctrl.create);
    router.put('/:id',   ...adminGuard, ctrl.update);
    router.delete('/:id',...adminGuard, ctrl.remove);
    
    return router;
};

module.exports = mkRoutes;

