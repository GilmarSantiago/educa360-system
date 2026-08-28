// ========================
// INSTITUTION MODULE (Tabbed)
// ========================

const INSTITUTION_TABS = [
    { id: 'school',        label: 'Datos Generales',   icon: 'fas fa-building' },
    { id: 'academic-year', label: 'Año Escolar',        icon: 'fas fa-calendar-alt' },
    { id: 'grade-scales',  label: 'Escalas de Notas',  icon: 'fas fa-chart-bar' },
    { id: 'grades',        label: 'Grados',             icon: 'fas fa-layer-group' },
    { id: 'courses',       label: 'Cursos',             icon: 'fas fa-book' },
    { id: 'financial-concepts', label: 'Conceptos Financieros', icon: 'fas fa-money-bill-wave' },
    { id: 'schedules',     label: 'Horarios',           icon: 'fas fa-clock' },
];

let institutionCurrentTab = 'school';
const INST_ITEMS_PER_PAGE = 10;
const instCurrentPages = {
    'academic-year': 1,
    'grade-scales': 1,
    'grades': 1,
    'courses': 1,
    'financial-concepts': 1
};

function renderInstitutionModule() {
    const container = document.querySelector('.content-body');
    if (!container) return;

    const tabNav = INSTITUTION_TABS.map(t => `
        <button class="global-tab-btn ${t.id === institutionCurrentTab ? 'active' : ''}"
                onclick="switchInstitutionTab('${t.id}')">
            <i class="${t.icon} me-2"></i>${t.label}
        </button>`).join('');

    container.innerHTML = `
        <div class="container-fluid px-0 animate__animated animate__fadeIn">
            <div class="card border-0 shadow-sm" style="border-radius: var(--border-radius-lg); overflow: hidden;">
                <div class="card-header bg-white border-0 pt-4 pb-0 px-4">
                    <h4 class="fw-bold mb-3"><i class="fas fa-school text-primary me-2"></i> Configuración de Institución</h4>
                    <div class="global-tab-nav pb-3 border-bottom">
                        ${tabNav}
                    </div>
                </div>
                <div class="card-body p-4" id="institutionTabContent">
                    <div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
                </div>
            </div>
        </div>
    `;

    loadInstitutionTab(institutionCurrentTab);
}

function switchInstitutionTab(tabId) {
    institutionCurrentTab = tabId;
    document.querySelectorAll('#institutionTabsContainer .global-tab-btn, .content-body .global-tab-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.global-tab-btn[onclick*="${tabId}"]`);
    if (btn) btn.classList.add('active');
    loadInstitutionTab(tabId);
}

async function loadInstitutionTab(tabId) {
    const content = document.getElementById('institutionTabContent');
    if (!content) return;

    const loaders = {
        'school':        renderSchoolTab,
        'academic-year': renderAcademicYearTab,
        'grade-scales':  renderGradeScalesTab,
        'grades':        renderGradesTab,
        'courses':       renderCoursesTab,
        'financial-concepts': renderFinancialConceptsTab,
        'schedules':     renderSchedulesTab,
    };

    if (loaders[tabId]) await loaders[tabId](content);
}

// ── Helper: API fetch with token ──────────────────────────────────────────────
async function apiFetch(url, opts = {}) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(url, {
            ...opts,
            headers: { 'Authorization': `Bearer ${token}`, ...(opts.headers || {}) }
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
            return { success: false, message: data?.message || `Error ${res.status}` };
        }
        return data ?? { success: true };
    } catch (error) {
        return { success: false, message: 'Error de conexión' };
    }
}

// ── Helper: Modal Handling ───────────────────────────────────────────────────
function openInstitutionModal(title, bodyHtml, onSave) {
    const modalId = 'dynamicModal_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    
    const modalHtml = `
    <div class="modal fade dynamic-modal-system" id="${modalId}" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content global-modal-content">
                <div class="modal-header global-modal-header">
                    <h5 class="modal-title fw-bold">${title}</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body p-4">
                    ${bodyHtml}
                </div>
                <div class="modal-footer border-0 p-4 pt-0">
                    <button type="button" class="btn btn-light rounded-pill px-4" data-bs-dismiss="modal">Cancelar</button>
                    <button type="button" class="btn btn-primary rounded-pill px-4 btn-save" style="background-color: var(--primary-color); border: none;">Guardar</button>
                </div>
            </div>
        </div>
    </div>`;

    // Insert to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modalEl = document.getElementById(modalId);
    const saveBtn = modalEl.querySelector('.btn-save');
    const modal = new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: false });

    saveBtn.onclick = async () => {
        // Disable button to prevent double-click
        const originalText = saveBtn.innerText;
        saveBtn.innerText = 'Guardando...';
        saveBtn.disabled = true;
        
        try {
            const result = await onSave(modalEl);
            if (result === true) {
                modal.hide();
            }
        } finally {
            saveBtn.innerText = originalText;
            saveBtn.disabled = false;
        }
    };

    // Clean up DOM after modal is completely hidden
    modalEl.addEventListener('hidden.bs.modal', () => {
        modalEl.remove();
    });

    modal.show();
    return modal;
}

function crudTable(columns, rows, onEdit, onDelete, paginationId = null) {
    const ths = columns.map(c => `<th class="fw-semibold text-muted small">${c.label}</th>`).join('');
    const trs = rows.length ? rows.map(row => {
        const tds = columns.map(c => `<td data-label="${c.label}">${c.render ? c.render(row) : (row[c.key] ?? '—')}</td>`).join('');
        return `<tr>
            ${tds}
            <td data-label="Opciones">
                <button class="btn btn-sm btn-light rounded-circle me-1 shadow-sm border" onclick="${onEdit}('${row.id}')"><i class="fas fa-pen text-secondary"></i></button>
                <button class="btn btn-sm btn-light rounded-circle shadow-sm border" onclick="${onDelete}('${row.id}')"><i class="fas fa-trash text-danger"></i></button>
            </td>
        </tr>`;
    }).join('') : `<tr><td colspan="${columns.length + 1}" class="text-center text-muted py-4">Sin registros.</td></tr>`;

    const finalPaginationId = paginationId || `${institutionCurrentTab}_pagination`;
    
    return `<div class="global-table-container table-responsive">
        <table class="global-table">
            <thead><tr>${ths}<th>Opciones</th></tr></thead>
            <tbody>${trs}</tbody>
        </table>
    </div>
    <div id="${finalPaginationId}"></div>`;
}

function tabHeader(title, btnLabel, btnOnclick) {
    return `<div class="d-flex justify-content-between align-items-center mb-4">
        <h5 class="fw-bold mb-0">${title}</h5>
        <button class="btn btn-primary rounded-pill px-3 py-2" style="background:var(--primary-color);border:none;" onclick="${btnOnclick}">
            <i class="fas fa-plus me-2"></i>${btnLabel}
        </button>
    </div>`;
}

