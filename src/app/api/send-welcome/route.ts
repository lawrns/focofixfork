import { NextRequest, NextResponse } from 'next/server'

// CONSOLIDATE: Merge into /api/auth/register
// This route is deprecated. Welcome emails should be sent automatically on registration.
// Migration: Remove explicit calls - handle automatically in /api/auth/register

export async function POST(request: NextRequest) {
  try {
    const { email, name, password, organization } = await request.json()

    // In a real app, you'd use a service like Resend, SendGrid, etc.
    // For now, we'll just log the email content
    const emailContent = {
      to: email,
      subject: `Welcome to Foco - ${organization}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #0052CC;">Welcome to Foco, ${name}!</h1>

          <p>You've been added to the <strong>${organization}</strong> organization on Foco.</p>

          <h2>Your Login Credentials</h2>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Password:</strong> ${password}</p>
            <p><strong>Login URL:</strong> <a href="https://foco.mx/login">https://foco.mx/login</a></p>
          </div>

          <p style="color: #d9534f; font-size: 14px;">
            ⚠️ <strong>Important:</strong> Please change your password after your first login.
          </p>

          <h3>Getting Started</h3>
          <ol>
            <li>Visit <a href="https://foco.mx/login">foco.mx/login</a></li>
            <li>Log in with your credentials above</li>
            <li>You'll be taken to your dashboard</li>
            <li>Change your password in Settings</li>
          </ol>

          <p>If you have any questions, please reach out to your organization administrator.</p>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;" />

          <p style="color: #666; font-size: 12px;">
            This is an automated message from Foco - Project Management with AI
          </p>
        </div>
      `,
      text: `
Welcome to Foco, ${name}!

You've been added to the ${organization} organization on Foco.

Your Login Credentials:
Email: ${email}
Password: ${password}
Login URL: https://foco.mx/login

⚠️ Important: Please change your password after your first login.

Getting Started:
1. Visit foco.mx/login
2. Log in with your credentials above
3. You'll be taken to your dashboard
4. Change your password in Settings

If you have any questions, please reach out to your organization administrator.
      `
    }

    console.log('📧 Welcome Email Content:')
    console.log('To:', emailContent.to)
    console.log('Subject:', emailContent.subject)
    console.log('\n' + emailContent.text)
    console.log('\n' + '='.repeat(60) + '\n')

    // TODO: Actually send the email using Resend or similar
    // For now, we'll just return success
    // const resend = new Resend(process.env.RESEND_API_KEY)
    // await resend.emails.send(emailContent)

    return NextResponse.json({
      success: true,
      message: 'Welcome email logged (actual sending not implemented)',
      preview: emailContent.text
    })

  } catch (error: any) {
    console.error('Error sending welcome email:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
