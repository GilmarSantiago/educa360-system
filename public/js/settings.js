// ── Settings Module Logic (Users & Roles) ───────────────────────────────────

let settingsCurrentTab = 'users';
const SETTINGS_ITEMS_PER_PAGE = 10;
const settingsCurrentPages = {
    'users': 1,
    'roles': 1
};

let _allUsersData = [];
let _allRolesData = [];
let _allSystemModules = {};

async function renderSettingsModule() {
    const container = document.querySelector('.content-body');
    if (!container) return;

    container.innerHTML = `
        <div class="container-fluid px-0 animate__animated animate__fadeIn">
            <!-- Tabs Navigation -->
            <div class="glass p-3 mb-4 rounded-4 shadow-sm border-0">
                <div class="global-tab-nav" id="settingsTabs">
                    <button class="global-tab-btn ${settingsCurrentTab === 'users' ? 'active' : ''}" onclick="switchSettingsTab('users')">
                        <i class="fas fa-users me-2"></i>Gestión de Usuarios
                    </button>
                    <button class="global-tab-btn ${settingsCurrentTab === 'roles' ? 'active' : ''}" onclick="switchSettingsTab('roles')">
                        <i class="fas fa-user-tag me-2"></i>Roles y Permisos
                    </button>
                </div>
            </div>

            <!-- Tab Content -->
            <div id="settingsTabContent" class="animate__animated animate__fadeIn">
                <!-- Se llena por JS -->
            </div>
        </div>
    `;

    loadSettingsTab(settingsCurrentTab);
}

function switchSettingsTab(tabId) {
    settingsCurrentTab = tabId;
    renderSettingsModule();
}

async function loadSettingsTab(tabId) {
    const content = document.getElementById('settingsTabContent');
    if (!content) return;
    content.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-primary" role="status"></div></div>';

    if (tabId === 'users') await renderUsersTab(content);
    if (tabId === 'roles') await renderRolesTab(content);
}

// ── Users Tab ───────────────────────────────────────────────────────────────
async function renderUsersTab(content) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch('/api/users', { headers: { 'Authorization': `Bearer ${token}` }});
        const data = await res.json();
        // Sort newest first so they appear on Page 1
        _allUsersData = (data.users || []).sort((a, b) => b.id - a.id);
    } catch(e) { console.error(e); }

    let page = settingsCurrentPages['users'];
    const maxPage = Math.max(1, Math.ceil(_allUsersData.length / SETTINGS_ITEMS_PER_PAGE));
    if (page > maxPage) {
        page = maxPage;
        settingsCurrentPages['users'] = page;
    }
    
    const start = (page - 1) * SETTINGS_ITEMS_PER_PAGE;
    const paginated = _allUsersData.slice(start, start + SETTINGS_ITEMS_PER_PAGE);

    const roleColors = {
        'administrador': 'primary',
        'maestro': 'info',
        'soporte': 'warning',
        'apoderado': 'success',
        'colaborador': 'secondary'
    };

    const cols = [
        { label: 'USUARIO', render: u => {
            const avatar = u.avatar && u.avatar !== 'null' ? u.avatar : `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=f1f5f9&color=64748b&rounded=true`;
            return `<div class="d-flex align-items-center justify-content-center">
                <img src="${avatar}" class="rounded-circle me-3" width="35" height="35" style="object-fit: cover;">
                <div class="text-start">
                    <div class="fw-bold text-dark">${u.name}</div>
                    <div class="small text-muted">@${u.username} ${u.cargo ? `<span class="badge bg-light text-secondary border ms-1">${u.cargo}</span>` : ''}</div>
                </div>
            </div>`;
        }},
        { label: 'ROL', render: u => {
            const color = roleColors[u.role] || 'dark';
            return `<span class="badge bg-${color} bg-opacity-10 text-${color} rounded-pill px-3 py-1 text-uppercase" style="font-size:0.7rem;">${u.role}</span>`;
        }},
        { label: 'CORREO', render: u => `<span class="text-muted small">${u.email || '—'}</span>` }
    ];

    content.innerHTML = tabHeader('<i class="fas fa-users-cog me-2 text-primary"></i>Gestión de Usuarios', 'Nuevo Usuario', 'openSettingsUserModal()')
        + crudTable(cols, paginated, 'editSettingsUser', 'deleteSettingsUser', 'users_pagination');

    renderTablePagination('users_pagination', _allUsersData.length, SETTINGS_ITEMS_PER_PAGE, page, 'changeSettingsPage');
}

