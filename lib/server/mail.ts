import nodemailer from "nodemailer";

const requiredSmtpEnvNames = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "SMTP_FROM",
] as const;

type SmtpConfig = {
  from: string;
  host: string;
  password: string;
  port: number;
  secure: boolean;
  user: string;
};

export type MailMessage = {
  html: string;
  subject: string;
  text: string;
  to: string;
};

export function getMissingSmtpConfig() {
  return requiredSmtpEnvNames.filter((envName) => !process.env[envName]?.trim());
}

function readSmtpConfig(): SmtpConfig {
  const missingConfig = getMissingSmtpConfig();

  if (missingConfig.length > 0) {
    throw new Error(`SMTP is not configured: ${missingConfig.join(", ")}`);
  }

  const port = Number(process.env.SMTP_PORT);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("SMTP_PORT must be a valid port number.");
  }

  return {
    from: process.env.SMTP_FROM ?? "",
    host: process.env.SMTP_HOST ?? "",
    password: process.env.SMTP_PASSWORD ?? "",
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    user: process.env.SMTP_USER ?? "",
  };
}

export async function sendMail(message: MailMessage) {
  const config = readSmtpConfig();
  const transporter = nodemailer.createTransport({
    auth: {
      pass: config.password,
      user: config.user,
    },
    host: config.host,
    port: config.port,
    secure: config.secure,
  });

  await transporter.sendMail({
    from: config.from,
    html: message.html,
    subject: message.subject,
    text: message.text,
    to: message.to,
  });
}
