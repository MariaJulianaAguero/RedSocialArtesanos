const express = require('express');
const app = express();
const usuarioRoutes = require('./routes/usuarioRoutes');

app.set('view engine', 'ejs');
app.set('views', './views');


// Middlewares
app.use(express.json());

// Rutas
app.use('/usuario', usuarioRoutes);

// Servidor
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
