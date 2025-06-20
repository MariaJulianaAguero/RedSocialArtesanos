// routes/albumesRoutes.js
const express = require('express');
const router = express.Router(); 
const albumesController = require('../controllers/albumesController'); 
const estaAutenticado = require('../middlewares/autenticacion'); // <-- ¡SIN LLAVES {}!

// --- RUTAS DE ÁLBUMES ---

// [GET] /api/albumes
// Obtener todos los álbumes del usuario autenticado
router.get('/', estaAutenticado, albumesController.getAlbums);

// [GET] /api/albumes/:id_album
// Obtener los detalles de un álbum específico (y sus imágenes)
router.get('/:id_album', estaAutenticado, albumesController.getAlbumDetails);

// [POST] /api/albumes
// Crear un nuevo álbum
router.post('/', estaAutenticado, albumesController.createAlbum);

// [PUT] /api/albumes/:id_album
// Actualizar un álbum existente
router.put('/:id_album', estaAutenticado, albumesController.updateAlbum);

// [DELETE] /api/albumes/:id_album
// Eliminar un álbum
router.delete('/:id_album', estaAutenticado, albumesController.deleteAlbum);

module.exports = router; // Exporta el router para que server.js pueda usarlo