// ═══════════════════════════════════════════════════════
// TAB: DATOS GENERALES (2 Columns: Image | Fields)
// ═══════════════════════════════════════════════════════
async function renderSchoolTab(content) {
    content.innerHTML = `
        <form id="schoolForm">
            <div class="row g-4 align-items-center">
                <div class="col-md-4 text-center border-end">
                    <div class="position-relative d-inline-block mb-3">
                        <img src="https://ui-avatars.com/api/?name=School" id="school_logo_preview"
                             class="rounded-circle border border-4 border-light shadow-sm"
                             style="width:180px;height:180px;object-fit:cover;" alt="Logo">
                        <label for="school_logo" class="position-absolute bottom-0 end-0 rounded-circle p-3 shadow-sm"
                               style="cursor:pointer;background:var(--primary-color);color:white;border:3px solid white;transform:translate(15%, 15%);">
                            <i class="fas fa-camera fa-lg"></i>
                        </label>
                        <input type="file" id="school_logo" accept="image/*" class="d-none" onchange="previewSchoolLogo(event)">
                    </div>
                    <p class="text-muted small">Logo Institucional<br>(Recomendado: 512x512px)</p>
                </div>
                <div class="col-md-8">
                    <div class="row g-3">
                        <div class="col-md-12">
                            <label class="form-label text-muted small fw-bold mb-1">NOMBRE DE LA INSTITUCIÓN *</label>
                            <input type="text" class="form-control rounded-pill bg-light border-0 px-3" id="school_name" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label text-muted small fw-bold mb-1">CORREO ELECTRÓNICO *</label>
                            <input type="email" class="form-control rounded-pill bg-light border-0 px-3" id="school_email" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label text-muted small fw-bold mb-1">TELÉFONO *</label>
                            <input type="text" class="form-control rounded-pill bg-light border-0 px-3" id="school_phone" required>
                        </div>
                        <div class="col-md-12">
                            <label class="form-label text-muted small fw-bold mb-1">DIRECCIÓN FÍSICA *</label>
                            <input type="text" class="form-control rounded-pill bg-light border-0 px-3" id="school_address" required>
                        <div class="col-md-12">
                            <label class="form-label text-muted small fw-bold mb-1">MÉTODOS DE PAGO PERMITIDOS (Separados por coma) *</label>
                            <input type="text" class="form-control rounded-pill bg-light border-0 px-3" id="school_payment_methods" placeholder="Ej: Efectivo, Yape / Plin, Transferencia" required>
                        </div>
                        <div class="col-md-12">
                            <div class="form-check form-switch mt-2">
                                <input class="form-check-input" type="checkbox" id="school_allow_multiple_cash">
                                <label class="form-check-label text-muted small fw-bold" for="school_allow_multiple_cash">PERMITIR MÚLTIPLES CAJAS ABIERTAS SIMULTÁNEAMENTE</label>
                            </div>
                        </div>
                    </div>
                    <div class="text-end mt-4">
                        <button type="button" class="btn btn-primary rounded-pill px-5 py-2 fw-bold"
                                style="background:var(--primary-color);border:none;" onclick="saveSchoolConfig()">
                            <i class="fas fa-save me-2"></i> Guardar Cambios
                        </button>
                    </div>
                </div>
            </div>
        </form>`;

    const data = await apiFetch('/api/school');
    if (data.success && data.school) {
        document.getElementById('school_name').value    = data.school.name || '';
        document.getElementById('school_email').value   = data.school.email || '';
        document.getElementById('school_phone').value   = data.school.phone || '';
        document.getElementById('school_address').value = data.school.address || '';
        document.getElementById('school_payment_methods').value = (data.school.paymentMethods || []).join(', ');
        document.getElementById('school_allow_multiple_cash').checked = data.school.allowMultipleCashSessions === true;
        const prev = document.getElementById('school_logo_preview');
        prev.src = data.school.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.school.name || 'School')}&background=3b82f6&color=fff&rounded=true`;
    }
}

// ═══════════════════════════════════════════════════════
// TAB: AÑO ESCOLAR
// ═══════════════════════════════════════════════════════
let _academicYears = [];

async function renderAcademicYearTab(content) {
    const data = await apiFetch('/api/academic-years');
    // Sort descending by ID
    _academicYears = (data.academicYears || []).sort((a, b) => b.id - a.id);
    let page = instCurrentPages['academic-year'];
    const maxPage = Math.max(1, Math.ceil(_academicYears.length / INST_ITEMS_PER_PAGE));
    if (page > maxPage) {
        page = maxPage;
        instCurrentPages['academic-year'] = page;
    }
    
    const start = (page - 1) * INST_ITEMS_PER_PAGE;
    const paginated = _academicYears.slice(start, start + INST_ITEMS_PER_PAGE);

    const cols = [
        { key: 'name',      label: 'Año' },
        { key: 'startDate', label: 'Inicio' },
        { key: 'endDate',   label: 'Fin' },
        { key: 'isActive',  label: 'Estado', render: r => r.isActive ? '<span class="badge bg-success bg-opacity-10 text-success rounded-pill px-3">Activo</span>' : '<span class="badge bg-secondary bg-opacity-10 text-secondary rounded-pill px-3">Inactivo</span>' },
        { key: 'periods',   label: 'Periodos', render: r => `<span class="badge bg-light text-dark rounded-pill px-2">${(r.periods||[]).length}</span>` },
    ];

    content.innerHTML = tabHeader('<i class="fas fa-calendar-alt me-2 text-primary"></i>Años Escolares', 'Nuevo Año', 'openAcademicYearModal()')
        + crudTable(cols, paginated, 'editAcademicYear', 'deleteAcademicYear');
        
    renderTablePagination('academic-year_pagination', _academicYears.length, INST_ITEMS_PER_PAGE, page, 'changeInstPage');
}

function changeInstPage(page) {
    instCurrentPages[institutionCurrentTab] = page;
    loadInstitutionTab(institutionCurrentTab);
}


function openAcademicYearModal(id = null) {
    const year = id ? _academicYears.find(y => y.id == id) : null;
    window._tempHolidays = year ? [...(year.holidays || [])] : [];

    const bodyHtml = `
        <form id="ayForm">
            <div class="row g-3">
                <div class="col-12">
                    <label class="form-label text-muted small fw-bold">NOMBRE DEL AÑO *</label>
                    <input type="text" id="ay_name" class="form-control rounded-pill bg-light border-0 px-3" placeholder="ej: 2026" value="${year?.name||''}" required>
                </div>
                <div class="col-md-6">
                    <label class="form-label text-muted small fw-bold">INICIO CLASES ALUMNOS *</label>
                    <input type="date" id="ay_start" class="form-control rounded-pill bg-light border-0 px-3" value="${year?.startDate||''}" required onchange="handleStartDateChange()">
                </div>
                <div class="col-md-6">
                    <label class="form-label text-muted small fw-bold">FECHA FIN AÑO ESCOLAR *</label>
                    <input type="date" id="ay_end" class="form-control rounded-pill bg-light border-0 px-3" value="${year?.endDate||''}" required onchange="generatePeriodsPreview()">
                </div>
                <div class="col-md-12">
                    <div class="form-check form-switch mb-1">
                        <input class="form-check-input" type="checkbox" id="ay_same_start" ${(!year || year.startDate === year.staffStartDate) ? 'checked' : ''} onchange="toggleStaffStartDate()">
                        <label class="form-check-label text-muted small fw-bold" for="ay_same_start">INICIO DE CLASES DEL PERSONAL ES IGUAL AL DE ALUMNOS</label>
                    </div>
                </div>
                <div class="col-md-12" id="staff_start_container" style="${(!year || year.startDate === year.staffStartDate) ? 'display:none;' : ''}">
                    <label class="form-label text-muted small fw-bold">INICIO ACTIVIDADES PERSONAL *</label>
                    <input type="date" id="ay_staff_start" class="form-control rounded-pill bg-light border-0 px-3" value="${year?.staffStartDate || year?.startDate || ''}">
                </div>
                
                <div class="col-md-12">
                    <label class="form-label text-muted small fw-bold">DÍAS LABORABLES / DE CLASE *</label>
                    <div class="d-flex gap-3 mt-1 bg-light p-2 rounded-pill px-3 border">
                        <div class="form-check mb-0">
                            <input class="form-check-input" type="checkbox" id="ay_wd_lv" ${(!year || (year.workingDays && year.workingDays.includes(1))) ? 'checked' : ''}>
                            <label class="form-check-label text-dark small fw-bold" for="ay_wd_lv">Lunes a Viernes</label>
                        </div>
                        <div class="form-check mb-0">
                            <input class="form-check-input" type="checkbox" id="ay_wd_sab" ${(year && year.workingDays && year.workingDays.includes(6)) ? 'checked' : ''}>
                            <label class="form-check-label text-dark small fw-bold" for="ay_wd_sab">Sábado</label>
                        </div>
                        <div class="form-check mb-0">
                            <input class="form-check-input" type="checkbox" id="ay_wd_dom" ${(year && year.workingDays && year.workingDays.includes(7)) ? 'checked' : ''}>
                            <label class="form-check-label text-dark small fw-bold" for="ay_wd_dom">Domingo</label>
                        </div>
                    </div>
                </div>

                <div class="col-md-12">
                    <label class="form-label text-muted small fw-bold">PERIODICIDAD ACADÉMICA *</label>
                    <select id="ay_periodicity" class="form-select rounded-pill bg-light border-0 px-3" required onchange="generatePeriodsPreview()">
                        <option value="" disabled ${!year ? 'selected' : ''}>Seleccionar...</option>
                        <option value="bimestral" ${year?.periodicity === 'bimestral' ? 'selected' : ''}>Bimestral (4 Periodos)</option>
                        <option value="trimestral" ${year?.periodicity === 'trimestral' ? 'selected' : ''}>Trimestral (3 Periodos)</option>
                        <option value="semestral" ${year?.periodicity === 'semestral' ? 'selected' : ''}>Semestral (2 Periodos)</option>
                    </select>
                </div>
                
                <div class="col-12 mt-4">
                    <h6 class="fw-bold text-primary mb-3 border-bottom pb-2">
                        <i class="fas fa-calendar-times me-2"></i>Calendario de Feriados
                    </h6>
                    <div class="row g-2 mb-3 align-items-end">
                        <div class="col-5">
                            <label class="form-label text-muted x-small fw-bold mb-1">FECHA FERIADO</label>
                            <input type="date" id="holiday_date" class="form-control rounded-pill bg-white border px-3">
                        </div>
                        <div class="col-5">
                            <label class="form-label text-muted x-small fw-bold mb-1">DESCRIPCIÓN</label>
                            <input type="text" id="holiday_name" class="form-control rounded-pill bg-white border px-3" placeholder="ej: Día de la Madre">
                        </div>
                        <div class="col-2">
                            <button type="button" class="btn btn-primary rounded-pill w-100 fw-bold" onclick="addHolidayToList()"><i class="fas fa-plus"></i></button>
                        </div>
                    </div>
                    <div id="holidays_list_container" class="d-flex flex-wrap gap-2 p-3 bg-light rounded-4 border" style="min-height: 50px; max-height: 150px; overflow-y: auto;">
                        <!-- Feriados agregados aparecerán aquí -->
                    </div>
                </div>

                <div class="col-12 mt-4">
                    <h6 class="fw-bold text-primary mb-3 border-bottom pb-2">
                        <i class="fas fa-list-ol me-2"></i>Ajuste de Periodos
                    </h6>
                    <div id="periods_list_container" class="bg-light rounded-4 p-3 border">
                        <!-- Periodos se generan aquí -->
                        <p class="text-muted small text-center mb-0">Selecciona las fechas y periodicidad para ver los periodos.</p>
                    </div>
                </div>

                <div class="col-12">
                    <div class="form-check form-switch mt-2">
                        <input class="form-check-input" type="checkbox" id="ay_active" ${year?.isActive ? 'checked' : ''}>
                        <label class="form-check-label text-muted small fw-bold" for="ay_active">ESTABLECER COMO AÑO ACTIVO</label>
                    </div>
                </div>
            </div>
        </form>
    `;

    const modal = openInstitutionModal(year ? 'Editar Año Escolar' : 'Nuevo Año Escolar', bodyHtml, async () => {
        const name = document.getElementById('ay_name').value.trim();
        const startDate = document.getElementById('ay_start').value;
        const endDate = document.getElementById('ay_end').value;
        const sameStart = document.getElementById('ay_same_start').checked;
        const staffStartDate = sameStart ? startDate : document.getElementById('ay_staff_start').value;
        const periodicity = document.getElementById('ay_periodicity').value;
        const isActive = document.getElementById('ay_active').checked;

        if (!name || !startDate || !endDate || !periodicity) {
            showToast('warning', 'Complete todos los campos obligatorios');
            return;
        }

        // Collect workingDays
        const workingDays = [];
        if (document.getElementById('ay_wd_lv').checked) workingDays.push(1, 2, 3, 4, 5);
        if (document.getElementById('ay_wd_sab').checked) workingDays.push(6);
        if (document.getElementById('ay_wd_dom').checked) workingDays.push(7);

        if (workingDays.length === 0) {
            showToast('warning', 'Seleccione al menos un día laborable');
            return;
        }

        const holidays = window._tempHolidays;

        // Leer periodos desde el editor manual
        const periodItems = document.querySelectorAll('.period-item');
        const periods = Array.from(periodItems).map(item => ({
            id: parseInt(item.dataset.id),
            name: item.querySelector('.p-name').value,
            startDate: item.querySelector('.p-start').value,
            endDate: item.querySelector('.p-end').value
        }));

        const body = { name, startDate, endDate, staffStartDate, workingDays, holidays, periodicity, isActive, periods };
        const url = year ? `/api/academic-years/${year.id}` : '/api/academic-years';

        const res = await apiFetch(url, { 
            method: year ? 'PUT' : 'POST', 
            headers: {'Content-Type':'application/json'}, 
            body: JSON.stringify(body) 
        });
        
        if (res.success) {
            modal.hide();
            showToast('success', 'Año escolar guardado correctamente');
            switchInstitutionTab('academic-year');
        } else {
            showToast('error', res.message);
        }
    });

    // Helper functions for start date toggle & holidays
    window.handleStartDateChange = function() {
        const startVal = document.getElementById('ay_start').value;
        const sameStart = document.getElementById('ay_same_start').checked;
        if (sameStart) {
            const staffStart = document.getElementById('ay_staff_start');
            if (staffStart) staffStart.value = startVal;
        }
        window.generatePeriodsPreview();
    };

    window.toggleStaffStartDate = function() {
        const sameStart = document.getElementById('ay_same_start').checked;
        const container = document.getElementById('staff_start_container');
        const staffStart = document.getElementById('ay_staff_start');
        const startVal = document.getElementById('ay_start').value;
        
        if (sameStart) {
            if (container) container.style.display = 'none';
            if (staffStart) staffStart.value = startVal;
        } else {
            if (container) container.style.display = 'block';
        }
    };

    window.addHolidayToList = function() {
        const dateVal = document.getElementById('holiday_date').value;
        const nameVal = document.getElementById('holiday_name').value.trim();
        if (!dateVal || !nameVal) {
            showToast('warning', 'Ingrese fecha y descripción del feriado');
            return;
        }
        if (window._tempHolidays.some(h => h.date === dateVal)) {
            showToast('warning', 'Ya existe un feriado en esa fecha');
            return;
        }
        window._tempHolidays.push({ date: dateVal, name: nameVal });
        window._tempHolidays.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        document.getElementById('holiday_date').value = '';
        document.getElementById('holiday_name').value = '';
        renderHolidaysBadges();
    };

    window.removeHolidayFromList = function(idx) {
        window._tempHolidays.splice(idx, 1);
        renderHolidaysBadges();
    };

    function renderHolidaysBadges() {
        const container = document.getElementById('holidays_list_container');
        if (!container) return;
        if (window._tempHolidays.length === 0) {
            container.innerHTML = '<span class="text-muted small">No hay feriados registrados.</span>';
            return;
        }
        container.innerHTML = window._tempHolidays.map((h, idx) => `
            <span class="badge bg-danger bg-opacity-10 text-danger rounded-pill px-3 py-2 fw-bold d-flex align-items-center gap-2 animate__animated animate__fadeIn" style="font-size:0.75rem;">
                <i class="fas fa-umbrella-beach"></i>
                ${h.date.split('-').reverse().join('/')} - ${h.name}
                <a href="javascript:void(0)" class="text-danger ms-1 fw-bold text-decoration-none" onclick="removeHolidayFromList(${idx})">&times;</a>
            </span>
        `).join('');
    }

    renderHolidaysBadges();

    // Si ya tiene periodos, los mostramos, si no, intentamos generar
    if (year && year.periods && year.periods.length > 0) {
        renderPeriodsList(year.periods);
    } else {
        window.generatePeriodsPreview();
    }
}

// Global helper for the modal UI
window.generatePeriodsPreview = function() {
    const startVal = document.getElementById('ay_start').value;
    const endVal = document.getElementById('ay_end').value;
    const periodicity = document.getElementById('ay_periodicity').value;

    if (!startVal || !endVal || !periodicity) return;

    const start = new Date(startVal);
    const end = new Date(endVal);
    const periods = [];
    let numPeriods = 0;
    let monthsPerPeriod = 0;
    let prefix = '';

    if (periodicity === 'bimestral') { numPeriods = 4; monthsPerPeriod = 2; prefix = 'Bimestre'; }
    else if (periodicity === 'trimestral') { numPeriods = 3; monthsPerPeriod = 3; prefix = 'Trimestre'; }
    else if (periodicity === 'semestral') { numPeriods = 2; monthsPerPeriod = 6; prefix = 'Semestre'; }

    let currentStart = new Date(start);
    for (let i = 0; i < numPeriods; i++) {
        const pStart = new Date(currentStart);
        const pEnd = new Date(pStart);
        
        // El periodo dura 'monthsPerPeriod' meses y termina el último día de ese mes
        // Sumamos los meses y luego usamos setDate(0) del mes siguiente para obtener el último día del mes actual
        pEnd.setMonth(pStart.getMonth() + monthsPerPeriod);
        pEnd.setDate(0); 

        // Si es el último periodo o nos pasamos de la fecha fin del año, ajustamos al fin del año
        if (i === numPeriods - 1 || pEnd > end) {
            pEnd.setTime(end.getTime());
        }

        periods.push({
            id: i + 1,
            name: `${i + 1}° ${prefix}`,
            startDate: pStart.toISOString().split('T')[0],
            endDate: pEnd.toISOString().split('T')[0]
        });

        // El siguiente periodo siempre inicia el primer día del mes siguiente al fin del periodo actual
        // A menos que hayamos forzado pEnd al final del año, en cuyo caso la lógica de salida del loop se encargará
        currentStart = new Date(pEnd);
        currentStart.setMonth(currentStart.getMonth() + 1);
        currentStart.setDate(1);
        
        if (currentStart >= end && i < numPeriods - 1) break;
    }

    renderPeriodsList(periods);
};

function renderPeriodsList(periods) {
    const container = document.getElementById('periods_list_container');
    if (!container) return;

    container.innerHTML = periods.map(p => `
        <div class="period-item border rounded-4 p-3 mb-3 bg-white shadow-sm animate__animated animate__fadeInUp" data-id="${p.id}">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <span class="badge bg-primary bg-opacity-10 text-primary rounded-pill px-3 py-2 fw-bold">
                    <i class="fas fa-tag me-2"></i>${p.name}
                </span>
                <input type="hidden" class="p-name" value="${p.name}">
                <small class="text-muted fw-bold">ID: ${p.id}</small>
            </div>
            <div class="row g-3">
                <div class="col-6">
                    <label class="form-label text-muted fw-bold mb-1" style="font-size:0.7rem;">
                        <i class="fas fa-calendar-plus me-1 text-success"></i> FECHA INICIO
                    </label>
                    <input type="date" class="form-control rounded-pill bg-light border-0 px-3 p-start" value="${p.startDate}" required>
                </div>
                <div class="col-6">
                    <label class="form-label text-muted fw-bold mb-1" style="font-size:0.7rem;">
                        <i class="fas fa-calendar-check me-1 text-danger"></i> FECHA FIN
                    </label>
                    <input type="date" class="form-control rounded-pill bg-light border-0 px-3 p-end" value="${p.endDate}" required>
                </div>
            </div>
        </div>
    `).join('');
}
function editAcademicYear(id) { openAcademicYearModal(id); }
async function deleteAcademicYear(id) {
    const confirm = await Swal.fire({
        allowOutsideClick: false, 
        title:'¿Eliminar año escolar?', 
        text:'Esta acción no se puede deshacer.', 
        icon:'warning', 
        showCancelButton:true, 
        confirmButtonText:'Sí, eliminar', 
        confirmButtonColor:'#ef4444', 
        cancelButtonText:'Cancelar',
        cancelButtonColor: '#64748b',
        background: '#ffffff',
        color: '#0f172a',
        customClass: {
            popup: 'rounded-4 border-0 shadow-lg',
            confirmButton: 'rounded-pill px-4',
            cancelButton: 'rounded-pill px-4'
        }
    });
    if (!confirm.isConfirmed) return;

    const res = await apiFetch(`/api/academic-years/${id}`, { method:'DELETE' });
    if (!res.success) {
        showToast('error', res.message || 'No se pudo eliminar el año escolar.');
        return;
    }
    showToast('success','Año escolar eliminado');
    switchInstitutionTab('academic-year');
}

// ═══════════════════════════════════════════════════════
// TAB: ESCALAS DE NOTAS
// ═══════════════════════════════════════════════════════
let _gradeScales = [];

async function renderGradeScalesTab(content) {
    const data = await apiFetch('/api/grade-scales');
    // Sort descending by ID
    _gradeScales = (data.gradeScales || []).sort((a, b) => b.id - a.id);
    let page = instCurrentPages['grade-scales'];
    const maxPage = Math.max(1, Math.ceil(_gradeScales.length / INST_ITEMS_PER_PAGE));
    if (page > maxPage) {
        page = maxPage;
        instCurrentPages['grade-scales'] = page;
    }
    
    const start = (page - 1) * INST_ITEMS_PER_PAGE;
    const paginated = _gradeScales.slice(start, start + INST_ITEMS_PER_PAGE);

    const cols = [
        { key: 'name',         label: 'Nombre' },
        { key: 'type',         label: 'Tipo', render: r => `<span class="badge bg-light text-dark text-capitalize">${r.type}</span>` },
        { key: 'min',          label: 'Mín.' },
        { key: 'max',          label: 'Máx.' },
        { key: 'passingGrade', label: 'Aprobado' },
        { key: 'isDefault',    label: 'Defecto', render: r => r.isDefault ? '<i class="fas fa-check-circle text-success"></i>' : '' },
    ];

    content.innerHTML = tabHeader('<i class="fas fa-chart-bar me-2 text-primary"></i>Escalas de Calificación', 'Nueva Escala', 'openGradeScaleModal()')
        + crudTable(cols, paginated, 'editGradeScale', 'deleteGradeScale');

    renderTablePagination('grade-scales_pagination', _gradeScales.length, INST_ITEMS_PER_PAGE, page, 'changeInstPage');
}

function openGradeScaleModal(id = null) {
    const scale = id ? _gradeScales.find(s => s.id == id) : null;
    const bodyHtml = `
        <form id="gsForm">
            <div class="row g-3">
                <div class="col-12">
                    <label class="form-label text-muted small fw-bold">NOMBRE DE LA ESCALA *</label>
                    <input type="text" id="gs_name" class="form-control rounded-pill bg-light border-0 px-3" placeholder="ej: Escala Vigésimal" value="${scale?.name||''}" required>
                </div>
                <div class="col-md-12">
                    <label class="form-label text-muted small fw-bold">TIPO DE CALIFICACIÓN</label>
                    <select id="gs_type" class="form-select rounded-pill bg-light border-0 px-3">
                        <option value="numeric" ${scale?.type==='numeric'?'selected':''}>Numérica (0-20, 0-10, etc.)</option>
                        <option value="letter" ${scale?.type==='letter'?'selected':''}>Letras (A, B, C, D)</option>
                        <option value="percentage" ${scale?.type==='percentage'?'selected':''}>Porcentaje (0-100%)</option>
                    </select>
                </div>
                <div class="col-md-4">
                    <label class="form-label text-muted small fw-bold">MÍNIMO</label>
                    <input id="gs_min" type="number" class="form-control rounded-pill bg-light border-0 px-3" value="${scale?.min??0}">
                </div>
                <div class="col-md-4">
                    <label class="form-label text-muted small fw-bold">MÁXIMO</label>
                    <input id="gs_max" type="number" class="form-control rounded-pill bg-light border-0 px-3" value="${scale?.max??20}">
                </div>
                <div class="col-md-4">
                    <label class="form-label text-muted small fw-bold">APROBATORIA</label>
                    <input id="gs_pass" type="number" class="form-control rounded-pill bg-light border-0 px-3" value="${scale?.passingGrade??11}">
                </div>
                <div class="col-12">
                    <div class="form-check form-switch mt-2">
                        <input class="form-check-input" type="checkbox" id="gs_default" ${scale?.isDefault?'checked':''}>
                        <label class="form-check-label text-muted small fw-bold" for="gs_default">ESTABLECER COMO PREDETERMINADA</label>
                    </div>
                </div>
            </div>
        </form>
    `;

    const modal = openInstitutionModal(scale ? 'Editar Escala' : 'Nueva Escala', bodyHtml, async () => {
        const body = {
            name: document.getElementById('gs_name').value.trim(),
            type: document.getElementById('gs_type').value,
            min: Number(document.getElementById('gs_min').value),
            max: Number(document.getElementById('gs_max').value),
            passingGrade: Number(document.getElementById('gs_pass').value),
            isDefault: document.getElementById('gs_default').checked,
        };

        if (!body.name) {
            showToast('warning', 'Ingrese el nombre de la escala');
            return;
        }
        if (body.min >= body.max) {
            showToast('error', 'El valor máximo debe ser mayor al mínimo');
            return;
        }

        const url = scale ? `/api/grade-scales/${scale.id}` : '/api/grade-scales';

        const res = await apiFetch(url, { method: scale ? 'PUT' : 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
        
        if (res.success) {
            modal.hide();
            showToast('success','Escala guardada');
            switchInstitutionTab('grade-scales');
        } else {
            showToast('error', res.message);
        }
    });
}
function editGradeScale(id) { openGradeScaleModal(id); }
async function deleteGradeScale(id) {
    const c = await Swal.fire({
        allowOutsideClick: false, 
        title:'¿Eliminar escala?', 
        text:'Esta escala dejará de estar disponible.', 
        icon:'warning', 
        showCancelButton:true, 
        confirmButtonText:'Sí, eliminar', 
        confirmButtonColor:'#ef4444',
        cancelButtonText:'Cancelar',
        cancelButtonColor: '#64748b',
        background: '#ffffff',
        color: '#0f172a',
        customClass: {
            popup: 'rounded-4 border-0 shadow-lg',
            confirmButton: 'rounded-pill px-4',
            cancelButton: 'rounded-pill px-4'
        }
    });
    if (!c.isConfirmed) return;

    const res = await apiFetch(`/api/grade-scales/${id}`, { method:'DELETE' });
    if (!res.success) {
        showToast('error', res.message || 'No se pudo eliminar la escala de notas.');
        return;
    }
    showToast('success','Escala eliminada');
    switchInstitutionTab('grade-scales');
}

// ═══════════════════════════════════════════════════════
// TAB: GRADOS
// ═══════════════════════════════════════════════════════
let _grades = [];

async function renderGradesTab(content) {
    const data = await apiFetch('/api/grades');
    // Sort descending by ID
    _grades = (data.grades || []).sort((a, b) => b.id - a.id);
    let page = instCurrentPages['grades'];
    const maxPage = Math.max(1, Math.ceil(_grades.length / INST_ITEMS_PER_PAGE));
    if (page > maxPage) {
        page = maxPage;
        instCurrentPages['grades'] = page;
    }
    
    const start = (page - 1) * INST_ITEMS_PER_PAGE;
    const paginated = _grades.slice(start, start + INST_ITEMS_PER_PAGE);

    const cols = [
        { key: 'name',     label: 'Nombre' },
        { key: 'level',    label: 'Nivel', render: r => `<span class="badge bg-primary bg-opacity-10 text-primary rounded-pill px-3 text-capitalize">${r.level}</span>` },
        { key: 'order',    label: 'Orden' },
        { key: 'sections', label: 'Secciones', render: r => (r.sections||[]).map(s=>`<span class="badge bg-light text-secondary me-1 rounded-pill px-2 border">${s}</span>`).join('') },
    ];

    content.innerHTML = tabHeader('<i class="fas fa-layer-group me-2 text-primary"></i>Grados y Secciones', 'Nuevo Grado', 'openGradeModal()')
        + crudTable(cols, paginated, 'editGrade', 'deleteGrade');

    renderTablePagination('grades_pagination', _grades.length, INST_ITEMS_PER_PAGE, page, 'changeInstPage');
}

function openGradeModal(id = null) {
    const grade = id ? _grades.find(g => g.id == id) : null;
    const bodyHtml = `
        <form id="grForm">
            <div class="row g-3">
                <div class="col-12">
                    <label class="form-label text-muted small fw-bold">NOMBRE DEL GRADO *</label>
                    <input type="text" id="gr_name" class="form-control rounded-pill bg-light border-0 px-3" placeholder="ej: Primer Grado" value="${grade?.name||''}" required>
                </div>
                <div class="col-md-6">
                    <label class="form-label text-muted small fw-bold">NIVEL ACADÉMICO</label>
                    <select id="gr_level" class="form-select rounded-pill bg-light border-0 px-3">
                        <option value="inicial" ${grade?.level==='inicial'?'selected':''}>Inicial</option>
                        <option value="primaria" ${grade?.level==='primaria'?'selected':''}>Primaria</option>
                        <option value="secundaria" ${grade?.level==='secundaria'?'selected':''}>Secundaria</option>
                    </select>
                </div>
                <div class="col-md-6">
                    <label class="form-label text-muted small fw-bold">ORDEN JERÁRQUICO</label>
                    <input id="gr_order" type="number" class="form-control rounded-pill bg-light border-0 px-3" value="${grade?.order||1}">
                </div>
                <div class="col-12">
                    <label class="form-label text-muted small fw-bold">SECCIONES <span class="fw-normal">(Ej: A, B, C)</span></label>
                    <input id="gr_sections" class="form-control rounded-pill bg-light border-0 px-3" placeholder="A, B, C" value="${(grade?.sections||[]).join(', ')}">
                </div>
            </div>
        </form>
    `;

    const modal = openInstitutionModal(grade ? 'Editar Grado' : 'Nuevo Grado', bodyHtml, async () => {
        const body = {
            name: document.getElementById('gr_name').value.trim(),
            level: document.getElementById('gr_level').value,
            order: Number(document.getElementById('gr_order').value),
            sections: document.getElementById('gr_sections').value.trim(),
        };

        if (!body.name) {
            showToast('warning', 'Ingrese el nombre del grado');
            return;
        }

        const url = grade ? `/api/grades/${grade.id}` : '/api/grades';

        const res = await apiFetch(url, { method: grade ? 'PUT' : 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
        
        if (res.success) {
            modal.hide();
            showToast('success','Grado guardado');
            switchInstitutionTab('grades');
        } else {
            showToast('error', res.message);
        }
    });
}
function editGrade(id) { openGradeModal(id); }
async function deleteGrade(id) {
    const c = await Swal.fire({
        allowOutsideClick: false, 
        title:'¿Eliminar grado?', 
        text:'Esto afectará a los alumnos asignados.', 
        icon:'warning', 
        showCancelButton:true, 
        confirmButtonText:'Sí, eliminar', 
        confirmButtonColor:'#ef4444',
        cancelButtonText:'Cancelar',
        cancelButtonColor: '#64748b',
        background: '#ffffff',
        color: '#0f172a',
        customClass: {
            popup: 'rounded-4 border-0 shadow-lg',
            confirmButton: 'rounded-pill px-4',
            cancelButton: 'rounded-pill px-4'
        }
    });
    if (c.isConfirmed) { await apiFetch(`/api/grades/${id}`, {method:'DELETE'}); showToast('success','Eliminado'); switchInstitutionTab('grades'); }
}

// ═══════════════════════════════════════════════════════
// TAB: CURSOS
// ═══════════════════════════════════════════════════════
let _courses = [];

async function renderCoursesTab(content) {
    const data = await apiFetch('/api/courses');
    // Sort descending by ID
    _courses = (data.courses || []).sort((a, b) => b.id - a.id);
    let page = instCurrentPages['courses'];
    const maxPage = Math.max(1, Math.ceil(_courses.length / INST_ITEMS_PER_PAGE));
    if (page > maxPage) {
        page = maxPage;
        instCurrentPages['courses'] = page;
    }
    
    const start = (page - 1) * INST_ITEMS_PER_PAGE;
    const paginated = _courses.slice(start, start + INST_ITEMS_PER_PAGE);

    const cols = [
        { key: 'code',         label: 'Código' },
        { key: 'name',         label: 'Nombre' },
        { key: 'hoursPerWeek', label: 'Horas/Semana' },
    ];

    content.innerHTML = tabHeader('<i class="fas fa-book me-2 text-primary"></i>Cursos / Materias', 'Nuevo Curso', 'openCourseModal()')
        + crudTable(cols, paginated, 'editCourse', 'deleteCourse');

    renderTablePagination('courses_pagination', _courses.length, INST_ITEMS_PER_PAGE, page, 'changeInstPage');
}

function openCourseModal(id = null) {
    const course = id ? _courses.find(c => c.id == id) : null;
    const bodyHtml = `
        <form id="coForm">
            <div class="row g-3">
                <div class="col-md-4">
                    <label class="form-label text-muted small fw-bold">CÓDIGO *</label>
                    <input id="co_code" class="form-control rounded-pill bg-light border-0 px-3" placeholder="ej: MAT" value="${course?.code||''}" required>
                </div>
                <div class="col-md-8">
                    <label class="form-label text-muted small fw-bold">NOMBRE DEL CURSO *</label>
                    <input id="co_name" class="form-control rounded-pill bg-light border-0 px-3" placeholder="ej: Matemáticas" value="${course?.name||''}" required>
                </div>
                <div class="col-md-12">
                    <label class="form-label text-muted small fw-bold">HORAS CRONOLÓGICAS SEMANALES</label>
                    <input id="co_hours" type="number" class="form-control rounded-pill bg-light border-0 px-3" value="${course?.hoursPerWeek||4}">
                </div>
            </div>
        </form>
    `;

    const modal = openInstitutionModal(course ? 'Editar Curso' : 'Nuevo Curso', bodyHtml, async () => {
        const body = {
            code: document.getElementById('co_code').value.trim(),
            name: document.getElementById('co_name').value.trim(),
            hoursPerWeek: Number(document.getElementById('co_hours').value),
        };

        if (!body.code || !body.name) {
            showToast('warning', 'Ingrese código y nombre del curso');
            return;
        }

        const url = course ? `/api/courses/${course.id}` : '/api/courses';

        const res = await apiFetch(url, { method: course ? 'PUT' : 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
        
        if (res.success) {
            modal.hide();
            showToast('success','Curso guardado');
            switchInstitutionTab('courses');
        } else {
            showToast('error', res.message);
        }
    });
}
function editCourse(id) { openCourseModal(id); }
async function deleteCourse(id) {
    const c = await Swal.fire({
        allowOutsideClick: false, 
        title:'¿Eliminar curso?', 
        icon:'warning', 
        showCancelButton:true, 
        confirmButtonText:'Sí, eliminar', 
        confirmButtonColor:'#ef4444',
        cancelButtonText:'Cancelar',
        cancelButtonColor: '#64748b',
        background: '#ffffff',
        color: '#0f172a',
        customClass: {
            popup: 'rounded-4 border-0 shadow-lg',
            confirmButton: 'rounded-pill px-4',
            cancelButton: 'rounded-pill px-4'
        }
    });
    if (c.isConfirmed) { await apiFetch(`/api/courses/${id}`, {method:'DELETE'}); showToast('success','Eliminado'); switchInstitutionTab('courses'); }
}

// ═══════════════════════════════════════════════════════
// TAB: CONCEPTOS FINANCIEROS
// ═══════════════════════════════════════════════════════
let _financialConcepts = [];

async function renderFinancialConceptsTab(content) {
    const data = await apiFetch('/api/financial-concepts');
    _financialConcepts = (data.concepts || []).sort((a, b) => b.id - a.id);
    let page = instCurrentPages['financial-concepts'];
    const maxPage = Math.max(1, Math.ceil(_financialConcepts.length / INST_ITEMS_PER_PAGE));
    if (page > maxPage) {
        page = maxPage;
        instCurrentPages['financial-concepts'] = page;
    }
    
    const start = (page - 1) * INST_ITEMS_PER_PAGE;
    const paginated = _financialConcepts.slice(start, start + INST_ITEMS_PER_PAGE);

    const cols = [
        { key: 'name', label: 'Concepto', render: r => `<span class="fw-bold text-dark">${r.name}</span>` },
        { key: 'amounts_inicial', label: 'Monto Inicial', render: r => `S/ ${(r.amounts?.inicial ?? r.defaultAmount ?? 0).toFixed(2)}` },
        { key: 'amounts_primaria', label: 'Monto Primaria', render: r => `S/ ${(r.amounts?.primaria ?? r.defaultAmount ?? 0).toFixed(2)}` },
        { key: 'amounts_secundaria', label: 'Monto Secundaria', render: r => `S/ ${(r.amounts?.secundaria ?? r.defaultAmount ?? 0).toFixed(2)}` },
        { key: 'rules', label: 'Reglas de Aplicación', render: r => {
            let badges = '';
            if (r.isMandatory) badges += '<span class="badge bg-success bg-opacity-10 text-success rounded-pill px-2 me-1 small">Obligatorio</span>';
            if (r.appliesToNew && !r.appliesToRegular) badges += '<span class="badge bg-info bg-opacity-10 text-info rounded-pill px-2 me-1 small">Solo Nuevos</span>';
            if (!r.appliesToNew && r.appliesToRegular) badges += '<span class="badge bg-warning bg-opacity-10 text-warning rounded-pill px-2 me-1 small">Solo Regulares</span>';
            if (r.appliesToNew && r.appliesToRegular) badges += '<span class="badge bg-primary bg-opacity-10 text-primary rounded-pill px-2 me-1 small">Nuevos y Regulares</span>';
            return badges || '<span class="text-muted small">Ninguna</span>';
        }}
    ];

    content.innerHTML = tabHeader('<i class="fas fa-money-bill-wave me-2 text-primary"></i>Conceptos Financieros', 'Nuevo Concepto', 'openFinancialConceptModal()')
        + crudTable(cols, paginated, 'editFinancialConcept', 'deleteFinancialConcept', 'financial-concepts_pagination')
        + `<div class="card border-0 bg-light rounded-4 p-4 mt-4 shadow-sm">
            <h6 class="fw-bold mb-2 text-info"><i class="fas fa-info-circle me-1"></i>Leyenda de Tipos de Alumnos</h6>
            <div class="row g-3">
                <div class="col-md-4">
                    <div class="bg-white p-3 rounded-3 border">
                        <strong class="text-info"><i class="fas fa-user-plus me-1"></i>Alumno Nuevo</strong>
                        <p class="text-muted small mb-0 mt-1">Es su primer ingreso en el colegio. Se le cobrará la Cuota de Ingreso de su nivel respectivo.</p>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="bg-white p-3 rounded-3 border">
                        <strong class="text-success"><i class="fas fa-check-double me-1"></i>Alumno Regular</strong>
                        <p class="text-muted small mb-0 mt-1">Alumno continuo con matrícula activa en el año escolar inmediatamente anterior. Cuota de Ingreso = S/ 0.</p>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="bg-white p-3 rounded-3 border">
                        <strong class="text-warning"><i class="fas fa-undo me-1"></i>Alumno Reingresante</strong>
                        <p class="text-muted small mb-0 mt-1">Registra matrículas pasadas en el colegio, pero estuvo ausente 1 año o más. Se le cobra la Cuota de Ingreso.</p>
                    </div>
                </div>
            </div>
           </div>`;

    renderTablePagination('financial-concepts_pagination', _financialConcepts.length, INST_ITEMS_PER_PAGE, page, 'changeInstPage');
}

function openFinancialConceptModal(id = null) {
    const concept = id ? _financialConcepts.find(c => c.id == id) : null;
    const bodyHtml = `
        <form id="fcForm">
            <div class="row g-3">
                <div class="col-md-12">
                    <label class="form-label text-muted small fw-bold">NOMBRE DEL CONCEPTO *</label>
                    <input id="fc_name" class="form-control rounded-pill bg-light border-0 px-3" placeholder="ej: Taller de Pintura" value="${concept?.name||''}" required>
                </div>
                
                <div class="col-md-12 mt-3">
                    <label class="form-label text-muted small fw-bold mb-2 d-block"><i class="fas fa-money-check-alt me-1 text-primary"></i> MONTOS POR NIVEL EDUCATIVO (S/) *</label>
                    <div class="row g-3 bg-light p-3 rounded-4 border mt-0">
                        <div class="col-4">
                            <label class="form-label text-muted x-small fw-bold mb-1">INICIAL</label>
                            <input id="fc_amount_inicial" type="number" step="0.01" class="form-control rounded-pill bg-white border px-3 fw-bold" value="${concept?.amounts?.inicial ?? concept?.defaultAmount ?? 0}" required>
                        </div>
                        <div class="col-4">
                            <label class="form-label text-muted x-small fw-bold mb-1">PRIMARIA</label>
                            <input id="fc_amount_primaria" type="number" step="0.01" class="form-control rounded-pill bg-white border px-3 fw-bold" value="${concept?.amounts?.primaria ?? concept?.defaultAmount ?? 0}" required>
                        </div>
                        <div class="col-4">
                            <label class="form-label text-muted x-small fw-bold mb-1">SECUNDARIA</label>
                            <input id="fc_amount_secundaria" type="number" step="0.01" class="form-control rounded-pill bg-white border px-3 fw-bold" value="${concept?.amounts?.secundaria ?? concept?.defaultAmount ?? 0}" required>
                        </div>
                    </div>
                </div>

                <div class="col-12 mt-4 border-top pt-3">
                    <h6 class="fw-bold mb-3 text-secondary"><i class="fas fa-shield-alt me-2"></i>Reglas de Aplicación</h6>
                    <div class="form-check form-switch mb-2">
                        <input class="form-check-input" type="checkbox" id="fc_mandatory" ${concept ? (concept.isMandatory ? 'checked' : '') : 'checked'}>
                        <label class="form-check-label text-dark small fw-bold" for="fc_mandatory">ES OBLIGATORIO AL INSCRIBIR</label>
                    </div>
                    <div class="form-check form-switch mb-2">
                        <input class="form-check-input" type="checkbox" id="fc_new" ${concept ? (concept.appliesToNew ? 'checked' : '') : 'checked'}>
                        <label class="form-check-label text-dark small fw-bold" for="fc_new">APLICA A ALUMNOS NUEVOS</label>
                    </div>
                    <div class="form-check form-switch mb-2">
                        <input class="form-check-input" type="checkbox" id="fc_regular" ${concept ? (concept.appliesToRegular ? 'checked' : '') : 'checked'}>
                        <label class="form-check-label text-dark small fw-bold" for="fc_regular">APLICA A ALUMNOS REGULARES/ANTIGUOS</label>
                    </div>
                </div>
            </div>
        </form>
    `;

    const modal = openInstitutionModal(concept ? 'Editar Concepto Financiero' : 'Nuevo Concepto Financiero', bodyHtml, async () => {
        const name = document.getElementById('fc_name').value.trim();
        const amounts = {
            inicial: Number(document.getElementById('fc_amount_inicial').value),
            primaria: Number(document.getElementById('fc_amount_primaria').value),
            secundaria: Number(document.getElementById('fc_amount_secundaria').value)
        };
        const isMandatory = document.getElementById('fc_mandatory').checked;
        const appliesToNew = document.getElementById('fc_new').checked;
        const appliesToRegular = document.getElementById('fc_regular').checked;

        if (!name) {
            showToast('warning', 'Ingrese el nombre del concepto');
            return;
        }

        // Auto-infer properties in the background
        const nameLower = name.toLowerCase();
        let type = concept?.type || 'optional';
        let periodicity = concept?.periodicity || 'once';
        let installmentsCount = concept?.installmentsCount || 1;

        if (nameLower.includes('mensualidad') || nameLower.includes('pensión') || nameLower.includes('pension')) {
            type = 'monthly';
            periodicity = 'monthly';
            installmentsCount = 10;
        } else if (nameLower.includes('matrícula') || nameLower.includes('matricula')) {
            type = 'tuition';
            periodicity = 'once';
            installmentsCount = 1;
        } else if (nameLower.includes('ingreso')) {
            type = 'enrollment_fee';
            periodicity = 'once';
            installmentsCount = 1;
        }

        const body = {
            name,
            amounts,
            defaultAmount: amounts.inicial, // Backward compatibility
            type,
            periodicity,
            installmentsCount,
            isMandatory,
            appliesToNew,
            appliesToRegular
        };

        const url = concept ? `/api/financial-concepts/${concept.id}` : '/api/financial-concepts';

        const res = await apiFetch(url, { method: concept ? 'PUT' : 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
        
        if (res.success) {
            modal.hide();
            showToast('success', 'Concepto financiero guardado con éxito');
            switchInstitutionTab('financial-concepts');
        } else {
            showToast('error', res.message);
        }
    });
}
function editFinancialConcept(id) { openFinancialConceptModal(id); }
async function deleteFinancialConcept(id) {
    const c = await Swal.fire({
        allowOutsideClick: false, 
        title:'¿Eliminar concepto?', 
        text:'Las cuotas ya generadas no se verán afectadas, pero no se cobrará en nuevas matrículas.', 
        icon:'warning', 
        showCancelButton:true, 
        confirmButtonText:'Sí, eliminar', 
        confirmButtonColor:'#ef4444',
        cancelButtonText:'Cancelar',
        cancelButtonColor: '#64748b',
        background: '#ffffff',
        color: '#0f172a',
        customClass: {
            popup: 'rounded-4 border-0 shadow-lg',
            confirmButton: 'rounded-pill px-4',
            cancelButton: 'rounded-pill px-4'
        }
    });
    if (c.isConfirmed) { await apiFetch(`/api/financial-concepts/${id}`, {method:'DELETE'}); showToast('success','Eliminado'); switchInstitutionTab('financial-concepts'); }
}



// ═══════════════════════════════════════════════════════
// TAB: HORARIOS
// ═══════════════════════════════════════════════════════
async function renderSchedulesTab(content) {
    content.innerHTML = `<div class="text-center py-5 text-muted">
        <i class="fas fa-clock fa-3x mb-3 opacity-20"></i>
        <h5 class="fw-bold">Gestión de Horarios</h5>
        <p>Configura los bloques horarios por grado y sección.</p>
        <button class="btn btn-primary rounded-pill px-4 mt-3" style="background:var(--primary-color); border:none;">
            <i class="fas fa-th me-2"></i> Abrir Constructor de Horarios
        </button>
    </div>`;
}

// ── Shared Functions ────────────────────────────────────────────────────────
function previewSchoolLogo(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('school_logo_preview').src = e.target.result;
        }
        reader.readAsDataURL(file);
    }
}

async function saveSchoolConfig() {
    const form = document.getElementById('schoolForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        showToast('warning', 'Complete todos los campos obligatorios');
        return;
    }

    const formData = new FormData();
    formData.append('name', document.getElementById('school_name').value);
    formData.append('email', document.getElementById('school_email').value);
    formData.append('phone', document.getElementById('school_phone').value);
    formData.append('address', document.getElementById('school_address').value);
    formData.append('paymentMethods', document.getElementById('school_payment_methods').value);
    formData.append('allowMultipleCashSessions', document.getElementById('school_allow_multiple_cash').checked);

    const fileInput = document.getElementById('school_logo');
    if (fileInput.files[0]) {
        formData.append('logoFile', fileInput.files[0]);
    }

    const token = localStorage.getItem('token');
    try {
        const res = await fetch('/api/school', {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const data = await res.json();
        if (data.success) {
            showToast('success', 'Institución actualizada');
            if (data.school.logo) {
                const sidebarLogo = document.querySelector('.sidebar-logo');
                if (sidebarLogo) sidebarLogo.src = data.school.logo + '?t=' + new Date().getTime();
            }
        } else {
            showToast('error', data.message);
        }
    } catch (e) {
        console.error(e);
        showToast('error', 'Error de conexión');
    }
}

function showToast(icon, title) {
    Swal.fire({
        allowOutsideClick: false,
        toast: true, position: 'top-end', icon, title,
        showConfirmButton: false, timer: 3000,
        background: '#ffffff', 
        color: '#0f172a',
        iconColor: icon === 'success' ? '#2fbf71' : (icon === 'error' ? '#ef4444' : '#f59e0b')
    });
}
