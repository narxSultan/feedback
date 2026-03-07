const nodemailer = require('nodemailer');

function getTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendPasswordResetEmail(toEmail, resetLink) {
  const transporter = getTransporter();
  if (!transporter) {
    return { sent: false };
  }

  await transporter.sendMail({
    from: process.env.FROM_EMAIL || process.env.SMTP_USER,
    to: toEmail,
    subject: 'Reset Your Password',
    text: `Click this link to reset your password: ${resetLink}`,
    html: `<p>Click this link to reset your password:</p><p><a href="${resetLink}">${resetLink}</a></p>`,
  });

  return { sent: true };
}

module.exports = { sendPasswordResetEmail };
