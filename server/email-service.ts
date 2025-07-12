import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY not configured - email sending will be disabled");
} else {
  console.log("SendGrid API key configured - email sending enabled");
}

const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.log(`Development mode: Would send email to ${params.to} with subject "${params.subject}"`);
    console.log(`Email content: ${params.text || params.html}`);
    return true;
  }

  try {
    await mailService.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    console.log(`Email sent successfully to ${params.to}`);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    if (error.response && error.response.body) {
      console.error('SendGrid error details:', JSON.stringify(error.response.body, null, 2));
    }
    return false;
  }
}

export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/reset-password?token=${resetToken}`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - Recrutas</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #000; color: #fff; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; background: #f9f9f9; }
            .button { display: inline-block; padding: 12px 30px; background: #000; color: #fff; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Recrutas</h1>
                <p>Password Reset Request</p>
            </div>
            <div class="content">
                <h2>Reset Your Password</h2>
                <p>We received a request to reset your password for your Recrutas account.</p>
                <p>Click the button below to reset your password:</p>
                <a href="${resetUrl}" class="button">Reset Password</a>
                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <p><a href="${resetUrl}">${resetUrl}</a></p>
                <p><strong>Important:</strong> This link will expire in 1 hour for security reasons.</p>
                <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
            </div>
            <div class="footer">
                <p>© 2024 Recrutas - AI-Powered Job Matching Platform</p>
                <p>This is an automated email. Please do not reply to this message.</p>
            </div>
        </div>
    </body>
    </html>
  `;

  const textContent = `
    Password Reset Request - Recrutas
    
    We received a request to reset your password for your Recrutas account.
    
    Click the link below to reset your password:
    ${resetUrl}
    
    Important: This link will expire in 1 hour for security reasons.
    
    If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
    
    © 2024 Recrutas - AI-Powered Job Matching Platform
  `;

  return await sendEmail({
    to: email,
    from: process.env.FROM_EMAIL || 'abaskabato@gmail.com',
    subject: 'Reset Your Password - Recrutas',
    text: textContent,
    html: htmlContent,
  });
}

export async function sendWelcomeEmail(email: string, firstName?: string): Promise<boolean> {
  const name = firstName || 'there';
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Recrutas</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #000; color: #fff; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; background: #f9f9f9; }
            .button { display: inline-block; padding: 12px 30px; background: #000; color: #fff; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to Recrutas</h1>
                <p>Your AI-Powered Job Matching Journey Begins</p>
            </div>
            <div class="content">
                <h2>Hi ${name}!</h2>
                <p>Welcome to Recrutas, the revolutionary job platform that eliminates recruiters through AI-powered matching.</p>
                <p>🚀 <strong>What makes us different:</strong></p>
                <ul>
                    <li>Instant job delivery based on your skills</li>
                    <li>AI-powered resume analysis</li>
                    <li>Direct connections with hiring managers</li>
                    <li>Smart exam screening for qualified candidates</li>
                    <li>Real-time chat with employers</li>
                </ul>
                <p>Get started by completing your profile and discovering your perfect job matches:</p>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/candidate-dashboard" class="button">Complete Your Profile</a>
            </div>
            <div class="footer">
                <p>© 2024 Recrutas - Revolutionizing Job Matching</p>
                <p>Questions? Contact us at support@recrutas.ai</p>
            </div>
        </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: email,
    from: 'welcome@recrutas.ai',
    subject: 'Welcome to Recrutas - Your AI Job Matching Journey Begins!',
    html: htmlContent,
  });
}