// netlify/functions/registro.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  try {
    // Solo POST
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method Not Allowed' })
      };
    }

    // 1) Parsear body
    const body = JSON.parse(event.body);
    const { nombrePatreon, correoUsuario } = body;
    if (!nombrePatreon || !correoUsuario) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Faltan datos requeridos' })
      };
    }

    // 2) Conectar a Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Faltan credenciales de Supabase en Netlify' })
      };
    }
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 3) Verificar que nombrePatreon esté en la lista 'nombrespermitidos' (tabla o array)
    //   En Supabase, puedes hacer una tabla 'nombrespermitidos' (o un array local).
    //   Para simplificar, supongamos es una tabla 'nombrespermitidos' con columna 'nombre'.
    const { data: allowedNames, error: errAllowed } = await supabase
      .from('nombrespermitidos') // o la tabla que definiste
      .select('nombre')
      .eq('nombre', nombrePatreon);
    if (errAllowed) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Error buscando en nombrespermitidos', details: errAllowed })
      };
    }
    if (!allowedNames || allowedNames.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'El Nombre Patreon no está permitido.' })
      };
    }

    // 4) Verificar que correoUsuario no exista en patreons
    const { data: existing, error: errExisting } = await supabase
      .from('patreons')
      .select('correo_mescenas')
      .eq('correo_mescenas', correoUsuario.toLowerCase());
    if (errExisting) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Error buscando en patreons', details: errExisting })
      };
    }
    if (existing && existing.length > 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'El correo ya existe en la tabla patreons' })
      };
    }

    // 5) Insertar la nueva fila
    const fechaISO = new Date().toISOString().slice(0,10); // YYYY-MM-DD
    const { data: insertData, error: errInsert } = await supabase
      .from('patreons')
      .insert([{
        mescenas: nombrePatreon.trim(),
        correo_mescenas: correoUsuario.trim().toLowerCase(),
        tipo_suscript: 'becario',
        fecha_suscript: fechaISO,
        cuota_mensual: 2,
        videos_procesados: 0,
        videos_enviados: 0
      }]);

    if (errInsert) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Error insertando en patreons', details: errInsert })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Registro exitoso en patreons (Supabase)',
        row: insertData
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
