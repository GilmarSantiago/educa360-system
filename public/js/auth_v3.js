document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('role', data.role);
            localStorage.setItem('userName', data.name);
            localStorage.setItem('userAvatar', data.avatar || '');
            localStorage.setItem('userModules', JSON.stringify(data.modules));
            localStorage.setItem('canGenerateTokens', data.canGenerateTokens || false);

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: `¡Bienvenido/a, ${data.name}!`,
                showConfirmButton: false,
                timer: 1500,
                background: '#ffffff',
                color: '#0f172a'
            }).then(() => {
                // Ir a la ruta del primer módulo
                const firstModule = data.modules.length > 0 ? data.modules[0].id : 'dashboard';
                window.location.href = '/' + firstModule;
            });
        } else {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'error',
                title: 'Error de acceso',
                text: data.message,
                showConfirmButton: false,
                timer: 3000,
                background: '#ffffff',
                color: '#0f172a'
            });
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'error',
            title: 'Error del servidor',
            text: 'No se pudo conectar con el servidor.',
            showConfirmButton: false,
            timer: 3000,
            background: '#ffffff',
            color: '#0f172a'
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('expired')) {
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'warning',
            title: 'Sesión Expirada',
            text: 'Tu sesión ha expirado por seguridad. Por favor, inicia sesión nuevamente.',
            showConfirmButton: false,
            timer: 5000,
            background: '#ffffff',
            color: '#0f172a'
        });
        
        // Remove the parameter from URL to prevent showing it again on refresh
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
    }
});
