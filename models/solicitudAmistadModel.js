// models/solicitudAmistadModel.js
const connection = require('../conexion_bd');

const SolicitudAmistad = {
    // Función para enviar una solicitud de amistad
    enviarSolicitud: (idSolicitante, idReceptor, callback) => {
        // 1. Verificar que los usuarios no sean el mismo
        if (idSolicitante === idReceptor) {
            return callback(new Error('No puedes enviarte una solicitud de amistad a ti mismo.'));
        }

        // 2. Verificar si ya existe una solicitud 'pendiente' entre estos dos usuarios (en cualquier dirección)
        // o si ya son amigos (en la tabla 'solicitudesdeamistad' con estado 'aceptada')
        const checkQuery = `
            SELECT id_solicitud_amistad, estado_solicitud, id_usuario_envia, id_usuario_recibe 
            FROM solicitudesdeamistad 
            WHERE (id_usuario_envia = ? AND id_usuario_recibe = ?) 
               OR (id_usuario_envia = ? AND id_usuario_recibe = ?)
        `;
        connection.query(checkQuery, [idSolicitante, idReceptor, idReceptor, idSolicitante], (err, results) => {
            if (err) {
                console.error("Error al verificar solicitud existente:", err);
                return callback(err);
            }

            if (results.length > 0) {
                const existingRequest = results[0]; // Tomamos la primera coincidencia

                if (existingRequest.estado_solicitud === 'pendiente') {
                    if (existingRequest.id_usuario_envia === idSolicitante) {
                        return callback(new Error('Ya has enviado una solicitud de amistad a este usuario y está pendiente.'));
                    } else {
                        return callback(new Error('Ya existe una solicitud de amistad pendiente de este usuario hacia ti.'));
                    }
                } else if (existingRequest.estado_solicitud === 'aceptada') {
                    return callback(new Error('Ya eres amigo de este usuario.'));
                }
                // Si el estado_solicitud es 'rechazada', el flujo continúa y se permite enviar una nueva solicitud.
                // Podrías añadir lógica aquí si no quieres permitir reenviar solicitudes rechazadas.
            }

            // 3. Si no hay solicitudes pendientes ni amistad existente, proceder a insertar la nueva solicitud
            const insertQuery = `
                INSERT INTO solicitudesdeamistad (id_usuario_envia, id_usuario_recibe, estado_solicitud)
                VALUES (?, ?, 'pendiente')
            `;
            connection.query(insertQuery, [idSolicitante, idReceptor], (err, result) => {
                if (err) {
                    console.error("Error al insertar solicitud de amistad:", err);
                    return callback(err);
                }
                callback(null, result); // Éxito: la solicitud se envió
            });
        });
    },

    // --- Agregaremos más funciones ---
};

module.exports = SolicitudAmistad;