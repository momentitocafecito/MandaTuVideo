// netlify/functions/registro.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  console.log("=== Registro Function START ===");

  try {
    console.log("HTTP method:", event.httpMethod);
    if (event.httpMethod !== 'POST') {
      console.log("Method not allowed. Exiting.");
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method Not Allowed' })
      };
    }

    console.log("Parsing event.body...");
    const body = JSON.parse(event.body);
    const { nombrePatreon, correoUsuario } = body;
    console.log("nombrePatreon:", nombrePatreon, "| correoUsuario:", correoUsuario);

    // Validar inputs
    if (!nombrePatreon || !nombrePatreon.trim()) {
      console.log("Nombre Patreon vacío o no definido");
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'El Nombre Patreon está vacío' })
      };
    }
    if (!correoUsuario || !correoUsuario.trim()) {
      console.log("Correo vacío o no definido");
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No hay un correo válido' })
      };
    }

    // Conexión a Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    console.log("Verificando credenciales Supabase...");
    if (!supabaseUrl || !supabaseAnonKey) {
      console.log("Faltan credenciales.");
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Faltan credenciales de Supabase en Netlify' })
      };
    }
    console.log("Creando cliente de supabase...");
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // (DEBUG) Ver todos los registros de nombrespermitidos
    // para confirmar qué hay en la BD
    const { data: debugAll, error: errDebugAll } = await supabase
      .from('nombrespermitidos')
      .select('*');
    console.log("DEBUG - todos los nombrespermitidos:", debugAll, " error:", errDebugAll);

    // 1) Verificar que nombrePatreon esté en la tabla nombrespermitidos
    console.log("Buscando en nombrespermitidos con eq =>", nombrePatreon.trim());
    const { data: allowedRows, error: errAllowed } = await supabase
      .from('nombrespermitidos')
      .select('id, mescenas, status')
      .ilike('mescenas', nombrePatreon.trim());  // exact match

    if (errAllowed) {
      console.log("Error consultando nombrespermitidos:", errAllowed);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Error consultando la tabla nombrespermitidos',
          details: errAllowed
        })
      };
    }
    console.log("allowedRows:", allowedRows);
    if (!allowedRows || allowedRows.length === 0) {
      console.log("El Nombre Patreon no está permitido.");
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'El Nombre Patreon no está permitido' })
      };
    }

    // 2) Verificar que el correo no exista en la tabla patreons
    const correoLower = correoUsuario.trim().toLowerCase();
    console.log("Buscando en patreons si existe correo:", correoLower);
    const { data: existing, error: errExisting } = await supabase
      .from('patreons')
      .select('correo_mescenas')
      .eq('correo_mescenas', correoLower);

    if (errExisting) {
      console.log("Error consultando patreons:", errExisting);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Error consultando la tabla patreons', details: errExisting })
      };
    }
    console.log("existing:", existing);
    if (existing && existing.length > 0) {
      console.log("El correo ya existe en patreons.");
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'El correo ya existe en patreons' })
      };
    }

    // 3) Insertar en patreons
    const fechaISO = new Date().toISOString().slice(0,10); // YYYY-MM-DD
    const cutoffDate = '9999-12-31';

    console.log("Insertando registro en patreons...");
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
      console.log("Error insertando en patreons:", errInsert);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Error insertando en patreons',
          details: errInsert
        })
      };
    }

    console.log("Registro exitoso en patreons. Inserted:", inserted);
    console.log("=== Registro Function END ===");
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
