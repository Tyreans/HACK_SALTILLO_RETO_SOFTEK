// Punto de enlace con la memoria del agente (Backboard).
// Hoy son funciones vacías: el agente ya aprende del historial en la base de datos
// (rechazos recientes y correcciones del gerente). Quien integre Backboard solo
// tiene que llenar estas dos funciones; nada más del código cambia.

/**
 * Texto con lo que el agente recuerda del negocio (preferencias del gerente, patrones).
 * Se agrega al prompt de Gemini al redactar las sugerencias.
 * @param {{ tienda: string, tipo: "reposicion"|"promocion"|"precio" }} _
 * @returns {Promise<string>} "" si no hay nada que recordar
 */
export async function contexto(_) {
  return "";
}

/**
 * Se llama después de cada decisión del gerente. Aquí se guarda como memoria.
 * @param {{
 *   evento: "aceptada"|"rechazada"|"editada"|"agregada",
 *   tienda: string, tipo: string, sku: string, producto: string,
 *   origen: "agente"|"gerente",
 *   propuesta_original: { cantidad, descuento_pct, precio_propuesto },
 *   final: { cantidad, descuento_pct, precio_propuesto },
 *   motivo_rechazo: string|null
 * }} _
 */
export async function registrarDecision(_) {
  // TODO(Backboard): POST /assistants/{id}/memories con un texto del tipo
  // "El gerente rechazó reponer Aguacate (motivo: ...)".
}
