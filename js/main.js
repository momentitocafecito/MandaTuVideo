// ======== FUNCIONES DE LOGIN CON GOOGLE ========
// Esta función será llamada automáticamente al recibir la respuesta de Google Identity Services.
function handleCredentialResponse(response) {
    // "response.credential" es el token JWT devuelto por Google
    console.log("Credenciales recibidas:", response.credential);
    // Aquí podrías procesar el token JWT recibido en response.credential para validarlo en el servidor.
    // Por este ejemplo, asumiremos que la autenticación fue exitosa.
    console.log("Usuario autenticado:", response);
  
    // Ocultamos la sección de login y mostramos el contenido principal
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("mainContent").style.display = "block";
  }
  
  // ======== FIN DEL LOGIN ========
  
  
  // ============ REFERENCIAS A ELEMENTOS DEL DOM ============
  const addSceneBtn = document.getElementById("addSceneBtn");
  const sendAllBtn = document.getElementById("sendAllBtn");
  const scenesContainer = document.getElementById("scenesContainer");
  
  // Contador para identificar escenas de forma única
  let sceneCount = 0;
  
  
  // ============ FUNCIÓN PARA CREAR UNA NUEVA ESCENA ============
  function createSceneBlock(sceneIndex) {
    // Contenedor principal de la escena
    const sceneBlock = document.createElement("div");
    sceneBlock.classList.add("scene-block");
    sceneBlock.dataset.sceneIndex = sceneIndex;
  
    // Título de la escena
    const sceneHeader = document.createElement("div");
    sceneHeader.classList.add("scene-header");
    sceneHeader.innerText = `Escena #${sceneIndex + 1}`;
    sceneBlock.appendChild(sceneHeader);
  
    // Selección de lugar (catálogo) + opción de escribir uno nuevo
    const placeLabel = document.createElement("label");
    placeLabel.innerText = "Lugar de la escena:";
    sceneBlock.appendChild(placeLabel);
  
    const placeSelect = document.createElement("select");
    placeSelect.name = `scenePlace_${sceneIndex}`;
    placeSelect.innerHTML = `<option value="">--Selecciona un lugar--</option>`;
    PLACES_CATALOG.forEach((place) => {
      const option = document.createElement("option");
      option.value = place;
      option.text = place;
      placeSelect.appendChild(option);
    });
    sceneBlock.appendChild(placeSelect);
  
    // Input para escribir un lugar nuevo (opcional)
    const placeInput = document.createElement("input");
    placeInput.type = "text";
    placeInput.placeholder = "O escribe un lugar nuevo...";
    placeInput.name = `scenePlaceCustom_${sceneIndex}`;
    sceneBlock.appendChild(placeInput);
  
    // Contenedor de diálogos
    const dialoguesContainer = document.createElement("div");
    dialoguesContainer.classList.add("dialogues-container");
    dialoguesContainer.id = `dialoguesContainer_${sceneIndex}`;
    sceneBlock.appendChild(dialoguesContainer);
  
    // Botón para agregar diálogos dentro de esta escena
    const addDialogueBtn = document.createElement("button");
    addDialogueBtn.type = "button";
    addDialogueBtn.innerText = "Agregar diálogo (+)";
    addDialogueBtn.addEventListener("click", () => {
      createDialogueBlock(sceneIndex, dialoguesContainer);
    });
    sceneBlock.appendChild(addDialogueBtn);
  
    return sceneBlock;
  }
  
  
  // ============ FUNCIÓN PARA CREAR UN NUEVO DIÁLOGO DENTRO DE UNA ESCENA ============
  function createDialogueBlock(sceneIndex, container) {
    // Div que envuelve el diálogo
    const dialogueGroup = document.createElement("div");
    dialogueGroup.classList.add("dialogue-group");
  
    // Contenedor para personaje y emoción (horizontal)
    const dialogueInfo = document.createElement("div");
    dialogueInfo.classList.add("dialogue-info");
  
    // --- Bloque para Personaje ---
    const charContainer = document.createElement("div");
    charContainer.classList.add("char-container");
  
    const charLabel = document.createElement("label");
    charLabel.innerText = "Personaje:";
    charContainer.appendChild(charLabel);
  
    const charSelect = document.createElement("select");
    charSelect.name = `character_${sceneIndex}[]`;
    charSelect.innerHTML = `<option value="">--Selecciona un personaje--</option>`;
    CHARACTERS_CATALOG.forEach((char) => {
      const option = document.createElement("option");
      option.value = char;
      option.text = char;
      charSelect.appendChild(option);
    });
    charContainer.appendChild(charSelect);
    dialogueInfo.appendChild(charContainer);
  
    // --- Bloque para Emoción ---
    const emoContainer = document.createElement("div");
    emoContainer.classList.add("emo-container");
  
    const emoLabel = document.createElement("label");
    emoLabel.innerText = "Emoción:";
    emoContainer.appendChild(emoLabel);
  
    const emoSelect = document.createElement("select");
    emoSelect.name = `emotion_${sceneIndex}[]`;
    emoSelect.innerHTML = `<option value="">--Selecciona una emoción--</option>`;
    EMOTIONS_CATALOG.forEach((emo) => {
      const option = document.createElement("option");
      option.value = emo;
      option.text = emo;
      emoSelect.appendChild(option);
    });
    emoContainer.appendChild(emoSelect);
    dialogueInfo.appendChild(emoContainer);
  
    // Agregar el contenedor horizontal al bloque de diálogo
    dialogueGroup.appendChild(dialogueInfo);
  
    // Etiqueta y área para escribir el diálogo
    const dialogueLabel = document.createElement("label");
    dialogueLabel.innerText = "Diálogo:";
    dialogueGroup.appendChild(dialogueLabel);
  
    const dialogueInput = document.createElement("textarea");
    dialogueInput.name = `dialogueText_${sceneIndex}[]`;
    dialogueInput.rows = 3;
    dialogueInput.placeholder = "Escribe aquí lo que dice el personaje...";
    dialogueGroup.appendChild(dialogueInput);
  
    // Agregar el bloque de diálogo al contenedor de diálogos de la escena
    container.appendChild(dialogueGroup);
  }
  
  
  // ============ EVENTO: AGREGAR NUEVA ESCENA ============
  addSceneBtn.addEventListener("click", () => {
    const newScene = createSceneBlock(sceneCount);
    scenesContainer.appendChild(newScene);
    sceneCount++;
  });
  
  // ============ EVENTO: "ENVIAR" TODOS LOS DIÁLOGOS ============
  sendAllBtn.addEventListener("click", () => {
    let finalMessage = "";
    const allScenes = document.querySelectorAll(".scene-block");
  
    if (allScenes.length === 0) {
      alert("No has agregado ninguna escena.");
      return;
    }
  
    allScenes.forEach((scene, index) => {
      finalMessage += `=== Escena #${index + 1} ===\n`;
  
      // Lugar: se usa el input si hay un valor o el select si no se llenó el input.
      const placeSelect = scene.querySelector(`select[name="scenePlace_${index}"]`);
      const placeInput = scene.querySelector(`input[name="scenePlaceCustom_${index}"]`);
      const placeValue = placeInput.value.trim() !== ""
        ? placeInput.value
        : (placeSelect.value.trim() || "Sin lugar definido");
      finalMessage += `Lugar: ${placeValue}\n\n`;
  
      // Diálogos de la escena
      const dialogueGroups = scene.querySelectorAll(".dialogue-group");
      dialogueGroups.forEach((dg) => {
        // Personaje (solo se usa el select)
        const charSelect = dg.querySelector(`select[name="character_${index}[]"]`);
        const characterValue = charSelect.value.trim() || "Personaje desconocido";
  
        // Emoción
        const emoSelect = dg.querySelector(`select[name="emotion_${index}[]"]`);
        const emotionValue = emoSelect.value.trim() || "Sin emoción";
  
        // Diálogo
        const dialogueInput = dg.querySelector(`textarea[name="dialogueText_${index}[]"]`);
        const dialogueValue = dialogueInput.value.trim() || "Diálogo vacío";
  
        finalMessage += `Personaje: ${characterValue} | Emoción: ${emotionValue}\n`;
        finalMessage += `Diálogo: ${dialogueValue}\n\n`;
      });
      finalMessage += "-----------------------------\n\n";
    });
  
    // Mostrar el mensaje final en la sección de logs (vista previa)
    document.getElementById("logContent").innerText = finalMessage;
  
    // Construir la URL para abrir la ventana de composición de Gmail.
    const subject = "Nuevas Escenas y Diálogos";
    const gmailURL = "https://mail.google.com/mail/?view=cm&fs=1" +
                     "&to=MCC21@gmail.com" +
                     "&su=" + encodeURIComponent(subject) +
                     "&body=" + encodeURIComponent(finalMessage);
  
    // Abrir la ventana (o pestaña) con Gmail para que el usuario envíe el correo.
    window.open(gmailURL, "_blank");
  });
  
  // ============ OPCIONAL: AGREGAR AUTOMÁTICAMENTE UNA PRIMERA ESCENA ============
  document.addEventListener("DOMContentLoaded", () => {
    addSceneBtn.click();
  });
  