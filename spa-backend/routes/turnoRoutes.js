const express = require('express');
const db = require('../db');
const router = express.Router();
const nodemailer = require('nodemailer');

// Configuración del transporter para nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail', // Puedes cambiarlo por tu servicio de correo (ej: 'outlook', 'yahoo', etc.)
    auth: {
        user: process.env.EMAIL_USER, // Usa variables de entorno para seguridad
        pass: process.env.EMAIL_PASS
    }
});

// Ruta para registrar un turno
router.post('/reservas', async (req, res) => {
    console.log('Datos recibidos:', req.body); // Para depuración
    
    try {
        const { cliente, turno } = req.body;

        // Validaciones básicas
        if (!cliente || !turno) {
            return res.status(400).json({ error: 'Datos incompletos: se requieren cliente y turno' });
        }

        if (!cliente.id_cliente) {
            return res.status(400).json({ error: 'ID de cliente no proporcionado' });
        }

        if (!turno.fecha || !turno.hora || !turno.servicios || turno.servicios.length === 0) {
            return res.status(400).json({ error: 'Datos del turno incompletos' });
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Verificar que el cliente existe y obtener sus datos
            const [clienteExistente] = await connection.query(
                'SELECT * FROM cliente WHERE id_cliente = ?',
                [cliente.id_cliente]
            );
            
            if (clienteExistente.length === 0) {
                throw new Error('Cliente no encontrado');
            }

            // 2. Actualizar datos del cliente si es necesario
            await connection.query(
                `UPDATE cliente SET 
                    telefono = ?, 
                    nacionalidad = ?, 
                    dni = ?, 
                    comentario = ?
                WHERE id_cliente = ?`,
                [
                    cliente.telefono,
                    cliente.nacionalidad,
                    cliente.dni,
                    cliente.comentario || null,
                    cliente.id_cliente
                ]
            );

            // 3. Crear el turno
            const [turnoResult] = await connection.query(
                `INSERT INTO turno 
                    (id_cliente, fecha, hora, duracion_total, precio_total, metodo_pago, estado) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    cliente.id_cliente,
                    turno.fecha,
                    turno.hora,
                    turno.duracionTotal,
                    turno.precioTotal,
                    turno.metodoPago,
                    'pendiente'
                ]
            );

            const turnoId = turnoResult.insertId;

            // 4. Asociar servicios al turno
            for (const servicioId of turno.servicios) {
                // Verificar que el servicio existe
                const [servicio] = await connection.query(
                    'SELECT nombre FROM servicio WHERE id_servicio = ?',
                    [servicioId]
                );
                
                if (servicio.length === 0) {
                    throw new Error(`Servicio con ID ${servicioId} no encontrado`);
                }

                await connection.query(
                    'INSERT INTO turno_servicio (id_turno, id_servicio) VALUES (?, ?)',
                    [turnoId, servicioId]
                );
            }

            await connection.commit();
            
            // 5. Enviar correo de confirmación al cliente
            try {
                // Obtener nombres de los servicios para el correo
                const [serviciosData] = await connection.query(
                    'SELECT s.nombre FROM turno_servicio ts JOIN servicio s ON ts.id_servicio = s.id_servicio WHERE ts.id_turno = ?',
                    [turnoId]
                );

                const nombresServicios = serviciosData.map(s => s.nombre).join(', ');

                const mailOptions = {
                    from: `"Sentirse Bien Spa" <${process.env.EMAIL_USER}>`,
                    to: clienteExistente[0].email,
                    subject: 'Confirmación de Reserva - Sentirse Bien',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h1 style="color: #4a6baf;">¡Reserva Confirmada!</h1>
                            <p>Hola ${clienteExistente[0].nombre},</p>
                            <p>Tu reserva ha sido confirmada con los siguientes detalles:</p>
                            
                            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
                                <h3 style="color: #4a6baf; margin-top: 0;">Detalles de la Reserva</h3>
                                <p><strong>Número de Reserva:</strong> #${turnoId}</p>
                                <p><strong>Fecha:</strong> ${turno.fecha}</p>
                                <p><strong>Hora:</strong> ${turno.hora}</p>
                                <p><strong>Servicios:</strong> ${nombresServicios}</p>
                                <p><strong>Duración total:</strong> ${turno.duracionTotal} minutos</p>
                                <p><strong>Precio total:</strong> $${parseFloat(turno.precioTotal).toFixed(2)}</p>
                                <p><strong>Método de pago:</strong> ${turno.metodoPago === 'efectivo' ? 'Efectivo (a pagar en el local)' : 'Transferencia bancaria'}</p>
                            </div>

                            <p style="font-size: 0.9em; color: #666;">
                                <strong>Nota:</strong> ${turno.metodoPago === 'transferencia' ? 
                                'Por favor envía el comprobante de transferencia a reservas@sentirsebien.com para completar tu reserva.' : 
                                'El pago se realizará al momento de tu visita.'}
                            </p>

                            <p>Gracias por elegir Sentirse Bien Spa. ¡Te esperamos!</p>
                            
                            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; font-size: 0.8em; color: #888;">
                                <p>Si tienes alguna pregunta, no dudes en contactarnos:</p>
                                <p>📞 Teléfono: +54 3624762542</p>
                                <p>📧 Email: reservas@sentirsebien.com</p>
                            </div>
                        </div>
                    `
                };

                await transporter.sendMail(mailOptions);
                console.log('Correo de confirmación enviado a:', clienteExistente[0].email);
            } catch (emailError) {
                console.error('Error al enviar correo:', emailError);
                // No fallar la operación principal por error en el correo
            }

            res.status(201).json({ 
                success: true,
                message: 'Reserva registrada exitosamente',
                turnoId
            });

        } catch (error) {
            await connection.rollback();
            console.error('Error en la transacción:', error);
            res.status(500).json({ 
                error: 'Error al procesar la reserva',
                details: error.message
            });
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Error general:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

module.exports = router;