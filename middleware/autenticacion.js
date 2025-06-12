function estaAutenticado(req, res, next) {
  if (req.session && req.session.userId) {
    // El usuario está autenticado, dejamos seguir
    next();
  } else {
    // No está autenticado, respondemos con error 401
    res.status(401).json({ message: 'No autenticado. Por favor, inicia sesión.' });
  }
}

module.exports = { estaAutenticado };
