// Error con código HTTP. Lánzalo desde servicios o controladores:
//   throw new ApiError(404, "Tienda no encontrada");
export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
