import * as postgres from '../db/postgres/postgres'
import {
  Result,
  AppError,
  ErrorType,
  success,
  failure
} from '../../src/utils/types/results'

export class UserEntity {
  constructor(
    public id: string,
    public username: string,
    public email: string,
    public passwordHash: string,
    public createdAt: Date
  ) {}

  static mapToUserEntity(result: Record<string, string>): UserEntity {
    return new UserEntity(
      result.id as string,
      result.username as string,
      result.email as string,
      result.password as string,
      new Date(result.created_at)
    )
  }
}

export const UserRepo = {
  async isUserExist(
    username: string,
    email: string
  ): Promise<Result<AppError, boolean>> {
    try {
      const result = await postgres.query(
        'SELECT count(*) FROM users WHERE username = $1 OR email = $2 LIMIT 1',
        [username, email]
      )
      return success(result.rows[0].count == 1)
    } catch (error: unknown) {
      return failure(
        new AppError(ErrorType.DatabaseError, (error as Error).message, 500)
      )
    }
  },
  async isUserExistByEmail(email: string): Promise<Result<AppError, boolean>> {
    try {
      const result = await postgres.query(
        'SELECT count(*) FROM users WHERE email = $1 LIMIT 1',
        [email]
      )
      return success(result.rows[0].count == 1)
    } catch (error: unknown) {
      return failure(
        new AppError(ErrorType.DatabaseError, (error as Error).message, 500)
      )
    }
  },

  async insertNewUser(
    username: string,
    email: string,
    passwordHash: string
  ): Promise<Result<AppError, string>> {
    try {
      const result = await postgres.query(
        'INSERT INTO users(username, email, password) VALUES($1, $2, $3) RETURNING id',
        [username, email, passwordHash]
      )

      if (result.rowCount === 1) {
        return success(result.rows[0].id)
      } else {
        return failure(
          new AppError(
            ErrorType.DatabaseError,
            'error during insertion of the new user',
            500
          )
        )
      }
    } catch (error: unknown) {
      console.error((error as Error).message)
      return failure(
        new AppError(ErrorType.DatabaseError, (error as Error).message, 500)
      )
    }
  },

  async getCredentialsByUsername(
    username: string
  ): Promise<Result<AppError, UserEntity>> {
    try {
      const result = await postgres.query(
        'SELECT id, username, email, password, created_at FROM users WHERE username = $1 LIMIT 1',
        [username]
      )
      if (result.rowCount === 1) {
        return success(UserEntity.mapToUserEntity(result.rows[0]))
      } else {
        return failure(
          new AppError(
            ErrorType.NotFound,
            `account was not found: ${username}`,
            404
          )
        )
      }
    } catch (error: unknown) {
      return failure(
        new AppError(ErrorType.DatabaseError, (error as Error).message, 500)
      )
    }
  },

  async getCredentialsByEmail(
    email: string
  ): Promise<Result<AppError, UserEntity>> {
    try {
      const result = await postgres.query(
        'SELECT id, username, email, password, created_at FROM users WHERE email = $1 LIMIT 1',
        [email]
      )
      if (result.rowCount === 1) {
        return success(UserEntity.mapToUserEntity(result.rows[0]))
      } else {
        return failure(
          new AppError(
            ErrorType.NotFound,
            `Account was not found: ${email}`,
            404
          )
        )
      }
    } catch (error: unknown) {
      return failure(
        new AppError(ErrorType.DatabaseError, (error as Error).message, 500)
      )
    }
  },

  async getUserById(id: string): Promise<Result<AppError, UserEntity>> {
    try {
      const result = await postgres.query(
        'SELECT id, username, email, password, created_at FROM users WHERE id = $1 LIMIT 1',
        [id]
      )
      if (result.rowCount === 1) {
        return success(UserEntity.mapToUserEntity(result.rows[0]))
      } else {
        return failure(
          new AppError(ErrorType.NotFound, `User was not found: ${id}`, 404)
        )
      }
    } catch (error: unknown) {
      return failure(
        new AppError(ErrorType.DatabaseError, (error as Error).message, 500)
      )
    }
  },

  async updateUserPassword(
    user_id: string,
    password: string
  ): Promise<Result<AppError, string>> {
    try {
      const result = await postgres.query(
        'UPDATE users SET password = $1 WHERE id = $2 RETURNING id',
        [password, user_id]
      )

      if (result.rowCount === 0) {
        return failure(
          new AppError(
            ErrorType.NotFound,
            `User was not found: ${user_id}`,
            404
          )
        )
      }

      return success(result.rows[0].id)
    } catch (error: unknown) {
      return failure(
        new AppError(ErrorType.DatabaseError, (error as Error).message, 500)
      )
    }
  }
}

export default UserRepo
