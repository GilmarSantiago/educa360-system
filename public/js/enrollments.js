// Enrollments Module - Educa360
// Centralizes student registration, parent auto-account creation, wizard flows, and folder management.

let _enrollmentsCache = [];
let _academicYearsCache = [];
let _financialConceptsCache = [];

async function renderEnrollmentsModule() {
    const container = document.querySelector('.content-body');
    if (!container) return;

    // Fetch Academic Years for the global filter
    const token = localStorage.getItem('token');
    const resAy = await fetch('/api/academic-years', { headers: { 'Authorization': `Bearer ${token}` }});
    const dataAy = await resAy.json();
    _academicYearsCache = dataAy.success ? (dataAy.academicYears || []) : [];
    const activeAy = _academicYearsCache.find(y => y.isActive);

    container.innerHTML = `
        <div class="container-fluid animate__animated animate__fadeIn">
            <div class="card border-0 shadow-sm rounded-4 overflow-hidden">
                <div class="card-header bg-white border-0 p-4 d-flex flex-wrap justify-content-between align-items-center gap-3">
                    <div>
                        <h5 class="fw-bold text-dark mb-0"><i class="fas fa-user-plus me-2 text-primary"></i>Gestión de Inscripciones</h5>
                        <p class="text-muted small mt-1 mb-0">Registra alumnos y visualiza el historial de matrículas.</p>
                    </div>
                    <div class="d-flex align-items-center gap-3">
                        <div class="input-group input-group-sm" style="width: 250px;">
                            <span class="input-group-text bg-light border-0"><i class="fas fa-calendar-alt text-muted"></i></span>
                            <select id="globalAyFilter" class="form-select border-0 bg-light fw-bold" onchange="loadEnrollmentsList()">
                                <option value="">Año Activo</option>
                                ${_academicYearsCache.map(y => `<option value="${y.id}" ${activeAy?.id == y.id ? 'selected' : ''}>${y.name}</option>`).join('')}
                            </select>
                        </div>
                        <button class="btn btn-primary rounded-pill px-4" style="background-color: var(--primary-color); border: none;" onclick="openEnrollmentModal()">
                            <i class="fas fa-plus me-2"></i> Nueva Inscripción
                        </button>
                    </div>
                </div>
                <div class="card-body p-4">
                    <div class="global-table-container table-responsive">
                        <table class="global-table">
                            <thead class="bg-light text-muted small">
                                <tr>
                                    <th class="border-0 rounded-start">ALUMNO</th>
                                    <th class="border-0">GRADO/SECCIÓN</th>
                                    <th class="border-0">TIPO</th>
                                    <th class="border-0">AÑO ESCOLAR</th>
                                    <th class="border-0">FECHA REGISTRO</th>
                                    <th class="border-0 text-center">ESTADO</th>
                                    <th class="border-0 rounded-end text-center">ACCIONES</th>
                                </tr>
                            </thead>
                            <tbody id="enrollmentsTableBody">
                                <tr><td colspan="7" class="text-center py-4"><div class="spinner-border text-primary" role="status"></div></td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;

    loadEnrollmentsList();
}

async function loadEnrollmentsList() {
    try {
        const token = localStorage.getItem('token');
        const ayId = document.getElementById('globalAyFilter')?.value || '';
        const url = ayId ? `/api/enrollments?academicYearId=${ayId}` : '/api/enrollments';
        
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` }});
        const data = await res.json();
        
        _enrollmentsCache = data.enrollments || [];
        _enrollmentsCache.sort((a, b) => b.id - a.id);

        const tbody = document.getElementById('enrollmentsTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (data.success && _enrollmentsCache.length > 0) {
            _enrollmentsCache.forEach(e => {
                const statusBadge = e.status === 'activo' 
                    ? '<span class="badge bg-success bg-opacity-10 text-success rounded-pill px-3 py-2">ACTIVA</span>'
                    : '<span class="badge bg-danger bg-opacity-10 text-danger rounded-pill px-3 py-2">CANCELADA</span>';

                tbody.innerHTML += `
                    <tr class="${e.status === 'cancelado' ? 'opacity-50' : ''}">
                        <td>
                            <div class="fw-bold text-dark">${e.studentName}</div>
                            <div class="small text-muted">ID/DNI: ${e.studentId}</div>
                        </td>
                        <td>${e.gradeName} - "${e.section}"</td>
                        <td>
                            <span class="badge ${e.isNew ? 'bg-info bg-opacity-10 text-info' : 'bg-primary bg-opacity-10 text-primary'} rounded-pill x-small px-3">
                                ${e.isNew ? 'NUEVO' : 'ANTIGUO'}
                            </span>
                        </td>
                        <td><span class="badge bg-light text-dark border rounded-pill px-3">${e.academicYearName}</span></td>
                        <td class="text-muted">${new Date(e.date).toLocaleDateString()}</td>
                        <td class="text-center">${statusBadge}</td>
                        <td class="text-center">
                            <div class="btn-group">
                                <button class="btn btn-sm btn-outline-primary rounded-circle me-1" title="Ver Carpeta / Pagos" onclick="viewStudentFolder('${e.studentId}')">
                                    <i class="fas fa-folder-open"></i>
                                </button>
                                ${e.status === 'activo' ? `
                                <button class="btn btn-sm btn-outline-danger rounded-circle" title="Anular Inscripción" onclick="cancelEnrollment('${e.id}', '${e.studentName}')">
                                    <i class="fas fa-trash"></i>
                                </button>` : ''}
                            </div>
                        </td>
                    </tr>
                `;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">No se encontraron inscripciones.</td></tr>';
        }
    } catch (e) { 
        console.error(e);
        const tbody = document.getElementById('enrollmentsTableBody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger py-4">Error de conexión.</td></tr>';
    }
}

async function cancelEnrollment(id, name) {
    const result = await Swal.fire({
        allowOutsideClick: false,
        title: '¿Anular Inscripción?',
        text: `El estado de la matrícula de ${name} cambiará a CANCELADA y las deudas pendientes se anularán. Si el apoderado no tiene más alumnos activos, su cuenta de acceso será bloqueada automáticamente.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, anular',
        cancelButtonText: 'Regresar',
        confirmButtonColor: '#ef4444',
        customClass: { popup: 'rounded-4 border-0 shadow-lg', confirmButton: 'rounded-pill px-4', cancelButton: 'rounded-pill px-4' }
    });

    if (result.isConfirmed) {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/enrollments/cancel/${id}`, { 
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
            showToast('success', 'Inscripción cancelada y cuenta de apoderado auditada.');
            loadEnrollmentsList();
        } else {
            showToast('error', 'Error al procesar la cancelación');
        }
    }
}

async function viewStudentFolder(studentId) {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/enrollments/folder/${studentId}`, { 
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    if (!data.success || !data.data) {
        showToast('error', 'No se pudo cargar la carpeta del alumno');
        return;
    }

    const { student, parent, enrollments, payments } = data.data;
    
    // Renders the most recent enrollment
    const recentEnrollment = enrollments.sort((a, b) => b.id - a.id)[0];

    const resGrades = await fetch('/api/grades', { headers: { 'Authorization': `Bearer ${token}` }});
    const dataGrades = await resGrades.json();
    const grades = dataGrades.success ? dataGrades.grades : (window._currentGrades || []);

    const grade = grades.find(g => g.id == recentEnrollment.gradeId);
    const gradeName = grade ? `${grade.name} (${grade.level.toUpperCase()})` : (recentEnrollment.gradeName || 'N/A');
    
    let folderHtml = `
        <style>
            .premium-folder-card { transition: all 0.3s ease; border: 1px solid rgba(0,0,0,0.05); background: linear-gradient(145deg, #ffffff, #f8f9fa); box-shadow: 0 4px 15px rgba(0,0,0,0.03); }
            .premium-folder-card:hover { transform: translateY(-3px); box-shadow: 0 12px 25px rgba(0,0,0,0.06); border-color: rgba(0,0,0,0.1); }
            .premium-icon-box { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 12px; background: rgba(13, 110, 253, 0.1); color: #0d6efd; margin-bottom: 10px; }
            .premium-icon-box-parent { background: rgba(102, 16, 242, 0.1); color: #6610f2; }
            .premium-action-btn { transition: all 0.2s; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
            .premium-action-btn:hover { transform: scale(1.05); box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
            .premium-table-container { border: 1px solid rgba(0,0,0,0.05); border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.02); }
            .width-20 { width: 20px; display: inline-block; text-align: center; }
        </style>
        <div class="text-start mt-2">
            <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3 pb-3 border-bottom">
                <div class="d-flex align-items-center gap-3">
                    <div style="width: 54px; height: 54px; border-radius: 50%; background: linear-gradient(135deg, var(--primary-color), #0d6efd); display: flex; align-items: center; justify-content: center; color: white; font-size: 1.5rem; font-weight: bold; box-shadow: 0 4px 10px rgba(13,110,253,0.3);">
                        ${student.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h5 class="fw-bold text-dark mb-0">${student.name}</h5>
                        <span class="badge ${recentEnrollment.status === 'activo' ? 'bg-success' : (recentEnrollment.status === 'retirado' ? 'bg-danger' : 'bg-secondary')} px-3 py-1 rounded-pill x-small fw-bold mt-1 shadow-sm">
                            <i class="fas fa-circle me-1" style="font-size: 0.5rem; vertical-align: middle;"></i> ${recentEnrollment.status.toUpperCase()}
                        </span>
                    </div>
                </div>
                <div class="d-flex gap-2 flex-wrap">
                    <button class="btn btn-sm btn-primary rounded-pill px-3 py-2 fw-bold x-small premium-action-btn" onclick="showEnrollmentReceipt('${studentId}', '${recentEnrollment.id}')">
                        <i class="fas fa-file-invoice-dollar me-1"></i> Ficha Matrícula
                    </button>
                    ${recentEnrollment.status === 'activo' ? `
                        <button class="btn btn-sm btn-outline-warning rounded-pill px-3 py-2 fw-bold x-small premium-action-btn" onclick="openTransferModal('${recentEnrollment.id}', '${recentEnrollment.gradeId}', '${recentEnrollment.section}', '${studentId}')">
                            <i class="fas fa-exchange-alt me-1"></i> Traslado
                        </button>
                        <button class="btn btn-sm btn-outline-danger rounded-pill px-3 py-2 fw-bold x-small premium-action-btn" onclick="openWithdrawModal('${recentEnrollment.id}', '${studentId}')">
                            <i class="fas fa-user-slash me-1"></i> Retirar
                        </button>
                    ` : ''}
                </div>
            </div>

            <div class="row g-4 mb-4">
                <div class="col-md-6">
                    <div class="p-4 rounded-4 premium-folder-card h-100 position-relative overflow-hidden">
                        <div class="position-absolute" style="top: -15px; right: -15px; font-size: 120px; color: rgba(13,110,253,0.03); transform: rotate(-15deg);"><i class="fas fa-user-graduate"></i></div>
                        <div class="premium-icon-box shadow-sm"><i class="fas fa-user-graduate fs-5"></i></div>
                        <h6 class="fw-bold text-primary mb-3 small text-uppercase" style="letter-spacing: 1px;">Datos Académicos</h6>
                        <div class="text-dark fw-bold mb-2"><i class="far fa-id-card text-muted width-20 me-1"></i>DNI: ${student.document}</div>
                        <div class="text-dark small mb-2"><i class="fas fa-chalkboard-teacher text-muted width-20 me-1"></i>Aula: <span class="fw-bold text-primary">${gradeName} - "${recentEnrollment.section}"</span></div>
                        <div class="text-dark small"><i class="far fa-calendar-alt text-muted width-20 me-1"></i>F. Nac.: ${student.birthdate ? new Date(student.birthdate).toLocaleDateString() : 'N/A'}</div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="p-4 rounded-4 premium-folder-card h-100 position-relative overflow-hidden">
                        <div class="position-absolute" style="top: -15px; right: -15px; font-size: 120px; color: rgba(102,16,242,0.03); transform: rotate(15deg);"><i class="fas fa-user-tie"></i></div>
                        <div class="premium-icon-box premium-icon-box-parent shadow-sm"><i class="fas fa-user-tie fs-5"></i></div>
                        <h6 class="fw-bold mb-3 small text-uppercase" style="color: #6610f2; letter-spacing: 1px;">Apoderado / Tutor</h6>
                        <div class="text-dark fw-bold mb-2 text-truncate"><i class="far fa-user text-muted width-20 me-1"></i>${parent.name}</div>
                        <div class="text-dark small mb-2"><i class="far fa-id-card text-muted width-20 me-1"></i>DNI: ${parent.username}</div>
                        <div class="text-dark small"><i class="fas fa-mobile-alt text-muted width-20 me-1"></i>Celular: ${parent.phone}</div>
                    </div>
                </div>
            </div>

            <div class="card border-0 premium-table-container bg-white">
                <div class="card-header bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <h6 class="fw-bold text-dark mb-0"><i class="fas fa-wallet me-2 text-info"></i>Estado de Cuenta y Pagos</h6>
                    <select id="folderYearFilter" class="form-select form-select-sm border-0 bg-light fw-bold shadow-sm rounded-pill px-3" style="width: 160px; cursor: pointer;" onchange="updateFolderPayments('${studentId}')">
                        ${enrollments.map(e => `<option value="${e.id}">${e.academicYearName}</option>`).join('')}
                    </select>
                </div>
                <div id="folderPaymentsContainer" class="p-0">
                    <!-- Dynamic payments rendered here -->
                </div>
            </div>
        </div>
    `;

    const modalId = 'folderModal_' + studentId;
    const modalHtml = `
    <div class="modal fade dynamic-modal-system" id="${modalId}" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-dialog-centered" style="max-width: 880px;">
            <div class="modal-content global-modal-content">
                <div class="modal-header global-modal-header border-0 pb-0 bg-white d-flex justify-content-end p-3">
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body p-4 pt-0">
                    ${folderHtml}
                </div>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const mEl = document.getElementById(modalId);
    const mInstance = new bootstrap.Modal(mEl, { backdrop: 'static', keyboard: false });
    
    mEl.addEventListener('shown.bs.modal', () => {
        window._currentFolderStudentId = studentId;
        window._folderEnrollments = enrollments;
        window._folderPayments = payments;
        updateFolderPayments(studentId);
    });
    
    mEl.addEventListener('hidden.bs.modal', () => {
        mEl.remove();
    });
    
    mInstance.show();
}

window.updateFolderPaymentsFromPagination = function(page) {
    updateFolderPayments(window._currentFolderStudentId, page);
};

let _folderPaymentsPage = 1;
const FOLDER_PAYMENTS_PER_PAGE = 10;

window.updateFolderPayments = function(studentId, page = 1) {
    _folderPaymentsPage = page;
    const enrollmentId = document.getElementById('folderYearFilter')?.value;
    if (!enrollmentId) return;
    
    const container = document.getElementById('folderPaymentsContainer');
    if (!container) return;

    const allFiltered = (window._folderPayments || []).filter(p => p.enrollmentId == enrollmentId);
    
    // Sort payments: paid first, then pending, then cancelled
    allFiltered.sort((a, b) => {
        const order = { 'pagado': 1, 'pendiente': 2, 'cancelado': 3 };
        if (order[a.status] !== order[b.status]) {
            return order[a.status] - order[b.status];
        }
        return new Date(a.dueDate) - new Date(b.dueDate);
    });

    const total = allFiltered.length;
    const start = (page - 1) * FOLDER_PAYMENTS_PER_PAGE;
    const paged = allFiltered.slice(start, start + FOLDER_PAYMENTS_PER_PAGE);

    container.innerHTML = `
        <div class="global-table-container table-responsive">
            <table class="global-table" style="min-height: 200px;">
                <thead class="bg-light text-muted x-small">
                    <tr>
                        <th class="ps-3 py-2">CONCEPTO</th>
                        <th>VENCIMIENTO</th>
                        <th>MONTO</th>
                        <th>ESTADO</th>
                        <th>FECHA PAGO</th>
                        <th class="text-center">OPCIONES</th>
                    </tr>
                </thead>
                <tbody>
                    ${paged.map(p => {
                        const isPending = p.status === 'pendiente';
                        const isPaid = p.status === 'pagado';
                        const isLate = isPending && p.dueDate && new Date(p.dueDate) < new Date();
                        
                        return `
                        <tr class="${p.status === 'cancelado' ? 'opacity-50 text-decoration-line-through' : ''} ${isLate ? 'bg-danger bg-opacity-10' : ''}">
                            <td class="ps-3 py-3">
                                <div class="fw-bold small text-dark">${p.concept}</div>
                                ${isLate ? '<span class="badge bg-danger x-small" style="font-size:0.6rem">VENCIDO</span>' : ''}
                            </td>
                            <td class="text-muted small">${p.dueDate ? new Date(p.dueDate).toLocaleDateString() : '---'}</td>
                            <td class="fw-bold small">
                                S/ ${p.amount.toFixed(2)}
                                ${p.discount ? `
                                    <span class="badge bg-info text-white x-small d-block mt-1 text-start" style="font-size:0.6rem; width: max-content;" title="Original: S/ ${p.originalAmount.toFixed(2)}">
                                        <i class="fas fa-gift me-1"></i>BECA -${p.discount.value}${p.discount.type === 'percentage' ? '%' : ' S/.'}
                                    </span>
                                ` : ''}
                            </td>
                            <td>
                                <span class="badge ${p.status === 'pendiente' ? 'bg-warning text-dark' : (p.status === 'cancelado' ? 'bg-secondary' : 'bg-success')} rounded-pill x-small px-2">
                                    ${p.status.toUpperCase()}
                                </span>
                            </td>
                            <td class="text-muted small">${p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : '---'}</td>
                            <td class="text-center">
                                ${isPending ? `
                                    <div class="d-flex gap-1 justify-content-center">
                                        <button class="btn btn-sm btn-outline-info rounded-pill px-2 x-small fw-bold animate-pulse" onclick="openDiscountModal('${p.id}', '${p.amount}', '${studentId}')" title="Aplicar Beca o Descuento Especial">
                                            <i class="fas fa-percentage"></i> BECA
                                        </button>
                                    </div>
                                ` : (isPaid ? `<span class="text-success small"><i class="fas fa-check-double text-success"></i> PAGADO</span>` : '---')}
                            </td>
                        </tr>
                    `;}).join('')}
                    ${paged.length === 0 ? '<tr><td colspan="6" class="text-center py-5 text-muted">No hay registros para este año.</td></tr>' : ''}
                </tbody>
            </table>
        </div>
        <div class="p-3 border-top d-flex justify-content-between align-items-center" style="${total <= FOLDER_PAYMENTS_PER_PAGE ? 'display: none !important;' : ''}">
            <div class="small text-muted">Mostrando ${paged.length} de ${total} registros</div>
            <div id="folderPagination"></div>
        </div>
    `;

    renderTablePagination('folderPagination', total, FOLDER_PAYMENTS_PER_PAGE, page, 'updateFolderPaymentsFromPagination');
};

// ── WIZARD DE INSCRIPCIÓN EN 4 PASOS ─────────────────────────────────────────

async function openEnrollmentModal() {
    const token = localStorage.getItem('token');
    
    // Fetch Academic Grades
    const resGrades = await fetch('/api/grades', { headers: { 'Authorization': `Bearer ${token}` }});
    const dataGrades = await resGrades.json();
    let _gradesCache = dataGrades.success ? dataGrades.grades : [];
    const gradesOptions = _gradesCache.map(g => `<option value="${g.id}">${g.name} (${g.level.toUpperCase()})</option>`).join('');

    // Fetch Academic Years
    const resAy = await fetch('/api/academic-years', { headers: { 'Authorization': `Bearer ${token}` }});
    const dataAy = await resAy.json();
    const activeAy = dataAy.success ? (dataAy.academicYears || []).find(y => y.isActive) : null;

    if (!activeAy) {
        Swal.fire('Error', 'Debe configurar un Año Académico Activo primero.', 'warning');
        return;
    }
    
    // Fetch School config for payment methods
    const resConfig = await fetch('/api/school', { headers: { 'Authorization': `Bearer ${token}` }});
    const dataConfig = await resConfig.json();
    const paymentMethods = (dataConfig.success && dataConfig.school.paymentMethods) ? dataConfig.school.paymentMethods : ['Efectivo', 'Yape / Plin', 'Transferencia', 'Tarjeta'];
    const paymentMethodsOptions = paymentMethods.map(m => `<option value="${m}">${m}</option>`).join('');

    // Initialize temporary wizard variables
    window._activeAcademicYear = activeAy;
    window._currentGrades = _gradesCache;
    window._currentWizardStep = 1;
    window._studentStatus = 'Nuevo';
    window._isParentOld = false;
    window._isLateEnrollment = false;

    const bodyHtml = `
        <div id="enrollmentWizard" style="max-height: 480px; overflow-y: auto; overflow-x: hidden;">
            <!-- Step Progress Indicators -->
            <div class="d-flex justify-content-between align-items-center mb-4 px-3 py-2 bg-light rounded-pill border shadow-sm mx-1">
                <div class="step-indicator" id="wz-dot-1" style="flex: 1; text-align: center;">
                    <span class="badge rounded-circle bg-primary text-white p-2" style="width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.9rem;">1</span>
                    <div class="x-small fw-bold text-primary mt-1" style="font-size:0.75rem">Apoderado</div>
                </div>
                <div style="flex: 0.5; height: 2px; background-color: #cbd5e1; transition: all 0.3s ease;" id="wz-line-1"></div>
                <div class="step-indicator" id="wz-dot-2" style="flex: 1; text-align: center;">
                    <span class="badge rounded-circle bg-secondary text-white p-2" style="width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.9rem;">2</span>
                    <div class="x-small fw-bold text-muted mt-1" style="font-size:0.75rem">Alumno</div>
                </div>
                <div style="flex: 0.5; height: 2px; background-color: #cbd5e1; transition: all 0.3s ease;" id="wz-line-2"></div>
                <div class="step-indicator" id="wz-dot-3" style="flex: 1; text-align: center;">
                    <span class="badge rounded-circle bg-secondary text-white p-2" style="width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.9rem;">3</span>
                    <div class="x-small fw-bold text-muted mt-1" style="font-size:0.75rem">Académico</div>
                </div>
                <div style="flex: 0.5; height: 2px; background-color: #cbd5e1; transition: all 0.3s ease;" id="wz-line-3"></div>
                <div class="step-indicator" id="wz-dot-4" style="flex: 1; text-align: center;">
                    <span class="badge rounded-circle bg-secondary text-white p-2" style="width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.9rem;">4</span>
                    <div class="x-small fw-bold text-muted mt-1" style="font-size:0.75rem">Pagos</div>
                </div>
            </div>

            <!-- Sleek Warning Banner -->
            <div id="wzWarningBanner" class="alert alert-danger rounded-4 border-0 p-3 small mb-3 shadow-sm d-none animate__animated animate__fadeIn mx-1">
                <i class="fas fa-exclamation-circle me-2"></i> <span id="wzWarningText"></span>
            </div>

            <!-- Enrollment Form -->
            <form id="enrollmentForm" class="p-2 text-start">
                <input type="hidden" name="academicYearId" value="${activeAy.id}">
                
                <!-- STEP 1: APODERADO -->
                <div class="wizard-step-pane" id="wz-step-1">
                    <h6 class="text-primary fw-bold mb-3"><i class="fas fa-search me-2"></i>Paso 1: Validación del Apoderado</h6>
                    <div class="row g-3">
                        <div class="col-md-12">
                            <label class="form-label text-muted small fw-bold">DOCUMENTO/DNI APODERADO *</label>
                            <div class="input-group">
                                <input type="text" class="form-control rounded-start-pill bg-light border-0 px-3 py-2" name="pa_doc" id="pa_doc" required placeholder="Ingresa el DNI del apoderado">
                                <button type="button" class="btn btn-primary rounded-end-pill px-4" onclick="validateParentDNI()"><i class="fas fa-search me-1"></i> Buscar</button>
                            </div>
                            <div id="parent_validation_badge" class="mt-2"></div>
                        </div>
                        <div class="col-md-12">
                            <label class="form-label text-muted small fw-bold">NOMBRE COMPLETO APODERADO *</label>
                            <input type="text" class="form-control rounded-pill bg-light border-0 px-3 py-2" name="pa_name" id="pa_name" placeholder="Escribe el nombre del apoderado" required disabled>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label text-muted small fw-bold">TELÉFONO DE CONTACTO *</label>
                            <input type="text" class="form-control rounded-pill bg-light border-0 px-3 py-2" name="pa_phone" id="pa_phone" placeholder="Celular" required disabled>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label text-muted small fw-bold">CORREO ELECTRÓNICO *</label>
                            <input type="email" class="form-control rounded-pill bg-light border-0 px-3 py-2" name="pa_email" id="pa_email" placeholder="correo@ejemplo.com" required disabled>
                        </div>
                    </div>
                </div>

                <!-- STEP 2: ALUMNO -->
                <div class="wizard-step-pane d-none" id="wz-step-2">
                    <h6 class="text-primary fw-bold mb-3"><i class="fas fa-user-graduate me-2"></i>Paso 2: Datos del Alumno</h6>
                    <div class="row g-3">
                        <div class="col-md-12">
                            <label class="form-label text-muted small fw-bold">DOCUMENTO/DNI ALUMNO *</label>
                            <div class="input-group">
                                <input type="text" class="form-control rounded-start-pill bg-light border-0 px-3 py-2" name="st_doc" id="st_doc" required placeholder="Ingresa el DNI del alumno">
                                <button type="button" class="btn btn-primary rounded-end-pill px-4" onclick="validateStudentDNI()"><i class="fas fa-search me-1"></i> Validar DNI</button>
                            </div>
                            <div id="student_validation_badge" class="mt-2"></div>
                        </div>
                        <div class="col-md-12">
                            <label class="form-label text-muted small fw-bold">NOMBRE COMPLETO ALUMNO *</label>
                            <input type="text" class="form-control rounded-pill bg-light border-0 px-3 py-2" name="st_name" id="st_name" required placeholder="Escribe el nombre del alumno" disabled>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label text-muted small fw-bold">FECHA DE NACIMIENTO *</label>
                            <input type="date" class="form-control rounded-pill bg-light border-0 px-3 py-2" name="st_birth" id="st_birth" required disabled>
                        </div>
                        <div class="col-md-6" id="prev_school_container">
                            <label class="form-label text-muted small fw-bold">INSTITUCIÓN DE PROCEDENCIA</label>
                            <input type="text" class="form-control rounded-pill bg-light border-0 px-3 py-2" name="st_prev" id="st_prev" placeholder="Ej. Colegio San José" disabled>
                        </div>
                    </div>
                </div>

                <!-- STEP 3: ACADÉMICO -->
                <div class="wizard-step-pane d-none" id="wz-step-3">
                    <h6 class="text-primary fw-bold mb-3"><i class="fas fa-graduation-cap me-2"></i>Paso 3: Asignación Académica y Fecha</h6>
                    <div class="row g-3">
                        <div class="col-md-12">
                            <label class="form-label text-muted small fw-bold">FECHA DE MATRÍCULA *</label>
                            <input type="date" class="form-control rounded-pill bg-light border-0 px-3 py-2" name="enrollment_date" id="st_enroll_date" onchange="checkLateEnrollmentAlert()" required>
                            <div id="late_enrollment_badge" class="mt-2"></div>
                        </div>
                        <div class="col-md-8">
                            <label class="form-label text-muted small fw-bold">GRADO DE ASIGNACIÓN *</label>
                            <select class="form-select rounded-pill bg-light border-0 px-3 py-2" name="st_grade" id="st_grade_select" onchange="updateSectionsDropdown(this)" required>
                                <option value="">Seleccione...</option>
                                ${gradesOptions}
                            </select>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label text-muted small fw-bold">SECCIÓN *</label>
                            <select class="form-select rounded-pill bg-light border-0 px-3 py-2" name="st_section" id="st_section_select" required disabled>
                                <option value="">---</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- STEP 4: PAGOS -->
                <div class="wizard-step-pane d-none" id="wz-step-4">
                    <h6 class="text-primary fw-bold mb-3"><i class="fas fa-hand-holding-usd me-2"></i>Paso 4: Cronograma Financiero Dinámico</h6>
                    <div class="row g-3">
                        <div class="col-12" id="financial_concepts_container" style="max-height: 280px; overflow-y: auto;">
                            <!-- Calculated concepts are dynamically rendered here -->
                        </div>
                        
                        <div class="col-12 border-top pt-3 mt-2">
                            <label class="form-label text-muted small fw-bold">MÉTODO DE PAGO INICIAL (Cuota Ingreso / Matrícula)</label>
                            <select class="form-select rounded-pill border-0 px-3 py-2 bg-light" name="paymentMethod" id="wz_payment_method">
                                ${paymentMethodsOptions}
                            </select>
                            <div class="small text-muted mt-2"><i class="fas fa-info-circle me-1"></i> Estos conceptos iniciales se registrarán automáticamente como <strong>PAGADOS</strong>.</div>
                        </div>
                    </div>
                </div>

                <!-- Navigation Controls -->
                <div class="d-flex justify-content-between align-items-center mt-4 border-top pt-3">
                    <button type="button" class="btn btn-outline-secondary rounded-pill px-4 py-2 fw-bold" id="wz-btn-prev" onclick="prevWizardStep()" disabled>
                        <i class="fas fa-arrow-left me-1"></i> Atrás
                    </button>
                    
                    <span id="payment_preview_badge" class="badge bg-success bg-opacity-10 text-success rounded-pill fw-bold py-2 px-3 d-none"></span>

                    <button type="button" class="btn btn-primary rounded-pill px-4 py-2 fw-bold" id="wz-btn-next" onclick="nextWizardStep()">
                        Siguiente <i class="fas fa-arrow-right ms-1"></i>
                    </button>
                </div>
            </form>
        </div>
    `;

    const modalId = 'wizardModal_' + Date.now();
    const modalHtml = `
    <div class="modal fade dynamic-modal-system" id="${modalId}" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-dialog-centered" style="max-width: 680px;">
            <div class="modal-content global-modal-content">
                <div class="modal-header global-modal-header d-flex justify-content-between align-items-center">
                    <h5 class="modal-title fw-bold text-white mb-0"><i class="fas fa-user-plus me-2"></i>Ficha de Inscripción Escolar</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body p-4">
                    ${bodyHtml}
                </div>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const mEl = document.getElementById(modalId);
    const mInstance = new bootstrap.Modal(mEl, { backdrop: 'static', keyboard: false });
    
    mEl.addEventListener('shown.bs.modal', () => {
        setWizardStep(1);
    });
    
    mEl.addEventListener('hidden.bs.modal', () => {
        mEl.remove();
    });
    
    window._currentEnrollmentWizardModal = mInstance;
    mInstance.show();

    // Set default date to today
    document.getElementById('st_enroll_date').value = new Date().toISOString().split('T')[0];
    checkLateEnrollmentAlert();
}

async function validateParentDNI() {
    const docInput = document.getElementById('pa_doc');
    const doc = docInput.value.trim();
    const badge = document.getElementById('parent_validation_badge');
    if (!doc) {
        showWizardWarning('Ingrese un documento DNI del apoderado.');
        return;
    }

    badge.innerHTML = `<span class="text-muted small"><i class="fas fa-spinner fa-spin me-1"></i> Buscando apoderado...</span>`;
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch(`/api/enrollments/check-parent/${doc}`, { 
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        const nameField = document.getElementById('pa_name');
        const phoneField = document.getElementById('pa_phone');
        const emailField = document.getElementById('pa_email');
        
        nameField.disabled = false;
        phoneField.disabled = false;
        emailField.disabled = false;

        if (data.success && data.exists) {
            nameField.value = data.parent.name;
            phoneField.value = data.parent.phone;
            emailField.value = data.parent.email;
            
            nameField.readOnly = true;
            nameField.classList.add('bg-white-readonly');
            
            window._isParentOld = true;
            badge.innerHTML = `<span class="badge bg-success bg-opacity-10 text-success px-3 py-2 rounded-pill fw-bold"><i class="fas fa-check-circle me-1"></i> Apoderado antiguo encontrado. Se usará su cuenta existente.</span>`;
        } else {
            nameField.value = '';
            phoneField.value = '';
            emailField.value = '';
            nameField.readOnly = false;
            nameField.classList.remove('bg-white-readonly');
            
            window._isParentOld = false;
            badge.innerHTML = `<span class="badge bg-info bg-opacity-10 text-info px-3 py-2 rounded-pill fw-bold"><i class="fas fa-user-plus me-1"></i> Apoderado nuevo. Se generará una cuenta de acceso al finalizar.</span>`;
        }
    } catch (e) {
        badge.innerHTML = `<span class="text-danger small"><i class="fas fa-exclamation-circle me-1"></i> Error al validar apoderado</span>`;
    }
}

async function validateStudentDNI() {
    const docInput = document.getElementById('st_doc');
    const doc = docInput.value.trim();
    const badge = document.getElementById('student_validation_badge');
    const activeAy = window._activeAcademicYear;
    
    if (!doc) {
        showWizardWarning('Ingrese un documento DNI del alumno.');
        return;
    }

    badge.innerHTML = `<span class="text-muted small"><i class="fas fa-spinner fa-spin me-1"></i> Validando historial del alumno...</span>`;
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch(`/api/enrollments/check-student/${doc}?academicYearId=${activeAy.id}`, { 
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        const nameField = document.getElementById('st_name');
        const birthField = document.getElementById('st_birth');
        const prevField = document.getElementById('st_prev');
        
        nameField.disabled = false;
        birthField.disabled = false;
        prevField.disabled = false;

        if (data.success && data.exists) {
            if (data.alreadyEnrolled) {
                showWizardWarning('El alumno ya cuenta con un registro para este año escolar.');
                badge.innerHTML = `<span class="badge bg-danger bg-opacity-10 text-danger px-3 py-2 rounded-pill fw-bold"><i class="fas fa-times-circle me-1"></i> Alumno ya registrado en este año.</span>`;
                // Disable next button to prevent progressing
                document.getElementById('wz-btn-next').disabled = true;
                return;
            }

            document.getElementById('wz-btn-next').disabled = false;
            nameField.value = data.student.name;
            birthField.value = data.student.birthdate ? data.student.birthdate.split('T')[0] : '';
            prevField.value = data.student.previousSchool || 'Interno';
            
            window._studentStatus = data.status; // 'Regular' | 'Reingresante'
            
            if (data.status === 'Regular') {
                badge.innerHTML = `<span class="badge bg-success bg-opacity-10 text-success px-3 py-2 rounded-pill fw-bold"><i class="fas fa-history me-1"></i> Alumno REGULAR (Continuo).</span>`;
            } else {
                badge.innerHTML = `<span class="badge bg-warning bg-opacity-10 text-warning px-3 py-2 rounded-pill fw-bold"><i class="fas fa-undo me-1"></i> Alumno REINGRESANTE.</span>`;
            }

            // Next grade academic promotion
            if (data.lastGradeId) {
                const grades = window._currentGrades || [];
                const levelWeights = { 'inicial': 1, 'primaria': 2, 'secundaria': 3 };
                
                const sortedGrades = [...grades].sort((a, b) => {
                    if (levelWeights[a.level] !== levelWeights[b.level]) {
                        return (levelWeights[a.level] || 0) - (levelWeights[b.level] || 0);
                    }
                    return a.order - b.order;
                });

                const currentIndex = sortedGrades.findIndex(g => g.id == data.lastGradeId);
                const gradeSelect = document.getElementById('st_grade_select');

                if (currentIndex !== -1 && currentIndex < sortedGrades.length - 1) {
                    gradeSelect.value = sortedGrades[currentIndex + 1].id;
                } else if (currentIndex !== -1) {
                    gradeSelect.value = sortedGrades[currentIndex].id;
                }
                updateSectionsDropdown(gradeSelect);
            }

            // Autoload parent if linked
            if (data.parent) {
                document.getElementById('pa_doc').value = data.parent.document;
                document.getElementById('pa_name').value = data.parent.name;
                document.getElementById('pa_phone').value = data.parent.phone;
                document.getElementById('pa_email').value = data.parent.email;
                
                document.getElementById('pa_name').disabled = false;
                document.getElementById('pa_phone').disabled = false;
                document.getElementById('pa_email').disabled = false;
                
                document.getElementById('pa_name').readOnly = true;
                document.getElementById('pa_name').classList.add('bg-white-readonly');
                document.getElementById('parent_validation_badge').innerHTML = `<span class="badge bg-success bg-opacity-10 text-success px-3 py-2 rounded-pill fw-bold"><i class="fas fa-check-circle me-1"></i> Apoderado vinculado automáticamente por DNI de estudiante.</span>`;
            }
        } else {
            document.getElementById('wz-btn-next').disabled = false;
            nameField.value = '';
            birthField.value = '';
            prevField.value = '';
            
            window._studentStatus = 'Nuevo';
            badge.innerHTML = `<span class="badge bg-info bg-opacity-10 text-info px-3 py-2 rounded-pill fw-bold"><i class="fas fa-user-plus me-1"></i> Alumno NUEVO.</span>`;
        }
    } catch (e) {
        badge.innerHTML = `<span class="text-danger small"><i class="fas fa-exclamation-circle me-1"></i> Error al validar alumno</span>`;
    }
}

function checkLateEnrollmentAlert() {
    const dateInput = document.getElementById('st_enroll_date');
    const enrollDate = new Date(dateInput.value + 'T00:00:00');
    const activeAy = window._activeAcademicYear;
    const badge = document.getElementById('late_enrollment_badge');
    if (!badge || !activeAy) return;

    const classStartDate = new Date(activeAy.startDate + 'T00:00:00');

    if (enrollDate > classStartDate) {
        window._isLateEnrollment = true;
        badge.innerHTML = `<div class="alert alert-danger rounded-4 border-0 p-2 small mb-0 shadow-sm"><i class="fas fa-exclamation-triangle me-1"></i> <strong>Inscripción Tardía Activa:</strong> Clases iniciaron el ${classStartDate.toLocaleDateString()}. Se cobrará pensión mensual proporcional.</div>`;
    } else {
        window._isLateEnrollment = false;
        badge.innerHTML = '';
    }
}

function prevWizardStep() {
    if (window._currentWizardStep > 1) {
        setWizardStep(window._currentWizardStep - 1);
    }
}

async function nextWizardStep() {
    const cur = window._currentWizardStep;
    
    // step validation guards
    if (cur === 1) {
        const paDoc = document.getElementById('pa_doc').value.trim();
        const paName = document.getElementById('pa_name').value.trim();
        const paPhone = document.getElementById('pa_phone').value.trim();
        const paEmail = document.getElementById('pa_email').value.trim();

        if (!paDoc) { showWizardWarning('Complete el DNI del apoderado.'); return; }
        if (!paName || !paPhone || !paEmail) { showWizardWarning('Valide el DNI del apoderado o complete su información.'); return; }
    }
    
    if (cur === 2) {
        const stDoc = document.getElementById('st_doc').value.trim();
        const stName = document.getElementById('st_name').value.trim();
        const stBirth = document.getElementById('st_birth').value.trim();

        if (!stDoc) { showWizardWarning('Complete el DNI del alumno.'); return; }
        if (!stName || !stBirth) { showWizardWarning('Valide el DNI del alumno o complete su información.'); return; }
    }

    if (cur === 3) {
        const stGrade = document.getElementById('st_grade_select').value;
        const stSection = document.getElementById('st_section_select').value;
        const enrollDate = document.getElementById('st_enroll_date').value;

        if (!enrollDate) { showWizardWarning('Seleccione la fecha de matrícula.'); return; }
        if (!stGrade) { showWizardWarning('Seleccione un grado académico.'); return; }
        if (!stSection) { showWizardWarning('Seleccione una sección.'); return; }

        calculateWizardPayments();
    }

    if (cur === 4) {
        await submitEnrollmentForm();
        return;
    }

    setWizardStep(cur + 1);
}

function setWizardStep(step) {
    window._currentWizardStep = step;
    
    // Hide all step divs and show active
    document.querySelectorAll('.wizard-step-pane').forEach(p => p.classList.add('d-none'));
    document.getElementById(`wz-step-${step}`).classList.remove('d-none');
    
    // Update visual classes of indicators
    for (let i = 1; i <= 4; i++) {
        const dot = document.getElementById(`wz-dot-${i}`);
        const line = document.getElementById(`wz-line-${i}`);
        const badge = dot.querySelector('.badge');
        const text = dot.querySelector('.x-small');
        
        if (i < step) {
            badge.className = 'badge rounded-circle bg-success text-white p-2';
            badge.innerHTML = '<i class="fas fa-check"></i>';
            text.className = 'x-small fw-bold text-success mt-1';
            if (line) line.style.backgroundColor = 'var(--primary-color)';
        } else if (i === step) {
            badge.className = 'badge rounded-circle bg-primary text-white p-2';
            badge.innerHTML = i;
            text.className = 'x-small fw-bold text-primary mt-1';
            if (line) line.style.backgroundColor = '#cbd5e1';
        } else {
            badge.className = 'badge rounded-circle bg-secondary text-white p-2';
            badge.innerHTML = i;
            text.className = 'x-small fw-bold text-muted mt-1';
            if (line) line.style.backgroundColor = '#cbd5e1';
        }
    }

    // Toggle navigation buttons
    document.getElementById('wz-btn-prev').disabled = (step === 1);
    
    const nextBtn = document.getElementById('wz-btn-next');
    if (step === 4) {
        nextBtn.innerHTML = 'Finalizar Inscripción <i class="fas fa-check-circle ms-1"></i>';
        nextBtn.className = 'btn btn-success rounded-pill px-4 py-2 fw-bold';
        document.getElementById('payment_preview_badge').classList.remove('d-none');
    } else {
        nextBtn.innerHTML = 'Siguiente <i class="fas fa-arrow-right ms-1"></i>';
        nextBtn.className = 'btn btn-primary rounded-pill px-4 py-2 fw-bold';
        document.getElementById('payment_preview_badge').classList.add('d-none');
    }
}

async function calculateWizardPayments() {
    const container = document.getElementById('financial_concepts_container');
    if (!container) return;
    
    container.innerHTML = `<div class="text-center text-muted py-4"><div class="spinner-border spinner-border-sm me-2"></div>Calculando tarifas por nivel...</div>`;

    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch('/api/financial-concepts', { headers: { 'Authorization': `Bearer ${token}` }});
        const data = await res.json();
        
        if (!data.success) {
            container.innerHTML = `<div class="text-danger py-4 text-center">Error cargando conceptos financieros.</div>`;
            return;
        }

        const concepts = data.concepts || [];
        const gradeId = document.getElementById('st_grade_select').value;
        const grade = (window._currentGrades || []).find(g => g.id == gradeId);
        const level = grade ? grade.level : 'primaria';
        const enrollDateStr = document.getElementById('st_enroll_date').value;
        const enrollDate = new Date(enrollDateStr + 'T00:00:00');
        const activeAy = window._activeAcademicYear;

        let html = `
            <div class="global-table-container table-responsive mb-2">
                <table class="global-table">
                    <thead class="bg-light text-muted x-small">
                        <tr>
                            <th style="width: 30%;" class="py-2">CONCEPTO</th>
                            <th style="width: 50%;">DETALLE DE COBRO</th>
                            <th style="width: 20%;">TOTAL (S/)</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        let immediateTotal = 0;

        const countSchoolDays = (year, month, workingDays, holidays, limitDate = null, startFromDate = null) => {
            const startDate = startFromDate ? new Date(startFromDate) : new Date(year, month, 1);
            const endDate = limitDate ? new Date(limitDate) : new Date(year, month + 1, 0);
            
            let count = 0;
            const holidayStrings = (holidays || []).map(h => typeof h === 'string' ? h : h.date);

            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay();
                const dateString = d.toISOString().split('T')[0];
                if (workingDays.includes(dayOfWeek) && !holidayStrings.includes(dateString)) {
                    count++;
                }
            }
            return count;
        };

        concepts.forEach(c => {
            const isStudentNew = (window._studentStatus === 'Nuevo');
            if (isStudentNew && !c.appliesToNew) return;
            if (!isStudentNew && !c.appliesToRegular) return;

            let conceptAmount = (c.amounts && c.amounts[level]) ?? Number(c.defaultAmount) ?? 0;
            let displayDetail = `Obligatorio`;

            const installments = Number(c.installmentsCount) || 1;

            for (let i = 0; i < installments; i++) {
                let currentAmount = conceptAmount;
                let cName = c.name;
                let cDetail = displayDetail;
                
                let dueDate = new Date(activeAy.startDate + 'T00:00:00');
                
                if (c.periodicity === 'monthly') {
                    dueDate.setMonth(dueDate.getMonth() + i);
                    dueDate.setDate(5);

                    // Skip past monthly payments
                    if (dueDate.getFullYear() < enrollDate.getFullYear() || 
                       (dueDate.getFullYear() === enrollDate.getFullYear() && dueDate.getMonth() < enrollDate.getMonth())) {
                        continue;
                    }

                    // Proportional payment logic
                    if (window._isLateEnrollment && dueDate.getFullYear() === enrollDate.getFullYear() && dueDate.getMonth() === enrollDate.getMonth()) {
                        const workingDays = activeAy.workingDays || [1, 2, 3, 4, 5];
                        const holidays = activeAy.holidays || [];
                        const year = enrollDate.getFullYear();
                        const month = enrollDate.getMonth();
                        
                        const monthStart = new Date(year, month, 1);
                        const startForTotal = new Date(activeAy.startDate + 'T00:00:00') > monthStart ? new Date(activeAy.startDate + 'T00:00:00') : monthStart;
                        
                        const totalDays = countSchoolDays(year, month, workingDays, holidays, null, startForTotal);
                        const startForRemaining = enrollDate > startForTotal ? enrollDate : startForTotal;
                        const remainingDays = countSchoolDays(year, month, workingDays, holidays, null, startForRemaining);
                        
                        if (totalDays > 0) {
                            const ratio = remainingDays / totalDays;
                            currentAmount = ratio * conceptAmount;
                            cDetail = `<span class="text-danger fw-bold"><i class="fas fa-calculator me-1"></i> Tardío: ${remainingDays}/${totalDays} días escolares (${(ratio * 100).toFixed(0)}%)</span>`;
                        }
                    } else {
                        const monthName = dueDate.toLocaleString('es-ES', { month: 'long' });
                        cDetail = `Pensión de ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`;
                    }

                    const monthName = dueDate.toLocaleString('es-ES', { month: 'long' });
                    cName = `${c.name} - ${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${dueDate.getFullYear()}`;
                } else if (c.periodicity === 'once') {
                    if (installments > 1) {
                        cName = `${c.name} (Cuota ${i + 1}/${installments})`;
                    }
                }

                const isImmediate = (i === 0 && (c.type === 'enrollment_fee' || c.type === 'tuition'));
                if (isImmediate) {
                    immediateTotal += currentAmount;
                    cDetail += ` • <span class="badge bg-success bg-opacity-10 text-success rounded-pill px-2">Pago Inmediato</span>`;
                }

                html += `
                    <tr>
                        <td style="width: 30%;">
                            <div class="fw-bold text-dark text-uppercase small">${cName}</div>
                        </td>
                        <td style="width: 50%;">
                            <div class="small text-muted" style="font-size:0.75rem">${cDetail}</div>
                        </td>
                        <td style="width: 20%;" class="fw-bold text-dark small">
                            S/ ${currentAmount.toFixed(2)}
                        </td>
                    </tr>
                `;
            }
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        container.innerHTML = html;
        
        const badge = document.getElementById('payment_preview_badge');
        badge.innerHTML = `<i class="fas fa-check me-1"></i> A pagar hoy: S/ ${immediateTotal.toFixed(2)}`;

    } catch (e) {
        console.error(e);
        container.innerHTML = `<div class="text-danger py-4 text-center">Error al procesar cálculos.</div>`;
    }
}

async function submitEnrollmentForm() {
    const token = localStorage.getItem('token');
    const form = document.getElementById('enrollmentForm');
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const fd = new FormData(form);
    
    const payload = {
        student: { 
            name: fd.get('st_name'), 
            document: fd.get('st_doc'), 
            birthdate: fd.get('st_birth'), 
            isNew: (window._studentStatus === 'Nuevo'),
            previousSchool: fd.get('st_prev') || 'Interno'
        },
        parent: { 
            name: fd.get('pa_name'), 
            document: fd.get('pa_doc'), 
            email: fd.get('pa_email'), 
            phone: fd.get('pa_phone') 
        },
        enrollment: { 
            gradeId: fd.get('st_grade'), 
            section: fd.get('st_section'), 
            academicYearId: fd.get('academicYearId'),
            paymentMethod: document.getElementById('wz_payment_method').value,
            date: fd.get('enrollment_date')
        }
    };

    const nextBtn = document.getElementById('wz-btn-next');
    const originalBtnHtml = nextBtn.innerHTML;
    nextBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Procesando...';
    nextBtn.disabled = true;

    try {
        const res = await fetch('/api/enrollments', { 
            method: 'POST', 
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${token}` 
            }, 
            body: JSON.stringify(payload) 
        });
        
        const data = await res.json();

        if (data.success) {
            if (window._currentEnrollmentWizardModal) {
                window._currentEnrollmentWizardModal.hide();
                window._currentEnrollmentWizardModal = null;
            } else {
                Swal.close();
            }
            showToast('success', 'Inscripción procesada exitosamente.');
            loadEnrollmentsList();
            
            // Displays Ficha de Matrícula
            showEnrollmentReceipt(data.studentId, data.enrollmentId);
        } else {
            nextBtn.innerHTML = originalBtnHtml;
            nextBtn.disabled = false;
            showWizardWarning(data.message || 'No se pudo procesar la inscripción.');
        }
    } catch (e) {
        nextBtn.innerHTML = originalBtnHtml;
        nextBtn.disabled = false;
        showWizardWarning('Error de conexión con el servidor.');
    }
}

async function showEnrollmentReceipt(studentId, enrollmentId) {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/enrollments/folder/${studentId}`, { 
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    
    if (!data.success || !data.data) {
        showToast('error', 'No se pudo cargar la constancia de matrícula.');
        return;
    }

    const { student, parent, enrollments, payments } = data.data;
    const enrollment = enrollments.find(e => e.id == enrollmentId) || enrollments[0];
    const filteredPayments = payments.filter(p => p.enrollmentId == enrollment.id);
    const immediatePayments = filteredPayments.filter(p => p.status === 'pagado');
    const futurePayments = filteredPayments.filter(p => p.status === 'pendiente');

    const resGrades = await fetch('/api/grades', { headers: { 'Authorization': `Bearer ${token}` }});
    const dataGrades = await resGrades.json();
    const grades = dataGrades.success ? dataGrades.grades : (window._currentGrades || []);

    const grade = grades.find(g => g.id == enrollment.gradeId);
    const gradeName = grade ? `${grade.name} (${grade.level.toUpperCase()})` : (enrollment.gradeName || 'Desconocido');

    // Fetch school info
    const resSchool = await fetch('/api/school', { headers: { 'Authorization': `Bearer ${token}` }});
    const dataSchool = await resSchool.json();
    const schoolName = (dataSchool.success && dataSchool.school) ? dataSchool.school.name : 'Educa360 School';
    
    // Split school name for styling (first word colored, rest normal)
    const firstSpaceIndex = schoolName.indexOf(' ');
    const firstWord = firstSpaceIndex === -1 ? schoolName : schoolName.substring(0, firstSpaceIndex);
    const restOfName = firstSpaceIndex === -1 ? '' : schoolName.substring(firstSpaceIndex);

    const whatsappMessage = `¡Hola ${parent.name}! Te saludamos de ${schoolName}. Confirmamos la matrícula exitosa de tu hijo(a) ${student.name} en el grado ${gradeName} - "${enrollment.section}" para el año escolar ${enrollment.academicYearName}.\n\nTu cuenta de acceso familiar es:\nUsuario: ${parent.username}\nContraseña: ${parent.username}\nIngresa aquí: ${window.location.origin}\n\n¡Gracias por tu preferencia!`;
    const whatsappUrl = `https://api.whatsapp.com/send?phone=51${parent.phone}&text=${encodeURIComponent(whatsappMessage)}`;

    const receiptHtml = `
        <style>
            .premium-receipt-card { background: linear-gradient(145deg, #ffffff, #f8f9fa); box-shadow: 0 4px 15px rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.05); }
        </style>
        <div id="printReceiptArea" class="text-start mt-2">
            <div class="text-center mb-4 pb-3 border-bottom print-header position-relative">
                <div class="position-absolute top-0 end-0 d-none d-md-block opacity-10"><i class="fas fa-certificate" style="font-size: 60px;"></i></div>
                <h3 class="fw-bold text-dark mb-1"><span class="text-success" style="background: -webkit-linear-gradient(45deg, #2fbf71, #0d6efd); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${firstWord}</span>${restOfName}</h3>
                <p class="text-muted small fw-bold mb-0" style="letter-spacing: 1px;">CONSTANCIA OFICIAL DE MATRÍCULA</p>
                <span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 rounded-pill px-3 py-1 mt-2 fw-bold shadow-sm">Ciclo Académico: ${enrollment.academicYearName}</span>
            </div>

            <div class="row g-4 mb-4">
                <div class="col-md-6">
                    <h6 class="fw-bold text-primary mb-2 small text-uppercase" style="letter-spacing: 1px;"><i class="fas fa-user-graduate me-2"></i>Datos Estudiante</h6>
                    <div class="p-3 rounded-4 premium-receipt-card position-relative overflow-hidden">
                        <div class="fw-bold text-dark text-uppercase fs-6 mb-1">${student.name}</div>
                        <div class="text-muted small mb-1"><i class="far fa-id-card me-1 opacity-50"></i>DNI: ${student.document}</div>
                        <div class="text-muted small mb-1"><i class="fas fa-chalkboard-teacher me-1 opacity-50"></i>Grado: ${gradeName} - "${enrollment.section}"</div>
                        <div class="text-muted small"><i class="fas fa-info-circle me-1 opacity-50"></i>Origen: <span class="badge bg-secondary bg-opacity-10 text-secondary rounded-pill">${student.isNew ? 'NUEVO INGRESO' : 'REGULAR'}</span></div>
                    </div>
                </div>
                <div class="col-md-6">
                    <h6 class="fw-bold text-primary mb-2 small text-uppercase" style="letter-spacing: 1px;"><i class="fas fa-key me-2"></i>Acceso Apoderado</h6>
                    <div class="p-3 rounded-4 premium-receipt-card position-relative overflow-hidden">
                        <div class="fw-bold text-dark text-uppercase fs-6 mb-1 text-truncate">${parent.name}</div>
                        <div class="text-muted small mb-1"><i class="far fa-user me-1 opacity-50"></i>Usuario: <strong class="text-primary">${parent.username}</strong></div>
                        <div class="text-muted small mb-1"><i class="fas fa-lock me-1 opacity-50"></i>Clave: <strong class="text-primary">${parent.username}</strong></div>
                        <div class="text-muted small"><i class="fas fa-mobile-alt me-1 opacity-50"></i>Celular: ${parent.phone}</div>
                    </div>
                </div>
            </div>

            <h6 class="fw-bold text-success mb-2 small text-uppercase" style="letter-spacing: 1px;"><i class="fas fa-check-double me-2"></i>Pagos Iniciales Efectuados</h6>
            <div class="global-table-container table-responsive mb-4">
                <table class="global-table">
                    <thead class="bg-light text-muted x-small border-bottom">
                        <tr>
                            <th style="width: 40%;" class="py-3 border-0">CONCEPTO</th>
                            <th style="width: 30%;" class="border-0">MÉTODO</th>
                            <th style="width: 30%;" class="border-0">MONTO (S/)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${immediatePayments.map(p => `
                            <tr>
                                <td class="py-3 fw-bold text-dark small text-uppercase border-0 border-bottom">${p.concept}</td>
                                <td class="small text-muted border-0 border-bottom"><span class="badge bg-light text-dark border">${p.method}</span></td>
                                <td class="fw-bold text-success border-0 border-bottom">S/ ${p.amount.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                        ${immediatePayments.length === 0 ? '<tr><td colspan="3" class="text-center py-4 text-muted border-0">Ninguno</td></tr>' : ''}
                    </tbody>
                </table>
            </div>

            <h6 class="fw-bold text-warning mb-2 small text-uppercase" style="letter-spacing: 1px;"><i class="fas fa-calendar-alt me-2"></i>Cronograma de Pagos Pendientes</h6>
            <div class="global-table-container table-responsive mb-4">
                <table class="global-table">
                    <thead class="bg-light text-muted x-small border-bottom" style="position: sticky; top: 0; z-index: 1;">
                        <tr>
                            <th style="width: 40%;" class="py-3 border-0">PAGO MENSUAL</th>
                            <th style="width: 30%;" class="border-0">VENCIMIENTO</th>
                            <th style="width: 30%;" class="border-0">MONTO (S/)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${futurePayments.map(p => `
                            <tr>
                                <td class="py-3 small text-uppercase fw-bold text-dark border-0 border-bottom">${p.concept}</td>
                                <td class="small text-muted border-0 border-bottom"><i class="far fa-clock me-1 opacity-50"></i>${new Date(p.dueDate).toLocaleDateString()}</td>
                                <td class="fw-bold text-dark border-0 border-bottom">S/ ${p.amount.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                        ${futurePayments.length === 0 ? '<tr><td colspan="3" class="text-center py-4 text-muted border-0">No registra compromisos pendientes.</td></tr>' : ''}
                    </tbody>
                </table>
            </div>
            
            <div class="alert bg-primary bg-opacity-10 border-0 border-start border-4 border-primary rounded-3 small mb-0 d-flex gap-3 align-items-center hide-on-print shadow-sm p-3">
                <div class="fs-3 text-primary"><i class="fab fa-whatsapp"></i></div>
                <div class="text-dark"><strong>¡Comparte la constancia!</strong> Puedes enviar esta ficha directamente al apoderado mediante WhatsApp o mandarla a imprimir.</div>
            </div>
        </div>
    `;

    Swal.fire({
        allowOutsideClick: false,
        title: '',
        html: receiptHtml,
        width: '800px',
        padding: '2rem',
        showCloseButton: true,
        showConfirmButton: true,
        confirmButtonText: '<i class="fab fa-whatsapp me-2"></i> Enviar a WhatsApp',
        confirmButtonColor: '#25d366',
        showCancelButton: true,
        cancelButtonText: '<i class="fas fa-print me-2"></i> Imprimir Ficha',
        cancelButtonColor: '#0f172a',
        customClass: {
            popup: 'rounded-4 border-0 shadow-lg',
            confirmButton: 'rounded-pill px-4 py-2 shadow-sm fw-bold',
            cancelButton: 'rounded-pill px-4 py-2 shadow-sm fw-bold'
        }
    }).then(result => {
        if (result.isConfirmed) {
            window.open(whatsappUrl, '_blank');
            viewStudentFolder(studentId);
        } else if (result.dismiss === Swal.DismissReason.cancel) {
            printReceipt();
            viewStudentFolder(studentId);
        } else {
            viewStudentFolder(studentId);
        }
    });
}

function printReceipt() {
    // Delegamos la impresión al motor global exacto
    printGlobalElement('printReceiptArea', 'Ficha de Matrícula - Educa360');
}

function updateSectionsDropdown(select) {
    const grade = (window._currentGrades || []).find(g => g.id == select.value);
    const sec = document.getElementById('st_section_select');
    sec.innerHTML = (grade?.sections || []).map(s => `<option value="${s}">${s}</option>`).join('') || '<option value="">---</option>';
    sec.disabled = !grade;
}

window.openTransferModal = async function(enrollmentId, currentGradeId, currentSection, studentId) {
    const token = localStorage.getItem('token');
    
    // Fetch grades
    const resGrades = await fetch('/api/grades', { headers: { 'Authorization': `Bearer ${token}` }});
    const dataGrades = await resGrades.json();
    if (!dataGrades.success) {
        showToast('error', 'No se pudieron cargar los grados');
        return;
    }
    
    const grades = dataGrades.grades;
    window._transferGrades = grades; // Save globally for the event listener

    const gradeOptions = grades.map(g => `
        <option value="${g.id}" ${g.id == currentGradeId ? 'selected' : ''}>${g.name} (${g.level.toUpperCase()})</option>
    `).join('');
    
    Swal.fire({
        allowOutsideClick: false,
        title: `<div class="text-start fs-5 fw-bold text-dark mb-0 d-flex align-items-center"><div class="bg-warning bg-opacity-10 text-warning rounded-circle d-flex align-items-center justify-content-center me-3 shadow-sm" style="width: 44px; height: 44px;"><i class="fas fa-exchange-alt"></i></div>Trasladar de Grado / Sección</div>`,
        html: `
            <div class="text-start p-2 mt-3">
                <div class="alert bg-warning bg-opacity-10 border-0 border-start border-4 border-warning small rounded-3 mb-4 shadow-sm p-3">
                    <div class="d-flex align-items-start gap-2 text-dark">
                        <i class="fas fa-exclamation-triangle text-warning mt-1"></i>
                        <div><strong>Aviso Importante:</strong> Si el traslado implica cambiar de nivel educativo, las mensualidades pendientes futuras se recalcularán de acuerdo a la matriz de costos del nuevo nivel. Los pagos ya realizados no cambiarán.</div>
                    </div>
                </div>
                <div class="mb-4">
                    <label class="form-label small fw-bold text-muted text-uppercase" style="letter-spacing: 0.5px;">Seleccionar Nuevo Grado *</label>
                    <select id="transferGradeId" class="form-select rounded-3 shadow-sm border-0 bg-light fw-bold text-dark px-3" style="cursor: pointer;">${gradeOptions}</select>
                </div>
                <div class="mb-3">
                    <label class="form-label small fw-bold text-muted text-uppercase" style="letter-spacing: 0.5px;">Seleccionar Nueva Sección *</label>
                    <select id="transferSection" class="form-select rounded-3 shadow-sm border-0 bg-light fw-bold text-dark px-3" style="cursor: pointer;">
                        <!-- Opciones generadas dinámicamente -->
                    </select>
                </div>
            </div>
        `,
        width: '600px',
        padding: '1.5rem',
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-exchange-alt me-1"></i> Procesar Traslado',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#eab308',
        customClass: { popup: 'rounded-4 border-0 shadow-lg', confirmButton: 'rounded-pill px-4 py-2 fw-bold text-white shadow-sm', cancelButton: 'rounded-pill px-4 py-2 fw-bold shadow-sm' },
        didOpen: () => {
            const gradeSelect = document.getElementById('transferGradeId');
            const sectionSelect = document.getElementById('transferSection');
            
            const updateSections = () => {
                const selectedGradeId = gradeSelect.value;
                const grade = window._transferGrades.find(g => g.id == selectedGradeId);
                if (grade && grade.sections && grade.sections.length > 0) {
                    sectionSelect.innerHTML = grade.sections.map(s => `<option value="${s}" ${s === currentSection ? 'selected' : ''}>Sección ${s}</option>`).join('');
                } else {
                    sectionSelect.innerHTML = '<option value="">Sin secciones configuradas</option>';
                }
            };
            
            gradeSelect.addEventListener('change', updateSections);
            updateSections(); // Populate initial state
        },
        preConfirm: () => {
            const gradeId = document.getElementById('transferGradeId').value;
            const section = document.getElementById('transferSection').value;
            return { gradeId, section };
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            const { gradeId, section } = result.value;
            const res = await fetch(`/api/enrollments/transfer/${enrollmentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ gradeId, section })
            });
            const data = await res.json();
            if (data.success) {
                showToast('success', 'Traslado procesado exitosamente');
                viewStudentFolder(studentId); // Reload folder to show new values and recalculated payments!
            } else {
                showToast('error', 'Error al realizar el traslado');
                viewStudentFolder(studentId);
            }
        } else {
            viewStudentFolder(studentId);
        }
    });
};

window.openWithdrawModal = function(enrollmentId, studentId) {
    const token = localStorage.getItem('token');
    const todayStr = new Date().toISOString().split('T')[0];
    
    Swal.fire({
        allowOutsideClick: false,
        title: `<div class="text-start fs-5 fw-bold text-dark mb-0 d-flex align-items-center"><div class="bg-danger bg-opacity-10 text-danger rounded-circle d-flex align-items-center justify-content-center me-3 shadow-sm" style="width: 44px; height: 44px;"><i class="fas fa-user-slash"></i></div>Registrar Retiro Oficial</div>`,
        html: `
            <div class="text-start p-2 mt-3">
                <div class="alert bg-danger bg-opacity-10 border-0 border-start border-4 border-danger small rounded-3 mb-4 shadow-sm p-3">
                    <div class="d-flex align-items-start gap-2 text-dark">
                        <i class="fas fa-exclamation-circle text-danger mt-1"></i>
                        <div><strong>Advertencia Irreversible:</strong> Esta acción marcará al alumno como retirado. Se anularán las pensiones de meses futuros, y la pensión del mes actual se cobrará de forma proporcional a los días asistidos.</div>
                    </div>
                </div>
                <div class="mb-3">
                    <label class="form-label small fw-bold text-muted text-uppercase" style="letter-spacing: 0.5px;">Fecha Oficial de Retiro *</label>
                    <input type="date" id="withdrawDate" class="form-control form-control-lg rounded-3 shadow-sm border-0 bg-light fw-bold text-dark px-3" value="${todayStr}" style="cursor: pointer;">
                </div>
            </div>
        `,
        width: '550px',
        padding: '1.5rem',
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-user-slash me-1"></i> Registrar Retiro',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#ef4444',
        customClass: { popup: 'rounded-4 border-0 shadow-lg', confirmButton: 'rounded-pill px-4 py-2 fw-bold text-white shadow-sm', cancelButton: 'rounded-pill px-4 py-2 fw-bold shadow-sm' },
        preConfirm: () => {
            const withdrawalDate = document.getElementById('withdrawDate').value;
            if (!withdrawalDate) {
                Swal.showValidationMessage('Debe ingresar una fecha válida');
                return false;
            }
            return { withdrawalDate };
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            const { withdrawalDate } = result.value;
            const res = await fetch(`/api/enrollments/withdraw/${enrollmentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ withdrawalDate })
            });
            const data = await res.json();
            if (data.success) {
                showToast('success', 'Retiro oficial registrado exitosamente');
                viewStudentFolder(studentId); // Reload folder
            } else {
                showToast('error', 'Error al procesar el retiro');
                viewStudentFolder(studentId);
            }
        } else {
            viewStudentFolder(studentId);
        }
    });
};

window.openDiscountModal = function(paymentId, currentAmount, studentId) {
    const token = localStorage.getItem('token');
    
    Swal.fire({
        allowOutsideClick: false,
        title: `<div class="text-start fs-5 fw-bold text-dark mb-0 d-flex align-items-center"><div class="bg-info bg-opacity-10 text-info rounded-circle d-flex align-items-center justify-content-center me-3 shadow-sm" style="width: 44px; height: 44px;"><i class="fas fa-percentage"></i></div>Aplicar Beca / Descuento</div>`,
        html: `
            <div class="text-start p-2 mt-3">
                <div class="mb-4">
                    <label class="form-label small fw-bold text-muted text-uppercase" style="letter-spacing: 0.5px;">Monto Actual de la Cuota</label>
                    <div class="form-control bg-light rounded-3 shadow-sm border-0 fw-bold text-dark px-3 fs-5" readonly>S/ ${Number(currentAmount).toFixed(2)}</div>
                </div>
                <div class="row g-3 mb-3">
                    <div class="col-md-6">
                        <label class="form-label small fw-bold text-muted text-uppercase" style="letter-spacing: 0.5px;">Tipo de Descuento *</label>
                        <select id="discountType" class="form-select rounded-3 shadow-sm border-0 bg-light fw-bold text-dark px-3" style="cursor: pointer;">
                            <option value="percentage">Porcentaje (%)</option>
                            <option value="amount">Monto Fijo (S/.)</option>
                        </select>
                    </div>
                    <div class="col-md-6">
                        <label id="discountValueLabel" class="form-label small fw-bold text-muted text-uppercase" style="letter-spacing: 0.5px;">A descontar (%) *</label>
                        <input type="number" id="discountValue" class="form-control rounded-3 shadow-sm border-0 bg-light fw-bold text-primary px-3" placeholder="Ej. 20" min="0">
                    </div>
                </div>
            </div>
        `,
        width: '600px',
        padding: '1.5rem',
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-check me-1"></i> Aplicar Descuento',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#06b6d4',
        customClass: { popup: 'rounded-4 border-0 shadow-lg', confirmButton: 'rounded-pill px-4 py-2 fw-bold text-white shadow-sm', cancelButton: 'rounded-pill px-4 py-2 fw-bold shadow-sm' },
        didOpen: () => {
            const selectEl = document.getElementById('discountType');
            const labelEl = document.getElementById('discountValueLabel');
            const valueInput = document.getElementById('discountValue');
            
            selectEl.addEventListener('change', () => {
                const type = selectEl.value;
                if (type === 'percentage') {
                    labelEl.innerText = 'Porcentaje a descontar (%) *';
                    valueInput.placeholder = 'Ej. 20';
                } else {
                    labelEl.innerText = 'Monto plano a descontar (S/.) *';
                    valueInput.placeholder = 'Ej. 50';
                }
            });
        },
        preConfirm: () => {
            const discountType = document.getElementById('discountType').value;
            const discountValue = document.getElementById('discountValue').value;
            if (!discountValue || Number(discountValue) <= 0) {
                Swal.showValidationMessage('Debe ingresar un valor de descuento mayor a cero');
                return false;
            }
            return { discountType, discountValue };
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            const { discountType, discountValue } = result.value;
            const res = await fetch(`/api/enrollments/payment-discount/${paymentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ discountType, discountValue })
            });
            const data = await res.json();
            if (data.success) {
                showToast('success', 'Beca/descuento aplicada correctamente');
                viewStudentFolder(studentId); // Reload folder to see the updated payment amounts
            } else {
                showToast('error', 'Error al aplicar el descuento');
                viewStudentFolder(studentId);
            }
        } else {
            viewStudentFolder(studentId);
        }
    });
};

function showWizardWarning(message) {
    const banner = document.getElementById('wzWarningBanner');
    const text = document.getElementById('wzWarningText');
    if (banner && text) {
        text.innerText = message;
        banner.classList.remove('d-none');
        const container = document.getElementById('enrollmentWizard');
        if (container) {
            container.scrollTop = 0;
        }
        setTimeout(() => {
            banner.classList.add('d-none');
        }, 4000);
    }
}
