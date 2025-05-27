import { z } from 'zod'

export interface CreateEventReq {
  name: string
  deadline: number
}

export interface AddInviteesReq {
  names: string[]
}

export interface UploadVideoReq {
  video: File
}

export const eventValidationSchema = (() => {
  const currentDate = Date.now()
  const twelveHoursLater = currentDate + 43200000 // 12 hours in milliseconds
  const nextMonth = new Date().setMonth(new Date().getMonth() + 1)

  return z.object({
    name: z
      .string()
      .min(2, { message: 'Required length between 2 and 64' })
      .max(64, { message: 'Required length between 2 and 64' }),
    deadline: z
      .number()
      .min(twelveHoursLater, {
        message: 'Deadline must be at least 12 hours from now'
      })
      .max(nextMonth, { message: 'Deadline must be earlier than next month' })
  })
})()

export const inviteesValidationSchema = z.object({
  names: z
    .array(z.string().min(2).max(60))
    .nonempty('The invitees list is required')
    .min(1, {
      message: 'The invitees list must contain between 1 and 4 names'
    })
    .max(4, {
      message: 'The invitees list must contain between 1 and 4 names'
    })
    .refine(
      (names) => {
        const uniqueNames = new Set(names.map((name) => name.trim()))
        return uniqueNames.size === names.length
      },
      {
        message: 'All invitee names must be unique'
      }
    )
})

export const uploadVideoValidationSchema = z.object({
  video: z
    .instanceof(File)
    .refine(
      (f) => {
        if (f.type) {
          return f.type.startsWith('video/')
        } else {
          const allowedExtensions = ['.mp4']
          const fileExtension = f.name.split('.').pop()?.toLocaleLowerCase()
          return fileExtension
            ? allowedExtensions.includes(`.${fileExtension}`)
            : false
        }
      },
      { message: 'Only videos are allowed' }
    )
    .refine((f) => f.size < 1000 * 1024 * 1024, {
      message: 'The file size must be less than 1GB'
    })
})
