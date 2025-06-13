require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const path = require('path');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');
const { estaAutenticado } = require('./middleware/autenticacion');

const app = express();
require('dotenv').config();

console.log('¡Servidor de IMÁGENES iniciando! Versión: 2025-06-12_FINAL'); // <--- ¡AGREGA ESTA LÍNEA!

const port = process.env.PORT || 3000;

// Configuración multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/imagenes'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random()*1e9);
    const ext = path.extname(file.originalname);
    cb(null, unique + ext);
  }
});
const upload = multer({ storage });

// Sesiones
app.use(session({
  secret: process.env.SESSION_SECRET || 'mi_secreto_super_seguro',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 1000*60*60*24 }
}));

// Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Archivos estáticos
app.use(express.static(path.join(__dirname,'public')));
app.use('/imagenes', express.static(path.join(__dirname,'public','imagenes')));

// EJS
app.set('view engine','ejs');
app.set('views', path.join(__dirname,'views'));

// DB
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Rutas

app.get('/', (req,res)=> res.sendFile(path.join(__dirname,'public','registro.html')));

// ---------> Acá resolvemos el problema:

// Registro de usuario
app.post('/api/register', async (req,res)=>{
  const { nombre_usuario, apellido_usuario, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await connection.promise().query(
      'INSERT INTO usuarios (nombre_usuario, apellido_usuario, email, hash_contrasena) VALUES (?,?,?,?)',
      [nombre_usuario, apellido_usuario, email, hashedPassword]
    );
    res.status(201).json({ message: 'Usuario registrado correctamente.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al registrar usuario.' });
  }
});

// Login de usuario
app.post('/api/login', async (req,res)=>{
  const { email, password } = req.body;
  try {
    const [rows] = await connection.promise().query(
      'SELECT * FROM usuarios WHERE email = ?',
      [email]
    );
    if(rows.length === 0) return res.status(401).json({ message: 'Usuario no encontrado.' });

    const usuario = rows[0];
    const valid = await bcrypt.compare(password, usuario.hash_contrasena);
    if(!valid) return res.status(401).json({ message: 'Contraseña incorrecta.' });

    req.session.userId = usuario.id_usuario;
    res.json({ message: 'Inicio de sesión exitoso.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al iniciar sesión.' });
  }
});

// Perfil
app.get('/perfil', estaAutenticado, async (req,res)=>{
  try {
    const [usuarioData] = await connection.promise().query(
      'SELECT nombre_usuario, apellido_usuario, email FROM usuarios WHERE id_usuario = ?',
      [req.session.userId]
    );
    const usuario = usuarioData[0];

    const [albumesData] = await connection.promise().query(
      'SELECT * FROM albumes WHERE id_usuario = ?',
      [req.session.userId]
    );

    const [imagenesData] = await connection.promise().query(
      'SELECT * FROM imagenes WHERE id_usuario = ?',
      [req.session.userId]
    );

    res.render('perfil', { usuario, albumes: albumesData, imagenes: imagenesData });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al cargar perfil');
  }
});

// Subir imagen
app.post('/api/subir-imagen', estaAutenticado, upload.single('imagen'), async (req,res)=>{
  try {
    const filename = req.file.filename;
    const titulo = req.body.titulo_obra_opcional || null;
    await connection.promise().query(
      'INSERT INTO imagenes (id_usuario,url_obra,titulo_obra_opcional) VALUES (?,?,?)',
      [req.session.userId, filename, titulo]
    );
    res.status(201).json({ message:'Imagen subida exitosamente', filename, titulo });
  } catch(e) {
    console.error(e);
    res.status(500).json({ message:'Error interno al subir imagen' });
  }
});

// Eliminar imagen
// Eliminar imagen
app.delete('/api/eliminar-imagen/:filename', estaAutenticado, async (req,res)=>{ // <--- ¡Con estaAutenticado!
    const { filename } = req.params;
    try {
        // Asegúrate de que la imagen pertenece al usuario antes de eliminarla
        const [result] = await connection.promise().query(
            'DELETE FROM imagenes WHERE id_usuario=? AND url_obra=?', // <--- ¡Con id_usuario!
            [req.session.userId, filename] // <--- ¡Con req.session.userId!
        );

        if(result.affectedRows === 0) {
            return res.status(404).json({ message: 'Imagen no encontrada o no autorizada para eliminar.' });
        }

        // Si la imagen se eliminó de la base de datos, procede a eliminar el archivo físico
        const filePath = path.join(__dirname, 'public', 'imagenes', filename);
        fs.unlink(filePath, err => {
            if (err) {
                console.error('Error al eliminar archivo físico:', err);
            }
        });

        res.json({ message: 'Imagen eliminada correctamente.' });
    } catch(e) {
        console.error('Error en la ruta DELETE /api/eliminar-imagen:', e);
        res.status(500).json({ message: 'Error interno al eliminar imagen.' });
    }
});

// Logout
app.post('/api/logout', (req,res)=>{
  req.session.destroy(()=> res.clearCookie('connect.sid').json({message:'Sesión cerrada'}));
});

app.use((req, res, next) => {
    console.log(`--- Manejador 404 alcanzado ---`);
    console.log(`Método: ${req.method}, URL: ${req.originalUrl}`);
    // Enviamos una respuesta HTML para que el navegador no se queje de JSON
    res.status(404).send('<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>404 - No encontrado</title><style>body { font-family: sans-serif; text-align: center; margin-top: 50px; } .card { background-color: #f8f8f8; border: 1px solid #ddd; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: inline-block; }</style></head><body><div class="card"><h1>404 - Página no encontrada</h1><p>La página que buscas no existe.</p><a href="/">Volver al inicio</a></div></body></html>');
});

// Escuchar
app.listen(port, ()=> console.log(`Servidor escuchando en http://localhost:${port}`));
