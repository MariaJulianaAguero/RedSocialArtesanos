require('dotenv').config();
const express = require('express');
const mysql = require('mysql2'); 
const bcrypt = require('bcryptjs');
const path = require('path');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs').promises;

const albumesRoutes = require('./routes/albumesRoutes');
const obrasRoutes = require('./routes/obrasRoutes');
const estaAutenticado = require('./middlewares/autenticacion');
const pool = require('./conexion_bd'); 
const solicitudesAmistadController = require('./controllers/solicitudesAmistadController');



// --- INICIO CÓDIGO NUEVO PARA NOTIFICACIONES (FUNCIÓN AUXILIAR) ---

// Función auxiliar para insertar una notificación
async function insertarNotificacion(idUsuarioDestino, tipoAlerta, idReferenciaAlerta, mensajeAlertaBreve) {
    try {
        const query = `
            INSERT INTO notificaciones (id_usuario_destino, tipo_alerta, id_referencia_alerta, mensaje_alerta_breve)
            VALUES (?, ?, ?, ?)
        `;
        await pool.query(query, [idUsuarioDestino, tipoAlerta, idReferenciaAlerta, mensajeAlertaBreve]);
        console.log(`[DEBUG - Notificación] Notificación '${tipoAlerta}' creada para usuario ${idUsuarioDestino}.`);
    } catch (error) {
        console.error('Error al insertar notificación:', error);
        
    }
}

// --- FIN CÓDIGO NUEVO PARA NOTIFICACIONES (FUNCIÓN AUXILIAR) ---

const app = express();


console.log('¡Servidor de IMÁGENES iniciando! Versión: 2025-06-12_FINAL');

const port = process.env.PORT || 3000;



// EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware para servir archivos estáticos (CSS, JS, imágenes)
app.use(express.static(path.join(__dirname, 'public')));
// Si tus imágenes ya están en public/imagenes, esta segunda línea no es estrictamente necesaria
// a menos que quieras una ruta URL diferente para acceder a ellas (ej. /my-images/nombre.png)
// Si accedes con /imagenes/nombre.png, la línea de arriba ya lo maneja.
// app.use('/imagenes', express.static(path.join(__dirname,'public','imagenes')));



app.use(session({
    secret: process.env.SESSION_SECRET || 'EstaEsUnaClaveSecretisimaParaMiProyectoDeArtesanos', 
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 } // secure: true en producción con HTTPS
}));

// Parsers - ¡DEBEN IR DESPUÉS DE LA SESIÓN si necesitas acceder a req.session en ellos!
app.use(express.json()); // Para solicitudes con cuerpo JSON
app.use(express.urlencoded({ extended: true })); // Para solicitudes con cuerpo URL-encoded (formularios HTML)



app.use(async (req, res, next) => {
    // Si req.session.usuario no existe, res.locals.usuario será null
    res.locals.usuario = req.session.usuario || null;

    // Inicializa notificacionesCount a 0
    res.locals.notificacionesCount = 0;

    // Solo busca notificaciones si hay un usuario logueado en la sesión
    if (req.session.usuario && req.session.usuario.id_usuario) {
        try {
            const [notificacionesNoLeidas] = await pool.query(
                'SELECT COUNT(*) AS count FROM notificaciones WHERE id_usuario_destino = ? AND alerta_leida = FALSE',
                [req.session.usuario.id_usuario]
            );
            res.locals.notificacionesCount = notificacionesNoLeidas[0].count;
        } catch (error) {
            console.error('Error al obtener el conteo de notificaciones para res.locals:', error);
            // Continúa con 0 o maneja el error como prefieras
        }
    }
    next(); // Continúa con la siguiente función de middleware o ruta
});




// Rutas
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'registro.html')));
app.use('/api/albumes', albumesRoutes);
app.use('/api/obras', obrasRoutes);

// Registro de usuario
app.post('/api/register', async (req, res) => {
    const { nombre_usuario, apellido_usuario, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO usuarios (nombre_usuario, apellido_usuario, email, hash_contrasena) VALUES (?,?,?,?)', // <-- CORRECCIÓN: 'email' a 'email_usuario' si tu DB lo tiene así
            [nombre_usuario, apellido_usuario, email, hashedPassword]
        );
        res.status(201).json({ message: 'Usuario registrado correctamente.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al registrar usuario.' });
    }
});



