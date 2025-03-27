// netlify/functions/calculate_quota.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  try {
    // Se espera que el email se pase como query string
    const email = event.queryStringParameters.email;
    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Falta el parámetro email" }),
      };
    }
    const normalizedEmail = email.trim().toLowerCase();

    // Crear cliente de Supabase usando variables de entorno (configuradas en Netlify)
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Consulta en la tabla "patreons"
    let { data, error } = await supabase
      .from('patreons')
      .select('fecha_suscript, cuota_mensual, videos_procesados')
      .eq('correo_mescenas', normalizedEmail)
      .single();

    if (error || !data) {
      // Si no se encuentra el registro, se devuelven valores por defecto
      data = {
        fecha_suscript: 0,
        cuota_mensual: 0,
        videos_procesados: 0,
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error("Error en calculate_quota:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error interno del servidor" }),
    };
  }
};