function openSettingsUserModal(id = null) {
    // Reutilizamos el modal de usuarios existente en dashboard.html
    // pero configurado para el flujo de settings
    const user = id ? _allUsersData.find(u => u.id == id) : null;
    
    // Inyectamos el modal si no existe (aunque ya está en dashboard.html)
    // Para simplificar, usaremos el openInstitutionModal de institution.js
    const bodyHtml = `
        <form id="settingsUserForm">
            <div class="row g-3">
                <div class="col-md-12">
                    <label class="form-label text-muted small fw-bold mb-1">NOMBRE COMPLETO *</label>
                    <input type="text" class="form-control rounded-pill bg-light border-0 px-3" id="su_name" value="${user?.name || ''}" required>
                </div>
                <div class="col-md-6">
                    <label class="form-label text-muted small fw-bold mb-1">USUARIO *</label>
                    <input type="text" class="form-control rounded-pill bg-light border-0 px-3" id="su_username" value="${user?.username || ''}" required>
                </div>
                <div class="col-md-6">
                    <label class="form-label text-muted small fw-bold mb-1">CONTRASEÑA ${user ? '(Opcional)' : '*'}</label>
                    <input type="password" class="form-control rounded-pill bg-light border-0 px-3" id="su_password" ${user ? '' : 'required'}>
                </div>
                <div class="col-md-6">
                    <label class="form-label text-muted small fw-bold mb-1">CORREO *</label>
                    <input type="email" class="form-control rounded-pill bg-light border-0 px-3" id="su_email" value="${user?.email || ''}" required>
                </div>
                <div class="col-md-6">
                    <label class="form-label text-muted small fw-bold mb-1">ROL *</label>
                    <select class="form-select rounded-pill bg-light border-0 px-3" id="su_role" required>
                        <option value="" disabled ${!user ? 'selected' : ''}>Cargando roles...</option>
                    </select>
                </div>
                <div class="col-md-6" id="su_cargo_container" style="display: none;">
                    <label class="form-label text-muted small fw-bold mb-1">CARGO DEL COLABORADOR</label>
                    <input type="text" class="form-control rounded-pill bg-light border-0 px-3" id="su_cargo" value="${user?.cargo || ''}" placeholder="Ej: Cajero, Recepción...">
                </div>
                <div class="col-md-12 mt-3">
                    <div class="form-check form-switch p-3 border rounded-4 bg-white shadow-sm d-flex align-items-center justify-content-between">
                        <div>
                            <label class="form-check-label fw-bold mb-0 text-dark" for="su_canGenerateTokens">
                                <i class="fas fa-key text-primary me-2"></i>Permitir generar tokens de cierre de caja
                            </label>
                            <div class="small text-muted mt-1">El usuario podrá generar códigos dinámicos para autorizar cierres.</div>
                        </div>
                        <input class="form-check-input ms-0" style="width: 3rem; height: 1.5rem; cursor: pointer;" type="checkbox" id="su_canGenerateTokens" ${user?.canGenerateTokens ? 'checked' : ''}>
                    </div>
                </div>
            </div>
        </form>
    `;

    const modal = openInstitutionModal(user ? 'Editar Usuario' : 'Nuevo Usuario', bodyHtml, async () => {
        const form = document.getElementById('settingsUserForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            showToast('warning', 'Complete todos los campos');
            return;
        }

        const body = {
            name: document.getElementById('su_name').value,
            username: document.getElementById('su_username').value,
            email: document.getElementById('su_email').value,
            role: document.getElementById('su_role').value,
            canGenerateTokens: document.getElementById('su_canGenerateTokens').checked
        };
        
        if (body.role === 'colaborador') {
            body.cargo = document.getElementById('su_cargo').value;
        }
        const pass = document.getElementById('su_password').value;
        if (pass) body.password = pass;

        const token = localStorage.getItem('token');
        const url = user ? `/api/users/${user.id}` : '/api/users';
        const method = user ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(body)
        });
        const data = await res.json();

        if (data.success) {
            modal.hide();
            showToast('success', 'Usuario guardado');
            loadSettingsTab('users');
        } else {
            showToast('error', data.message);
        }
    });

    // Cargar roles y configurar eventos después de inyectar el modal
    setTimeout(async () => {
        try {
            const roleSelect = document.getElementById('su_role');
            const cargoContainer = document.getElementById('su_cargo_container');

            // Cargar roles si no están en memoria
            if (_allRolesData.length === 0) {
                const resRoles = await fetch('/api/roles');
                const dataRoles = await resRoles.json();
                if (dataRoles.roles) _allRolesData = dataRoles.roles;
            }

            // Llenar select
            roleSelect.innerHTML = `<option value="" disabled ${!user ? 'selected' : ''}>Selecciona rol</option>`;
            _allRolesData.forEach(r => {
                const isSelected = user?.role === r.id ? 'selected' : '';
                const roleName = r.id.charAt(0).toUpperCase() + r.id.slice(1);
                roleSelect.innerHTML += `<option value="${r.id}" ${isSelected}>${roleName}</option>`;
            });

            // Manejar toggle de cargo
            const toggleCargo = () => {
                if (roleSelect.value === 'colaborador') {
                    cargoContainer.style.display = 'block';
                } else {
                    cargoContainer.style.display = 'none';
                    document.getElementById('su_cargo').value = '';
                }
            };

            roleSelect.addEventListener('change', toggleCargo);
            toggleCargo(); // Inicializar estado

        } catch (e) {
            console.error('Error cargando roles', e);
        }
    }, 100);
}

