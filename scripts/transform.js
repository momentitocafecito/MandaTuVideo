const fs = require('fs');
const path = require('path');

// Directorios de entrada y salida
const DIR_UNPROCESSED = path.join(__dirname, '..', 'dialog_data');
const DIR_PROCESSED   = path.join(__dirname, '..', 'dialog_data_processed');

// Asegurarnos de que la carpeta de salida existe
if (!fs.existsSync(DIR_PROCESSED)) {
  fs.mkdirSync(DIR_PROCESSED);
}

/**
 * Arrays de ejemplo para generar valores aleatorios:
 * - duraciones
 * - acciones
 * - efectos en paréntesis (si es "PP", luego se concatena el nombre)
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
  'PP',         // luego se convertirá en (PP NombrePersonaje)
  'PA-D*1.2',
  'PA-I*1.2',
  'ZI*1.5',
  'ES',
  'ZO*1.5',
  'PA-D*1.3',
  'PA-I*1.3'
];

/** 
 * Función auxiliar: elige un elemento aleatorio de un array 
 */
function pickRandom(array) {
  const idx = Math.floor(Math.random() * array.length);
  return array[idx];
}

/**
 * ----------------------------------------------------------------------------
 * 1) FUNCIÓN QUE "ANALIZA" Y TRANSFORMA EL CAMPO 'contenido'
 *    Separa escena, lugar, personajes y diálogos, y construye un pseudo-script.
 * ----------------------------------------------------------------------------
 */
function transformContent(contenidoOriginal) {
  // 1. Partimos el texto en líneas y filtramos vacías
  const lineas = contenidoOriginal
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  // 2. Identificamos la línea de "Escena" y la de "Lugar"
  let escenaLine = '';
  let lugarLine = '';

  // 3. Acumulamos en un array { personaje, dialogo } según "Personaje:" / "Diálogo:"
  const personajesBloques = [];

  lineas.forEach(linea => {
    // "=== Escena #1 ==="
    if (linea.toLowerCase().startsWith('=== escena')) {
      escenaLine = linea.replace(/=/g, '').trim(); // "Escena #1"
    }
    // "Lugar: Sala de estar"
    else if (linea.toLowerCase().startsWith('lugar:')) {
      lugarLine = linea;
    }
    // "Personaje: Carlos | Emoción: Enojado"
    else if (linea.toLowerCase().startsWith('personaje:')) {
      personajesBloques.push({
        personaje: linea,
        dialogo: ''
      });
    }
    // "Diálogo: Hola"
    else if (
      linea.toLowerCase().startsWith('diálogo:') &&
      personajesBloques.length > 0
    ) {
      personajesBloques[personajesBloques.length - 1].dialogo = linea;
    }
  });

  // 4. Construimos el pseudo-script final
  const scriptLines = [];
  scriptLines.push('–Script–\n');

  if (escenaLine) {
    scriptLines.push(`[ ${escenaLine} ]`);
  }
  if (lugarLine) {
    scriptLines.push(`(${lugarLine})\n`);
  }

  // 5. Para cada bloque de personaje, sacamos nombre, emoción, diálogo
  personajesBloques.forEach(bloque => {
    let nombre = 'PersonajeDesconocido';
    let emocion = 'Indefinida';
    let dialogoTexto = '…';

    try {
      // "Personaje: Carlos | Emoción: Enojado"
      const [, resto] = bloque.personaje.split(': ', 2);
      if (resto.includes('| Emoción:')) {
        const [parteNombre, parteEmocion] = resto.split('| Emoción:');
        nombre  = parteNombre.trim();
        emocion = parteEmocion.trim();
      } else {
        nombre = resto.trim();
      }
    } catch {
      // se mantiene default
    }

    try {
      // "Diálogo: Hola"
      const [, d] = bloque.dialogo.split(': ', 2);
      dialogoTexto = d.trim();
    } catch {
      // se mantiene default
    }

    // Elegimos al azar la duración y la acción
    const duracionAleatoria = pickRandom(DURACIONES);
    const accionAleatoria   = pickRandom(ACCIONES);

    // Elegimos un efecto en paréntesis (si es "PP", concatenamos el personaje)
    const effect = pickRandom(PARENTESIS_EFFECTS);
    let finalParenthesis = '';
    if (effect === 'PP') {
      finalParenthesis = `(PP ${nombre})`;
    } else {
      finalParenthesis = `(${effect})`;
    }

    // Ejemplo de cabecera: [Carlos] (4 segundos | Enojado | Se inclina hacia la cámara)
    scriptLines.push(
      `[${nombre}] (${duracionAleatoria} | ${emocion} | ${accionAleatoria})`
    );

    // Ejemplo de diálogo: 1. Hola (PP Carlos) 
    scriptLines.push(`1. ${dialogoTexto} ${finalParenthesis}\n`);
  });

  // 6. Cerramos con un **FIN**
  scriptLines.push('**FIN**');

  // 7. Retornamos como string
  return scriptLines.join('\n');
}

