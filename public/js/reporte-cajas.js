// Módulo de Reportes de Caja (Exclusivo para el Administrador)

async function renderReporteCajasModule() {
    const container = document.querySelector('.content-body');
    if (!container) return;

    container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h4 class="fw-bold mb-1" style="color: var(--primary-color);">Reportes de Caja</h4>
                <p class="text-muted mb-0">Historial global de cajas aperturadas y cerradas en el sistema.</p>
            </div>
            <button class="btn btn-outline-secondary rounded-pill" onclick="loadModule('reporte_cajas')">
                <i class="fas fa-sync-alt me-2"></i>Actualizar
            </button>
        </div>
        
        <div class="card border-0 shadow-sm rounded-4 mb-4">
            <div class="card-body p-4">
                <div class="row g-4 mb-4">
                    <div class="col-md-4">
                        <div class="p-3 bg-light rounded-4 border">
                            <p class="text-muted small fw-bold mb-1 text-uppercase">Cajas Totales</p>
                            <h3 class="fw-bold text-dark mb-0" id="totalCajasCount">0</h3>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="p-3 bg-light-green rounded-4 border border-success border-opacity-25">
                            <p class="text-green small fw-bold mb-1 text-uppercase">Cajas Abiertas</p>
                            <h3 class="fw-bold text-success mb-0" id="openCajasCount">0</h3>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="p-3 bg-light-blue rounded-4 border border-primary border-opacity-25">
                            <p class="text-blue small fw-bold mb-1 text-uppercase">Monto Total Reportado</p>
                            <h3 class="fw-bold text-primary mb-0" id="totalMontoReportado">S/ 0.00</h3>
                        </div>
                    </div>
                </div>

                <div class="global-table-container table-responsive">
                    <table class="global-table" id="reporteCajasTable">
                        <thead class="bg-light">
                            <tr>
                                <th style="width: 10%;" class="small text-muted fw-bold">ID Sesión</th>
                                <th style="width: 20%;" class="small text-muted fw-bold">Cajero</th>
                                <th style="width: 10%;" class="small text-muted fw-bold">Estado</th>
                                <th style="width: 15%;" class="small text-muted fw-bold">Apertura</th>
                                <th style="width: 15%;" class="small text-muted fw-bold">Cierre</th>
                                <th style="width: 10%;" class="small text-muted fw-bold">Ingresos</th>
                                <th style="width: 10%;" class="small text-muted fw-bold">Diferencia</th>
                                <th style="width: 10%;" class="small text-muted fw-bold text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="reporteCajasTbody">
                            <tr>
                                <td colspan="8" class="text-center py-4">
                                    <div class="spinner-border text-primary" role="status"></div>
                                    <p class="text-muted mt-2 mb-0">Cargando reporte global...</p>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    await fetchReporteCajasData();
}

