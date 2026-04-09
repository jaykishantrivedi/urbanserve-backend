export const otpEmailTemplate = (otp, name) => `
<div style="
  max-width: 500px;
  margin: auto;
  padding: 20px;
  font-family: Arial, sans-serif;
  background-color: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
">

  <h2 style="color:#111827; text-align:center;">
    Email Verification
  </h2>

  <p style="color:#374151;">
    Hi <b>${name}</b>,
  </p>

  <p style="color:#374151;">
    Use the OTP below to verify your account:
  </p>

  <div style="
    text-align:center;
    font-size: 28px;
    font-weight: bold;
    letter-spacing: 6px;
    margin: 20px 0;
    color:#2563eb;
  ">
    ${otp}
  </div>

  <p style="color:#6b7280; font-size: 14px;">
    This OTP is valid for 5 minutes.
  </p>

  <hr style="border:none; border-top:1px solid #e5e7eb;" />

  <p style="color:#9ca3af; font-size: 12px; text-align:center;">
    If you did not request this, please ignore this email.
  </p>
</div>
`