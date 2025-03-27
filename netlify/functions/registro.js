// netlify/functions/registro.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  try {
    // SOLO aceptar método POST
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method Not Allowed' })
      };
    }

    // Parsear el body
    const body = JSON.parse(event.body);
    const { nombrePatreon, correoUsuario } = body;

    // 1) Validar datos básicos
    if (!nombrePatreon || !nombrePatreon.trim()) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'El Nombre Patreon está vacío' })
      };
    }
    if (!correoUsuario || !correoUsuario.trim()) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No hay un correo válido' })
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

    // 3) Buscar el nombrePatreon en "nombrespermitidos" (columna mescenas)
    const { data: allowedRows, error: errAllowed } = await supabase
      .from('nombrespermitidos')
      .select('id, mescenas, status')
      .eq('mescenas', nombrePatreon.trim());

    if (errAllowed) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Error consultando la tabla nombrespermitidos',
          details: errAllowed
        })
      };
    }
    if (!allowedRows || allowedRows.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'El Nombre Patreon no está permitido' })
      };
    }
    // Si quisieras verificar 'status', podrías revisar allowedRows[0].status

    // 4) Verificar que el correo no exista en "patreons" (columna correo_mescenas)
    const correoLower = correoUsuario.trim().toLowerCase();
    const { data: existing, error: errExisting } = await supabase
      .from('patreons')
      .select('correo_mescenas')
      .eq('correo_mescenas', correoLower);

    if (errExisting) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Error consultando la tabla patreons', details: errExisting })
      };
    }
    if (existing && existing.length > 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'El correo ya existe en patreons' })
      };
    }

    // 5) Insertar el nuevo registro en patreons
    //    Campos: mescenas, correo_mescenas, tipo_suscript, fecha_suscript, cuota_mensual, videos_procesados, videos_enviados, cutoff_date...
    const fechaISO = new Date().toISOString().slice(0,10); // YYYY-MM-DD
    // cutoff_date => pon lo que gustes, aquí ejemplo de "9999-12-31"
    const cutoffDate = '9999-12-31';

    const { data: inserted, error: errInsert } = await supabase
      .from('patreons')
      .insert([{
        mescenas: nombrePatreon.trim(),
        correo_mescenas: correoLower,
        tipo_suscript: 'becario',
        fecha_suscript: fechaISO,
        cuota_mensual: 2,
        videos_procesados: 0,
        videos_enviados: 0,
        cutoff_date: cutoffDate
      }]);

    if (errInsert) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Error insertando en patreons',
          details: errInsert
        })
      };
    }

    // 6) Respuesta de éxito
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Registro exitoso en patreons (Supabase)',
        row: inserted
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
