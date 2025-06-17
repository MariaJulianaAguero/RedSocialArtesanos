const pool = require('../conexion_bd');

const albumModel = {
    // Crear un nuevo álbum
    createAlbum: async (userId, tituloAlbum, tipoAlbum = 'personal') => {
        try {
            const [result] = await pool.query(
                'INSERT INTO albumes (id_usuario, titulo_album, tipo_album) VALUES (?, ?, ?)',
                [userId, tituloAlbum, tipoAlbum]
            );
            return result.insertId; // Retorna el ID del nuevo álbum creado
        } catch (error) {
            console.error('Error al crear álbum:', error);
            throw error;
        }
    },

    // Obtener todos los álbumes de un usuario
    getAlbumsByUserId: async (userId) => {
        try {
            const [rows] = await pool.query(
                `SELECT
                    a.id_album,
                    a.titulo_album,
                    a.fecha_creacion_album,
                    a.tipo_album,
                    (SELECT url_obra FROM imagenes WHERE id_album = a.id_album ORDER BY fecha_subida LIMIT 1) AS url_portada_album
                FROM albumes a
                WHERE a.id_usuario = ?
                ORDER BY a.fecha_creacion_album DESC`,
                [userId]
            );
            return rows;
        } catch (error) {
            console.error('Error al obtener álbumes por usuario:', error);
            throw error;
        }
    },

    // Obtener un álbum específico y sus imágenes
    getAlbumDetails: async (albumId, userId) => {
        try {
            // Primero, obtener los detalles del álbum y verificar que pertenezca al usuario
            const [albumRows] = await pool.query(
                'SELECT id_album, titulo_album, fecha_creacion_album, tipo_album FROM albumes WHERE id_album = ? AND id_usuario = ?',
                [albumId, userId]
            );

            if (albumRows.length === 0) {
                return null; // Álbum no encontrado o no pertenece al usuario
            }

            const album = albumRows[0];

            // Luego, obtener todas las imágenes asociadas a este álbum
            // Nota: Se asume que 'imagenes' tiene id_album ahora
            const [imagenesRows] = await pool.query(
                'SELECT id_imagen, url_obra, titulo_obra_opcional, fecha_subida FROM imagenes WHERE id_album = ? ORDER BY fecha_subida DESC',
                [albumId]
            );

            album.imagenes = imagenesRows; // Agrega las imágenes al objeto del álbum

            return album;
        } catch (error) {
            console.error('Error al obtener detalles del álbum:', error);
            throw error;
        }
    },

    // Actualizar un álbum
    updateAlbum: async (albumId, userId, newTitle, newType) => {
        try {
            const [result] = await pool.query(
                'UPDATE albumes SET titulo_album = ?, tipo_album = ? WHERE id_album = ? AND id_usuario = ?',
                [newTitle, newType, albumId, userId]
            );
            return result.affectedRows > 0; // Retorna true si se actualizó, false si no
        } catch (error) {
            console.error('Error al actualizar álbum:', error);
            throw error;
        }
    },

    // Eliminar un álbum
    deleteAlbum: async (albumId, userId) => {
        try {
            // Nota: ON DELETE SET NULL en la FK de `imagenes` se encargará de las imágenes.
            // Si el álbum se elimina, su `id_album` en la tabla `imagenes` se pone a NULL.
            const [result] = await pool.query(
                'DELETE FROM albumes WHERE id_album = ? AND id_usuario = ?',
                [albumId, userId]
            );
            return result.affectedRows > 0; // Retorna true si se eliminó, false si no
        } catch (error) {
            console.error('Error al eliminar álbum:', error);
            throw error;
        }
    }
};

module.exports = albumModel;