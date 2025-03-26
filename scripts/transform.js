const fs = require('fs');
const path = require('path');

// Directorios de entrada y salida
const DIR_UNPROCESSED = path.join(__dirname, '..', 'dialog_data');
const DIR_PROCESSED   = path.join(__dirname, '..', 'dialog_data_processed');

// Asegurarnos de que la carpeta de salida existe
if (!fs.existsSync(DIR_PROCESSED)) {
  fs.mkdirSync(DIR_PROCESSED);
}

// ---------------------------------------------------------------------------------
// Función que construye la transformación que quieres aplicar a cada JSON
// Aquí agregamos y/o modificamos los campos solicitados.
//
// - Si el archivo ya tiene otros.transformado = "true", lo saltamos.
// - Si no lo tiene, se lo agregamos como "false" antes de procesar.
// ---------------------------------------------------------------------------------
function transformData(original) {
  // 1) Asegurar que exista "otros"
  if (!original.otros) {
    original.otros = {};
  }
  // 2) Checar si "transformado" está en false
  //    Si no existe, lo forzamos a false
  if (typeof original.otros.transformado === 'undefined') {
    original.otros.transformado = 'false';
  }

  // 3) Si transformado ya es "true", NO procesamos
  if (original.otros.transformado === 'true') {
    return null; // señal de "omitir"
  }

  // ----------------------------
  // Aquí va tu lógica de parseo
  // ----------------------------
  
  // Ejemplo: Ajustamos "status", "title", "sendDate", etc.
  const usuario  = original.usuario  || 'usuario_desconocido';
  const momento  = original.momento  || new Date().toISOString();
  const contenido= original.contenido|| '';
  
  // Formato YYYYmmddHHMMSS
  const fechaObj = new Date(momento);
  const yyyy = fechaObj.getUTCFullYear();
  const mm   = String(fechaObj.getUTCMonth() + 1).padStart(2, '0');
  const dd   = String(fechaObj.getUTCDate()).padStart(2, '0');
  const HH   = String(fechaObj.getUTCHours()).padStart(2, '0');
  const MM   = String(fechaObj.getUTCMinutes()).padStart(2, '0');
  const SS   = String(fechaObj.getUTCSeconds()).padStart(2, '0');
  const fechaStr = `${yyyy}${mm}${dd}${HH}${MM}${SS}`;

  // Campos según tu requerimiento
  const newTitle   = `${usuario}_${fechaStr}_RENDERIZAR`;
  const newStatus  = 'procesar';
  const newSendDate= fechaStr;
  const newUrl     = usuario; 

  // 4) Escribe las nuevas propiedades en el objeto
  const transformed = {
    title: newTitle,
    content: contenido,  // Aquí podrías hacer parseos adicionales
    url: newUrl,
    status: newStatus,
    sendDate: newSendDate,
    // Conservamos otros campos y metemos el "transformado=true"
    otros: {
      ...original.otros,
      transformado: 'true'  // Ya está transformado
    }
  };

  // Devuelve el objeto transformado
  return transformed;
}

// ---------------------------------------------------------------------------------
// Procesar cada JSON en dialog_data
// ---------------------------------------------------------------------------------
const files = fs.readdirSync(DIR_UNPROCESSED);

// Recorremos todos los archivos .json
files.forEach(fileName => {
  if (!fileName.endsWith('.json')) return; // ignoramos otros tipos

  const filePath = path.join(DIR_UNPROCESSED, fileName);
  const raw = fs.readFileSync(filePath, 'utf8');

  try {
    const originalJson = JSON.parse(raw);
    const transformedJson = transformData(originalJson);

    // Si transformData() devuelve null, significa que estaba "transformado=true"
    if (transformedJson === null) {
      console.log(`Omitiendo ${fileName}: ya está transformado`);
      return;
    }

    // Guardamos el nuevo JSON en la carpeta "dialog_data_processed"
    const outputPath = path.join(DIR_PROCESSED, fileName);
    fs.writeFileSync(outputPath, JSON.stringify(transformedJson, null, 2));
    console.log(`Generado: ${outputPath}`);

    // (Opcional) Eliminar o mover el original para que no se reprocese
    fs.unlinkSync(filePath); 
    // o, en lugar de borrarlo, podrías renombrarlo a .bak
    // fs.renameSync(filePath, filePath + '.bak');

  } catch (err) {
    console.error(`Error procesando ${fileName}:`, err);
  }
});
