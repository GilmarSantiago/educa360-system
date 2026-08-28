let academicRecordsCurrentTab = 'students';

function renderAcademicRecordsModule() {
    const container = document.querySelector('.content-body');
    if (!container) return;

    container.innerHTML = `
        <div class="container-fluid px-0 animate__animated animate__fadeIn">
            <div class="d-flex justify-content-between align-items-center mb-4 px-4 pt-4">
                <h4 class="mb-0 fw-bold"><i class="fas fa-address-book text-primary me-2"></i> Directorio Académico</h4>
            </div>

            <div class="px-4">
                <div class="card border-0 shadow-sm rounded-4">
                    <div class="card-header bg-white border-bottom-0 p-3 pb-0">
                        <div class="global-tab-nav" id="academicRecordsTabs">
                            <button class="global-tab-btn active" id="tab-ar-students" onclick="switchARTab('students')">
                                <i class="fas fa-user-graduate me-2"></i>Alumnos
                            </button>
                            <button class="global-tab-btn" id="tab-ar-parents" onclick="switchARTab('parents')">
                                <i class="fas fa-users me-2"></i>Apoderados
                            </button>
                            <button class="global-tab-btn" id="tab-ar-teachers" onclick="switchARTab('teachers')">
                                <i class="fas fa-chalkboard-teacher me-2"></i>Maestros
                            </button>
                            <button class="global-tab-btn" id="tab-ar-courses" onclick="switchARTab('courses')">
                                <i class="fas fa-book me-2"></i>Cursos
                            </button>
                        </div>
                    </div>
                    <div class="card-body p-4" id="academicRecordsContent">
                        <!-- Dynamic Content Here -->
                        <div class="text-center py-5 text-muted">
                            <i class="fas fa-circle-notch fa-spin fa-2x mb-3"></i>
                            <p>Cargando información...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;


    switchARTab(academicRecordsCurrentTab);
}

function switchARTab(tab) {
    academicRecordsCurrentTab = tab;
    document.querySelectorAll('#academicRecordsTabs .global-tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-ar-${tab}`).classList.add('active');

    const content = document.getElementById('academicRecordsContent');
    content.innerHTML = `
        <div class="text-center py-5 text-muted">
            <i class="fas fa-circle-notch fa-spin fa-2x mb-3"></i>
            <p>Cargando...</p>
        </div>
    `;

    switch (tab) {
        case 'students': loadARStudents(); break;
        case 'parents': loadARParents(); break;
        case 'teachers': loadARTeachers(); break;
        case 'courses': loadARCourses(); break;
    }
}

async function fetchAR(url) {
    const token = localStorage.getItem('token');
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
    return await res.json();
}

async function loadARStudents() {
    try {
        const data = await fetchAR('/api/students');
        const content = document.getElementById('academicRecordsContent');
        if (!data.success) {
            content.innerHTML = `<div class="alert alert-danger">${data.message}</div>`;
            return;
        }

        let html = `
            <div class="global-table-container table-responsive">
                <table class="global-table">
                    <thead class="bg-light">
                        <tr>
                            <th class="border-0 rounded-start">Documento</th>
                            <th class="border-0">Nombre del Alumno</th>
                            <th class="border-0">Nacimiento</th>
                            <th class="border-0 rounded-end text-center">Estado</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        if (!data.students || data.students.length === 0) {
            html += `<tr><td colspan="4" class="text-center py-4 text-muted">No hay alumnos registrados.</td></tr>`;
        } else {
            data.students.forEach(st => {
                html += `
                    <tr>
                        <td class="fw-bold text-muted">${st.document || '-'}</td>
                        <td class="fw-bold">${st.name}</td>
                        <td>${st.birthdate || '-'}</td>
                        <td class="text-center">
                            <span class="badge bg-success bg-opacity-10 text-success rounded-pill px-3">Registrado</span>
                        </td>
                    </tr>
                `;
            });
        }
        
        html += `</tbody></table></div>`;
        content.innerHTML = html;
    } catch (err) {
        document.getElementById('academicRecordsContent').innerHTML = `<div class="alert alert-danger">Error de conexión.</div>`;
    }
}

async function loadARParents() {
    try {
        const data = await fetchAR('/api/users');
        const content = document.getElementById('academicRecordsContent');
        if (!data.success) {
            content.innerHTML = `<div class="alert alert-danger">${data.message}</div>`;
            return;
        }

        const parents = (data.users || []).filter(u => u.role === 'apoderado');

        let html = `
            <div class="global-table-container table-responsive">
                <table class="global-table">
                    <thead class="bg-light">
                        <tr>
                            <th class="border-0 rounded-start">Usuario</th>
                            <th class="border-0">Nombre del Apoderado</th>
                            <th class="border-0">Contacto</th>
                            <th class="border-0 rounded-end">Dirección</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        if (parents.length === 0) {
            html += `<tr><td colspan="4" class="text-center py-4 text-muted">No hay apoderados registrados.</td></tr>`;
        } else {
            parents.forEach(p => {
                html += `
                    <tr>
                        <td class="fw-bold text-muted">${p.username}</td>
                        <td class="fw-bold d-flex align-items-center">
                            <div class="bg-light-primary text-primary rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 36px; height: 36px;">
                                <i class="fas fa-user"></i>
                            </div>
                            ${p.name}
                        </td>
                        <td>
                            <div class="small"><i class="fas fa-envelope text-muted me-1"></i> ${p.email || '-'}</div>
                            <div class="small"><i class="fas fa-phone text-muted me-1"></i> ${p.phone || '-'}</div>
                        </td>
                        <td class="small text-muted">${p.address || '-'}</td>
                    </tr>
                `;
            });
        }
        
        html += `</tbody></table></div>`;
        content.innerHTML = html;
    } catch (err) {
        document.getElementById('academicRecordsContent').innerHTML = `<div class="alert alert-danger">Error de conexión.</div>`;
    }
}

