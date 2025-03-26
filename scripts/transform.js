const fs = require('fs');
const path = require('path');

// Directorios de entrada y salida
const DIR_UNPROCESSED = path.join(__dirname, '..', 'dialog_data');
const DIR_PROCESSED   = path.join(__dirname, '..', 'dialog_data_processed');

// Aseguramos que la carpeta de salida existe
if (!fs.existsSync(DIR_PROCESSED)) {
  fs.mkdirSync(DIR_PROCESSED);
}

/**
 * Arrays para generar valores aleatorios.
 * 'PP' significa que concatenará el nombre del personaje (ej: (PP Ana)).
 */
const DURACIONES = [
  '3 segundos',
  '4 segundos',
  '5 segundos',
  '6 segundos',
  '7 segundos'
];
const ACCIONES = [
  'Se inclina hacia la cámara',
  'Se frota los ojos',
  'Se lleva la mano a la cabeza',
  'Se endereza de golpe',
  'Respira hondo',
  'Se agarra la cabeza',
  'Evita el contacto visual',
  'Cruza los brazos',
  'Hace gestos con las manos',
  'Forza una sonrisa'
];
const PARENTESIS_EFFECTS = [
  'PP',
  'PA-D*1.2',
  'PA-I*1.2',
  'ZI*1.5',
  'ES',
  'ZO*1.5',
  'PA-D*1.3',
  'PA-I*1.3'
];

/** Elige un elemento aleatorio de un array */
function pickRandom(array) {
  const idx = Math.floor(Math.random() * array.length);
  return array[idx];
}

/**
 * Divide un texto en múltiples líneas de forma "equitativa",
 * sin superar 56 caracteres por línea.
 */
function splitTextEquitably(text, maxLen = 56) {
  if (text.length <= maxLen) {
    return [text];
  }
  const totalLength = text.length;
  const linesNeeded = Math.ceil(totalLength / maxLen);

  // Objetivo aproximado de chars por línea
  let targetLen = Math.ceil(totalLength / linesNeeded);
  if (targetLen > maxLen) targetLen = maxLen;

  const words = text.split(/\s+/);
  const resultLines = [];
  let currentLine = '';
  let currentLen = 0;

  words.forEach(word => {
    if (!currentLine) {
      currentLine = word;
      currentLen = word.length;
    } else {
      const newLen = currentLen + 1 + word.length; // +1 por espacio
      if (newLen > targetLen) {
        resultLines.push(currentLine);
        currentLine = word;
        currentLen = word.length;
      } else {
        currentLine += ' ' + word;
        currentLen = newLen;
      }
    }
  });
  if (currentLine) {
    resultLines.push(currentLine);
  }
  return resultLines;
}

/**
 * ----------------------------------------------------------------------------
 * PARTE 1: Parsear el contenido original en "escenas".
 * Cada escena tendrá:
 *  {
 *    place: 'Sala de estar',
 *    dialogs: [
 *      { name: 'Ana', emotion: 'Feliz', text: '...' },
 *      ...
 *    ]
 *  }
 * ----------------------------------------------------------------------------
 */
