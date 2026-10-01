// Formato de nombre/apellido para mostrar en RRHH (tarjeta de personal y
// ficha): nombre_uso o primer nombre, mas PRIMER apellido respetando
// particulas ("del", "de la", etc.), en formato titulo con tildes.
//
// Modulo puro, sin dependencias de React -- se puede testear con
// scripts/check-person-display.mjs corriendo node directo sobre este
// archivo, sin pasar por Vite/JSX.

// Particulas de apellido: si el apellido empieza con una de estas, se
// consideran parte del "primer apellido" junto con la palabra siguiente
// (ej. "DEL PINO RODRIGUEZ" -> unidad "DEL PINO", se descarta "RODRIGUEZ").
const PARTICLES_MULTI_WORD = ['de la', 'de los', 'de las'];
// Particulas que SI pueden empezar un apellido por si solas (una sola
// palabra) -- "la"/"los"/"las" sueltas no cuentan, solo como parte de
// "de la"/"de los"/"de las" (chequeado aparte, arriba en la lista).
const PARTICLE_WORDS_STANDALONE = new Set(['de', 'del', 'da', 'van', 'von']);
// Todas las particulas, para saber si una palabra va en minuscula cuando
// NO es la primera de su unidad (ej. la "la" de "De la Fuente").
const PARTICLE_WORDS = new Set(['de', 'del', 'la', 'los', 'las', 'da', 'van', 'von']);

function splitWords(value) {
  return String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

// Titulo respetando tildes: primera letra de cada palabra en mayuscula,
// resto en minuscula -- salvo que la palabra sea una particula Y no sea la
// primera de la unidad que se esta formateando (ahi va en minuscula, ej. la
// "la" de "De la Fuente"). .toLowerCase()/.toUpperCase() de JS ya manejan
// bien los caracteres acentuados (á, é, í, ó, ú, ñ) sin normalizar nada.
function titleCaseUnit(words) {
  return words
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index > 0 && PARTICLE_WORDS.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

// Primer apellido, contemplando particulas. Toma la palabra inicial (o el
// par de palabras "de la"/"de los"/"de las") mas la palabra siguiente, y
// descarta el resto (segundo apellido).
function firstApellidoUnit(apellidoWords) {
  if (!apellidoWords.length) return [];
  const lowerWords = apellidoWords.map((w) => w.toLowerCase());

  for (const particle of PARTICLES_MULTI_WORD) {
    const particleWords = particle.split(' ');
    const candidate = lowerWords.slice(0, particleWords.length).join(' ');
    if (candidate === particle) {
      const unitLength = particleWords.length + (apellidoWords.length > particleWords.length ? 1 : 0);
      return apellidoWords.slice(0, unitLength);
    }
  }

  if (PARTICLE_WORDS_STANDALONE.has(lowerWords[0])) {
    const unitLength = apellidoWords.length > 1 ? 2 : 1;
    return apellidoWords.slice(0, unitLength);
  }

  return apellidoWords.slice(0, 1);
}

// nombre_uso si existe (completo, tal como lo cargaron); si no, la primera
// palabra de nombre (ej. "MARIA PAULA" -> "Maria", salvo que nombre_uso
// diga "Paula").
export function displayNombre(person) {
  const nombreUso = splitWords(person?.nombre_uso);
  if (nombreUso.length) return titleCaseUnit(nombreUso);

  const nombre = splitWords(person?.nombre);
  if (!nombre.length) return '';
  return titleCaseUnit(nombre.slice(0, 1));
}

// Primer apellido, con particulas ("Del Pino", "De la Fuente"), en formato
// titulo.
export function displayApellido(person) {
  const apellidoWords = splitWords(person?.apellido);
  if (!apellidoWords.length) return '';
  return titleCaseUnit(firstApellidoUnit(apellidoWords));
}

// Nombre + apellido para mostrar, ya combinados (tarjeta/ficha).
export function displayFullName(person) {
  return [displayNombre(person), displayApellido(person)].filter(Boolean).join(' ');
}

// Bases de una persona (array {base_id, nombre, es_principal}, migracion
// 081) para mostrar en una sola linea: todas, la principal primero (el
// backend ya las devuelve en ese orden), separadas por " · ". 'Sin base' si
// no tiene ninguna.
export function displayBases(bases) {
  const list = Array.isArray(bases) ? bases : [];
  if (!list.length) return 'Sin base';
  return list.map((b) => b.nombre).filter(Boolean).join(' · ');
}
