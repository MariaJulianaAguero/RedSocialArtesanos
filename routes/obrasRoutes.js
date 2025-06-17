const express = require('express');
const router = express.Router();
const pool = require('../conexion_bd');
const fs = require('fs').promises; // Para eliminar el archivo si la DB falla

// Middleware para verificar autenticación, asegúrate de que la ruta sea correcta
const estaAutenticado = require('../middlewares/autenticacion');

// Middleware de Multer para la subida de imágenes
const uploadImageMiddleware = require('../middlewares/subidaObras')

// Ruta para subir una obra
router.post('/subir',
    // Middleware de depuración: verifica si la solicitud llega a esta ruta
    (req, res, next) => {
        console.log('[BACKEND DEBUG - obrasRoutes] Iniciando procesamiento de subida de obra...');
        console.log(`[BACKEND DEBUG - obrasRoutes] Método de solicitud: ${req.method}`);
        console.log(`[BACKEND DEBUG - obrasRoutes] Content-Type de la solicitud: ${req.headers['content-type']}`);
        next(); // ¡IMPORTANTE! Pasa el control al siguiente middleware (estaAutenticado)
    },
    estaAutenticado,
    uploadImageMiddleware.single('imagenObra'), // Multer espera un campo llamado 'imagenObra'
    async (req, res) => {
        // Este log se ejecutará si Multer procesa el archivo sin errores
        console.log('[BACKEND DEBUG - obrasRoutes] Middleware Multer ejecutado. req.file:', req.file);
        console.log('[BACKEND DEBUG - obrasRoutes] Datos del formulario (req.body):', req.body);

        // Obtiene el ID del usuario de la sesión (establecido por estaAutenticado)
        const usuarioId = req.session.usuario ? req.session.usuario.id_usuario : null;
        if (!usuarioId) {
            // Esto no debería ocurrir si estaAutenticado funciona correctamente
            return res.status(401).json({ message: 'No autorizado. Debes iniciar sesión para subir obras.' });
        }

        // Verifica si Multer subió un archivo
        if (!req.file) {
            // Este error puede indicar problemas con el Content-Type o el 'name' del input
            return res.status(400).json({ message: 'No se recibió ninguna imagen de obra. Asegúrate de seleccionar un archivo.' });
        }

        const nombreArchivo = req.file.filename;
        const { titulo_obra_opcional, id_album, descripcion_obra, precio } = req.body;
        const precioNumerico = precio ? parseFloat(precio) : 0.00; // Asegura que el precio sea numérico

        try {
            // Insertar la obra en la base de datos
            const [result] = await pool.execute(
                'INSERT INTO obras (id_usuario, id_album, url_obra, titulo_obra_opcional, descripcion_obra, precio) VALUES (?, ?, ?, ?, ?, ?)',
                [usuarioId, id_album || null, nombreArchivo, titulo_obra_opcional || null, descripcion_obra || null, precioNumerico]
            );

            console.log('[BACKEND DEBUG - obrasRoutes] Obra subida y registrada en BD con ID:', result.insertId);

            res.status(201).json({
                message: 'Obra subida y registrada correctamente.',
                url_obra: nombreArchivo,
                id_obra: result.insertId,
                id_album: id_album,
                titulo_obra_opcional: titulo_obra_opcional,
                descripcion_obra: descripcion_obra,
                precio: precioNumerico,
                fecha_subida_obra: new Date().toISOString() // Envía la fecha actual para actualización del frontend
            });

        } catch (error) {
            console.error('[BACKEND ERROR - obrasRoutes] Error al subir obra y registrar en la base de datos:', error);

            // Si hay un error en la DB, elimina el archivo que Multer ya guardó
            if (req.file) {
                try {
                    await fs.unlink(req.file.path);
                    console.log(`[BACKEND DEBUG - obrasRoutes] Archivo ${req.file.path} eliminado debido a error en DB.`);
                } catch (unlinkError) {
                    console.error('[BACKEND ERROR - obrasRoutes] Error al eliminar archivo de obra fallido del servidor:', unlinkError);
                }
            }
            res.status(500).json({ message: 'Error interno del servidor al procesar la obra.' });
        }
    }
);

// Agrega aquí otras rutas relacionadas con obras (eliminar, editar, etc.)
router.delete('/eliminar/:id', estaAutenticado, async (req, res) => {
    // ... tu lógica existente para eliminar obra ...
});

module.exports = router;