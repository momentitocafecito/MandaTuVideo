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

  refreshPatreonInfo();
}

/**********************************************
 * 3. Referencias a elementos DOM
 **********************************************/
const addSceneBtn = document.getElementById("addSceneBtn");
const sendAllBtn = document.getElementById("sendAllBtn");
const scenesContainer = document.getElementById("scenesContainer");
const logoutBtn = document.getElementById("logoutBtn");

// NUEVO: Referencia para mostrar contador
const charCounter = document.getElementById("charCounter");

// Evento de logout
logoutBtn.addEventListener("click", () => {
  // “Cerrar sesión” en tu app (no cierra la sesión global de Google)
  window.loggedInUserEmail = null;
  document.getElementById("mainContent").style.display = "none";
  document.getElementById("loginSection").style.display = "block";
});

/**********************************************
 * 4. Límite de caracteres
 **********************************************/
const MAX_CHARS = 400;
let totalCharacters = 0;

/**
 * Recalcula la suma de caracteres en TODOS los textarea
 * y actualiza interfaz y habilita/deshabilita botones.
 */
function updateCharacterCount() {
  const allTextareas = document.querySelectorAll("textarea");
  let sum = 0;

  allTextareas.forEach((ta) => {
    sum += ta.value.length;
  });

  totalCharacters = sum;
  
  // Actualiza el contador en pantalla
  if (charCounter) {
    charCounter.textContent = `${totalCharacters} / ${MAX_CHARS}`;
  }

  // Si llegamos o excedemos 400, deshabilitamos botones de agregar
  // Caso contrario, volvemos a habilitar
  const shouldDisable = (totalCharacters >= MAX_CHARS);

  addSceneBtn.disabled = shouldDisable;
  
  // Todos los botones de diálogo
  const allDialogueAddBtns = document.querySelectorAll(".add-dialogue-btn");
  allDialogueAddBtns.forEach(btn => {
    btn.disabled = shouldDisable;
  });
}

/**
 * Manejador de evento 'input' en cada textarea:
 * - Si al escribir pasamos de 400, se trunca lo escrito.
 * - Luego se llama a updateCharacterCount().
 */
function handleTextareaInput(e) {
  const textarea = e.target;

  // Si con lo que acaba de escribir ya se pasó de 400, se trunca
  // (pero primero recalculamos con el texto recién agregado)
  updateCharacterCount();
  
  if (totalCharacters > MAX_CHARS) {
    // Número de caracteres que sobra
    const overflow = totalCharacters - MAX_CHARS;
    // Truncamos el texto en el textarea actual
    const newValue = textarea.value.slice(0, textarea.value.length - overflow);
    textarea.value = newValue;

    // Volvemos a recalcular
    updateCharacterCount();
  }
}

/**********************************************
 * 5. Crear una nueva Escena
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
  // Seleccionar el primer lugar por defecto (opcional)
  if (PLACES_CATALOG.length > 0) {
    placeSelect.value = PLACES_CATALOG[0];
  }
  sceneBlock.appendChild(placeSelect);

  // Contenedor de diálogos
  const dialoguesContainer = document.createElement("div");
  dialoguesContainer.classList.add("dialogues-container");
  dialoguesContainer.id = `dialoguesContainer_${sceneIndex}`;
  sceneBlock.appendChild(dialoguesContainer);

  // Botón para agregar diálogos
  const addDialogueBtn = document.createElement("button");
  addDialogueBtn.type = "button";
  addDialogueBtn.classList.add("add-dialogue-btn");
  addDialogueBtn.innerText = "+";
  addDialogueBtn.addEventListener("click", () => {
    createDialogueBlock(sceneIndex, dialoguesContainer);
  });
  sceneBlock.appendChild(addDialogueBtn);

  // Botón de eliminar escena
  const deleteSceneBtn = document.createElement("button");
  deleteSceneBtn.type = "button";
  deleteSceneBtn.classList.add("delete-scene-btn");
  deleteSceneBtn.innerText = "🗑️";
  deleteSceneBtn.addEventListener("click", () => {
    scenesContainer.removeChild(sceneBlock);
    updateCharacterCount(); // Recalcular al eliminar toda la escena
  });
  sceneBlock.appendChild(deleteSceneBtn);

  return sceneBlock;
}

/**********************************************
 * 6. Crear un nuevo Diálogo dentro de una Escena
 **********************************************/
