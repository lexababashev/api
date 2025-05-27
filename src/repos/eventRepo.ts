import {
  Result,
  success,
  failure,
  AppError,
  ErrorType
} from '../../src/utils/types/results'
import * as postgres from '../db/postgres/postgres'

export class EventEntity {
  constructor(
    public id: string,
    public ownerId: string,
    public name: string,
    public createdAt: Date,
    public deadline: Date
  ) {}

  static mapToEventEntity(result: Record<string, string>): EventEntity {
    return new EventEntity(
      result.id as string,
      result.owner_id as string,
      result.name as string,
      new Date(result.created_at),
      new Date(result.deadline)
    )
  }
}

export class EventInviteeDTO {
  constructor(
    public eventId: string,
    public inviteeId: string,
    public eventCreatedAt: Date,
    public eventDeadline: Date
  ) {}

  static mapToEventInviteeDTO(result: Record<string, string>): EventInviteeDTO {
    return new EventInviteeDTO(
      result.id as string,
      result.invitee_id as string,
      new Date(result.event_created_at),
      new Date(result.deadline)
    )
  }
}

export class InviteeDTO {
  constructor(
    public id: string,
    public name: string,
    public createdAt: Date
  ) {}

  static mapToInviteeDTO(result: Record<string, string>): InviteeDTO {
    return new InviteeDTO(
      result.id as string,
      result.name as string,
      new Date(result.created_at)
    )
  }
}

export class EventUploadsDTO {
  constructor(
    public inviteeId: string,
    public uploadId: string,
    public inviteeName: string,
    public inviteSentAt: Date,
    public uploadPath: string,
    public uploadedAt: Date
  ) {}

  static mapToEventUploadsDTO(result: Record<string, string>): EventUploadsDTO {
    return new EventUploadsDTO(
      result.invitee_id as string,
      result.upload_id as string,
      result.invitee_name as string,
      new Date(result.invite_sent_at),
      result.upload_path as string,
      new Date(result.uploaded_at)
    )
  }
}

export class CompiledUploadDTO {
  constructor(
    public uploadId: string,
    public uploadPath: string,
    public uploadedAt: Date
  ) {}

  static mapToCompiledUploadDTO(
    result: Record<string, string>
  ): CompiledUploadDTO {
    return new CompiledUploadDTO(
      result.upload_id as string,
      result.upload_path as string,
      new Date(result.uploaded_at)
    )
  }
}

