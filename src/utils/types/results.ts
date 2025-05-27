/**
 * Every time you add new type, ensure you reflect it in the {@link ../http/errorHandler.ts#errorHandler errorHandler} function.
 */
export enum ErrorType {
  NotFound = 'NotFound',
  BadRequest = 'BadRequest',
  InternalServerError = 'InternalServerError',
  BusinessLogicError = 'BusinessLogicError',
  DatabaseError = 'DatabaseError',
  ValidationError = 'ValidationError',
  Conflict = 'Conflict'
}

export class AppError extends Error {
  constructor(
    public readonly type: ErrorType,
    public readonly message: string,
    public readonly code: number
  ) {
    super(message)
  }
}

export type Result<E, T> = Success<T> | Failure<E>

export class Success<T> {
  readonly isSuccess = true
  readonly isFailure = false

  constructor(public readonly value: T) {}
}

export class Failure<E> {
  readonly isSuccess = false
  readonly isFailure = true

  constructor(public readonly error: E) {}
}

// Utility Functions
export const success = <T>(value: T): Result<never, T> => new Success(value)
export const failure = <E>(error: E): Result<E, never> => new Failure(error)
