/**********************************************
 * 1. Auxiliar: Decodificar JWT de Google
 **********************************************/
function parseJwt(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    window.atob(base64).split('').map((c) =>
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
function createDialogueBlock(sceneIndex, container) {
  const dialogueGroup = document.createElement("div");
  dialogueGroup.classList.add("dialogue-group");

  const dialogueInfo = document.createElement("div");
  dialogueInfo.classList.add("dialogue-info");

  // Personaje (dropdown)
  const charContainer = document.createElement("div");
  charContainer.classList.add("char-container");
  const charSelect = document.createElement("select");
  charSelect.name = `character_${sceneIndex}[]`;
  charSelect.innerHTML = `<option value="">--Selecciona un personaje--</option>`;
  CHARACTERS_CATALOG.forEach((char) => {
    const option = document.createElement("option");
    option.value = char;
    option.text = char;
    charSelect.appendChild(option);
  });
  if (CHARACTERS_CATALOG.length > 0) {
    charSelect.value = CHARACTERS_CATALOG[0];
  }
  charContainer.appendChild(charSelect);
  dialogueInfo.appendChild(charContainer);

  // Emoción (dropdown)
  const emoContainer = document.createElement("div");
  emoContainer.classList.add("emo-container");
  const emoSelect = document.createElement("select");
  emoSelect.name = `emotion_${sceneIndex}[]`;
  emoSelect.innerHTML = `<option value="">--Selecciona una emoción--</option>`;
  EMOTIONS_CATALOG.forEach((emo) => {
    const option = document.createElement("option");
    option.value = emo;
    option.text = emo;
    emoSelect.appendChild(option);
  });
  if (EMOTIONS_CATALOG.length > 0) {
    emoSelect.value = EMOTIONS_CATALOG[0];
  }
  emoContainer.appendChild(emoSelect);
  dialogueInfo.appendChild(emoContainer);

  dialogueGroup.appendChild(dialogueInfo);

  // Textarea de diálogo (sin etiqueta "Diálogo:")
  const dialogueInput = document.createElement("textarea");
  dialogueInput.name = `dialogueText_${sceneIndex}[]`;
  dialogueInput.rows = 3;
  dialogueInput.placeholder = "Escribe aquí lo que dice el personaje...";
  dialogueGroup.appendChild(dialogueInput);

  // Botón para eliminar este diálogo
  const deleteDialogueBtn = document.createElement("button");
  deleteDialogueBtn.type = "button";
  deleteDialogueBtn.classList.add("delete-dialogue-btn");
  deleteDialogueBtn.innerText = "🗑️";
  deleteDialogueBtn.addEventListener("click", () => {
    container.removeChild(dialogueGroup);
  });
  dialogueGroup.appendChild(deleteDialogueBtn);

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
      const charSelect = dg.querySelector(`select[name="character_${index}[]"]`);
      const characterValue = charSelect.value.trim() || "Personaje desconocido";

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
