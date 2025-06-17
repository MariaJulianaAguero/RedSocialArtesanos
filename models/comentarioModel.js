
const pool = require('../conexion_bd'); 

// Define el objeto comentarioModel que contendrá todas nuestras funciones
const comentarioModel = {

    /**
     * Función para obtener todos los comentarios asociados a una obra específica.
     * Incluye información del usuario que hizo el comentario para mostrar su nombre y foto.
     * @param {number} idObra - El ID de la obra de la que queremos los comentarios.
     * @returns {Promise<Array>} - Retorna un array de objetos, donde cada objeto es un comentario con datos del autor.
     */
    getComentariosByObraId: async (idObra) => {
        try {
            // Ejecuta una consulta SQL para seleccionar los comentarios.
            // Hacemos un JOIN con la tabla 'usuarios' para obtener el nombre, apellido y foto del autor del comentario.
            // Filtramos por 'id_obra_comentada' para obtener solo los comentarios de la obra deseada.
            // Los ordenamos por fecha de forma descendente (más recientes primero).
            const [rows] = await pool.query(
                `SELECT 
                    c.id_comentario,
                    c.texto_comentario,
                    c.fecha_comentario,
                    u.id_usuario,
                    u.nombre_usuario,
                    u.apellido_usuario,
                    u.url_foto_perfil
                   FROM comentarios c
                   JOIN usuarios u ON c.id_usuario_autor = u.id_usuario
                   WHERE c.id_obra_comentada = ?
                   ORDER BY c.fecha_comentario DESC`, 
                [idObra]
            );
            return rows; // Devuelve los resultados de la consulta.
        } catch (error) {
            // Si ocurre un error, lo imprimimos en la consola del servidor y lanzamos el error.
            console.error('Error al obtener comentarios por ID de obra:', error);
            throw error;
        }
    },

    /**
     * Función para añadir un nuevo comentario a una obra en la base de datos.
     * @param {number} idObraComentada - El ID de la obra a la que se añade el comentario.
     * @param {number} idUsuarioAutor - El ID del usuario que está creando el comentario.
     * @param {string} textoComentario - El texto o contenido del comentario.
     * @returns {Promise<Object>} - Retorna el resultado de la operación de inserción (ej. id del nuevo comentario).
     */
    addComentario: async (idObraComentada, idUsuarioAutor, textoComentario) => {
        try {
            // Ejecuta una consulta SQL para insertar un nuevo comentario.
            const [result] = await pool.query(
                'INSERT INTO comentarios (id_obra_comentada, id_usuario_autor, texto_comentario) VALUES (?, ?, ?)',
                [idObraComentada, idUsuarioAutor, textoComentario] // Parámetros seguros para la consulta.
            );
            return result; // Devuelve el resultado de la inserción (ej. `insertId` del nuevo comentario).
        } catch (error) {
            console.error('Error al agregar comentario:', error);
            throw error;
        }
    },

    /**
     * Función para eliminar un comentario por su ID.
     * Requiere que el usuario que intenta eliminar sea el autor del comentario (por seguridad).
     * @param {number} idComentario - El ID del comentario a eliminar.
     * @param {number} idUsuarioAutor - El ID del usuario que intenta eliminar (para verificar permisos).
     * @returns {Promise<Object>} - Retorna el resultado de la operación de eliminación.
     */
    deleteComentario: async (idComentario, idUsuarioAutor) => {
        try {
            // Ejecuta una consulta SQL para eliminar un comentario.
            // La cláusula WHERE asegura que solo el autor original pueda eliminar su comentario.
            const [result] = await pool.query(
                'DELETE FROM comentarios WHERE id_comentario = ? AND id_usuario_autor = ?',
                [idComentario, idUsuarioAutor] // Parámetros seguros para la consulta.
            );
            return result; // Devuelve el resultado de la eliminación.
        } catch (error) {
            console.error('Error al eliminar comentario:', error);
            throw error;
        }
    }
};

// Exporta el objeto comentarioModel para que pueda ser utilizado en otros archivos (como los controladores).
module.exports = comentarioModel;