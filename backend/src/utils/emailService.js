const nodemailer = require('nodemailer');

function getTransporter() {
  const provider = String(process.env.EMAIL_PROVIDER || '').toLowerCase();
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (provider === 'gmail') {
    if (!user || !pass) {
      return null;
    }

    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass,
      },
    });
  }

  if (!process.env.SMTP_HOST || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    auth: {
      user,
      pass,
    },
  });
}

async function sendPasswordResetEmail(toEmail, resetLink) {
  const transporter = getTransporter();
  if (!transporter) {
    return { sent: false };
  }

  await transporter.sendMail({
    from: process.env.FROM_EMAIL || process.env.SMTP_USER || process.env.EMAIL_USER,
    to: toEmail,
    subject: 'Reset Your Password',
    text: `You requested a password reset. Click this link to reset your password: ${resetLink}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #163c2f;">
        <h2 style="margin-bottom: 12px;">Reset Your Password</h2>
        <p>You requested a password reset for your account.</p>
        <p>
          <a
            href="${resetLink}"
            style="display:inline-block;padding:10px 16px;background:#22c55e;color:#0f172a;text-decoration:none;border-radius:8px;font-weight:600;"
          >
            Reset Password
          </a>
        </p>
        <p>If the button does not work, use this link:</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>This link expires in 30 minutes.</p>
      </div>
    `,
  });

  return { sent: true };
}

module.exports = { sendPasswordResetEmail };
