
/**
 * Elimina una obra del servidor y del DOM.
 * @param {string} idObra - El ID de la obra a eliminar.
 */

async function eliminarObra(idObra) {
    console.log(`[FRONTEND DEBUG] Función eliminarObra iniciada para ID: ${idObra}`);
    if (confirm('¿Estás seguro de que quieres eliminar esta obra?')) {
        console.log('[FRONTEND DEBUG] Confirmación de eliminación aceptada.');
        try {
            const response = await fetch(`/api/obras/eliminar/${idObra}`, {
                method: 'DELETE'
            });
            console.log(`[FRONTEND DEBUG] Solicitud DELETE enviada. Respuesta: ${response.status}`);

            if (response.ok) {
                const data = await response.json();
                alert(data.message); // Muestra el mensaje de éxito del backend

                // --- NUEVO CÓDIGO AQUÍ: ELIMINAR EL ELEMENTO DEL DOM ---
                const obraElement = document.querySelector(`.obra-item[data-obra-id="${idObra}"]`);
                if (obraElement) {
                    obraElement.remove(); // Elimina el elemento HTML de la página
                    console.log(`[FRONTEND DEBUG] Obra ID ${idObra} eliminada del DOM.`);
                } else {
                    console.warn(`[FRONTEND DEBUG] No se encontró el elemento DOM para la obra ID ${idObra}.`);
                }
                // --- FIN NUEVO CÓDIGO ---

            } else {
                const errorData = await response.json();
                alert(`Error al eliminar la obra: ${errorData.message}`);
            }
        } catch (error) {
            console.error('Error al enviar la solicitud DELETE:', error);
            alert('Error de conexión o del servidor al intentar eliminar la obra.');
        }
    } else {
        console.log('[FRONTEND DEBUG] Eliminación cancelada por el usuario.');
    }
    console.log(`[FRONTEND DEBUG] Llamada a eliminarObra(idObra) completada.`);
}
/**
 * Carga los álbumes del usuario en el elemento select para asociar obras.
 */
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

        selectElement.innerHTML = '<option value="">(Ningún álbum)</option>'; // Opción por defecto

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

/**
 * Formatea una cadena de fecha a un formato legible.
 * @param {string} dateString - La cadena de fecha a formatear.
 * @returns {string} La fecha formateada.
 */
function formatCommentDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('es-ES', options);
}

/**
 * Crea la cadena HTML para un comentario individual.
 * Incluye un botón de eliminar si el comentario pertenece al usuario actual.
 * @param {object} comment - Objeto de comentario con propiedades como id_comentario, texto_comentario, etc.
 * @returns {string} El HTML del comentario.
 */
function createCommentHtml(comment) {
    const commentDate = formatCommentDate(comment.fecha_comentario);
    const currentUserId = document.body.dataset.currentUserId; 

    return `
        <div class="comment-item" data-comment-id="${comment.id_comentario}">
            <div class="comment-header">
                <img src="/imagenes/${comment.url_foto_perfil || 'default_profile.png'}" alt="Foto de perfil" class="comment-author-pic">
                <span class="comment-author-name">${comment.nombre_usuario} ${comment.apellido_usuario}</span>
                <span class="comment-date">${commentDate}</span>
            </div>
            <p class="comment-text">${comment.texto_comentario}</p>
            ${comment.id_usuario == currentUserId ? 
                `<button class="btn btn-sm btn-danger delete-comment-btn" data-comment-id="${comment.id_comentario}">Eliminar</button>`
                : ''
            }
        </div>
    `;
}

/**
 * Carga y muestra los comentarios para una obra específica.
 * @param {string} idObra - El ID de la obra cuyos comentarios se quieren cargar.
 */
