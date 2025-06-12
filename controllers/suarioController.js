const db = require('../models/db');

exports.vistaPerfil = (req, res) => {
    const usuarioId = req.session.usuarioId;

    if (!usuarioId) {
        return res.redirect('/login.html');  // o la ruta donde tengas el login
    }

    const sqlUsuario = `SELECT * FROM usuarios WHERE id = ?`;
    const sqlAlbumes = `SELECT * FROM albumes WHERE id_usuario = ?`;

    db.query(sqlUsuario, [usuarioId], (err, usuarioResult) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Error interno al buscar usuario');
        }

        db.query(sqlAlbumes, [usuarioId], (err, albumesResult) => {
            if (err) {
                console.log(err);
                return res.status(500).send('Error interno al buscar álbumes');
            }

            res.render('perfil', {
                usuario: usuarioResult[0],
                albumes: albumesResult
            });
        });
    });
};


