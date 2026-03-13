# Rednacrem - ejecucion local

## Requisitos
- Node.js 18 o superior

## Levantar en localhost
1. Instalar dependencias:
   - PowerShell: `npm.cmd install`
   - CMD/Bash: `npm install`
2. Iniciar servidor local:
   - PowerShell: `npm.cmd run dev`
   - CMD/Bash: `npm run dev`
3. Abrir:
   - `https://rednacrem.tri.uy`

## Notas
- Este proyecto es un `index.html` autocontenido (React por CDN), por eso no requiere build.
- Se usa `http-server` solo para servir el archivo en localhost.