async function loadARTeachers() {
    try {
        const data = await fetchAR('/api/users');
        const content = document.getElementById('academicRecordsContent');
        if (!data.success) {
            content.innerHTML = `<div class="alert alert-danger">${data.message}</div>`;
            return;
        }

        const teachers = (data.users || []).filter(u => u.role === 'maestro');

        let html = `
            <div class="global-table-container table-responsive">
                <table class="global-table">
                    <thead class="bg-light">
                        <tr>
                            <th class="border-0 rounded-start">Usuario</th>
                            <th class="border-0">Nombre del Maestro</th>
                            <th class="border-0">Contacto</th>
                            <th class="border-0 rounded-end">Nacimiento</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        if (teachers.length === 0) {
            html += `<tr><td colspan="4" class="text-center py-4 text-muted">No hay maestros registrados.</td></tr>`;
        } else {
            teachers.forEach(t => {
                html += `
                    <tr>
                        <td class="fw-bold text-muted">${t.username}</td>
                        <td class="fw-bold d-flex align-items-center">
                            <div class="bg-light-info text-info rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 36px; height: 36px;">
                                <i class="fas fa-chalkboard-teacher"></i>
                            </div>
                            ${t.name}
                        </td>
                        <td>
                            <div class="small"><i class="fas fa-envelope text-muted me-1"></i> ${t.email || '-'}</div>
                            <div class="small"><i class="fas fa-phone text-muted me-1"></i> ${t.phone || '-'}</div>
                        </td>
                        <td class="small text-muted">${t.birthdate || '-'}</td>
                    </tr>
                `;
            });
        }
        
        html += `</tbody></table></div>`;
        content.innerHTML = html;
    } catch (err) {
        document.getElementById('academicRecordsContent').innerHTML = `<div class="alert alert-danger">Error de conexión.</div>`;
    }
}

async function loadARCourses() {
    try {
        const data = await fetchAR('/api/courses');
        const content = document.getElementById('academicRecordsContent');
        if (!data.success) {
            content.innerHTML = `<div class="alert alert-danger">${data.message}</div>`;
            return;
        }

        let html = `
            <div class="global-table-container table-responsive">
                <table class="global-table">
                    <thead class="bg-light">
                        <tr>
                            <th class="border-0 rounded-start">Código</th>
                            <th class="border-0">Nombre del Curso</th>
                            <th class="border-0 text-center">Horas Semanales</th>
                            <th class="border-0 rounded-end text-center">Estado</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        if (!data.courses || data.courses.length === 0) {
            html += `<tr><td colspan="4" class="text-center py-4 text-muted">No hay cursos registrados.</td></tr>`;
        } else {
            data.courses.forEach(c => {
                html += `
                    <tr>
                        <td class="fw-bold text-muted">${c.code || '-'}</td>
                        <td class="fw-bold d-flex align-items-center">
                            <div class="bg-light-warning text-warning rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 36px; height: 36px;">
                                <i class="fas fa-book"></i>
                            </div>
                            ${c.name}
                        </td>
                        <td class="text-center fw-bold text-primary">${c.hoursPerWeek || 0} hrs</td>
                        <td class="text-center">
                            <span class="badge bg-primary bg-opacity-10 text-primary rounded-pill px-3">Activo</span>
                        </td>
                    </tr>
                `;
            });
        }
        
        html += `</tbody></table></div>`;
        content.innerHTML = html;
    } catch (err) {
        document.getElementById('academicRecordsContent').innerHTML = `<div class="alert alert-danger">Error de conexión.</div>`;
    }
}
