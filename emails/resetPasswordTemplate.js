export const resetPasswordTemplate = (resetLink, name = "User") => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <title>Reset Your Password</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f1f5f9; font-family: Arial, sans-serif;">
    
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
      <tr>
        <td align="center">
          
          <table width="500" cellpadding="0" cellspacing="0" 
            style="background:#ffffff; border-radius:12px; padding:40px; box-shadow:0 4px 20px rgba(0,0,0,0.05);">

            <!-- Header -->
            <tr>
              <td align="center">
                <h2 style="margin:0; color:#111827;">UrbanAssist</h2>
                <p style="margin:8px 0 0; font-size:14px; color:#6b7280;">
                  Secure Account Recovery
                </p>
              </td>
            </tr>

            <!-- Divider -->
            <tr>
              <td style="padding:20px 0;">
                <hr style="border:none; border-top:1px solid #e5e7eb;" />
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="color:#374151; font-size:15px; line-height:1.6;">
                <p>Hi ${name},</p>

                <p>
                  We received a request to reset your password for your UrbanAssist account.
                </p>

                <p>
                  Click the button below to create a new password:
                </p>

                <div style="text-align:center; margin:30px 0;">
                  <a href="${resetLink}" 
                     style="background-color:#4f46e5; color:#ffffff; padding:14px 28px; 
                            text-decoration:none; border-radius:8px; font-weight:600;
                            display:inline-block;">
                    Reset Password
                  </a>
                </div>

                <p style="font-size:13px; color:#6b7280;">
                  This link will expire in 15 minutes for security reasons.
                </p>

                <p style="font-size:13px; color:#6b7280;">
                  If you did not request a password reset, you can safely ignore this email.
                </p>

                <p style="margin-top:30px;">
                  Regards,<br/>
                  <strong>UrbanAssist Team</strong>
                </p>
              </td>
            </tr>

          </table>

          <!-- Footer -->
          <table width="500" cellpadding="0" cellspacing="0" style="margin-top:20px;">
            <tr>
              <td align="center" style="font-size:12px; color:#9ca3af;">
                © ${new Date().getFullYear()} UrbanAssist. All rights reserved.
              </td>
            </tr>
          </table>

        </td>
      </tr>
    </table>

  </body>
  </html>
  `
}