// Final Dashboard Logic - Educa360

const WIDGETS_CONFIG = {
    administrador: [
        { id: 'widget-students', title: 'Estudiantes (Año Activo)', value: '0', icon: 'fas fa-user-graduate', class: 'bg-light-blue' },
        { id: 'widget-teachers', title: 'Docentes Activos', value: '...', icon: 'fas fa-chalkboard-teacher', class: 'bg-light-purple' },
        { id: 'widget-revenue', title: 'Ingresos Mensuales', value: '...', icon: 'fas fa-dollar-sign', class: 'bg-light-green' },
        { id: 'widget-registers', title: 'Cajas Abiertas', value: '...', icon: 'fas fa-cash-register', class: 'bg-light-orange' }
    ],
    maestro: [
        { title: 'Mis Alumnos', value: '120', icon: 'fas fa-users', class: 'bg-light-blue' },
        { title: 'Tareas por Corregir', value: '15', icon: 'fas fa-tasks', class: 'bg-light-purple' },
        { title: 'Promedio Grupal', value: '8.5', icon: 'fas fa-chart-line', class: 'bg-light-green' },
        { title: 'Clases Dictadas', value: '42', icon: 'fas fa-clock', class: 'bg-light-orange' }
    ],
    soporte: [
        { title: 'Tickets Abiertos', value: '12', icon: 'fas fa-ticket-alt', class: 'bg-light-orange' },
        { title: 'Servidores Online', value: '5/5', icon: 'fas fa-server', class: 'bg-light-green' },
        { title: 'Usuarios Online', value: '340', icon: 'fas fa-globe', class: 'bg-light-blue' }
    ],
    apoderado: [
        { title: 'Hijos Matriculados', value: '2', icon: 'fas fa-child', class: 'bg-light-blue' },
        { title: 'Pagos Pendientes', value: '0', icon: 'fas fa-money-bill-wave', class: 'bg-light-green' },
        { title: 'Nuevos Comunicados', value: '3', icon: 'fas fa-bell', class: 'bg-light-orange' }
    ],
    colaborador: [
        { title: 'Matrículas Hoy', value: '...', icon: 'fas fa-user-plus', class: 'bg-light-blue', id: 'colab-enrolls' },
        { title: 'Estado de Caja', value: 'Cerrada', icon: 'fas fa-cash-register', class: 'bg-light-green', id: 'colab-caja' },
        { title: 'Ventas del Turno', value: 'S/ 0.00', icon: 'fas fa-coins', class: 'bg-light-purple', id: 'colab-sales' },
        { title: 'Tareas Pendientes', value: '2', icon: 'fas fa-clipboard-list', class: 'bg-light-orange' }
    ]
};

let originalDashboardContent = '';

// Intercept all fetch requests to handle expired tokens
const originalFetch = window.fetch;
window.fetch = async function() {
    const response = await originalFetch.apply(this, arguments);
    if (response.status === 401 || response.status === 403) {
        try {
            const cloned = response.clone();
            const data = await cloned.json();
            if (data && data.message && (data.message.includes('expirado') || data.message.includes('Token') || data.message.includes('No autorizado'))) {
                localStorage.clear();
                window.location.href = '/?expired=1';
                return response;
            }
        } catch (e) {
            // Ignore parse errors, might not be JSON
        }
    }
    return response;
};

