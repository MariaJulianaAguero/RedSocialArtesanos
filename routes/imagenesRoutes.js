const express = require('express');
const router = express.Router();
const subidaImagenes = require('../middlewares/subidaImagenes');
const db = require('../models/db'); // Asegurate de tener la conexión

// Middleware de autenticación (suponemos que req.session.usuario_id está)
router.post('/subir', subidaImagenes.single('imagen'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No se ha subido ninguna imagen');
  }

  const urlImagen = req.file.filename;
  const usuarioId = req.session.usuario_id;  // O como guardes el id de usuario logueado

  try {
    await db.query(
      'INSERT INTO imagenes (usuario_id, archivo, fecha_subida) VALUES (?, ?, NOW())',
      [usuarioId, urlImagen]
    );
    res.json({ mensaje: 'Imagen subida y guardada correctamente', url: urlImagen });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al guardar en la base de datos');
  }
});

module.exports = router;

