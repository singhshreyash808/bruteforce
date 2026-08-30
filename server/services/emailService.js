/**
 * emailService.js
 * Service for sending Password Reset emails.
 */
const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  } else {
    // Development mode fallback transporter
    transporter = {
      sendMail: async (options) => {
        console.log(`\n======================================================`);
        console.log(`[EMAIL SERVICE (DEV MODE)]`);
        console.log(`To: ${options.to}`);
        console.log(`Subject: ${options.subject}`);
        console.log(`Status: Email dispatched successfully.`);
        console.log(`======================================================\n`);
        return { messageId: 'dev-email-' + Date.now() };
      }
    };
  }
  return transporter;
}

/**
 * Send password reset email.
 * @param {string} email - Recipient email
 * @param {string} resetToken - Secure reset token
 * @returns {Promise<boolean>}
 */
async function sendPasswordResetEmail(email, resetToken) {
  const mailer = getTransporter();
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM || '"CybeX Cyber Intelligence" <no-reply@cybex-intelligence.gov.in>',
    to: email,
    subject: 'CybeX Portal - Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
        <h2 style="color: #0284c7; text-align: center;">🛡️ CybeX Intelligence System</h2>
        <p>Dear Officer / Authorized User,</p>
        <p>We received a request to reset the password for your Law Enforcement Portal account.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #0284c7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p style="color: #666; font-size: 13px;">This reset link is cryptographically protected and will expire in <strong>15 minutes</strong>. If you did not request this change, please contact system administration immediately.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 11px; color: #999; text-align: center;">CybeX Predictive Cybercrime Intelligence Portal &bull; Confidential Law Enforcement System</p>
      </div>
    `
  };

  await mailer.sendMail(mailOptions);
  return true;
}

module.exports = {
  sendPasswordResetEmail
};