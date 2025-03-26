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
 * Arrays para generar valores aleatorios:
 * - DURACIONES
 * - ACCIONES
 * - PARENTESIS_EFFECTS (donde "PP" se concatenará con el nombre del personaje)
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
  'PP',         // se convertirá en (PP <Nombre>)
  'PA-D*1.2',
  'PA-I*1.2',
  'ZI*1.5',
  'ES',
  'ZO*1.5',
  'PA-D*1.3',
  'PA-I*1.3'
];

/** 
 * Función auxiliar para elegir un elemento aleatorio de un array 
 */
function pickRandom(array) {
  const idx = Math.floor(Math.random() * array.length);
  return array[idx];
}

/**
 * ---------------------------------------------------------------------------
 * Función para dividir equitativamente un texto en líneas de hasta `maxLen` caracteres.
 * Si el texto es menor o igual a maxLen, se regresa como única línea.
 * ---------------------------------------------------------------------------
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
 * ---------------------------------------------------------------------------
 * 1) Función que transforma el campo "contenido":
 *    - Separa escena, lugar, personajes y diálogos.
 *    - Para cada diálogo, si excede 56 caracteres, lo divide en líneas de forma equitativa.
 *    - Añade, para cada personaje, una cabecera con duración, emoción y acción aleatoria.
 *    - Al final del diálogo se añade un paréntesis extra; si el efecto elegido es "PP", concatena el nombre.
 * ---------------------------------------------------------------------------
 */
function transformContent(contenidoOriginal) {
  const lineas = contenidoOriginal
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  let escenaLine = '';
  let lugarLine = '';
  const personajesBloques = [];

  lineas.forEach(linea => {
    if (linea.toLowerCase().startsWith('=== escena')) {
      escenaLine = linea.replace(/=/g, '').trim();
    } else if (linea.toLowerCase().startsWith('lugar:')) {
      lugarLine = linea;
    } else if (linea.toLowerCase().startsWith('personaje:')) {
      personajesBloques.push({
        personaje: linea,
        dialogo: ''
      });
    } else if (
      linea.toLowerCase().startsWith('diálogo:') &&
      personajesBloques.length > 0
    ) {
      personajesBloques[personajesBloques.length - 1].dialogo = linea;
    }
  });

  const scriptLines = [];
  scriptLines.push('–Script–\n');

  if (escenaLine) {
    scriptLines.push(`[ ${escenaLine} ]`);
  }
  if (lugarLine) {
    scriptLines.push(`(${lugarLine})\n`);
  }

  personajesBloques.forEach(bloque => {
    let nombre = 'PersonajeDesconocido';
    let emocion = 'Indefinida';
    let dialogoTexto = '…';

    try {
      const [, resto] = bloque.personaje.split(': ', 2);
      if (resto.includes('| Emoción:')) {
        const [parteNombre, parteEmocion] = resto.split('| Emoción:');
        nombre = parteNombre.trim();
        emocion = parteEmocion.trim();
      } else {
        nombre = resto.trim();
      }
    } catch {
      // se mantienen los valores por defecto
    }

    try {
      const [, d] = bloque.dialogo.split(': ', 2);
      dialogoTexto = d.trim();
    } catch {
      // se mantiene el default
    }

    const duracion = pickRandom(DURACIONES);
    const accion   = pickRandom(ACCIONES);
    const effect   = pickRandom(PARENTESIS_EFFECTS);
    let finalEffect = '';
    if (effect === 'PP') {
      finalEffect = `(PP ${nombre})`;
    } else {
      finalEffect = `(${effect})`;
    }

    scriptLines.push(`[${nombre}] (${duracion} | ${emocion} | ${accion})`);

    const dialogLines = splitTextEquitably(dialogoTexto, 56);
    if (dialogLines.length === 1) {
      scriptLines.push(`1. ${dialogLines[0]} ${finalEffect}\n`);
    } else {
      scriptLines.push(`1. ${dialogLines[0]}`);
      for (let i = 1; i < dialogLines.length - 1; i++) {
        scriptLines.push(`   ${dialogLines[i]}`);
      }
      scriptLines.push(`   ${dialogLines[dialogLines.length - 1]} ${finalEffect}\n`);
    }
  });

  scriptLines.push('**FIN**');
  return scriptLines.join('\n');
}

/**
 * ---------------------------------------------------------------------------
 * 2) Función que transforma el objeto JSON original:
 *    - Sólo se procesa si existe "otros" y si "otros.transformado" es "false".
 *    - Ajusta title, url, status, sendDate.
 *    - Llama a transformContent para transformar "contenido".
 *    - Finalmente, marca "otros.transformado" a "true" en el objeto original.
 * ---------------------------------------------------------------------------
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

  const fechaObj = new Date(momento);
  const yyyy = fechaObj.getUTCFullYear();
  const mm   = String(fechaObj.getUTCMonth() + 1).padStart(2, '0');
  const dd   = String(fechaObj.getUTCDate()).padStart(2, '0');
  const HH   = String(fechaObj.getUTCHours()).padStart(2, '0');
  const MM   = String(fechaObj.getUTCMinutes()).padStart(2, '0');
  const SS   = String(fechaObj.getUTCSeconds()).padStart(2, '0');
  const fechaStr = `${yyyy}${mm}${dd}${HH}${MM}${SS}`;

  const newContent = transformContent(contenido);

  // Aquí se cambia el estado a "true" en el objeto original para evitar reprocesarlo.
  original.otros.transformado = 'true';

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
 * ---------------------------------------------------------------------------
 * 3) Leer archivos .json desde dialog_data:
 *    - Solo procesa aquellos archivos cuyo "otros.transformado" es "false".
 *    - Genera un nuevo .json en dialog_data_processed.
 *    - Elimina el archivo original.
 * ---------------------------------------------------------------------------
 */
const files = fs.readdirSync(DIR_UNPROCESSED);

files.forEach(fileName => {
  if (!fileName.endsWith('.json')) return;

  const filePath = path.join(DIR_UNPROCESSED, fileName);
  const raw = fs.readFileSync(filePath, 'utf8');

  try {
    const originalJson = JSON.parse(raw);
    const transformedJson = transformData(originalJson);

    if (transformedJson === null) {
      console.log(`Omitiendo ${fileName}: no cumple "otros.transformado=false".`);
      return;
    }

    const outputPath = path.join(DIR_PROCESSED, fileName);
    fs.writeFileSync(outputPath, JSON.stringify(transformedJson, null, 2));
    console.log(`Generado: ${outputPath}`);

    fs.unlinkSync(filePath);
  } catch (err) {
    console.error(`Error procesando ${fileName}:`, err);
  }
});
