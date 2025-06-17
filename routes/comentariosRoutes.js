

const express = require('express');
const router = express.Router(); // Crea un nuevo objeto Router para manejar las rutas
const comentariosController = require('../controllers/comentariosController'); // Importa el controlador de comentarios
const estaAutenticado = require('../middlewares/autenticacion'); // Importa el middleware de autenticación

// Ruta para OBTENER todos los comentarios de una obra específica.
// GET /api/obras/:idObra/comentarios
// No requiere autenticación para leer, ya que los comentarios pueden ser públicos.
router.get('/obras/:idObra/comentarios', comentariosController.getComentariosByObra);

// Ruta para AGREGAR un nuevo comentario a una obra.
// POST /api/obras/:idObra/comentarios
// Requiere autenticación, ya que solo usuarios logueados pueden comentar.
router.post('/obras/:idObra/comentarios', estaAutenticado, comentariosController.addComentario);

// Ruta para ELIMINAR un comentario.
// DELETE /api/comentarios/:idComentario
// Requiere autenticación y el controlador verificará si el usuario es el autor.
router.delete('/comentarios/:idComentario', estaAutenticado, comentariosController.deleteComentario);


// Exporta el router para que pueda ser utilizado en server.js
module.exports = router;