// Login de usuario
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await pool.query(
            'SELECT * FROM usuarios WHERE email = ?', 
            [email]
        );
        if (rows.length === 0) return res.status(401).json({ message: 'Usuario no encontrado.' });

        const usuario = rows[0];
        const valid = await bcrypt.compare(password, usuario.hash_contrasena);
        if (!valid) return res.status(401).json({ message: 'Contraseña incorrecta.' });

        // ¡IMPORTANTE! Almacena el objeto completo del usuario en la sesión para fácil acceso
        req.session.usuario = {
            id_usuario: usuario.id_usuario,
            nombre_usuario: usuario.nombre_usuario,
            apellido_usuario: usuario.apellido_usuario,
            email: usuario.email, 
            url_foto_perfil: usuario.url_foto_perfil, 
            intereses_usuario: usuario.intereses_usuario,
            antecedentes_usuario: usuario.antecedentes_usuario 
        };

        res.json({ message: 'Inicio de sesión exitoso.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al iniciar sesión.' });
    }
});

// Ruta para enviar solicitud de amistad
app.post('/enviar-solicitud-amistad', estaAutenticado, async (req, res) => { 
    
    const idSolicitante = req.session.usuario.id_usuario;
    const nombreSolicitante = `${req.session.usuario.nombre_usuario} ${req.session.usuario.apellido_usuario}`;
    const idReceptor = req.body.id_receptor;

    if (idSolicitante == idReceptor) {
        return res.status(400).json({ success: false, message: 'No puedes enviarte una solicitud a ti mismo.' });
    }

    try {
        // ... (lógica existente para verificar solicitudes y amistades) ...
        const [existingSolicitud] = await pool.query(
            `SELECT estado_solicitud FROM solicitudesdeamistad
             WHERE (id_usuario_envia = ? AND id_usuario_recibe = ?)
             OR (id_usuario_envia = ? AND id_usuario_recibe = ?)`,
            [idSolicitante, idReceptor, idReceptor, idSolicitante]
        );

        if (existingSolicitud.length > 0) {
            const estadoActual = existingSolicitud[0].estado_solicitud;
            if (estadoActual === 'pendiente') {
                return res.status(409).json({ success: false, message: 'Ya existe una solicitud pendiente.' });
            } else if (estadoActual === 'aceptada') {
                return res.status(409).json({ success: false, message: 'Ya son amigos.' });
            } else if (estadoActual === 'rechazada') {
                console.log(`[INFO] Solicitud previa entre ${idSolicitante} y ${idReceptor} fue rechazada. Permitiendo nueva solicitud.`);
            }
        }

        const [existingAmistad] = await pool.query(
            `SELECT id_amistad FROM amistades
             WHERE (id_usuario_uno = ? AND id_usuario_dos = ?)
             OR (id_usuario_uno = ? AND id_usuario_dos = ?)`,
            [idSolicitante, idReceptor, idReceptor, idSolicitante]
        );

        if (existingAmistad.length > 0) {
            return res.status(409).json({ success: false, message: 'Ya son amigos.' });
        }


        // 4. Insertar la nueva solicitud de amistad
        const [result] = await pool.query(
            'INSERT INTO solicitudesdeamistad (id_usuario_envia, id_usuario_recibe, estado_solicitud) VALUES (?, ?, ?)',
            [idSolicitante, idReceptor, 'pendiente']
        );

        if (result.affectedRows > 0) {
            const idSolicitudAmistad = result.insertId; // Obtener el ID de la solicitud recién creada

            // --- INSERCIÓN DE NOTIFICACIÓN PARA SOLICITUD ENVIADA ---
            await insertarNotificacion(
                idReceptor, // El usuario que recibe la solicitud
                'solicitud_amistad', // Tipo de alerta
                idSolicitudAmistad, // Referencia al ID de la solicitud
                `${nombreSolicitante} te ha enviado una solicitud de amistad.` // Mensaje
            );
            // --- FIN INSERCIÓN DE NOTIFICACIÓN ---

            return res.status(200).json({ success: true, message: 'Solicitud de amistad enviada con éxito.' });
        }
    } catch (error) {
        console.error('[ERROR ENVIAR SOLICITUD AMISTAD]:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor al enviar solicitud de amistad.' });
    }
});