async function fetchReporteCajasData() {
    try {
        const token = localStorage.getItem('token');
        
        // Fetch users and cash sessions history in parallel
        const [usersRes, historyRes] = await Promise.all([
            fetch('/api/users', { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch('/api/cash-registers/history', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        const usersData = await usersRes.json();
        const historyData = await historyRes.json();

        if (historyData.success) {
            const usersMap = {};
            if (usersData.success && usersData.users) {
                usersData.users.forEach(u => {
                    usersMap[u.id] = u.name || u.username;
                });
            }

            const sessions = historyData.history || [];
            
            // Stats calculation
            const totalCajas = sessions.length;
            const openCajas = sessions.filter(s => s.status === 'open').length;
            let totalReported = 0;

            const tbody = document.getElementById('reporteCajasTbody');
            tbody.innerHTML = '';

            window._reporteCajasSessions = sessions;

            if (totalCajas === 0) {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No se han registrado sesiones de caja en el sistema.</td></tr>';
            } else {
                // Sort by descending date
                sessions.sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt));

                sessions.forEach(s => {
                    const cajeroName = usersMap[s.userId] || 'Usuario ' + s.userId;
                    const isClosed = s.status === 'closed';
                    const statusHtml = isClosed 
                        ? '<span class="badge bg-secondary text-white rounded-pill px-2">Cerrada</span>'
                        : '<span class="badge bg-success text-white rounded-pill px-2">Abierta</span>';
                    
                    const openDate = new Date(s.openedAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
                    const closeDate = isClosed && s.closedAt ? new Date(s.closedAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : '-';
                    
                    let diffHtml = '-';
                    if (isClosed) {
                        if (s.totalDifference < 0) diffHtml = `<span class="text-danger fw-bold">S/ ${s.totalDifference.toFixed(2)}</span>`;
                        else if (s.totalDifference > 0) diffHtml = `<span class="text-success fw-bold">+S/ ${s.totalDifference.toFixed(2)}</span>`;
                        else diffHtml = `<span class="text-muted">Cuadre exacto</span>`;
                        
                        totalReported += (s.totalActual || 0);
                    }

                    const salesHtml = isClosed ? `S/ ${(s.totalSales || 0).toFixed(2)}` : `<span class="text-muted fst-italic">En curso</span>`;

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td class="small fw-bold text-muted">#${s.id}</td>
                        <td class="small fw-bold">${cajeroName}</td>
                        <td class="small">${statusHtml}</td>
                        <td class="small text-muted">${openDate}</td>
                        <td class="small text-muted">${closeDate}</td>
                        <td class="small fw-bold">${salesHtml}</td>
                        <td class="small">${diffHtml}</td>
                        <td class="small text-center">
                            <button class="btn btn-sm btn-light rounded-pill px-3" onclick="viewReporteTransactions('${s.id}')" title="Ver Transacciones">
                                <i class="fas fa-eye text-primary"></i>
                            </button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            }

            document.getElementById('totalCajasCount').innerText = totalCajas;
            document.getElementById('openCajasCount').innerText = openCajas;
            document.getElementById('totalMontoReportado').innerText = 'S/ ' + totalReported.toFixed(2);

        } else {
            document.getElementById('reporteCajasTbody').innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Error al cargar historial: ${historyData.message}</td></tr>`;
        }

    } catch (err) {
        console.error(err);
        document.getElementById('reporteCajasTbody').innerHTML = `<tr><td colspan="8" class="text-center text-danger py-4">Error de red al cargar el reporte.</td></tr>`;
    }
}

window.viewReporteTransactions = function(sessionId) {
    if (!window._reporteCajasSessions) return;
    const session = window._reporteCajasSessions.find(s => s.id === sessionId);
    if (!session) return;

    let trs = '';
    if (session.sessionPayments && session.sessionPayments.length > 0) {
        trs = session.sessionPayments.map(p => `
            <tr>
                <td class="small">${new Date(p.updatedAt || p.paymentDate || p.createdAt || p.date || 0).toLocaleString('es-ES')}</td>
                <td class="small fw-bold">${p.studentName || 'Desconocido'}</td>
                <td class="small">${p.concept || 'Pago'}</td>
                <td class="small text-muted">${p.method || 'Efectivo'}</td>
                <td class="small fw-bold text-success">S/ ${(Number(p.amount) || 0).toFixed(2)}</td>
            </tr>
        `).join('');
    } else {
        trs = '<tr><td colspan="5" class="text-center text-muted small py-3">No hay transacciones registradas.</td></tr>';
    }

    const modalId = 'modalTransactions_' + Date.now();
    const modalHtml = `
    <div class="modal fade" id="${modalId}" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-lg modal-dialog-centered">
            <div class="modal-content global-modal-content">
                <div class="modal-header global-modal-header">
                    <h5 class="modal-title fw-bold">
                        <i class="fas fa-list-ul me-2"></i>Transacciones de la Sesión #${session.id}
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body p-0">
                    <div class="global-table-container table-responsive border-0 mb-0" style="max-height: 400px; overflow-y: auto;">
                        <table class="global-table">
                            <thead class="bg-light sticky-top">
                                <tr>
                                    <th class="small text-muted fw-bold">Fecha y Hora</th>
                                    <th class="small text-muted fw-bold">Alumno</th>
                                    <th class="small text-muted fw-bold">Concepto</th>
                                    <th class="small text-muted fw-bold">Método</th>
                                    <th class="small text-muted fw-bold">Monto</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${trs}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="modal-footer bg-light border-0 p-3">
                    <button type="button" class="btn btn-outline-secondary rounded-pill px-4" data-bs-dismiss="modal">Cerrar</button>
                </div>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const mEl = document.getElementById(modalId);
    const mInstance = new bootstrap.Modal(mEl, { backdrop: 'static', keyboard: false });
    mInstance.show();

    mEl.addEventListener('hidden.bs.modal', function () {
        mEl.remove();
    });
};
