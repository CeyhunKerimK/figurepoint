const nodemailer = require('nodemailer');

const smtpConfig = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
};

console.log('SMTP Config:', JSON.stringify(smtpConfig, null, 2));

const transporter = nodemailer.createTransport(smtpConfig);

async function sendEmail(to, subject, text, html) {
  try {
    console.log('Sending email to:', to);
    let info = await transporter.sendMail({
      from: `"Your App Name" <${process.env.SMTP_USER}>`,
      to: to,
      subject: subject,
      text: text,
      html: html
    });
    console.log('Message sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

module.exports = { transporter, sendEmail };
