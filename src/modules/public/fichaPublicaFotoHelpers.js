// Foto de perfil obligatoria en el link de autocompletado (2026-10): lógica
// pura, sin JSX, extraída de CompletarFichaScreen.jsx para poder testearla
// con node:test (mismo criterio que personalHierarchy.js/navCapabilities.js
// -- un componente React gigante con decenas de estados no se puede montar
// fácil en un test, estas funciones sí).

// ¿Puede avanzar del paso "foto" a documentos/cursos/turno? Único criterio:
// que la ficha ya tenga una foto cargada -- no importa si la acaba de subir
// recién o si ya la tenía desde antes (ej. volviendo con un link nuevo),
// el chequeo es siempre el mismo valor en vivo.
export function puedeAvanzarDeFoto(persona) {
  return Boolean(persona?.foto_url);
}

// Lista de "faltantes" para el resumen final, sumando "Foto de perfil" por
// delante de lo que ya reportaba documentosChecklist -- "Terminar por
// ahora" puede salir del flujo antes de llegar a documentos, y sin esto el
// resumen no mencionaba la foto para nada (quedaba una salida silenciosa).
export function faltantesConFoto(persona, faltantesChecklist = []) {
  const labels = faltantesChecklist.map((item) => item.label);
  if (!puedeAvanzarDeFoto(persona)) {
    return ['Foto de perfil', ...labels];
  }
  return labels;
}
