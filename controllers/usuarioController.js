const pool = require('../conexion_bd'); 


exports.vistaPerfil = async (req, res) => {
    
    const usuarioId = req.session.userId;

    if (!usuarioId) {
        // Si no hay usuario en sesión, redirigir al login
        return res.redirect('/login.html');
    }

    try {
       
        const [usuarioRows] = await pool.execute(
            `SELECT id_usuario, nombre_usuario, apellido_usuario, email, url_foto_perfil, intereses_usuario, antecedentes_usuario, portafolio_publico FROM usuarios WHERE id_usuario = ?`,
            [usuarioId]
        );

        if (usuarioRows.length === 0) {
            return res.status(404).render('error', { message: 'Usuario no encontrado.' }); // Renderizar una vista de error o 404
        }
        const usuario = usuarioRows[0];

        // 2. Obtener álbumes del usuario
        const [albumes] = await pool.execute(
            `SELECT id_album, nombre_album, tipo_album FROM albumes WHERE id_usuario = ? ORDER BY nombre_album ASC`,
            [usuarioId]
        );

       
        const [obras] = await pool.execute(
            `SELECT id_obra, id_album, url_obra, titulo_obra_opcional, descripcion_obra, precio, fecha_subida_obra FROM obras WHERE id_usuario = ? ORDER BY fecha_subida_obra DESC`,
            [usuarioId]
        );

        // 4. Lógica para perfil público/privado y relaciones de amistad
        // Estos valores son necesarios para renderizar correctamente perfil.ejs
        // Si es el propio perfil, no hay solicitud de amistad, no es 'amigo' de sí mismo.
        const esMiPropioPerfil = true;
        const sonAmigos = false;
        const solicitudPendiente = null;
        const solicitudRecibidaPendiente = null;

       
        const notificacionesCount = 0; // Placeholder, recupera esto de tu DB si aplica

        res.render('perfil', {
            usuario: usuario,
            esMiPropioPerfil: esMiPropioPerfil,
            sonAmigos: sonAmigos,
            solicitudPendiente: solicitudPendiente,
            solicitudRecibidaPendiente: solicitudRecibidaPendiente,
            albumes: albumes,
            obras: obras, 
            notificacionesCount: notificacionesCount // Pasa el conteo de notificaciones
        });

    } catch (error) {
        console.error('Error al cargar la vista del perfil:', error);
        // Manejo de errores más detallado en producción
        res.status(500).render('error', { message: 'Error interno del servidor al cargar el perfil.' });
    }
};

