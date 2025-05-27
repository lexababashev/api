import { Hono } from 'hono'
import { jwt, jwt as jwtHono } from 'hono/jwt'
import { reqValidator } from '../models/validators/validationMiddleware'
import {
  CreateEventReq,
  AddInviteesReq,
  UploadVideoReq,
  eventValidationSchema,
  inviteesValidationSchema,
  uploadVideoValidationSchema
} from '../models/eventsRequests'
import EventService from '../services/eventService'
import { handleError } from '../utils/http/errorHandler'

const jwtMiddleware = jwtHono({ secret: String(process.env.JWT_SECRET) })

export const eventRoutes = (app: Hono) => {
  app.post(
    '/events',
    jwtMiddleware,
    reqValidator('json', eventValidationSchema),
    async (c) => {
      const jwt = c.get('jwtPayload')
      const createEventReq = c.get('validatedBody') as CreateEventReq

      const createEventResult = await EventService.createEvent(
        jwt.iss,
        createEventReq.name,
        createEventReq.deadline
      )

      if (createEventResult.isSuccess) {
        return c.json({ event_id: createEventResult.value }, 201)
      } else {
        handleError(createEventResult.error)
      }
    }
  )

  app.get('/events', jwtMiddleware, async (c) => {
    const jwt = c.get('jwtPayload')

    const getEventsByOwnerIdResult = await EventService.getEventsByOwnerId(
      jwt.iss
    )
    if (getEventsByOwnerIdResult.isSuccess) {
      return c.json(getEventsByOwnerIdResult.value, 200)
    } else {
      handleError(getEventsByOwnerIdResult.error)
    }
  })

  app.get('/events/:id', jwtMiddleware, async (c) => {
    const eventId = c.req.param('id')
    console.log(`caller id ${c.get('jwtPayload').iss}`)

    const getEventByIdResult = await EventService.getEventById(eventId)

    if (getEventByIdResult.isSuccess) {
      return c.json(getEventByIdResult.value, 200)
    } else {
      handleError(getEventByIdResult.error)
    }
  })

  app.delete('/events/:id', jwtMiddleware, async (c) => {
    const eventId = c.req.param('id')
    const ownerId = c.get('jwtPayload').iss

    const isEventAccessibleResult = await EventService.isEventAccessible(
      eventId,
      ownerId
    )

    if (isEventAccessibleResult.isFailure) {
      return handleError(isEventAccessibleResult.error)
    }

    const deleteEventResult = await EventService.deleteEvent(eventId)

    if (deleteEventResult.isSuccess) {
      return c.json(
        { message: `event ${deleteEventResult.value} was deleted` },
        200
      )
    } else {
      handleError(deleteEventResult.error)
    }
  })

  app.post(
    '/events/:id/invitees',
    jwtMiddleware,
    reqValidator('json', inviteesValidationSchema),
    async (c) => {
      const eventId = c.req.param('id')
      const ownerId = c.get('jwtPayload').iss
      const ownerName = c.get('jwtPayload').username
      const addInviteesReq = c.get('validatedBody') as AddInviteesReq

      const isEventAccessibleResult = await EventService.isEventAccessible(
        eventId,
        ownerId
      )

      if (isEventAccessibleResult.isFailure) {
        return handleError(isEventAccessibleResult.error)
      }
      const insertInviteesResult = await EventService.insertInvitees(
        eventId,
        addInviteesReq.names,
        ownerName
      )

      if (insertInviteesResult.isSuccess) {
        return c.json(insertInviteesResult.value, 201)
      } else {
        handleError(insertInviteesResult.error)
      }
    }
  )

  app.get('/events/:id/invitees', jwtMiddleware, async (c) => {
    const eventId = c.req.param('id')

    const getEventByIdResult = await EventService.getEventById(eventId)

    if (getEventByIdResult.isFailure) {
      return handleError(getEventByIdResult.error)
    }

    const getInviteesByEventIdResult =
      await EventService.getInviteesByEventId(eventId)

    if (getInviteesByEventIdResult.isFailure) {
      return handleError(getInviteesByEventIdResult.error)
    }

    return c.json(getInviteesByEventIdResult.value, 200)
  })

  app.delete('/events/:id/invitees/:inviteeId', jwtMiddleware, async (c) => {
    const eventId = c.req.param('id')
    const inviteeId = c.req.param('inviteeId')
    const ownerId = c.get('jwtPayload').iss

    const isEventAccessibleResult = await EventService.isEventAccessible(
      eventId,
      ownerId
    )

    if (isEventAccessibleResult.isFailure) {
      return handleError(isEventAccessibleResult.error)
    }

    const isEventInviteeValidResult = await EventService.isEventInviteeValid(
      eventId,
      inviteeId
    )

    if (isEventInviteeValidResult.isFailure) {
      return handleError(isEventInviteeValidResult.error)
    }

    const deleteInviteeResult = await EventService.deleteInvitee(
      eventId,
      inviteeId
    )

    if (deleteInviteeResult.isSuccess) {
      return c.json(
        { message: `invitee ${deleteInviteeResult.value} was deleted` },
        200
      )
    } else {
      return handleError(deleteInviteeResult.error)
    }
  })

  app.post(
    '/events/:id/invitees/:inviteeId/upload',
    reqValidator('form', uploadVideoValidationSchema),
    async (c) => {
      const eventId = c.req.param('id')
      const inviteeId = c.req.param('inviteeId')

      // Check if the event exists and is accessible to the invitee + deadline
      const isEventInviteeValidResult = await EventService.isEventInviteeValid(
        eventId,
        inviteeId
      )
      if (isEventInviteeValidResult.isFailure) {
        return handleError(isEventInviteeValidResult.error)
      }

      let eventUploads = []
      const getEventUploadsResult = await EventService.getEventUploads(eventId)
      if (getEventUploadsResult.isFailure) {
        return handleError(getEventUploadsResult.error)
      } else {
        eventUploads = getEventUploadsResult.value
      }

      const optionInviteeUploads = eventUploads.filter(
        (upload) => upload.inviteeId === inviteeId
      )

      if (optionInviteeUploads.length !== 0) {
        return c.json({ message: 'You have already uploaded a video' }, 403)
      }

      const getCompiledUploadsResult = await EventService.getCompiledUpload(eventId)
      
      if (getCompiledUploadsResult.isFailure) {
        return handleError(getCompiledUploadsResult.error)
      }

      if (getCompiledUploadsResult.value.length !== 0) {
        return c.json(
          { message: 'The event has already been finished' },
          403
        )
      }

      const uploadVideoReq: UploadVideoReq = c.get(
        'validatedBody'
      ) as UploadVideoReq

      const uploadVideoResult = await EventService.uploadVideo(
        eventId,
        inviteeId,
        uploadVideoReq
      )
      if (uploadVideoResult.isFailure) {
        return handleError(uploadVideoResult.error)
      }

      return c.json({ message: uploadVideoResult.value }, 201)
    }
  )

  app.post(
    '/events/:id/upload',
    jwtMiddleware,
    reqValidator('form', uploadVideoValidationSchema),
    async (c) => {
      const eventId = c.req.param('id')
      const ownerId = c.get('jwtPayload').iss
      const ownerName = c.get('jwtPayload').username
      const uploadVideoReq: UploadVideoReq = c.get(
        'validatedBody'
      ) as UploadVideoReq

      // Check if the event exists and is accessible to the owner + deadline
      const isEventAccessibleResult = await EventService.isEventAccessible(
        eventId,
        ownerId
      )
      if (isEventAccessibleResult.isFailure) {
        return handleError(isEventAccessibleResult.error)
      }

      const getCompiledUploadsResult =
        await EventService.getCompiledUpload(eventId)
      if (getCompiledUploadsResult.isFailure) {
        return handleError(getCompiledUploadsResult.error)
      }

      if (getCompiledUploadsResult.value.length !== 0) {
        return c.json(
          { message: 'The event has already been finished' },
          403
        )
      }

      const insertInviteesResult = await EventService.insertInvitees(
        eventId,
        [ownerName],
        ''
      )

      if (insertInviteesResult.isFailure) {
        handleError(insertInviteesResult.error)
      }
      let ownerInviteeId = ''

      if (insertInviteesResult.isSuccess) {
        ownerInviteeId = insertInviteesResult.value[0].id
      }

      // Pass the owner ID as the invitee ID in this case
      const uploadVideoResult = await EventService.uploadVideo(
        eventId,
        ownerInviteeId,
        uploadVideoReq
      )

      if (uploadVideoResult.isFailure) {
        return handleError(uploadVideoResult.error)
      }

      return c.json({ message: uploadVideoResult.value }, 201)
    }
  )

  app.post(
    '/events/:id/compiled/upload',
    jwtMiddleware,
    reqValidator('form', uploadVideoValidationSchema),
    async (c) => {
      const eventId = c.req.param('id')
      const ownerId = c.get('jwtPayload').iss

      const getEventByIdResult = await EventService.getEventById(eventId)
      if (getEventByIdResult.isFailure) {
        return handleError(getEventByIdResult.error)
      }

      if (getEventByIdResult.value.ownerId != ownerId) {
        return c.json(
          `User "${ownerId}" is not owner of the event "${eventId}"`,
          403
        )
      }

      const uploadVideoReq: UploadVideoReq = c.get(
        'validatedBody'
      ) as UploadVideoReq

      // Pass the owner ID as the invitee ID in this case
      const uploadCompiledVideoResult = await EventService.uploadCompiledVideo(
        eventId,
        uploadVideoReq
      )

      if (uploadCompiledVideoResult.isFailure) {
        return handleError(uploadCompiledVideoResult.error)
      }

      return c.json({ message: uploadCompiledVideoResult.value }, 201)
    }
  )

  app.get('/events/:id/compiled/upload', async (c) => {
    const eventId = c.req.param('id')
    const getEventByIdResult = await EventService.getEventById(eventId)
    if (getEventByIdResult.isFailure) {
      return handleError(getEventByIdResult.error)
    }
    const getCompiledUploadsResult = await EventService.getCompiledUpload(eventId)
    if (getCompiledUploadsResult.isFailure) {
      return handleError(getCompiledUploadsResult.error)

    }

    return c.json(getCompiledUploadsResult.value, 200)
  })

  app.get('/events/:id/uploads', jwtMiddleware, async (c) => {
    const eventId = c.req.param('id')
    const getEventByIdResult = await EventService.getEventById(eventId)
    if (getEventByIdResult.isFailure) {
      return handleError(getEventByIdResult.error)
    }
    const getEventUploadsResult = await EventService.getEventUploads(eventId)
    if (getEventUploadsResult.isSuccess) {
      return c.json(getEventUploadsResult.value, 200)
    } else {
      return handleError(getEventUploadsResult.error)
    }
  })

  app.get('/events/:id/invitees/:inviteeId/uploads', async (c) => {
    const eventId = c.req.param('id')
    const inviteeId = c.req.param('inviteeId')

    const getEventByIdResult = await EventService.getEventById(eventId)
    if (getEventByIdResult.isFailure) {
      return handleError(getEventByIdResult.error)
    }

    let eventUploads = []
    const getEventUploadsResult = await EventService.getEventUploads(eventId)
    if (getEventUploadsResult.isFailure) {
      return handleError(getEventUploadsResult.error)
    } else {
      eventUploads = getEventUploadsResult.value
    }

    const optionInviteeUploads = eventUploads.filter(
      (upload) => upload.inviteeId === inviteeId
    )

    if (optionInviteeUploads.length === 0) {
      return c.json([], 200)
    } else {
      return c.json(optionInviteeUploads, 200)
    }
  })

  app.delete('/events/:id/uploads/:uploadId', jwtMiddleware, async (c) => {
    const eventId = c.req.param('id')
    const uploadId = c.req.param('uploadId')
    const ownerId = c.get('jwtPayload').iss
    const ownerName = c.get('jwtPayload').username
    const isEventAccessibleResult = await EventService.isEventAccessible(
      eventId,
      ownerId
    )
    if (isEventAccessibleResult.isFailure) {
      return handleError(isEventAccessibleResult.error)
    }

    const getEventUploadsResult = await EventService.getEventUploads(eventId)
    if (getEventUploadsResult.isFailure) {
      return handleError(getEventUploadsResult.error)
    }
    let initeeIdToDelete
    for (const upload of getEventUploadsResult.value) {
      if (upload.uploadId === uploadId && upload.inviteeName === ownerName) {
        initeeIdToDelete = upload.inviteeId
        break
      }
    }

    const deleteUploadResult = await EventService.deleteUpload(
      eventId,
      uploadId
    )

    if (deleteUploadResult.isFailure) {
      return handleError(deleteUploadResult.error)
    }

    if (initeeIdToDelete) {
      const deleteInviteeResult = await EventService.deleteInvitee(
        eventId,
        initeeIdToDelete
      )

      if (deleteInviteeResult.isFailure) {
        return handleError(deleteInviteeResult.error)
      }
    }

    return c.json(
      { message: `upload ${deleteUploadResult.value} was deleted` },
      200
    )
  })
}