function parseScenes(contenidoOriginal) {
  const lines = contenidoOriginal
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  const scenes = [];
  let currentScene = null;

  // Función auxiliar para "abrir" una nueva escena
  function startNewScene() {
    // Si ya hay una escena en progreso, se guarda.
    if (currentScene) {
      scenes.push(currentScene);
    }
    currentScene = {
      place: '',
      dialogs: []
    };
  }

  // Variable temporal para el último "personaje" detectado,
  // antes de leer su "Diálogo:".
  let tempPerson = null;

  lines.forEach(line => {
    const lower = line.toLowerCase();

    // Detectamos una nueva escena
    if (lower.startsWith('=== escena')) {
      startNewScene();
      return;
    }
    // Detectamos el lugar
    if (lower.startsWith('lugar:')) {
      if (currentScene) {
        currentScene.place = line.replace(/lugar:\s*/i, '').trim();
      }
      return;
    }
    // Detectamos "Personaje: X | Emoción: Y"
    if (lower.startsWith('personaje:')) {
      // Guardar si había un "tempPerson" pendiente
      // (En este flujo, casi siempre iremos Personaje->Diálogo->Personaje->Diálogo)
      if (tempPerson) {
        // Si no hubo diálogo, lo metemos igual
        currentScene.dialogs.push(tempPerson);
      }

      let raw = line.slice('personaje:'.length).trim(); // quita "Personaje:"
      let name = 'Desconocido';
      let emotion = 'Indefinida';

      // "Ana | Emoción: Feliz"
      if (raw.includes('| Emoción:')) {
        const [n, e] = raw.split('| Emoción:');
        name = n.trim();
        emotion = e.trim();
      } else {
        // no hay "| Emoción:", sólo el nombre
        name = raw;
      }

      tempPerson = {
        name,
        emotion,
        text: '' // se llenará con "Diálogo:"
      };
      return;
    }
    // Detectamos "Diálogo:"
    if (lower.startsWith('diálogo:')) {
      if (!tempPerson) {
        // Personaje no definido, creamos uno genérico
        tempPerson = { name: 'Desconocido', emotion: 'Indefinida', text: '' };
      }
      const rawDialog = line.slice('diálogo:'.length).trim();
      tempPerson.text = rawDialog;
      // Inmediatamente guardamos en la escena
      currentScene.dialogs.push(tempPerson);
      tempPerson = null; // reset
      return;
    }
    // Líneas de separación ("---------------------"), las ignoramos
    if (line.startsWith('---') || line.startsWith('---------')) {
      return;
    }
    // Cualquier otra cosa, la ignoramos
  });

  // Si quedó un "tempPerson" pendiente, se guarda
  if (tempPerson && currentScene) {
    currentScene.dialogs.push(tempPerson);
  }
  // Guardamos la última escena en progreso
  if (currentScene) {
    scenes.push(currentScene);
  }

  // Filtramos posibles escenas vacías
  return scenes.filter(s => s.dialogs.length > 0 || s.place);
}

/**
 * ----------------------------------------------------------------------------
 * PARTE 2: Construir el script final a partir de las escenas parseadas.
 * Se cumple:
 *  - Entre [] solo el nombre del personaje.
 *  - Al final de TODAS las líneas de diálogo (última línea) se añade el paréntesis extra.
 *  - Cada línea de diálogo se numera secuencialmente: 1., 2., 3., etc.
 *  - Al final de cada escena se coloca "**Lugar**".
 *  - Entre escenas se coloca "---Cambio de escena---".
 * ----------------------------------------------------------------------------
 */
function buildScript(scenes) {
  let output = '–Script–\n\n';  // encabezado
  scenes.forEach((scene, sceneIndex) => {
    // Para cada diálogo dentro de la escena
    scene.dialogs.forEach(dialog => {
      // [Name] (duración | emoción | acción)
      const duracion = pickRandom(DURACIONES);
      const accion   = pickRandom(ACCIONES);
      // "PP" => (PP Name), si no => (ZO*1.5) etc.
      const effect  = pickRandom(PARENTESIS_EFFECTS);

      // Preparamos la emoción (si no parseamos, Indefinida)
      let emotion = dialog.emotion || 'Indefinida';

      // Cabecera
      output += `[${dialog.name}] (${duracion} | ${emotion} | ${accion})\n`;

      // Dividimos el texto en líneas de hasta 56 caracteres
      const splitted = splitTextEquitably(dialog.text, 56);

      // Imprimimos cada línea enumerada
      splitted.forEach((line, idx) => {
        const lineNumber = idx + 1; // 1-based
        if (idx < splitted.length - 1) {
          // Líneas intermedias: "1. Blabla"
          output += `${lineNumber}. ${line}\n`;
        } else {
          // Última línea => añadir paréntesis extra
          let finalParenthesis = '';
          if (effect === 'PP') {
            finalParenthesis = `(PP ${dialog.name})`;
          } else {
            finalParenthesis = `(${effect})`;
          }
          output += `${lineNumber}. ${line} ${finalParenthesis}\n\n`;
        }
      });
    });

    // Al final de la escena, ponemos "**Lugar**"
    if (scene.place) {
      output += `**${scene.place}**\n`;
    }

    // Si hay otra escena después, ponemos "---Cambio de escena---"
    if (sceneIndex < scenes.length - 1) {
      output += `\n---Cambio de escena---\n\n`;
    }
  });

  // Retornamos el resultado (sin "FIN", según tu ejemplo)
  return output.trim();
}

