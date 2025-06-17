
async function eliminarObra(idObra) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta obra? Esta acción es irreversible.')) {
        return;
    }

    try {
       
        const response = await fetch(`/api/obras/eliminar/${idObra}`, {
            method: 'DELETE'
        });

        const result = await response.json();
        alert(result.message);

        if (response.ok) {
            // Elimina el elemento de la obra del DOM directamente para una actualización instantánea
            // Busca el elemento de la obra por su atributo data-id-obra y luego su padre '.image-item'
            const obraItem = document.querySelector(`.image-item .delete-obra-btn[data-id-obra="${idObra}"]`).closest('.image-item');
            if (obraItem) {
                obraItem.remove();
                console.log(`Obra con ID ${idObra} eliminada del DOM.`);
            }
        }
    } catch (error) {
        console.error('Error al eliminar obra:', error);
        alert('Hubo un problema al eliminar la obra. Por favor, inténtalo de nuevo más tarde.');
    }
}

// Función para cargar álbumes en la lista desplegable de subir obra
async function cargarAlbumesParaSelect() {
    try {
        console.log("[FRONTEND DEBUG] Intentando cargar álbumes para el select...");
        const response = await fetch('/api/albumes');
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message || 'Unknown error'}`);
        }
        const albumes = await response.json();
        console.log("[FRONTEND DEBUG] Álbumes recibidos del backend:", albumes);

        const selectElement = document.getElementById('selectAlbum');
        if (!selectElement) {
            console.error("[FRONTEND DEBUG] Error: El elemento con ID 'selectAlbum' no fue encontrado en el DOM. Esto es esperado si el perfil no es el propio.");
            return;
        }

        selectElement.innerHTML = '<option value="">(Ningún álbum)</option>';

        if (albumes.length > 0) {
            albumes.forEach(album => {
                const option = document.createElement('option');
                option.value = album.id_album;
                option.textContent = album.titulo_album;
                selectElement.appendChild(option);
            });
        } else {
            console.log("[FRONTEND DEBUG] No se encontraron álbumes para cargar en el select.");
        }
    } catch (error) {
        console.error('Error al cargar álbumes para el select:', error);
        const selectElement = document.getElementById('selectAlbum');
        if (selectElement) {
            selectElement.innerHTML = '<option value="">Error al cargar álbumes</option>';
        }
    }
}

// =========================================================================
// Todo el JS que interactúa con el DOM debe ir dentro de un ÚNICO DOMContentLoaded listener.
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log("[FRONTEND DEBUG] DOMContentLoaded disparado. Iniciando script de perfil.");

    // ***** SCRIPT PARA ENVIAR SOLICITUD DE AMISTAD (NO MODIFICADO) *****
    const sendFriendRequestBtn = document.getElementById('sendFriendRequestBtn');
    const friendshipMessage = document.getElementById('friendshipMessage');

    if (sendFriendRequestBtn) {
        sendFriendRequestBtn.addEventListener('click', async () => {
            const idReceptor = sendFriendRequestBtn.dataset.userId;
            if (!idReceptor) {
                console.error('No se pudo obtener el ID del usuario receptor.');
                if (friendshipMessage) {
                    friendshipMessage.textContent = 'Error: ID de usuario no encontrado.';
                    friendshipMessage.style.color = 'red';
                }
                return;
            }

            sendFriendRequestBtn.disabled = true;
            sendFriendRequestBtn.textContent = 'Enviando...';
            if (friendshipMessage) {
                friendshipMessage.textContent = 'Enviando solicitud de amistad...';
                friendshipMessage.style.color = 'blue';
            }

            try {
                const response = await fetch('/enviar-solicitud-amistad', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ id_receptor: idReceptor })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    if (friendshipMessage) {
                        friendshipMessage.textContent = data.message;
                        friendshipMessage.style.color = 'green';
                    }
                    sendFriendRequestBtn.textContent = 'Solicitud Enviada';
                } else {
                    if (friendshipMessage) {
                        friendshipMessage.textContent = 'Error: ' + (data.message || 'Error desconocido.');
                        friendshipMessage.style.color = 'red';
                    }
                    sendFriendRequestBtn.disabled = false;
                    sendFriendRequestBtn.textContent = 'Enviar Solicitud de Amistad';
                }
            } catch (error) {
                console.error('Error al enviar la solicitud:', error);
                if (friendshipMessage) {
                    friendshipMessage.textContent = 'Error de conexión al enviar solicitud.';
                    friendshipMessage.style.color = 'red';
                }
                sendFriendRequestBtn.disabled = false;
                sendFriendRequestBtn.textContent = 'Enviar Solicitud de Amistad';
            }
        });
    }

    // --- CÓDIGO PARA RESPONDER SOLICITUDES (ACEPTAR/RECHAZAR) (NO MODIFICADO) ---
    const btnAceptarSolicitud = document.getElementById('btnAceptarSolicitud');
    const btnRechazarSolicitud = document.getElementById('btnRechazarSolicitud');

    if (btnAceptarSolicitud && btnRechazarSolicitud) {
        const handleResponse = async (accion) => {
            const idSolicitud = btnAceptarSolicitud.dataset.solicitudId || btnRechazarSolicitud.dataset.solicitudId;
            if (!idSolicitud) {
                console.error('Error: No se pudo obtener el ID de la solicitud.');
                if (friendshipMessage) {
                    friendshipMessage.textContent = 'Error: ID de solicitud no encontrado.';
                    friendshipMessage.style.color = 'red';
                }
                return;
            }

            btnAceptarSolicitud.disabled = true;
            btnRechazarSolicitud.disabled = true;
            if (friendshipMessage) {
                friendshipMessage.textContent = `Procesando solicitud (${accion})...`;
                friendshipMessage.style.color = 'blue';
            }

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
                    if (friendshipMessage) {
                        friendshipMessage.textContent = data.message;
                        friendshipMessage.style.color = 'green';
                    }
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                } else {
                    if (friendshipMessage) {
                        friendshipMessage.textContent = 'Error: ' + data.message;
                        friendshipMessage.style.color = 'red';
                    }
                    btnAceptarSolicitud.disabled = false;
                    btnRechazarSolicitud.disabled = false;
                }
            } catch (error) {
                console.error('Error al enviar la respuesta de la solicitud:', error);
                if (friendshipMessage) {
                    friendshipMessage.textContent = 'Error de conexión al responder la solicitud.';
                    friendshipMessage.style.color = 'red';
                }
                btnAceptarSolicitud.disabled = false;
                btnRechazarSolicitud.disabled = false;
            }
        };

        btnAceptarSolicitud.addEventListener('click', () => handleResponse('aceptar'));
        btnRechazarSolicitud.addEventListener('click', () => handleResponse('rechazar'));
    }

    // =============================================================
    // LLAMADA INICIAL PARA CARGAR ÁLBUMES EN EL SELECT
    // =============================================================
    if (document.getElementById('selectAlbum')) {
        cargarAlbumesParaSelect();
    }


    // ***** FUNCIONALIDADES EXCLUSIVAS DEL PROPIO PERFIL *****
    const btnCrearAlbum = document.getElementById('btnCrearAlbum');
    const formCrearAlbumContainer = document.getElementById('formCrearAlbumContainer');
    const btnCancelarAlbum = document.getElementById('btnCancelarAlbum');
    const formNuevoAlbum = document.getElementById('formNuevoAlbum');
    const uploadImageForm = document.getElementById('uploadImageForm'); // Ahora es el formulario para 'obras'
    const uploadMessage = document.getElementById('uploadMessage');
    const imageGrid = document.querySelector('.image-grid'); 

    if (btnCrearAlbum) {
        console.log("[FRONTEND DEBUG] Detectado perfil propio. Activando funcionalidades.");

        btnCrearAlbum.addEventListener('click', () => {
            if (formCrearAlbumContainer) {
                formCrearAlbumContainer.style.display = 'block';
            }
            btnCrearAlbum.style.display = 'none';
        });

        if (btnCancelarAlbum) {
            btnCancelarAlbum.addEventListener('click', () => {
                if (formCrearAlbumContainer) {
                    formCrearAlbumContainer.style.display = 'none';
                }
                btnCrearAlbum.style.display = 'block';
                if (formNuevoAlbum) {
                    formNuevoAlbum.reset();
                }
            });
        }

        if (formNuevoAlbum) {
            formNuevoAlbum.addEventListener('submit', async (e) => {
                e.preventDefault();
                const titulo = document.getElementById('tituloAlbum').value;
                const tipo = document.getElementById('tipoAlbum').value;

                try {
                    const response = await fetch('/api/albumes', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ titulo_album: titulo, tipo_album: tipo })
                    });
                    const result = await response.json();
                    alert(result.message);
                    if (response.ok) {
                        if (formCrearAlbumContainer) {
                            formCrearAlbumContainer.style.display = 'none';
                        }
                        btnCrearAlbum.style.display = 'block';
                        formNuevoAlbum.reset();
                        await cargarAlbumesParaSelect();
                        window.location.reload();
                    }
                } catch (error) {
                    console.error('Error al crear álbum:', error);
                    alert('Error al crear álbum.');
                }
            });
        }

        // ***** Lógica para la subida de OBRAS *****
        if (uploadImageForm) {
            uploadImageForm.addEventListener('submit', async (e) => {
                e.preventDefault();

               
                const formData = new FormData(uploadImageForm);

                try {
                    
                    const response = await fetch('/api/obras/subir', {
                        method: 'POST',
                        body: formData
                    });

                    const data = await response.json();

                    if (response.ok) {
                        if (uploadMessage) {
                            uploadMessage.textContent = data.message;
                            uploadMessage.style.color = 'green';
                        }
                        uploadImageForm.reset(); // Limpia el formulario después de una subida exitosa

                        // Actualizar la cuadrícula de obras dinámicamente
                        if (imageGrid) {
                            // Remueve el mensaje "No hay obras subidas aún" si existe
                            const noImagesMessage = imageGrid.querySelector('p'); // Busca el párrafo dentro de imageGrid
                            if (noImagesMessage && noImagesMessage.textContent.includes('No hay obras subidas aún')) {
                                noImagesMessage.remove();
                            }

                            const newObraItem = document.createElement('div');
                            newObraItem.classList.add('image-item');
                           
                            newObraItem.innerHTML = `
                                <img src="/imagenes/${data.url_obra}" alt="${data.titulo_obra_opcional || 'Obra de usuario'}">
                                <p><strong>${data.titulo_obra_opcional || 'Sin título'}</strong></p>
                                ${data.descripcion_obra ? `<p><small>${data.descripcion_obra}</small></p>` : ''}
                                ${data.precio && data.precio > 0 ? `<p><strong>Precio: $${parseFloat(data.precio).toFixed(2)}</strong></p>` : ''}
                                <small>Publicado: ${new Date(data.fecha_subida_obra).toLocaleDateString()}</small>
                                <button class="btn btn-danger btn-sm delete-obra-btn" data-id-obra="${data.id_obra}">Eliminar Obra</button>
                            `;
                            imageGrid.prepend(newObraItem); // Añade la nueva obra al principio de la cuadrícula
                            addDeleteEventListeners(); // Re-adjunta los listeners para el nuevo botón de eliminar
                        }
                    } else {
                        if (uploadMessage) {
                            uploadMessage.textContent = `Error: ${data.message || 'No se pudo subir la obra.'}`;
                            uploadMessage.style.color = 'red';
                        }
                    }
                } catch (error) {
                    console.error('Error al subir obra:', error);
                    if (uploadMessage) {
                        uploadMessage.textContent = 'Error de red o servidor al subir obra.';
                        uploadMessage.style.color = 'red';
                    }
                }
            });
        }
    } // Fin del if (btnCrearAlbum)

    // Lógica para la eliminación de OBRAS - se aplica a TODOS los botones .delete-obra-btn
    // Esta función necesita ser llamada cada vez que se añaden nuevas obras dinámicamente
    function addDeleteEventListeners() {
        // Selecciona todos los botones de eliminar obra (nueva clase)
        document.querySelectorAll('.delete-obra-btn').forEach(button => {
            // Elimina listeners anteriores para evitar múltiples ejecuciones si se llama varias veces
            // (esto es útil si la función se invoca después de añadir elementos dinámicamente)
            button.removeEventListener('click', handleDeleteObraButtonClick);
            button.addEventListener('click', handleDeleteObraButtonClick);
        });
    }

    // Función manejadora para el evento click de los botones de eliminar obra
    async function handleDeleteObraButtonClick() {
       
        const idObra = this.dataset.idObra; // 'this' se refiere al botón que fue clickeado
        // Llama a la función global eliminarObra
        await eliminarObra(idObra);
    }

    // Llama a la función addDeleteEventListeners al cargar la página
    // para que los botones de eliminar que ya están en el HTML funcionen.
    addDeleteEventListeners();
});