// Ruta para responder a una solicitud de amistad (aceptar/rechazar)
app.post('/responder-solicitud-amistad', estaAutenticado, async (req, res) => { 
   
    const idUsuarioResponde = req.session.usuario.id_usuario;
    const nombreUsuarioResponde = `${req.session.usuario.nombre_usuario} ${req.session.usuario.apellido_usuario}`;
    const { id_solicitud, accion } = req.body;

    if (!id_solicitud || !accion || (accion !== 'aceptar' && accion !== 'rechazar')) {
        return res.status(400).json({ success: false, message: 'Parámetros inválidos.' });
    }

    try {
        const [solicitudes] = await pool.query(
            `SELECT id_usuario_envia, id_usuario_recibe, estado_solicitud FROM solicitudesdeamistad
             WHERE id_solicitud_amistad = ?`,
            [id_solicitud]
        );

        if (solicitudes.length === 0) {
            return res.status(404).json({ success: false, message: 'Solicitud de amistad no encontrada.' });
        }

        const solicitud = solicitudes[0];

        if (solicitud.id_usuario_recibe != idUsuarioResponde || solicitud.estado_solicitud !== 'pendiente') {
            return res.status(403).json({ success: false, message: 'No tienes permiso para responder a esta solicitud o ya fue procesada.' });
        }

        const [remitenteData] = await pool.query(
            'SELECT nombre_usuario, apellido_usuario FROM usuarios WHERE id_usuario = ?',
            [solicitud.id_usuario_envia]
        );
        const nombreUsuarioRemitente = remitenteData[0] ? `${remitenteData[0].nombre_usuario} ${remitenteData[0].apellido_usuario}` : 'Un usuario';

        if (accion === 'aceptar') {
            const connection = await pool.getConnection();
            try {
                await connection.beginTransaction();

                await connection.query(
                    `UPDATE solicitudesdeamistad SET estado_solicitud = 'aceptada', fecha_respuesta_solicitud = NOW()
                     WHERE id_solicitud_amistad = ?`,
                    [id_solicitud]
                );

                const idUser1 = Math.min(solicitud.id_usuario_envia, solicitud.id_usuario_recibe);
                const idUser2 = Math.max(solicitud.id_usuario_envia, solicitud.id_usuario_recibe);

                await connection.query(
                    'INSERT INTO amistades (id_usuario_uno, id_usuario_dos, fecha_amistad) VALUES (?, ?, NOW())',
                    [idUser1, idUser2]
                );

                await connection.commit();

                // --- INSERCIÓN DE NOTIFICACIÓN PARA AMISTAD ACEPTADA ---
                await insertarNotificacion(
                    solicitud.id_usuario_envia, // El usuario que envió la solicitud original
                    'amistad_aceptada', // Tipo de alerta
                    id_solicitud, // Referencia al ID de la solicitud
                    `${nombreUsuarioResponde} ha aceptado tu solicitud de amistad.` // Mensaje
                );
                // --- FIN INSERCIÓN DE NOTIFICACIÓN ---

                return res.status(200).json({ success: true, message: 'Solicitud de amistad aceptada con éxito. ¡Ahora son amigos!' });

            } catch (transactionError) {
                await connection.rollback();
                console.error('[ERROR TRANSACCIÓN ACEPTAR SOLICITUD]:', transactionError);
                return res.status(500).json({ success: false, message: 'Error al procesar la aceptación de la solicitud.' });
            } finally {
                connection.release();
            }

        } else if (accion === 'rechazar') {
            await pool.query(
                `UPDATE solicitudesdeamistad SET estado_solicitud = 'rechazada', fecha_respuesta_solicitud = NOW()
                 WHERE id_solicitud_amistad = ?`,
                [id_solicitud]
            );

            // --- INSERCIÓN DE NOTIFICACIÓN PARA AMISTAD RECHAZADA ---
            await insertarNotificacion(
                solicitud.id_usuario_envia, // El usuario que envió la solicitud original
                'solicitud_rechazada', // Tipo de alerta
                id_solicitud, // Referencia al ID de la solicitud
                `${nombreUsuarioResponde} ha rechazado tu solicitud de amistad.` // Mensaje
            );
            // --- FIN INSERCIÓN DE NOTIFICACIÓN ---

            return res.status(200).json({ success: true, message: 'Solicitud de amistad rechazada.' });
        }

    } catch (error) {
        console.error('[ERROR RESPONDER SOLICITUD AMISTAD]:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor al responder solicitud de amistad.' });
    }
});