document.addEventListener('DOMContentLoaded', () => {
    // Check Auth
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const userName = localStorage.getItem('userName');
    const modulesRaw = localStorage.getItem('userModules');

    const container = document.querySelector('.content-body');
    if (container) originalDashboardContent = container.innerHTML;
    
    if (!token || !role) {
        console.log("No token or role found, redirecting to login");
        window.location.href = '/';
        return;
    }

    let modules = [];
    if (modulesRaw && modulesRaw !== 'undefined' && modulesRaw !== 'null') {
        try {
            modules = JSON.parse(modulesRaw);
        } catch (e) {
            console.error("Error parsing modulesRaw:", e);
        }
    }

    // Update User Info via Classes
    document.querySelectorAll('.displayUserNameText').forEach(el => el.innerText = userName);
    document.querySelectorAll('.displayUserRoleText').forEach(el => el.innerText = role.charAt(0).toUpperCase() + role.slice(1));
    
    const welcomeEl = document.getElementById('welcomeText');
    if (welcomeEl) welcomeEl.innerText = `Bienvenido/a, ${userName} !`;
    
    const userAvatar = localStorage.getItem('userAvatar');
    const avatarUrl = (userAvatar && userAvatar !== 'null') ? userAvatar : `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=3b82f6&color=fff&rounded=true`;
    document.querySelectorAll('.userAvatarImg').forEach(img => img.src = avatarUrl);
    
    // Show admin options if role is administrador
    if (role === 'administrador') {
        document.querySelectorAll('.adminOnlyOption').forEach(el => el.style.display = 'block');
    }


    // Render Sidebar Modules
    renderSidebar(modules);

    // Initial Routing based on URL
    const path = window.location.pathname.replace(/^\//, ''); // Remove leading slash
    let initialModule = path;
    let targetLink = document.querySelector(`a[href="/${initialModule}"]`);
    
    // Si no existe la ruta en el menú, redirigir al primer módulo disponible
    if (!targetLink && modules.length > 0) {
        initialModule = modules[0].id;
        targetLink = document.querySelector(`a[href="/${initialModule}"]`);
        history.replaceState(null, '', '/' + initialModule);
    }

    if (initialModule && targetLink) {
        loadModule(initialModule, targetLink, null, true); // true = no pushState en carga inicial
    }

    // Handle back/forward browser buttons
    window.addEventListener('popstate', () => {
        const currentPath = window.location.pathname.replace(/^\//, '');
        if (currentPath) {
            const targetLink = document.querySelector(`a[href="/${currentPath}"]`);
            loadModule(currentPath, targetLink, null, true);
        } else if (modules.length > 0) {
            const targetLink = document.querySelector(`a[href="/${modules[0].id}"]`);
            loadModule(modules[0].id, targetLink, null, true);
        }
    });

    // Render Initial Widgets based on role
    renderWidgets(role);

    // Sidebar toggle and responsive state
    const toggleBtn = document.getElementById('toggleSidebar');
    const sidebar = document.getElementById('sidebar');
    const topNavbar = document.querySelector('.top-navbar');

    const isDesktopView = () => window.innerWidth > 992;
    const isTabletView = () => window.innerWidth <= 992 && window.innerWidth > 576;
    const isMobileView = () => window.innerWidth <= 576;

    const isSidebarOpen = () => {
        if (!sidebar) return false;
        return isMobileView() ? sidebar.classList.contains('mobile-open') : !sidebar.classList.contains('collapsed');
    };

    const updateToggleButtonPosition = () => {
        if (!sidebar || !toggleBtn) return;
        // La posición en desktop y mobile es manejada por CSS y Flexbox de manera natural.
        // Solo necesitamos limpiar cualquier estilo en línea residual.
        toggleBtn.style.position = '';
        toggleBtn.style.top = '';
        toggleBtn.style.left = '';
    };

    const updateSidebarToggleState = () => {
        if (!sidebar || !toggleBtn) return;
        const icon = toggleBtn.querySelector('i');
        const expanded = isSidebarOpen();

        if (icon) {
            icon.classList.toggle('fa-arrow-left', expanded);
            icon.classList.toggle('fa-arrow-right', !expanded);
        }
        toggleBtn.classList.toggle('open', isMobileView() && expanded);

        if (topNavbar) {
            topNavbar.classList.toggle('sidebar-expanded', expanded && !isMobileView());
            topNavbar.classList.toggle('sidebar-collapsed', !expanded && !isMobileView());
        }

        updateToggleButtonPosition();
    };

    const syncSidebarState = () => {
        if (!sidebar) return;
        if (isMobileView()) {
            sidebar.classList.remove('collapsed');
        } else if (isTabletView()) {
            sidebar.classList.remove('mobile-open');
            sidebar.classList.add('collapsed');
        } else {
            sidebar.classList.remove('mobile-open');
        }
    };

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();

            if (isMobileView()) {
                sidebar.classList.toggle('mobile-open');
            } else {
                sidebar.classList.toggle('collapsed');
            }
            updateSidebarToggleState();
        });
    }

    window.addEventListener('resize', () => {
        syncSidebarState();
        updateSidebarToggleState();
    });

    syncSidebarState();
    updateSidebarToggleState();
});

