
// controllers/imagenesController.js

// --- REQUERIMIENTOS ---
// Asegúrate de que estas rutas sean correctas según la ubicación de tus archivos.
const obraModel = require('../models/obraModel');
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

    // *** NUEVOS CAMPOS: descripcion_obra y precio si los vas a manejar desde el frontend ***
    // Si tu formulario de subida en perfil.ejs va a incluir estos campos:
    const descripcionObra = req.body.descripcion_obra || null; // Asegúrate de que el input en el frontend tenga name="descripcion_obra"
    const precio = req.body.precio ? parseFloat(req.body.precio) : 0.00; // Asegúrate de que el input en el frontend tenga name="precio"

    try {
        // Llama a la función del modelo para crear la entrada en la tabla 'obras'
        // ¡CAMBIO IMPORTANTE: Ahora se usa obraModel.createObra!
        const newObraId = await obraModel.createObra(
            usuarioId,
            idAlbum,
            nombreArchivo,
            tituloObraOpcional,
            descripcionObra, // Pasa la descripción
            precio // Pasa el precio
        );

        // Envía una respuesta JSON exitosa al frontend
        res.status(201).json({
            message: 'Obra subida y registrada correctamente.', // Mensaje actualizado
            url: `/obras/${nombreArchivo}`, // URL pública para acceder a la obra (asumiendo que las obras se servirán desde /public/obras o similar)
            id_obra: newObraId, // ID de la nueva obra (antes id_imagen)
            id_album: idAlbum // Confirma el ID del álbum al que se asoció (o null)
        });

    } catch (error) {
        console.error('Error al subir obra y registrar en la base de datos:', error);
        // Si hay un error en la base de datos, intenta eliminar el archivo físico subido por Multer
        // para evitar archivos "huérfanos".
        // La ruta del archivo es req.file.path (ej: public/uploads/nombre.jpg)
        fs.unlink(req.file.path, (err) => {
            if (err) console.error('Error al eliminar archivo fallido del servidor:', err);
        });
        res.status(500).json({ message: 'Error interno del servidor al procesar la obra.' });
    }
};

// Función para eliminar una imagen
// Espera el nombre del archivo en los parámetros de la URL (req.params.filename)
// y requiere que el usuario esté autenticado y sea el dueño de la imagen.
exports.eliminarObra = async (req, res) => { // ¡CAMBIO DE NOMBRE DE FUNCIÓN!
    // Ahora obtenemos el ID de la obra de los parámetros de la URL
    const idObra = req.params.idObra; // Asegúrate de que tu ruta sea '/api/obras/:idObra'
    const userId = req.session.userId; // Asegúrate de que 'userId' es la clave correcta en tu sesión

    if (!userId) {
        return res.status(401).json({ message: 'No autorizado. Debes iniciar sesión para eliminar obras.' });
    }

    if (!idObra) {
        return res.status(400).json({ message: 'ID de obra no proporcionado para la eliminación.' });
    }

    try {
        // Llama a la función del modelo para eliminar la obra de la base de datos y obtener la URL del archivo
        // El modelo debe devolver la URL del archivo para que el controlador lo elimine del disco
        const result = await obraModel.deleteObra(idObra, userId); // ¡CAMBIO IMPORTANTE!

        if (result.success) {
            // Si la eliminación de la DB fue exitosa, procede a eliminar el archivo físico
            if (result.url_obra) { // Asegúrate de que el modelo devuelva la URL
                const filePath = `./public/uploads/${result.url_obra}`; // Ajusta esta ruta a donde Multer guarda los archivos
                fs.unlink(filePath, (err) => {
                    if (err) {
                        console.error(`Error al eliminar archivo físico ${filePath}:`, err);
                        // Aunque falle la eliminación física, la entrada de la DB ya se eliminó,
                        // así que la operación lógica fue exitosa. Podrías registrar este error.
                    }
                    // No es crítico para la respuesta al cliente si la DB se actualizó
                });
            }
            res.json({ message: result.message }); // Éxito en la eliminación
        } else {
            // Error si la obra no se encontró o el usuario no está autorizado
            res.status(404).json({ message: result.message });
        }
    } catch (error) {
        console.error('Error en la función eliminarObra del controlador:', error);
        res.status(500).json({ message: 'Error interno del servidor al eliminar la obra.' });
    }
};

// --- EXPORTACIONES ---
// Exporta las funciones que deseas usar en tus rutas
module.exports = {
    // Si tu Multer 'upload' se configura aquí y lo usas en las rutas, también expórtalo:
    upload, // Asumo que 'upload' está definido en alguna parte de este archivo o importado
    subirImagen: exports.subirImagen, // Mantengo el nombre del key, pero la función se refiere a obras
    eliminarObra: exports.eliminarObra // ¡CAMBIO IMPORTANTE!
};

