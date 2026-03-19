import nodemailer from "nodemailer";

function getTransporter() {
  return nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    auth: {
      user: process.env.BREVO_SMTP_USER,
      pass: process.env.BREVO_SMTP_PASS,
    },
  });
}

export async function sendVerificationEmail(email, token) {
  const link = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Verify your email – Orga-Tool",
    html: `
      <p>Thanks for registering at Orga-Tool.</p>
      <p><a href="${link}">Click here to verify your email address</a></p>
      <p>This link expires in 24 hours. If you did not register, ignore this email.</p>
    `,
  });
}
