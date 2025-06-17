
// controllers/imagenesController.js

// --- REQUERIMIENTOS ---
// Asegúrate de que estas rutas sean correctas según la ubicación de tus archivos.
const obraModel = require('../models/obraModel');
const fs = require('fs').promises; 
const path = require('path'); // Para manejar rutas de archivos
   

// --- CONFIGURACIÓN DE MULTER ---
// Si tu configuración de Multer (el 'storage' y el 'upload') está en este archivo,
// asegúrate de que esté aquí. Si está en un archivo separado (ej. 'middleware/multerConfig.js'),
// entonces aquí solo necesitarías importarlo, por ejemplo:
// const upload = require('../middleware/multerConfig');

// EJEMPLO de configuración de Multer si está en este mismo archivo:
const multer = require('multer');
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // La carpeta donde se guardarán las imágenes
        cb(null, path.join(__dirname, '../public/imagenes')); // Asegúrate de que esta ruta sea correcta
    },
    filename: (req, file, cb) => {
        // Genera un nombre único para el archivo
        const ext = path.extname(file.originalname); // Extensión original del archivo
        const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
        cb(null, filename);
    }
});
const upload = multer({ storage: storage });


// --- FUNCIONES DEL CONTROLADOR ---

// Función para subir una sola imagen
// Esta función ahora espera un id_album en el cuerpo de la solicitud (req.body.id_album)
// y lo usa para vincular la imagen al álbum.
exports.subirImagen = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No se recibió ninguna imagen.' });
    }

    // CORRECCIÓN 1: Usar req.session.usuario.id_usuario según tus logs de autenticación
    const usuarioId = req.session.usuario?.id_usuario; // Acceso seguro con optional chaining
    if (!usuarioId) {
        return res.status(401).json({ message: 'No autorizado. Debes iniciar sesión para subir imágenes.' });
    }

    // CORRECCIÓN 2: Construir la url_obra correctamente con el prefijo /imagenes/
    const urlObraParaDB = '/imagenes/' + req.file.filename; // <-- ¡ESTA ES LA CLAVE!

    const tituloObraOpcional = req.body.titulo_obra_opcional || null;
    const idAlbum = req.body.id_album || null;

    const descripcionObra = req.body.descripcion_obra || null;

    // CORRECCIÓN 3: Manejo de precio. Si es un string vacío, hazlo 0.00 o null.
    // parseFloat convierte '' a NaN, por eso la verificación.
    const precio = req.body.precio ? parseFloat(req.body.precio) : 0.00;
    // Si prefieres que sea NULL si no se ingresa nada:
    // const precio = req.body.precio ? parseFloat(req.body.precio) : null;


    try {
        const newObraId = await obraModel.createObra(
            usuarioId,
            idAlbum,
            urlObraParaDB, // <-- ¡PASAR LA URL CORREGIDA AL MODELO!
            tituloObraOpcional,
            descripcionObra,
            precio
        );

        res.status(201).json({
            message: 'Obra subida y registrada correctamente.',
            url: urlObraParaDB, // Devolver la URL correcta al frontend para que la use si es necesario
            id_obra: newObraId,
            id_album: idAlbum
        });

    } catch (error) {
        console.error('Error al subir obra y registrar en la base de datos:', error);
        fs.unlink(req.file.path, (err) => {
            if (err) console.error('Error al eliminar archivo fallido del servidor:', err);
        });
        res.status(500).json({ message: 'Error interno del servidor al procesar la obra.' });
    }
};

// controllers/obrasController.js (parte del archivo, no el archivo completo)

