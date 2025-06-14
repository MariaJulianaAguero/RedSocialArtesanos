// controllers/solicitudesAmistadController.js
const SolicitudAmistad = require('../models/solicitudAmistadModel'); // Asegúrate de que esta ruta sea correcta

const solicitudesAmistadController = {
    // Función para manejar el envío de una solicitud de amistad
    enviarSolicitud: (req, res) => {
        const idSolicitante = req.session.userId;
        const idReceptor = parseInt(req.body.id_receptor); // El ID del usuario al que se le envía la solicitud

        if (!idSolicitante) {
            return res.status(401).json({ message: 'No autorizado. Debes iniciar sesión para enviar solicitudes.' });
        }
        if (isNaN(idReceptor)) {
            return res.status(400).json({ message: 'ID de receptor inválido.' });
        }

        SolicitudAmistad.enviarSolicitud(idSolicitante, idReceptor, (err, result) => {
            if (err) {
                // Aquí diferenciamos los errores conocidos de los errores generales de la DB
                if (err.message.includes('Ya has enviado una solicitud') ||
                    err.message.includes('Ya existe una solicitud de amistad pendiente') ||
                    err.message.includes('Ya eres amigo')) {
                    return res.status(409).json({ message: err.message }); // 409 Conflict
                }
                if (err.message.includes('No puedes enviarte una solicitud')) {
                    return res.status(400).json({ message: err.message }); // 400 Bad Request
                }
                console.error('Error al enviar solicitud de amistad:', err);
                return res.status(500).json({ message: 'Error interno del servidor al enviar la solicitud.' });
            }
            res.status(201).json({ message: 'Solicitud de amistad enviada con éxito.' });
        });
    }

    // --- Aquí agregaremos más funciones para aceptar, rechazar, etc. ---
};

module.exports = solicitudesAmistadController;