// Perfil (tu propio perfil)
app.get('/perfil', estaAutenticado, async (req, res) => {
    try {
        console.log('[DEBUG - PROPIO PERFIL] Ruta /perfil (propio) alcanzada.');

       
        const [usuarioData] = await pool.query(
            'SELECT id_usuario, nombre_usuario, apellido_usuario, email, intereses_usuario, antecedentes_usuario, url_foto_perfil, portafolio_publico FROM usuarios WHERE id_usuario = ?',
            [req.session.usuario.id_usuario] 
        );
        const usuario = usuarioData[0];

        const [albumesData] = await pool.query(
            'SELECT * FROM albumes WHERE id_usuario = ?',
            [req.session.usuario.id_usuario] 
        );

        const [imagenesData] = await pool.query(
        'SELECT * FROM obras WHERE id_usuario = ?', // CAMBIADO 'imagenes' a 'obras'
        [req.session.usuario.id_usuario]
    );

        console.log('[DEBUG - PROPIO PERFIL] Valor de esMiPropioPerfil a enviar: true');
        console.log('[DEBUG - PROPIO PERFIL] Objeto de renderización (PARCIAL):', {
            usuario: usuario ? 'presente' : 'ausente',
            albumesCount: albumesData ? albumesData.length : 0,
            imagenesCount: imagenesData ? imagenesData.length : 0,
            esMiPropioPerfil: true
        });

        res.render('perfil', {
            usuario,
            albumes: albumesData,
            obras: imagenesData,
            esMiPropioPerfil: true,
            sonAmigos: false,
            solicitudPendiente: null, 
            solicitudRecibidaPendiente: null 
        });
    } catch (err) {
        console.error('--- ERROR DETALLADO EN RUTA /perfil (propio) ---');
        console.error('Mensaje de error:', err.message);
        console.error('Stack trace COMPLETO:', err.stack);
        console.error('--- FIN DEL ERROR ---');
        res.status(500).send('Error interno del servidor al cargar tu perfil.');
    }
});