async function loadCommentsForObra(idObra) {
    const commentsListContainer = document.getElementById(`comments-list-${idObra}`);
    const noCommentsMessage = document.getElementById(`no-comments-${idObra}`);
    
    if (!commentsListContainer) {
        console.warn(`Contenedor de comentarios no encontrado para la obra ID ${idObra}.`);
        return;
    }

    commentsListContainer.innerHTML = ''; // Limpia comentarios existentes

    try {
        const response = await fetch(`/api/obras/${idObra}/comentarios`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const comentarios = await response.json();
        
        if (noCommentsMessage) {
            noCommentsMessage.style.display = 'none'; // Oculta el mensaje "No hay comentarios"
        }

        if (comentarios.length > 0) {
            comentarios.forEach(comment => {
                commentsListContainer.innerHTML += createCommentHtml(comment);
            });
            addCommentDeleteEventListeners(); // Adjunta listeners a los nuevos botones de eliminar
        } else {
            if (noCommentsMessage) {
                noCommentsMessage.style.display = 'block'; // Muestra el mensaje si no hay comentarios
            }
        }
    } catch (error) {
        console.error(`Error al cargar comentarios para la obra ${idObra}:`, error);
        if (commentsListContainer) {
            commentsListContainer.innerHTML = `<p class="text-danger">Error al cargar comentarios.</p>`;
        }
    }
}

/**
 * Envía un nuevo comentario para una obra específica.
 * @param {string} idObra - El ID de la obra a comentar.
 * @param {HTMLTextAreaElement} textareaElement - El elemento textarea con el texto del comentario.
 */
async function postComment(idObra, textareaElement) {
    const textoComentario = textareaElement.value.trim();
    if (!textoComentario) {
        alert('El comentario no puede estar vacío.');
        return;
    }

    try {
        const response = await fetch(`/api/obras/${idObra}/comentarios`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ texto_comentario: textoComentario })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            alert(result.message);
            textareaElement.value = ''; // Limpia el textarea
            await loadCommentsForObra(idObra); // Recarga los comentarios para mostrar el nuevo
            addCommentDeleteEventListeners(); // Re-adjuntar listeners para eliminar comentarios
        } else {
            alert(`Error al añadir comentario: ${result.message || 'Error desconocido.'}`);
        }
    } catch (error) {
        console.error('Error al enviar comentario:', error);
        alert('Hubo un problema al enviar el comentario.');
    }
}

/**
 * Elimina un comentario del servidor y del DOM.
 * @param {string} idComentario - El ID del comentario a eliminar.
 */
