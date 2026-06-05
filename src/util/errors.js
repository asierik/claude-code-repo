// Domain error carrying an HTTP status. Services throw these; the error
// middleware translates them into JSON responses. Express catches synchronous
// throws from handlers/middleware automatically.
export class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'AppError';
    this.status = status;
  }
}

export const badRequest = (msg) => new AppError(400, msg);
export const unauthorized = (msg) => new AppError(401, msg);
export const forbidden = (msg) => new AppError(403, msg);
export const notFound = (msg) => new AppError(404, msg);
export const conflict = (msg) => new AppError(409, msg);
