import * as postgres from '../db/postgres/postgres'
import {
  Result,
  AppError,
  ErrorType,
  success,
  failure
} from '../utils/types/results'

export class CodeEntity {
  id: string
  userId: string
  code: string
  usedAt: Date | null
  createdAt: Date

  constructor(
    id: string,
    userId: string,
    code: string,
    usedAt: Date | null,
    createdAt: Date
  ) {
    this.id = id
    this.userId = userId
    this.code = code
    this.usedAt = usedAt
    this.createdAt = createdAt
  }

  static mapToCodeEntity(result: Record<string, string>): CodeEntity {
    return new CodeEntity(
      result.id as string,
      result.user_id as string,
      result.code as string,
      result.used_at ? new Date(result.used_at) : null,
      new Date(result.created_at)
    )
  }
}

export const ForgotPasswordRepo = {
  async insertCode(
    userId: string,
    code: string
  ): Promise<Result<AppError, string>> {
    try {
      const result = await postgres.query(
        'INSERT INTO forgot_password(user_id, code) VALUES($1, $2) RETURNING code',
        [userId, code]
      )
      if (result.rowCount === 0) {
        return failure(
          new AppError(ErrorType.DatabaseError, 'Failed to insert code', 500)
        )
      }
      return success(result.rows[0].code)
    } catch (error: unknown) {
      return failure(
        new AppError(ErrorType.DatabaseError, (error as Error).message, 500)
      )
    }
  },
  async getCode(code: string): Promise<Result<AppError, CodeEntity>> {
    try {
      const result = await postgres.query(
        'SELECT * FROM forgot_password WHERE code = $1 ORDER BY created_at DESC',
        [code]
      )
      if (result.rowCount === 0) {
        return failure(new AppError(ErrorType.NotFound, 'Code not found', 404))
      }
      const codeEntity = CodeEntity.mapToCodeEntity(result.rows[0])
      return success(codeEntity)
    } catch (error: unknown) {
      return failure(
        new AppError(ErrorType.DatabaseError, (error as Error).message, 500)
      )
    }
  },

  async updateUsedAtProperty(
    code: string,
    used_at: string
  ): Promise<Result<AppError, string>> {
    try {
      const result = await postgres.query(
        'UPDATE forgot_password SET used_at = $1 WHERE code = $2 RETURNING code',
        [used_at, code]
      )

      if (result.rowCount === 0) {
        return failure(new AppError(ErrorType.NotFound, 'Code not found', 404))
      }
      return success(result.rows[0].code)
    } catch (error: unknown) {
      return failure(
        new AppError(ErrorType.DatabaseError, (error as Error).message, 500)
      )
    }
  }
}
