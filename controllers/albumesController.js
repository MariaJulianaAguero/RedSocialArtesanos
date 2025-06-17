// controllers/albumesController.js
const albumModel = require('../models/albumModel'); // <--- ¡VERIFICA ESTA RUTA!
const imagenModel = require('../models/obraModel'); // <--- ¡VERIFICA ESTA RUTA!

const albumesController = {
    // [GET] /api/albumes - Obtener todos los álbumes del usuario autenticado
    getAlbums: async (req, res) => {
        try {
            const userId = req.session.usuario?.id_usuario;
            if (!userId) {
                return res.status(401).json({ message: 'No autenticado.' });
            }

            const albums = await albumModel.getAlbumsByUserId(userId);
            res.json(albums);
        } catch (error) {
            console.error('Error en getAlbums:', error);
            res.status(500).json({ message: 'Error interno del servidor al obtener álbumes.' });
        }
    },

    // [GET] /api/albumes/:id_album - Obtener detalles de un álbum específico y sus imágenes
    getAlbumDetails: async (req, res) => {
        try {
            const albumId = req.params.id_album;
            const userId = req.session.usuario.id_usuario;

            if (!userId) {
                return res.status(401).json({ message: 'No autenticado.' });
            }

            if (!albumId || isNaN(albumId)) {
                return res.status(400).json({ message: 'ID de álbum no válido.' });
            }

            const album = await albumModel.getAlbumDetails(albumId, userId);

            if (!album) {
                return res.status(404).json({ message: 'Álbum no encontrado o no pertenece al usuario.' });
            }

            res.json(album);
        } catch (error) {
            console.error('Error en getAlbumDetails:', error);
            res.status(500).json({ message: 'Error interno del servidor al obtener detalles del álbum.' });
        }
    },

    // [POST] /api/albumes - Crear un nuevo álbum
    createAlbum: async (req, res) => {
        try {
            const userId = req.session.usuario.id_usuario;
            if (!userId) {
                return res.status(401).json({ message: 'No autenticado.' });
            }

            const { titulo_album, tipo_album } = req.body; // tipo_album puede ser 'personal' o 'amistad'
            if (!titulo_album) {
                return res.status(400).json({ message: 'El título del álbum es requerido.' });
            }

            const albumId = await albumModel.createAlbum(userId, titulo_album, tipo_album);
            res.status(201).json({ message: 'Álbum creado correctamente.', id_album: albumId });
        } catch (error) {
            console.error('Error en createAlbum:', error);
            res.status(500).json({ message: 'Error interno del servidor al crear álbum.' });
        }
    },

    // [PUT] /api/albumes/:id_album - Actualizar un álbum
    updateAlbum: async (req, res) => {
        try {
            const albumId = req.params.id_album;
            const userId = req.session.usuario.id_usuario;
            if (!userId) {
                return res.status(401).json({ message: 'No autenticado.' });
            }

            if (!albumId || isNaN(albumId)) {
                return res.status(400).json({ message: 'ID de álbum no válido.' });
            }

            const { titulo_album, tipo_album } = req.body;
            if (!titulo_album) {
                return res.status(400).json({ message: 'El título del álbum es requerido.' });
            }

            const updated = await albumModel.updateAlbum(albumId, userId, titulo_album, tipo_album);
            if (updated) {
                res.json({ message: 'Álbum actualizado correctamente.' });
            } else {
                res.status(404).json({ message: 'Álbum no encontrado o no autorizado.' });
            }
        } catch (error) {
            console.error('Error en updateAlbum:', error);
            res.status(500).json({ message: 'Error interno del servidor al actualizar álbum.' });
        }
    },

    // [DELETE] /api/albumes/:id_album - Eliminar un álbum
    deleteAlbum: async (req, res) => {
        try {
            const albumId = req.params.id_album;
            const userId = req.session.usuario.id_usuario;
            if (!userId) {
                return res.status(401).json({ message: 'No autenticado.' });
            }

            if (!albumId || isNaN(albumId)) {
                return res.status(400).json({ message: 'ID de álbum no válido.' });
            }

            const deleted = await albumModel.deleteAlbum(albumId, userId);
            if (deleted) {
                // Gracias a ON DELETE SET NULL en la FK, las imágenes quedan sin álbum, no se borran.
                res.json({ message: 'Álbum eliminado correctamente.' });
            } else {
                res.status(404).json({ message: 'Álbum no encontrado o no autorizado.' });
            }
        } catch (error) {
            console.error('Error en deleteAlbum:', error);
            res.status(500).json({ message: 'Error interno del servidor al eliminar álbum.' });
        }
    }
};

module.exports = albumesController;