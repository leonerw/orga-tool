/**
 * Quick SMTP smoke-test — run with:
 *   node scripts/test-email.js
 * from the backend/ directory.
 */
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASS,
  },
});

console.log("BREVO_SMTP_USER:", process.env.BREVO_SMTP_USER);
console.log("EMAIL_FROM     :", process.env.EMAIL_FROM);
console.log("Sending test email to:", process.env.BREVO_SMTP_USER);

try {
  await transporter.verify();
  console.log("✓ SMTP connection OK");

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: process.env.BREVO_SMTP_USER,
    subject: "Orga-Tool email test",
    text: "If you see this, SMTP is working correctly.",
  });

  console.log("✓ Email sent, message ID:", info.messageId);
  console.log("  Response:", info.response);
} catch (err) {
  console.error("✗ Error:", err.message);
  if (err.responseCode) console.error("  SMTP response code:", err.responseCode);
  if (err.response) console.error("  SMTP response:", err.response);
}
