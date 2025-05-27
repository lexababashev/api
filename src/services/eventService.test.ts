import { test, beforeEach, afterEach, expect, jest, spyOn } from 'bun:test'
import EventService from './eventService'
import {
  AppError,
  ErrorType,
  Failure,
  Success,
  success
} from '../utils/types/results'
import eventRepo, {
  EventEntity,
  EventUploadsDTO,
  InviteeDTO
} from '../repos/eventRepo'

beforeEach(() => {
  console.error = jest.fn()
  console.log = jest.fn()
})

afterEach(() => {
  jest.restoreAllMocks()
})

test('createEvent must return the id of the new event', async () => {
  spyOn(eventRepo, 'insertEvent').mockResolvedValue(success('unique_event_id'))

  const result = await EventService.createEvent(
    'owner_id',
    'Event Name',
    Date.now()
  )
  expect(result.isSuccess).toBe(true)
  expect((result as Success<string>).value).toBe('unique_event_id')
})

test('createEvent must return failure in case of unexpected issues', async () => {
  spyOn(eventRepo, 'insertEvent').mockImplementation(async () => {
    throw new Error('DB connection error')
  })

  const result = await EventService.createEvent(
    'owner_id',
    'Event Name',
    Date.now()
  )
  expect(result.isFailure).toBe(true)

  const failedResult = result as Failure<AppError>
  expect(failedResult.error).toMatchObject({
    type: ErrorType.DatabaseError,
    message: expect.any(String),
    code: 500
  })
})

const eventEntityMock = {
  id: 'unique_event_id',
  ownerId: 'owner_id',
  name: 'Event Name',
  createdAt: new Date('2024-01-01'),
  deadline: new Date(new Date().setFullYear(new Date().getFullYear() + 1)) // 1 year from now
}

test('getEventsByOwnerId must return a list of EventEntities', async () => {
  spyOn(eventRepo, 'getEventsByOwnerId').mockResolvedValue(
    success([eventEntityMock])
  )

  const result = await EventService.getEventsByOwnerId('owner_id')
  expect(result.isSuccess).toBe(true)

  const eventEntities = (result as Success<EventEntity[]>).value
  expect(eventEntities[0]).toMatchObject(eventEntityMock)
})

test('getEventsByOwnerId must return failure in case of unexpected issues', async () => {
  spyOn(eventRepo, 'getEventsByOwnerId').mockImplementation(async () => {
    throw new Error('DB error')
  })

  const result = await EventService.getEventsByOwnerId('owner_id')
  expect(result.isFailure).toBe(true)

  const failedResult = result as Failure<AppError>
  expect(failedResult.error).toMatchObject({
    type: ErrorType.DatabaseError,
    message: expect.any(String),
    code: 500
  })
})

test('getEventById must return an EventEntity', async () => {
  spyOn(eventRepo, 'getEventById').mockResolvedValue(success(eventEntityMock))

  const result = await EventService.getEventById('unique_event_id')
  expect(result.isSuccess).toBe(true)

  const eventEntity = (result as Success<EventEntity>).value
  expect(eventEntity).toMatchObject(eventEntityMock)
})

test('getEventById must return failure in case of unexpected issues', async () => {
  spyOn(eventRepo, 'getEventById').mockImplementation(async () => {
    throw new Error('DB error')
  })

  const result = await EventService.getEventById('unique_event_id')
  expect(result.isFailure).toBe(true)

  const failedResult = result as Failure<AppError>
  expect(failedResult.error).toMatchObject({
    type: ErrorType.DatabaseError,
    message: expect.any(String),
    code: 500
  })
})

test('isEventAccessible must return true if the event is accessible', async () => {
  spyOn(eventRepo, 'getEventById').mockResolvedValue(success(eventEntityMock))

  const result = await EventService.isEventAccessible(
    'unique_event_id',
    'owner_id'
  )
  expect(result.isSuccess).toBe(true)
  const successResult = result as Success<boolean>
  expect(successResult.value).toBe(true)
})

test('isEventAccessible must return failure if the user is not the owner', async () => {
  spyOn(eventRepo, 'getEventById').mockResolvedValue(success(eventEntityMock))

  const result = await EventService.isEventAccessible(
    'unique_event_id',
    'another_user_id'
  )
  expect(result.isFailure).toBe(true)

  const failedResult = result as Failure<AppError>
  expect(failedResult.error).toMatchObject({
    type: ErrorType.BusinessLogicError,
    message: expect.any(String),
    code: 403
  })
})

const pastEventEntityMock = {
  ...eventEntityMock,
  deadline: new Date('2020-01-01')
}

