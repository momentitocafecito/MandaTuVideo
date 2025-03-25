// netlify/functions/saveDialog.js
const fetch = (...args) =>
    import('node-fetch').then(({ default: fetch }) => fetch(...args));
  
  exports.handler = async (event) => {
    try {
      // Verificar método HTTP
      if (event.httpMethod !== 'POST') {
        return {
          statusCode: 405,
          body: JSON.stringify({ error: 'Method Not Allowed' })
        };
      }
  
      // 1. Parsear el cuerpo enviado desde el front
      const body = JSON.parse(event.body);
  
      // 2. Construir el contenido que guardaremos
      const dataObj = {
        usuario: body.usuario,
        momento: body.momento,     // Ej: new Date().toISOString()
        contenido: body.contenido, // El texto/diálogo
        otros: body.otros || {}    // Cualquier info extra
        // etc.
      };
  
      // 3. Convertir a base64 para la API de GitHub
      const contentEncoded = Buffer.from(
        JSON.stringify(dataObj, null, 2)
      ).toString('base64');
  
      // 4. Preparar la petición a la API de GitHub
      const githubToken = process.env.GITHUB_TOKEN; // <--- leído desde variable de entorno
      const owner = 'TU_USUARIO_GITHUB';            // Cambia a tu usuario/organización
      const repo = 'TU_REPO';                       // Repo donde guardar data.json
      const path = 'data.json';                     // Ruta del archivo en el repo
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  
      // Ver si el archivo ya existe (para obtener 'sha' y poder actualizarlo)
      let sha = null;
      const getRes = await fetch(url, {
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: 'application/vnd.github.v3+json'
        }
      });
  
      if (getRes.status === 200) {
        const fileData = await getRes.json();
        sha = fileData.sha;  // Lo usaremos en el PUT si ya existe el archivo
      }
  
      // 5. Hacer PUT para crear/actualizar el archivo
      const putRes = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `token ${githubToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          message: 'Actualizando data.json con nuevo contenido',
          content: contentEncoded,
          sha: sha || undefined
        })
      });
  
      if (!putRes.ok) {
        const errorData = await putRes.json();
        return {
          statusCode: putRes.status,
          body: JSON.stringify({
            error: 'Error al hacer PUT a GitHub',
            details: errorData
          })
        };
      }
  
      // Si todo sale bien
      const result = await putRes.json();
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Archivo data.json guardado con éxito en GitHub',
          result
        })
      };
  
    } catch (error) {
      console.error(error);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Error interno',
          details: error.toString()
        })
      };
    }
  };
  