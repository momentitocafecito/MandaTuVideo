/**********************************************
 * 1. Auxiliar: Decodificar JWT de Google
 **********************************************/
function parseJwt(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    window.atob(base64).split('').map(c =>
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join('')
  );
  return JSON.parse(jsonPayload);
}

/**********************************************
 * 2. Respuesta del Login con Google
 **********************************************/
function handleCredentialResponse(response) {
  console.log("Credenciales recibidas:", response.credential);

  const tokenPayload = parseJwt(response.credential);
  console.log("Usuario autenticado:", tokenPayload);

  // Guardar el email en una variable global
  window.loggedInUserEmail = tokenPayload.email || "usuario_desconocido";

  // Mostrar el email en la interfaz
  const userEmailDisplay = document.getElementById("userEmailDisplay");
  userEmailDisplay.innerText = window.loggedInUserEmail;

  // Ocultar loginSection, mostrar mainContent
  document.getElementById("loginSection").style.display = "none";
  document.getElementById("mainContent").style.display = "block";
}

/**********************************************
 * 3. Referencias a elementos DOM
 **********************************************/
const addSceneBtn = document.getElementById("addSceneBtn");
const sendAllBtn = document.getElementById("sendAllBtn");
const scenesContainer = document.getElementById("scenesContainer");
const logoutBtn = document.getElementById("logoutBtn");

// Evento de logout
logoutBtn.addEventListener("click", () => {
  // “Cerrar sesión” en tu app (no cierra la sesión global de Google)
  window.loggedInUserEmail = null;
  document.getElementById("mainContent").style.display = "none";
  document.getElementById("loginSection").style.display = "block";
});

/**********************************************
 * 4. Crear una nueva Escena
 **********************************************/
function createSceneBlock(sceneIndex) {
  const sceneBlock = document.createElement("div");
  sceneBlock.classList.add("scene-block");
  sceneBlock.dataset.sceneIndex = sceneIndex;

  // Título
  const sceneHeader = document.createElement("div");
  sceneHeader.classList.add("scene-header");
  sceneHeader.innerText = `Escena #${sceneIndex + 1}`;
  sceneBlock.appendChild(sceneHeader);

  // Dropdown para 'Lugar de la escena'
  const placeSelect = document.createElement("select");
  placeSelect.name = `scenePlace_${sceneIndex}`;
  placeSelect.innerHTML = `<option value="">--Selecciona un lugar--</option>`;
  PLACES_CATALOG.forEach((place) => {
    const option = document.createElement("option");
    option.value = place;
    option.text = place;
    placeSelect.appendChild(option);
  });
  // Seleccionar el primer lugar por defecto
  if (PLACES_CATALOG.length > 0) {
    placeSelect.value = PLACES_CATALOG[0];
  }
  sceneBlock.appendChild(placeSelect);

  // Contenedor de diálogos
  const dialoguesContainer = document.createElement("div");
  dialoguesContainer.classList.add("dialogues-container");
  dialoguesContainer.id = `dialoguesContainer_${sceneIndex}`;
  sceneBlock.appendChild(dialoguesContainer);

  // Botón circular para agregar diálogos
  const addDialogueBtn = document.createElement("button");
  addDialogueBtn.type = "button";
  addDialogueBtn.classList.add("add-dialogue-btn");
  addDialogueBtn.innerText = "+";
  addDialogueBtn.addEventListener("click", () => {
    createDialogueBlock(sceneIndex, dialoguesContainer);
  });
  sceneBlock.appendChild(addDialogueBtn);

  // Botón de eliminar escena (bote de basura)
  const deleteSceneBtn = document.createElement("button");
  deleteSceneBtn.type = "button";
  deleteSceneBtn.classList.add("delete-scene-btn");
  deleteSceneBtn.innerText = "🗑️";
  deleteSceneBtn.addEventListener("click", () => {
    scenesContainer.removeChild(sceneBlock);
  });
  sceneBlock.appendChild(deleteSceneBtn);

  return sceneBlock;
}

/**********************************************
 * 5. Crear un nuevo Diálogo dentro de una Escena
 **********************************************/
// function createDialogueBlock(sceneIndex, container) {
//   const dialogueGroup = document.createElement("div");
//   dialogueGroup.classList.add("dialogue-group");

