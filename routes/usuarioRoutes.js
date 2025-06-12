const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const db = require('../models/db');  // Agregamos la conexión a la base

// Ruta para ver el perfil con EJS
router.get('/vista', verificarAutenticacion, usuarioController.vistaPerfil);


// Ruta de login (simulada)
router.post('/login', (req, res) => {
    const { username } = req.body;

    const sql = `SELECT * FROM usuarios WHERE username = ?`;

    db.query(sql, [username], (err, resultados) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Error interno');
        }

        if (resultados.length === 0) {
            return res.status(401).send('Usuario no encontrado');
        }

        const usuario = resultados[0];
        req.session.usuarioId = usuario.id;

        res.redirect('/usuario/vista');
    });
});

module.exports = router;


