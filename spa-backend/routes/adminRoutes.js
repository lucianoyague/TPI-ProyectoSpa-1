const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const verifyToken = require('../middleware/verifyToken');
const { sendInvitationCode } = require('../utils/mailer');
const router = express.Router();

const SECRET_KEY = process.env.SECRET_KEY || 'tu_clave_secreta';

// Middleware para verificar admin
const verifyAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acceso no autorizado' });
    }
    next();
};

// Crear nuevo administrador con contraseña temporal
router.post('/administradores', verifyToken, verifyAdmin, async (req, res) => {
    const { nombre, apellido, email, telefono } = req.body;

    try {
        // Verificar email único
        const [existing] = await db.query(
            `SELECT email FROM (
                SELECT email FROM administrador
                UNION SELECT email FROM empleado
                UNION SELECT email FROM cliente
            ) AS all_users WHERE email = ?`, 
            [email]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'El correo ya está registrado' });
        }

        // Generar contraseña temporal
        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        // Insertar administrador
        const [result] = await db.query(
            'INSERT INTO administrador (nombre, apellido, email, telefono, contraseña, temp_password) VALUES (?, ?, ?, ?, ?, TRUE)',
            [nombre, apellido, email, telefono, hashedPassword]
        );

        // Enviar correo con la contraseña temporal
        try {
            await sendInvitationCode(email, tempPassword);
            console.log(Correo con contraseña temporal enviado a ${email});
        } catch (emailError) {
            console.error('Error al enviar correo:', emailError);
            // Continuamos aunque falle el correo, pero registramos el error
        }

        res.status(201).json({ 
            success: true,
            message: 'Administrador creado exitosamente. La contraseña temporal ha sido enviada al correo electrónico.',
            tempPassword,
            adminId: result.insertId
        });

    } catch (err) {
        console.error('Error al crear administrador:', err);
        res.status(500).json({ error: 'Error al crear administrador' });
    }
});

// Crear nuevo empleado con contraseña temporal
router.post('/empleados', verifyToken, verifyAdmin, async (req, res) => {
    const { nombre, apellido, email, telefono, puesto } = req.body;

    try {
        // Verificar email único
        const [existing] = await db.query(
            `SELECT email FROM (
                SELECT email FROM administrador
                UNION SELECT email FROM empleado
                UNION SELECT email FROM cliente
            ) AS all_users WHERE email = ?`, 
            [email]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'El correo ya está registrado' });
        }

        // Generar contraseña temporal
        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        // Insertar empleado
        const [result] = await db.query(
            'INSERT INTO empleado (nombre, apellido, email, telefono, contraseña, puesto, temp_password) VALUES (?, ?, ?, ?, ?, ?, TRUE)',
            [nombre, apellido, email, telefono, hashedPassword, puesto]
        );

        // Enviar correo con la contraseña temporal
        try {
            await sendInvitationCode(email, tempPassword);
            console.log(Correo con contraseña temporal enviado a ${email});
        } catch (emailError) {
            console.error('Error al enviar correo:', emailError);
            // Continuamos aunque falle el correo, pero registramos el error
        }

        res.status(201).json({ 
            success: true,
            message: 'Empleado creado exitosamente. La contraseña temporal ha sido enviada al correo electrónico.',
            tempPassword,
            employeeId: result.insertId
        });

    } catch (err) {
        console.error('Error al crear empleado:', err);
        res.status(500).json({ error: 'Error al crear empleado' });
    }
});

// Listar todos los empleados
router.get('/empleados', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const [empleados] = await db.query(`
            SELECT id_empleado, nombre, apellido, email, puesto, 
                   temp_password as requiereCambioContraseña 
            FROM empleado
        `);
        res.json(empleados);
    } catch (err) {
        console.error('Error al obtener empleados:', err);
        res.status(500).json({ error: 'Error al obtener empleados' });
    }
});
router.put('/asignar-turno/:id', verifyToken, async (req, res) => {
    const idTurno = req.params.id;
    const { idEmpleado, idServicio } = req.body;

    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'No autorizado' });
        }

        await db.query(`
            UPDATE turnos SET id_empleado = ?, id_servicio = ? 
            WHERE id_turno = ?
        `, [idEmpleado, idServicio, idTurno]);

        res.json({ success: true, message: 'Turno asignado correctamente' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al asignar turno' });
    }
});
router.get('/turnos-disponibles', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'No autorizado' });

        const [turnos] = await db.query(`
            SELECT t.id_turno, t.fecha, t.hora, c.nombre AS cliente
            FROM turnos t
            JOIN cliente c ON c.id_cliente = t.id_cliente
            WHERE t.id_empleado IS NULL AND t.estado = 'pendiente'
        `);

        res.json(turnos);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener turnos' });
    }
});

// Eliminar empleado
router.delete('/empleados/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM empleado WHERE id_empleado = ?', [req.params.id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Empleado no encontrado' });
        }

        res.json({ message: 'Empleado eliminado exitosamente' });
    } catch (err) {
        console.error('Error al eliminar empleado:', err);
        res.status(500).json({ error: 'Error al eliminar empleado' });
    }
});

// Listar todos los administradores
router.get('/administradores', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const [admins] = await db.query(`
            SELECT id_admin, nombre, apellido, email, telefono
            FROM administrador
        `);
        res.json(admins);
    } catch (err) {
        console.error('Error al obtener administradores:', err);
        res.status(500).json({ error: 'Error al obtener administradores' });
    }
});

// Eliminar administrador (excepto el propio)
router.delete('/administradores/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        if (req.user.id === parseInt(req.params.id)) {
            return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
        }

        const [result] = await db.query('DELETE FROM administrador WHERE id_admin = ?', [req.params.id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Administrador no encontrado' });
        }

        res.json({ message: 'Administrador eliminado exitosamente' });
    } catch (err) {
        console.error('Error al eliminar administrador:', err);
        res.status(500).json({ error: 'Error al eliminar administrador' });
    }
});

module.exports = router;
