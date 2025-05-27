import { test, beforeEach, afterEach, expect, jest, spyOn } from 'bun:test'
import { Hono } from 'hono'
import EventService from '../services/eventService'
import { errorHandlingStrategy } from '../utils/http/errorHandler'
import { eventRoutes } from './eventsRoutes'
import { AppError, ErrorType, failure, success } from '../utils/types/results'
import UserService from '../services/userService'

const app = new Hono()
app.onError(errorHandlingStrategy)
eventRoutes(app)

beforeEach(() => {
  console.error = jest.fn()
  console.log = jest.fn()
})

afterEach(() => {
  jest.restoreAllMocks()
})

const validJwtToken = UserService.generateJWT(
  '99vMKx8fBg',
  'alex',
  'alex@gmail.com'
)

test('POST /events should create a new event', async () => {
  spyOn(EventService, 'createEvent').mockResolvedValue(
    success('unique_event_id')
  )

  const req = new Request('http://localhost/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${validJwtToken}`
    },
    body: JSON.stringify({
      name: 'Event Name',
      deadline: Date.now() + 43200000
    })
  })

  const res = await app.request(req)
  expect(res.status).toBe(201)
  const json = await res.json()
  expect(json).toEqual({ event_id: 'unique_event_id' })
})

test('POST /events should fail if event creation failed', async () => {
  spyOn(EventService, 'createEvent').mockResolvedValue(
    failure(
      new AppError(ErrorType.BusinessLogicError, 'Event creation failed', 400)
    )
  )

  const req = new Request('http://localhost/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${validJwtToken}`
    },
    body: JSON.stringify({
      name: 'Event Name',
      deadline: Date.now() + 43200000
    })
  })

  const res = await app.request(req)
  expect(res.status).toBe(400)
  const json = await res.json()
  expect(json).toEqual({ message: 'Event creation failed' })
})

const eventEntityMock = {
  id: 'unique_event_id',
  ownerId: 'owner_id',
  name: 'Event Name',
  createdAt: new Date('2024-01-01'),
  deadline: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
}

test('GET /events should return a list of events by owner id', async () => {
  spyOn(EventService, 'getEventsByOwnerId').mockResolvedValue(
    success([eventEntityMock])
  )

  const req = new Request('http://localhost/events', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${validJwtToken}`
    }
  })

  const res = await app.request(req)
  expect(res.status).toBe(200)
  const json = await res.json()
  expect(json).toEqual([
    {
      ...eventEntityMock,
      createdAt: eventEntityMock.createdAt.toISOString(),
      deadline: eventEntityMock.deadline.toISOString()
    }
  ])
})

test('GET /events should fail if no events found', async () => {
  spyOn(EventService, 'getEventsByOwnerId').mockResolvedValue(
    failure(
      new AppError(
        ErrorType.NotFound,
        'no events found for specified owner',
        404
      )
    )
  )

  const req = new Request('http://localhost/events', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${validJwtToken}`
    }
  })

  const res = await app.request(req)
  expect(res.status).toBe(404)
  const json = await res.json()
  expect(json).toEqual({ message: 'no events found for specified owner' })
})

test('GET /events/:id should return an event by id', async () => {
  spyOn(EventService, 'getEventById').mockResolvedValue(
    success(eventEntityMock)
  )

  const req = new Request('http://localhost/events/unique_event_id', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${validJwtToken}`
    }
  })

  const res = await app.request(req)
  expect(res.status).toBe(200)
  const json = await res.json()
  expect(json).toEqual({
    ...eventEntityMock,
    createdAt: eventEntityMock.createdAt.toISOString(),
    deadline: eventEntityMock.deadline.toISOString()
  })
})

test('GET /events/:id should fail if event not  found', async () => {
  spyOn(EventService, 'getEventById').mockResolvedValue(
    failure(
      new AppError(ErrorType.NotFound, 'no event found with specified ID', 404)
    )
  )

  const req = new Request('http://localhost/events/unique_event_id', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${validJwtToken}`
    }
  })

  const res = await app.request(req)
  expect(res.status).toBe(404)
  const json = await res.json()
  expect(json).toEqual({ message: 'no event found with specified ID' })
})

const inviteeDTOMock = {
  id: 'invitee1ID',
  name: 'invitee1',
  createdAt: new Date('2024-01-01')
}

test('GET /events/:id/invitees should return a list of invitees', async () => {
  spyOn(EventService, 'getEventById').mockResolvedValue(
    success(eventEntityMock)
  )
  spyOn(EventService, 'getInviteesByEventId').mockResolvedValue(
    success([inviteeDTOMock])
  )

  const req = new Request('http://localhost/events/unique_event_id/invitees', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${validJwtToken}`
    }
  })

  const res = await app.request(req)
  expect(res.status).toBe(200)
  const json = await res.json()
  expect(json).toBeArray()
  expect(json[0]).toMatchObject({
    id: 'invitee1ID',
    name: 'invitee1',
    createdAt: '2024-01-01T00:00:00.000Z'
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

test('GET /events/:id/uploads should return a list of uploads', async () => {
  spyOn(EventService, 'getEventById').mockResolvedValue(
    success(eventEntityMock)
  )
  spyOn(EventService, 'getEventUploads').mockResolvedValue(
    success([EventUploadMock, EventUploadMock])
  )

  const req = new Request('http://localhost/events/unique_event_id/uploads', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${validJwtToken}`
    }
  })

  const res = await app.request(req)
  expect(res.status).toBe(200)
  const json = await res.json()
  expect(json).toBeArray()
  expect(json[0]).toMatchObject({
    inviteeId: expect.any(String),
    uploadId: expect.any(String),
    inviteeName: expect.any(String),
    inviteSentAt: expect.any(String),
    uploadPath: expect.any(String),
    uploadedAt: expect.any(String)
  })
})

test('GET /events/:id/uploads should fail if no list of uploads found', async () => {
  spyOn(EventService, 'getEventById').mockResolvedValue(
    success(eventEntityMock)
  )
  spyOn(EventService, 'getEventUploads').mockResolvedValue(
    failure(
      new AppError(
        ErrorType.NotFound,
        'uploads for specified event not found',
        404
      )
    )
  )

  const req = new Request('http://localhost/events/unique_event_id/uploads', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${validJwtToken}`
    }
  })

  const res = await app.request(req)
  expect(res.status).toBe(404)
  const json = await res.json()
  expect(json).toEqual({ message: 'uploads for specified event not found' })
})

test('GET /events/:id/invitees/:inviteeId/uploads should fail if event does not exist', async () => {
  spyOn(EventService, 'getEventById').mockResolvedValue(
    failure(
      new AppError(ErrorType.NotFound, 'no event found with specified ID', 404)
    )
  )

  const req = new Request(
    'http://localhost/events/unique_event_id/invitees/invitee_id/uploads',
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${validJwtToken}`
      }
    }
  )

  const res = await app.request(req)
  expect(res.status).toBe(404)
  const json = await res.json()
  expect(json).toEqual({ message: 'no event found with specified ID' })
})
