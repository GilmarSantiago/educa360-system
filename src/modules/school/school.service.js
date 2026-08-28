/**
 * SCHOOL SERVICE
 * 
 * Lógica de negocio para la configuración de la institución educativa.
 * Actúa como intermediario entre el controlador y la capa de acceso a datos (repository).
 */

const path = require('path');
const fs = require('fs');
const schoolRepository = require('./school.repository');

/**
 * Obtiene la configuración actual de la escuela.
 * @returns {Object} Objeto con los datos de configuración (nombre, logo, métodos de pago, etc).
 */
const getSchool = () => {
    return schoolRepository.getSchool();
};

/**
 * Actualiza la información de la escuela.
 * Maneja lógicas adicionales como el procesamiento de strings a arrays y eliminación del logo antiguo.
 * 
 * @param {Object} data - Datos provenientes del request body (ej. nombre, métodos de pago).
 * @param {Object} file - Archivo de imagen subido (multer file object) para el logo.
 * @returns {Object} La configuración escolar actualizada.
 */
const updateSchool = (data, file) => {
    // Se clonan los datos para evitar mutar el objeto original
    const updateData = { ...data };

    // Si los métodos de pago vienen en un string separado por comas (ej. desde form-data), se convierten a un array
    if (updateData.paymentMethods && typeof updateData.paymentMethods === 'string') {
        updateData.paymentMethods = updateData.paymentMethods.split(',').map(s => s.trim()).filter(s => s);
    }
    
    // Normalizar el valor booleano, ya que form-data envía strings ('true' o 'false')
    if (updateData.allowMultipleCashSessions !== undefined) {
        updateData.allowMultipleCashSessions = (updateData.allowMultipleCashSessions === 'true' || updateData.allowMultipleCashSessions === true);
    }

    // Si se adjuntó un nuevo logo en la petición
    if (file) {
        const currentSchool = schoolRepository.getSchool();
        updateData.logo = '/uploads/school/' + file.filename; // Se guarda la ruta relativa de la nueva imagen

        // Eliminar el logo antiguo físicamente del servidor local para no acumular archivos huérfanos
        if (currentSchool.logo && currentSchool.logo.startsWith('/uploads/school/')) {
            const oldPath = path.join(__dirname, '..', '..', '..', 'public', currentSchool.logo);
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }
    }

    // Guardar los datos procesados en la base de datos
    return schoolRepository.updateSchool(updateData);
};

module.exports = { getSchool, updateSchool };