// NUEVA RUTA: Para ver el perfil de OTRO usuario por su ID
app.get('/perfil/:id', async (req, res) => {
    const perfilUsuarioId = req.params.id;
    // ¡IMPORTANTE! loggedInUserId puede ser null si no hay sesión.
    const loggedInUserId = req.session.usuario ? req.session.usuario.id_usuario : null; // <-- CORRECCIÓN

    let esMiPropioPerfil = false;
    let sonAmigos = false;
    let solicitudPendiente = null;
    let solicitudRecibidaPendiente = null;

    if (!loggedInUserId) {
        // Si no hay usuario logueado, podemos redirigir al login
        // o permitir ver perfiles públicos (si tu lógica lo permite)
        // Por ahora, redirigimos, asumiendo que el perfil requiere autenticación.
        // Si quieres que sea público, quita esta redirección y ajusta las consultas de DB
        // para manejar el caso de loggedInUserId === null
        return res.redirect('/login');
    }

    if (loggedInUserId == perfilUsuarioId) {
        // Redirige al perfil propio si el ID es el mismo que el logueado.
        // Esto evita duplicar la lógica de "mi propio perfil" y mantiene las URLs limpias.
        return res.redirect('/perfil');
    }

    // Lógica para perfil de otro usuario (solo si loggedInUserId !== perfilUsuarioId)
    console.log(`[DEBUG - OTRO PERFIL] Solicitud recibida para /perfil/${perfilUsuarioId}`);
    console.log(`[DEBUG - OTRO PERFIL] Es perfil de otro usuario (${perfilUsuarioId}). esMiPropioPerfil sigue en false.`);

    try {
        // 1. Verificar si ya son amigos (en la tabla `amistades`)
        const [amistadResult] = await pool.query(
            `SELECT id_amistad FROM amistades
             WHERE (id_usuario_uno = ? AND id_usuario_dos = ?)
             OR (id_usuario_uno = ? AND id_usuario_dos = ?)`,
            [loggedInUserId, perfilUsuarioId, perfilUsuarioId, loggedInUserId]
        );
        if (amistadResult.length > 0) {
            sonAmigos = true;
        }

        // 2. Verificar si hay una solicitud pendiente enviada por el usuario logueado al perfil
        if (!sonAmigos) {
            const [sentRequest] = await pool.query(
                `SELECT id_solicitud_amistad, estado_solicitud FROM solicitudesdeamistad
                 WHERE id_usuario_envia = ? AND id_usuario_recibe = ? AND estado_solicitud = 'pendiente'`,
                [loggedInUserId, perfilUsuarioId]
            );
            if (sentRequest.length > 0) {
                solicitudPendiente = {
                    id_solicitud: sentRequest[0].id_solicitud_amistad,
                    estado: sentRequest[0].estado_solicitud
                };
            }

            // 3. Verificar si hay una solicitud pendiente recibida por el usuario logueado del perfil
            const [receivedRequest] = await pool.query(
                `SELECT id_solicitud_amistad, estado_solicitud FROM solicitudesdeamistad
                 WHERE id_usuario_envia = ? AND id_usuario_recibe = ? AND estado_solicitud = 'pendiente'`,
                [perfilUsuarioId, loggedInUserId]
            );
            if (receivedRequest.length > 0) {
                solicitudRecibidaPendiente = {
                    id_solicitud: receivedRequest[0].id_solicitud_amistad,
                    estado: receivedRequest[0].estado_solicitud
                };
            }
        }

    } catch (error) {
        console.error('--- ERROR DETALLADO EN LÓGICA DE AMISTAD /perfil/:id ---');
        console.error('Mensaje de error:', error.message);
        console.error('Stack trace COMPLETO:', error.stack);
        console.error('--- FIN DEL ERROR ---');
        return res.status(500).send('Error interno del servidor al verificar estado de amistad.');
    }


    try {
        const [users] = await pool.query('SELECT * FROM usuarios WHERE id_usuario = ?', [perfilUsuarioId]);
        if (users.length === 0) {
            return res.status(404).send('Usuario no encontrado.');
        }
        const usuario = users[0];

        // Lógica para mostrar álbumes e imágenes:
        // Si el perfil no es público y no son amigos, quizás no deberías mostrar los álbumes/imágenes.
        let albumes = [];
        let imagenes = [];

        if (usuario.portafolio_publico || sonAmigos || esMiPropioPerfil) { // O si es tu propio perfil
             // Obtener álbumes
            [albumes] = await pool.query('SELECT * FROM albumes WHERE id_usuario = ?', [perfilUsuarioId]);
             // Obtener imágenes
            [imagenes] = await pool.query('SELECT * FROM imagenes WHERE id_usuario = ?', [perfilUsuarioId]);
        } else {
            console.log(`[DEBUG - OTRO PERFIL] Portafolio de usuario ${perfilUsuarioId} no es público y no son amigos. No se cargarán álbumes/imágenes.`);
        }


        console.log('[DEBUG - OTRO PERFIL] Valor final de esMiPropioPerfil a enviar: ' + esMiPropioPerfil);
        console.log('[DEBUG - OTRO PERFIL] Objeto de renderización (PARCIAL):', {
            usuario: 'presente',
            esMiPropioPerfil,
            sonAmigos,
            solicitudPendiente: solicitudPendiente ? 'presente' : 'ausente',
            solicitudRecibidaPendiente: solicitudRecibidaPendiente ? 'presente' : 'ausente',
            albumesCount: albumes.length,
            imagenesCount: imagenes.length
        });

        res.render('perfil', {
            usuario,
            albumes,
            imagenes,
            esMiPropioPerfil,
            sonAmigos,
            solicitudPendiente,
            solicitudRecibidaPendiente
        });
    } catch (error) {
        console.error('Error al obtener datos del perfil:', error);
        res.status(500).send('Error interno del servidor.');
    }
});




// Eliminar imagen
app.delete('/api/eliminar-imagen/:filename', estaAutenticado, async (req, res) => {
    const { filename } = req.params;
    try {
        // ¡IMPORTANTE! Usar req.session.usuario.id_usuario
        const userId = req.session.usuario.id_usuario; // <-- CORRECCIÓN

        // Asegúrate de que la imagen pertenece al usuario antes de eliminarla
        const [result] = await pool.query(
            'DELETE FROM imagenes WHERE id_usuario=? AND url_obra=?',
            [userId, filename] // <-- CORRECCIÓN
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Imagen no encontrada o no autorizada para eliminar.' });
        }

        const filePath = path.join(__dirname, 'public', 'imagenes', filename);
        fs.unlink(filePath, err => {
            if (err) {
                console.error('Error al eliminar archivo físico:', err);
                // Si el archivo no se puede eliminar, esto no debería impedir que la DB se actualice,
                // pero es bueno loguearlo.
            }
        });

        res.json({ message: 'Imagen eliminada correctamente.' });
    } catch (e) {
        console.error('Error en la ruta DELETE /api/eliminar-imagen:', e);
        res.status(500).json({ message: 'Error interno al eliminar imagen.' });
    }
});

