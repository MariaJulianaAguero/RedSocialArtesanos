// public/js/albumesFrontend.js

document.addEventListener('DOMContentLoaded', async () => {
    // Referencias a elementos del DOM
    const btnCrearAlbum = document.getElementById('btnCrearAlbum');
    const formCrearAlbumContainer = document.getElementById('formCrearAlbumContainer');
    const formNuevoAlbum = document.getElementById('formNuevoAlbum');
    const btnCancelarAlbum = document.getElementById('btnCancelarAlbum');
    const albumesContainer = document.getElementById('albumesContainer');
    const selectAlbum = document.getElementById('selectAlbum'); // El select en el formulario de subir imagen
    const uploadForm = document.getElementById('uploadForm');
    const uploadMessage = document.getElementById('uploadMessage');

    // --- Funciones para la gestión de Álbumes ---

    /**
     * Carga y muestra los álbumes del usuario, y rellena el select de subida de imágenes.
     */
    async function cargarAlbumes() {
        try {
            const response = await fetch('/api/albumes'); // Llama a tu backend para obtener álbumes
            if (!response.ok) {
                // Si la respuesta no es OK y es un 404 (Not Found), significa que no hay álbumes
                if (response.status === 404) {
                    albumesContainer.innerHTML = '<p class="text-muted text-center">No tienes álbumes creados aún.</p>';
                    // Asegúrate de que el select de álbumes esté vacío excepto por la opción por defecto
                    selectAlbum.innerHTML = '<option value="">(Sin álbum)</option>';
                    return; // Sale de la función
                }
                // Si es otro tipo de error HTTP, lanza un error
                throw new Error(`Error HTTP: ${response.status}`);
            }
            const albumes = await response.json();
            console.log('Álbumes cargados:', albumes);

            albumesContainer.innerHTML = ''; // Limpiar el contenedor antes de añadir nuevos álbumes
            selectAlbum.innerHTML = '<option value="">(Sin álbum)</option>'; // Limpiar y añadir opción por defecto al select

            if (albumes.length === 0) {
                albumesContainer.innerHTML = '<p class="text-muted text-center">No tienes álbumes creados aún.</p>';
            } else {
                albumes.forEach(album => {
                    // 1. Renderizar álbum en la sección de álbumes
                    const albumElement = document.createElement('div');
                    albumElement.classList.add('album-card');
                    albumElement.innerHTML = `
                        <h4>${album.titulo_album}</h4>
                        <p>Tipo: ${album.tipo_album}</p>
                        <p>Creado: ${new Date(album.fecha_creacion_album).toLocaleDateString()}</p>
                        <div class="album-actions">
                            <button class="btn btn-warning btn-sm" onclick="editarAlbum(${album.id_album})">Editar</button>
                            <button class="btn btn-danger btn-sm" onclick="eliminarAlbum(${album.id_album})">Eliminar</button>
                            <a href="/album/${album.id_album}" class="btn btn-primary btn-sm">Ver Imágenes</a>
                        </div>
                    `;
                    albumesContainer.appendChild(albumElement);

                    // 2. Rellenar el select del formulario de subir imagen
                    const option = document.createElement('option');
                    option.value = album.id_album;
                    option.textContent = album.titulo_album;
                    selectAlbum.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error al cargar los álbumes:', error);
            albumesContainer.innerHTML = `<p class="text-muted text-center text-error">Error al cargar álbumes: ${error.message}</p>`;
            selectAlbum.innerHTML = '<option value="">(Error al cargar álbumes)</option>'; // Indica error en el select
        }
    }

    /**
     * Muestra/oculta el formulario de creación de álbum.
     */
    btnCrearAlbum.addEventListener('click', () => {
        formCrearAlbumContainer.style.display = 'block'; // Muestra el formulario
        btnCrearAlbum.style.display = 'none'; // Oculta el botón "Crear Álbum"
        formNuevoAlbum.reset(); // Limpiar el formulario al mostrarlo
    });

    btnCancelarAlbum.addEventListener('click', () => {
        formCrearAlbumContainer.style.display = 'none'; // Oculta el formulario
        btnCrearAlbum.style.display = 'block'; // Muestra el botón "Crear Álbum"
    });

    /**
     * Maneja el envío del formulario para crear un nuevo álbum.
     */
    formNuevoAlbum.addEventListener('submit', async (e) => {
        e.preventDefault(); // Previene el envío tradicional del formulario

        const titulo_album = document.getElementById('tituloAlbum').value;
        const tipo_album = document.getElementById('tipoAlbum').value;

        try {
            const response = await fetch('/api/albumes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json' // Indicamos que enviamos JSON
                },
                body: JSON.stringify({ titulo_album, tipo_album }) // Convertimos los datos a JSON
            });

            const result = await response.json(); // Parseamos la respuesta del servidor

            if (response.ok) { // Si la respuesta HTTP es 200-299
                alert(result.message);
                formCrearAlbumContainer.style.display = 'none'; // Ocultar formulario
                btnCrearAlbum.style.display = 'block'; // Mostrar botón "Crear Álbum"
                cargarAlbumes(); // Recargar la lista de álbumes para mostrar el nuevo
            } else {
                // Si la respuesta no es OK (ej. 400, 500), muestra el mensaje de error del backend
                alert(`Error al crear álbum: ${result.message}`);
            }
        } catch (error) {
            console.error('Error al enviar el formulario de álbum:', error);
            alert('Error de red o del servidor al crear el álbum.');
        }
    });

    /**
     * Función global para eliminar un álbum.
     * Esta función se llama directamente desde el HTML (onclick="eliminarAlbum(id)")
     * @param {number} id_album - El ID del álbum a eliminar.
     */
    window.eliminarAlbum = async (id_album) => {
        if (!confirm('¿Estás seguro de que deseas eliminar este álbum? Esto eliminará también sus imágenes asociadas.')) {
            return; // Si el usuario cancela, no hace nada
        }

        try {
            const response = await fetch(`/api/albumes/${id_album}`, {
                method: 'DELETE' // Método DELETE para eliminar recursos
            });

            const result = await response.json();

            if (response.ok) {
                alert(result.message);
                cargarAlbumes(); // Recargar la lista de álbumes y el select después de la eliminación
            } else {
                alert(`Error al eliminar álbum: ${result.message}`);
            }
        } catch (error) {
            console.error('Error al eliminar álbum:', error);
            alert('Error de red o del servidor al eliminar el álbum.');
        }
    };

    /**
     * Función global para editar un álbum (placeholder).
     * Puedes expandirla para abrir un modal de edición, etc.
     * @param {number} id_album - El ID del álbum a editar.
     */
    window.editarAlbum = (id_album) => {
        alert(`Funcionalidad de edición para álbum con ID: ${id_album} (Aún no implementada completamente en el frontend)`);
        // Aquí podrías implementar la lógica para precargar un formulario de edición
        // y enviarlo a una ruta PUT/PATCH en el backend.
    };


    // --- Lógica para Subir Imágenes (se mantiene la tuya, con el ajuste del álbum) ---

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(e.target);

        // Si el usuario selecciona "(Sin álbum)" (que tiene value=""),
        // eliminamos el campo id_album del FormData para que el backend lo sepa.
        if (formData.get('id_album') === '') {
            formData.delete('id_album');
        }

        try {
            const response = await fetch('/api/subir-imagen', {
                method: 'POST',
                body: formData // FormData se envía directamente, sin Content-Type
            });

            const result = await response.json();
            uploadMessage.textContent = result.message; // Muestra el mensaje de éxito o error

            if (response.ok) {
                uploadMessage.style.color = 'green';
                // Si la subida fue exitosa, recargamos la página para ver la nueva imagen
                window.location.reload();
            } else {
                uploadMessage.style.color = 'red'; // Mostrar error en rojo
            }
        } catch (error) {
            console.error('Error al subir la imagen:', error);
            uploadMessage.textContent = 'Error de red o del servidor al subir la imagen.';
            uploadMessage.style.color = 'red';
        }
    });

    // --- Inicialización: Cargar álbumes al cargar la página ---
    cargarAlbumes();
});