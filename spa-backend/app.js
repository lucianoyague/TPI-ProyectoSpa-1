const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const db = require('./db');
const { sendInvitationCode } = require('./utils/mailer');
const adminRoutes = require('./routes/adminRoutes');
const turnoRoutes = require('./routes/turnoRoutes');
const servicioRoutes = require('./routes/servicioRoutes');
const comboRoutes = require('./routes/comboRoutes');

const app = express();

// Configuración básica
app.use(cors());
app.use(bodyParser.json());

// Ruta estática CORREGIDA (usa path.join correctamente)
app.use(express.static(path.join('C:', 'Users', 'gabim', 'Downloads', 'SpaProject', 'spa-frontend')));

// Middleware de logs
app.use((req, res, next) => {
    console.log(`Solicitud entrante: ${req.method} ${req.url}`);
    next();
});

// Rutas API
app.use('/api/admin', adminRoutes);
app.use('/api/turnos', turnoRoutes);
app.use('/api/servicios', servicioRoutes);
app.use('/api/combos', comboRoutes);

// Ruta para manejar archivos HTML (ÚNICA ruta comodín)
app.get(/^[^.]+$/, (req, res) => {
    const filePath = path.join('C:', 'Users', 'gabim', 'Downloads', 'SpaProject', 'spa-frontend', `${req.path}.html`);
    res.sendFile(filePath, { root: __dirname });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

// Generar código inicial (opcional, puedes comentarlo temporalmente)
const generateInitialCode = async () => {
    try {
        const [rows] = await db.query('SELECT COUNT(*) AS count FROM administrador');
        if (rows[0].count === 0) {
            const codigo = crypto.randomBytes(16).toString('hex');
            await db.query('INSERT INTO codigo_invitacion (codigo) VALUES (?)', [codigo]);
            console.log('Código inicial generado:', codigo);
        }
    } catch (err) {
        console.error('Error al generar código:', err);
    }
};
generateInitialCode();