// Ruta para OBTENER todos los álbumes del usuario actual
app.get('/api/albumes', async (req, res) => {
    // Asegúrate de que el usuario esté autenticado
    if (!req.session.usuario || !req.session.usuario.id_usuario) {
        console.error("Acceso no autorizado a /api/albumes - Usuario no logueado");
        return res.status(401).json({ message: 'Acceso no autorizado.' });
    }

    const id_usuario = req.session.usuario.id_usuario;
    console.log(`[BACKEND DEBUG] Solicitud GET /api/albumes para usuario: ${id_usuario}`);

    try {
        const [rows] = await pool.query('SELECT id_album, nombre_album, tipo_album FROM albumes WHERE id_usuario = ? ORDER BY nombre_album ASC', [id_usuario]);
        console.log("[BACKEND DEBUG] Álbumes obtenidos:", rows);
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener álbumes:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener álbumes.' });
    }
});

// Ruta para CREAR un nuevo álbum
app.post('/api/albumes', async (req, res) => {
    // Asegúrate de que el usuario esté autenticado
    if (!req.session.usuario || !req.session.usuario.id_usuario) {
        console.error("Acceso no autorizado a /api/albumes (POST) - Usuario no logueado");
        return res.status(401).json({ message: 'Acceso no autorizado.' });
    }

    const id_usuario = req.session.usuario.id_usuario;
    const { nombre_album, tipo_album } = req.body; // Asegúrate de que estos nombres coinciden con lo que envía el frontend

    console.log(`[BACKEND DEBUG] Solicitud POST /api/albumes para usuario: ${id_usuario}, nombre: ${nombre_album}, tipo: ${tipo_album}`);

    if (!nombre_album) {
        console.error("[BACKEND DEBUG] Falta nombre_album en la solicitud POST /api/albumes");
        return res.status(400).json({ message: 'El nombre del álbum es requerido.' });
    }

    try {
        const [result] = await pool.query(
            'INSERT INTO albumes (id_usuario, nombre_album, tipo_album) VALUES (?, ?, ?)',
            [id_usuario, nombre_album, tipo_album || null] // Permite que tipo_album sea NULL si no se envía
        );
        console.log("[BACKEND DEBUG] Álbum creado:", result);
        res.status(201).json({ 
            message: 'Álbum creado exitosamente.', 
            id_album: result.insertId,
            nombre_album: nombre_album,
            tipo_album: tipo_album
        });
    } catch (error) {
        console.error('Error al crear álbum:', error);
        // Manejo específico para el error de duplicado (si el nombre del álbum debe ser único para el usuario)
        if (error.code === 'ER_DUP_ENTRY') { // Código de error MySQL para entrada duplicada
            return res.status(409).json({ message: 'Ya existe un álbum con ese nombre.' });
        }
        res.status(500).json({ message: 'Error interno del servidor al crear el álbum.' });
    }
});


// Ruta para cerrar sesión
app.get('/logout', (req, res) => {
    // Destruye la sesión del usuario
    req.session.destroy(err => {
        if (err) {
            console.error('Error al cerrar sesión:', err);
            return res.status(500).send('Error al cerrar sesión');
        }
        // Redirige al usuario a la página de inicio de sesión o a la página principal
        res.redirect('/login'); // O a '/', según tu diseño
    });
});

// NUEVA RUTA PARA ENVIAR SOLICITUDES DE AMISTAD:
app.post('/api/friend-requests/send', estaAutenticado, solicitudesAmistadController.enviarSolicitud); // Esta ruta usa el controlador

// --- Rutas adicionales de la aplicación ---
// Ruta para el dashboard o página principal tras login
app.get('/dashboard', estaAutenticado, (req, res) => {
    res.render('dashboard', { title: 'Dashboard', usuario: res.locals.usuario });
});

// Ruta para el inicio de sesión
app.get('/login', (req, res) => {
    // Si ya está logueado, redirige al perfil
    if (req.session.usuario) {
        return res.redirect('/perfil');
    }
    res.render('login', { title: 'Iniciar Sesión', message: null });
});