//   const dialogueInfo = document.createElement("div");
//   dialogueInfo.classList.add("dialogue-info");

//   // Personaje (dropdown)
//   const charContainer = document.createElement("div");
//   charContainer.classList.add("char-container");
//   const charSelect = document.createElement("select");
//   charSelect.name = `character_${sceneIndex}[]`;
//   charSelect.innerHTML = `<option value="">--Selecciona un personaje--</option>`;
//   CHARACTERS_CATALOG.forEach((char) => {
//     const option = document.createElement("option");
//     option.value = char;
//     option.text = char;
//     charSelect.appendChild(option);
//   });
//   if (CHARACTERS_CATALOG.length > 0) {
//     charSelect.value = CHARACTERS_CATALOG[0];
//   }
//   charContainer.appendChild(charSelect);
//   dialogueInfo.appendChild(charContainer);

//   // Emoción (dropdown)
//   const emoContainer = document.createElement("div");
//   emoContainer.classList.add("emo-container");
//   const emoSelect = document.createElement("select");
//   emoSelect.name = `emotion_${sceneIndex}[]`;
//   emoSelect.innerHTML = `<option value="">--Selecciona una emoción--</option>`;
//   EMOTIONS_CATALOG.forEach((emo) => {
//     const option = document.createElement("option");
//     option.value = emo;
//     option.text = emo;
//     emoSelect.appendChild(option);
//   });
//   if (EMOTIONS_CATALOG.length > 0) {
//     emoSelect.value = EMOTIONS_CATALOG[0];
//   }
//   emoContainer.appendChild(emoSelect);
//   dialogueInfo.appendChild(emoContainer);

//   dialogueGroup.appendChild(dialogueInfo);

//   // Textarea de diálogo (sin etiqueta "Diálogo:")
//   const dialogueInput = document.createElement("textarea");
//   dialogueInput.name = `dialogueText_${sceneIndex}[]`;
//   dialogueInput.rows = 3;
//   dialogueInput.placeholder = "Escribe aquí lo que dice el personaje...";
//   dialogueGroup.appendChild(dialogueInput);

//   // Botón para eliminar este diálogo
//   const deleteDialogueBtn = document.createElement("button");
//   deleteDialogueBtn.type = "button";
//   deleteDialogueBtn.classList.add("delete-dialogue-btn");
//   deleteDialogueBtn.innerText = "🗑️";
//   deleteDialogueBtn.addEventListener("click", () => {
//     container.removeChild(dialogueGroup);
//   });
//   dialogueGroup.appendChild(deleteDialogueBtn);

//   container.appendChild(dialogueGroup);
// }

