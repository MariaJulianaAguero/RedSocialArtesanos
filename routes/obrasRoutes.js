// routes/obrasRoutes.js
const express = require('express');
const router = express.Router();

// Middleware para verificar autenticación, asegúrate de que la ruta sea correcta
const estaAutenticado = require('../middlewares/autenticacion');

// Middleware de Multer para la subida de imágenes
const uploadImageMiddleware = require('../middlewares/subidaObras');

// Importa el controlador de obras (¡esto es clave!)
const obrasController = require('../controllers/obrasController');

// Ruta para subir una obra
router.post('/subir',
    // Middleware de depuración: verifica si la solicitud llega a esta ruta
    (req, res, next) => {
        console.log('[BACKEND DEBUG - obrasRoutes] Iniciando procesamiento de subida de obra...');
        console.log(`[BACKEND DEBUG - obrasRoutes] Método de solicitud: ${req.method}`);
        console.log(`[BACKEND DEBUG - obrasRoutes] Content-Type de la solicitud: ${req.headers['content-type']}`);
        next(); // ¡IMPORTANTE! Pasa el control al siguiente middleware (estaAutenticado)
    },
    estaAutenticado, // Primero autentica al usuario
    uploadImageMiddleware.single('imagenObra'), // Luego Multer procesa la imagen
    obrasController.subirObra 
);

// Agrega aquí otras rutas relacionadas con obras (eliminar, editar, etc.)
router.delete('/eliminar/:idObra', estaAutenticado, obrasController.eliminarObra); 

module.exports = router;