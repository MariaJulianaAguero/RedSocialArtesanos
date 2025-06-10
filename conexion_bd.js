// Carga las variables de entorno del archivo .env
require('dotenv').config();

const mysql = require('mysql2');

// Configura la conexión a la base de datos usando las variables de entorno
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Intenta conectar a la base de datos
connection.connect((err) => {
    if (err) {
        console.error('Error al conectar a la base de datos:', err.stack);
        return;
    }
    console.log('Conexión exitosa a la base de datos con ID:', connection.threadId);

    // Si la conexión es exitosa, intenta obtener los usuarios
    connection.query('SELECT id_usuario, nombre_usuario, apellido_usuario, email FROM usuarios', (queryErr, results) => {
        if (queryErr) {
            console.error('Error al ejecutar la consulta:', queryErr.stack);
            connection.end(); // Cierra la conexión en caso de error
            return;
        }
        console.log('\n--- Usuarios encontrados ---');
        if (results.length > 0) {
            results.forEach(user => {
                console.log(`ID: ${user.id_usuario}, Nombre: ${user.nombre_usuario} ${user.apellido_usuario}, Email: ${user.email}`);
            });
        } else {
            console.log('No se encontraron usuarios en la tabla.');
        }

        // Cierra la conexión después de la consulta
        connection.end((endErr) => {
            if (endErr) {
                console.error('Error al cerrar la conexión:', endErr.stack);
                return;
            }
            console.log('\nConexión a la base de datos cerrada.');
        });
    });
});