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
 * --------------------------------------------------------------------------------
 * 1) FUNCIÓN QUE "ANALIZA" Y TRANSFORMA EL CAMPO 'contenido'
 *    (simulando la lógica del ejemplo en Python)
 * --------------------------------------------------------------------------------
 */
function transformContent(contenidoOriginal) {
  // 1. Partimos el texto en líneas, limpiamos espacios y filtramos líneas vacías
  const lineas = contenidoOriginal
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  // 2. Identificamos la línea de "Escena" y la de "Lugar"
  let escenaLine = '';
  let lugarLine = '';
  
  // 3. Vamos acumulando objetos con { personaje, emocion, dialogo }
  const personajesBloques = [];

  lineas.forEach(linea => {
    // Ejemplo: "=== Escena #1 ==="
    if (linea.toLowerCase().startsWith('=== escena')) {
      // Quitamos los '='
      escenaLine = linea.replace(/=/g, '').trim(); // "Escena #1"
    }
    // Ejemplo: "Lugar: Sala de estar"
    else if (linea.toLowerCase().startsWith('lugar:')) {
      lugarLine = linea;
    }
    // Ejemplo: "Personaje: Carlos | Emoción: Enojado"
    else if (linea.toLowerCase().startsWith('personaje:')) {
      personajesBloques.push({
        personaje: linea,
        dialogo: '' // lo llenaremos luego
      });
    }
    // Ejemplo: "Diálogo: Hola"
    else if (linea.toLowerCase().startsWith('diálogo:') && personajesBloques.length > 0) {
      personajesBloques[personajesBloques.length - 1].dialogo = linea;
    }
  });

  // 4. Construimos un pseudo-script
  const scriptLines = [];
  scriptLines.push('–Script–\n');

  if (escenaLine) {
    scriptLines.push(`[ ${escenaLine} ]`);
  }
  if (lugarLine) {
    scriptLines.push(`(${lugarLine})\n`);
  }

  // 5. Para cada bloque de personaje, extraemos los datos (nombre, emoción, diálogo)
  personajesBloques.forEach(bloque => {
    let nombre = 'PersonajeDesconocido';
    let emocion = 'Indefinida';
    let dialogoTexto = '…';

    try {
      // "Personaje: Carlos | Emoción: Enojado"
      const [, resto] = bloque.personaje.split(': ', 2); // ["Personaje", "Carlos | Emoción: Enojado"]
      if (resto.includes('| Emoción:')) {
        const [parteNombre, parteEmocion] = resto.split('| Emoción:');
        nombre  = parteNombre.trim();
        emocion = parteEmocion.trim();
      } else {
        nombre = resto.trim();
      }
    } catch {
      // Se mantiene el default
    }

    try {
      // "Diálogo: Hola"
      const [, d] = bloque.dialogo.split(': ', 2);
      dialogoTexto = d.trim();
    } catch {
      // Se mantiene el default
    }

    // Armamos el "bloque" al estilo guion
    scriptLines.push(`[${nombre}] (??? segundos | ${emocion} | ???)`);
    scriptLines.push(`1. ${dialogoTexto}\n`);
  });

  // 6. Cerramos con algún fin
  scriptLines.push('**FIN**');

  // 7. Retornamos como un string
  return scriptLines.join('\n');
}

/**
 * --------------------------------------------------------------------------------
 * 2) FUNCIÓN QUE RECIBE EL OBJETO JSON ORIGINAL
 *    - Ajusta los campos title, url, status, sendDate
 *    - Llama a transformContent(contenidoOriginal)
 * --------------------------------------------------------------------------------
 */
function transformData(original) {
  // Aseguramos que exista "otros"
  if (!original.otros) {
    original.otros = {};
  }

  // Si no existe "transformado", lo ponemos en "false"
  if (typeof original.otros.transformado === 'undefined') {
    original.otros.transformado = 'false';
  }

  // Si ya está "true", no hay nada que hacer
  if (original.otros.transformado === 'true') {
    return null; // señal de que ya no se procesa
  }

  // Extraemos datos
  const usuario   = original.usuario   || 'usuario_desconocido';
  const momento   = original.momento   || new Date().toISOString();
  const contenido = original.contenido || '';

  // Fecha en formato YYYYmmddHHMMSS
  const fechaObj = new Date(momento);
  const yyyy = fechaObj.getUTCFullYear();
  const mm   = String(fechaObj.getUTCMonth() + 1).padStart(2, '0');
  const dd   = String(fechaObj.getUTCDate()).padStart(2, '0');
  const HH   = String(fechaObj.getUTCHours()).padStart(2, '0');
  const MM   = String(fechaObj.getUTCMinutes()).padStart(2, '0');
  const SS   = String(fechaObj.getUTCSeconds()).padStart(2, '0');
  const fechaStr = `${yyyy}${mm}${dd}${HH}${MM}${SS}`;

  // Llamamos a la función que hace el "análisis profundo" del contenido
  const newContent = transformContent(contenido);

  // Construimos el objeto resultante
  const transformed = {
    title:  `${usuario}_${fechaStr}_RENDERIZAR`,
    content: newContent,
    url:    usuario,
    status: 'procesar',
    sendDate: fechaStr,
    // "otros" conserva lo que hubiera y forzamos transformado = true
    otros: {
      ...original.otros,
      transformado: 'true'
    }
  };

  return transformed;
}

/**
 * --------------------------------------------------------------------------------
 * 3) LEER ARCHIVOS .json DESDE dialog_data
 *    - Solo se transforman los que tengan transformado=false
 *    - Se generan en dialog_data_processed
 *    - Se elimina (o renombra) el original
 * --------------------------------------------------------------------------------
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
      console.log(`Omitiendo ${fileName}: ya está "transformado": true.`);
      return;
    }

    // Guardamos el resultado en la carpeta de procesados
    const outputPath = path.join(DIR_PROCESSED, fileName);
    fs.writeFileSync(outputPath, JSON.stringify(transformedJson, null, 2));
    console.log(`Generado: ${outputPath}`);

    // Eliminamos el archivo original para que no se procese de nuevo
    fs.unlinkSync(filePath);
  } catch (err) {
    console.error(`Error procesando ${fileName}:`, err);
  }
});