function renderSidebar(modules) {
    const container = document.getElementById('sidebarMenu');
    if (!container) return;
    container.innerHTML = '';

    if (!modules || modules.length === 0) {
        container.innerHTML = '<li class="text-center p-3 small opacity-50">Sin módulos cargados</li>';
        return;
    }

    const role = localStorage.getItem('role') || '';

    if (role === 'administrador') {
        const categories = {};
        
        modules.forEach(mod => {
            const cat = mod.category || 'Generales';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(mod);
        });
        
        for (const [cat, mods] of Object.entries(categories)) {
            const headerLi = document.createElement('li');
            headerLi.className = 'menu-header px-3 mt-3 mb-1 text-uppercase text-muted small fw-bold';
            headerLi.style.fontSize = '0.7rem';
            headerLi.style.letterSpacing = '1px';
            headerLi.innerText = cat;
            container.appendChild(headerLi);
            
            mods.forEach(mod => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <a href="/${mod.id}" onclick="loadModule('${mod.id}', this, event)">
                        <i class="${mod.icon}"></i>
                        <span>${mod.name}</span>
                    </a>
                `;
                container.appendChild(li);
            });
        }
    } else {
        modules.forEach((mod) => {
            const li = document.createElement('li');
            
            li.innerHTML = `
                <a href="/${mod.id}" onclick="loadModule('${mod.id}', this, event)">
                    <i class="${mod.icon}"></i>
                    <span>${mod.name}</span>
                </a>
            `;
            container.appendChild(li);
        });
    }
}

function renderWidgets(role) {
    const container = document.getElementById('dashboardWidgets');
    if (!container) return;
    
    const widgets = WIDGETS_CONFIG[role] || WIDGETS_CONFIG['administrador'];
    
    container.innerHTML = '';
    widgets.forEach(w => {
        const col = document.createElement('div');
        col.className = 'col-xl-3 col-md-6 mb-4';
        col.innerHTML = `
            <div class="stat-card animate__animated animate__fadeIn">
                <div class="stat-icon ${w.class}">
                    <i class="${w.icon}"></i>
                </div>
                <div class="stat-details">
                    <p class="mb-1">${w.title}</p>
                    <h3 class="mb-0" ${w.id ? `id="${w.id}"` : ''}>${w.value}</h3>
                </div>
            </div>
        `;
        container.appendChild(col);
    });

    const canGenerateTokens = localStorage.getItem('canGenerateTokens') === 'true';
    if (canGenerateTokens) {
        const tokenCol = document.createElement('div');
        tokenCol.className = 'col-xl-3 col-md-6 mb-4';
        tokenCol.innerHTML = `
            <div class="card border-0 shadow-sm rounded-4 h-100 animate__animated animate__fadeIn">
                <div class="card-body p-4 d-flex flex-column align-items-center justify-content-center text-center">
                    <div class="bg-light-primary text-primary rounded-circle mb-3 d-flex align-items-center justify-content-center" style="width: 50px; height: 50px;">
                        <i class="fas fa-key fa-lg"></i>
                    </div>
                    <h6 class="fw-bold mb-3">Token de Autorización</h6>
                    <div class="input-group mb-3">
                        <input type="password" id="closureTokenDisplay" class="form-control text-center fw-bold fs-5 bg-light border-0" value="------" readonly style="letter-spacing: 3px;">
                        <button class="btn btn-outline-secondary border-0 bg-light" type="button" id="toggleTokenEye" onclick="toggleClosureTokenVisibility()" disabled>
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                    <button id="generateTokenBtn" class="btn btn-primary rounded-pill fw-bold w-100" onclick="generateClosureToken()">
                        <i class="fas fa-sync-alt me-2"></i>Generar Token
                    </button>
                    <div id="tokenTimerText" class="small text-danger fw-bold mt-2" style="display: none;">
                        Expira en <span id="tokenSeconds">60</span>s
                    </div>
                </div>
            </div>
        `;
        container.appendChild(tokenCol);
    }

    if (role === 'administrador' || role === 'colaborador') {
        fetchDashboardStats(role);
    }
}

async function fetchDashboardStats(role) {
    try {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };
        
        if (role === 'administrador') {
            // Fetch users (Docentes)
            const resUsers = await fetch('/api/users', { headers });
            const dataUsers = await resUsers.json();
            if (dataUsers.success) {
                const teachers = dataUsers.users.filter(u => u.role === 'maestro' || u.role === 'profesor').length;
                const widgetTeachers = document.getElementById('widget-teachers');
                if (widgetTeachers) widgetTeachers.innerText = teachers || 0;
            }

            // Get active academic year for students count
            const resAy = await fetch('/api/academic-years', { headers });
            const dataAy = await resAy.json();
            
            if (dataAy.success && dataAy.academicYears) {
                const activeAy = dataAy.academicYears.find(y => y.status === 'activo' || y.isActive === true);
                if (activeAy) {
                    const activeYearId = activeAy.id;
                    const resEnr = await fetch('/api/enrollments', { headers });
                    const dataEnr = await resEnr.json();
                    
                    if (dataEnr.success) {
                        const activeEnrollments = dataEnr.enrollments.filter(e => e.academicYearId == activeYearId && e.status === 'activo');
                        const widgetEl = document.getElementById('widget-students');
                        if (widgetEl) widgetEl.innerText = activeEnrollments.length;
                    }
                }
            }

            // Fetch open registers
            const resCaja = await fetch('/api/cash-registers/history', { headers });
            const dataCaja = await resCaja.json();
            if (dataCaja.success) {
                const openSessions = dataCaja.history.filter(s => s.status === 'open').length;
                const widgetReg = document.getElementById('widget-registers');
                if (widgetReg) widgetReg.innerText = openSessions || 0;

                const currentMonth = new Date().getMonth();
                const totalMonth = dataCaja.history.filter(s => new Date(s.openedAt).getMonth() === currentMonth)
                                                   .reduce((sum, s) => sum + (s.totalSales || 0), 0);
                const widgetRev = document.getElementById('widget-revenue');
                if (widgetRev) widgetRev.innerText = `S/ ${totalMonth.toFixed(2)}`;
            }
        } 
        else if (role === 'colaborador') {
            // Check own cash session
            const resCaja = await fetch('/api/cash-registers/current', { headers });
            const dataCaja = await resCaja.json();
            
            const wCaja = document.getElementById('colab-caja');
            const wSales = document.getElementById('colab-sales');
            
            if (dataCaja.success && dataCaja.session) {
                if (wCaja) {
                    wCaja.innerHTML = `<span class="badge bg-success bg-opacity-10 text-success rounded-pill px-3">Abierta</span>`;
                }
                if (wSales) {
                    wSales.innerText = `S/ ${(dataCaja.session.totalSales || 0).toFixed(2)}`;
                }
            } else {
                if (wCaja) wCaja.innerHTML = `<span class="badge bg-secondary bg-opacity-10 text-secondary rounded-pill px-3">Cerrada</span>`;
            }

            // Enrollments today
            const resEnr = await fetch('/api/enrollments', { headers });
            const dataEnr = await resEnr.json();
            if (dataEnr.success) {
                const today = new Date().toDateString();
                const todayCount = dataEnr.enrollments.filter(e => new Date(e.createdAt || e.date).toDateString() === today).length;
                const wEnr = document.getElementById('colab-enrolls');
                if (wEnr) wEnr.innerText = todayCount;
            }
        }
        
    } catch (e) {
        console.error('Error fetching dashboard stats:', e);
    }
}

let closureTokenTimerInterval = null;

async function generateClosureToken() {
    const btn = document.getElementById('generateTokenBtn');
    const display = document.getElementById('closureTokenDisplay');
    const eyeBtn = document.getElementById('toggleTokenEye');
    const timerText = document.getElementById('tokenTimerText');
    const secondsSpan = document.getElementById('tokenSeconds');

    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Generando...';
        
        const token = localStorage.getItem('token');
        const res = await fetch('/api/generate-closure-token', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.success) {
            display.value = data.token;
            eyeBtn.disabled = false;
            
            btn.style.display = 'none';
            timerText.style.display = 'block';
            
            let timeLeft = 60;
            secondsSpan.innerText = timeLeft;
            
            if (closureTokenTimerInterval) clearInterval(closureTokenTimerInterval);
            closureTokenTimerInterval = setInterval(() => {
                timeLeft--;
                secondsSpan.innerText = timeLeft;
                if (timeLeft <= 0) {
                    clearInterval(closureTokenTimerInterval);
                    display.value = '------';
                    display.type = 'password';
                    eyeBtn.innerHTML = '<i class="fas fa-eye"></i>';
                    eyeBtn.disabled = true;
                    btn.style.display = 'block';
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-sync-alt me-2"></i>Generar Token';
                    timerText.style.display = 'none';
                }
            }, 1000);

            Swal.fire({
        allowOutsideClick: false,
                toast: true, position: 'top-end', icon: 'success',
                title: 'Token generado',
                showConfirmButton: false, timer: 2000
            });
        } else {
            Swal.fire('Error', data.message || 'Error al generar token', 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-sync-alt me-2"></i>Generar Token';
        }
    } catch (err) {
        console.error(err);
        Swal.fire('Error', 'Error de conexión', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sync-alt me-2"></i>Generar Token';
    }
}

function toggleClosureTokenVisibility() {
    const display = document.getElementById('closureTokenDisplay');
    const eyeBtn = document.getElementById('toggleTokenEye');
    if (display.type === 'password') {
        display.type = 'text';
        eyeBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
    } else {
        display.type = 'password';
        eyeBtn.innerHTML = '<i class="fas fa-eye"></i>';
    }
}

function loadModule(id, el, event, isPopState = false) {
    if (event) event.preventDefault();

    if (!isPopState) {
        history.pushState(null, '', '/' + id);
    }

    // Update active state in sidebar
    document.querySelectorAll('.sidebar-nav ul li').forEach(li => li.classList.remove('active'));
    
    if (el) {
        el.parentElement.classList.add('active');
        const titleEl = document.getElementById('pageTitle');
        if (titleEl) titleEl.innerText = el.querySelector('span').innerText;
    } else {
        const targetLink = document.querySelector(`a[href="/${id}"]`);
        if (targetLink) {
            targetLink.parentElement.classList.add('active');
            const titleEl = document.getElementById('pageTitle');
            if (titleEl) titleEl.innerText = targetLink.querySelector('span').innerText;
        }
    }

    // Auto-close sidebar on mobile/tablet
    if (window.innerWidth <= 992) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.remove('mobile-open');
            if (window.innerWidth > 576) {
                sidebar.classList.add('collapsed'); // Default to collapsed on tablet
            } else {
                sidebar.classList.remove('collapsed'); // Ensure it expands fully on mobile
            }
        }
        // Force sync button state
        const toggleBtn = document.getElementById('toggleSidebar');
        if (toggleBtn) {
            toggleBtn.classList.remove('open');
            const icon = toggleBtn.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-arrow-left');
                icon.classList.add('fa-arrow-right'); // Assuming it points right when closed
            }
        }
    }

    const container = document.querySelector('.content-body');

    if (id === 'dashboard' || id === 'home') {
        renderDashboardHome();
    } else if (id === 'school') {
        institutionCurrentTab = 'school';
        renderInstitutionModule();
    } else if (id === 'settings') {
        settingsCurrentTab = 'users';
        renderSettingsModule();
    } else if (id === 'enrollments') {
        renderEnrollmentsModule();
    } else if (id === 'caja') {
        if (typeof renderCajaModule === 'function') {
            renderCajaModule();
        } else {
            console.error('renderCajaModule is not defined. Ensure caja.js is loaded.');
        }
    } else if (id === 'reporte_cajas') {
        if (typeof renderReporteCajasModule === 'function') {
            renderReporteCajasModule();
        } else {
            console.error('renderReporteCajasModule is not defined.');
        }
    } else if (id === 'academic_records') {
        if (typeof renderAcademicRecordsModule === 'function') {
            renderAcademicRecordsModule();
        } else {
            console.error('renderAcademicRecordsModule is not defined.');
        }
    } else {
        // Módulo en construcción
        container.innerHTML = `
            <div class="container-fluid px-0 animate__animated animate__fadeIn">
                <div class="welcome-banner" style="background-color: var(--secondary-color);">
                    <div class="banner-text">
                        <h2 class="mb-2"><i class="fas fa-tools me-2"></i> Módulo: ${id.charAt(0).toUpperCase() + id.slice(1)}</h2>
                        <p>Esta sección está actualmente en construcción o no tiene una vista definida.</p>
                    </div>
                </div>
            </div>
        `;
    }
}

function renderDashboardHome() {
    const container = document.querySelector('.content-body');
    if (!container) return;
    container.innerHTML = originalDashboardContent;
    
    // Update welcome banner text since original html is re-injected
    const userName = localStorage.getItem('userName') || 'Usuario';
    const welcomeEl = document.getElementById('welcomeText');
    if (welcomeEl) welcomeEl.innerText = `Bienvenido/a, ${userName} !`;
    
    const role = localStorage.getItem('role') || 'administrador';
    renderWidgets(role);
}

// ========================
// SCHOOL CONFIGURATION (Moved to institution.js)
// ========================

// ── Global Pagination Utility ────────────────────────────────────────────────
function renderTablePagination(containerId, totalItems, itemsPerPage, currentPage, onPageChangeName) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = `
        <nav>
            <ul class="pagination justify-content-center">
                <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                    <a class="page-link rounded-start-pill px-3" href="javascript:void(0)" onclick="${onPageChangeName}(${currentPage - 1})">
                        <i class="fas fa-chevron-left"></i>
                    </a>
                </li>`;

    for (let i = 1; i <= totalPages; i++) {
        html += `
            <li class="page-item ${currentPage === i ? 'active' : ''}">
                <a class="page-link ${currentPage === i ? 'rounded-circle' : 'text-muted'}" href="javascript:void(0)" onclick="${onPageChangeName}(${i})">${i}</a>
            </li>`;
    }

    html += `
                <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                    <a class="page-link rounded-end-pill px-3" href="javascript:void(0)" onclick="${onPageChangeName}(${currentPage + 1})">
                        <i class="fas fa-chevron-right"></i>
                    </a>
                </li>
            </ul>
        </nav>`;
    
    container.innerHTML = html;
}







function logout(event) {
    if (event) event.preventDefault();
    
    Swal.fire({
        allowOutsideClick: false,
        title: '¿Cerrar sesión?',
        text: "Volverás a la pantalla de acceso",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#2fbf71',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sí, salir',
        cancelButtonText: 'Cancelar',
        customClass: { popup: 'rounded-4 border-0 shadow-lg' }
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.clear();
            window.location.href = '/';
        }
    });
}

// ========================
// PROFILE MANAGEMENT
// ========================

async function openProfileModal(event) {
    if (event) event.preventDefault();
    const token = localStorage.getItem('token');

    try {
        const res = await fetch('/api/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.success) {
            document.getElementById('prof_name').value = data.user.name || '';
            document.getElementById('prof_email').value = data.user.email || '';
            document.getElementById('prof_role').value = data.user.role || '';
            document.getElementById('prof_username').value = data.user.username || '';
            document.getElementById('prof_password').value = data.user.password || '';
            document.getElementById('prof_phone').value = data.user.phone || '';
            document.getElementById('prof_birthdate').value = data.user.birthdate || '';
            document.getElementById('prof_address').value = data.user.address || '';
            
            // Set image preview
            const preview = document.getElementById('prof_avatar_preview');
            const fileInput = document.getElementById('prof_avatar');
            fileInput.value = ''; // clear previous selection
            preview.src = (data.user.avatar && data.user.avatar !== 'null') ? data.user.avatar : `https://ui-avatars.com/api/?name=${encodeURIComponent(data.user.name)}&background=3b82f6&color=fff&rounded=true`;
            
            const profileModal = new bootstrap.Modal(document.getElementById('profileModal'), { backdrop: 'static', keyboard: false });
            profileModal.show();
        } else {
            Swal.fire({
        allowOutsideClick: false,
                toast: true, position: 'top-end', icon: 'error',
                title: 'Error', text: 'No se pudo cargar el perfil',
                showConfirmButton: false, timer: 3000
            });
        }
    } catch (error) {
        console.error("Error al cargar perfil", error);
    }
}

function togglePassword() {
    const pwdInput = document.getElementById('prof_password');
    const icon = pwdInput.nextElementSibling.querySelector('i');
    if (pwdInput.type === 'password') {
        pwdInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        pwdInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

function previewAvatar(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('prof_avatar_preview').src = e.target.result;
        }
        reader.readAsDataURL(file);
    }
}

async function saveProfile() {
    const form = document.getElementById('profileForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const formData = new FormData();
    formData.append('name', document.getElementById('prof_name').value);
    formData.append('email', document.getElementById('prof_email').value);
    formData.append('username', document.getElementById('prof_username').value);
    formData.append('password', document.getElementById('prof_password').value);
    formData.append('phone', document.getElementById('prof_phone').value);
    formData.append('birthdate', document.getElementById('prof_birthdate').value);
    formData.append('address', document.getElementById('prof_address').value);

    const fileInput = document.getElementById('prof_avatar');
    if (fileInput.files[0]) {
        formData.append('avatarFile', fileInput.files[0]);
    }

    const token = localStorage.getItem('token');

    try {
        const res = await fetch('/api/profile', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        const data = await res.json();
        
        if (data.success) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('profileModal'));
            modal.hide();

            if (data.requiresReauth) {
                Swal.fire({
        allowOutsideClick: false,
                    icon: 'warning',
                    title: 'Credenciales Actualizadas',
                    text: 'Debes iniciar sesión nuevamente con tus nuevos datos.',
                    confirmButtonColor: '#2fbf71',
                    customClass: { popup: 'rounded-4' }
                }).then(() => {
                    localStorage.clear();
                    window.location.href = '/';
                });
            } else {
                // Actualizar info en UI
                const newName = document.getElementById('prof_name').value;
                localStorage.setItem('userName', newName);
                document.querySelectorAll('.displayUserNameText').forEach(el => el.innerText = newName);
                
                if (data.avatar) {
                    localStorage.setItem('userAvatar', data.avatar);
                    document.querySelectorAll('.userAvatarImg').forEach(img => img.src = data.avatar + '?t=' + new Date().getTime());
                }
                
                Swal.fire({
        allowOutsideClick: false,
                    toast: true, position: 'top-end', icon: 'success',
                    title: 'Perfil actualizado',
                    showConfirmButton: false, timer: 2000,
                    background: '#ffffff', color: '#0f172a',
                    iconColor: '#2fbf71'
                });
            }
        } else {
            Swal.fire({
        allowOutsideClick: false,
                toast: true, position: 'top-end', icon: 'error',
                title: 'Error', text: data.message || 'No se guardaron los cambios',
                showConfirmButton: false, timer: 3000,
                background: '#ffffff', color: '#0f172a',
                iconColor: '#ef4444'
            });
        }
    } catch (error) {
        console.error("Error saving profile", error);
    }
}

// ── Global Print Utility ───────────────────────────────────────────────────────

window.printGlobalElement = async function(elementId, title = 'Impresión') {
    const el = document.getElementById(elementId);
    if (!el) return;

    // Sincronizar inputs interactivos antes de clonar (para que retengan su valor)
    const inputs = el.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        if (input.type === 'checkbox' || input.type === 'radio') {
            if (input.checked) input.setAttribute('checked', 'checked');
            else input.removeAttribute('checked');
        } else if (input.tagName === 'SELECT') {
            const options = input.querySelectorAll('option');
            options.forEach(opt => {
                if (opt.value === input.value) opt.setAttribute('selected', 'selected');
                else opt.removeAttribute('selected');
            });
        } else {
            input.setAttribute('value', input.value);
        }
    });

    // Preparar contenedor de clonación seguro
    let printContainer = document.getElementById('global-print-container');
    if (!printContainer) {
        printContainer = document.createElement('div');
        printContainer.id = 'global-print-container';
        document.body.appendChild(printContainer);
    }
    
    // Limpiar vieja impresión y agregar el clon exacto del momento actual
    printContainer.innerHTML = '';
    const clone = el.cloneNode(true);
    printContainer.appendChild(clone);

    // Cambiar dinámicamente el título de la página (para el PDF/Impresora)
    const oldTitle = document.title;
    document.title = title;

    // Pausar ligeramente para que las imágenes o re-renders se apliquen
    await new Promise(resolve => setTimeout(resolve, 200));

    // Ejecutar impresión
    window.print();

    // Restaurar título original
    document.title = oldTitle;
};
