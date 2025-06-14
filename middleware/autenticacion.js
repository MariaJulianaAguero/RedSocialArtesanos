

function estaAutenticado(req, res, next) {
    // Verifica si hay un objeto 'usuario' en la sesión y si tiene un 'id_usuario'.
    // Esto significa que el usuario ha iniciado sesión.
    if (req.session.usuario && req.session.usuario.id_usuario) {
        // Si el usuario está autenticado, permite que la solicitud continúe
        // a la siguiente función de middleware o a la ruta final.
        next();
    } else {
        // Si el usuario NO está autenticado:

        // Primero, verificamos si la solicitud es para una página HTML.
        // Esto es típico cuando un usuario escribe una URL en el navegador
        // o hace clic en un enlace a una página protegida.
        if (req.accepts('html')) {
            console.log('[AUTENTICACION] Redirigiendo a /login: Solicitud HTML sin autenticar.');
            // Redirige al usuario a la página de inicio de sesión.
            // Es importante usar 'return' para detener la ejecución de esta función aquí.
            return res.redirect('/login');
        }

        // Si la solicitud no es para HTML, verificamos si es para JSON.
        // Esto es común para llamadas a API hechas desde JavaScript (fetch, axios, etc.)
        // o desde herramientas como Postman.
        if (req.accepts('json')) {
            console.log('[AUTENTICACION] Enviando JSON 401: Solicitud JSON sin autenticar.');
            // Envía una respuesta de estado 401 (No autorizado) con un mensaje JSON.
            // Es importante usar 'return' para detener la ejecución.
            return res.status(401).json({ message: 'No autenticado. Por favor, inicia sesión.' });
        }

        // Como última opción (fallback), si no es ni HTML ni JSON,
        // simplemente enviamos una respuesta de texto simple 401.
        console.log('[AUTENTICACION] Enviando 401 genérico: Solicitud no reconocida sin autenticar.');
        res.status(401).send('No autenticado.');
    }
}

// Exporta la función 'estaAutenticado' para que pueda ser importada
// y utilizada en tu archivo 'server.js' como un middleware.
module.exports = {
    estaAutenticado
};