function createDialogueBlock(sceneIndex, container) {
  // Div principal de cada diálogo
  const dialogueGroup = document.createElement("div");
  dialogueGroup.classList.add("dialogue-group");

  // Usaremos display flex para colocar la "columna de personaje" a la izquierda y el textarea a la derecha
  dialogueGroup.style.display = "flex";
  dialogueGroup.style.alignItems = "flex-start";

  // Contenedor de la columna izquierda (imagen + menú + emoción)
  const characterColumn = document.createElement("div");
  characterColumn.style.display = "flex";
  characterColumn.style.flexDirection = "column";
  characterColumn.style.alignItems = "center";
  characterColumn.style.marginRight = "20px";

  // ========== PERSONAJE CON IMAGEN ==========
  // Elegimos el primer personaje por defecto
  let currentCharacterIndex = 0;
  const currentChar = CHARACTERS_WITH_IMAGES[currentCharacterIndex];

  // Imagen principal del personaje
  const characterImg = document.createElement("img");
  characterImg.src = currentChar.image;
  characterImg.alt = currentChar.name;
  characterImg.style.width = "80px";
  characterImg.style.height = "80px";
  characterImg.style.objectFit = "cover";
  characterImg.style.borderRadius = "50%";
  characterImg.style.cursor = "pointer";
  characterImg.style.border = "3px solid #ccc";
  characterImg.style.marginBottom = "10px";

  // Menú desplegable (galería de personajes)
  const characterMenu = document.createElement("div");
  characterMenu.style.display = "none";
  characterMenu.style.position = "absolute";
  characterMenu.style.backgroundColor = "#fff";
  characterMenu.style.border = "1px solid #ccc";
  characterMenu.style.padding = "5px";
  characterMenu.style.borderRadius = "6px";
  characterMenu.style.zIndex = "999";

  // Input hidden para guardar el nombre del personaje seleccionado
  const hiddenCharacterInput = document.createElement("input");
  hiddenCharacterInput.type = "hidden";
  hiddenCharacterInput.name = `character_${sceneIndex}[]`;
  hiddenCharacterInput.value = currentChar.name;

  // Para posicionar el menú debajo de la imagen, anidamos un contenedor con position relative
  const charImageWrapper = document.createElement("div");
  charImageWrapper.style.position = "relative";
  charImageWrapper.appendChild(characterImg);
  charImageWrapper.appendChild(characterMenu);

  // Al hacer clic en la imagen, mostramos u ocultamos el menú
  characterImg.addEventListener("click", () => {
    if (characterMenu.style.display === "none") {
      characterMenu.style.display = "block";
    } else {
      characterMenu.style.display = "none";
    }
  });

  // Llenamos el menú con las otras imágenes
  CHARACTERS_WITH_IMAGES.forEach((charObj, idx) => {
    const charOptionImg = document.createElement("img");
    charOptionImg.src = charObj.image;
    charOptionImg.alt = charObj.name;
    charOptionImg.style.width = "50px";
    charOptionImg.style.height = "50px";
    charOptionImg.style.objectFit = "cover";
    charOptionImg.style.borderRadius = "50%";
    charOptionImg.style.cursor = "pointer";
    charOptionImg.style.margin = "5px";

    // Al hacer clic en una miniatura, actualizamos el personaje principal
    charOptionImg.addEventListener("click", () => {
      characterImg.src = charObj.image;
      characterImg.alt = charObj.name;
      hiddenCharacterInput.value = charObj.name;
      currentCharacterIndex = idx;
      characterMenu.style.display = "none";
    });

    characterMenu.appendChild(charOptionImg);
  });

  characterColumn.appendChild(charImageWrapper);
  characterColumn.appendChild(hiddenCharacterInput);

  // ========== EMOCIÓN (debajo de la imagen) ==========
  const emoSelect = document.createElement("select");
  emoSelect.name = `emotion_${sceneIndex}[]`;
  EMOTIONS_CATALOG.forEach((emo) => {
    const option = document.createElement("option");
    option.value = emo;
    option.text = emo;
    emoSelect.appendChild(option);
  });
  // Seleccionar la primera emoción por defecto
  if (EMOTIONS_CATALOG.length > 0) {
    emoSelect.value = EMOTIONS_CATALOG[0];
  }
  characterColumn.appendChild(emoSelect);

  // Agregamos la columna de personaje al diálogo
  dialogueGroup.appendChild(characterColumn);

  // ========== TEXTAREA (derecha) ==========
  const dialogueInput = document.createElement("textarea");
  dialogueInput.name = `dialogueText_${sceneIndex}[]`;
  dialogueInput.rows = 3;
  dialogueInput.placeholder = "Escribe aquí lo que dice el personaje...";
  // Ancho flexible
  dialogueInput.style.flex = "1";
  dialogueInput.style.width = "100%";
  dialogueInput.style.marginRight = "10px";
  dialogueGroup.appendChild(dialogueInput);

  // ========== BOTÓN ELIMINAR DIÁLOGO ==========
  const deleteDialogueBtn = document.createElement("button");
  deleteDialogueBtn.type = "button";
  deleteDialogueBtn.classList.add("delete-dialogue-btn");
  deleteDialogueBtn.innerText = "🗑️";
  deleteDialogueBtn.style.marginTop = "5px";
  deleteDialogueBtn.addEventListener("click", () => {
    container.removeChild(dialogueGroup);
  });
  dialogueGroup.appendChild(deleteDialogueBtn);

  // Finalmente, agregamos el 'dialogueGroup' al container
  container.appendChild(dialogueGroup);
}


/**********************************************
 * 6. Agregar la primera escena al cargar (opcional)
 **********************************************/
document.addEventListener("DOMContentLoaded", () => {
  addSceneBtn.click();
});

