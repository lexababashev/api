import {
  Result,
  ErrorType,
  success,
  failure,
  AppError
} from '../../src/utils/types/results'
import eventRepo, {
  CompiledUploadDTO,
  EventEntity,
  EventUploadsDTO,
  InviteeDTO
} from '../repos/eventRepo'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { UploadVideoReq } from '../models/eventsRequests'

const s3 = new S3Client({
  region: process.env.S3_REGION as string,
  forcePathStyle: true,
  endpoint: process.env.S3_URL as string,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.S3_ACCESS_KEY_SECRET as string
  }
})

const trimAndLowerCase = (str: string): string => str.trim().toLowerCase()

const millisecondsToDate = (milliseconds: number): string => {
  const date = new Date(milliseconds)
  return date.toISOString().replace('T', ' ').slice(0, 23)
}

export const EventService = {
  async createEvent(
    ownerId: string,
    name: string,
    deadline: number
  ): Promise<Result<AppError, string>> {
    try {
      const trimmedName = trimAndLowerCase(name)
      const formattedDeadline = millisecondsToDate(deadline)

      const result = await eventRepo.insertEvent(
        ownerId,
        trimmedName,
        formattedDeadline
      )

      if (result.isSuccess) {
        return success(result.value)
      } else {
        return failure(result.error)
      }
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
      const result = await eventRepo.getEventsByOwnerId(ownerId)
      if (result.isSuccess) {
        return success(result.value)
      } else if (result.error.type === ErrorType.NotFound) {
        return success([])
      } else {
        return failure(result.error)
      }
    } catch (error: unknown) {
      return failure(
        new AppError(ErrorType.DatabaseError, (error as Error).message, 500)
      )
    }
  },

  async getEventById(eventId: string): Promise<Result<AppError, EventEntity>> {
    try {
      const result = await eventRepo.getEventById(eventId)
      if (result.isSuccess) {
        return success(result.value)
      } else {
        return failure(result.error)
      }
    } catch (error: unknown) {
      return failure(
        new AppError(ErrorType.DatabaseError, (error as Error).message, 500)
      )
    }
  },

  async deleteEvent(eventId: string): Promise<Result<AppError, string>> {
    try {
      const result = await eventRepo.deleteEvent(eventId)
      if (result.isSuccess) {
        return success(result.value)
      } else {
        return failure(result.error)
      }
    } catch (error: unknown) {
      return failure(
        new AppError(ErrorType.DatabaseError, (error as Error).message, 500)
      )
    }
  },

  async isEventAccessible(
    eventId: string,
    userId: string
  ): Promise<Result<AppError, boolean>> {
    try {
      const result = await eventRepo.getEventById(eventId)
      if (result.isSuccess) {
        const eventEntity = result.value

        if (eventEntity.ownerId !== userId) {
          return failure(
            new AppError(
              ErrorType.BusinessLogicError,
              `User "${userId}" is not owner of the event "${eventId}"`,
              403
            )
          )
        }

        if (eventEntity.deadline.getTime() < new Date().getTime()) {
          return failure(
            new AppError(
              ErrorType.BusinessLogicError,
              'The deadline for this event has passed',
              403
            )
          )
        }

        return success(true)
      } else {
        return failure(result.error)
      }
    } catch (error: unknown) {
      return failure(
        new AppError(ErrorType.DatabaseError, (error as Error).message, 500)
      )
    }
  },

  async insertInvitees(
    eventId: string,
    invitees: string[],
    ownerName: string
  ): Promise<Result<AppError, InviteeDTO[]>> {
    try {
      const getInviteesByEventIdResult =
        await eventRepo.getInviteesByEventId(eventId)

      if (getInviteesByEventIdResult.isSuccess) {
        if (getInviteesByEventIdResult.value.length + invitees.length >= 6) {
          return failure(
            new AppError(
              ErrorType.BusinessLogicError,
              'The invitees list must contain 5 names at most',
              403
            )
          )
        }

        const isOwnerNameDuplicated = invitees.some(
          (name) => name.trim().toLowerCase() === ownerName.trim().toLowerCase()
        )

        if (isOwnerNameDuplicated) {
          return failure(
            new AppError(
              ErrorType.BusinessLogicError,
              'The owner name cannot be duplicated in the invitees list',
              403
            )
          )
        }

        const isDuplicatedInvitee = getInviteesByEventIdResult.value.some(
          (invitee) =>
            invitees.some((name) => invitee.name.trim() === name.trim())
        )

        if (isDuplicatedInvitee) {
          return failure(
            new AppError(
              ErrorType.BusinessLogicError,
              'The invitees cannot be duplicated',
              403
            )
          )
        }
      }

      if (
        getInviteesByEventIdResult.isFailure &&
        getInviteesByEventIdResult.error.type !== ErrorType.NotFound
      ) {
        return failure(getInviteesByEventIdResult.error)
      }

      const result = await eventRepo.insertInvitees(eventId, invitees)

      if (result.isSuccess) {
        return success(result.value)
      } else {
        return failure(result.error)
      }
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
      const result = await eventRepo.getInviteesByEventId(eventId)
      if (result.isSuccess) {
        return success(result.value)
      } else if (result.error.type === ErrorType.NotFound) {
        return success([])
      } else {
        return failure(result.error)
      }
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
      const result = await eventRepo.deleteInvitee(eventId, inviteeId)

      if (result.isSuccess) {
        return success(result.value)
      } else {
        return failure(result.error)
      }
    } catch (error: unknown) {
      return failure(
        new AppError(ErrorType.DatabaseError, (error as Error).message, 500)
      )
    }
  },

  async isEventInviteeValid(
    event_id: string,
    invitee_id: string
  ): Promise<Result<AppError, boolean>> {
    try {
      const getEventByIdResult = await eventRepo.getEventById(event_id)
      if (getEventByIdResult.isFailure) {
        return failure(getEventByIdResult.error)
      }

      const getEventInviteeDTOResult = await eventRepo.getEventInviteeDTO(
        event_id,
        invitee_id
      )
      if (getEventInviteeDTOResult.isFailure) {
        return failure(getEventInviteeDTOResult.error)
      }

      const eventInviteeDTO = getEventInviteeDTOResult.value

      if (eventInviteeDTO.eventDeadline.getTime() < new Date().getTime()) {
        return failure(
          new AppError(
            ErrorType.BusinessLogicError,
            'The deadline for this event has passed',
            403
          )
        )
      }

      return success(true)
    } catch (error: unknown) {
      return failure(
        new AppError(ErrorType.DatabaseError, (error as Error).message, 500)
      )
    }
  },

  async uploadCompiledVideo(
    eventId: string,
    uploadVideoReq: UploadVideoReq
  ): Promise<Result<AppError, string>> {
    try {
      const fileName = `${eventId}-${new Date().getTime()}`
      const s3UploadPath = `${process.env.S3_URL}/${process.env.S3_COMPILED_BUCKET}/${fileName}`

      const getCompiledUploadResult = await eventRepo.getCompiledUpload(eventId)
      if (getCompiledUploadResult.isFailure) {
        return failure(getCompiledUploadResult.error)
      }

      if (getCompiledUploadResult.value.length >= 1) {
        return failure(
          new AppError(
            ErrorType.BusinessLogicError,
            'The event has already a compiled video uploaded',
            403
          )
        )
      }

      const insertCompiledUploadResult = await eventRepo.insertCompiledUpload(
        eventId,
        s3UploadPath
      )

      if (insertCompiledUploadResult.isFailure) {
        return failure(insertCompiledUploadResult.error)
      }

      const params = {
        Body: Buffer.from(await uploadVideoReq.video.arrayBuffer()),
        Bucket: process.env.S3_COMPILED_BUCKET as string,
        Key: fileName,
        ContentType: uploadVideoReq.video.type
      }
      const uploadCommand = new PutObjectCommand(params)
      const uploadResult = await s3.send(uploadCommand)
      if (uploadResult.$metadata.httpStatusCode !== 200) {
        return failure(
          new AppError(
            ErrorType.InternalServerError,
            `Video was not saved: ${uploadResult.$metadata}`,
            500
          )
        )
      }
      return success(
        `Video ${insertCompiledUploadResult.value} successfully uploaded`
      )
    } catch (error: unknown) {
      return failure(
        new AppError(
          ErrorType.BusinessLogicError,
          (error as Error).message,
          500
        )
      )
    }
  },

  async uploadVideo(
    eventId: string,
    inviteeId: string,
    uploadVideoReq: UploadVideoReq
  ): Promise<Result<AppError, string>> {
    try {
      const fileName = `${inviteeId}-${new Date().getTime()}`
      const s3UploadPath = `${process.env.S3_URL}/${process.env.S3_INVITEES_BUCKET}/${fileName}`

      let uploadsCount = 0

      const getEventUploadsResult = await eventRepo.getEventUploads(eventId)
      if (getEventUploadsResult.isSuccess) {
        uploadsCount = getEventUploadsResult.value.length
      } else if (getEventUploadsResult.error.type === ErrorType.NotFound) {
        uploadsCount = 0
      } else {
        return failure(getEventUploadsResult.error)
      }

      if (uploadsCount >= 5) {
        return failure(
          new AppError(
            ErrorType.BusinessLogicError,
            'The event has reached the maximum number of uploads',
            403
          )
        )
      }

      const insertUploadResult = await eventRepo.insertInviteeUpload(
        eventId,
        inviteeId,
        s3UploadPath
      )

      if (insertUploadResult.isFailure) {
        return failure(insertUploadResult.error)
      }

      const params = {
        Body: Buffer.from(await uploadVideoReq.video.arrayBuffer()),
        Bucket: process.env.S3_INVITEES_BUCKET as string,
        Key: fileName,
        ContentType: uploadVideoReq.video.type
      }
      const uploadCommand = new PutObjectCommand(params)
      const uploadResult = await s3.send(uploadCommand)
      if (uploadResult.$metadata.httpStatusCode !== 200) {
        return failure(
          new AppError(
            ErrorType.InternalServerError,
            `Video was not saved: ${uploadResult.$metadata}`,
            500
          )
        )
      }
      return success(`Video ${insertUploadResult.value} successfully uploaded`)
    } catch (error: unknown) {
      return failure(
        new AppError(
          ErrorType.BusinessLogicError,
          (error as Error).message,
          500
        )
      )
    }
  },

  async getEventUploads(
    eventId: string
  ): Promise<Result<AppError, EventUploadsDTO[]>> {
    try {
      const result = await eventRepo.getEventUploads(eventId)
      if (result.isSuccess) {
        return success(result.value)
      } else if (result.error.type === ErrorType.NotFound) {
        return success([])
      } else {
        return failure(result.error)
      }
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
      const result = await eventRepo.getCompiledUpload(eventId)
      if (result.isSuccess) {
        return success(result.value)
      } else {
        return failure(result.error)
      }
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
      const result = await eventRepo.deleteUpload(eventId, uploadId)
      if (result.isSuccess) {
        return success(result.value)
      } else {
        return failure(result.error)
      }
    } catch (error: unknown) {
      return failure(
        new AppError(ErrorType.DatabaseError, (error as Error).message, 500)
      )
    }
  }
}

export default EventService
