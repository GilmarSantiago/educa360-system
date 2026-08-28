// Lógica del Módulo de Caja (Cash Registers)

async function renderCajaModule() {
    const container = document.querySelector('.content-body');
    if (!container) return;

    container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h4 class="fw-bold mb-1" style="color: var(--primary-color);">Control de Caja</h4>
                <p class="text-muted mb-0">Apertura, cuadre y cierre de caja.</p>
            </div>
            <button class="btn btn-outline-secondary rounded-pill" onclick="loadModule('caja')">
                <i class="fas fa-sync-alt me-2"></i>Refrescar
            </button>
        </div>
        <div id="cajaContentLoader" class="text-center py-5">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="mt-2 text-muted">Cargando estado de la caja...</p>
        </div>
        <div id="cajaContent" style="display: none;"></div>
    `;

    await fetchCajaStatus();
}

async function fetchCajaStatus() {
    try {
        const token = localStorage.getItem('token');
        const [resSession, resConfig] = await Promise.all([
            fetch('/api/cash-registers/current', { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch('/api/school', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        
        const data = await resSession.json();
        const configData = await resConfig.json();
        
        window._cajaPaymentMethods = (configData.success && configData.school.paymentMethods) 
            ? configData.school.paymentMethods 
            : ['Efectivo', 'Yape / Plin', 'Transferencia', 'Tarjeta'];

        document.getElementById('cajaContentLoader').style.display = 'none';
        const contentDiv = document.getElementById('cajaContent');
        contentDiv.style.display = 'block';

        if (data.success && data.session) {
            renderCajaOpen(data.session);
        } else {
            renderCajaClosed();
        }
    } catch (err) {
        console.error(err);
        Swal.fire('Error', 'No se pudo cargar el estado de la caja', 'error');
    }
}

function renderCajaClosed() {
    const contentDiv = document.getElementById('cajaContent');
    contentDiv.innerHTML = `
        <div class="card border-0 shadow-sm rounded-4 overflow-hidden" style="max-width: 500px; margin: 0 auto;">
            <div class="card-header bg-white border-0 text-center pt-5 pb-3">
                <div class="bg-light-orange d-inline-flex align-items-center justify-content-center rounded-circle mb-3" style="width: 80px; height: 80px;">
                    <i class="fas fa-cash-register text-orange fa-2x"></i>
                </div>
                <h4 class="fw-bold text-dark mb-1">Caja Cerrada</h4>
                <p class="text-muted small">Debes aperturar tu caja para realizar cobros.</p>
            </div>
            <div class="card-body px-5 pb-5">
                <form id="formOpenCaja" onsubmit="openCaja(event)">
                    <div class="mb-4">
                        <label class="form-label text-muted small fw-bold mb-1">MONTO INICIAL EN EFECTIVO (S/)</label>
                        <div class="input-group input-group-lg">
                            <span class="input-group-text bg-light border-0">S/</span>
                            <input type="number" step="0.01" min="0" class="form-control bg-light border-0" id="cajaInitialAmount" required placeholder="0.00">
                        </div>
                    </div>
                    <button type="submit" class="btn btn-primary btn-lg w-100 rounded-pill fw-bold" style="background-color: var(--primary-color); border: none;">
                        <i class="fas fa-lock-open me-2"></i>Abrir Caja
                    </button>
                </form>
            </div>
        </div>
    `;
}

function renderCajaOpen(session) {
    const contentDiv = document.getElementById('cajaContent');
    const openedAt = new Date(session.openedAt).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
    
    const paymentMethods = window._cajaPaymentMethods || ['Efectivo', 'Yape / Plin', 'Transferencia', 'Tarjeta'];
    
    // Generate inputs for actual amounts based on payment methods is moved to showCloseCajaModal

    // Generate transactions list
    let trsHtml = '';
    if (session.sessionPayments && session.sessionPayments.length > 0) {
        trsHtml = session.sessionPayments.map(p => `
            <tr>
                <td class="small">${new Date(p.updatedAt || p.paymentDate || p.createdAt || p.date || 0).toLocaleString('es-ES')}</td>
                <td class="small text-muted fw-bold">${p.studentName || 'Desconocido'}</td>
                <td class="small fw-bold">${p.concept || 'Pago'}</td>
                <td class="small text-muted">${p.method || 'Efectivo'}</td>
                <td class="small fw-bold text-success">S/ ${(Number(p.amount) || 0).toFixed(2)}</td>
            </tr>
        `).join('');
    } else {
        trsHtml = `<tr><td colspan="5" class="text-center text-muted small py-3">No hay transacciones registradas en este turno.</td></tr>`;
    }

    contentDiv.innerHTML = `
        <div class="row g-4">
            <div class="col-lg-4">
                <div class="card border-0 shadow-sm rounded-4 mb-4 bg-primary text-white position-relative overflow-hidden" style="background: linear-gradient(135deg, var(--primary-color), #0a58ca) !important;">
                    <div class="position-absolute top-0 end-0 opacity-25 p-3">
                        <i class="fas fa-cash-register fa-4x"></i>
                    </div>
                    <div class="card-body p-4 position-relative z-1">
                        <span class="badge bg-white text-primary rounded-pill px-3 py-2 mb-3 fw-bold">Caja Abierta</span>
                        <h5 class="fw-bold mb-1">Sesión Activa</h5>
                        <p class="small opacity-75 mb-4"><i class="far fa-clock me-1"></i> Apertura: ${openedAt}</p>
                        
                        <div>
                            <p class="small opacity-75 mb-1 text-uppercase fw-bold" style="letter-spacing: 1px;">Saldo Inicial</p>
                            <h2 class="fw-bold mb-0">S/ ${session.initialAmount.toFixed(2)}</h2>
                        </div>
                    </div>
                </div>

                <div class="mt-4 text-center">
                    <button type="button" onclick="showCloseCajaModal()" class="btn btn-danger btn-lg rounded-pill fw-bold border-0 shadow-sm px-5" style="background: linear-gradient(135deg, #ef476f, #d90429); width: 100%;">
                        <i class="fas fa-lock me-2"></i>Cerrar Caja Automáticamente
                    </button>
                </div>
            </div>
            
            <div class="col-lg-8">
                <div class="row g-4 mb-4">
                    <div class="col-md-6">
                        <div class="card border-0 shadow-sm rounded-4 h-100">
                            <div class="card-body p-4">
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <div class="bg-light-green text-green rounded-circle d-flex align-items-center justify-content-center" style="width: 48px; height: 48px;">
                                        <i class="fas fa-arrow-down fa-lg"></i>
                                    </div>
                                    <span class="badge bg-light text-dark border">${session.paymentsCount || 0} Trxs</span>
                                </div>
                                <p class="text-muted small fw-bold mb-1 text-uppercase" style="letter-spacing: 1px;">Ingresos (Ventas)</p>
                                <h3 class="fw-bold text-dark mb-0">S/ ${(session.totalSales || 0).toFixed(2)}</h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card border-0 shadow-sm rounded-4 h-100">
                            <div class="card-body p-4">
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <div class="bg-light-blue text-blue rounded-circle d-flex align-items-center justify-content-center" style="width: 48px; height: 48px;">
                                        <i class="fas fa-equals fa-lg"></i>
                                    </div>
                                </div>
                                <p class="text-muted small fw-bold mb-1 text-uppercase" style="letter-spacing: 1px;">Total Global en Caja</p>
                                <h3 class="fw-bold text-primary mb-0">S/ ${(session.systemCalculatedAmount || 0).toFixed(2)}</h3>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card border-0 shadow-sm rounded-4">
                    <div class="card-header bg-white border-0 pt-4 pb-2 px-4">
                        <h5 class="fw-bold mb-0"><i class="fas fa-list-ul text-muted me-2"></i>Historial de Transacciones del Turno</h5>
                    </div>
                    <div class="card-body p-0">
                        <div class="global-table-container table-responsive" style="max-height: 400px; overflow-y: auto;">
                            <table class="global-table">
                                <thead class="bg-light sticky-top">
                                    <tr>
                                        <th style="width: 20%;" class="small text-muted fw-bold">Fecha y Hora</th>
                                        <th style="width: 25%;" class="small text-muted fw-bold">Alumno</th>
                                        <th style="width: 25%;" class="small text-muted fw-bold">Concepto</th>
                                        <th style="width: 15%;" class="small text-muted fw-bold">Método de Pago</th>
                                        <th style="width: 15%;" class="small text-muted fw-bold">Monto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${trsHtml}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    // Remove inline closure form

    // Guardar session global temporal para cálculos de cierre
    window._currentCajaSession = session;
}

