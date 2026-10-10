// Formato uniforme de respuestas: { success, data, meta? } o { success: false, error }
export const ok = (res, data, meta) => res.json(meta ? { success: true, data, meta } : { success: true, data });

// Envuelve controladores async para que los errores lleguen al middleware de errores
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