exports.subirObra = async (req, res) => {
    console.log('[BACKEND DEBUG - obrasController] Entrando a subirObra en el controlador.');
    console.log('[BACKEND DEBUG - obrasController] req.file (desde Multer):', req.file);
    console.log('[BACKEND DEBUG - obrasController] req.body (desde Multer):', req.body);

    const usuarioId = req.session.usuario ? req.session.usuario.id_usuario : null;

    // --- Validación inicial de usuario y archivo ---
    if (!usuarioId) {
        if (req.file) {
            try {
                await fs.unlink(req.file.path);
                console.warn(`[BACKEND DEBUG] Archivo ${req.file.path} eliminado debido a falta de usuario autenticado.`);
            } catch (unlinkErr) {
                console.error(`[BACKEND ERROR] Fallo al eliminar archivo ${req.file.path} (sin autenticación):`, unlinkErr);
            }
        }
        return res.status(401).json({ success: false, message: 'No autorizado. Debes iniciar sesión para subir obras.' });
    }

    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No se recibió ninguna imagen de obra. Asegúrate de seleccionar un archivo.' });
    }
    // --- FIN Validación inicial ---

    // --- Aquí comienza el bloque de código que preguntaste ---
    const { titulo_obra_opcional, id_album, descripcion_obra, precio } = req.body;
    const nombreArchivo = req.file.filename;

    // Calcula el precio numérico aquí
    const precioNumerico = precio ? parseFloat(precio) : 0.00;

    try {
        // Llama a la función del modelo para insertar la obra
        const newObraId = await obraModel.createObra(
            usuarioId,
            id_album || null, // Pasa null si no hay id_album
            nombreArchivo,
            titulo_obra_opcional || null, // Pasa null si no hay título opcional
            descripcion_obra || null, // Pasa null si no hay descripción
            precioNumerico
        );

        console.log('[BACKEND DEBUG - obrasController] Obra creada exitosamente en BD con ID:', newObraId);

        res.status(201).json({
            success: true,
            message: 'Obra subida y registrada correctamente.',
            id_obra: newObraId,
            url_obra: nombreArchivo, // Puedes devolver solo el nombre del archivo
            titulo_obra_opcional: titulo_obra_opcional,
            descripcion_obra: descripcion_obra,
            precio: precioNumerico,
            fecha_subida_obra: new Date().toISOString()
        });

    } catch (error) {
        console.error('[BACKEND ERROR - obrasController] Error al subir obra y registrar en la base de datos:', error);

        // Si hay un error al insertar en la DB, elimina el archivo que Multer ya guardó
        if (req.file) {
            try {
                await fs.unlink(req.file.path);
                console.log(`[BACKEND DEBUG] Archivo ${req.file.path} eliminado debido a error en DB.`);
            } catch (unlinkError) {
                console.error('[BACKEND ERROR] Error al eliminar archivo de obra fallido del servidor:', unlinkError);
            }
        }
        res.status(500).json({ success: false, message: 'Error interno del servidor al procesar la obra.' });
    }
}; // Fin de exports.subirObra

// Asegúrate de que tu función 'eliminarObra' también importe 'fs.promises' y 'path'
// y use 'url_obra' correctamente. Debería ser similar a esto:
exports.eliminarObra = async (req, res) => {
    const { idObra } = req.params;
    const userId = req.session.usuario?.id_usuario;

    if (!userId) {
        return res.status(401).json({ success: false, message: 'No autenticado.' });
    }
    if (!idObra) {
        return res.status(400).json({ success: false, message: 'ID de obra no proporcionado.' });
    }

    try {
        const result = await obraModel.deleteObra(idObra, userId);

        if (result.success) {
            if (result.url_obra) {
                const filePath = path.join(__dirname, '..', 'public', 'imagenes', result.url_obra);
                try {
                    await fs.unlink(filePath);
                    console.log(`[BACKEND DEBUG] Archivo físico ${filePath} eliminado.`);
                } catch (fileError) {
                    console.warn(`[BACKEND WARNING] No se pudo eliminar el archivo físico ${filePath}:`, fileError.message);
                }
            }
            res.status(200).json({ success: true, message: result.message });
        } else {
            res.status(result.message.includes('encontrada') ? 404 : 403).json({ success: false, message: result.message });
        }
    } catch (error) {
        console.error('[BACKEND ERROR] Error en eliminarObra del controlador:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al intentar eliminar la obra.' });
    }
};




module.exports = {
    upload,
    subirImagen: exports.subirImagen,
    subirObra: exports.subirObra, 
    eliminarObra: exports.eliminarObra
};
