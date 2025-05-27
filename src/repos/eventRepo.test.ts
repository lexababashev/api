import { test, beforeEach, afterEach, expect, jest, spyOn } from 'bun:test'
import EventRepo, { EventEntity, InviteeDTO } from './eventRepo'
import { AppError, ErrorType, Failure, Success } from '../utils/types/results'
import * as postgres from '../db/postgres/postgres'

beforeEach(() => {
  console.error = jest.fn()
  console.log = jest.fn()
})

afterEach(() => {
  jest.restoreAllMocks()
})

const userId = '99vMKx8fBg' //alex is the owner of the event and he always exists due to the seed data
let createdEventId: string

test('insertEvent must successfully insert a new event and return its ID', async () => {
  const queryResult = await EventRepo.insertEvent(
    userId,
    'test_event_name',
    '2025-01-01T00:00:00Z'
  )

  expect(queryResult.isSuccess).toBe(true)
  const successfulResult = queryResult as Success<string>
  expect(successfulResult.value).toBeTruthy()
  expect(successfulResult.value).toHaveLength(10)

  createdEventId = successfulResult.value
})

test('insertEvent must fail when the insertion does not happen because of invalid owner id', async () => {
  const queryResult = await EventRepo.insertEvent(
    'non_existing_owner_id',
    'test_event_name',
    '2025-01-01T00:00:00Z'
  )

  expect(queryResult.isFailure).toBe(true)
  const failedResult = queryResult as Failure<AppError>

  expect(failedResult.error.code).toBe(500)
  expect(failedResult.error.type).toBe(ErrorType.DatabaseError)
  expect(failedResult.error.message).toBeString()
})

test('insertEvent must fail when database error occurs', async () => {
  spyOn(postgres, 'query').mockRejectedValue(new Error('DB connection error'))
  const queryResult = await EventRepo.insertEvent(
    userId,
    'test_event_name',
    '2025-01-01T00:00:00Z'
  )

  expect(queryResult.isFailure).toBe(true)
  const failedResult = queryResult as Failure<AppError>
  expect(failedResult.error.type).toBe(ErrorType.DatabaseError)
  expect(failedResult.error.message).toBe('DB connection error')
  expect(failedResult.error.code).toBe(500)
})

test('getEventsByOwnerId must return events for a valid owner ID', async () => {
  const queryResult = await EventRepo.getEventsByOwnerId(userId)

  expect(queryResult.isSuccess).toBe(true)
  const successfulResult = queryResult as Success<EventEntity[]>
  expect(successfulResult.value).toBeInstanceOf(Array)
  expect(successfulResult.value[0]).toMatchObject({
    id: expect.any(String),
    ownerId: userId,
    name: 'test_event_name',
    createdAt: expect.any(Date),
    deadline: expect.any(Date)
  })
})

test('getEventsByOwnerId must fail for a non-existing owner ID', async () => {
  const result = await EventRepo.getEventsByOwnerId('nonExistingOwnerId')

  expect(result.isFailure).toBe(true)
  const failResult = result as Failure<AppError>
  expect(failResult.error.code).toBe(404)
  expect(failResult.error.message).toBe('no events found for specified owner')
  expect(failResult.error.type).toBe(ErrorType.NotFound)
})

test('getEventsByOwnerId must fail when database error occurs', async () => {
  spyOn(postgres, 'query').mockRejectedValue(new Error('DB connection error'))
  const queryResult = await EventRepo.getEventsByOwnerId(userId)

  expect(queryResult.isFailure).toBe(true)
  const failedResult = queryResult as Failure<AppError>
  expect(failedResult.error.type).toBe(ErrorType.DatabaseError)
  expect(failedResult.error.message).toBe('DB connection error')
  expect(failedResult.error.code).toBe(500)
})

test('getEventById must return event for a valid event ID', async () => {
  const queryResult = await EventRepo.getEventById(createdEventId)

  expect(queryResult.isSuccess).toBe(true)
  const successfulResult = queryResult as Success<EventEntity>
  expect(successfulResult.value).toMatchObject({
    id: createdEventId,
    ownerId: userId,
    name: 'test_event_name',
    createdAt: expect.any(Date),
    deadline: expect.any(Date)
  })
})