/**
 * ----------------------------------------------------------------------------
 * FUNCIÓN PRINCIPAL: transformContent
 * 1) Parseamos el contenido en múltiples escenas.
 * 2) Construimos el script final.
 * ----------------------------------------------------------------------------
 */
function transformContent(contenidoOriginal) {
  const scenes = parseScenes(contenidoOriginal);
  const finalScript = buildScript(scenes);
  return finalScript;
}

/**
 * ----------------------------------------------------------------------------
 * transformData:
 *  - Solo se procesa si "otros.transformado === 'false'".
 *  - Ajusta title, url, status, sendDate.
 *  - Llama a transformContent para generar el script final.
 *  - Marca "transformado" = "true".
 * ----------------------------------------------------------------------------
 */
function transformData(original) {
  if (!original.otros) {
    return null;
  }
  if (original.otros.transformado !== 'false') {
    return null;
  }

  const usuario   = original.usuario   || 'usuario_desconocido';
  const momento   = original.momento   || new Date().toISOString();
  const contenido = original.contenido || '';

  // Armamos la fecha en YYYYmmddHHMMSS
  const fechaObj = new Date(momento);
  const yyyy = fechaObj.getUTCFullYear();
  const mm   = String(fechaObj.getUTCMonth() + 1).padStart(2, '0');
  const dd   = String(fechaObj.getUTCDate()).padStart(2, '0');
  const HH   = String(fechaObj.getUTCHours()).padStart(2, '0');
  const MM   = String(fechaObj.getUTCMinutes()).padStart(2, '0');
  const SS   = String(fechaObj.getUTCSeconds()).padStart(2, '0');
  const fechaStr = `${yyyy}${mm}${dd}${HH}${MM}${SS}`;

  // Transformar el 'contenido' en el guion final
  const newContent = transformContent(contenido);

  // Marcamos como transformado
  original.otros.transformado = 'true';

  // Construimos el objeto final
  const transformed = {
    title:  `${usuario}_${fechaStr}_RENDERIZAR`,
    content: newContent,
    url:    usuario,
    status: 'procesar',
    sendDate: fechaStr,
    otros: { ...original.otros }
  };

  return transformed;
}

/**
 * ----------------------------------------------------------------------------
 * 3) Escanea la carpeta "dialog_data" en busca de archivos .json.
 *    - Sólo transforma los que tengan "otros.transformado === 'false'".
 *    - Guarda el resultado en "dialog_data_processed".
 *    - Elimina el original de "dialog_data".
 * ----------------------------------------------------------------------------
 */
const files = fs.readdirSync(DIR_UNPROCESSED);

files.forEach(fileName => {
  if (!fileName.endsWith('.json')) return;

  const filePath = path.join(DIR_UNPROCESSED, fileName);
  const raw = fs.readFileSync(filePath, 'utf8');

  try {
    const originalJson = JSON.parse(raw);
    const transformedJson = transformData(originalJson);

    // Si devolvió null => se omite
    if (transformedJson === null) {
      console.log(`Omitiendo ${fileName}: no cumple "otros.transformado=false".`);
      return;
    }

    // Guardamos en la carpeta de procesados
    const outputPath = path.join(DIR_PROCESSED, fileName);
    fs.writeFileSync(outputPath, JSON.stringify(transformedJson, null, 2));
    console.log(`Generado: ${outputPath}`);

    // // Borramos el archivo original
    // fs.unlinkSync(filePath);
  } catch (err) {
    console.error(`Error procesando ${fileName}:`, err);
  }
});
