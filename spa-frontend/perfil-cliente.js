document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role !== 'cliente') {
            window.location.href = payload.role === 'admin' ? 'admin.html' : 'panel-empleado.html';
            return;
        }

        // Obtener datos del cliente
        const response = await fetch(`http://localhost:3000/api/clientes/${payload.id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Error al obtener datos');

        const cliente = await response.json();
        
        // Mostrar datos
        document.getElementById('client-data').innerHTML = `
            <div class="form-group">
                <label>Nombre:</label>
                <p>${cliente.nombre}</p>
            </div>
            <div class="form-group">
                <label>Apellido:</label>
                <p>${cliente.apellido}</p>
            </div>
            <div class="form-group">
                <label>Email:</label>
                <p>${cliente.email}</p>
            </div>
            <div class="form-group">
                <label>Teléfono:</label>
                <p>${cliente.telefono}</p>
            </div>
        `;

        // Logout
        document.getElementById('logout-button').addEventListener('click', () => {
            localStorage.removeItem('token');
            window.location.href = 'index.html';
        });

    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar los datos');
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    }
});