async function openCaja(e) {
    e.preventDefault();
    const initialAmount = document.getElementById('cajaInitialAmount').value;
    
    try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/cash-registers/open', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ initialAmount: Number(initialAmount) })
        });
        const data = await res.json();
        
        if (data.success) {
            Swal.fire({
        allowOutsideClick: false,
                icon: 'success',
                title: 'Caja Aperturada',
                text: 'La caja se abrió correctamente. Ya puedes procesar pagos.',
                confirmButtonColor: 'var(--primary-color)'
            });
            fetchCajaStatus();
        } else {
            Swal.fire('Error', data.message || 'Error al abrir caja', 'error');
        }
    } catch (err) {
        Swal.fire('Error', 'Error de conexión', 'error');
    }
}

async function showCloseCajaModal() {
    const session = window._currentCajaSession;
    if (!session) return;

    const { isConfirmed, value: token } = await Swal.fire({
        allowOutsideClick: false,
        title: '<i class="fas fa-lock text-primary mb-2"></i><br>Cierre de Caja',
        html: `
            <p class="text-muted small mb-4">Para cerrar la caja, solicite a su supervisor el código de autorización temporal de 6 dígitos.</p>
            <div class="form-floating mb-3">
                <input type="text" class="form-control text-center fw-bold fs-4" id="cajaAuthToken" placeholder="Código" maxlength="6" autocomplete="off" style="letter-spacing: 5px;">
                <label for="cajaAuthToken">Código de Autorización</label>
            </div>
        `,
        width: '400px',
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-check me-1"></i> Confirmar Cierre',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: 'var(--primary-color)',
        preConfirm: () => {
            const input = document.getElementById('cajaAuthToken').value.trim();
            if (!input || input.length !== 6) {
                Swal.showValidationMessage('Ingrese un código de 6 dígitos válido');
                return false;
            }
            return input;
        }
    });

    if (isConfirmed && token) {
        await processCajaClosure(token);
    }
}

async function processCajaClosure(token) {
    try {
        const authToken = localStorage.getItem('token');
        const res = await fetch('/api/cash-registers/close', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}` 
            },
            body: JSON.stringify({ pin: token })
        });
        const data = await res.json();
        
        if (data.success) {
            Swal.fire({
        allowOutsideClick: false,
                icon: 'success',
                title: 'Caja Cerrada',
                text: 'La caja se cerró exitosamente.',
                confirmButtonColor: 'var(--primary-color)'
            });
            fetchCajaStatus();
        } else {
            Swal.fire('Error', data.message || 'Error al cerrar caja o PIN incorrecto', 'error');
        }
    } catch (err) {
        Swal.fire('Error', 'Error de conexión', 'error');
    }
}

