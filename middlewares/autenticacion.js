// middleware/autenticacion.js
function estaAutenticado(req, res, next) {
    console.log('[AUTENTICACION DEBUG] =====================================');
    console.log('[AUTENTICACION DEBUG] Solicitud para URL:', req.originalUrl);
    console.log('[AUTENTICACION DEBUG] req.session:', req.session);
    console.log('[AUTENTICACION DEBUG] req.session.usuario:', req.session.usuario);
    console.log('[AUTENTICACION DEBUG] req.session.usuario?.id_usuario:', req.session.usuario?.id_usuario); // Usando optional chaining

    if (req.session.usuario && req.session.usuario.id_usuario) {
        console.log('[AUTENTICACION DEBUG] Usuario autenticado:', req.session.usuario.id_usuario);
        next();
    } else {
        console.log('[AUTENTICACION DEBUG] Usuario NO autenticado.');
        if (req.accepts('html')) {
            console.log('[AUTENTICACION] Redirigiendo a /login: Solicitud HTML sin autenticar.');
            return res.redirect('/login');
        }
        if (req.accepts('json')) {
            console.log('[AUTENTICACION] Enviando JSON 401: Solicitud JSON sin autenticar.');
            return res.status(401).json({ message: 'No autenticado. Por favor, inicia sesión.' });
        }
        console.log('[AUTENTICACION] Enviando 401 genérico: Solicitud no reconocida sin autenticar.');
        res.status(401).send('No autenticado.');
    }
    console.log('[AUTENTICACION DEBUG] =====================================');
}

module.exports = estaAutenticado; // <-- Exporta la función directamente