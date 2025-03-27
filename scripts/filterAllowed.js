// scripts/filterAllowed.js
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

// CSV path
const CSV_PATH = path.join(__dirname, '..', 'data', 'data.csv');

(async () => {
  try {
    // 1) Tomar el argumento con la ruta de changed_files.txt
    const changedFilesPath = process.argv[2];
    if (!changedFilesPath) {
      console.error("No changed_files.txt path provided.");
      process.exit(1);
    }

    // 2) Leer la lista de changed files
    const changedFiles = fs.readFileSync(changedFilesPath, 'utf8').split('\n').map(f => f.trim()).filter(Boolean);

    // 3) Cargar el CSV en memoria
    const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
    let records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true
    });
    // records será un array de objetos con keys: 
    // ["mescenas","correo_mescenas","tipo_suscript","fecha_suscript","cuota_mensual","videos_procesados","videos_enviados"]

    // Crear / limpiar approved_files.txt
    fs.writeFileSync('approved_files.txt', '', 'utf8');

    // 4) Recorrer los changedFiles y filtrar
    for (const file of changedFiles) {
      // Leer el JSON
      if (!fs.existsSync(file)) {
        console.log(`File ${file} not found, skipping`);
        continue;
      }
      const jsonContent = JSON.parse(fs.readFileSync(file, 'utf8'));

      // asumiendo la propiedad "url" está en la raíz del JSON
      const url = jsonContent.url || ""; 
      if (!url) {
        console.log(`No URL found in ${file}, skipping`);
        continue;
      }

      // 5) Buscar en records dónde correo_mescenas == url
      const matchingIndex = records.findIndex(r => r.correo_mescenas.trim().toLowerCase() === url.trim().toLowerCase());
      if (matchingIndex === -1) {
        console.log(`No mecenas found for ${url}, skipping ${file}`);
        continue;
      }

      // 6) Revisar si (cuota_mensual - videos_enviados) > 0
      const row = records[matchingIndex];
      const cuota = parseInt(row.cuota_mensual, 10) || 0;
      const videosEnviados = parseInt(row.videos_enviados, 10) || 0;
      const videosProcesados = parseInt(row.videos_procesados, 10) || 0;
      
      if ((cuota - videosEnviados) > 0) {
        // 7) OK: actualizamos videos_procesados + 1
        records[matchingIndex].videos_procesados = (videosProcesados + 1).toString();

        // Añadir el file a 'approved_files.txt'
        fs.appendFileSync('approved_files.txt', `${file}\n`, 'utf8');

        console.log(`Approved ${file} (url: ${url}), incrementing videos_procesados for ${row.mescenas}`);
      } else {
        console.log(`Skipping ${file}; no quota left for ${url}`);
      }
    }

    // 8) Guardar el CSV con videos_procesados actualizado
    const output = stringify(records, {
      header: true,
      columns: Object.keys(records[0])
    });
    fs.writeFileSync(CSV_PATH, output, 'utf8');

    console.log("Filtering done. Updated CSV. Approved files in approved_files.txt");
    process.exit(0);

  } catch (error) {
    console.error("Error in filterAllowed.js:", error);
    process.exit(1);
  }
})();