function createDialogueBlock(sceneIndex, container) {
  // Div principal del diálogo
  const dialogueGroup = document.createElement("div");
  dialogueGroup.classList.add("dialogue-group");
  dialogueGroup.style.display = "flex";
  dialogueGroup.style.alignItems = "flex-start";
  dialogueGroup.style.gap = "20px";

  // ----- Columna Izquierda: Personaje y Emoción -----
  const characterColumn = document.createElement("div");
  characterColumn.style.display = "flex";
  characterColumn.style.flexDirection = "column";
  characterColumn.style.alignItems = "center";

  // Imagen del personaje (por defecto, el primero)
  let currentCharacterIndex = 0;
  const currentChar = CHARACTERS_WITH_IMAGES[currentCharacterIndex];

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

  // Menú desplegable para elegir personaje
  const characterMenu = document.createElement("div");
  characterMenu.style.display = "none";
  characterMenu.style.position = "absolute";
  characterMenu.style.backgroundColor = "#fff";
  characterMenu.style.border = "1px solid #ccc";
  characterMenu.style.padding = "5px";
  characterMenu.style.borderRadius = "6px";
  characterMenu.style.zIndex = "999";

  // Input hidden para almacenar nombre del personaje
  const hiddenCharacterInput = document.createElement("input");
  hiddenCharacterInput.type = "hidden";
  hiddenCharacterInput.name = `character_${sceneIndex}[]`;
  hiddenCharacterInput.value = currentChar.name;

  // Contenedor relativo para la imagen y el menú
  const charImageWrapper = document.createElement("div");
  charImageWrapper.style.position = "relative";
  charImageWrapper.appendChild(characterImg);
  charImageWrapper.appendChild(characterMenu);

  // Evento para mostrar/ocultar menú
  characterImg.addEventListener("click", () => {
    characterMenu.style.display =
      characterMenu.style.display === "none" ? "block" : "none";
  });

  // Llenamos el menú con las imágenes de los personajes
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

  // Dropdown Emoción
  const emoSelect = document.createElement("select");
  emoSelect.name = `emotion_${sceneIndex}[]`;
  EMOTIONS_CATALOG.forEach((emo) => {
    const option = document.createElement("option");
    option.value = emo;
    option.text = emo;
    emoSelect.appendChild(option);
  });
  if (EMOTIONS_CATALOG.length > 0) {
    emoSelect.value = EMOTIONS_CATALOG[0];
  }
  characterColumn.appendChild(emoSelect);

  dialogueGroup.appendChild(characterColumn);

  // ----- Columna Derecha: Texto y Onomatopeyas -----
  const contentColumn = document.createElement("div");
  contentColumn.style.display = "flex";
  contentColumn.style.flexDirection = "column";
  contentColumn.style.flex = "1";

  // Cuadro de texto (textarea)
  const dialogueInput = document.createElement("textarea");
  dialogueInput.name = `dialogueText_${sceneIndex}[]`;
  dialogueInput.rows = 3;
  dialogueInput.placeholder = "Escribe aquí lo que dice el personaje...";
  dialogueInput.style.width = "100%";
  dialogueInput.style.boxSizing = "border-box";
  dialogueInput.style.marginBottom = "10px";

  // Nuevo: listener para contar y truncar
  dialogueInput.addEventListener("input", handleTextareaInput);

  contentColumn.appendChild(dialogueInput);

  // Dropdown de Onomatopeyas
  const onomaSelect = document.createElement("select");
  onomaSelect.name = `onomatopeia_${sceneIndex}[]`;

  // Opción por defecto
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.text = "Agregar onomatopeya";
  onomaSelect.appendChild(defaultOption);

  // Opciones reales
  ONOMATOPEIAS_CATALOG.forEach((ono) => {
    const option = document.createElement("option");
    option.value = ono;
    option.text = ono;
    onomaSelect.appendChild(option);
  });
  contentColumn.appendChild(onomaSelect);

  dialogueGroup.appendChild(contentColumn);

  // Botón eliminar diálogo
  const deleteDialogueBtn = document.createElement("button");
  deleteDialogueBtn.type = "button";
  deleteDialogueBtn.classList.add("delete-dialogue-btn");
  deleteDialogueBtn.innerText = "🗑️";
  deleteDialogueBtn.style.alignSelf = "flex-end";
  deleteDialogueBtn.style.marginTop = "5px";
  deleteDialogueBtn.addEventListener("click", () => {
    container.removeChild(dialogueGroup);
    updateCharacterCount(); // Recalcular tras eliminar
  });
  dialogueGroup.appendChild(deleteDialogueBtn);

  container.appendChild(dialogueGroup);

  // Al crear un diálogo, recalculamos el contador
  updateCharacterCount();
}

/**********************************************
 * 7. Agregar la primera escena al cargar (opcional)
 **********************************************/
document.addEventListener("DOMContentLoaded", () => {
  addSceneBtn.click();
});

/**********************************************
 * 8. Evento: Agregar Nueva Escena
 **********************************************/
addSceneBtn.addEventListener("click", () => {
  const sceneCount = document.querySelectorAll(".scene-block").length;
  const newScene = createSceneBlock(sceneCount);
  scenesContainer.appendChild(newScene);
  // Recalc después de agregar
  updateCharacterCount();
});

/**********************************************
 * 9. Evento: "Enviar" Todo
 **********************************************/
