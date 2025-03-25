// netlify/functions/saveDialog.js

// Importar node-fetch dinámicamente (si no usas Node 18+)
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

exports.handler = async (event) => {
  try {
    // Aceptar solo solicitudes POST
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method Not Allowed' })
      };
    }

    // Parsear el body enviado desde el front-end
    const body = JSON.parse(event.body);

    // Extraer datos con valores por defecto
    const usuario = body.usuario || "usuario_desconocido";
    const momento = body.momento || new Date().toISOString();
    const contenido = body.contenido || "Sin contenido";
    const otros = body.otros || {};

    // Sanitizar el valor de usuario para usarlo en el nombre del archivo (remover caracteres no válidos)
    const usuarioSafe = usuario.replace(/[^a-zA-Z0-9_-]/g, '_');

    // Crear el objeto que se guardará en el archivo JSON
    const dataObj = {
      usuario,
      momento,
      contenido,
      otros
    };

    // Convertir el objeto a string formateado y luego a base64, requisito de la API de GitHub
    const contentEncoded = Buffer.from(
      JSON.stringify(dataObj, null, 2)
    ).toString('base64');

    // Verificar que exista el token de GitHub en las variables de entorno
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Falta el token de GitHub en las variables de entorno'
        })
      };
    }

    // Parámetros de configuración: repositorio, dueño y carpeta donde se guardarán los archivos
    const owner = 'momentitocafecito'; // Ajusta a tu usuario/organización
    const repo = 'MandaTuVideo';       // Nombre de tu repositorio
    const folder = 'dialog_data';      // Carpeta destino en el repo

    // Normalizar la marca de tiempo para evitar caracteres no válidos
    const normalizedTimestamp = momento.replace(/[:.]/g, '-');
    // Agregar un sufijo aleatorio para prevenir duplicados
    const randomSuffix = Math.floor(Math.random() * 10000);
    const filename = `${usuarioSafe}_${normalizedTimestamp}_${randomSuffix}.json`;

    // Construir la ruta y URL para la API de GitHub
    const path = `${folder}/${filename}`;
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

    // Hacer la petición PUT a la API de GitHub para crear el archivo
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `token ${githubToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message: `Guardando archivo ${filename}`, // Mensaje de commit
        content: contentEncoded
      })
    });

    // Si la respuesta no es OK, capturar el error y retornarlo
    if (!response.ok) {
      const errorData = await response.json();
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: 'Error al hacer PUT a GitHub',
          details: errorData
        })
      };
    }

    // Obtener el resultado exitoso y retornarlo
    const result = await response.json();
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Archivo ${filename} guardado con éxito en /${folder}/`,
        result
      })
    };

  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Error interno en la función serverless',
        details: error.toString()
      })
    };
  }
};
