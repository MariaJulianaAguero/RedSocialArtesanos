// Función para eliminar imagen
// Esta función se llama directamente desde el EJS con onclick="eliminarImagen(...)"
// Por lo tanto, no necesita estar dentro de un DOMContentLoaded listener.
async function eliminarImagen(filename) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta imagen?')) return;

    try {
        const response = await fetch(`/api/eliminar-imagen/${encodeURIComponent(filename)}`, {
            method: 'DELETE'
        });

        const result = await response.json();
        alert(result.message);
        if (response.ok) {
            window.location.reload(); // Recarga la página si la eliminación fue exitosa
        }
    } catch (error) {
        console.error('Error al eliminar imagen:', error);
        alert('Hubo un problema al eliminar la imagen.');
    }
}

// Todo el resto del JS que interactúa con el DOM debe ir dentro de DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // ***** SCRIPT PARA ENVIAR SOLICITUD DE AMISTAD *****
    const sendFriendRequestBtn = document.getElementById('sendFriendRequestBtn');
    if (sendFriendRequestBtn) {
        sendFriendRequestBtn.addEventListener('click', async () => {
            const userIdToBefriend = sendFriendRequestBtn.dataset.userId;

            try {
                const response = await fetch('/api/friend-requests/send', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ id_receptor: userIdToBefriend })
                });

                const data = await response.json();

                if (response.ok) {
                    alert(data.message);
                    sendFriendRequestBtn.textContent = 'Solicitud Enviada';
                    sendFriendRequestBtn.disabled = true;
                    sendFriendRequestBtn.classList.remove('btn-primary');
                    sendFriendRequestBtn.classList.add('btn-warning');
                } else {
                    alert('Error al enviar solicitud: ' + data.message);
                }
            } catch (error) {
                console.error('Error de red o del servidor:', error);
                alert('Hubo un problema al conectar con el servidor.');
            }
        });
    }
     // --- NUEVO CÓDIGO PARA RESPONDER SOLICITUDES ---
    const btnAceptarSolicitud = document.getElementById('btnAceptarSolicitud');
    const btnRechazarSolicitud = document.getElementById('btnRechazarSolicitud');

    if (btnAceptarSolicitud && btnRechazarSolicitud) {
        // Función para manejar la respuesta a la solicitud (aceptar o rechazar)
        const handleResponse = async (accion) => {
            const idSolicitud = btnAceptarSolicitud.dataset.solicitudId || btnRechazarSolicitud.dataset.solicitudId;
            if (!idSolicitud) {
                console.error('Error: No se pudo obtener el ID de la solicitud.');
                friendshipMessage.textContent = 'Error: ID de solicitud no encontrado.';
                friendshipMessage.style.color = 'red';
                return;
            }

            // Deshabilitar botones para evitar clics múltiples y mostrar mensaje de carga
            btnAceptarSolicitud.disabled = true;
            btnRechazarSolicitud.disabled = true;
            friendshipMessage.textContent = `Procesando solicitud (${accion})...`;
            friendshipMessage.style.color = 'blue';

            try {
                const response = await fetch('/responder-solicitud-amistad', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ id_solicitud: idSolicitud, accion: accion })
                });

                const data = await response.json();

                if (data.success) {
                    friendshipMessage.textContent = data.message;
                    friendshipMessage.style.color = 'green';
                    // Recargar la página para que el estado de amistad se actualice (Amigos o sin botón)
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500); // Recargar después de 1.5 segundos
                } else {
                    friendshipMessage.textContent = 'Error: ' + data.message;
                    friendshipMessage.style.color = 'red';
                    // Re-habilitar botones si hay un error en la respuesta del servidor
                    btnAceptarSolicitud.disabled = false;
                    btnRechazarSolicitud.disabled = false;
                }
            } catch (error) {
                console.error('Error al enviar la respuesta de la solicitud:', error);
                friendshipMessage.textContent = 'Error de conexión al responder la solicitud.';
                friendshipMessage.style.color = 'red';
                // Re-habilitar botones si hay un error de red
                btnAceptarSolicitud.disabled = false;
                btnRechazarSolicitud.disabled = false;
            }
        };

        // Asignar los event listeners a los botones
        btnAceptarSolicitud.addEventListener('click', () => handleResponse('aceptar'));
        btnRechazarSolicitud.addEventListener('click', () => handleResponse('rechazar'));
    }


    // ***** SCRIPT PARA RESPONDER SOLICITUD DE AMISTAD (ACEPTAR/RECHAZAR) *****
    // Este es un ejemplo básico. Necesitarás implementar la lógica en el backend también.
    const btnResponderSolicitud = document.getElementById('btnResponderSolicitud');
    if (btnResponderSolicitud) {
        btnResponderSolicitud.addEventListener('click', async () => {
            const solicitudId = btnResponderSolicitud.dataset.solicitudId;
            const action = confirm('¿Aceptar esta solicitud de amistad?') ? 'accept' : 'reject';

            try {
                const response = await fetch('/api/friend-requests/respond', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ id_solicitud: solicitudId, action: action })
                });

                const data = await response.json();
                alert(data.message);
                if (response.ok) {
                    window.location.reload(); // Recargar para actualizar el estado de la amistad
                }
            } catch (error) {
                console.error('Error al responder solicitud:', error);
                alert('Hubo un problema al responder la solicitud.');
            }
        });
    }

    // ***** FUNCIONALIDADES EXCLUSIVAS DEL PROPIO PERFIL *****
    // Verificamos si los elementos existen (solo si es el perfil propio)
    const btnCrearAlbum = document.getElementById('btnCrearAlbum');
    if (btnCrearAlbum) { // Si este botón existe, asumimos que es el perfil propio
        const formCrearAlbumContainer = document.getElementById('formCrearAlbumContainer');
        const btnCancelarAlbum = document.getElementById('btnCancelarAlbum');
        const formNuevoAlbum = document.getElementById('formNuevoAlbum');
        const selectAlbum = document.getElementById('selectAlbum');
        const uploadForm = document.getElementById('uploadForm');
        const uploadMessage = document.getElementById('uploadMessage');

        // Función para cargar álbumes en la lista desplegable de subir imagen
        async function cargarAlbumesParaSelect() {
            try {
                const response = await fetch('/api/albumes/mis-albumes');
                const data = await response.json();
                selectAlbum.innerHTML = '<option value="">(Sin álbum)</option>'; // Opción por defecto
                if (data.albumes && data.albumes.length > 0) {
                    data.albumes.forEach(album => {
                        const option = document.createElement('option');
                        option.value = album.id_album;
                        option.textContent = album.nombre_album;
                        selectAlbum.appendChild(option);
                    });
                }
            } catch (error) {
                console.error('Error al cargar álbumes para el select:', error);
            }
        }

        // Cargar álbumes al iniciar la página para el select
        cargarAlbumesParaSelect();

        btnCrearAlbum.addEventListener('click', () => {
            formCrearAlbumContainer.style.display = 'block';
            btnCrearAlbum.style.display = 'none';
        });

        btnCancelarAlbum.addEventListener('click', () => {
            formCrearAlbumContainer.style.display = 'none';
            btnCrearAlbum.style.display = 'block';
            formNuevoAlbum.reset(); // Limpiar el formulario
        });

        formNuevoAlbum.addEventListener('submit', async (e) => {
            e.preventDefault();
            const titulo = document.getElementById('tituloAlbum').value;
            const tipo = document.getElementById('tipoAlbum').value;

            try {
                const response = await fetch('/api/albumes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre_album: titulo, tipo_album: tipo })
                });
                const result = await response.json();
                alert(result.message);
                if (response.ok) {
                    formCrearAlbumContainer.style.display = 'none';
                    btnCrearAlbum.style.display = 'block';
                    formNuevoAlbum.reset();
                    // Recargar álbumes en el select y en la vista
                    cargarAlbumesParaSelect();
                    window.location.reload(); // Para ver el nuevo álbum en la lista principal
                }
            } catch (error) {
                console.error('Error al crear álbum:', error);
                alert('Error al crear álbum.');
            }
        });

        // Script para subir imágenes
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(uploadForm);

            try {
                const response = await fetch('/api/subir-imagen', {
                    method: 'POST',
                    body: formData // FormData se envía directamente
                });
                const data = await response.json();
                uploadMessage.textContent = data.message;
                if (response.ok) {
                    uploadMessage.style.color = 'green';
                    uploadForm.reset();
                    window.location.reload(); // Recargar para ver la nueva imagen
                } else {
                    uploadMessage.style.color = 'red';
                }
            } catch (error) {
                console.error('Error al subir imagen:', error);
                uploadMessage.textContent = 'Error al subir la imagen.';
                uploadMessage.style.color = 'red';
            }
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const sendFriendRequestBtn = document.getElementById('sendFriendRequestBtn');
    const friendshipMessage = document.getElementById('friendshipMessage'); // El nuevo elemento para mensajes

    if (sendFriendRequestBtn) {
        sendFriendRequestBtn.addEventListener('click', async () => {
            const idReceptor = sendFriendRequestBtn.dataset.userId; // Obtiene el ID del usuario del perfil
            if (!idReceptor) {
                console.error('No se pudo obtener el ID del usuario receptor.');
                friendshipMessage.textContent = 'Error: ID de usuario no encontrado.';
                friendshipMessage.style.color = 'red';
                return;
            }

            // Oculta el botón y muestra un mensaje de carga
            sendFriendRequestBtn.disabled = true; // Deshabilita el botón para evitar clics múltiples
            sendFriendRequestBtn.textContent = 'Enviando...'; // Cambia el texto del botón
            friendshipMessage.textContent = 'Enviando solicitud de amistad...';
            friendshipMessage.style.color = 'blue';

            try {
                const response = await fetch('/enviar-solicitud-amistad', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ id_receptor: idReceptor })
                });

                const data = await response.json();

                if (data.success) {
                    friendshipMessage.textContent = data.message;
                    friendshipMessage.style.color = 'green';
                    sendFriendRequestBtn.textContent = 'Solicitud Pendiente'; // Cambia el texto del botón
                    // El botón ya está deshabilitado
                } else {
                    friendshipMessage.textContent = 'Error: ' + data.message;
                    friendshipMessage.style.color = 'red';
                    sendFriendRequestBtn.disabled = false; // Habilita el botón de nuevo si hubo un error
                    sendFriendRequestBtn.textContent = 'Enviar Solicitud de Amistad'; // Restaura el texto
                }
            } catch (error) {
                console.error('Error al enviar la solicitud:', error);
                friendshipMessage.textContent = 'Error de conexión al enviar solicitud.';
                friendshipMessage.style.color = 'red';
                sendFriendRequestBtn.disabled = false; // Habilita el botón de nuevo si hubo un error
                sendFriendRequestBtn.textContent = 'Enviar Solicitud de Amistad'; // Restaura el texto
            }
        });
    }

    // --- Código existente de creación de álbumes y subida de imágenes (si está en este archivo) ---
    // Puedes poner el código para btnCrearAlbum, formNuevoAlbum, uploadForm, etc., aquí si no lo tienes
    // en otro archivo. Si ya lo tienes, asegúrate de que no haya conflictos de IDs o funciones.
});

// Función eliminarImagen - asegúrate de que esté disponible globalmente o dentro del DOMContentLoaded
// Si la función eliminarImagen está definida fuera de DOMContentLoaded y es global, déjala como está.
// Si está dentro de DOMContentLoaded, asegúrate de que el onclick en el HTML la vea.
// Una alternativa es usar addEventListener para el botón eliminar, en lugar de onclick.
function eliminarImagen(urlImagen) {
    // Tu lógica actual para eliminar imágenes
    console.log('Intentando eliminar imagen:', urlImagen);
    // ... (tu código para eliminar la imagen) ...
}