sendAllBtn.addEventListener("click", () => {
  let finalMessage = "";
  const allScenes = document.querySelectorAll(".scene-block");

  if (allScenes.length === 0) {
    alert("No has agregado ninguna escena.");
    return;
  }

  // Recorremos escenas y formamos finalMessage
  allScenes.forEach((scene, index) => {
    finalMessage += `=== Escena #${index + 1} ===\n`;

    const placeSelect = scene.querySelector(`select[name="scenePlace_${index}"]`);
    const placeValue = placeSelect?.value.trim() || "Sin lugar definido";
    finalMessage += `Lugar: ${placeValue}\n\n`;

    const dialogueGroups = scene.querySelectorAll(".dialogue-group");
    dialogueGroups.forEach((dg) => {
      const charInput = dg.querySelector(`input[name="character_${index}[]"]`);
      const characterValue = (charInput?.value.trim()) || "Personaje desconocido";

      const emoSelect = dg.querySelector(`select[name="emotion_${index}[]"]`);
      const emotionValue = emoSelect?.value.trim() || "Sin emoción";

      const dialogueInput = dg.querySelector(`textarea[name="dialogueText_${index}[]"]`);
      const dialogueValue = dialogueInput?.value.trim() || "Diálogo vacío";

      // Onomatopeya
      const onomaSelect = dg.querySelector(`select[name="onomatopeia_${index}[]"]`);
      const onomaValue = onomaSelect ? onomaSelect.value.trim() : "";

      finalMessage += `Personaje: ${characterValue} | Emoción: ${emotionValue}\n`;
      finalMessage += `Diálogo: ${dialogueValue}\n`;
      finalMessage += `Onomatopeya: ${onomaValue}\n\n`;
    });
    finalMessage += "-----------------------------\n\n";
  });

  // Guardamos en variable global
  pendingMessage = finalMessage;

  // En lugar de textContent, usamos innerHTML con <pre>
  confirmationMessage.innerHTML = `
    <p><strong>Se enviará el siguiente contenido:</strong></p>
    <pre>${finalMessage}</pre>
  `;
  
  confirmationOverlay.style.display = "flex"; // Muestra el popup
});

/**********************************************
 * 10. Popups, confirmación y envío a GitHub
 **********************************************/
const confirmationOverlay = document.getElementById("confirmationOverlay");
const confirmationMessage = document.getElementById("confirmationMessage");
const confirmSendBtn = document.getElementById("confirmSendBtn");
const cancelSendBtn = document.getElementById("cancelSendBtn");

const successOverlay = document.getElementById("successOverlay");
const successMessage = document.getElementById("successMessage");
let pendingMessage = ""; // almacenar el mensaje pendiente

confirmSendBtn.addEventListener("click", () => {
  confirmationOverlay.style.display = "none";
  sendDialogToGitHub(pendingMessage);
});

cancelSendBtn.addEventListener("click", () => {
  confirmationOverlay.style.display = "none";
});

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
      note: "Información adicional",
      transformado: "false"
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
        showSuccessMessage();
      }
    })
    .catch(err => {
      console.error("Error en la petición:", err);
      alert("Error desconocido al guardar.");
    });
}

function showSuccessMessage() {
  successMessage.textContent = "Mensaje Enviado, gracias por confiar en Momentito Cafecito, te llegará un correo en ~24 hrs con tu video.";
  successOverlay.style.display = "flex";

  // Cerrar en 5 segundos
  setTimeout(() => {
    successOverlay.style.display = "none";
  }, 5500);
}

/**********************************************
 * 11. Registro de Correo Patreon
 **********************************************/
const nombrePatreonInput = document.getElementById("nombrePatreonInput");
const registrarCorreoBtn = document.getElementById("registrarCorreoBtn");

registrarCorreoBtn.addEventListener("click", () => {
  const nombrePatreon = nombrePatreonInput.value.trim();
  const correoUsuario = window.loggedInUserEmail || "";

  console.log("Registrando correo con los siguientes datos:", { nombrePatreon, correoUsuario });

  fetch("/.netlify/functions/registro", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombrePatreon, correoUsuario })
  })
    .then(res => {
      console.log("Respuesta HTTP:", res.status);
      return res.json();
    })
    .then(data => {
      console.log("Respuesta de registro:", data);
      if (data.error) {
        alert("Error: " + data.error);
      } else {
        alert("Registrado: " + data.message);
      }
    })
    .catch(err => {
      console.error("Error en la petición:", err);
      alert("Ocurrió un error inesperado al registrar: " + err);
    });
});



// Función para actualizar los indicadores de cuota desde Netlify Functions
async function refreshPatreonInfo() {
  if (!window.loggedInUserEmail) return;
  
  try {
    const response = await fetch(
      `/.netlify/functions/calculate_quota?email=${encodeURIComponent(window.loggedInUserEmail)}`
    );
    if (!response.ok) {
      console.error("Error al obtener información de cuota", response.statusText);
      return;
    }
    const data = await response.json();
    // Actualizar los elementos de la UI
    document.getElementById("fechaSuscript").textContent    = data.fecha_suscript || 0;
    document.getElementById("cuotaMensual").textContent     = data.cuota_mensual || 0;
    document.getElementById("videosProcesados").textContent = data.videos_procesados || 0;
  } catch (error) {
    console.error("Error en refreshPatreonInfo:", error);
  }
}