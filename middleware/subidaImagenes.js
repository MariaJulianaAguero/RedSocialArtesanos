const multer = require('multer');
const path = require('path');

// Configuración del almacenamiento
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/imagenes');  // Carpeta donde se guardan las imágenes
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const nombreUnico = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
    cb(null, nombreUnico);
  }
});

// Filtro para aceptar solo imágenes
const fileFilter = (req, file, cb) => {
  const tiposPermitidos = /jpeg|jpg|png|gif/;
  const ext = path.extname(file.originalname).toLowerCase();

  if (tiposPermitidos.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes'));
  }
};

// Middleware multer con configuración
const subidaImagenes = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }  // Límite 5MB
});

module.exports = subidaImagenes;