test('getEventById must fail for a non-existing event ID', async () => {
  const queryResult = await EventRepo.getEventById('nonExistingEventId')

  expect(queryResult.isFailure).toBe(true)
  const failedResult = queryResult as Failure<AppError>
  expect(failedResult.error.code).toBe(404)
  expect(failedResult.error.type).toBe(ErrorType.NotFound)
  expect(failedResult.error.message).toBe('no event found with specified ID')
})

test('getEventById must fail when database error occurs', async () => {
  spyOn(postgres, 'query').mockRejectedValue(new Error('DB connection error'))
  const queryResult = await EventRepo.getEventById(createdEventId)

  expect(queryResult.isFailure).toBe(true)
  const failedResult = queryResult as Failure<AppError>
  expect(failedResult.error.code).toBe(500)
  expect(failedResult.error.type).toBe(ErrorType.DatabaseError)
  expect(failedResult.error.message).toBe('DB connection error')
})

test('insertInvitees must fail when the insertion does not happened because of invalid event key', async () => {
  const invitees = ['test_filed_Alice', 'test_filed_Bob', 'test_filed_Charlie']
  const queryResult = await EventRepo.insertInvitees(
    'non_existing_event_id',
    invitees
  )

  expect(queryResult.isFailure).toBe(true)
  const failedResult = queryResult as Failure<AppError>
  expect(failedResult.error.code).toBe(500)
  expect(failedResult.error.type).toBe(ErrorType.DatabaseError)
  expect(failedResult.error.message).toBeString()
})

test('insertInvitees must fail when database error occurs', async () => {
  const invitees = ['test_filed_Alice', 'test_filed_Bob', 'test_filed_Charlie']
  spyOn(postgres, 'query').mockRejectedValue(new Error('DB connection error'))

  const queryResult = await EventRepo.insertInvitees(createdEventId, invitees)
  const failedResult = queryResult as Failure<AppError>
  expect(failedResult.error.code).toBe(500)
  expect(failedResult.error.type).toBe(ErrorType.DatabaseError)
  expect(failedResult.error.message).toBe('DB connection error')
})

test('getInviteesByEventId must return invitee DTO`s for a valid event ID', async () => {
  const queryResult = await EventRepo.getInviteesByEventId(createdEventId)

  expect(queryResult.isSuccess).toBe(true)
  const successfulResult = queryResult as Success<InviteeDTO[]>
  expect(successfulResult.value).toBeInstanceOf(Array)
  expect(successfulResult.value[0]).toMatchObject({
    id: expect.any(String),
    name: expect.any(String),
    createdAt: expect.any(Date)
  })
})

test('getInviteesByEventId must fail for a non-existing event ID', async () => {
  const queryResult = await EventRepo.getInviteesByEventId('nonExistingEventId')

  expect(queryResult.isFailure).toBe(true)
  const failedResult = queryResult as Failure<AppError>
  expect(failedResult.error.code).toBe(404)
  expect(failedResult.error.type).toBe(ErrorType.NotFound)
  expect(failedResult.error.message).toBe(
    'no invitees found for specified event'
  )
})

test('getInviteesByEventId must fail when database error occurs', async () => {
  spyOn(postgres, 'query').mockRejectedValue(new Error('DB connection error'))
  const queryResult = await EventRepo.getInviteesByEventId(createdEventId)

  expect(queryResult.isFailure).toBe(true)
  const failedResult = queryResult as Failure<AppError>
  expect(failedResult.error.code).toBe(500)
  expect(failedResult.error.type).toBe(ErrorType.DatabaseError)
  expect(failedResult.error.message).toBe('DB connection error')
})

test('getEventUploads must fail for a non-existing event ID', async () => {
  const queryResult = await EventRepo.getEventUploads('nonExistingEventId')

  expect(queryResult.isFailure).toBe(true)
  const failedResult = queryResult as Failure<AppError>
  expect(failedResult.error.code).toBe(404)
  expect(failedResult.error.type).toBe(ErrorType.NotFound)
  expect(failedResult.error.message).toBe(
    'uploads for specified event not found'
  )
})

test('getEventUploads must fail when database error occurs', async () => {
  spyOn(postgres, 'query').mockRejectedValue(new Error('DB connection error'))
  const queryResult = await EventRepo.getEventUploads(createdEventId)

  expect(queryResult.isFailure).toBe(true)
  const failedResult = queryResult as Failure<AppError>
  expect(failedResult.error.code).toBe(500)
  expect(failedResult.error.type).toBe(ErrorType.DatabaseError)
  expect(failedResult.error.message).toBe('DB connection error')
})