/**********************************************
 * 7. Evento: Agregar Nueva Escena
 **********************************************/
addSceneBtn.addEventListener("click", () => {
  const sceneCount = document.querySelectorAll(".scene-block").length;
  const newScene = createSceneBlock(sceneCount);
  scenesContainer.appendChild(newScene);
});

/**********************************************
 * 8. Evento: "Enviar" Todo
 *    - Recorre las escenas/diálogos
 *    - Manda el contenido a GitHub (sendDialogToGitHub)
 **********************************************/
sendAllBtn.addEventListener("click", () => {
  let finalMessage = "";
  const allScenes = document.querySelectorAll(".scene-block");

  if (allScenes.length === 0) {
    alert("No has agregado ninguna escena.");
    return;
  }

  allScenes.forEach((scene, index) => {
    finalMessage += `=== Escena #${index + 1} ===\n`;

    const placeSelect = scene.querySelector(`select[name="scenePlace_${index}"]`);
    const placeValue = placeSelect.value.trim() || "Sin lugar definido";
    finalMessage += `Lugar: ${placeValue}\n\n`;

    // Diálogos
    const dialogueGroups = scene.querySelectorAll(".dialogue-group");
    dialogueGroups.forEach((dg) => {
      // const charSelect = dg.querySelector(`select[name="character_${index}[]"]`);
      // const characterValue = charSelect.value.trim() || "Personaje desconocido";
      const charInput = dg.querySelector(`input[name="character_${index}[]"]`);
      const characterValue = (charInput && charInput.value.trim()) || "Personaje desconocido";

      const emoSelect = dg.querySelector(`select[name="emotion_${index}[]"]`);
      const emotionValue = emoSelect.value.trim() || "Sin emoción";

      const dialogueInput = dg.querySelector(`textarea[name="dialogueText_${index}[]"]`);
      const dialogueValue = dialogueInput.value.trim() || "Diálogo vacío";

      finalMessage += `Personaje: ${characterValue} | Emoción: ${emotionValue}\n`;
      finalMessage += `Diálogo: ${dialogueValue}\n\n`;
    });

    finalMessage += "-----------------------------\n\n";
  });

  // Vista previa
  document.getElementById("logContent").innerText = finalMessage;

  // Enviar el JSON a Netlify
  sendDialogToGitHub(finalMessage);
});

/**********************************************
 * 9. Función para enviar el JSON a Netlify (serverless)
 **********************************************/