function editSettingsUser(id) { openSettingsUserModal(id); }
async function deleteSettingsUser(id) {
    const result = await Swal.fire({
        allowOutsideClick: false,
        title: '¿Eliminar usuario?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        confirmButtonColor: '#ef4444',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/users/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }});
        const data = await res.json();
        if (data.success) {
            showToast('success', 'Usuario eliminado');
            loadSettingsTab('users');
        } else {
            showToast('error', data.message);
        }
    }
}

// ── Roles Tab ───────────────────────────────────────────────────────────────
async function renderRolesTab(content) {
    try {
        const [rolesRes, modulesRes] = await Promise.all([
            fetch('/api/roles'),
            fetch('/api/system/modules')
        ]);
        const rolesData = await rolesRes.json();
        const modulesData = await modulesRes.json();
        // Sort roles alphabetical or as they come, but descending if they had IDs. 
        // Roles don't have numeric IDs but we can sort them.
        _allRolesData = rolesData.roles || [];
        _allSystemModules = modulesData.modules || {};
    } catch(e) { console.error(e); }

    let page = settingsCurrentPages['roles'];
    const maxPage = Math.max(1, Math.ceil(_allRolesData.length / SETTINGS_ITEMS_PER_PAGE));
    if (page > maxPage) {
        page = maxPage;
        settingsCurrentPages['roles'] = page;
    }

    const start = (page - 1) * SETTINGS_ITEMS_PER_PAGE;
    const paginated = _allRolesData.slice(start, start + SETTINGS_ITEMS_PER_PAGE);

    const cols = [
        { label: 'ROL', render: r => `<span class="fw-bold text-dark text-capitalize">${r.id}</span>` },
        { label: 'MÓDULOS ACCESIBLES', render: r => {
            return (r.modules || []).map(modId => {
                const mod = _allSystemModules[modId];
                return `<span class="badge bg-light text-secondary rounded-pill me-1 border px-2 py-1 small" style="font-size:0.65rem;">
                    <i class="${mod?.icon || 'fas fa-cube'} me-1"></i>${mod?.name || modId}
                </span>`;
            }).join('');
        }}
    ];

    content.innerHTML = tabHeader('<i class="fas fa-user-tag me-2 text-primary"></i>Roles y Permisos', 'Nuevo Rol', 'openRoleModal()')
        + crudTable(cols, paginated, 'editRolePermissions', 'deleteRole', 'roles_pagination');

    renderTablePagination('roles_pagination', _allRolesData.length, SETTINGS_ITEMS_PER_PAGE, page, 'changeSettingsPage');
}

function openRoleModal() {
    const bodyHtml = `
        <form id="newRoleForm">
            <div class="mb-3">
                <label class="form-label text-muted small fw-bold mb-1">NOMBRE DEL ROL *</label>
                <input type="text" class="form-control rounded-pill bg-light border-0 px-3" id="nr_id" placeholder="ej: coordinador" required>
            </div>
            <p class="small text-muted"><i class="fas fa-info-circle me-1"></i> Al crear el rol, podrás configurar sus permisos desde el botón editar de la tabla.</p>
        </form>
    `;

    const modal = openInstitutionModal('Nuevo Rol', bodyHtml, async () => {
        const form = document.getElementById('newRoleForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const id = document.getElementById('nr_id').value.toLowerCase().trim();
        const token = localStorage.getItem('token');

        const res = await fetch(`/api/roles/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ modules: [] })
        });
        const data = await res.json();

        if (data.success) {
            modal.hide();
            showToast('success', 'Rol creado');
            loadSettingsTab('roles');
        } else {
            showToast('error', data.message);
        }
    });
}

function showPermissionsInfo() {
    Swal.fire({
        allowOutsideClick: false,
        title: 'Gestión de Permisos',
        text: 'Haz clic en el botón de editar de cada rol para seleccionar qué módulos puede visualizar en su menú lateral.',
        icon: 'info',
        confirmButtonText: 'Entendido',
        confirmButtonColor: 'var(--primary-color)'
    });
}

function editRolePermissions(roleId) {
    const role = _allRolesData.find(r => r.id === roleId);
    if (!role) return;

    // Build modules checklist
    let checklistHtml = '<div class="row text-start g-3">';
    Object.entries(_allSystemModules).forEach(([modId, mod]) => {
        const isChecked = role.modules.includes(modId);
        checklistHtml += `
            <div class="col-md-6">
                <div class="form-check form-switch p-3 border rounded-4 hover-shadow transition-smooth">
                    <input class="form-check-input ms-0 me-3" type="checkbox" id="mod_${modId}" ${isChecked ? 'checked' : ''} value="${modId}">
                    <label class="form-check-label d-flex align-items-center" for="mod_${modId}">
                        <i class="${mod.icon} me-3 text-primary opacity-75" style="width:20px;"></i>
                        <div>
                            <div class="fw-bold small text-dark">${mod.name}</div>
                            <div class="text-muted" style="font-size:0.7rem;">${mod.category || 'General'}</div>
                        </div>
                    </label>
                </div>
            </div>
        `;
    });
    checklistHtml += '</div>';

    const bodyHtml = `
        <div class="mb-4 text-center">
            <h6 class="text-muted small fw-bold">CONFIGURANDO ROL:</h6>
            <input type="text" class="form-control form-control-lg fw-bold text-primary text-uppercase text-center border-0 bg-light rounded-4 mb-3" id="edit_role_id" value="${role.id}">
            <p class="text-muted small">Selecciona los módulos a los que este rol tendrá acceso:</p>
        </div>
        <div class="p-2" style="max-height: 400px; overflow-y: auto; overflow-x: hidden;">
            ${checklistHtml}
        </div>
    `;

    const modal = openInstitutionModal('Editar Rol y Permisos', bodyHtml, async () => {
        const selectedModules = [];
        Object.keys(_allSystemModules).forEach(modId => {
            if (document.getElementById(`mod_${modId}`).checked) {
                selectedModules.push(modId);
            }
        });

        const newId = document.getElementById('edit_role_id').value.toLowerCase().trim();
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/roles/${roleId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ modules: selectedModules, newId })
        });
        const data = await res.json();

        if (data.success) {
            modal.hide();
            
            const currentRole = localStorage.getItem('role');
            if (roleId === currentRole) {
                Swal.fire({
        allowOutsideClick: false,
                    title: 'Permisos Actualizados',
                    text: 'Se han modificado los permisos de tu rol actual. Debes iniciar sesión nuevamente para aplicar los cambios.',
                    icon: 'warning',
                    confirmButtonText: 'Entendido',
                    confirmButtonColor: 'var(--primary-color)',
                    allowOutsideClick: false
                }).then(() => {
                    localStorage.clear();
                    window.location.href = '/';
                });
            } else {
                showToast('success', 'Permisos actualizados');
                loadSettingsTab('roles');
            }
        } else {
            showToast('error', data.message);
        }
    });
}

async function deleteRole(id) {
    const result = await Swal.fire({
        allowOutsideClick: false,
        title: '¿Eliminar rol?',
        text: 'Los usuarios asignados a este rol podrían perder acceso.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        confirmButtonColor: '#ef4444',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/roles/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }});
        const data = await res.json();
        if (data.success) {
            showToast('success', 'Rol eliminado');
            loadSettingsTab('roles');
        } else {
            showToast('error', data.message);
        }
    }
}

function changeSettingsPage(page) {
    settingsCurrentPages[settingsCurrentTab] = page;
    loadSettingsTab(settingsCurrentTab);
}
