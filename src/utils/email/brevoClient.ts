const apiKey = process.env.BREVO_API_KEY
const brevoURL = process.env.BREVO_URL
const env = process.env.ENV

if (!apiKey) {
  throw new Error('BREVO_API_KEY is not defined')
}

if (!brevoURL) {
  throw new Error('BREVO_URL is not defined')
}

if (!env) {
  throw new Error('ENV is not defined')
}

class BrevoClient {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey
    this.baseUrl = baseUrl
  }

  /**
   * This function sends an email using the Brevo API. If the ENV environment variable is set to 'local', the email will be sent in the Brevo sandbox mode.
   * @param toEmail — the email address of the recipient.
   * @param templateId — the ID of the email template to be used.
   * @param params — an object containing the parameters to be used in the email template.
   * @returns — a Promise<Response> object.
   */
  async sendEmail(
    toEmail: string,
    templateId: number,
    params: Record<string, unknown>
  ): Promise<Response> {
    const body: {
      to: { email: string }[]
      templateId: number
      params: Record<string, unknown>
      headers: Record<string, string>
    } = {
      to: [{ email: toEmail }],
      templateId: templateId,
      params: params,
      headers: {}
    }

    return await this.postRequest(body)
  }

  private async postRequest(body: Record<string, unknown>): Promise<Response> {
    if (env === 'local') {
      console.log('Sending email in sandbox mode')
      body.headers = {
        'X-Sib-Sandbox': 'drop'
      }
    }

    const response = await fetch(`${this.baseUrl}/smtp/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'api-key': this.apiKey
      },
      body: JSON.stringify(body)
    })

    return response
  }
}

export const brevoClient = new BrevoClient(apiKey, brevoURL)