export const EventRepo = {
  async insertEvent(
    ownerId: string,
    name: string,
    deadline: string
  ): Promise<Result<AppError, string>> {
    try {
      const result = await postgres.query(
        'INSERT INTO events(owner_id, name, deadline) VALUES($1, $2, $3) RETURNING id',
        [ownerId, name, deadline]
      )
      if (result.rowCount === 0) {
        return failure(
          new AppError(
            ErrorType.DatabaseError,
            'error during insertion of the new event',
            500
          )
        )
      }
      return success(result.rows[0].id)
    } catch (error: unknown) {
      return failure(
        new AppError(ErrorType.DatabaseError, (error as Error).message, 500)
      )
    }
  },

  async getEventsByOwnerId(
    ownerId: string
  ): Promise<Result<AppError, EventEntity[]>> {
    try {
      const result = await postgres.query(
        'SELECT * FROM events WHERE owner_id = $1',
        [ownerId]
      )

      if (result.rowCount === 0) {
        return failure(
          new AppError(
            ErrorType.NotFound,
            'no events found for specified owner',
            404
          )
        )
      }

      const events: EventEntity[] = result.rows.map((row) =>
        EventEntity.mapToEventEntity(row)
      )
      return success(events)
    } catch (error: unknown) {
      return failure(
        new AppError(ErrorType.DatabaseError, (error as Error).message, 500)
      )
    }
  },

  async deleteEvent(eventId: string): Promise<Result<AppError, string>> {
    try {
      const result = await postgres.query(
        'DELETE FROM events WHERE id = $1 RETURNING id',
        [eventId]
      )

      if (result.rowCount === 0) {
        return failure(
          new AppError(
            ErrorType.NotFound,
            'no event found with specified ID',
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
  },

  async getEventById(eventId: string): Promise<Result<AppError, EventEntity>> {
    try {
      const result = await postgres.query(
        'SELECT * FROM events WHERE id = $1 LIMIT 1',
        [eventId]
      )

      if (result.rowCount === 0) {
        return failure(
          new AppError(
            ErrorType.NotFound,
            'no event found with specified ID',
            404
          )
        )
      }

      const event: EventEntity = EventEntity.mapToEventEntity(result.rows[0])
      return success(event)
    } catch (error: unknown) {
      return failure(
        new AppError(ErrorType.DatabaseError, (error as Error).message, 500)
      )
    }
  },

  async insertInvitees(
    eventId: string,
    names: string[]
  ): Promise<Result<AppError, InviteeDTO[]>> {
    try {
      const values = names
        .map((name, index) => `($1, $${index + 2})`)
        .join(', ')
      const params = [eventId, ...names]
      const result = await postgres.query(
        `INSERT INTO invitees(event_id, name) VALUES ${values} RETURNING id, name, created_at`,
        params
      )
      if (result.rowCount !== names.length) {
        return failure(
          new AppError(
            ErrorType.DatabaseError,
            'error during insertion of the new invitees',
            500
          )
        )
      }
      return success(result.rows.map((row) => InviteeDTO.mapToInviteeDTO(row)))
    } catch (error: unknown) {
      return failure(
        new AppError(ErrorType.DatabaseError, (error as Error).message, 500)
      )
    }
  },

  async getInviteesByEventId(
    eventId: string
  ): Promise<Result<AppError, InviteeDTO[]>> {
    try {
      const result = await postgres.query(
        'SELECT id, name, created_at FROM invitees WHERE event_id = $1',
        [eventId]
      )

      if (result.rowCount === 0) {
        return failure(
          new AppError(
            ErrorType.NotFound,
            'no invitees found for specified event',
            404
          )
        )
      }

      return success(result.rows.map((row) => InviteeDTO.mapToInviteeDTO(row)))
    } catch (error: unknown) {
      return failure(
        new AppError(ErrorType.DatabaseError, (error as Error).message, 500)
      )
    }
  },

  async deleteInvitee(
    eventId: string,
    inviteeId: string
  ): Promise<Result<AppError, string>> {
    try {
      const result = await postgres.query(
        'DELETE FROM invitees WHERE event_id = $1 AND id = $2 RETURNING id',
        [eventId, inviteeId]
      )

      if (result.rowCount === 0) {
        return failure(
          new AppError(
            ErrorType.NotFound,
            'no invitee found with specified ID for the event',
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
  },

  async getEventInviteeDTO(
    eventId: string,
    inviteeId: string
  ): Promise<Result<AppError, EventInviteeDTO>> {
    try {
      const result = await postgres.query(
        'SELECT e.id, i.id invitee_id, e.created_at event_created_at, e.deadline FROM events as e ' +
          'LEFT JOIN invitees as i ON e.id = i.event_id ' +
          'WHERE e.id = $1 AND i.id = $2 LIMIT 1',
        [eventId, inviteeId]
      )

      if (result.rowCount === 0) {
        console.error(
          `no event-invitee association found for event: ${eventId} and invitee: ${inviteeId}`
        )
        return failure(
          new AppError(
            ErrorType.NotFound,
            'event-invitee association with specified IDs not found',
            404
          )
        )
      }

      return success(EventInviteeDTO.mapToEventInviteeDTO(result.rows[0]))
    } catch (error: unknown) {
      return failure(
        new AppError(ErrorType.DatabaseError, (error as Error).message, 500)
      )
    }
  },

  async insertInviteeUpload(
    eventId: string,
    inviteeId: string,
    filePath: string
  ): Promise<Result<AppError, string>> {
    try {
      const result = await postgres.query(
        'INSERT INTO invitee_uploads(event_id, invitee_id, file_path) VALUES($1, $2, $3) RETURNING id',
        [eventId, inviteeId, filePath]
      )

      if (result.rowCount === 0) {
        return failure(
          new AppError(
            ErrorType.DatabaseError,
            'problem with event persistence operation',
            500
          )
        )
      }
      return success(result.rows[0].id)
    } catch (error: unknown) {
      return failure(
        new AppError(ErrorType.DatabaseError, (error as Error).message, 500)
      )
    }
  },

  async insertCompiledUpload(
    eventId: string,
    file_path: string
  ): Promise<Result<AppError, string>> {
    try {
      const result = await postgres.query(
        'INSERT INTO compiled_uploads(event_id, file_path) VALUES($1, $2) RETURNING id',
        [eventId, file_path]
      )

      if (result.rowCount === 0) {
        return failure(
          new AppError(
            ErrorType.DatabaseError,
            'problem with event persistence operation',
            500
          )
        )
      }
      return success(result.rows[0].id)
    } catch (error: unknown) {
      return failure(
        new AppError(ErrorType.DatabaseError, (error as Error).message, 500)
      )
    }
  },

  async getEventUploads(
    eventId: string
  ): Promise<Result<AppError, EventUploadsDTO[]>> {
    try {
      const result = await postgres.query(
        `
      SELECT 
       i.id AS invitee_id, 
       iu.id AS upload_id, 
       i.name AS invitee_name, 
       i.created_at AS invite_sent_at, 
       iu.file_path AS upload_path, 
       iu.created_at AS uploaded_at 
      FROM 
       invitees i 
      JOIN 
       invitee_uploads iu 
      ON 
       i.id = iu.invitee_id 
      WHERE 
       i.event_id = $1`,
        [eventId]
      )

      if (result.rowCount === 0) {
        return failure(
          new AppError(
            ErrorType.NotFound,
            'uploads for specified event not found',
            404
          )
        )
      }

      return success(
        result.rows.map((row) => EventUploadsDTO.mapToEventUploadsDTO(row))
      )
    } catch (error: unknown) {
      return failure(
        new AppError(ErrorType.DatabaseError, (error as Error).message, 500)
      )
    }
  },

  async getCompiledUpload(
    eventId: string
  ): Promise<Result<AppError, CompiledUploadDTO[]>> {
    try {
      const result = await postgres.query(
        'SELECT id AS upload_id,  file_path AS upload_path, created_at AS uploaded_at FROM compiled_uploads WHERE event_id = $1 LIMIT 1',
        [eventId]
      )

      if (result.rowCount === 0) {
        return success([])
      }

      return success([CompiledUploadDTO.mapToCompiledUploadDTO(result.rows[0])])
    } catch (error: unknown) {
      return failure(
        new AppError(ErrorType.DatabaseError, (error as Error).message, 500)
      )
    }
  },

  async deleteUpload(
    eventId: string,
    uploadId: string
  ): Promise<Result<AppError, string>> {
    try {
      const result = await postgres.query(
        'DELETE FROM invitee_uploads WHERE event_id = $1 AND id = $2 RETURNING id',
        [eventId, uploadId]
      )

      if (result.rowCount === 0) {
        return failure(
          new AppError(
            ErrorType.NotFound,
            'No upload found with specified ID for the event',
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

export default EventRepo
