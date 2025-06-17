// models/obraModel.js

// Asegúrate de que esta ruta sea correcta para tu archivo de conexión a la base de datos
// 'pool' es un nombre más común y descriptivo para una conexión de pool de MySQL2
const pool = require('./db');

const obraModel = { 
    createObra: async (userId, idAlbum, urlObra, tituloObraOpcional = null, descripcionObra = null, precio = 0.00) => {
        try {
            const [result] = await pool.query( // Usar pool.query directamente si no es una transacción
                'INSERT INTO obras (id_usuario, id_album, url_obra, titulo_obra_opcional, descripcion_obra, precio) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, idAlbum, urlObra, tituloObraOpcional, descripcionObra, precio]
            );
            return result.insertId;
        } catch (error) {
            console.error('Error al crear obra:', error);
            throw error;
        }
    },

    getObrasByAlbumId: async (albumId) => {
        try {
            const [rows] = await pool.query(
                'SELECT id_obra, url_obra, titulo_obra_opcional, descripcion_obra, precio, fecha_subida_obra FROM obras WHERE id_album = ? ORDER BY fecha_subida_obra DESC',
                [albumId]
            );
            return rows;
        } catch (error) {
            console.error('Error al obtener obras por álbum:', error);
            throw error;
        }
    },

    getObraByIdAndUser: async (idObra, userId) => {
        try {
            const [rows] = await pool.query(
                'SELECT id_obra, url_obra, titulo_obra_opcional, descripcion_obra, precio FROM obras WHERE id_obra = ? AND id_usuario = ?',
                [idObra, userId]
            );
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('Error al obtener obra por ID y usuario:', error);
            throw error;
        }
    },

    getObraById: async (idObra) => {
        try {
            const [rows] = await pool.query('SELECT * FROM obras WHERE id_obra = ?', [idObra]);
            return rows[0] || null;
        } catch (error) {
            console.error('Error en obraModel.getObraById:', error);
            throw error;
        }
    },

    deleteObra: async (idObra, userId) => {
        let connectionFromPool; // Usamos un nombre diferente para evitar confusión con el 'connection' global

        try {
            // *** ¡INICIO DE LA TRANSACCIÓN! ***
            connectionFromPool = await pool.getConnection(); // Obtener una conexión del pool
            await connectionFromPool.beginTransaction(); // Iniciar la transacción

            // 1. Obtener la url_obra antes de eliminar el registro (dentro de la misma transacción)
            const [obraRows] = await connectionFromPool.query( // Usamos connectionFromPool.query
                'SELECT url_obra FROM obras WHERE id_obra = ? AND id_usuario = ?',
                [idObra, userId]
            );

            if (obraRows.length === 0) {
                await connectionFromPool.rollback(); // Si no se encuentra, hacer rollback
                console.warn(`[ObraModel] Intento de eliminación fallido: Obra ID ${idObra} no encontrada o no pertenece al usuario ${userId}.`);
                return { success: false, message: 'Obra no encontrada o no autorizada para eliminar.' };
            }

            const urlObraToDelete = obraRows[0].url_obra; // Obtener la URL para devolverla

            // 2. Eliminar la obra de la base de datos (dentro de la misma transacción)
            const [result] = await connectionFromPool.query( // Usamos connectionFromPool.query
                'DELETE FROM obras WHERE id_obra = ? AND id_usuario = ?', 
                [idObra, userId]
            );

            if (result.affectedRows === 0) {
                await connectionFromPool.rollback(); // Si no se afectaron filas, hacer rollback
                console.warn(`[ObraModel] Fallo al eliminar Obra ID ${idObra} de la DB a pesar de haberla encontrado inicialmente.`);
                return { success: false, message: 'Obra no encontrada o no autorizada para eliminar (ninguna fila afectada).' };
            }

            await connectionFromPool.commit(); // Confirmar la transacción si todo fue bien
            console.log(`[ObraModel] Obra ID ${idObra} eliminada de la DB por el usuario ${userId}. URL: ${urlObraToDelete}`);

            // Devolver la URL de la obra para que el controlador pueda eliminar el archivo físico
            return { success: true, message: 'Obra eliminada correctamente de la base de datos.', url_obra: urlObraToDelete };

        } catch(error) {
            // Si hay un error, intentar hacer rollback si la conexión existe y la transacción estaba activa
            if (connectionFromPool) {
                try {
                    await connectionFromPool.rollback();
                    console.warn('[ObraModel] Transacción de eliminación de obra revertida.');
                } catch (rollbackError) {
                    console.error('[ObraModel] Error al hacer rollback en deleteObra:', rollbackError);
                }
            }
            console.error('Error en la función deleteObra del modelo:', error);
            throw error; // Propagar el error para que el controlador lo maneje con un 500
        } finally {
            // Siempre liberar la conexión de vuelta al pool, si se obtuvo una
            if (connectionFromPool) {
                connectionFromPool.release();
            }
        }
    }
};

module.exports = obraModel;