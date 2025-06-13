// models/imagenModel.js
const connection = require('../conexion_bd'); // <--- ¡VERIFICA ESTA RUTA!
const path = require('path');
const fs = require('fs');

const imagenModel = {
    // Inserta una nueva imagen en la tabla 'imagenes'
    createImage: async (userId, urlObra, tituloObraOpcional = null, idAlbum = null) => {
        try {
            const [result] = await connection.promise().query(
                'INSERT INTO imagenes (id_usuario, url_obra, titulo_obra_opcional, id_album) VALUES (?, ?, ?, ?)',
                [userId, urlObra, tituloObraOpcional, idAlbum]
            );
            return result.insertId; // Retorna el ID de la nueva imagen
        } catch (error) {
            console.error('Error al crear imagen:', error);
            throw error;
        }
    },

    // Obtener imágenes por ID de álbum
    getImagesByAlbumId: async (albumId) => {
        try {
            const [rows] = await connection.promise().query(
                'SELECT id_imagen, url_obra, titulo_obra_opcional, fecha_subida FROM imagenes WHERE id_album = ? ORDER BY fecha_subida DESC',
                [albumId]
            );
            return rows;
        } catch (error) {
            console.error('Error al obtener imágenes por álbum:', error);
            throw error;
        }
    },

    // Obtener una imagen específica por su filename (url_obra) y id_usuario
    getImageByFilenameAndUser: async (filename, userId) => {
        try {
            const [rows] = await connection.promise().query(
                'SELECT id_imagen, url_obra FROM imagenes WHERE url_obra = ? AND id_usuario = ?',
                [filename, userId]
            );
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('Error al obtener imagen por nombre de archivo y usuario:', error);
            throw error;
        }
    },

    // Eliminar una imagen de la base de datos y del sistema de archivos
    deleteImage: async (filename, userId) => {
        try {
            // Eliminar de la base de datos
            const [result] = await connection.promise().query(
                'DELETE FROM imagenes WHERE url_obra=? AND id_usuario=?',
                [filename, userId]
            );

            if(result.affectedRows === 0) {
                return { success: false, message: 'Imagen no encontrada o no autorizada para eliminar.' };
            }

            // Eliminar el archivo físico
            // Asegúrate de que esta ruta sea correcta desde la ubicación de imagenModel.js
            const filePath = path.join(__dirname, '../public', 'imagenes', filename);
            fs.unlink(filePath, err => {
                if (err) {
                    console.error('Error al eliminar archivo físico:', err);
                    // Decide si quieres relanzar el error o simplemente loguearlo
                    // throw new Error('Error al eliminar archivo físico del disco.');
                }
            });

            return { success: true, message: 'Imagen eliminada correctamente.' };
        } catch(error) {
            console.error('Error en la función deleteImage del modelo:', error);
            throw error;
        }
    }
};

module.exports = imagenModel;