test('isEventAccessible must return failure if the event deadline has passed', async () => {
  spyOn(eventRepo, 'getEventById').mockResolvedValue(
    success(pastEventEntityMock)
  )

  const result = await EventService.isEventAccessible(
    'unique_event_id',
    'owner_id'
  )
  expect(result.isFailure).toBe(true)

  const failedResult = result as Failure<AppError>
  expect(failedResult.error).toMatchObject({
    type: ErrorType.BusinessLogicError,
    message: expect.any(String),
    code: 403
  })
})

test('getInviteesByEventId must return a list of invitee DTO`s', async () => {
  spyOn(eventRepo, 'getInviteesByEventId').mockResolvedValue(
    success([
      {
        id: 'invitee1ID',
        name: 'invitee1',
        createdAt: new Date('2025-02-11 18:45:39.719')
      },
      {
        id: 'invitee2ID',
        name: 'invitee2',
        createdAt: new Date('2025-02-11 18:45:39.719')
      }
    ])
  )

  const result = await EventService.getInviteesByEventId('unique_event_id')
  expect(result.isSuccess).toBe(true)

  const inviteeDTOs = (result as Success<InviteeDTO[]>).value
  expect(inviteeDTOs).toBeArray()
  expect(inviteeDTOs[0]).toMatchObject({
    id: expect.any(String),
    name: expect.any(String),
    createdAt: expect.any(Date)
  })
})

test('getInviteesByEventId must return failure in case of unexpected issues', async () => {
  spyOn(eventRepo, 'getInviteesByEventId').mockImplementation(async () => {
    throw new Error('DB connection error')
  })

  const result = await EventService.getInviteesByEventId('unique_event_id')
  expect(result.isFailure).toBe(true)

  const failedResult = result as Failure<AppError>
  expect(failedResult.error).toMatchObject({
    type: ErrorType.DatabaseError,
    message: expect.any(String),
    code: 500
  })
})

const eventInviteeMock = {
  eventId: 'unique_event_id',
  inviteeId: 'invitee_id',
  eventCreatedAt: new Date('2024-01-01'),
  eventDeadline: new Date(new Date().setFullYear(new Date().getFullYear() + 1)) // 1 year from now
}

test('isEventInviteeValid must return true if the invitee is valid', async () => {
  spyOn(eventRepo, 'getEventById').mockResolvedValue(success(eventEntityMock))
  spyOn(eventRepo, 'getEventInviteeDTO').mockResolvedValue(
    success(eventInviteeMock)
  )

  const result = await EventService.isEventInviteeValid(
    'unique_event_id',
    'invitee_id'
  )

  expect(result.isSuccess).toBe(true)
  const successResult = result as Success<boolean>
  expect(successResult.value).toBe(true)
})

const pastEventInviteeMock = {
  ...eventInviteeMock,
  eventDeadline: new Date('2000-01-01')
}

test('isEventInviteeValid must return failure if the event deadline has passed', async () => {
  spyOn(eventRepo, 'getEventById').mockResolvedValue(success(eventEntityMock))
  spyOn(eventRepo, 'getEventInviteeDTO').mockResolvedValue(
    success(pastEventInviteeMock)
  )

  const result = await EventService.isEventInviteeValid(
    'unique_event_id',
    'invitee_id'
  )
  expect(result.isFailure).toBe(true)

  const failedResult = result as Failure<AppError>
  expect(failedResult.error).toMatchObject({
    type: ErrorType.BusinessLogicError,
    message: expect.any(String),
    code: 403
  })
})

const EventUploadMock = {
  inviteeId: 'invitee_id',
  uploadId: 'upload_id',
  inviteeName: 'invitee_name',
  inviteSentAt: new Date('2025-02-11 18:45:39.719'),
  uploadPath: 'upload_path',
  uploadedAt: new Date('2025-02-11 18:45:39.719')
}

test('getEventUploads must return a list of uploads', async () => {
  spyOn(eventRepo, 'getEventUploads').mockResolvedValue(
    success([EventUploadMock, EventUploadMock])
  )

  const result = await EventService.getEventUploads('unique_event_id')
  expect(result.isSuccess).toBe(true)

  const uploads = (result as Success<EventUploadsDTO[]>).value

  expect(uploads).toBeArray()
  expect(uploads[0]).toMatchObject({
    inviteeId: expect.any(String),
    uploadId: expect.any(String),
    inviteeName: expect.any(String),
    inviteSentAt: expect.any(Date),
    uploadPath: expect.any(String),
    uploadedAt: expect.any(Date)
  })
})

test('getEventUploads must return failure in case of unexpected issues', async () => {
  spyOn(eventRepo, 'getEventUploads').mockImplementation(async () => {
    throw new Error('DB connection error')
  })

  const result = await EventService.getEventUploads('unique_event_id')
  expect(result.isFailure).toBe(true)

  const failedResult = result as Failure<AppError>
  expect(failedResult.error).toMatchObject({
    type: ErrorType.DatabaseError,
    message: expect.any(String),
    code: 500
  })
})