/**
 * ----------------------------------------------------------------------------
 * 2) FUNCIÓN QUE RECIBE EL OBJETO JSON ORIGINAL
 *    - Aplica la lógica SÓLO si "otros.transformado" === "false"
 *    - Ajusta title, url, status, sendDate
 *    - Llama a transformContent(contenidoOriginal)
 * ----------------------------------------------------------------------------
 */
function transformData(original) {
  // 1) Verificamos que exista "otros" y que transformado == "false"
  if (!original.otros) {
    return null;
  }
  if (original.otros.transformado !== 'false') {
    return null;
  }

  // 2) Extraemos datos
  const usuario   = original.usuario   || 'usuario_desconocido';
  const momento   = original.momento   || new Date().toISOString();
  const contenido = original.contenido || '';

  // 3) Fecha en formato YYYYmmddHHMMSS
  const fechaObj = new Date(momento);
  const yyyy = fechaObj.getUTCFullYear();
  const mm   = String(fechaObj.getUTCMonth() + 1).padStart(2, '0');
  const dd   = String(fechaObj.getUTCDate()).padStart(2, '0');
  const HH   = String(fechaObj.getUTCHours()).padStart(2, '0');
  const MM   = String(fechaObj.getUTCMinutes()).padStart(2, '0');
  const SS   = String(fechaObj.getUTCSeconds()).padStart(2, '0');
  const fechaStr = `${yyyy}${mm}${dd}${HH}${MM}${SS}`;

  // 4) Transformamos el contenido
  const newContent = transformContent(contenido);

  // 5) Marcamos transformado = "true" en el objeto original
  original.otros.transformado = 'true';

  // 6) Construimos el objeto final
  const transformed = {
    title:  `${usuario}_${fechaStr}_RENDERIZAR`,
    content: newContent,
    url:    usuario,
    status: 'procesar',
    sendDate: fechaStr,
    // Conservamos "otros" (incluido el nuevo transformado = "true")
    otros: { ...original.otros }
  };

  return transformed;
}

/**
 * ----------------------------------------------------------------------------
 * 3) LEER ARCHIVOS .json DESDE dialog_data:
 *    - Solo se transforman si transformado=false
 *    - Se genera un nuevo .json en dialog_data_processed
 *    - Se elimina el original
 * ----------------------------------------------------------------------------
 */
const files = fs.readdirSync(DIR_UNPROCESSED);

files.forEach(fileName => {
  // Filtra solo .json
  if (!fileName.endsWith('.json')) return;

  const filePath = path.join(DIR_UNPROCESSED, fileName);
  const raw = fs.readFileSync(filePath, 'utf8');

  try {
    const originalJson = JSON.parse(raw);

    // Intentamos transformar
    const transformedJson = transformData(originalJson);

    // Si devolvió null, lo omitimos
    if (transformedJson === null) {
      console.log(`Omitiendo ${fileName}: no cumple "otros.transformado=false"`);
      return;
    }

    // Guardamos en "dialog_data_processed"
    const outputPath = path.join(DIR_PROCESSED, fileName);
    fs.writeFileSync(outputPath, JSON.stringify(transformedJson, null, 2));
    console.log(`Generado: ${outputPath}`);

    // Borramos el archivo original para evitar reprocesarlo
    fs.unlinkSync(filePath);
  } catch (err) {
    console.error(`Error procesando ${fileName}:`, err);
  }
});
