# Tipografías institucionales locales

Se conservan Manrope (títulos, pesos 500–800) y Source Sans 3 (texto, pesos 400–700), con las mismas variables CSS y `display: swap`. `layout.tsx` usa `next/font/local`; no descarga fuentes durante build ni consulta Google Fonts desde el navegador.

Los TTF variables se incorporan **sin modificar, convertir, renombrar internamente ni recortar** desde el repositorio oficial [google/fonts](https://github.com/google/fonts), revisión `45e3d5269e4a17d823f6d84470bc084dc5ae46f6`. El texto íntegro de las licencias OFL 1.1 se conserva en cada carpeta, normalizando únicamente finales de línea a LF y espacios al final de línea. Los hashes de origen y de la copia formateada quedan registrados. Las URL exactas, SHA256 y tamaños están en [provenance.json](provenance.json).

- [Manrope: licencia original](https://github.com/google/fonts/blob/45e3d5269e4a17d823f6d84470bc084dc5ae46f6/ofl/manrope/OFL.txt).
- [Source Sans 3: licencia original](https://github.com/google/fonts/blob/45e3d5269e4a17d823f6d84470bc084dc5ae46f6/ofl/sourcesans3/OFL.txt).

`next/font/local` empaqueta ambos archivos en `/_next/static/media/`. No utiliza Firebase Storage ni requiere Rules o infraestructura. Los dos TTF suman 811.040 bytes (~792 KiB); se conserva el archivo oficial completo para evitar derivados y pasos adicionales de generación. Cualquier optimización posterior de tamaño debe preservar licencia, procedencia y diseño.

Verificación de licencia, hashes y referencias: `npx tsx scripts/testLocalFonts.ts`.
