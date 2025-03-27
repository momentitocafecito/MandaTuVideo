// netlify/functions/registro.js
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method Not Allowed' })
      };
    }

    const body = JSON.parse(event.body);

    const { nombrePatreon, correoUsuario } = body;
    if (!nombrePatreon || !correoUsuario) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Faltan datos requeridos' })
      };
    }

    // Rutas a tus CSV
    const nombresPermitidosPath = path.join(__dirname, '..', '..', 'data', 'nombrespermitidos.csv');
    const dataCSVPath = path.join(__dirname, '..', '..', 'data', 'data.csv');

    // 1) Verificar que nombrePatreon esté en nombrespermitidos.csv
    if (!fs.existsSync(nombresPermitidosPath)) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'No se encontró nombrespermitidos.csv en data/' })
      };
    }
    const allowedRaw = fs.readFileSync(nombresPermitidosPath, 'utf8');
    // nombrespermitidos.csv no tiene cabecera, una línea por nombre
    // Dividimos en líneas, quitamos vacíos
    const allowedNames = allowedRaw.split('\n').map(l => l.trim()).filter(Boolean);
    const nombreLower = nombrePatreon.trim().toLowerCase();

    const foundName = allowedNames.find(n => n.trim().toLowerCase() === nombreLower);
    if (!foundName) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'El Nombre Patreon no está permitido.' })
      };
    }

    // 2) Verificar que correoUsuario no exista en data.csv en la columna correo_mescenas
    if (!fs.existsSync(dataCSVPath)) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'No se encontró data.csv en data/' })
      };
    }
    const dataRaw = fs.readFileSync(dataCSVPath, 'utf8');
    // Parsear con csv-parse/sync
    let records = parse(dataRaw, {
      columns: true,
      skip_empty_lines: true
    });
    // columns = ["mescenas","correo_mescenas","tipo_suscript","fecha_suscript","cuota_mensual","videos_procesados","videos_enviados"]

    const correoLower = correoUsuario.trim().toLowerCase();
    const alreadyExists = records.find(r => r.correo_mescenas.trim().toLowerCase() === correoLower);
    if (alreadyExists) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'El correo ya existe en data.csv' })
      };
    }

    // 3) Crear la nueva fila:
    // mescenas, correo_mescenas, tipo_suscript, fecha_suscript, cuota_mensual, videos_procesados, videos_enviados
    const fechaISO = new Date().toISOString().slice(0,10); // YYYY-MM-DD
    const newRow = {
      mescenas: nombrePatreon.trim(),
      correo_mescenas: correoUsuario.trim(),
      tipo_suscript: 'becario',
      fecha_suscript: fechaISO,
      cuota_mensual: '2',
      videos_procesados: '0',
      videos_enviados: '0'
    };

    // 4) Agregar a records y guardar
    records.push(newRow);
    const output = stringify(records, {
      header: true,
      columns: Object.keys(records[0]) // usar las mismas columnas en orden
    });
    fs.writeFileSync(dataCSVPath, output, 'utf8');

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Registro exitoso en data.csv',
        newRow
      })
    };

  } catch (err) {
    console.error('Error en registro.js:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.toString() })
    };
  }
};
