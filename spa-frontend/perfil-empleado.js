document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        // Verificar rol
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role !== 'empleado') {
            throw new Error('Acceso no autorizado');
        }

        // Cargar información del empleado
        const response = await fetch('http://localhost:3000/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Error al cargar información del empleado');
        }

        const employee = await response.json();
        
        // Mostrar información personal
        renderEmployeeInfo(employee);

        // Configurar formulario de cambio de contraseña
        setupPasswordChangeForm(employee);

    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
        if (error.message === 'Acceso no autorizado') {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
        }
    }
});

function renderEmployeeInfo(employee) {
    const employeeInfo = document.getElementById('employee-info');
    employeeInfo.innerHTML = `
        <p><strong>Nombre:</strong> ${employee.nombre} ${employee.apellido}</p>
        <p><strong>Email:</strong> ${employee.email}</p>
        <p><strong>Teléfono:</strong> ${employee.telefono || 'No especificado'}</p>
        <p><strong>Puesto:</strong> ${employee.puesto}</p>
        ${employee.temp_password ? 
            '<div class="alert alert-warning">Estás usando una contraseña temporal</div>' : 
            ''}
    `;
}

function setupPasswordChangeForm(employee) {
    const showFormBtn = document.getElementById('show-password-form');
    const formContainer = document.getElementById('password-change-form');
    const form = document.getElementById('change-password-form');

    showFormBtn.addEventListener('click', () => {
        formContainer.classList.toggle('hidden');
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        // Validaciones
        if (newPassword !== confirmPassword) {
            alert('Las nuevas contraseñas no coinciden');
            return;
        }

        if (newPassword.length < 6) {
            alert('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:3000/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    currentPassword: employee.temp_password ? '' : currentPassword,
                    newPassword 
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Error al cambiar contraseña');
            }
            
            alert('Contraseña cambiada exitosamente');
            form.reset();
            formContainer.classList.add('hidden');
            window.location.reload(); // Para actualizar el estado de temp_password
        } catch (error) {
            console.error('Error:', error);
            alert(error.message);
        }
    });
}