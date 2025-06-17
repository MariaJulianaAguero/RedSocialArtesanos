

// Importa el modelo de comentarios que acabamos de crear
const comentarioModel = require('../models/comentarioModel');

// Importa el modelo de obras para poder obtener el creador de una obra para notificaciones
const obraModel = require('../models/obraModel'); 

//const { insertarNotificacion } = require('./notificacionesController'); //

// Define el objeto comentariosController que contendrá todas las funciones
const comentariosController = {

    /**
     * Controlador para obtener todos los comentarios de una obra específica.
     * Corresponde a una solicitud GET a /api/obras/:idObra/comentarios
     */
    getComentariosByObra: async (req, res) => {
        // Extrae el ID de la obra de los parámetros de la URL
        const idObra = req.params.idObra;
        try {
            // Llama al modelo para obtener los comentarios de la base de datos
            const comentarios = await comentarioModel.getComentariosByObraId(idObra);
            // Envía los comentarios obtenidos como respuesta JSON con estado 200 (OK)
            res.status(200).json(comentarios);
        } catch (error) {
            // Si hay un error, lo registra y envía una respuesta de error al cliente
            console.error('Error en comentariosController.getComentariosByObra:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor al obtener comentarios.' });
        }
    },

    /**
     * Controlador para agregar un nuevo comentario a una obra.
     * Corresponde a una solicitud POST a /api/obras/:idObra/comentarios
     * Requiere que el usuario esté autenticado.
     */
    addComentario: async (req, res) => {
        // Extrae el ID de la obra de los parámetros de la URL
        const idObraComentada = req.params.idObra;
        // Obtiene el ID del usuario autenticado de la sesión (establecido por el middleware de autenticación)
        const idUsuarioAutor = req.session.usuario.id_usuario; 
        // Extrae el texto del comentario del cuerpo de la solicitud (enviado desde el frontend)
        const textoComentario = req.body.texto_comentario;

        // Valida que el comentario no esté vacío
        if (!textoComentario || textoComentario.trim() === '') {
            return res.status(400).json({ success: false, message: 'El comentario no puede estar vacío.' });
        }

        try {
            // Llama al modelo para agregar el comentario a la base de datos
            const result = await comentarioModel.addComentario(idObraComentada, idUsuarioAutor, textoComentario);

            // Si la inserción fue exitosa (affectedRows > 0)
            if (result.affectedRows > 0) {
                const idComentarioNuevo = result.insertId; // Obtiene el ID del comentario recién creado

                // --- LÓGICA OPCIONAL PARA NOTIFICACIONES ---
                // Si quieres que el creador de la obra reciba una notificación cuando alguien la comenta:
                // 1. Necesitas obtener los detalles de la obra para saber quién es su creador.
                const obra = await obraModel.getObraById(idObraComentada); // Asegúrate de tener este método en obraModel
                
                // 2. Si la obra existe, tiene un creador y el que comenta no es el mismo creador:
                //if (obra && obra.id_usuario_creador && obra.id_usuario_creador !== idUsuarioAutor) {
                    // 3. Llama a la función de notificación
                   // await insertarNotificacion(
                    //    obra.id_usuario_creador, // ID del usuario creador de la obra
                    //    'nuevo_comentario',    // Tipo de notificación
                    //    idComentarioNuevo,     // Referencia al ID del comentario
                    //    `${req.session.usuario.nombre_usuario} ${req.session.usuario.apellido_usuario} comentó tu obra "${obra.titulo_obra || 'Sin título'}".` // Mensaje
                  //  );
              //  }
                // --- FIN LÓGICA OPCIONAL PARA NOTIFICACIONES ---

                // Envía una respuesta de éxito al frontend
                res.status(201).json({ success: true, message: 'Comentario agregado con éxito.', id_comentario: idComentarioNuevo });
            } else {
                // Si por alguna razón no se insertó el comentario
                res.status(500).json({ success: false, message: 'No se pudo agregar el comentario.' });
            }
        } catch (error) {
            console.error('Error en comentariosController.addComentario:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor al agregar comentario.' });
        }
    },

    /**
     * Controlador para eliminar un comentario.
     * Corresponde a una solicitud DELETE a /api/comentarios/:idComentario
     * Requiere que el usuario esté autenticado y sea el autor del comentario.
     */
    deleteComentario: async (req, res) => {
        // Extrae el ID del comentario de los parámetros de la URL
        const idComentario = req.params.idComentario;
        // Obtiene el ID del usuario que intenta eliminar de la sesión
        const idUsuarioActual = req.session.usuario.id_usuario; 

        try {
            // Llama al modelo para intentar eliminar el comentario.
            // El modelo ya tiene la lógica para verificar si el usuario es el autor.
            const result = await comentarioModel.deleteComentario(idComentario, idUsuarioActual);

            // Si se eliminó una fila (affectedRows > 0)
            if (result.affectedRows > 0) {
                res.status(200).json({ success: true, message: 'Comentario eliminado con éxito.' });
            } else {
                // Si no se afectó ninguna fila, puede ser que el comentario no existe
                // o que el usuario no es el autor (porque la condición WHERE id_usuario_autor falló).
                res.status(403).json({ success: false, message: 'No tienes permiso para eliminar este comentario o no existe.' });
            }
        } catch (error) {
            console.error('Error en comentariosController.deleteComentario:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor al eliminar comentario.' });
        }
    }
};

// Exporta el objeto comentariosController para que pueda ser utilizado en las rutas.
module.exports = comentariosController;