// Ruta de notificaciones (requiere autenticación)
app.get('/notificaciones', estaAutenticado, async (req, res) => {
    try {
        const idUsuario = req.session.usuario.id_usuario;
        const [notificaciones] = await pool.query(
            `SELECT * FROM notificaciones
             WHERE id_usuario_destino = ?
             ORDER BY fecha_hora_alerta DESC`,
            [idUsuario]
        );

        // Opcional: Marcar notificaciones como leídas al verlas
        await pool.query(
            `UPDATE notificaciones SET alerta_leida = TRUE
             WHERE id_usuario_destino = ? AND alerta_leida = FALSE`,
            [idUsuario]
        );

        // Las variables `usuario` y `notificacionesCount` ya están en `res.locals`
        res.render('notificaciones', {
            title: 'Mis Notificaciones',
            notificaciones: notificaciones
        });

    } catch (error) {
        console.error('Error al cargar notificaciones:', error);
        res.status(500).send('Error al cargar las notificaciones.');
    }
});
// POST /api/solicitudes-amistad/enviar - Enviar una solicitud de amistad
// Requiere que el usuario esté autenticado.
app.post('/api/solicitudes-amistad/enviar', estaAutenticado, async (req, res) => {
    // Obtenemos el ID del usuario que está logueado (quien envía la solicitud)
    const idUsuarioEnvia = req.session.usuario.id_usuario; 
    // Obtenemos el ID del usuario al que se le envía la solicitud desde el cuerpo de la petición
    const { id_usuario_recibe } = req.body; 

    // --- Validaciones básicas ---
    if (!id_usuario_recibe) {
        return res.status(400).json({ message: 'ID del usuario receptor es requerido.' });
    }

    // Convertir a número para asegurar la comparación
    if (idUsuarioEnvia === parseInt(id_usuario_recibe)) {
        return res.status(400).json({ message: 'No puedes enviarte una solicitud a ti mismo.' });
    }

    let connection; // Declaramos la variable de conexión para usarla en el finally
    try {
        connection = await pool.getConnection(); // Obtenemos una conexión del pool
        await connection.beginTransaction(); // Iniciamos una transacción para asegurar atomicidad

        // 1. Verificar si ya existe una solicitud pendiente o aceptada
        // Buscamos si ya hay una relación (enviada o recibida) entre los dos usuarios
        const [existingRequests] = await connection.query(
            `SELECT estado_solicitud FROM solicitudesdeamistad
             WHERE (id_usuario_envia = ? AND id_usuario_recibe = ?)
                OR (id_usuario_envia = ? AND id_usuario_recibe = ?)`,
            [idUsuarioEnvia, id_usuario_recibe, id_usuario_recibe, idUsuarioEnvia] // Considera ambos sentidos
        );

        if (existingRequests.length > 0) {
            const estado = existingRequests[0].estado_solicitud;
            if (estado === 'pendiente') {
                await connection.rollback(); // Deshacemos la transacción si ya hay una pendiente
                return res.status(409).json({ message: 'Ya existe una solicitud de amistad pendiente con este usuario.' });
            } else if (estado === 'aceptada') {
                await connection.rollback(); // Deshacemos la transacción si ya son amigos
                return res.status(409).json({ message: 'Ya eres amigo de este usuario.' });
            }
            // Si el estado es 'rechazada', podríamos decidir reenviar o no. 
            // Por ahora, si es rechazada, permitimos que continúe para crear una nueva.
        }

        // 2. Insertar la nueva solicitud de amistad en la tabla 'solicitudesdeamistad'
        const [result] = await connection.query(
            `INSERT INTO solicitudesdeamistad (id_usuario_envia, id_usuario_recibe, estado_solicitud, fecha_envio_solicitud)
             VALUES (?, ?, ?, NOW())`, // NOW() es una función de MySQL para la fecha/hora actual
            [idUsuarioEnvia, id_usuario_recibe, 'pendiente']
        );

        const idSolicitudAmistad = result.insertId; // Capturamos el ID de la solicitud recién creada

        // 3. Crear la notificación para el usuario que RECIBE la solicitud
        // Primero, obtenemos el nombre del usuario que ENVÍA la solicitud para el mensaje
        const [senderUser] = await connection.query('SELECT nombre_usuario FROM usuarios WHERE id_usuario = ?', [idUsuarioEnvia]);
        const nombreSender = senderUser[0] ? senderUser[0].nombre_usuario : 'Alguien'; // Fallback por si acaso

        const mensajeNotificacion = `${nombreSender} te ha enviado una solicitud de amistad.`;
        const tipoAlerta = 'solicitud_amistad'; // Este valor DEBE estar en el ENUM de 'tipo_alerta' en tu tabla 'notificaciones'

        await connection.query(
            `INSERT INTO notificaciones (id_usuario_destino, tipo_alerta, id_referencia_alerta, mensaje_alerta_breve, alerta_leida, fecha_hora_alerta)
             VALUES (?, ?, ?, ?, ?, NOW())`, // NOW() para la fecha/hora actual de la notificación
            [id_usuario_recibe, tipoAlerta, idSolicitudAmistad, mensajeNotificacion, FALSE] // FALSE = no leída
        );

        await connection.commit(); // Si todo salió bien, confirmamos todos los cambios en la DB

        res.status(200).json({ message: 'Solicitud de amistad enviada y notificación creada.' });

    } catch (error) {
        if (connection) {
            await connection.rollback(); // Si algo falla, deshacemos la transacción
        }
        console.error('Error al enviar solicitud de amistad o crear notificación:', error);
        // Enviamos una respuesta de error al frontend
        res.status(500).json({ message: 'Error interno del servidor al enviar solicitud de amistad.' });
    } finally {
        if (connection) {
            connection.release(); // Siempre liberamos la conexión de vuelta al pool
        }
    }
});

