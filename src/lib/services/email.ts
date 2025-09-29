import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

export class EmailService {
  static async sendInvitationEmail(
    email: string,
    organizationName: string,
    inviterName: string,
    invitationToken: string,
    role: string
  ): Promise<EmailResult> {
    if (!resend) {
      console.warn('Resend API key not configured, skipping email send')
      return { success: false, error: 'Email service not configured' }
    }

    const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invitationToken}`

    try {
      const { data, error } = await resend.emails.send({
        from: 'Foco <noreply@foco.app>',
        to: [email],
        subject: `You're invited to join ${organizationName} on Foco`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Invitation to ${organizationName}</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
                <h1 style="color: white; margin: 0; font-size: 28px;">You're Invited!</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Join ${organizationName} on Foco</p>
              </div>

              <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
                <p style="margin: 0 0 15px 0; font-size: 16px;"><strong>${inviterName}</strong> has invited you to collaborate as a <strong>${role}</strong> in <strong>${organizationName}</strong>.</p>
                <p style="margin: 0; color: #666; font-size: 14px;">Foco is a powerful project management platform that helps teams stay organized and productive.</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${invitationUrl}" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">Accept Invitation</a>
              </div>

              <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 25px 0;">
                <p style="margin: 0; color: #856404; font-size: 14px;"><strong>⏰ This invitation expires in 7 days</strong></p>
              </div>

              <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center;">
                <p style="margin: 0; color: #666; font-size: 12px;">If you can't click the button, copy and paste this link:</p>
                <p style="margin: 5px 0 0 0; color: #667eea; font-size: 12px; word-break: break-all;">${invitationUrl}</p>
              </div>
            </body>
          </html>
        `,
      })

      if (error) {
        console.error('Resend email error:', error)
        return { success: false, error: error.message }
      }

      return { success: true, messageId: data?.id }
    } catch (error) {
      console.error('Email service error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}