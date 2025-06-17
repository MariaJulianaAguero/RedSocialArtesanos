
const connection = require('../conexion_bd'); 

const obraModel = { 
    createObra: async (userId, idAlbum, urlObra, tituloObraOpcional = null, descripcionObra = null, precio = 0.00) => { // ¡CAMBIO DE NOMBRE DE FUNCIÓN Y PARÁMETROS!
        try {
            const [result] = await connection.promise().query(
                
                'INSERT INTO obras (id_usuario, id_album, url_obra, titulo_obra_opcional, descripcion_obra, precio) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, idAlbum, urlObra, tituloObraOpcional, descripcionObra, precio]
            );
            return result.insertId; // Retorna el ID de la nueva obra
        } catch (error) {
            console.error('Error al crear obra:', error);
            throw error;
        }
    },

    
    getObrasByAlbumId: async (albumId) => {
        try {
            const [rows] = await connection.promise().query(
                
                'SELECT id_obra, url_obra, titulo_obra_opcional, descripcion_obra, precio, fecha_subida_obra FROM obras WHERE id_album = ? ORDER BY fecha_subida_obra DESC',
                [albumId]
            );
            return rows;
        } catch (error) {
            console.error('Error al obtener obras por álbum:', error);
            throw error;
        }
    },

    // Obtener una obra específica por su ID y id_usuario (ya no por filename)
    
    getObraByIdAndUser: async (idObra, userId) => {
        try {
            const [rows] = await connection.promise().query(
                
                'SELECT id_obra, url_obra, titulo_obra_opcional, descripcion_obra, precio FROM obras WHERE id_obra = ? AND id_usuario = ?',
                [idObra, userId]
            );
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('Error al obtener obra por ID y usuario:', error);
            throw error;
        }
    },

    deleteObra: async (idObra, userId) => {
        try {
            // 1. Obtener la url_obra antes de eliminar el registro
            const [obraRows] = await connection.promise().query(
                'SELECT url_obra FROM obras WHERE id_obra = ? AND id_usuario = ?',
                [idObra, userId]
            );

            if (obraRows.length === 0) {
                return { success: false, message: 'Obra no encontrada o no autorizada para eliminar.' };
            }

            const urlObraToDelete = obraRows[0].url_obra; // Obtener la URL para devolverla

            const [result] = await connection.promise().query(
                'DELETE FROM obras WHERE id_obra = ? AND id_usuario = ?', 
                [idObra, userId]
            );

            if(result.affectedRows === 0) {
                
                return { success: false, message: 'Obra no encontrada o no autorizada para eliminar (ninguna fila afectada).' };
            }

            // Devolver la URL de la obra para que el controlador pueda eliminar el archivo físico
            return { success: true, message: 'Obra eliminada correctamente de la base de datos.', url_obra: urlObraToDelete };
        } catch(error) {
            console.error('Error en la función deleteObra del modelo:', error);
            throw error;
        }
    }
};

module.exports = obraModel; 