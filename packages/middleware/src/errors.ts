export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 422, "VALIDATION_ERROR");
  }
}

export class AuthError extends AppError {
  constructor(message: string) {
    super(message, 401, "AUTH_ERROR");
  }
}

export class IpfsPinError extends AppError {
  constructor(message: string) {
    super(message, 502, "IPFS_PIN_ERROR");
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404, "NOT_FOUND");
  }
}

export class RateLimitError extends AppError {
  constructor(message: string) {
    super(message, 429, "RATE_LIMIT");
  }
}
