/**
 * SYSTEM SERVICE
 * 
 * Lógica para integraciones de sistema (RENIEC, SUNAT, etc.)
 */

// NOTA: Para producción, obtener un token en https://apis.net.pe/
const APIS_PERU_TOKEN = (process.env.DNI_API_TOKEN || 'sk_15555.c2KQy4EXIfXpPmo6KAy0GuAbqp1Uv17W').trim();
console.log(`[DNI Service] Usando token que comienza con: ${APIS_PERU_TOKEN.substring(0, 10)}...`);

/**
 * Consulta datos de un DNI usando el servicio de apis.net.pe
 * @param {string} dni 
 * @returns {Promise<Object>}
 */
const getDniData = async (dni) => {
    if (!dni || dni.length !== 8) {
        const error = new Error('DNI inválido. Debe tener 8 dígitos.');
        error.statusCode = 400;
        throw error;
    }

    try {
        const response = await fetch(`https://api.apis.net.pe/v2/reniec/dni?numero=${dni}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${APIS_PERU_TOKEN}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('[DNI API Error Response]', errorData);
            
            if (response.status === 401 || response.status === 403) {
                throw new Error('Token de API inválido o expirado. Verifique su configuración en apis.net.pe');
            }
            if (response.status === 429) {
                throw new Error('Límite de consultas excedido (Plan Gratuito).');
            }
            throw new Error(errorData.message || 'Error al consultar el servicio de DNI.');
        }

        const data = await response.json();
        return {
            dni: data.numeroDocumento,
            name: `${data.nombres} ${data.apellidoPaterno} ${data.apellidoMaterno}`,
            firstName: data.nombres,
            lastName: `${data.apellidoPaterno} ${data.apellidoMaterno}`
        };
    } catch (err) {
        console.error('[DNI Lookup Error]', err.message);
        throw err;
    }
};

module.exports = { getDniData };
