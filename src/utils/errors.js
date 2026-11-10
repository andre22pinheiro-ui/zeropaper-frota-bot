// src/utils/errors.js — Classes de Erro de Domínio do ZeroPaperFrota

export class DomainError extends Error {
  constructor(message, code = 'DOMAIN_ERROR', status = 400) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.status = status;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class AuthorizationError extends DomainError {
  constructor(message = 'Utilizador não autorizado a executar esta operação.') {
    super(message, 'UNAUTHORIZED', 403);
  }
}

export class ValidationError extends DomainError {
  constructor(message = 'Dados inválidos fornecidos.') {
    super(message, 'VALIDATION_FAILED', 422);
  }
}

export class NotFoundError extends DomainError {
  constructor(message = 'Recurso não encontrado na base de dados.') {
    super(message, 'NOT_FOUND', 404);
  }
}

export class ConflictError extends DomainError {
  constructor(message = 'Operação em conflito ou registo duplicado.') {
    super(message, 'CONFLICT', 409);
  }
}

export class DatabaseError extends DomainError {
  constructor(message = 'Falha de comunicação ou operação na base de dados.') {
    super(message, 'DATABASE_ERROR', 500);
  }
}

