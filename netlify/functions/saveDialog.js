// netlify/functions/saveDialog.js
const fetch = (...args) =>
    import('node-fetch').then(({ default: fetch }) => fetch(...args));
  
  // Exportamos nuestra función para Netlify
  exports.handler = async (event) => {
    try {
      // Aceptamos solo POST
      if (event.httpMethod !== 'POST') {
        return {
          statusCode: 405,
          body: JSON.stringify({ error: 'Method Not Allowed' })
        };
      }
  
      // Parseamos el cuerpo JSON que nos manda el front-end
      const body = JSON.parse(event.body);
  
      // Extraemos los datos (puedes ajustar según lo que envíes desde el front)
      const usuario = body.usuario || "usuario_desconocido";
      const momento = body.momento || new Date().toISOString();
      const contenido = body.contenido || "Sin contenido";
      const otros = body.otros || {};
  
      // Creamos el objeto que guardaremos en el .json
      const dataObj = {
        usuario,
        momento,
        contenido,
        otros
        // agrega más campos si lo deseas
      };
  
      // Convertimos a base64 para la API de GitHub
      const contentEncoded = Buffer.from(
        JSON.stringify(dataObj, null, 2)
      ).toString('base64');
  
      // Usamos el token de GitHub guardado en variables de entorno de Netlify
      const githubToken = process.env.GITHUB_TOKEN;
      if (!githubToken) {
        return {
          statusCode: 500,
          body: JSON.stringify({
            error: 'Falta el token de GitHub en las variables de entorno'
          })
        };
      }
  
      // Definimos los parámetros de tu repo y la carpeta "dialog_data/"
      const owner = 'momentitocafecito'; // Ajusta a tu usuario/organización
      const repo = 'MandaTuVideo';            // Nombre de tu repositorio
      const folder = 'dialog_data';      // Carpeta donde guardarás los archivos
      // Construimos un nombre único de archivo, p.ej. "usuario_2025-03-25T15-00-00.json"
      const normalizedTimestamp = momento.replace(/[:.]/g, '-'); 
      const filename = `${usuario}_${normalizedTimestamp}.json`;
  
      // Ruta completa en GitHub
      const path = `${folder}/${filename}`;
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  
      // Hacemos la petición PUT a la API de GitHub
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `token ${githubToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          message: `Guardando archivo ${filename}`, // Mensaje de commit
          content: contentEncoded // El contenido base64
        })
      });
  
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
  
      // Todo bien
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
  