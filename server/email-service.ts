import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY not configured - email sending will be disabled");
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
    return false;
  }
}

export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/reset-password?token=${resetToken}`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password - Recrutas</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                color: #e2e8f0;
                line-height: 1.6;
                padding: 20px;
            }
            
            .container {
                max-width: 600px;
                margin: 0 auto;
                background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
                border-radius: 16px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
                overflow: hidden;
                border: 1px solid #475569;
            }
            
            .header {
                background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
                padding: 40px 32px;
                text-align: center;
                position: relative;
            }
            
            .logo {
                color: white;
                font-size: 28px;
                font-weight: 700;
                margin-bottom: 8px;
            }
            
            .tagline {
                color: rgba(255, 255, 255, 0.9);
                font-size: 14px;
                font-weight: 500;
            }
            
            .content {
                padding: 48px 32px;
            }
            
            .greeting {
                font-size: 24px;
                font-weight: 600;
                color: #f8fafc;
                margin-bottom: 16px;
            }
            
            .message {
                font-size: 16px;
                color: #cbd5e1;
                margin-bottom: 32px;
                line-height: 1.8;
            }
            
            .reset-button {
                display: inline-block;
                background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
                color: white;
                text-decoration: none;
                padding: 16px 32px;
                border-radius: 12px;
                font-weight: 600;
                font-size: 16px;
                text-align: center;
                margin: 24px 0;
                box-shadow: 0 8px 24px rgba(59, 130, 246, 0.3);
            }
            
            .warning {
                background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);
                border: 1px solid #fca5a5;
                border-radius: 12px;
                padding: 20px;
                margin: 32px 0;
                color: #fef2f2;
            }
            
            .warning-title {
                font-weight: 600;
                margin-bottom: 8px;
                color: white;
            }
            
            .link-backup {
                background: #374151;
                border: 1px solid #4b5563;
                border-radius: 8px;
                padding: 16px;
                margin: 24px 0;
                font-family: 'Courier New', monospace;
                font-size: 14px;
                color: #d1d5db;
                word-break: break-all;
            }
            
            .footer {
                background: #0f172a;
                padding: 32px;
                text-align: center;
                border-top: 1px solid #334155;
            }
            
            .footer-text {
                font-size: 14px;
                color: #64748b;
                margin-bottom: 16px;
            }
            
            @media (max-width: 600px) {
                .container {
                    margin: 0;
                    border-radius: 0;
                }
                
                .header, .content, .footer {
                    padding: 24px 20px;
                }
                
                .greeting {
                    font-size: 20px;
                }
                
                .reset-button {
                    display: block;
                    width: 100%;
                    margin: 20px 0;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">Recrutas</div>
                <div class="tagline">Built on AI. Backed by transparency. Focused on you.</div>
            </div>
            
            <div class="content">
                <h1 class="greeting">Reset Your Password</h1>
                
                <p class="message">
                    We received a request to reset your password for your Recrutas account. 
                    If you made this request, click the button below to create a new password.
                </p>
                
                <div style="text-align: center;">
                    <a href="${resetUrl}" class="reset-button">Reset My Password</a>
                </div>
                
                <div class="warning">
                    <div class="warning-title">⚠️ Security Notice</div>
                    <p>This link will expire in 24 hours for your security. If you didn't request this password reset, please ignore this email or contact our support team.</p>
                </div>
                
                <p class="message">
                    If the button above doesn't work, copy and paste this link into your browser:
                </p>
                
                <div class="link-backup">
                    ${resetUrl}
                </div>
                
                <p class="message">
                    Having trouble? Reply to this email or visit our help center for assistance.
                </p>
            </div>
            
            <div class="footer">
                <p class="footer-text">
                    This email was sent by Recrutas - the AI-powered job platform connecting you directly with hiring managers.
                </p>
                
                <p style="font-size: 12px; color: #64748b; margin-top: 20px;">
                    © 2025 Recrutas. All rights reserved.
                </p>
            </div>
        </div>
    </body>
    </html>`;

  const textContent = `
Reset Your Password - Recrutas

We received a request to reset your password for your Recrutas account.

Reset Link: ${resetUrl}

This link will expire in 24 hours for your security.

If you didn't request this password reset, please ignore this email.

---
Recrutas - Built on AI. Backed by transparency. Focused on you.
© 2025 Recrutas. All rights reserved.
  `;

  return await sendEmail({
    to: email,
    from: process.env.FROM_EMAIL || 'noreply@recrutas.com',
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
                <p><strong>What makes us different:</strong></p>
                <ul>
                    <li>Instant job delivery based on your skills</li>
                    <li>AI-powered resume analysis</li>
                    <li>Direct connections with hiring managers</li>
                    <li>Smart exam screening for qualified candidates</li>
                    <li>Real-time chat with employers</li>
                </ul>
                <p>Get started by completing your profile and discovering your perfect job match!</p>
                <a href="#" class="button">Complete Your Profile</a>
            </div>
            <div class="footer">
                <p>© 2025 Recrutas - Revolutionizing Job Matching</p>
                <p>Questions? Contact us at support@recrutas.com</p>
            </div>
        </div>
    </body>
    </html>
  `;

  const textContent = `
    Welcome to Recrutas!
    
    Hi ${name},
    
    Welcome to Recrutas, the revolutionary job platform that eliminates recruiters through AI-powered matching.
    
    What makes us different:
    - Instant job delivery based on your skills
    - AI-powered resume analysis  
    - Direct connections with hiring managers
    - Smart exam screening for qualified candidates
    - Real-time chat with employers
    
    Get started by completing your profile and discovering your perfect job match!
    
    © 2025 Recrutas - Revolutionizing Job Matching
  `;

  return await sendEmail({
    to: email,
    from: process.env.FROM_EMAIL || 'noreply@recrutas.com',
    subject: 'Welcome to Recrutas - Your AI Job Matching Journey Begins!',
    text: textContent,
    html: htmlContent,
  });
}