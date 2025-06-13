
// controllers/imagenesController.js

// --- REQUERIMIENTOS ---
// Asegúrate de que estas rutas sean correctas según la ubicación de tus archivos.
const imagenModel = require('../models/imagenModel'); // Modelo para interactuar con la tabla 'imagenes'
const path = require('path'); // Para manejar rutas de archivos
const fs = require('fs');     // Para interactuar con el sistema de archivos (eliminar archivos)

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
    // req.file es proporcionado por Multer después de la subida
    if (!req.file) {
        return res.status(400).json({ message: 'No se recibió ninguna imagen.' });
    }

    // Asegúrate de que 'userId' es la clave correcta en tu sesión
    const usuarioId = req.session.userId;
    if (!usuarioId) {
        // Si no hay un usuario autenticado, no se puede subir la imagen
        return res.status(401).json({ message: 'No autorizado. Debes iniciar sesión para subir imágenes.' });
    }

    const nombreArchivo = req.file.filename; // Nombre del archivo generado por Multer
    const tituloObraOpcional = req.body.titulo_obra_opcional || null; // Título opcional, si se envía desde el frontend
    const idAlbum = req.body.id_album || null; // ID del álbum, si se envía desde el frontend (puede ser null)

    try {
        // Llama a la función del modelo para crear la entrada en la tabla 'imagenes'
        const newImageId = await imagenModel.createImage(usuarioId, nombreArchivo, tituloObraOpcional, idAlbum);

        // Envía una respuesta JSON exitosa al frontend
        res.status(201).json({
            message: 'Imagen subida y registrada correctamente.',
            url: `/imagenes/${nombreArchivo}`, // URL pública para acceder a la imagen
            id_imagen: newImageId,
            id_album: idAlbum // Confirma el ID del álbum al que se asoció (o null)
        });

    } catch (error) {
        console.error('Error al subir imagen y registrar en la base de datos:', error);
        // Si hay un error en la base de datos, intenta eliminar el archivo físico subido por Multer
        // para evitar archivos "huérfanos".
        fs.unlink(req.file.path, (err) => {
            if (err) console.error('Error al eliminar archivo fallido del servidor:', err);
        });
        res.status(500).json({ message: 'Error interno del servidor al procesar la imagen.' });
    }
};

// Función para eliminar una imagen
// Espera el nombre del archivo en los parámetros de la URL (req.params.filename)
// y requiere que el usuario esté autenticado y sea el dueño de la imagen.
exports.eliminarImagen = async (req, res) => {
    const filename = req.params.filename; // Obtiene el nombre del archivo de la URL
    const userId = req.session.userId; // Asegúrate de que 'userId' es la clave correcta en tu sesión

    if (!userId) {
        return res.status(401).json({ message: 'No autorizado. Debes iniciar sesión para eliminar imágenes.' });
    }

    if (!filename) {
        return res.status(400).json({ message: 'Nombre de archivo no proporcionado para la eliminación.' });
    }

    try {
        // Llama a la función del modelo para eliminar la imagen de la base de datos y del disco
        const result = await imagenModel.deleteImage(filename, userId);

        if (result.success) {
            res.json({ message: result.message }); // Éxito en la eliminación
        } else {
            // Error si la imagen no se encontró o el usuario no está autorizado
            res.status(404).json({ message: result.message });
        }
    } catch (error) {
        console.error('Error en la función eliminarImagen del controlador:', error);
        res.status(500).json({ message: 'Error interno del servidor al eliminar la imagen.' });
    }
};

// --- EXPORTACIONES ---
// Exporta las funciones que deseas usar en tus rutas
module.exports = {
    // Si tu Multer 'upload' se configura aquí y lo usas en las rutas, también expórtalo:
    upload, // Exporta la instancia de Multer para usarla en las rutas
    subirImagen: exports.subirImagen,
    eliminarImagen: exports.eliminarImagen
};