function sendDialogToGitHub(finalMessage) {
  const debugInfo = document.getElementById("debugInfo");

  // Email del usuario
  const usuario = window.loggedInUserEmail || "usuario_desconocido";
  const momento = new Date().toISOString();

  const payload = {
    usuario,
    momento,
    contenido: finalMessage,
    otros: {
      ip: "127.0.0.1",
      note: "Información adicional"
    }
  };

  debugInfo.innerText = "Enviando payload:\n\n" + JSON.stringify(payload, null, 2);

  fetch("/.netlify/functions/saveDialog", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
    .then((res) => res.json())
    .then((data) => {
      debugInfo.innerText += "\n\nRespuesta:\n\n" + JSON.stringify(data, null, 2);
      if (data.error) {
        alert("Hubo un error guardando el archivo: " + data.error);
        if (data.details) {
          debugInfo.innerText += "\n\nDetalles del error:\n" + data.details;
        }
      } else {
        alert("¡Tu archivo JSON fue guardado con éxito en GitHub!");
      }
    })
    .catch((err) => {
      console.error("Error en la petición:", err);
      debugInfo.innerText += "\n\nError en la petición:\n" + err;
      alert("Error desconocido al guardar.");
    });
}


/**********************************************
 * 1) Referencias a elementos del popup y overlay
 **********************************************/
const confirmationOverlay = document.getElementById("confirmationOverlay");
const confirmationMessage = document.getElementById("confirmationMessage");
const confirmSendBtn = document.getElementById("confirmSendBtn");
const cancelSendBtn = document.getElementById("cancelSendBtn");

const successOverlay = document.getElementById("successOverlay");
const successMessage = document.getElementById("successMessage");
// Para almacenar el mensaje pendiente
let pendingMessage = "";

/**********************************************
 * 2) Botón "Enviar" (dos pasos)
 **********************************************/
sendAllBtn.addEventListener("click", () => {
  let finalMessage = "";
  const allScenes = document.querySelectorAll(".scene-block");

  if (allScenes.length === 0) {
    alert("No has agregado ninguna escena.");
    return;
  }

  allScenes.forEach((scene, index) => {
    finalMessage += `=== Escena #${index + 1} ===\n`;

    // Ej: si tu "Lugar" está en un <select>
    const placeSelect = scene.querySelector(`select[name="scenePlace_${index}"]`);
    const placeValue = placeSelect?.value.trim() || "Sin lugar definido";
    finalMessage += `Lugar: ${placeValue}\n\n`;

    // Diálogos
    const dialogueGroups = scene.querySelectorAll(".dialogue-group");
    dialogueGroups.forEach((dg) => {
      // Personaje (usando input hidden o select, según tu implementación)
      const charInput = dg.querySelector(`input[name="character_${index}[]"]`);
      const characterValue = (charInput?.value.trim()) || "Personaje desconocido";

      // Emoción
      const emoSelect = dg.querySelector(`select[name="emotion_${index}[]"]`);
      const emotionValue = emoSelect?.value.trim() || "Sin emoción";

      // Texto
      const dialogueInput = dg.querySelector(`textarea[name="dialogueText_${index}[]"]`);
      const dialogueValue = (dialogueInput?.value.trim()) || "Diálogo vacío";

      finalMessage += `Personaje: ${characterValue} | Emoción: ${emotionValue}\n`;
      finalMessage += `Diálogo: ${dialogueValue}\n\n`;
    });

    finalMessage += "-----------------------------\n\n";
  });

  pendingMessage = finalMessage;

  // Mostramos en popup
  confirmationMessage.textContent = `Se enviará el siguiente contenido:\n\n${finalMessage}`;
  confirmationOverlay.style.display = "flex"; // mostrar overlay
});


/**********************************************
 * 3) Botón "Confirmar": envía y cierra popup
 **********************************************/
confirmSendBtn.addEventListener("click", () => {
  // Cerrar popup de confirmación
  confirmationOverlay.style.display = "none";

  // Llamar a la función real de envío
  sendDialogToGitHub(pendingMessage);
});

/**********************************************
 * 4) Botón "Regresar": cierra popup sin enviar
 **********************************************/
cancelSendBtn.addEventListener("click", () => {
  confirmationOverlay.style.display = "none";
});


/**********************************************
 * 5) Función de envío a GitHub
 *    Al terminar con éxito, muestra el successOverlay.
 **********************************************/
function sendDialogToGitHub(finalMessage) {
  const debugInfo = document.getElementById("debugInfo");
  const usuario = window.loggedInUserEmail || "usuario_desconocido";
  const momento = new Date().toISOString();

  const payload = {
    usuario,
    momento,
    contenido: finalMessage,
    otros: {
      ip: "127.0.0.1",
      note: "Información adicional"
    }
  };

  if (debugInfo) {
    debugInfo.innerText = "Enviando payload:\n\n" + JSON.stringify(payload, null, 2);
  }

  fetch("/.netlify/functions/saveDialog", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
    .then(res => res.json())
    .then(data => {
      if (debugInfo) {
        debugInfo.innerText += "\n\nRespuesta:\n\n" + JSON.stringify(data, null, 2);
      }

      if (data.error) {
        alert("Hubo un error guardando el archivo: " + data.error);
        if (data.details) {
          console.error("Detalles del error:", data.details);
        }
      } else {
        // Mensaje de éxito
        showSuccessMessage();
      }
    })
    .catch(err => {
      console.error("Error en la petición:", err);
      alert("Error desconocido al guardar.");
    });
}

/**********************************************
 * 6) Mostrar mensaje de exito 5s => cerrar
 **********************************************/
function showSuccessMessage() {
  successMessage.textContent = "Mensaje Enviado, gracias por confiar en Momentito cafecito";
  successOverlay.style.display = "flex";

  // Cerrar en 5 segundos
  setTimeout(() => {
    successOverlay.style.display = "none";
  }, 5000);
}
