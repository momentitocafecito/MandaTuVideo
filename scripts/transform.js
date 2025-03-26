const fs = require('fs');
const path = require('path');

// Directorios de entrada y salida
const DIR_UNPROCESSED = path.join(__dirname, '..', 'dialog_data');
const DIR_PROCESSED   = path.join(__dirname, '..', 'dialog_data_processed');

// Aseguramos que exista la carpeta de salida
if (!fs.existsSync(DIR_PROCESSED)) {
  fs.mkdirSync(DIR_PROCESSED);
}

/**
 * Arrays de valores aleatorios:
 * - DURACIONES
 * - ACCIONES
 * - PARENTESIS_EFFECTS (si "PP", concatena el nombre del personaje)
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
 * Divide un texto en renglones de forma equitativa, sin pasar de `maxLen` caracteres.
 */
function splitTextEquitably(text, maxLen = 56) {
  if (text.length <= maxLen) {
    return [text];
  }
  const totalLength = text.length;
  const linesNeeded = Math.ceil(totalLength / maxLen);
  let targetLen = Math.ceil(totalLength / linesNeeded);

  if (targetLen > maxLen) {
    targetLen = maxLen;
  }

  const words = text.split(/\s+/);
  const resultLines = [];
  let currentLine = '';
  let currentLen = 0;

  words.forEach(word => {
    if (!currentLine) {
      currentLine = word;
      currentLen = word.length;
    } else {
      const newLen = currentLen + 1 + word.length;
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
 * PARTE 1: Parsear el contenido en múltiples escenas.
 *   - Identifica "=== Escena" para abrir una nueva escena
 *   - "Lugar:" para el escenario
 *   - "Personaje:" y "Diálogo:" para crear un objeto con { name, emotion, text }
 *   - "Onomatopeya:" para agregar onomatopeya al diálogo actual (si la hay).
 * ----------------------------------------------------------------------------
 */
function parseScenes(contenidoOriginal) {
  const lines = contenidoOriginal
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  const scenes = [];
  let currentScene = null;

  // Función para iniciar una escena nueva
  function startNewScene() {
    if (currentScene) {
      scenes.push(currentScene);
    }
    currentScene = {
      place: '',
      dialogs: []
    };
  }

  // Variable temporal: el último diálogo que estemos construyendo
  // antes de añadirlo al array "dialogs" de la escena
  let tempPerson = null;

  lines.forEach(line => {
    const lower = line.toLowerCase();

    // Nueva escena
    if (lower.startsWith('=== escena')) {
      startNewScene();
      return;
    }

    // Lugar
    if (lower.startsWith('lugar:')) {
      if (currentScene) {
        currentScene.place = line.replace(/lugar:\s*/i, '').trim();
      }
      return;
    }

    // Personaje
    if (lower.startsWith('personaje:')) {
      // Si quedaba un personaje pendiente, lo agregamos
      if (tempPerson) {
        currentScene.dialogs.push(tempPerson);
      }
      let raw = line.slice('personaje:'.length).trim();
      let name = 'Desconocido';
      let emotion = 'Indefinida';

      // "Ana | Emoción: Feliz"
      if (raw.includes('| Emoción:')) {
        const [n, e] = raw.split('| Emoción:');
        name    = n.trim();
        emotion = e.trim();
      } else {
        name = raw;
      }

      tempPerson = { name, emotion, text: '', onomatopeya: '' };
      return;
    }

    // Diálogo
    if (lower.startsWith('diálogo:')) {
      if (!tempPerson) {
        tempPerson = { name: 'Desconocido', emotion: 'Indefinida', text: '', onomatopeya: '' };
      }
      const rawDialog = line.slice('diálogo:'.length).trim();
      tempPerson.text = rawDialog;
      // De momento, no lo pusheamos aquí, pues
      // podríamos encontrar la onomatopeya justo después
      return;
    }

    // Onomatopeya
    if (lower.startsWith('onomatopeya:')) {
      // Asignamos la onomatopeya al personaje actual
      if (!tempPerson) {
        // si no hay tempPerson, creamos uno genérico
        tempPerson = { name: 'Desconocido', emotion: 'Indefinida', text: '', onomatopeya: '' };
      }
      const rawOnoma = line.slice('onomatopeya:'.length).trim();
      tempPerson.onomatopeya = rawOnoma;
      // Ahora sí, este "bloque" (personaje+diálogo+onomatopeya) lo agregamos a dialogs
      currentScene.dialogs.push(tempPerson);
      tempPerson = null;
      return;
    }

    // Ignorar separadores
    if (line.startsWith('---') || line.startsWith('---------')) {
      return;
    }
  });

  // Si quedó un personaje pendiente (sin onomatopeya)
  if (tempPerson && currentScene) {
    currentScene.dialogs.push(tempPerson);
    tempPerson = null;
  }

  // Guardamos la última escena
  if (currentScene) {
    scenes.push(currentScene);
  }

  // Retornar solo escenas no vacías
  return scenes.filter(s => s.dialogs.length > 0 || s.place);
}

/**
 * ----------------------------------------------------------------------------
 * PARTE 2: Construir el script final a partir de las escenas parseadas.
 *    - "[Nombre] (duración | emoción | acción)"
 *    - Cada renglón del diálogo => su propio paréntesis
 *    - Al final del diálogo, si onomatopeya != "" => "OSD (onomatopeya) (PP personaje)"
 *    - Al final de cada escena: "**Lugar**"
 *    - Entre escenas: "---Cambio de escena---"
 * ----------------------------------------------------------------------------
 */
function buildScript(scenes) {
  let output = '–Script–\n\n';

  scenes.forEach((scene, idxScene) => {
    // Recorremos los diálogos
    scene.dialogs.forEach(dialog => {
      // Cabecera
      const duracion = pickRandom(DURACIONES);
      const accion   = pickRandom(ACCIONES);

      output += `[${dialog.name}] (${duracion} | ${dialog.emotion} | ${accion})\n`;

      // Dividimos el texto en renglones (máx 56 chars)
      const lines = splitTextEquitably(dialog.text, 56);

      lines.forEach(line => {
        const effect = pickRandom(PARENTESIS_EFFECTS);
        let finalParenthesis;
        if (effect === 'PP') {
          finalParenthesis = `(PP ${dialog.name})`;
        } else {
          finalParenthesis = `(${effect})`;
        }
        output += `${line} ${finalParenthesis}\n`;
      });

      // Si hay onomatopeya y no está vacía => agregamos la línea
      if (dialog.onomatopeya && dialog.onomatopeya.trim().length > 0) {
        output += `OSD (${dialog.onomatopeya}) (PP ${dialog.name})\n`;
      }

      output += '\n';
    });

    // Al final de la escena
    if (scene.place) {
      output += `**${scene.place}**\n`;
    }

    // Si no es la última escena => cambio de escena
    if (idxScene < scenes.length - 1) {
      output += `\n---Cambio de escena---\n\n`;
    }
  });

  return output.trim();
}

/**
 * ----------------------------------------------------------------------------
 * 3) Función principal para crear el script final desde "contenido".
 * ----------------------------------------------------------------------------
 */
function transformContent(contenidoOriginal) {
  const scenes = parseScenes(contenidoOriginal);
  return buildScript(scenes);
}

/**
 * ----------------------------------------------------------------------------
 * transformData:
 *  - Solo se procesa si otros.transformado === "false".
 *  - Retorna { original, transformed }:
 *    - original: el mismo objeto con "transformado" => "true".
 *    - transformed: el JSON final con title, content, etc.
 * ----------------------------------------------------------------------------
 */
function transformData(original) {
  if (!original.otros) {
    return null;
  }
  if (original.otros.transformado !== 'false') {
    return null;
  }

  // Marcamos el original como transformado
  original.otros.transformado = 'true';

  const usuario   = original.usuario   || 'usuario_desconocido';
  const momento   = original.momento   || new Date().toISOString();
  const contenido = original.contenido || '';

  // Fecha en YYYYmmddHHMMSS
  const fechaObj = new Date(momento);
  const yyyy = fechaObj.getUTCFullYear();
  const mm   = String(fechaObj.getUTCMonth() + 1).padStart(2, '0');
  const dd   = String(fechaObj.getUTCDate()).padStart(2, '0');
  const HH   = String(fechaObj.getUTCHours()).padStart(2, '0');
  const MM   = String(fechaObj.getUTCMinutes()).padStart(2, '0');
  const SS   = String(fechaObj.getUTCSeconds()).padStart(2, '0');
  const fechaStr = `${yyyy}${mm}${dd}${HH}${MM}${SS}`;

  // Construimos el guion final
  const newContent = transformContent(contenido);

  // JSON transformado
  const transformed = {
    title:  `${usuario}_${fechaStr}_RENDERIZAR`,
    content: newContent,
    url:    usuario,
    status: 'procesar',
    sendDate: fechaStr,
    otros: { ...original.otros }
  };

  return {
    original,
    transformed
  };
}

/**
 * ----------------------------------------------------------------------------
 * 4) Procesar los archivos en dialog_data:
 *    - Solo se transforman si "otros.transformado === 'false'"
 *    - Se reescribe el archivo original
 *    - Se crea el transformado en dialog_data_processed
 * ----------------------------------------------------------------------------
 */
const files = fs.readdirSync(DIR_UNPROCESSED);

files.forEach(fileName => {
  if (!fileName.endsWith('.json')) return;

  const filePath = path.join(DIR_UNPROCESSED, fileName);
  const raw = fs.readFileSync(filePath, 'utf8');

  try {
    const originalJson = JSON.parse(raw);
    const result = transformData(originalJson);

    if (result === null) {
      console.log(`Omitiendo ${fileName}: no cumple "otros.transformado=false".`);
      return;
    }

    // 1) Sobrescribir el archivo original con transformado=true
    fs.writeFileSync(filePath, JSON.stringify(result.original, null, 2));
    console.log(`Actualizado original: ${filePath}`);

    // 2) Guardar el transformado en dialog_data_processed
    // const outputPath = path.join(DIR_PROCESSED, fileName);
    const parsed = path.parse(fileName);
    const newFileName = `${parsed.name}_RENDERIZAR${parsed.ext}`;
    const outputPath = path.join(DIR_PROCESSED, newFileName);

    fs.writeFileSync(outputPath, JSON.stringify(result.transformed, null, 2));
    console.log(`Generado transformado: ${outputPath}`);

  } catch (err) {
    console.error(`Error procesando ${fileName}:`, err);
  }
});
