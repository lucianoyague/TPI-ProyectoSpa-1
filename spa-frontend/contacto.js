document.addEventListener("DOMContentLoaded", async () => {
    // Verificar autenticación
    const token = localStorage.getItem("token");
    if (!token) {
        showToastError("Debes iniciar sesión para reservar un turno");
        setTimeout(() => {
            window.location.href = "login.html";
        }, 2000);
        return;
    }

    try {
        // Decodificar token para obtener el ID y rol
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role !== 'cliente') {
            showToastError("Solo los clientes pueden reservar turnos");
            setTimeout(() => {
                window.location.href = "index.html";
            }, 2000);
            return;
        }

        // Obtener datos básicos del cliente
        const clienteResponse = await fetch(`http://localhost:3000/api/clientes/${payload.id}`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!clienteResponse.ok) {
            throw new Error("Error al obtener datos del cliente");
        }

        const cliente = await clienteResponse.json();

        // Configuración de métodos de pago
        const metodoPagoRadios = document.querySelectorAll("input[name='metodo-pago']");
        const efectivoInfo = document.getElementById("efectivo-info");
        const transferenciaInfo = document.getElementById("transferencia-info");

        metodoPagoRadios.forEach(radio => {
            radio.addEventListener("change", () => {
                efectivoInfo.style.display = radio.value === "efectivo" ? "block" : "none";
                transferenciaInfo.style.display = radio.value === "transferencia" ? "block" : "none";
            });
        });

        // Obtener datos de la URL
        const urlParams = new URLSearchParams(window.location.search);
        const fecha = urlParams.get("fecha");
        const hora = urlParams.get("hora");
        const servicios = JSON.parse(urlParams.get("servicios") || "[]").map(Number);
        const duracionTotal = parseInt(urlParams.get("duracionTotal")) || 0;
        const precioTotal = parseFloat(urlParams.get("precioTotal")) || 0;

        // Validar datos de reserva
        if (!fecha || !hora || servicios.length === 0) {
            showToastError("Datos de reserva incompletos");
            setTimeout(() => {
                window.location.href = "servicios.html";
            }, 2000);
            return;
        }

        // Mostrar resumen
        document.getElementById("resumen-fecha").textContent = fecha;
        document.getElementById("resumen-hora").textContent = hora;
        document.getElementById("resumen-duracion").textContent = duracionTotal;
        document.getElementById("resumen-precio").textContent = precioTotal.toFixed(2);

        const resumenServicios = document.getElementById("resumen-servicios");
        resumenServicios.innerHTML = "";

        // Obtener nombres de servicios
        const serviciosResponse = await fetch("http://localhost:3000/api/servicios");
        if (!serviciosResponse.ok) {
            throw new Error("Error al obtener servicios");
        }
        const todosServicios = await serviciosResponse.json();

        servicios.forEach(servicioId => {
            const servicio = todosServicios.find(s => s.id_servicio === servicioId);
            const li = document.createElement("li");
            li.textContent = servicio ? servicio.nombre : `Servicio ID: ${servicioId}`;
            li.setAttribute("data-id", servicioId);
            resumenServicios.appendChild(li);
        });

        // Rellenar datos del cliente
        document.getElementById("nombre").value = cliente.nombre;
        document.getElementById("apellido").value = cliente.apellido;
        document.getElementById("correo").value = cliente.email;
        document.getElementById("confirmar-correo").value = cliente.email;
        document.getElementById("telefono").value = cliente.telefono || "";
    } catch (error) {
        console.error("Error:", error);
        showToastError(error.message || "Ocurrió un error al cargar la página");
    }

    // Enviar formulario
    const contactoForm = document.getElementById("contacto-form");
    contactoForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        try {
            // Obtener datos de la URL nuevamente para asegurarnos de tener los más recientes
            const urlParams = new URLSearchParams(window.location.search);
            const fecha = urlParams.get("fecha");
            const hora = urlParams.get("hora");
            const servicios = JSON.parse(urlParams.get("servicios") || "[]").map(Number);
            const duracionTotal = parseInt(urlParams.get("duracionTotal")) || 0;
            const precioTotal = parseFloat(urlParams.get("precioTotal")) || 0;

            const formData = new FormData(contactoForm);
            const token = localStorage.getItem("token");
            const payload = JSON.parse(atob(token.split('.')[1]));

            const datosCompletos = {
                cliente: {
                    id_cliente: payload.id,
                    telefono: formData.get("telefono"),
                    nacionalidad: formData.get("nacionalidad"),
                    dni: formData.get("dni"),
                    comentario: formData.get("comentario") || null
                },
                turno: {
                    fecha,
                    hora,
                    servicios,
                    duracionTotal,
                    precioTotal,
                    metodoPago: formData.get("metodo-pago"),
                    estado: 'pendiente'
                }
            };

            console.log("Enviando datos:", datosCompletos); // Para depuración
            
            const response = await fetch("http://localhost:3000/api/turnos/reservas", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(datosCompletos)
            });

            const responseData = await response.json();
            
            if (!response.ok) {
                throw new Error(responseData.error || 'Error desconocido');
            }

            showToastError("Reserva confirmada. Recibirás un correo con los detalles.");
            setTimeout(() => {
                window.location.href = "perfil-cliente.html";
            }, 2000);
        } catch (error) {
            console.error("Error al enviar los datos:", error);
            showToastError(error.message || "Ocurrió un error al confirmar la reserva. Por favor, inténtalo nuevamente.");
        }
    });
});

function showToastError(message) {
    const toast = document.getElementById("toast-error");
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => {
        toast.classList.remove("show");
    }, 3500);
}