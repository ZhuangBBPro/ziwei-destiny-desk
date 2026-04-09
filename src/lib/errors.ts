export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly payload?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}