// POST /api/notificaciones/marcar-leida/:id
// Marca una notificación específica como leída para el usuario autenticado.
app.post('/api/notificaciones/marcar-leida/:id', estaAutenticado, async (req, res) => {
    const notificationId = req.params.id; // El ID de la notificación a marcar
    const userId = req.session.usuario.id_usuario; // El ID del usuario logueado

    if (!notificationId) {
        return res.status(400).json({ success: false, message: 'ID de notificación es requerido.' });
    }

    try {
        // Actualizar la notificación en la base de datos
        // Asegúrate de que solo el usuario al que pertenece la notificación pueda marcarla como leída
        const [result] = await pool.query(
            `UPDATE notificaciones
             SET alerta_leida = TRUE
             WHERE id_notificacion = ? AND id_usuario_destino = ?`,
            [notificationId, userId]
        );

        if (result.affectedRows === 0) {
            // Si no se afectaron filas, la notificación no existe o no pertenece al usuario
            return res.status(404).json({ success: false, message: 'Notificación no encontrada o no tienes permiso para marcarla como leída.' });
        }

        // Opcional: Actualizar el contador de notificaciones no leídas en la sesión si lo usas
        // Si el contador se obtiene de la base de datos en cada request, esto puede no ser necesario.
        // Si lo mantienes en la sesión, deberías decrementar el valor.
        if (req.session.notificacionesCount && req.session.notificacionesCount > 0) {
            req.session.notificacionesCount--;
        }

        res.status(200).json({ success: true, message: 'Notificación marcada como leída.' });

    } catch (error) {
        console.error('Error al marcar notificación como leída:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al marcar notificación como leída.' });
    }
});

// --- MANEJADOR 404 (Siempre al final, antes del manejador de errores global) ---
app.use((req, res, next) => {
    console.log(`--- Manejador 404 alcanzado ---`);
    console.log(`Método: ${req.method}, URL: ${req.originalUrl}`);
    // ¡IMPORTANTE! Redirige al login o renderiza una vista 404 HTML si es una solicitud de página
    if (req.accepts('html')) {
        return res.status(404).render('404', {
            title: 'Página no encontrada',
            message: 'Lo sentimos, la página que buscas no existe.',
            // res.locals.usuario y res.locals.notificacionesCount ya estarán disponibles aquí
        });
    }
    // Para solicitudes de API (o si no acepta HTML), envía JSON
    res.status(404).json({ message: 'Recurso no encontrado.' });
});

// --- MANEJADOR DE ERRORES GLOBAL (ÚLTIMO MIDDLEWARE) ---
app.use((err, req, res, next) => {
    console.error('--- ERROR GLOBAL NO MANEJADO EN EL SERVIDOR ---');
    console.error('Mensaje:', err.message);
    console.error('Stack:', err.stack);

    // Si es una solicitud de HTML, renderiza una página de error,
    // de lo contrario, envía una respuesta JSON.
    if (req.accepts('html')) {
        return res.status(500).render('error', {
            title: 'Error del servidor',
            message: 'Ocurrió un error inesperado en el servidor.',
            errorDetails: process.env.NODE_ENV === 'development' ? err.stack : undefined, // Mostrar stack solo en desarrollo
            // res.locals.usuario y res.locals.notificacionesCount ya estarán disponibles aquí
        });
    }
    res.status(500).json({ message: 'Ocurrió un error inesperado en el servidor.' });
});
// --- FIN MANEJADOR DE ERRORES GLOBAL ---

// Escuchar
app.listen(port, () => console.log(`Servidor escuchando en http://localhost:${port}`));