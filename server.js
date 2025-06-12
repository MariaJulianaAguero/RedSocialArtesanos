require('dotenv').config(); // Carga las variables de entorno

const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs'); // Para hashear contraseñas de forma segura
const path = require('path'); // Módulo para trabajar con rutas de archivos
const session = require('express-session'); // <--- AÑADIDO: Importa express-session

const { estaAutenticado } = require('./middleware/autenticacion');
const app = express();
const port = process.env.PORT || 3000; // Puedes configurar el puerto en .env (ej. PORT=3000)

// <--- AÑADIDO: Configuración del middleware de sesión
app.use(session({
    secret: process.env.SESSION_SECRET || 'mi_secreto_super_seguro',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24
    }
}));


// Middleware para parsear el cuerpo de las solicitudes (JSON y URL-encoded)
app.use(express.json()); // Para solicitudes con body en formato JSON
app.use(express.urlencoded({ extended: true })); // Para solicitudes con body en formato URL-encoded (formularios HTML)

// Middleware para servir archivos estáticos (tu frontend)
// Esto hace que la carpeta 'public' sea accesible desde el navegador
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
// Configuración de la conexión a la base de datos
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});


// --- Rutas de la API ---

// Ruta por defecto para la página principal
// Ahora apunta a registro.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'registro.html'));
});


// Ruta de ejemplo: obtener todos los usuarios (¡solo para prueba, no para producción!)
app.get('/api/users', (req, res) => {
    connection.query('SELECT id_usuario, nombre_usuario, email FROM usuarios', (err, results) => {
        if (err) {
            console.error('Error al obtener usuarios:', err);
            return res.status(500).json({ message: 'Error interno del servidor' });
        }
        res.json(results);
    });
});

// Ruta para el REGISTRO de nuevos usuarios
app.post('/api/register', async (req, res) => {
    const { nombre_usuario, apellido_usuario, email, password } = req.body;

    // Validación básica (puedes añadir más)
    if (!nombre_usuario || !apellido_usuario || !email || !password) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }

    try {
        // 1. Verificar si el email ya existe
        const [rows] = await connection.promise().query('SELECT id_usuario FROM usuarios WHERE email = ?', [email]);
        if (rows.length > 0) {
            return res.status(409).json({ message: 'El email ya está registrado.' });
        }

        // 2. Hashear la contraseña
        const saltRounds = 10; // Número de rondas de salting para bcrypt (más alto = más seguro, pero más lento)
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 3. Insertar el nuevo usuario en la base de datos
        const insertQuery = `
            INSERT INTO usuarios (
                nombre_usuario,
                apellido_usuario,
                email,
                hash_contrasena,
                portafolio_publico
            ) VALUES (?, ?, ?, ?, ?)
        `;
        const [insertResult] = await connection.promise().query(insertQuery, [
            nombre_usuario,
            apellido_usuario,
            email,
            hashedPassword,
            false // Por defecto, el portafolio no es público al registrarse
        ]);

        console.log('Usuario registrado con ID:', insertResult.insertId);
        res.status(201).json({ message: 'Registro exitoso. ¡Bienvenido!', userId: insertResult.insertId });

    } catch (error) {
        console.error('Error durante el registro:', error);
        res.status(500).json({ message: 'Error interno del servidor durante el registro.' });
    }
});

// Ruta para el INICIO DE SESIÓN de usuarios
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email y contraseña son obligatorios.' });
    }

    try {
        // 1. Buscar al usuario por su email
        const [rows] = await connection.promise().query('SELECT id_usuario, email, hash_contrasena FROM usuarios WHERE email = ?', [email]);
        const user = rows[0];

        if (!user) {
            // Es buena práctica no decir si el email existe o no por seguridad,
            // solo que las credenciales son inválidas.
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        // 2. Comparar la contraseña ingresada con el hash almacenado
        const isMatch = await bcrypt.compare(password, user.hash_contrasena);

        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        // Si llegamos aquí, las credenciales son correctas
        // <--- AÑADIDO: Establecer la sesión del usuario
        req.session.userId = user.id_usuario;
        req.session.userEmail = user.email; // Opcional, pero útil

        console.log('Usuario ' + user.email + ' ha iniciado sesión exitosamente. ID:', user.id_usuario);
        res.status(200).json({ message: 'Inicio de sesión exitoso.', userId: user.id_usuario });

    } catch (error) {
        console.error('Error durante el inicio de sesión:', error);
        res.status(500).json({ message: 'Error interno del servidor durante el inicio de sesión.' });
    }
});

// <--- AÑADIDO: Ruta para obtener la información del usuario logueado
// Ruta para obtener la información del usuario logueado
app.get('/perfil', estaAutenticado, async (req, res) => {
  try {
    // A) Traer datos básicos del usuario
    const [userRows] = await connection.promise().query(
      `SELECT
         nombre_usuario AS nombre,
         apellido_usuario AS apellido,
         email
       FROM usuarios
       WHERE id_usuario = ?`,
      [req.session.userId]
    );
    const usuario = userRows[0];
    if (!usuario) {
      return res.redirect('/login.html');
    }

    // B) Traer álbumes de la tabla albumes
    const [albumesRows] = await connection.promise().query(
      `SELECT
         id_album,
         titulo_album AS titulo,
         DATE_FORMAT(fecha_creacion_album, '%Y-%m-%d') AS fecha,
         tipo_album AS tipo
       FROM albumes
       WHERE id_usuario = ?`,
      [req.session.userId]
    );
    const albumes = albumesRows; // puede ser []

    // C) Renderizar la vista con los datos correctos
    res.render('perfil', { usuario, albumes });

  } catch (err) {
    console.error('💥 Error en GET /perfil:', err);
    res.status(500).send('Error interno al cargar perfil, mira la consola.');
  }
});

// --- FIN AÑADIDO DE RUTA USER-INFO ---

// <--- AÑADIDO: Ruta para cerrar sesión
app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error al destruir la sesión:', err);
            return res.status(500).json({ message: 'Error al cerrar sesión.' });
        }
        // Para asegurar que la cookie de sesión se elimina del navegador
        res.clearCookie('connect.sid'); // connect.sid es el nombre por defecto de la cookie de express-session
        res.status(200).json({ message: 'Sesión cerrada exitosamente.' });
    });
});
// --- FIN AÑADIDO DE RUTA LOGOUT ---


// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});

// Manejo de cierre de conexión (opcional, para cerrar gracefully)
process.on('SIGINT', () => {
    connection.end((err) => {
        if (err) {
            console.error('Error al cerrar la conexión de la DB:', err);
            return;
        }
        console.log('Conexión a la base de datos cerrada.');
        process.exit(0);
    });
});