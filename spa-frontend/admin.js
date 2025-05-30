document.addEventListener("DOMContentLoaded", () => {
    // Configuración base
    const API_BASE_URL = 'http://localhost:3000/api';
    const API_ADMIN_BASE_URL = `${API_BASE_URL}/admin`;
    const token = localStorage.getItem("token");

    // Verificación de token y rol
    if (!token) {
        alert("No tienes permiso para acceder a esta página.");
        window.location.href = "login.html";
        return;
    }

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (!payload || payload.role !== 'admin') {
            throw new Error("Acceso no autorizado");
        }
    } catch (error) {
        alert("Error de autenticación: " + error.message);
        window.location.href = "login.html";
        return;
    }

    // ==================== FUNCIONES AUXILIARES ====================
    const toggleVisibility = (element, show) => {
        element.classList.toggle("hidden", !show);
    };

    const resetForm = (form) => {
        form.reset();
        form.dataset.action = "";
        form.dataset.id = "";
    };

    const showAlert = (message, isError = false) => {
        alert(`${isError ? 'Error: ' : ''}${message}`);
    };

    const handleFetchError = async (response) => {
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error || errorData.message || `Error ${response.status}: ${response.statusText}`;
            throw new Error(errorMessage);
        }
        return response.json();
    };

    // Función genérica para manejar formularios
    const setupForm = (form, endpoint, successCallback) => {
        const handler = async (e) => {
            e.preventDefault();
            const submitButton = e.target.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            
            try {
                const formData = Object.fromEntries(new FormData(e.target));
                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify(formData)
                });
                
                const result = await handleFetchError(response);
                showAlert(result.message || "Operación exitosa");
                if (successCallback) successCallback();
            } catch (error) {
                showAlert("Error: " + error.message, true);
                console.error(error);
            } finally {
                submitButton.disabled = false;
            }
        };
        
        // Eliminar cualquier listener previo y agregar el nuevo
        form.removeEventListener("submit", handler);
        form.addEventListener("submit", handler);
    };

    // ==================== GESTIÓN DE SERVICIOS ====================
    const serviceFormContainer = document.getElementById("service-form-container");
    const serviceForm = document.getElementById("service-form");
    const formTitle = document.getElementById("service-form-title");

    document.getElementById("add-service").addEventListener("click", () => {
        formTitle.textContent = "Añadir Servicio";
        serviceForm.dataset.action = "add";
        resetForm(serviceForm);
        toggleVisibility(serviceFormContainer, true);
    });

    document.getElementById("edit-service").addEventListener("click", async () => {
        const serviceId = prompt("Ingrese el ID del servicio que desea editar:");
        if (!serviceId || isNaN(serviceId)) return;

        try {
            const response = await fetch(`${API_BASE_URL}/servicios/${serviceId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const serviceData = await handleFetchError(response);
            
            formTitle.textContent = "Editar Servicio";
            serviceForm.dataset.action = "edit";
            serviceForm.dataset.serviceId = serviceId;
            document.getElementById("nombre").value = serviceData.nombre;
            document.getElementById("descripcion").value = serviceData.descripcion || "";
            document.getElementById("duracion").value = serviceData.duracion;
            document.getElementById("precio").value = serviceData.precio;
            document.getElementById("categoria").value = serviceData.categoria;
            toggleVisibility(serviceFormContainer, true);
        } catch (error) {
            showAlert("Error al obtener servicio: " + error.message, true);
            console.error(error);
        }
    });

    // Configurar el formulario de servicios
    setupForm(serviceForm, `${API_BASE_URL}/servicios`, () => {
        toggleVisibility(serviceFormContainer, false);
    });

    document.getElementById("delete-service").addEventListener("click", async () => {
        const serviceId = prompt("Ingrese el ID del servicio a eliminar:");
        if (!serviceId || isNaN(serviceId)) return;

        if (confirm(`¿Eliminar servicio ID ${serviceId}?`)) {
            try {
                const response = await fetch(`${API_BASE_URL}/servicios/${serviceId}`, {
                    method: "DELETE",
                    headers: { "Authorization": `Bearer ${token}` }
                });
                const result = await handleFetchError(response);
                showAlert(result.message || "Servicio eliminado exitosamente");
            } catch (error) {
                showAlert("Error al eliminar: " + error.message, true);
                console.error(error);
            }
        }
    });

    document.getElementById("cancel-service")?.addEventListener("click", () => {
        toggleVisibility(serviceFormContainer, false);
    });

    // ==================== GESTIÓN DE COMBOS ====================
    const comboFormContainer = document.getElementById("combo-form-container");
    const comboForm = document.getElementById("combo-form");
    const comboFormTitle = document.getElementById("combo-form-title");

    document.getElementById("add-combo").addEventListener("click", () => {
        comboFormTitle.textContent = "Añadir Combo";
        comboForm.dataset.action = "add";
        resetForm(comboForm);
        toggleVisibility(comboFormContainer, true);
    });

    document.getElementById("edit-combo").addEventListener("click", async () => {
        const comboId = prompt("Ingrese el ID del combo que desea editar:");
        if (!comboId || isNaN(comboId)) return;

        try {
            const response = await fetch(`${API_BASE_URL}/combos/${comboId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const comboData = await handleFetchError(response);
            
            comboFormTitle.textContent = "Editar Combo";
            comboForm.dataset.action = "edit";
            comboForm.dataset.comboId = comboId;
            document.getElementById("combo-nombre").value = comboData.nombre;
            document.getElementById("combo-descripcion").value = comboData.descripcion || "";
            document.getElementById("combo-precio").value = comboData.precio_total;
            document.getElementById("combo-servicios").value = comboData.servicios.map(s => s.id_servicio).join(", ");
            toggleVisibility(comboFormContainer, true);
        } catch (error) {
            showAlert("Error al obtener combo: " + error.message, true);
            console.error(error);
        }
    });

    // Configurar el formulario de combos
    setupForm(comboForm, `${API_BASE_URL}/combos`, () => {
        toggleVisibility(comboFormContainer, false);
    });

    document.getElementById("delete-combo")?.addEventListener("click", async () => {
        const comboId = prompt("Ingrese el ID del combo a eliminar:");
        if (!comboId || isNaN(comboId)) return;

        if (confirm(`¿Eliminar combo ID ${comboId}?`)) {
            try {
                const response = await fetch(`${API_BASE_URL}/combos/${comboId}`, {
                    method: "DELETE",
                    headers: { "Authorization": `Bearer ${token}` }
                });
                const result = await handleFetchError(response);
                showAlert(result.message || "Combo eliminado exitosamente");
            } catch (error) {
                showAlert("Error al eliminar combo: " + error.message, true);
                console.error(error);
            }
        }
    });

    document.getElementById("cancel-combo")?.addEventListener("click", () => {
        toggleVisibility(comboFormContainer, false);
    });

    // ==================== GESTIÓN DE ADMINISTRADORES ====================
    const adminFormContainer = document.getElementById("admin-form-container");
    const adminForm = document.getElementById("admin-form");
    const adminsListContainer = document.getElementById("admins-list-container");
    const adminsTable = document.getElementById("admins-table").querySelector("tbody");
    const addAdminBtn = document.getElementById("add-admin");
    const viewAdminsBtn = document.getElementById("view-admins");

    // Toggle para añadir administrador
    addAdminBtn.addEventListener("click", () => {
        const isFormVisible = !adminFormContainer.classList.contains("hidden");
        if (isFormVisible) {
            toggleVisibility(adminFormContainer, false);
        } else {
            resetForm(adminForm);
            toggleVisibility(adminFormContainer, true);
            toggleVisibility(adminsListContainer, false);
        }
    });

    // Configurar el formulario de administradores
    setupForm(adminForm, `${API_ADMIN_BASE_URL}/administradores`, () => {
        toggleVisibility(adminFormContainer, false);
        viewAdminsBtn.click();
    });

    // Toggle para ver administradores
    viewAdminsBtn.addEventListener("click", async () => {
        const isListVisible = !adminsListContainer.classList.contains("hidden");
        if (isListVisible) {
            toggleVisibility(adminsListContainer, false);
        } else {
            try {
                const response = await fetch(`${API_ADMIN_BASE_URL}/administradores`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                
                const admins = await handleFetchError(response);
                renderAdminsTable(admins);
                toggleVisibility(adminFormContainer, false);
                toggleVisibility(adminsListContainer, true);
            } catch (error) {
                showAlert("Error al obtener administradores: " + error.message, true);
                console.error(error);
            }
        }
    });

    document.getElementById("cancel-admin")?.addEventListener("click", () => {
        toggleVisibility(adminFormContainer, false);
    });

    document.getElementById("close-admins-list")?.addEventListener("click", () => {
        toggleVisibility(adminsListContainer, false);
    });

    function renderAdminsTable(admins) {
        adminsTable.innerHTML = "";
        admins.forEach(admin => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${admin.id_admin}</td>
                <td>${admin.nombre} ${admin.apellido}</td>
                <td>${admin.email}</td>
                <td>${admin.telefono || 'N/A'}</td>
                <td>
                    <button class="btn-delete" data-id="${admin.id_admin}">Eliminar</button>
                </td>
            `;
            adminsTable.appendChild(row);
        });

        // Manejar eliminación
        document.querySelectorAll(".btn-delete").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                const id = e.target.dataset.id;
                if (confirm(`¿Eliminar administrador con ID ${id}?`)) {
                    try {
                        const response = await fetch(`${API_ADMIN_BASE_URL}/administradores/${id}`, {
                            method: "DELETE",
                            headers: { "Authorization": `Bearer ${token}` }
                        });
                        
                        const result = await handleFetchError(response);
                        showAlert(result.message || "Administrador eliminado exitosamente");
                        viewAdminsBtn.click();
                    } catch (error) {
                        showAlert("Error al eliminar administrador: " + error.message, true);
                        console.error(error);
                    }
                }
            });
        });
    }

    // ==================== GESTIÓN DE EMPLEADOS ====================
    const employeeFormContainer = document.getElementById("employee-form-container");
    const employeeForm = document.getElementById("employee-form");
    const employeesListContainer = document.getElementById("employees-list-container");
    const employeesTable = document.getElementById("employees-table").querySelector("tbody");
    const addEmployeeBtn = document.getElementById("add-employee");
    const viewEmployeesBtn = document.getElementById("view-employees");

    // Toggle para añadir empleado
    addEmployeeBtn.addEventListener("click", () => {
        const isFormVisible = !employeeFormContainer.classList.contains("hidden");
        if (isFormVisible) {
            toggleVisibility(employeeFormContainer, false);
        } else {
            resetForm(employeeForm);
            toggleVisibility(employeeFormContainer, true);
            toggleVisibility(employeesListContainer, false);
        }
    });

    // Configurar el formulario de empleados
    setupForm(employeeForm, `${API_ADMIN_BASE_URL}/empleados`, () => {
        toggleVisibility(employeeFormContainer, false);
        viewEmployeesBtn.click();
    });

    // Toggle para ver empleados
    viewEmployeesBtn.addEventListener("click", async () => {
        const isListVisible = !employeesListContainer.classList.contains("hidden");
        if (isListVisible) {
            toggleVisibility(employeesListContainer, false);
        } else {
            try {
                const response = await fetch(`${API_ADMIN_BASE_URL}/empleados`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                
                const empleados = await handleFetchError(response);
                renderEmployeesTable(empleados);
                toggleVisibility(employeeFormContainer, false);
                toggleVisibility(employeesListContainer, true);
            } catch (error) {
                showAlert("Error al obtener empleados: " + error.message, true);
                console.error(error);
            }
        }
    });

    document.getElementById("cancel-employee")?.addEventListener("click", () => {
        toggleVisibility(employeeFormContainer, false);
    });

    document.getElementById("close-employees-list")?.addEventListener("click", () => {
        toggleVisibility(employeesListContainer, false);
    });

    function renderEmployeesTable(empleados) {
        employeesTable.innerHTML = "";
        empleados.forEach(empleado => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${empleado.id_empleado}</td>
                <td>${empleado.nombre} ${empleado.apellido}</td>
                <td>${empleado.email}</td>
                <td>${empleado.puesto}</td>
                <td>
                    <button class="btn-delete" data-id="${empleado.id_empleado}">Eliminar</button>
                </td>
            `;
            employeesTable.appendChild(row);
        });

        // Manejar eliminación
        document.querySelectorAll(".btn-delete").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                const id = e.target.dataset.id;
                if (confirm(`¿Eliminar empleado con ID ${id}?`)) {
                    try {
                        const response = await fetch(`${API_ADMIN_BASE_URL}/empleados/${id}`, {
                            method: "DELETE",
                            headers: { "Authorization": `Bearer ${token}` }
                        });
                        
                        const result = await handleFetchError(response);
                        showAlert(result.message || "Empleado eliminado exitosamente");
                        viewEmployeesBtn.click();
                    } catch (error) {
                        showAlert("Error al eliminar empleado: " + error.message, true);
                        console.error(error);
                    }
                }
            });
        });
    }

    // Cerrar sesión
    document.getElementById("logout-button").addEventListener("click", () => {
        if (confirm("¿Está seguro que desea cerrar sesión?")) {
            localStorage.removeItem("token");
            window.location.href = "index.html";
        }
    });
});