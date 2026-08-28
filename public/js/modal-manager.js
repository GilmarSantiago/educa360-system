/**
 * Global Modal Manager for Bootstrap 5
 * Handles infinite nested modals, z-index stacking, and scroll preservation.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Escuchar cuando un modal Bootstrap 5 se muestra
    document.addEventListener('show.bs.modal', function (event) {
        const modalElement = event.target;
        
        // Obtener todos los modales visibles excluyendo el actual
        const openModals = Array.from(document.querySelectorAll('.modal.show')).filter(m => m !== modalElement);
        const openModalsCount = openModals.length;
        
        if (openModalsCount > 0) {
            // Base z-index for Bootstrap is 1055. 
            // We increase z-index by 10 for each nested modal to ensure it's on top.
            const newZIndex = 1055 + (10 * openModalsCount);
            
            // Asignar z-index al modal actual
            modalElement.style.zIndex = newZIndex;
            
            // Esperar un momento a que Bootstrap inyecte el backdrop en el DOM
            setTimeout(() => {
                // Seleccionar todos los backdrops que no tienen la clase .modal-stack
                const backdrops = document.querySelectorAll('.modal-backdrop:not(.modal-stack)');
                
                // Si encontramos backdrops nuevos, les damos un z-index justo debajo del nuevo modal
                backdrops.forEach(backdrop => {
                    backdrop.style.zIndex = newZIndex - 1;
                    backdrop.classList.add('modal-stack');
                });
            }, 0);
        }
    });

    // Escuchar cuando un modal Bootstrap 5 se oculta
    document.addEventListener('hidden.bs.modal', function (event) {
        // Verificar cuántos modales quedan con la clase .show
        const openModals = document.querySelectorAll('.modal.show').length;
        
        if (openModals > 0) {
            // Si hay al menos un modal aún abierto, debemos forzar al body a mantener .modal-open
            document.body.classList.add('modal-open');
        } else {
            // Si no hay modales abiertos, forzar limpieza por seguridad
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
            
            // Eliminar cualquier backdrop atascado
            document.querySelectorAll('.modal-backdrop').forEach(bd => bd.remove());
        }
    });
});
