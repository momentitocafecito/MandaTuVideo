// scripts/filterAllowed.js
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Este script se corre con "node filterAllowed.js changed_files.txt"
// Mantiene la misma lógica, pero ahora lee/escribe la tabla "patreons" en Supabase.

(async () => {
  try {
    // 1) Tomar el argumento con la ruta de changed_files.txt
    const changedFilesPath = process.argv[2];
    if (!changedFilesPath) {
      console.error("No changed_files.txt path provided.");
      process.exit(1);
    }

    // 2) Leer la lista de changed files (igual que antes)
    const changedFiles = fs
      .readFileSync(changedFilesPath, 'utf8')
      .split('\n')
      .map(f => f.trim())
      .filter(Boolean);

    // 2.1) Crear / limpiar approved_files.txt (igual que antes)
    fs.writeFileSync('approved_files.txt', '', 'utf8');

    // 2.2) Llevaremos la cuenta de cuántos archivos sí fueron aprobados
    let approvedCount = 0;

    // --- Conectar a Supabase usando SECRETS definidas en GitHub ---
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Faltan credenciales de Supabase (SUPABASE_URL o SUPABASE_ANON_KEY).");
      process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 3) Obtener todos los registros desde la tabla "patreons"
    console.log("Obteniendo registros de 'patreons'...");
    const { data: records, error: errSelect } = await supabase
      .from('patreons')
      .select(`
        mescenas,
        correo_mescenas,
        tipo_suscript,
        fecha_suscript,
        cuota_mensual,
        videos_procesados,
        videos_enviados
      `);

    if (errSelect) {
      console.error("Error al obtener registros de 'patreons':", errSelect);
      process.exit(1);
    }
    if (!records) {
      console.error("No se obtuvieron registros de la tabla 'patreons'.");
      process.exit(1);
    }

    // 3.1) Para rastrear qué filas se modifican, agregamos un flag _updated:
    for (const r of records) {
      r._updated = false;
    }

    // 4) Recorrer los changedFiles y filtrar (igual que antes)
    for (const file of changedFiles) {
      if (!fs.existsSync(file)) {
        console.log(`File ${file} not found, skipping`);
        continue;
      }
      const jsonContent = JSON.parse(fs.readFileSync(file, 'utf8'));

      const url = jsonContent.url || ""; 
      if (!url) {
        console.log(`No URL found in ${file}, skipping`);
        continue;
      }

      // 5) Buscar en records dónde correo_mescenas == url (ign. mayúsc/minúsc)
      const matchingIndex = records.findIndex(r => 
        r.correo_mescenas.trim().toLowerCase() === url.trim().toLowerCase()
      );
      if (matchingIndex === -1) {
        console.log(`No mecenas found for ${url}, skipping ${file}`);
        continue;
      }

      // 6) Revisar si (cuota_mensual - videos_procesados) > 0
      //    (Manteniendo la lógica original)
      const row = records[matchingIndex];
      const cuota = parseInt(row.cuota_mensual, 10) || 0;
      const videosProcesados = parseInt(row.videos_procesados, 10) || 0;

      if ((cuota - videosProcesados) > 0) {
        // OK: actualizamos videos_procesados + 1
        row.videos_procesados = (videosProcesados + 1).toString();
        row._updated = true; // Marcamos que se cambió

        // Añadir el file a 'approved_files.txt'
        fs.appendFileSync('approved_files.txt', `${file}\n`, 'utf8');
        approvedCount++;

        console.log(`Approved ${file} (url: ${url}), incrementing videos_procesados for ${row.mescenas}`);
      } else {
        console.log(`Skipping ${file}; no quota left for ${url}`);
      }
    }

    // 7) En vez de reescribir un CSV, actualizamos en Supabase
    //    Solo los registros que se marcaron con _updated = true
    let updatesCount = 0;
    for (const r of records) {
      if (r._updated) {
        // Hacemos un update row by row en Supabase:
        const newValue = parseInt(r.videos_procesados, 10);
        const correo = r.correo_mescenas.trim().toLowerCase();

        const { error: errUpdate } = await supabase
          .from('patreons')
          .update({ videos_procesados: newValue })
          .eq('correo_mescenas', correo);

        if (errUpdate) {
          console.error(`Error actualizando videos_procesados para ${r.mescenas}:`, errUpdate);
          // No detenemos el proceso, continuamos con los demás
        } else {
          updatesCount++;
        }
      }
    }

    console.log(`Filtering done. Updated rows in Supabase: ${updatesCount}. Approved files in approved_files.txt.`);

    // 8) Exponer approvedCount a GitHub Actions
    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `approved_count=${approvedCount}\n`);
      console.log(`approved_count=${approvedCount} => written to GITHUB_OUTPUT`);
    } else {
      console.log(`approved_count=${approvedCount} => (no GITHUB_OUTPUT available, local run?)`);
    }

    // 9) Si no hay archivos aprobados
    if (approvedCount === 0) {
      console.log("No files approved, process can skip sending them.");
    }

    process.exit(0);

  } catch (error) {
    console.error("Error in filterAllowed.js (Supabase version):", error);
    process.exit(1);
  }
})();