async function deleteComment(idComentario) {
    if (!confirm('¿Estás seguro de que deseas eliminar este comentario?')) {
        return;
    }

    try {
        const response = await fetch(`/api/comentarios/${idComentario}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (response.ok && result.success) {
            alert(result.message);
            // Elimina el comentario del DOM directamente
            const commentItem = document.querySelector(`.comment-item[data-comment-id="${idComentario}"]`);
            if (commentItem) {
                commentItem.remove();
                // Verificar si no quedan más comentarios y mostrar el mensaje "No hay comentarios aún."
                const commentsList = commentItem.closest('.comments-list');
                if (commentsList && commentsList.children.length === 0) {
                    const obraId = commentsList.id.replace('comments-list-', '');
                    const noCommentsMessage = document.getElementById(`no-comments-${obraId}`);
                    if (noCommentsMessage) {
                        noCommentsMessage.style.display = 'block';
                    }
                }
            }
        } else {
            alert(`Error al eliminar comentario: ${result.message || 'Error desconocido.'}`);
        }
    } catch (error) {
        console.error('Error al eliminar comentario:', error);
        alert('Hubo un problema al eliminar el comentario.');
    }
}

/**
 * Adjunta eventos de clic a todos los botones de eliminar comentario.
 * Se debe llamar cada vez que se añaden nuevos comentarios al DOM.
 */
function addCommentDeleteEventListeners() {
    document.querySelectorAll('.delete-comment-btn').forEach(button => {
        button.removeEventListener('click', handleCommentDeleteClick); // Previene duplicados
        button.addEventListener('click', handleCommentDeleteClick);
    });
}

function handleCommentDeleteClick() {
    const idComentario = this.dataset.commentId;
    deleteComment(idComentario);
}
// =========================================================================
// Todo el JS que interactúa con el DOM debe ir dentro de un ÚNICO DOMContentLoaded listener.
// =========================================================================

function addDeleteEventListeners() {
    console.log('addDeleteEventListeners() ejecutado.');
    const deleteButtons = document.querySelectorAll('.delete-obra-btn');
    console.log('Número de botones de eliminar encontrados:', deleteButtons.length);

    if (deleteButtons.length === 0) {
        console.warn('Advertencia: No se encontraron botones con la clase ".delete-obra-btn".');
    }

    deleteButtons.forEach(button => {
        button.removeEventListener('click', handleDeleteObraButtonClick); // Previene duplicados
        button.addEventListener('click', handleDeleteObraButtonClick);
        console.log('Listener adjuntado a botón de eliminar con ID:', button.dataset.obraId);
    });
}


/**
 * Manejador de evento para el clic en un botón de eliminar obra.
 * 'this' se refiere al botón clickeado.
 */
async function handleDeleteObraButtonClick() {
    console.log('handleDeleteObraButtonClick ejecutado.');
    const idObra = this.dataset.obraId;
    console.log('ID de obra a eliminar obtenido del botón:', idObra);

    if (!idObra) {
        console.error('ERROR: data-obra-id no encontrado o vacío en el botón de eliminar.');
        return;
    }
    await eliminarObra(idObra);
    console.log('Llamada a eliminarObra(idObra) completada.');
}

function addEditEventListeners() {
    console.log('addEditEventListeners() ejecutado.');
    const editButtons = document.querySelectorAll('.edit-obra-btn'); // <--- AHORA BUSCAMOS ESTA CLASE
    console.log('Número de botones de editar encontrados:', editButtons.length);

    if (editButtons.length === 0) {
        console.warn('Advertencia: No se encontraron botones con la clase ".edit-obra-btn".');
    }

    editButtons.forEach(button => {
        button.removeEventListener('click', handleEditObraButtonClick); // Previene duplicados
        button.addEventListener('click', handleEditObraButtonClick);
        console.log('Listener adjuntado a botón de editar con ID:', button.dataset.obraId);
    });
}

async function handleEditObraButtonClick() {
    console.log('handleEditObraButtonClick ejecutado.');
    const idObra = this.dataset.obraId;
    console.log('ID de obra a editar obtenido del botón:', idObra);

    if (!idObra) {
        console.error('ERROR: data-obra-id no encontrado o vacío en el botón de editar.');
        return;
    }

    // AQUI ES DONDE DEBES IMPLEMENTAR LA LOGICA DE EDICION
    // Esto podría ser:
    // 1. Redireccionar a una página de edición de obra:
    window.location.href = `/obras/editar/${idObra}`; // Asegúrate de tener una ruta en tu servidor para esto
    // 2. Abrir un modal o un formulario inline para la edición:
    // Por ahora, pondremos una alerta como placeholder.
    // alert(`Funcionalidad de edición para obra ID ${idObra} aún no implementada.`); 
}




document.addEventListener('DOMContentLoaded', () => {
    console.log("[FRONTEND DEBUG] DOMContentLoaded disparado. Iniciando script de perfil.");

    // ***** SCRIPT PARA ENVIAR SOLICITUD DE AMISTAD *****
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

    // --- CÓDIGO PARA RESPONDER SOLICITUDES (ACEPTAR/RECHAZAR) ---
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
    // LLAMADA INICIAL PARA CARGAR ÁLBUMES EN EL SELECT (si existe el elemento)
    // =============================================================
    if (document.getElementById('selectAlbum')) {
        cargarAlbumesParaSelect();
    }


    // ***** FUNCIONALIDADES EXCLUSIVAS DEL PROPIO PERFIL (CREAR ÁLBUM, SUBIR OBRA) *****
    const btnCrearAlbum = document.getElementById('btnCrearAlbum');
    const formCrearAlbumContainer = document.getElementById('formCrearAlbumContainer');
    const btnCancelarAlbum = document.getElementById('btnCancelarAlbum');
    const formNuevoAlbum = document.getElementById('formNuevoAlbum');
    const uploadImageForm = document.getElementById('uploadImageForm'); 
    const uploadMessage = document.getElementById('uploadMessage');
    const imageGrid = document.querySelector('.image-grid'); 

    if (btnCrearAlbum) { // Este bloque de código solo se ejecuta si el perfil es el propio (tiene el botón de crear álbum)
        console.log("[FRONTEND DEBUG] Detectado perfil propio. Activando funcionalidades.");

        // Mostrar/ocultar formulario de creación de álbum
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

        // Enviar formulario de nuevo álbum
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
                        await cargarAlbumesParaSelect(); // Recarga el select con el nuevo álbum
                        window.location.reload(); // Recarga la página para mostrar los cambios en los álbumes
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
                            // Remueve el mensaje "Aún no has subido ninguna obra." si existe
                            const noImagesMessage = imageGrid.querySelector('p'); 
                            if (noImagesMessage && noImagesMessage.textContent.includes('Aún no has subido ninguna obra.')) {
                                noImagesMessage.remove();
                            }

                            const newObraItem = document.createElement('div');
                            newObraItem.classList.add('image-item');
                            
                            newObraItem.innerHTML = `
                                <img src="/imagenes/${data.url_obra}" alt="${data.titulo_obra_opcional || 'Obra de usuario'}">
                                ${data.titulo_obra_opcional ? `<h4>${data.titulo_obra_opcional}</h4>` : ''}
                                ${data.precio && data.precio > 0 ? `<p>Precio: $${parseFloat(data.precio).toFixed(2)}</p>` : ''}
                                <div class="image-actions">
                                    <button class="btn btn-sm btn-info edit-obra-btn" data-obra-id="${data.id_obra}">Editar</button> 
                                    <button class="btn btn-sm btn-danger delete-obra-btn" data-obra-id="${data.id_obra}">Eliminar</button>
                                </div>
                                <div class="comments-section" data-obra-id="${data.id_obra}">
                                    <h5 class="mb-2">Comentarios:</h5>
                                    <div class="comments-list" id="comments-list-${data.id_obra}">
                                        <p class="text-muted text-center no-comments" id="no-comments-${data.id_obra}">No hay comentarios aún.</p>
                                    </div>
                                    <div class="add-comment-form mt-3">
                                        <h6>Añadir un comentario:</h6>
                                        <textarea class="form-control mb-2" rows="2" placeholder="Escribe tu comentario aquí..." id="comment-textarea-${data.id_obra}"></textarea>
                                        <button class="btn btn-sm btn-primary post-comment-btn" data-obra-id="${data.id_obra}">Comentar</button>
                                    </div>
                                </div>
                            `;
                            imageGrid.prepend(newObraItem); // Añade la nueva obra al principio de la cuadrícula
                            
                            // Re-adjuntar listeners para los nuevos botones de eliminar obra
                            addDeleteEventListeners(); 

                            // Cargar comentarios (aunque al inicio estará vacío) y adjuntar listeners para comentar y eliminar comentarios en la nueva obra
                            const newObraId = data.id_obra;
                            loadCommentsForObra(newObraId); 
                            
                            // Adjuntar listener para el botón de "Comentar" de la obra recién añadida
                            const newPostCommentBtn = newObraItem.querySelector('.post-comment-btn');
                            if (newPostCommentBtn) {
                                newPostCommentBtn.addEventListener('click', () => {
                                    const idObra = newPostCommentBtn.dataset.obraId;
                                    const textarea = document.getElementById(`comment-textarea-${idObra}`);
                                    postComment(idObra, textarea);
                                });
                            }
                            // Re-adjuntar listeners para eliminar comentarios, en caso de que se hayan cargado.
                            addCommentDeleteEventListeners();
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
    } // Fin del if (btnCrearAlbum) (que engloba las funcionalidades del propio perfil)


    // =============================================================
    // LÓGICA DE COMENTARIOS (Inicialización y Event Listeners)
    // =============================================================

    // Cargar comentarios para cada obra al cargar la página
    document.querySelectorAll('.image-item').forEach(obraElement => {
        const commentsSection = obraElement.querySelector('.comments-section');
        if (commentsSection) {
            const idObra = commentsSection.dataset.obraId; 
            if (idObra) {
                loadCommentsForObra(idObra); // Carga los comentarios para cada obra
            }
        }
    });

    // Adjuntar event listeners para los botones de "Comentar" que ya existen en el HTML
    document.querySelectorAll('.post-comment-btn').forEach(button => {
        button.addEventListener('click', () => {
            const idObra = button.dataset.obraId;
            const textarea = document.getElementById(`comment-textarea-${idObra}`);
            postComment(idObra, textarea);
        });
    });

    // Esto es importante para los comentarios que se cargan inicialmente.
    addCommentDeleteEventListeners();

    // Llama a la función addDeleteEventListeners al cargar la página
    // para que los botones de eliminar obras que ya están en el HTML funcionen.
    addDeleteEventListeners();

    // <--- AÑADE ESTA LÍNEA AQUÍ TAMBIÉN PARA LOS BOTONES DE EDITAR EXISTENTES
    addEditEventListeners(); 

}); // Cierre final del DOMContentLoaded